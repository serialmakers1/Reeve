/**
 * TopRequestsStrip — reserved visual slot for the Phase 3 contact requests feature.
 *
 * For Phase 1 there is no contact_requests table yet, so this always renders null.
 * Once Phase 3 lands, this component receives a live count and renders the aggregate
 * strip described in commons-ux.md §2 ("hidden when zero requests").
 *
 * Kept as a separate component so future integration is a one-line swap
 * (add data fetching + conditional render) with no callsite changes.
 */

interface Props {
  count?: number;
  onClick?: () => void;
}

export default function TopRequestsStrip({ count = 0, onClick }: Props) {
  if (count <= 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-blue-200 bg-blue-50 p-3 text-left hover:bg-blue-100 transition-colors"
    >
      <p className="text-sm font-semibold text-blue-900">
        {count} new contact request{count === 1 ? "" : "s"}
      </p>
      <p className="text-xs text-blue-700 mt-0.5">Review tenants interested in your properties</p>
    </button>
  );
}
