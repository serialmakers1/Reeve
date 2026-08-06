/**
 * Discriminated union for property_activity_log.payload.
 *
 * Every variant carries `summary: string` so the timeline UI can always render
 * a human-readable line regardless of which variant is present.
 *
 * Writers: property_activity_log_writer trigger, approve_edit_request RPC,
 * reject_edit_request RPC, and any future admin action RPCs. All writers must
 * use one of these variants — no free-form payloads.
 *
 * Readers: narrow via `switch (payload.action)`.
 */

export type ActivityLogPayload =
  // ── Trigger-written variants (property_activity_log_writer on properties) ──
  | { action: "listing_started"; summary: string }
  | {
      action: "listing_submitted";
      summary: string;
      from_status?: string;
      to_status?: string;
    }
  | {
      action: "listing_rejected";
      summary: string;
      from_status?: string;
      to_status?: string;
      reason?: string;
    }
  | {
      action: "listing_approved";
      summary: string;
      from_status?: string;
      to_status?: string;
    }
  | {
      action: "listing_withdrawn";
      summary: string;
      from_status?: string;
      to_status?: string;
    }
  | {
      action: "edit_submitted";
      summary: string;
      from_status?: string;
      to_status?: string;
      edit_request_id?: string;
      changed_field_keys?: string[];
    }
  | {
      action: "edit_resolved";
      summary: string;
      from_status?: string;
      to_status?: string;
      edit_request_id?: string;
    }
  | {
      action: "relisted";
      summary: string;
      from_status?: string;
      to_status?: string;
    }
  | {
      action: "unlisted";
      summary: string;
      from_status?: string;
      to_status?: string;
    }
  | {
      action: "archived";
      summary: string;
      from_status?: string;
      to_status?: string;
    }
  | {
      action: "status_changed";
      summary: string;
      from_status: string;
      to_status: string;
    }
  // ── RPC-written variants ─────────────────────────────────────────────────
  | {
      action: "edit_approved";
      summary: string;
      edit_request_id: string;
      changed_field_keys: string[];
      admin_id: string;
    }
  | {
      action: "edit_rejected";
      summary: string;
      edit_request_id: string;
      reason: string;
      admin_id: string;
    }
  // ── Admin direct edit (D-111) ────────────────────────────────────────────
  | {
      action: "admin_edit";
      summary: string;
      admin_id: string;
      changed_field_keys?: string[];
    }
  // ── Stale-listing system ─────────────────────────────────────────────────
  | {
      action: "availability_confirmed";
      summary: string;
    }
  | {
      action: "sale_listing_confirmed";
      summary: string;
    }
  | {
      action: "auto_unlisted";
      summary: string;
      from_status?: string;
      to_status?: string;
      reason?: string;
    };

export type ActivityLogAction = ActivityLogPayload["action"];

export type ActivityLogRow = {
  id: string;
  property_id: string;
  actor_id: string | null;
  actor_role: "owner" | "admin" | "system";
  action: ActivityLogAction;
  payload: ActivityLogPayload;
  is_public: boolean;
  created_at: string;
};
