import { describe, it, expect } from "vitest";
import { supabase } from "@/integrations/supabase/client";

/**
 * Security regression guard for F-01 / F-04.
 *
 * The canonical browser Supabase client MUST use the PKCE OAuth flow. Under the
 * auth-js default ('implicit') Google sign-in/linking returned a token-bearing
 * `#access_token=...` fragment that could leak into PostHog URL telemetry (F-01)
 * and let any `#access_token` URL be accepted as a login callback (F-04). PKCE
 * removes the fragment and makes auth-js reject injected implicit tokens.
 *
 * Asserting the effective auth options (exposed on the GoTrueClient instance)
 * rather than re-testing library internals. If this flips back to 'implicit',
 * both findings reopen — this test must fail.
 */
describe("supabase browser client auth config", () => {
  const auth = supabase.auth as unknown as {
    flowType: string;
    detectSessionInUrl: boolean | ((...args: unknown[]) => unknown);
    persistSession: boolean;
    storageKey: string;
  };

  it("uses the PKCE flow (closes F-01 + F-04)", () => {
    expect(auth.flowType).toBe("pkce");
  });

  it("keeps detectSessionInUrl enabled so PKCE auto-exchanges ?code=", () => {
    // PKCE relies on detectSessionInUrl to detect and exchange the code.
    expect(auth.detectSessionInUrl).toBe(true);
  });

  it("preserves the established session invariants", () => {
    expect(auth.persistSession).toBe(true);
    expect(auth.storageKey).toBe("reeve-auth");
  });
});
