import { URL_PARAMS } from "../domain/searchConstants";

/**
 * Whether Setup should auto-open on load: only when there is NO committed location
 * (no city AND no areas) in the URL. A restored/URL/user City or Areas → results directly.
 */
export function shouldAutoOpenSetup(search: string): boolean {
  const sp = new URLSearchParams(search);
  const hasCity = !!sp.get(URL_PARAMS.city);
  const hasAreas = !!sp.get(URL_PARAMS.locations) || !!sp.get(URL_PARAMS.locationsData);
  return !hasCity && !hasAreas;
}

export interface GeoAdoptArgs {
  hasApproxCity: boolean;
  alreadySeeded: boolean;
  userSelectedCity: boolean;
  committedCity: boolean;
  committedAreaCount: number;
  panelOpen: boolean;
}

/**
 * Whether the coarse Vercel IP city may seed the search. It is only a default for a
 * fully-empty search and may seed once: explicit URL location > committed user location >
 * Setup draft/typing > Vercel. A late async response must never overwrite any of those.
 */
export function canAdoptGeoCity(a: GeoAdoptArgs): boolean {
  return (
    a.hasApproxCity &&
    !a.alreadySeeded &&
    !a.userSelectedCity &&
    !a.committedCity &&
    a.committedAreaCount === 0 &&
    !a.panelOpen
  );
}
