/**
 * TanStack Query hooks for the admin Comment Moderation page.
 *
 * All reads/writes go through the Prompt-1 admin RPCs (RPC-only surface). Keyed
 * caches give stale-request safety and one-call invalidation so the three tabs +
 * sidebar badge stay consistent after an Unhide/Delete.
 */
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { ADMIN_PAGE_SIZE } from "@/pages/admin/adminPropertyHelpers";
import type { ModerationAction } from "./moderationHelpers";

type Fns = Database["public"]["Functions"];
export type ReviewQueueRow = Fns["get_admin_comment_review_queue"]["Returns"][number];
export type AdminCommentRow = Fns["get_admin_comments_page"]["Returns"][number];
export type ReportDetailRow = Fns["get_admin_comment_report_details"]["Returns"][number];
export type UserSignalRow = Fns["get_admin_user_signals"]["Returns"][number];

export interface PageResult<T> {
  rows: T[];
  total: number;
}

// ── Params ───────────────────────────────────────────────────────────────────

export interface ReviewQueueParams {
  search: string;
  reason: string;
  authorType: string;
  sort: string;
  page: number;
}
export interface AdminCommentsParams {
  search: string;
  state: string;
  bucket: string;
  authorType: string;
  propertyStatus: string;
  sort: string;
  page: number;
}
export interface UserSignalsParams {
  search: string;
  sort: string;
  page: number;
}

// ── Query keys (all under one prefix so one invalidate refreshes everything) ──

export const moderationKeys = {
  all: ["commentModeration"] as const,
  reviewQueue: (p: ReviewQueueParams) => ["commentModeration", "reviewQueue", p] as const,
  comments: (p: AdminCommentsParams) => ["commentModeration", "comments", p] as const,
  userSignals: (p: UserSignalsParams) => ["commentModeration", "userSignals", p] as const,
  reportDetails: (commentId: string) => ["commentModeration", "reportDetails", commentId] as const,
  parent: (propertyId: string, parentId: string) =>
    ["commentModeration", "parent", propertyId, parentId] as const,
  badge: () => ["commentModeration", "badge"] as const,
};

const nullIfBlank = (s: string): string | null => (s && s.trim() !== "" && s !== "all" ? s : null);
const offsetFor = (page: number): number => (page - 1) * ADMIN_PAGE_SIZE;

// ── Review Queue ─────────────────────────────────────────────────────────────

export function useReviewQueue(params: ReviewQueueParams) {
  return useQuery({
    queryKey: moderationKeys.reviewQueue(params),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PageResult<ReviewQueueRow>> => {
      const { data, error } = await supabase.rpc("get_admin_comment_review_queue", {
        p_search: nullIfBlank(params.search) ?? undefined,
        p_reason: nullIfBlank(params.reason) ?? undefined,
        p_author_type: nullIfBlank(params.authorType) ?? undefined,
        p_sort: params.sort,
        p_limit: ADMIN_PAGE_SIZE,
        p_offset: offsetFor(params.page),
      });
      if (error) throw error;
      const rows = (data ?? []) as ReviewQueueRow[];
      return { rows, total: rows[0]?.total_count ?? 0 };
    },
  });
}

// ── All Comments ─────────────────────────────────────────────────────────────

export function useAdminComments(params: AdminCommentsParams) {
  return useQuery({
    queryKey: moderationKeys.comments(params),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PageResult<AdminCommentRow>> => {
      const { data, error } = await supabase.rpc("get_admin_comments_page", {
        p_search: nullIfBlank(params.search) ?? undefined,
        p_state: nullIfBlank(params.state) ?? undefined,
        p_report_bucket: nullIfBlank(params.bucket) ?? undefined,
        p_author_type: nullIfBlank(params.authorType) ?? undefined,
        p_property_status: nullIfBlank(params.propertyStatus) ?? undefined,
        p_sort: params.sort,
        p_limit: ADMIN_PAGE_SIZE,
        p_offset: offsetFor(params.page),
      });
      if (error) throw error;
      const rows = (data ?? []) as AdminCommentRow[];
      return { rows, total: rows[0]?.total_count ?? 0 };
    },
  });
}

// ── User Signals ─────────────────────────────────────────────────────────────

export function useUserSignals(params: UserSignalsParams) {
  return useQuery({
    queryKey: moderationKeys.userSignals(params),
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PageResult<UserSignalRow>> => {
      const { data, error } = await supabase.rpc("get_admin_user_signals", {
        p_search: nullIfBlank(params.search) ?? undefined,
        p_sort: params.sort,
        p_limit: ADMIN_PAGE_SIZE,
        p_offset: offsetFor(params.page),
      });
      if (error) throw error;
      const rows = (data ?? []) as UserSignalRow[];
      return { rows, total: rows[0]?.total_count ?? 0 };
    },
  });
}

// ── Report details for the detail sheet (isolated error state) ────────────────

export function useReportDetails(commentId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: moderationKeys.reportDetails(commentId ?? ""),
    enabled: enabled && !!commentId,
    queryFn: async (): Promise<ReportDetailRow[]> => {
      const { data, error } = await supabase.rpc("get_admin_comment_report_details", {
        p_comment_id: commentId!,
      });
      if (error) throw error;
      return (data ?? []) as ReportDetailRow[];
    },
  });
}

// ── Best-effort parent context for replies (existing public RPC, no DB change) ─

export interface ParentContext {
  text: string;
  pseudonym: string | null;
  isDeleted: boolean;
}

export function useParentContext(
  propertyId: string | null,
  parentId: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: moderationKeys.parent(propertyId ?? "", parentId ?? ""),
    enabled: enabled && !!propertyId && !!parentId,
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<ParentContext | null> => {
      const { data, error } = await supabase.rpc("get_property_comments", {
        p_property_id: propertyId!,
        p_cursor: undefined,
        p_limit: 100,
      });
      if (error) throw error;
      const rows = (data ?? []) as Array<{
        comment_id: string;
        text: string;
        pseudonym: string | null;
        hidden_reason: string | null;
      }>;
      const found = rows.find((r) => r.comment_id === parentId);
      if (!found) return null;
      return {
        text: found.text,
        pseudonym: found.pseudonym ?? null,
        isDeleted: !!found.hidden_reason || found.text === "[deleted]",
      };
    },
  });
}

// ── Sidebar badge — cheap count, fully non-blocking ───────────────────────────

export function useReviewQueueBadge(enabled: boolean) {
  return useQuery({
    queryKey: moderationKeys.badge(),
    enabled,
    staleTime: 30_000,
    retry: false, // a badge failure must never block admin nav
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc("get_admin_comment_review_queue", {
        p_limit: 1,
        p_offset: 0,
      });
      if (error) throw error;
      const rows = (data ?? []) as ReviewQueueRow[];
      return rows[0]?.total_count ?? 0;
    },
  });
}

// ── Moderation action (unhide / delete) ──────────────────────────────────────

export function useModerationAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, commentId }: { action: ModerationAction; commentId: string }) => {
      const res =
        action === "unhide"
          ? await supabase.rpc("admin_unhide_comment", { p_comment_id: commentId })
          : await supabase.rpc("admin_delete_comment", { p_comment_id: commentId });
      if (res.error) throw res.error;
      return res.data;
    },
    // Refresh every moderation surface (all three tabs, report details, badge).
    onSettled: () => {
      qc.invalidateQueries({ queryKey: moderationKeys.all });
    },
  });
}
