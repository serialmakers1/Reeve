/**
 * Accessibility coverage for ReportModal: Radix requires DialogContent to have both
 * an accessible name (DialogTitle) and a description (DialogDescription). This asserts
 * the dialog exposes both; the description is sr-only so there is no visual change.
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn().mockResolvedValue({ data: null, error: null }) },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import ReportModal from "@/components/comments/ReportModal";

describe("ReportModal accessibility", () => {
  it("exposes an accessible dialog name and description", () => {
    render(
      <ReportModal open commentId="c-1" onOpenChange={vi.fn()} onReported={vi.fn()} />,
    );

    const dialog = screen.getByRole("dialog", { name: /report comment/i });
    expect(dialog).toBeInTheDocument();

    // Description text is present (sr-only) and wired via aria-describedby.
    const desc = screen.getByText(/tell us why you're reporting this comment/i);
    expect(desc).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-describedby", desc.id);
  });
});
