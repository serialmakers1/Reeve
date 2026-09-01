/**
 * Provider lifecycle coverage for the centralized auth (Phase 2).
 *
 * Exercises the REAL AuthProvider + useAuth (not a mocked useAuth): a single
 * provider owns one bootstrap / one profile read / one subscription / one safety
 * timer, and all consumers share that state. The separate AppInner SIGNED_OUT
 * listener is NOT part of this unit and is intentionally excluded.
 */
import React from "react";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Controllable Supabase auth mock ──────────────────────────────────────────
type AuthCb = (event: string, session: unknown) => void;
const authListeners: AuthCb[] = [];
const unsubscribe = vi.fn();
const getSessionMock = vi.fn<() => Promise<{ data: { session: unknown } }>>();
const usersMaybeSingle = vi.fn<() => Promise<{ data: unknown; error: unknown }>>();
const fromUsersSpy = vi.fn();
const signOutMock = vi.fn(() => Promise.resolve({ error: null }));
const rpcMock = vi.fn((..._a: unknown[]) => Promise.resolve({ error: null }));

function usersChain() {
  fromUsersSpy();
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.maybeSingle = () => usersMaybeSingle();
  return chain;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: AuthCb) => {
        authListeners.push(cb);
        return { data: { subscription: { unsubscribe } } };
      },
      getSession: () => getSessionMock(),
      signOut: () => signOutMock(),
    },
    from: (table: string) => (table === "users" ? usersChain() : { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
    rpc: (...a: unknown[]) => rpcMock(...a),
  },
}));

const setUserSpy = vi.fn();
vi.mock("@sentry/react", () => ({ setUser: (...a: unknown[]) => setUserSpy(...a) }));
vi.mock("posthog-js", () => ({ default: { identify: vi.fn(), reset: vi.fn(), startSessionRecording: vi.fn() } }));
vi.mock("@/lib/posthogRuntime", () => ({ consumeReplayPending: () => false }));

import { AuthProvider, useAuth } from "@/hooks/useAuth";

const SESSION = { user: { id: "user-1", email: "u@example.test" } };
const USER_ROW = {
  id: "user-1", email: "u@example.test", full_name: "U", phone: null,
  role: "user", phone_verified: true, email_verified: true, auth_provider: "phone",
};

// Renders the shared auth state; `label` disambiguates multiple consumers.
function Consumer({ label }: { label: string }) {
  const { isLoading, isAuthenticated, user, refreshUser } = useAuth();
  return (
    <div>
      <span data-testid={`${label}-state`}>
        {isLoading ? "loading" : isAuthenticated ? `auth:${user?.id ?? "no-row"}` : "anon"}
      </span>
      <button data-testid={`${label}-refresh`} onClick={() => void refreshUser()}>refresh</button>
    </div>
  );
}

beforeEach(() => {
  authListeners.length = 0;
  unsubscribe.mockClear(); getSessionMock.mockReset(); usersMaybeSingle.mockReset();
  fromUsersSpy.mockClear(); signOutMock.mockClear(); rpcMock.mockClear(); setUserSpy.mockClear();
  getSessionMock.mockResolvedValue({ data: { session: null } });
  usersMaybeSingle.mockResolvedValue({ data: USER_ROW, error: null });
});

describe("AuthProvider — singleton lifecycle", () => {
  it("authenticated: one getSession, one users read, one subscription; consumers share state", async () => {
    getSessionMock.mockResolvedValue({ data: { session: SESSION } });
    render(
      <AuthProvider>
        <Consumer label="a" /><Consumer label="b" />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("a-state")).toHaveTextContent("auth:user-1"));
    expect(screen.getByTestId("b-state")).toHaveTextContent("auth:user-1");
    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(fromUsersSpy).toHaveBeenCalledTimes(1);
    expect(authListeners).toHaveLength(1);
  });

  it("anonymous: one bootstrap, no users read, resolves to anon", async () => {
    render(<AuthProvider><Consumer label="a" /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("a-state")).toHaveTextContent("anon"));
    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(fromUsersSpy).not.toHaveBeenCalled();
  });

  it("consumer remount does not re-bootstrap while provider stays mounted", async () => {
    getSessionMock.mockResolvedValue({ data: { session: SESSION } });
    function Harness() {
      const [showB, setShowB] = React.useState(true);
      return (
        <AuthProvider>
          <Consumer label="a" />
          {showB && <Consumer label="b" />}
          <button data-testid="toggle" onClick={() => setShowB((v) => !v)}>t</button>
        </AuthProvider>
      );
    }
    render(<Harness />);
    await waitFor(() => expect(screen.getByTestId("a-state")).toHaveTextContent("auth:user-1"));
    fireEvent.click(screen.getByTestId("toggle")); // unmount B
    fireEvent.click(screen.getByTestId("toggle")); // remount B
    await waitFor(() => expect(screen.getByTestId("b-state")).toHaveTextContent("auth:user-1"));
    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(authListeners).toHaveLength(1);
  });

  it("provider cleanup unsubscribes and schedules no further bootstrap", async () => {
    const { unmount } = render(<AuthProvider><Consumer label="a" /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("a-state")).toHaveTextContent("anon"));
    const callsBefore = getSessionMock.mock.calls.length;
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(getSessionMock).toHaveBeenCalledTimes(callsBefore);
  });

  it("useAuth outside AuthProvider throws (fail-fast, no silent anon default)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Consumer label="a" />)).toThrow(/useAuth must be used within AuthProvider/);
    spy.mockRestore();
  });
});

describe("AuthProvider — auth events", () => {
  it("INITIAL_SESSION does not trigger a duplicate bootstrap / profile read", async () => {
    render(<AuthProvider><Consumer label="a" /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("a-state")).toHaveTextContent("anon"));
    await act(async () => { authListeners[0]("INITIAL_SESSION", SESSION); });
    expect(fromUsersSpy).not.toHaveBeenCalled();
    expect(getSessionMock).toHaveBeenCalledTimes(1);
  });

  it("SIGNED_IN loads the profile and fires touch_last_login", async () => {
    render(<AuthProvider><Consumer label="a" /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("a-state")).toHaveTextContent("anon"));
    await act(async () => {
      authListeners[0]("SIGNED_IN", SESSION);
      await new Promise((r) => setTimeout(r, 120)); // 100ms defer
    });
    await waitFor(() => expect(screen.getByTestId("a-state")).toHaveTextContent("auth:user-1"));
    expect(rpcMock).toHaveBeenCalledWith("touch_last_login");
  });

  it("SIGNED_OUT clears state and resets Sentry identity", async () => {
    getSessionMock.mockResolvedValue({ data: { session: SESSION } });
    render(<AuthProvider><Consumer label="a" /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("a-state")).toHaveTextContent("auth:user-1"));
    setUserSpy.mockClear();
    await act(async () => {
      authListeners[0]("SIGNED_OUT", null);
      await new Promise((r) => setTimeout(r, 120));
    });
    await waitFor(() => expect(screen.getByTestId("a-state")).toHaveTextContent("anon"));
    expect(setUserSpy).toHaveBeenCalledWith(null);
  });

  it("refreshUser refreshes the shared state for all consumers", async () => {
    getSessionMock.mockResolvedValue({ data: { session: SESSION } });
    render(<AuthProvider><Consumer label="a" /><Consumer label="b" /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("a-state")).toHaveTextContent("auth:user-1"));
    fromUsersSpy.mockClear();
    await act(async () => { fireEvent.click(screen.getByTestId("a-refresh")); });
    await waitFor(() => expect(fromUsersSpy).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId("a-state")).toHaveTextContent("auth:user-1");
    expect(screen.getByTestId("b-state")).toHaveTextContent("auth:user-1");
  });
});

describe("AuthProvider — safety timeout & retry", () => {
  afterEach(() => { vi.useRealTimers(); });

  it("safety timeout releases loading without clearing a valid session", async () => {
    vi.useFakeTimers();
    getSessionMock.mockResolvedValue({ data: { session: SESSION } });
    // Profile read resolves only after 10s → the 5s safety timer must win first.
    usersMaybeSingle.mockReturnValue(
      new Promise((res) => setTimeout(() => res({ data: USER_ROW, error: null }), 10_000)),
    );
    render(<AuthProvider><Consumer label="a" /></AuthProvider>);
    // Advance to the 5s safety timer: session was set before the (still-pending)
    // profile read, so loading releases while the session stays valid — authenticated
    // with the row not yet loaded ("auth:no-row"), never "anon" and never stuck "loading".
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByTestId("a-state")).toHaveTextContent("auth:no-row");
  });

  it("fetchUserWithRetry retries a null/null trigger-lag row then succeeds", async () => {
    vi.useFakeTimers();
    getSessionMock.mockResolvedValue({ data: { session: SESSION } });
    usersMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })   // row not created yet
      .mockResolvedValueOnce({ data: USER_ROW, error: null }); // 500ms retry succeeds
    render(<AuthProvider><Consumer label="a" /></AuthProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(screen.getByTestId("a-state")).toHaveTextContent("auth:user-1");
    expect(fromUsersSpy).toHaveBeenCalledTimes(2);
  });

  it("profile error resolves to authenticated with no row (no infinite loading)", async () => {
    getSessionMock.mockResolvedValue({ data: { session: SESSION } });
    usersMaybeSingle.mockResolvedValue({ data: null, error: { message: "boom" } });
    render(<AuthProvider><Consumer label="a" /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId("a-state")).toHaveTextContent("auth:no-row"));
  });
});
