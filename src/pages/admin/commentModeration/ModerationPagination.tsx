/**
 * Server-side numbered pagination, shared by all three moderation tabs.
 * Mirrors the Properties.tsx page-window markup; reuses adminPropertyHelpers.
 */
import { Button } from "@/components/ui/button";
import { ADMIN_PAGE_SIZE, getPageWindow, totalPages } from "@/pages/admin/adminPropertyHelpers";

interface Props {
  total: number;
  page: number;
  onPage: (n: number) => void;
}

export default function ModerationPagination({ total, page, onPage }: Props) {
  if (total === 0) return null;
  const pageCount = totalPages(total);
  const firstRow = (page - 1) * ADMIN_PAGE_SIZE + 1;
  const lastRow = Math.min(page * ADMIN_PAGE_SIZE, total);
  const window = getPageWindow(page, pageCount);

  return (
    <nav className="flex flex-col items-center justify-between gap-3 sm:flex-row" aria-label="Pagination">
      <p className="text-xs text-muted-foreground">
        Showing {firstRow}–{lastRow} of {total}
      </p>
      <div className="flex items-center gap-1">
        <Button
          size="sm" variant="outline" className="h-8"
          disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"
        >
          Previous
        </Button>
        {window.map((tok, i) =>
          tok === "ellipsis" ? (
            <span key={`e${i}`} className="px-1.5 text-muted-foreground" aria-hidden="true">…</span>
          ) : (
            <Button
              key={tok} size="sm" variant={tok === page ? "default" : "outline"}
              className="h-8 w-8 p-0" aria-label={`Page ${tok}`} aria-current={tok === page ? "page" : undefined}
              onClick={() => onPage(tok)}
            >
              {tok}
            </Button>
          ),
        )}
        <Button
          size="sm" variant="outline" className="h-8"
          disabled={page >= pageCount} onClick={() => onPage(page + 1)} aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
