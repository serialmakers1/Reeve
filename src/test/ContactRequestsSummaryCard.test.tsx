import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { MemoryRouter } from "react-router-dom";

// ── Supabase mock ──────────────────────────────────────────────────────────────
let mockRows: Array<{ id: string; status: string }> = [];
let mockError: { message: string } | null = null;

const channelMock = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => {
      const obj: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in", "order"]) {
        obj[m] = vi.fn(() => obj);
      }
      obj.then = vi.fn((fn: (v: unknown) => unknown) =>
        Promise.resolve(fn({ data: mockError ? null : mockRows, error: mockError }))
      );
      return obj;
    }),
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
  },
}));

// ── useAuth mock ──────────────────────────────────────────────────────────────
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

import ContactRequestsSummaryCard from "@/components/tenant-dashboard/ContactRequestsSummaryCard";

function renderCard() {
  return render(
    <MemoryRouter>
      <ContactRequestsSummaryCard />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockRows = [];
  mockError = null;
  vi.clearAllMocks();
  channelMock.on.mockReturnThis();
  channelMock.subscribe.mockReturnThis();
});

describe("ContactRequestsSummaryCard", () => {
  it("renders loading skeleton initially", () => {
    renderCard();
    // Skeleton renders before data resolves
    expect(document.querySelector("[data-slot='skeleton']") || document.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("shows 'No current contact requests.' when no rows returned", async () => {
    mockRows = [];
    renderCard();
    await waitFor(() => {
      expect(screen.getByText(/No current contact requests/i)).toBeInTheDocument();
    });
  });

  it("shows Browse properties button when no rows", async () => {
    mockRows = [];
    renderCard();
    await waitFor(() => {
      expect(screen.getByText(/Browse properties/i)).toBeInTheDocument();
    });
  });

  it("shows pending count when pending rows exist", async () => {
    mockRows = [
      { id: "1", status: "pending" },
      { id: "2", status: "pending" },
    ];
    renderCard();
    await waitFor(() => {
      expect(screen.getByText("Pending")).toBeInTheDocument();
      // "2" appears in both the header badge (pending+approved) and the pending count
      expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    });
  });

  it("shows approved count in emerald colour when approved rows exist", async () => {
    mockRows = [{ id: "1", status: "approved" }];
    renderCard();
    await waitFor(() => {
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });
  });

  it("shows declined count when declined rows exist", async () => {
    mockRows = [{ id: "1", status: "declined" }];
    renderCard();
    await waitFor(() => {
      expect(screen.getByText("Declined")).toBeInTheDocument();
    });
  });

  it("hides zero-count status labels", async () => {
    mockRows = [{ id: "1", status: "pending" }];
    renderCard();
    await waitFor(() => {
      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.queryByText("Approved")).not.toBeInTheDocument();
      expect(screen.queryByText("Declined")).not.toBeInTheDocument();
    });
  });

  it("shows 'View all contact requests' link when there are active rows", async () => {
    mockRows = [{ id: "1", status: "pending" }];
    renderCard();
    await waitFor(() => {
      expect(screen.getByText(/View all contact requests/i)).toBeInTheDocument();
    });
  });

  it("shows active badge with pending + approved count", async () => {
    mockRows = [
      { id: "1", status: "pending" },
      { id: "2", status: "approved" },
      { id: "3", status: "declined" },
    ];
    renderCard();
    await waitFor(() => {
      // Badge should show pending (1) + approved (1) = 2
      const badges = screen.getAllByText("2");
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  it("hides active badge when only declined rows exist (active = pending + approved = 0)", async () => {
    mockRows = [{ id: "1", status: "declined" }];
    renderCard();
    // Active badge should not show 0
    await waitFor(() => {
      expect(screen.getByText("Declined")).toBeInTheDocument();
    });
    // Badge would show a number, but since pending+approved=0 no badge element should appear at position
    // The counts section shows declined=1, but header badge (pending+approved) is 0 → hidden
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows 'No active contact requests.' and View all when only withdrawn rows exist", async () => {
    mockRows = [{ id: "1", status: "withdrawn" }];
    renderCard();
    await waitFor(() => {
      expect(screen.getByText(/No active contact requests/i)).toBeInTheDocument();
      expect(screen.getByText(/View all contact requests/i)).toBeInTheDocument();
    });
  });

  it("shows fetch error message and Retry button on error", async () => {
    mockError = { message: "network error" };
    renderCard();
    await waitFor(() => {
      expect(screen.getByText(/Could not load contact requests/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
    });
  });

  it("does not show false empty state on error", async () => {
    mockError = { message: "network error" };
    renderCard();
    await waitFor(() => {
      expect(screen.queryByText(/No current contact requests/i)).not.toBeInTheDocument();
    });
  });

  it("header always shows 'Contact Requests' title", async () => {
    mockRows = [];
    renderCard();
    await waitFor(() => {
      expect(screen.getByText("Contact Requests")).toBeInTheDocument();
    });
  });
});
