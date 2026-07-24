/**
 * F3-C17: shared label + colour map for the lister_role badge. Used by the
 * PropertyDetail header chip row and OwnerCard so both surfaces stay in sync
 * on label wording and colour semantics.
 */
export const LISTER_ROLE_BADGE: Record<
  string,
  { label: string; className: string }
> = {
  owner:            { label: "Owner",            className: "bg-green-50 text-green-700 border-green-100" },
  broker:           { label: "Broker",           className: "bg-amber-50 text-amber-700 border-amber-100" },
  property_manager: { label: "Property Manager", className: "bg-blue-50 text-blue-700 border-blue-100" },
  builder:          { label: "Builder",          className: "bg-purple-50 text-purple-700 border-purple-100" },
};
