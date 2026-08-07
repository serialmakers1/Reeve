/**
 * Admin Comment Moderation — /admin/comment-moderation.
 * Three tabs (Review Queue / All Comments / User Signals) driven by ?tab=.
 * All data flows through the Prompt-1 admin RPCs via TanStack Query.
 */
import { useSearchParams } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import ReviewQueueTab from "./commentModeration/ReviewQueueTab";
import AllCommentsTab from "./commentModeration/AllCommentsTab";
import UserSignalsTab from "./commentModeration/UserSignalsTab";
import { useReviewQueueBadge } from "./commentModeration/useCommentModeration";

const TABS = ["queue", "all", "signals"] as const;
type TabValue = (typeof TABS)[number];

export default function CommentModeration() {
  const { loading: authLoading, user } = useRequireAuth({ requireAdmin: true });
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get("tab");
  const tab: TabValue = (TABS as readonly string[]).includes(rawTab ?? "") ? (rawTab as TabValue) : "queue";

  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const badge = useReviewQueueBadge(!authLoading && isAdmin);
  const pending = badge.data ?? 0;

  const setTab = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "queue") next.delete("tab");
    else next.set("tab", value);
    setSearchParams(next, { replace: true });
  };

  if (authLoading || !isAdmin) {
    return (
      <AdminLayout>
        <div className="max-w-6xl space-y-4">
          <Skeleton className="h-8 w-56" />
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl space-y-4">
        <h1 className="text-xl font-bold text-foreground">Comment Moderation</h1>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="queue" className="gap-1.5">
              Review Queue
              {pending > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All Comments</TabsTrigger>
            <TabsTrigger value="signals">User Signals</TabsTrigger>
          </TabsList>

          <TabsContent value="queue"><ReviewQueueTab /></TabsContent>
          <TabsContent value="all"><AllCommentsTab /></TabsContent>
          <TabsContent value="signals"><UserSignalsTab /></TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
