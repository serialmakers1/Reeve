export interface CommentRow {
  comment_id: string;
  parent_comment_id: string | null;
  depth: number;
  pseudonym: string;
  is_owner: boolean;
  real_name: string | null;
  badges: string[] | null;
  text: string;
  hidden_reason: string | null;
  like_count: number;
  liked_by_me: boolean;
  is_mine: boolean;
  created_at: string;
}

export type HiddenReason = "user_deleted" | "auto_hidden_reports" | "admin_hidden" | null;
