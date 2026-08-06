/**
 * Owner-facing status + action explanations.
 *
 * Single source of truth for:
 *  - STATUS_EXPLANATIONS: plain-language meaning of each Commons status.
 *  - ACTION_EXPLANATIONS: owner label + consequence for each real ActionsBar action.
 *  - getOwnerActions(status): which actions a status allows — the SAME conditions
 *    ActionsBar renders, so the card info trigger can never advertise an action
 *    the page does not actually offer.
 *
 * Consumed by: StatusActionGlossary (Details tab), StatusInfoButton (cards),
 * and ActionsBar (OwnerPropertyManagement) which is refactored to use
 * getOwnerActions() for its availability logic.
 */

export interface StatusExplanation {
  label: string;
  explanation: string;
}

// Keyed by DB status. Labels mirror getStatusDisplay() for consistency.
export const STATUS_EXPLANATIONS: Record<string, StatusExplanation> = {
  draft: {
    label: "Draft",
    explanation:
      "You've started this listing but haven't submitted it. It isn't visible to anyone. Finish the required sections and submit it for review to go live.",
  },
  pending_review: {
    label: "Under Review",
    explanation:
      "You've submitted this listing and our team is reviewing it (usually within 24–48 hours). It isn't visible to tenants yet. You can withdraw it back to draft anytime before it's approved.",
  },
  changes_requested: {
    label: "Changes Requested",
    explanation:
      "Our team reviewed this listing and asked for changes before it can go live. Read the note shown on this page, update the listing, and submit it again.",
  },
  listed: {
    label: "Live",
    explanation:
      "This listing is live and visible to tenants, who can request your contact. Any edits you make are reviewed before they replace the live version.",
  },
  edit_pending_review: {
    label: "Live · Edit Under Review",
    explanation:
      "Your listing stays live with its current details while your recent edit is reviewed. Once approved, the edit replaces the live version. You can modify or cancel the pending edit anytime.",
  },
  unlisted: {
    label: "Unlisted",
    explanation:
      "This listing is hidden from tenants. Re-list it to make it visible again — if nothing changed, it goes live immediately.",
  },
  archived: {
    label: "Archived",
    explanation:
      "This listing is archived and hidden everywhere. Contact support to restore it.",
  },
};

export type OwnerActionKey =
  | "edit"
  | "withdraw_submission"
  | "unlist"
  | "relist"
  | "cancel_edit"
  | "archive";

export interface ActionExplanation {
  label: string;
  explanation: string;
}

export const ACTION_EXPLANATIONS: Record<OwnerActionKey, ActionExplanation> = {
  edit: {
    label: "Edit",
    explanation:
      "Open the listing form to change details. While live, your changes are reviewed before they replace the public version.",
  },
  withdraw_submission: {
    label: "Withdraw submission",
    explanation:
      "Pull a submitted listing back to draft so you can keep editing. It leaves the review queue and stays hidden from tenants.",
  },
  unlist: {
    label: "Unlist",
    explanation:
      "Temporarily hide a live listing from tenants. Your details are kept and you can re-list anytime.",
  },
  relist: {
    label: "Re-list",
    explanation:
      "Make an unlisted listing visible to tenants again. If nothing changed, it goes live immediately.",
  },
  cancel_edit: {
    label: "Cancel pending edit",
    explanation:
      "Discard the edit that's under review. Your live listing stays exactly as it is now.",
  },
  archive: {
    // Label shown in the UI is "Cancel listing" — archives the property.
    label: "Cancel listing",
    explanation:
      "Archive this listing and remove it from your dashboard and from tenants. Contact support to restore it later.",
  },
};

/**
 * Actions available for a given status — mirrors ActionsBar's inline conditions
 * exactly. Order is display order.
 */
export function getOwnerActions(status: string): OwnerActionKey[] {
  switch (status) {
    case "draft":
    case "changes_requested":
      return ["edit", "archive"];
    case "pending_review":
      return ["withdraw_submission", "archive"];
    case "listed":
      return ["edit", "unlist", "archive"];
    case "edit_pending_review":
      return ["edit", "cancel_edit", "archive"];
    case "unlisted":
      return ["relist", "archive"];
    default:
      // Legacy / PM-era statuses have no owner actions here.
      return [];
  }
}
