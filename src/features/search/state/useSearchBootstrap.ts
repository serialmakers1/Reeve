import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationToken } from "../domain/searchTypes";
import { useAuth } from "@/hooks/useAuth";
import { useSearchState } from "./useSearchState";
import { useVercelGeoCity } from "../hooks/useVercelGeoCity";
import type { CanonicalCity } from "../hooks/useResolveCity";
import {
  type SearchLocationHistoryV1,
  cityMemory,
  emptyHistory,
  latestSelection,
  recentCities as recentCitiesFn,
} from "./searchLocationHistory";
import {
  type LocationSource,
  confirmSearchLocation,
  loadCachedHistory,
  reconcileAccountHistory,
} from "./searchLocationMemory";

export type BootstrapStatus = "checking" | "resolved" | "needs_setup";

const SERVER_READ_TIMEOUT_MS = 4000;
const IP_TIMEOUT_MS = 6000;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export interface SearchBootstrap {
  status: BootstrapStatus;
  /** Approximate city seeded from IP, still unconfirmed — drives the non-blocking notice. */
  ipNoticeCity: string | null;
  /** Approx city object for the panel's "Approximate location" hint. */
  approxCity: CanonicalCity | null;
  recentCities: string[];
  /** City-scoped memory (last selection + recent-area pool) for the setup panel. */
  getCityMemory: (city: string) => { lastSelectedAreas: LocationToken[]; recentAreas: LocationToken[] };
  /** The ONLY confirmed-save path — call from Keep-city / submit / manual-select. */
  confirmLocation: (city: string, areas: LocationToken[]) => void;
  /** Marks that the user has started choosing a city/area (stops IP/memory overrides). */
  markUserInteracted: () => void;
}

/**
 * Single deterministic bootstrap orchestrator for /search.
 * Precedence for a bare URL:  confirmed memory → Vercel IP city → setup panel.
 * A populated URL is always honored and never overwritten.
 * Seeding commits through URL state (history-replace); refs guard against late
 * async responses overwriting an explicit URL, restored memory, or user input.
 */
export function useSearchBootstrap(): SearchBootstrap {
  const { state, setContext } = useSearchState();
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? null;

  const hadUrlLocationAtMount = useRef(
    !!state.context.city || state.context.locations.length > 0,
  ).current;

  const committedRef = useRef(false);
  const userInteractedRef = useRef(false);
  const provenanceRef = useRef<LocationSource | null>(hadUrlLocationAtMount ? "url" : null);
  const prevUserIdRef = useRef<string | null>(userId);
  const bootstrapRanRef = useRef(false);

  const [history, setHistory] = useState<SearchLocationHistoryV1>(emptyHistory());
  const [status, setStatus] = useState<BootstrapStatus>(
    hadUrlLocationAtMount ? "resolved" : "checking",
  );
  const [needIp, setNeedIp] = useState(false);
  const [ipCity, setIpCity] = useState<string | null>(null);

  const { approxCity, status: geoStatus } = useVercelGeoCity(needIp);

  // Keep the current city in a ref so background reconcile can compare without
  // re-subscribing to state each render.
  const currentCityRef = useRef(state.context.city);
  currentCityRef.current = state.context.city;

  const seedMemory = useCallback(
    (city: string, areas: LocationToken[]) => {
      provenanceRef.current = "memory";
      committedRef.current = true;
      setContext({ city, locations: areas });
      setStatus("resolved");
    },
    [setContext],
  );

  // ── Main bootstrap (runs once per identity, after auth resolves) ─────────────
  useEffect(() => {
    if (bootstrapRanRef.current) return;

    // Phase A — URL already carries a location: honor it, never seed/override.
    if (hadUrlLocationAtMount) {
      bootstrapRanRef.current = true;
      committedRef.current = true;
      provenanceRef.current = "url";
      setStatus("resolved");
      setHistory(loadCachedHistory(userId));
      if (userId) reconcileAccountHistory(userId).then(setHistory).catch(() => {});
      return;
    }

    // Phase B — bare URL: wait for auth so anon memory isn't used for a logged-in user.
    if (authLoading) return;
    bootstrapRanRef.current = true;

    let cancelled = false;
    (async () => {
      const cached = loadCachedHistory(userId);
      if (!cancelled) setHistory(cached);
      let latest = latestSelection(cached);

      if (!latest && userId) {
        // No cache for a logged-in user → wait (bounded) for the server before IP.
        const merged = await withTimeout(
          reconcileAccountHistory(userId),
          SERVER_READ_TIMEOUT_MS,
          null as SearchLocationHistoryV1 | null,
        );
        if (!cancelled && merged) {
          setHistory(merged);
          latest = latestSelection(merged);
        }
      } else if (userId) {
        // Had a cache → reconcile in the background; may re-seed if the server is
        // newer AND the user hasn't interacted AND memory is still the active source.
        reconcileAccountHistory(userId)
          .then((merged) => {
            if (cancelled) return;
            setHistory(merged);
            const newLatest = latestSelection(merged);
            if (
              newLatest &&
              !userInteractedRef.current &&
              provenanceRef.current === "memory" &&
              newLatest.city !== currentCityRef.current
            ) {
              seedMemory(newLatest.city, newLatest.areas);
            }
          })
          .catch(() => {});
      }

      if (cancelled || committedRef.current) return;
      if (userInteractedRef.current) {
        committedRef.current = true;
        setStatus("resolved");
        return;
      }

      if (latest) {
        seedMemory(latest.city, latest.areas);
      } else {
        setNeedIp(true); // no confirmed memory anywhere → try IP
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, userId, hadUrlLocationAtMount, seedMemory]);

  // ── IP phase: seed the city (unconfirmed) or fall through to setup ───────────
  useEffect(() => {
    if (!needIp || committedRef.current) return;
    if (userInteractedRef.current) {
      committedRef.current = true;
      setStatus("resolved");
      return;
    }
    if (approxCity) {
      provenanceRef.current = "ip_unconfirmed";
      committedRef.current = true;
      setContext({ city: approxCity.city });
      setIpCity(approxCity.city);
      setStatus("resolved");
    } else if (geoStatus === "done") {
      committedRef.current = true;
      setStatus("needs_setup");
    }
  }, [needIp, approxCity, geoStatus, setContext]);

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
    setIpCity(null); // dismiss IP notice the moment the user starts choosing
  }, []);

  const confirmLocation = useCallback(
    (city: string, areas: LocationToken[]) => {
      userInteractedRef.current = true;
      provenanceRef.current = "user";
      setIpCity(null);
      confirmSearchLocation({ userId, city, areas })
        .then(setHistory)
        .catch(() => {});
    },
    [userId],
  );

  const recentCities = recentCitiesFn(history);
  const getCityMemory = useCallback((city: string) => cityMemory(history, city), [history]);

  // Show the IP notice only while the IP city is still the active, unconfirmed city.
  const ipNoticeCity =
    ipCity && state.context.city === ipCity && !userInteractedRef.current ? ipCity : null;

  return {
    status,
    ipNoticeCity,
    approxCity,
    recentCities,
    getCityMemory,
    confirmLocation,
    markUserInteracted,
  };
}
