import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import type { LocationToken, CityToken } from "../domain/searchTypes";
import type { SearchMode } from "../domain/searchMode";
import { URL_PARAMS } from "../domain/searchConstants";
import { useAuth } from "@/hooks/useAuth";
import { useSearchState } from "./useSearchState";
import { useVercelGeoCity } from "../hooks/useVercelGeoCity";
import {
  type SearchLocationHistory,
  cityMemory,
  emptyHistory,
  latestSelection,
  recentCities as recentCitiesFn,
} from "./searchLocationHistory";
import {
  type ConfirmedSearchSetup,
  type LocationSource,
  clearRememberedHistory as clearRememberedHistoryFn,
  confirmSearchSetup,
  loadCachedHistory,
  reconcileAccountHistory,
  removeRememberedCity as removeRememberedCityFn,
} from "./searchLocationMemory";

export type BootstrapStatus = "checking" | "resolved" | "needs_setup";

const SERVER_READ_TIMEOUT_MS = 4000;
const IP_TIMEOUT_MS = 6000;

export interface CityMemoryView {
  lastSelectedAreas: LocationToken[];
  recentAreas: LocationToken[];
  mode: SearchMode;
  propertyTypes: string[];
}

export interface SearchBootstrap {
  status: BootstrapStatus;
  ipNoticeCity: string | null;
  approxCity: CityToken | null;
  recentCities: string[];
  getCityMemory: (city: string) => CityMemoryView;
  /** The ONLY confirmed-save path — full setup (city+areas+mode+propertyTypes). */
  confirmSetup: (setup: ConfirmedSearchSetup) => void;
  /** Marks that the user has started choosing (stops IP/memory overrides). */
  markUserInteracted: () => void;
  /** Remove a single remembered city (and its areas/mode/propertyTypes). */
  removeRememberedCity: (city: string) => void;
  /** Clear all remembered cities. */
  clearRememberedHistory: () => void;
}

/**
 * Single deterministic bootstrap orchestrator for /search.
 * Bare-URL precedence: confirmed account/anon memory → Vercel IP → setup panel.
 * A populated URL is always honored; explicit `type=`/`pt=` on a partial URL win over
 * memory (field-aware). Seeding commits atomically through URL history-replace. A
 * generation guard (not re-render cancellation) rejects only genuinely stale async.
 */
export function useSearchBootstrap(): SearchBootstrap {
  const { state, replaceSearchSetup, setContext } = useSearchState();
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const { search: rawSearch } = useLocation();

  // Live refs (updated every render) so the stable main effect never needs these as deps.
  const stateRef = useRef(state);
  stateRef.current = state;
  const rawSearchRef = useRef(rawSearch);
  rawSearchRef.current = rawSearch;
  const applyRef = useRef(replaceSearchSetup);
  applyRef.current = replaceSearchSetup;
  const setContextRef = useRef(setContext);
  setContextRef.current = setContext;

  const initialHasLocation =
    !!state.context.city || state.context.locations.length > 0;

  const committedRef = useRef(false);
  const userInteractedRef = useRef(false);
  const provenanceRef = useRef<LocationSource | null>(initialHasLocation ? "url" : null);
  const prevUserIdRef = useRef<string | null>(userId);
  const bootstrapRanRef = useRef(false);
  const runIdRef = useRef(0);
  const prevHasUrlLocationRef = useRef(initialHasLocation);

  const [history, setHistory] = useState<SearchLocationHistory>(emptyHistory());
  const [status, setStatus] = useState<BootstrapStatus>(
    initialHasLocation ? "resolved" : "checking",
  );
  const [needIp, setNeedIp] = useState(false);
  const [ipCity, setIpCity] = useState<string | null>(null);
  const [bootstrapEpoch, setBootstrapEpoch] = useState(0);

  const { approxCity, status: geoStatus } = useVercelGeoCity(needIp);

  // Snapshot the CURRENT raw URL each run (never mount-captured — a re-armed run must
  // see the live URL, not stale mount flags).
  const snapshotUrl = useCallback(() => {
    const s = stateRef.current;
    const sp = new URLSearchParams(rawSearchRef.current);
    return {
      hadUrlLocation: !!s.context.city || s.context.locations.length > 0,
      urlMode: (s.context.mode ?? "rent") as SearchMode,
      urlHadExplicitMode: sp.has(URL_PARAMS.type),
      urlPropertyTypes: s.context.propertyTypes,
      urlHadExplicitPropertyTypes: sp.has(URL_PARAMS.propertyType),
    };
  }, []);

  // Atomic memory restore with field-aware precedence (explicit URL mode/pt win).
  const restoreFromMemory = useCallback(
    (setup: { city: string; cityToken?: CityToken; areas: LocationToken[]; mode: SearchMode; propertyTypes: string[] }) => {
      const snap = snapshotUrl();
      provenanceRef.current = "memory";
      committedRef.current = true;
      applyRef.current({
        mode: snap.urlHadExplicitMode ? snap.urlMode : setup.mode,
        city: setup.city,
        cities: setup.cityToken ? [setup.cityToken] : [],
        locations: setup.areas,
        propertyTypes: snap.urlHadExplicitPropertyTypes ? snap.urlPropertyTypes : setup.propertyTypes,
      });
      setStatus("resolved");
    },
    [snapshotUrl],
  );

  // ── Main bootstrap — stable deps; re-fires only on identity/epoch change ──────
  useEffect(() => {
    if (bootstrapRanRef.current) return;

    const snap = snapshotUrl();

    // Phase A — URL already carries a location: honor it, never seed/override.
    if (snap.hadUrlLocation) {
      bootstrapRanRef.current = true;
      committedRef.current = true;
      provenanceRef.current = "url";
      setStatus("resolved");
      setHistory(loadCachedHistory(userId, snap.urlMode));
      if (userId) reconcileAccountHistory(userId, snap.urlMode).then(setHistory).catch(() => {});
      return;
    }

    // Phase B — bare URL: wait for auth so anon memory isn't used for a logged-in user.
    if (authLoading) return;
    bootstrapRanRef.current = true;

    const myRun = ++runIdRef.current;
    const ac = new AbortController();

    (async () => {
      const cached = loadCachedHistory(userId, snap.urlMode);
      if (runIdRef.current === myRun) setHistory(cached);
      let latest = latestSelection(cached);

      if (!latest && userId) {
        // No local cache → read the server before falling through to IP (bounded).
        const timeout = new Promise<null>((r) => setTimeout(() => r(null), SERVER_READ_TIMEOUT_MS));
        const merged = await Promise.race([
          reconcileAccountHistory(userId, snap.urlMode, ac.signal),
          timeout,
        ]).catch(() => null);
        if (runIdRef.current === myRun && merged) {
          setHistory(merged);
          latest = latestSelection(merged);
        }
      } else if (userId) {
        // Had a cache → reconcile in the background; may re-seed only if the server is
        // newer AND the user hasn't interacted AND memory is still the active source.
        reconcileAccountHistory(userId, snap.urlMode, ac.signal)
          .then((merged) => {
            if (runIdRef.current !== myRun) return;
            setHistory(merged);
            const newLatest = latestSelection(merged);
            if (
              newLatest &&
              !userInteractedRef.current &&
              provenanceRef.current === "memory" &&
              newLatest.city !== stateRef.current.context.city
            ) {
              restoreFromMemory(newLatest);
            }
          })
          .catch(() => {});
      }

      // Stale run (a newer bootstrap started) or user already acted → stop.
      if (runIdRef.current !== myRun) return;
      if (userInteractedRef.current) {
        committedRef.current = true;
        setStatus("resolved");
        return;
      }

      if (latest) {
        restoreFromMemory(latest);
      } else {
        setNeedIp(true); // no confirmed memory anywhere → try IP
      }
    })();

    return () => {
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId, bootstrapEpoch]);

  // ── Re-arm for a genuinely new empty search (has-location → no-location) ──────
  useEffect(() => {
    const hasLocation = !!state.context.city || state.context.locations.length > 0;
    const prev = prevHasUrlLocationRef.current;
    prevHasUrlLocationRef.current = hasLocation;
    if (prev && !hasLocation) {
      // The URL lost its location. Re-run bootstrap from scratch for this identity.
      bootstrapRanRef.current = false;
      committedRef.current = false;
      provenanceRef.current = null;
      userInteractedRef.current = false;
      setNeedIp(false);
      setIpCity(null);
      setStatus("checking");
      setBootstrapEpoch((n) => n + 1); // the state bump is what re-fires the main effect
    }
  }, [state.context.city, state.context.locations.length]);

  // ── IP phase: seed the city (unconfirmed) or fall through to setup ───────────
  useEffect(() => {
    if (!needIp || committedRef.current) return;
    if (userInteractedRef.current) {
      committedRef.current = true;
      setStatus("resolved");
      return;
    }
    if (approxCity) {
      const snap = snapshotUrl();
      provenanceRef.current = "ip_unconfirmed";
      committedRef.current = true;
      // City-only seed from the canonical root resolved by the geo suggest RPC
      // (Reeve geo_place UUID — no Google identity). Preserve explicit URL mode/types.
      const cityName = approxCity.label.toLowerCase();
      applyRef.current({
        mode: snap.urlMode,
        city: cityName,
        cities: [approxCity],
        locations: [],
        propertyTypes: snap.urlPropertyTypes,
      });
      setIpCity(cityName);
      setStatus("resolved");
    } else if (geoStatus === "done") {
      committedRef.current = true;
      setStatus("needs_setup");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needIp, approxCity, geoStatus]);

  // Bounded IP timeout — if geo hangs, open setup rather than spin forever.
  useEffect(() => {
    if (!needIp) return;
    const t = setTimeout(() => {
      if (!committedRef.current && !userInteractedRef.current) {
        committedRef.current = true;
        setStatus("needs_setup");
      }
    }, IP_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [needIp]);

  // ── Account switch / sign-out: refresh displayed memory to the new identity ──
  useEffect(() => {
    if (prevUserIdRef.current !== userId) {
      prevUserIdRef.current = userId;
      setHistory(loadCachedHistory(userId));
    }
  }, [userId]);

  const markUserInteracted = useCallback(() => {
    userInteractedRef.current = true;
    provenanceRef.current = "user";
    runIdRef.current++; // invalidate any in-flight bootstrap async
    setIpCity(null);
  }, []);

  const confirmSetup = useCallback(
    (setup: ConfirmedSearchSetup) => {
      userInteractedRef.current = true;
      provenanceRef.current = "user";
      runIdRef.current++;
      setIpCity(null);
      confirmSearchSetup({ userId, setup }).then(setHistory).catch(() => {});
    },
    [userId],
  );

  const removeRememberedCity = useCallback(
    (city: string) => {
      // Removal is a user interaction: block any in-flight bootstrap read from
      // restoring the deleted history, but do NOT change the active search.
      userInteractedRef.current = true;
      runIdRef.current++;
      removeRememberedCityFn({ userId, city }).then(setHistory).catch(() => {});
    },
    [userId],
  );

  const clearRememberedHistory = useCallback(() => {
    userInteractedRef.current = true;
    runIdRef.current++;
    clearRememberedHistoryFn({ userId }).then(setHistory).catch(() => {});
  }, [userId]);

  const recentCities = recentCitiesFn(history);
  const getCityMemory = useCallback((city: string): CityMemoryView => cityMemory(history, city), [history]);

  const ipNoticeCity =
    ipCity && state.context.city === ipCity && !userInteractedRef.current ? ipCity : null;

  return {
    status,
    ipNoticeCity,
    approxCity,
    recentCities,
    getCityMemory,
    confirmSetup,
    markUserInteracted,
    removeRememberedCity,
    clearRememberedHistory,
  };
}
