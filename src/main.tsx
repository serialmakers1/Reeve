import * as Sentry from '@sentry/react';
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import posthog from "posthog-js";
import { supabase } from "@/integrations/supabase/client";
import { markReplayPending } from "@/lib/posthogRuntime";
import { isExpectedSupabaseNoise } from "@/lib/sentryNoise";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.supabaseIntegration({ supabaseClient: supabase }),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  // Drop only fully-handled Supabase/PostgREST control-flow events that
  // supabaseIntegration reports as unhandled (see isExpectedSupabaseNoise).
  // Fails open — anything it cannot positively identify still reports.
  beforeSend: (event) => (isExpectedSupabaseNoise(event) ? null : event),
});

function stripAuthCode(url: string): string {
  try {
    const u = new URL(url);
    if (u.searchParams.has("code")) {
      u.searchParams.delete("code");
      return u.toString();
    }
  } catch { /* invalid URL — return unchanged */ }
  return url;
}

const hasOAuthCode = new URLSearchParams(window.location.search).has("code");

if (import.meta.env.PROD && import.meta.env.VITE_POSTHOG_KEY) {
  if (hasOAuthCode) markReplayPending();
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? "https://eu.i.posthog.com",
    defaults: "2026-05-30",
    // Strip URL fragments from all auto-captured URL properties ($current_url,
    // $session_entry_url, etc.). Defence-in-depth for F-01: the `defaults` date is
    // before the 2026-06-25 cutoff that would enable this implicitly, so set it
    // explicitly. Does not disable analytics/replay or affect navigation (Reeve
    // uses BrowserRouter, not hash routing).
    disable_capture_url_hashes: true,
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    capture_pageleave: true,
    before_send: (event) => {
      const URL_KEYS = [
        "$current_url",
        "$referrer",
        "$initial_current_url",
        "$session_entry_url",
      ];
      for (const key of URL_KEYS) {
        const val = event.properties?.[key];
        if (typeof val === "string") {
          event.properties[key] = stripAuthCode(val);
        }
      }
      for (const bucket of ["$set", "$set_once"] as const) {
        const nested = event.properties?.[bucket];
        if (nested && typeof nested === "object") {
          for (const key of URL_KEYS) {
            const val = (nested as Record<string, unknown>)[key];
            if (typeof val === "string") {
              (nested as Record<string, unknown>)[key] = stripAuthCode(val);
            }
          }
        }
      }
      return event;
    },
    autocapture: false,
    capture_dead_clicks: false,
    capture_exceptions: false,
    rageclick: false,
    capture_heatmaps: false,
    disable_surveys: true,
    session_recording: {
      maskAllInputs: true,
    },
    ...(hasOAuthCode ? { disable_session_recording: true } : {}),
  });
}

const rootEl = document.getElementById("root")!;
createRoot(rootEl).render(<App />);

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    rootEl.classList.add('mounted');
  });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
