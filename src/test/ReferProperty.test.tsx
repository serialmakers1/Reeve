import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Session } from "@supabase/supabase-js";
import ReferProperty from "@/pages/ReferProperty";
import { useAuth } from "@/hooks/useAuth";
import type { AppUser } from "@/hooks/useAuth";

// Isolate from Header/Footer/BottomNav complexity
vi.mock("@/components/Layout", () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/hooks/useAuth");

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUseAuth = vi.mocked(useAuth);

const MOCK_USER: AppUser = {
  id: "test-user-id",
  email: null,
  full_name: "Test User",
  phone: null,
  role: "tenant",
  phone_verified: false,
  email_verified: false,
  auth_provider: null,
};

const WITH_SESSION = {
  session: { user: { id: "test-user-id" } } as unknown as Session,
  user: MOCK_USER,
  isLoading: false,
  isAuthenticated: true,
  signOut: vi.fn(),
  refreshUser: vi.fn(),
};

const NO_SESSION = {
  session: null,
  user: null,
  isLoading: false,
  isAuthenticated: false,
  signOut: vi.fn(),
  refreshUser: vi.fn(),
};

function renderPage() {
  return render(
    <MemoryRouter>
      <ReferProperty />
    </MemoryRouter>
  );
}

function clickSubmit() {
  fireEvent.click(screen.getByRole("button", { name: /submit referral/i }));
}

function tryFillByLabel(labelPattern: RegExp, value: string) {
  const el = screen.queryByLabelText(labelPattern);
  if (el) fireEvent.change(el, { target: { value } });
}

function fillRequiredFields() {
  tryFillByLabel(/your name/i, "Rahul Kumar");
  tryFillByLabel(/your phone number/i, "9876543210");
  tryFillByLabel(/owner.*phone/i, "8765432109");
  tryFillByLabel(/building name/i, "Prestige Towers");
  tryFillByLabel(/locality/i, "Koramangala");
}

// ── Validation tests (form rendered with active session) ──────────────────────

describe("validate() — required field errors", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(WITH_SESSION);
  });

  it("referrer_name missing → error", () => {
    renderPage();
    clickSubmit();
    // Fails before implementation: field doesn't exist, error never appears
    expect(
      screen.getByText(/your name must be at least 3 characters/i)
    ).toBeInTheDocument();
  });

  it("referrer_phone invalid (non-10-digit) → error", () => {
    renderPage();
    tryFillByLabel(/your phone number/i, "123");
    clickSubmit();
    // Fails before implementation: field doesn't exist, error never appears
    expect(
      screen.getByText(/your phone number must be 10 digits/i)
    ).toBeInTheDocument();
  });

  it("owner_phone missing → error", () => {
    renderPage();
    clickSubmit();
    expect(
      screen.getByText(/enter the owner.*10-digit phone/i)
    ).toBeInTheDocument();
  });

  it("building_name missing → error", () => {
    renderPage();
    clickSubmit();
    expect(screen.getByText(/building name is required/i)).toBeInTheDocument();
  });

  it("locality missing → error", () => {
    renderPage();
    clickSubmit();
    expect(screen.getByText(/locality is required/i)).toBeInTheDocument();
  });
});

// ── Validation tests — optional fields produce NO error ───────────────────────

describe("validate() — optional fields produce no error", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(WITH_SESSION);
  });

  it("owner_name empty → no error (optional)", () => {
    renderPage();
    fillRequiredFields();
    // intentionally leave owner_name empty
    clickSubmit();
    // Fails before implementation: owner_name is currently required
    expect(
      screen.queryByText(/owner name must be at least/i)
    ).not.toBeInTheDocument();
  });

  it("bhk empty → no error (optional)", () => {
    renderPage();
    fillRequiredFields();
    // intentionally leave bhk empty
    clickSubmit();
    // Fails before implementation: bhk is currently required
    expect(
      screen.queryByText(/select a bhk type/i)
    ).not.toBeInTheDocument();
  });

  it("expected_rent empty → no error (optional)", () => {
    renderPage();
    fillRequiredFields();
    // intentionally leave expected_rent empty
    clickSubmit();
    // Fails before implementation: expected_rent is currently required
    expect(
      screen.queryByText(/enter a valid rent amount/i)
    ).not.toBeInTheDocument();
  });
});

// ── UI / structural tests ─────────────────────────────────────────────────────

describe("UI — form renders without session (no login gate)", () => {
  it("renders form card, not login wall, when unauthenticated", () => {
    mockUseAuth.mockReturnValue(NO_SESSION);
    renderPage();
    // Fails before implementation: login gate shows instead
    expect(
      screen.queryByText(/log in to refer a property/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /found a flat you like/i })
    ).toBeInTheDocument();
  });
});

describe("UI — incentive copy and field structure", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(WITH_SESSION);
  });

  it("incentive copy node appears before the first form field in DOM order", () => {
    renderPage();
    const incentiveEl = screen.queryByText(/reeve fee drops/i);
    // Fails before implementation: incentive block doesn't exist
    expect(incentiveEl).not.toBeNull();
    const firstInput = document.querySelector("input");
    expect(firstInput).not.toBeNull();
    // incentiveEl must precede firstInput in document
    expect(
      incentiveEl!.compareDocumentPosition(firstInput!) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("city input is disabled / readOnly", () => {
    renderPage();
    // Fails before implementation: city is a plain editable input
    const cityInput = screen.getByDisplayValue("Bangalore");
    expect(cityInput).toBeDisabled();
  });
});
