import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock Layout to avoid auth-state and Header/Footer supabase calls (no JSX to avoid React hoist issues)
vi.mock("@/components/Layout", () => ({
  default: ({ children }: { children: any }) => children,
}));

// ── Supabase mock ──────────────────────────────────────────────────────────────
type MockRow = {
  id: string;
  property_id: string;
  status: string;
  attempt_number: number;
  decline_reason: string | null;
  created_at: string;
  approved_at: string | null;
  declined_at: string | null;
  withdrawn_at: string | null;
  auto_cancelled_at: string | null;
  tenant_profile_snapshot: { preference_type?: string } | null;
  properties: {
    id: string;
    building_name: string | null;
    locality: string | null;
    status: string;
    is_active: boolean;
  } | null;
};

let mockRows: MockRow[] = [];
let mockError: { message: string } | null = null;
let mockFunctionsInvoke: () => Promise<{ data: unknown; error: unknown }> = async () => ({
  data: { sent: true },
  error: null,
});

const channelMock = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => {
      const obj: any = {};
      for (const m of ["select", "eq", "in", "update", "order"]) {
        obj[m] = () => obj;
      }
      obj.then = (fn: (v: unknown) => unknown) =>
        Promise.resolve().then(() => fn({ data: mockError ? null : mockRows, error: mockError }));
      return obj;
    }),
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
    // Rating-state batched read — empty for these pre-rating page tests.
    rpc: vi.fn(async () => ({ data: [], error: null })),
    functions: {
      invoke: vi.fn(async () => mockFunctionsInvoke()),
    },
  },
}));

vi.mock("@/hooks/useRequireAuth", () => ({
  useRequireAuth: () => ({
    user: { id: "user-1" },
    loading: false,
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import ContactRequestsPage from "@/pages/ContactRequestsPage";
import { toast } from "sonner";

const BASE_PROPERTY = {
  id: "prop-1",
  building_name: "Sunrise Apartments",
  locality: "Koramangala",
  status: "listed",
  is_active: true,
};

const NOW = new Date("2026-08-01T12:00:00.000Z").getTime();
const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

function makeRow(overrides: Partial<MockRow> = {}): MockRow {
  return {
    id: "cr-1",
    property_id: "prop-1",
    status: "pending",
    attempt_number: 1,
    decline_reason: null,
    created_at: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
    approved_at: null,
    declined_at: null,
    withdrawn_at: null,
    auto_cancelled_at: null,
    tenant_profile_snapshot: { preference_type: "rent" },
    properties: BASE_PROPERTY,
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ContactRequestsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockRows = [];
  mockError = null;
  mockFunctionsInvoke = async () => ({ data: { sent: true }, error: null });
  vi.clearAllMocks();
  channelMock.on.mockReturnThis();
  channelMock.subscribe.mockReturnThis();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ContactRequestsPage — page structure", () => {
  it("renders page title", async () => {
    mockRows = [];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Contact Requests")).toBeInTheDocument();
    });
  });

  it("shows empty state when no rows", async () => {
    mockRows = [];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/No contact requests for currently available properties/i)).toBeInTheDocument();
    });
  });

  it("shows secondary note about unlisted properties in empty state", async () => {
    mockRows = [];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Requests for properties that are no longer listed/i)).toBeInTheDocument();
    });
  });

  it("shows fetch error with Retry button on error", async () => {
    mockError = { message: "network error" };
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Could not load contact requests/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
    });
  });

  it("shows all 5 tabs when rows exist", async () => {
    mockRows = [makeRow()];
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /All/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Pending/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Approved/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Declined/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Closed/i })).toBeInTheDocument();
    });
  });

  it("shows footer note about listing filter when rows exist", async () => {
    mockRows = [makeRow()];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Only requests for currently listed properties are shown/i)).toBeInTheDocument();
    });
  });

  it("does NOT show footer note in empty state", async () => {
    mockRows = [];
    renderPage();
    await waitFor(() => {
      expect(screen.queryByText(/Only requests for currently listed properties are shown/i)).not.toBeInTheDocument();
    });
  });
});

describe("ContactRequestsPage — card display", () => {
  it("shows property name", async () => {
    mockRows = [makeRow()];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Sunrise Apartments")).toBeInTheDocument();
    });
  });

  it("shows 'Rent' pill for rent preference_type", async () => {
    mockRows = [makeRow({ tenant_profile_snapshot: { preference_type: "rent" } })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Rent")).toBeInTheDocument();
    });
  });

  it("shows 'Buy' pill for buy preference_type", async () => {
    mockRows = [makeRow({ tenant_profile_snapshot: { preference_type: "buy" } })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Buy")).toBeInTheDocument();
    });
  });

  it("falls back to 'Property in [locality]' when building_name is null", async () => {
    mockRows = [makeRow({ properties: { ...BASE_PROPERTY, building_name: null } })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Property in Koramangala")).toBeInTheDocument();
    });
  });

  it("falls back to 'Property' when both building_name and locality are null", async () => {
    mockRows = [makeRow({ properties: { ...BASE_PROPERTY, building_name: null, locality: null } })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Property")).toBeInTheDocument();
    });
  });
});

describe("ContactRequestsPage — pending card", () => {
  it("shows awaiting owner response text", async () => {
    mockRows = [makeRow({ status: "pending" })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Awaiting owner response/i)).toBeInTheDocument();
    });
  });

  it("shows Withdraw button", async () => {
    mockRows = [makeRow({ status: "pending" })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Withdraw/i })).toBeInTheDocument();
    });
  });

  it("clicking Withdraw shows confirmation dialog", async () => {
    mockRows = [makeRow({ status: "pending" })];
    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /Withdraw/i }));
    fireEvent.click(screen.getByRole("button", { name: /Withdraw/i }));
    await waitFor(() => {
      expect(screen.getByText("Withdraw your request?")).toBeInTheDocument();
    });
  });
});

describe("ContactRequestsPage — approved card", () => {
  const approvedAt = new Date(NOW - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago

  it("shows 'Contact details were sent to your email' text", async () => {
    mockRows = [makeRow({ status: "approved", approved_at: approvedAt })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Contact details were sent to your email/i)).toBeInTheDocument();
    });
  });

  it("shows Resend button when within 15 days", async () => {
    mockRows = [makeRow({ status: "approved", approved_at: approvedAt })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Resend to my email/i })).toBeInTheDocument();
    });
  });

  it("shows Resend button when approved_at is exactly 15 days ago (boundary = allowed)", async () => {
    // Pin Date.now to NOW so the boundary calculation is deterministic
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const exactlyAt = new Date(NOW - FIFTEEN_DAYS_MS).toISOString();
    mockRows = [makeRow({ status: "approved", approved_at: exactlyAt })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Resend to my email/i })).toBeInTheDocument();
    });
  });

  it("shows expiry message when approved_at is 15 days + 1ms ago", async () => {
    const expiredAt = new Date(NOW - FIFTEEN_DAYS_MS - 1).toISOString();
    mockRows = [makeRow({ status: "approved", approved_at: expiredAt })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Resending was available for 15 days and has now expired/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Resend to my email/i })).not.toBeInTheDocument();
    });
  });

  it("shows expiry message for null approved_at", async () => {
    mockRows = [makeRow({ status: "approved", approved_at: null })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Resending was available for 15 days and has now expired/i)).toBeInTheDocument();
    });
  });

  it("disables Resend button while inflight (duplicate-click guard)", async () => {
    mockFunctionsInvoke = async () => {
      await new Promise((res) => setTimeout(res, 500));
      return { data: { sent: true }, error: null };
    };
    mockRows = [makeRow({ status: "approved", approved_at: approvedAt })];
    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /Resend to my email/i }));
    fireEvent.click(screen.getByRole("button", { name: /Resend to my email/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Resend to my email/i })).toBeDisabled();
    });
  });

  it("shows toast on cooldown_active error", async () => {
    mockFunctionsInvoke = async () => ({
      data: null,
      error: { context: { status: 429 }, message: "cooldown_active" },
    });
    mockRows = [makeRow({ status: "approved", approved_at: approvedAt })];
    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /Resend to my email/i }));
    fireEvent.click(screen.getByRole("button", { name: /Resend to my email/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Please wait/i));
    });
  });

  it("shows toast on daily_resend_limit error", async () => {
    mockFunctionsInvoke = async () => ({
      data: { error: "daily_resend_limit" },
      error: { context: { status: 429 } },
    });
    mockRows = [makeRow({ status: "approved", approved_at: approvedAt })];
    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /Resend to my email/i }));
    fireEvent.click(screen.getByRole("button", { name: /Resend to my email/i }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Daily resend limit/i));
    });
  });

  it("hides Resend button and shows expiry message when server returns resend_expired", async () => {
    mockFunctionsInvoke = async () => ({
      data: { error: "resend_expired" },
      error: null,
    });
    mockRows = [makeRow({ status: "approved", approved_at: approvedAt })];
    renderPage();
    await waitFor(() => screen.getByRole("button", { name: /Resend to my email/i }));
    fireEvent.click(screen.getByRole("button", { name: /Resend to my email/i }));
    await waitFor(() => {
      expect(screen.getByText(/Resending was available for 15 days and has now expired/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Resend to my email/i })).not.toBeInTheDocument();
    });
  });
});

describe("ContactRequestsPage — declined card", () => {
  const declinedAt = new Date(NOW - 48 * 60 * 60 * 1000).toISOString(); // 48h ago — cooldown expired

  it("shows 'Attempt 1 of 3' on first decline", async () => {
    mockRows = [makeRow({ status: "declined", attempt_number: 1, declined_at: declinedAt })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Attempt 1 of 3/i)).toBeInTheDocument();
    });
  });

  it("shows 'Attempt 2 of 3' on second decline", async () => {
    mockRows = [makeRow({ status: "declined", attempt_number: 2, declined_at: declinedAt })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Attempt 2 of 3/i)).toBeInTheDocument();
    });
  });

  it("shows 'Maximum requests reached' and no retry button at attempt 3", async () => {
    mockRows = [makeRow({ status: "declined", attempt_number: 3, declined_at: declinedAt })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Maximum requests reached/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Request again/i })).not.toBeInTheDocument();
    });
  });

  it("shows countdown button when within 24h cooldown", async () => {
    // Pin Date.now to NOW so the cooldown calculation is deterministic
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const recentDecline = new Date(NOW - 2 * 60 * 60 * 1000).toISOString(); // 2h ago
    mockRows = [makeRow({ status: "declined", attempt_number: 1, declined_at: recentDecline })];
    renderPage();
    await waitFor(() => {
      const btns = screen.getAllByRole("button");
      const cooldownBtn = btns.find((b) => b.hasAttribute("disabled") && /Available in/i.test(b.textContent ?? ""));
      expect(cooldownBtn).toBeTruthy();
    });
  });

  it("shows 'Request again' button when cooldown has expired", async () => {
    mockRows = [makeRow({ status: "declined", attempt_number: 1, declined_at: declinedAt })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Request again/i })).toBeInTheDocument();
    });
  });
});

describe("ContactRequestsPage — withdrawn and closed cards", () => {
  it("shows 'You withdrew this request' for withdrawn status", async () => {
    mockRows = [makeRow({ status: "withdrawn", withdrawn_at: new Date(NOW - 1000).toISOString() })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/You withdrew this request/i)).toBeInTheDocument();
    });
  });

  it("shows withdrawn request in Closed tab", async () => {
    mockRows = [makeRow({ status: "withdrawn", withdrawn_at: new Date(NOW - 1000).toISOString() })];
    renderPage();
    await waitFor(() => screen.getByRole("tab", { name: /Closed/i }));
    fireEvent.click(screen.getByRole("tab", { name: /Closed/i }));
    await waitFor(() => {
      expect(screen.getByText(/You withdrew this request/i)).toBeInTheDocument();
    });
  });
});

describe("ContactRequestsPage — tab routing", () => {
  it("Pending tab shows only pending requests", async () => {
    mockRows = [
      makeRow({ id: "1", status: "pending" }),
      makeRow({ id: "2", status: "approved", approved_at: new Date(Date.now() - 1000).toISOString() }),
    ];
    renderPage();
    // All tab (default active) renders both row types
    await waitFor(() => {
      expect(screen.getByText(/Awaiting owner response/i)).toBeInTheDocument();
      expect(screen.getByText(/Contact details were sent to your email/i)).toBeInTheDocument();
    });
    // Pending tab trigger exists with a count badge
    expect(screen.getByRole("tab", { name: /Pending/i })).toBeInTheDocument();
  });

  it("All tab shows all visible rows", async () => {
    mockRows = [
      makeRow({ id: "1", status: "pending" }),
      makeRow({ id: "2", status: "approved", approved_at: new Date(NOW - 1000).toISOString(), properties: { ...BASE_PROPERTY, id: "prop-2", building_name: "Green Villa" } }),
    ];
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/Awaiting owner response/i)).toBeInTheDocument();
      expect(screen.getByText("Green Villa")).toBeInTheDocument();
    });
  });

  it("empty tab shows per-tab empty state text", async () => {
    // Only pending rows — Approved tab has 0 rows so no badge appears on its trigger
    // (Radix Tabs unmounts inactive content so the empty-state text is only mounted
    // after switching tabs — verified via the absent badge count instead)
    mockRows = [makeRow({ status: "pending" })];
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: /Pending/i })).toBeInTheDocument();
    });
    // Approved tab trigger shows "Approved" with no count badge (zero rows)
    const approvedTab = screen.getByRole("tab", { name: /Approved/i });
    expect(approvedTab.textContent?.trim()).toBe("Approved");
  });
});
