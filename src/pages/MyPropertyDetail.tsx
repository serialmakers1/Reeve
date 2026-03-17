import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useRequireAuth } from "@/hooks/useRequireAuth";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface PropertyRow {
  id: string;
  owner_id: string;
  building_name: string;
  floor_number: number | null;
  flat_number: string | null;
  street_address: string;
  locality: string | null;
  city: string;
  bhk: string;
  furnishing: string;
  parking_4w: string;
  parking_2w: string;
  listed_rent: number;
  pet_policy: string | null;
  building_rules: string | null;
  status: string;
  is_active: boolean;
  listed_at: string | null;
  occupied_at: string | null;
  last_leased_at: string | null;
  inspection_date: string | null;
  inspection_start_time: string | null;
  inspection_end_time: string | null;
  inspection_notes: string | null;
  draft_at: string | null;
  inspection_proposed_at: string | null;
  inspection_scheduled_at: string | null;
  inspected_at: string | null;
  agreement_pending_at: string | null;
  created_at: string;
}

interface ApplicationRow {
  id: string;
  status: string;
  proposed_rent: number | null;
  submitted_at: string | null;
  created_at: string;
  tenant: { full_name: string | null } | null;
}

/* ─────────────────────────────────────────
   Constants
───────────────────────────────────────── */
const WHATSAPP_NUMBER = "917899874281";

const STATUS_ORDER = [
  "draft",
  "inspection_proposed",
  "inspection_scheduled",
  "inspected",
  "agreement_pending",
  "listed",
  "occupied",
] as const;

/* ─────────────────────────────────────────
   Helpers
───────────────────────────────────────── */
const formatTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
};

const formatTimestamp = (ts: string) =>
  new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }) +
  ", " +
  new Date(ts).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

const formatInspectionDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatDateShort = (ts: string) =>
  new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const statusBadgeClass = (status: string): string => {
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    inspection_proposed: "bg-yellow-100 text-yellow-700",
    inspection_scheduled: "bg-yellow-100 text-yellow-700",
    inspected: "bg-blue-100 text-blue-700",
    agreement_pending: "bg-orange-100 text-orange-700",
    listed: "bg-green-100 text-green-700",
    occupied: "bg-purple-100 text-purple-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
};

const statusLabel = (status: string): string => {
  const map: Record<string, string> = {
    draft: "Draft",
    inspection_proposed: "Inspection Requested",
    inspection_scheduled: "Inspection Scheduled",
    inspected: "Inspected",
    agreement_pending: "Agreement Pending",
    listed: "Listed",
    occupied: "Occupied",
  };
  return map[status] ?? status;
};

const applicationStatusLabel = (s: string): string =>
  (({
    draft: "Draft",
    submitted: "Submitted",
    platform_review: "Under review",
    sent_to_owner: "Awaiting your review",
    owner_accepted: "Accepted by you",
    owner_rejected: "Declined",
    owner_countered: "Counter sent",
    tenant_countered: "Counter received",
    payment_pending: "Payment pending",
    payment_received: "Payment received",
    kyc_pending: "KYC in progress",
    kyc_passed: "KYC passed",
    kyc_failed: "KYC failed",
    agreement_pending: "Agreement pending",
    lease_active: "Active tenant",
    withdrawn: "Withdrawn",
    expired: "Expired",
  } as Record<string, string>)[s] ?? s);

const tenantDisplayName = (fullName: string | null | undefined): string => {
  if (!fullName) return "Applicant";
  const parts = fullName.trim().split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

/* ─────────────────────────────────────────
   Sub-components
───────────────────────────────────────── */

function CheckIcon() {
  return (
    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ActionCard({
  property,
  propertyRef,
  applications,
}: {
  property: PropertyRow;
  propertyRef: string;
  applications: ApplicationRow[];
}) {
  const waInspection = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi, I'd like to schedule an inspection for property ${propertyRef}`
  )}`;
  const waAgreement = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi, I'd like to discuss the agreement for property ${propertyRef}`
  )}`;
  const waGeneral = waInspection;

  const WaButton = ({ href, label = "WhatsApp Reeve" }: { href: string; label?: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg bg-[#25D366] text-white text-sm font-medium hover:opacity-90 transition-opacity"
    >
      💬 {label}
    </a>
  );

  const { status } = property;

  if (status === "draft") {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="font-semibold text-foreground">Property submitted successfully</p>
        <p className="text-sm text-muted-foreground">
          Our team will reach out within 48 hours to coordinate your inspection.
        </p>
        <WaButton href={waInspection} />
      </div>
    );
  }

  if (status === "inspection_proposed") {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="font-semibold text-foreground">Inspection requested</p>
        <p className="text-sm text-muted-foreground">
          Our team will contact you shortly to confirm the date and time.
        </p>
        <WaButton href={waGeneral} />
      </div>
    );
  }

  if (status === "inspection_scheduled") {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="font-semibold text-foreground">Inspection scheduled</p>
        {property.inspection_date && (
          <div>
            <p className="text-2xl font-bold text-foreground">
              {formatInspectionDate(property.inspection_date)}
            </p>
            {property.inspection_start_time && property.inspection_end_time && (
              <p className="text-sm text-muted-foreground mt-1">
                {formatTime(property.inspection_start_time)} – {formatTime(property.inspection_end_time)}
              </p>
            )}
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          Please ensure access to the flat during this window. Our team will be there.
        </p>
        <WaButton href={waGeneral} label="WhatsApp Reeve to reschedule" />
      </div>
    );
  }

  if (status === "inspected") {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="font-semibold text-foreground">Inspection complete</p>
        <p className="text-sm text-muted-foreground">
          Your Property Management Agreement is being prepared. We'll reach out shortly for your review.
        </p>
        <WaButton href={waGeneral} />
      </div>
    );
  }

  if (status === "agreement_pending") {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="font-semibold text-foreground">Agreement ready for review</p>
        <p className="text-sm text-muted-foreground">
          Please review and confirm your Property Management Agreement with our team to proceed to listing.
        </p>
        <WaButton href={waAgreement} />
      </div>
    );
  }

  if (status === "listed") {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="font-semibold text-foreground">Your property is live on Reeve 🎉</p>
        <p className="text-sm text-muted-foreground">
          {applications.length} application(s) received
        </p>
        <a
          href={`/property/${property.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-lg bg-blue-700 text-white text-sm font-medium hover:bg-blue-800 transition-colors"
        >
          View your listing →
        </a>
      </div>
    );
  }

  if (status === "occupied") {
    return (
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="font-semibold text-foreground">Property currently occupied</p>
        <p className="text-sm text-muted-foreground">
          Occupied since {property.occupied_at ? formatDateShort(property.occupied_at) : "—"}
        </p>
        <WaButton href={waGeneral} />
      </div>
    );
  }

  return null;
}

function SkeletonLoader() {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl space-y-4">
        <div className="h-8 w-40 bg-gray-100 animate-pulse rounded" />
        <div className="h-24 bg-gray-100 animate-pulse rounded-xl" />
        <div className="h-10 bg-gray-100 animate-pulse rounded" />
        <div className="h-56 bg-gray-100 animate-pulse rounded-xl" />
        <div className="h-40 bg-gray-100 animate-pulse rounded-xl" />
      </div>
    </Layout>
  );
}

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
const FAQS = [
  {
    q: "When will my property go live?",
    a: "Once the inspection is done and you confirm the Property Management Agreement, our team will list your property within 24 hours.",
  },
  {
    q: "How does the inspection work?",
    a: "Our team visits your property to document its condition, take photos, and verify details. You don't need to be present but please ensure access to the flat.",
  },
  {
    q: "What is Reeve's service fee?",
    a: "Reeve charges 7% of the monthly rent for the first 11-month term, reducing to 4% on renewal. There is zero brokerage for the tenant.",
  },
  {
    q: "How does rent collection work?",
    a: "Reeve collects rent from the tenant and transfers it to your account after deducting the service fee, typically within 3 working days.",
  },
];

export default function MyPropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useRequireAuth();

  const [property, setProperty] = useState<PropertyRow | null>(null);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [faqOpen, setFaqOpen] = useState<Record<number, boolean>>({});
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [removing, setRemoving] = useState(false);

  const userId = session?.user?.id ?? "";

  /* ─── Data fetching — fires only after auth resolves ─── */
  useEffect(() => {
    if (authLoading || !userId || !id) return;

    const fetchData = async () => {
      setLoadingData(true);

      const { data: prop } = await supabase
        .from("properties")
        .select(
          `id, owner_id, building_name, floor_number, flat_number,
           street_address, locality, city, bhk, furnishing,
           parking_4w, parking_2w, listed_rent, pet_policy, building_rules,
           status, is_active, listed_at, occupied_at, last_leased_at,
           inspection_date, inspection_start_time, inspection_end_time,
           inspection_notes, draft_at, inspection_proposed_at,
           inspection_scheduled_at, inspected_at, agreement_pending_at,
           created_at`
        )
        .eq("id", id)
        .maybeSingle();

      if (!prop) {
        setNotFound(true);
        setLoadingData(false);
        return;
      }

      if (prop.owner_id !== userId) {
        navigate("/my-properties");
        return;
      }

      setProperty(prop as unknown as PropertyRow);

      if (prop.status === "listed" || prop.status === "occupied") {
        const { data: apps } = await supabase
          .from("applications")
          .select(
            `id, status, proposed_rent, submitted_at, created_at,
             tenant:users!applications_tenant_id_fkey(full_name)`
          )
          .eq("property_id", id)
          .order("created_at", { ascending: false });

        setApplications((apps ?? []) as unknown as ApplicationRow[]);
      }

      setLoadingData(false);
    };

    fetchData();
  }, [authLoading, userId, id]);

  /* ─── Guards ─── */
  if (authLoading || loadingData) return <SkeletonLoader />;

  if (notFound || !property) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
          <p className="text-muted-foreground mb-4">Property not found.</p>
          <button
            onClick={() => navigate("/my-properties")}
            className="text-blue-700 underline text-sm"
          >
            ← Back to My Properties
          </button>
        </div>
      </Layout>
    );
  }

  const propertyRef = `RV-${property.id.slice(0, 8).toUpperCase()}`;
  const showApplicationsTab =
    property.status === "listed" || property.status === "occupied";

  const tabs = [
    { key: "overview", label: "Overview" },
    ...(showApplicationsTab ? [{ key: "applications", label: "Applications" }] : []),
    { key: "details", label: "Property Details" },
    { key: "support", label: "Support" },
  ];

  /* ─── Timeline stages ─── */
  const timelineStages = [
    {
      key: "draft",
      label: "Property Submitted",
      timestamp: property.draft_at ?? property.created_at,
      subline: null as string | null,
    },
    {
      key: "inspection_proposed",
      label: "Inspection Requested",
      timestamp: property.inspection_proposed_at,
      subline: null,
    },
    {
      key: "inspection_scheduled",
      label: "Inspection Scheduled",
      timestamp: property.inspection_scheduled_at,
      subline:
        property.inspection_date
          ? `${formatInspectionDate(property.inspection_date)}${
              property.inspection_start_time && property.inspection_end_time
                ? ` · ${formatTime(property.inspection_start_time)} – ${formatTime(property.inspection_end_time)}`
                : ""
            }`
          : null,
    },
    {
      key: "inspected",
      label: "Inspection Complete",
      timestamp: property.inspected_at,
      subline: null,
    },
    {
      key: "agreement_pending",
      label: "Agreement Pending",
      timestamp: property.agreement_pending_at,
      subline: null,
    },
    {
      key: "listed",
      label: "Listed on Reeve",
      timestamp: property.listed_at,
      subline: null,
    },
    {
      key: "occupied",
      label: "Occupied",
      timestamp: property.occupied_at,
      subline: null,
    },
  ];

  const currentStatusIdx = STATUS_ORDER.indexOf(
    property.status as (typeof STATUS_ORDER)[number]
  );

  const waHelp = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi, I need help with property ${propertyRef}`
  )}`;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">

        {/* ─── Back ─── */}
        <button
          onClick={() => navigate("/my-properties")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5 min-h-[44px]"
        >
          ← Back to My Properties
        </button>

        {/* ─── SECTION A: Header ─── */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground leading-tight">
                {property.building_name}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {property.bhk} · {property.furnishing} ·{" "}
                {property.locality ? `${property.locality}, ` : ""}
                {property.city}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                {propertyRef}
              </p>
            </div>
            <span
              className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(
                property.status
              )}`}
            >
              {statusLabel(property.status)}
            </span>
          </div>
        </div>

        {/* ─── SECTION B: Tabs ─── */}
        <div className="border-b border-border mb-6">
          <div className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors min-h-[44px] ${
                  activeTab === tab.key
                    ? "border-blue-700 text-blue-700"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════
            TAB 1 — Overview
        ════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-6">

            {/* Part A — Action Card */}
            <ActionCard
              property={property}
              propertyRef={propertyRef}
              applications={applications}
            />

            {/* Part B — Journey Timeline */}
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-4">
                Journey
              </h2>
              <div>
                {timelineStages.map((stage, idx) => {
                  const stageIdx = STATUS_ORDER.indexOf(
                    stage.key as (typeof STATUS_ORDER)[number]
                  );
                  const isCurrent = stage.key === property.status;
                  const isCompleted =
                    !isCurrent &&
                    stage.timestamp !== null &&
                    stageIdx < currentStatusIdx;
                  const isPending = !isCurrent && !isCompleted;

                  return (
                    <div key={stage.key} className="flex gap-4">
                      {/* Icon + connector */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            isCompleted
                              ? "bg-green-100"
                              : isCurrent
                              ? "bg-blue-100"
                              : "bg-gray-100"
                          }`}
                        >
                          {isCompleted && <CheckIcon />}
                          {isCurrent && (
                            <span className="h-3 w-3 rounded-full bg-blue-600 animate-pulse" />
                          )}
                          {isPending && (
                            <span className="h-3 w-3 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                        {idx < timelineStages.length - 1 && (
                          <div
                            className={`w-0.5 my-1 ${
                              isCompleted ? "bg-green-200" : "bg-gray-100"
                            }`}
                            style={{ minHeight: "24px" }}
                          />
                        )}
                      </div>

                      {/* Content */}
                      <div className="pb-5 flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={`text-sm font-medium ${
                              isPending
                                ? "text-muted-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {stage.label}
                          </p>
                          <p className="text-xs text-muted-foreground shrink-0">
                            {stage.timestamp
                              ? formatTimestamp(stage.timestamp)
                              : "—"}
                          </p>
                        </div>
                        {isCurrent && (
                          <p className="text-xs text-blue-600 mt-0.5">
                            Current stage
                          </p>
                        )}
                        {stage.subline && (isCompleted || isCurrent) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {stage.subline}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Remove Property link */}
            {(property.status === 'draft' || property.status === 'inspection_proposed') && (
              <button
                onClick={() => setShowRemoveModal(true)}
                className="text-sm text-destructive underline mt-8"
              >
                Remove this property
              </button>
            )}
          </div>
        )}

        {/* ════════════════════════════════════
            TAB 2 — Applications
        ════════════════════════════════════ */}
        {activeTab === "applications" && showApplicationsTab && (
          <div className="space-y-3">
            {applications.length === 0 ? (
              <div className="rounded-xl border border-border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No applications yet. Reeve will notify you when someone applies.
                </p>
              </div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  onClick={() => navigate(`/my-properties/${id}/applications/${app.id}`)}
                  className="rounded-xl border border-border p-4 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm text-foreground">
                      {tenantDisplayName(app.tenant?.full_name)}
                    </p>
                    <span className="shrink-0 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
                      {applicationStatusLabel(app.status)}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>
                      Proposed: ₹
                      {app.proposed_rent != null
                        ? app.proposed_rent.toLocaleString("en-IN")
                        : "—"}
                    </span>
                    <span>
                      Listed: ₹
                      {property.listed_rent != null
                        ? property.listed_rent.toLocaleString("en-IN")
                        : "—"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatTimestamp(app.submitted_at ?? app.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ════════════════════════════════════
            TAB 3 — Property Details
        ════════════════════════════════════ */}
        {activeTab === "details" && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { label: "Building Name", value: property.building_name },
                { label: "Address", value: property.street_address },
                { label: "Locality", value: property.locality ?? "—" },
                { label: "City", value: property.city },
                {
                  label: "BHK",
                  value: property.bhk.replace("BHK", " BHK"),
                },
                {
                  label: "Furnishing",
                  value: property.furnishing
                    .replace(/_/g, " ")
                    .replace(/^\w/, (c) => c.toUpperCase()),
                },
                {
                  label: "Floor",
                  value:
                    property.floor_number != null
                      ? String(property.floor_number)
                      : "—",
                },
                {
                  label: "Listed Rent",
                  value:
                    property.listed_rent > 0
                      ? "₹" + property.listed_rent.toLocaleString("en-IN")
                      : "To be confirmed",
                },
                {
                  label: "4-Wheeler Parking",
                  value: property.parking_4w.replace(/_/g, " "),
                },
                {
                  label: "2-Wheeler Parking",
                  value: property.parking_2w.replace(/_/g, " "),
                },
                { label: "Pet Policy", value: property.pet_policy ?? "—" },
                {
                  label: "Building Rules",
                  value: property.building_rules ?? "—",
                },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    {label}
                  </p>
                  <p className="text-sm font-medium text-foreground">{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-6">
              To update any property details, WhatsApp Reeve with your property ID.
            </p>
          </div>
        )}

        {/* ════════════════════════════════════
            TAB 4 — Support
        ════════════════════════════════════ */}
        {activeTab === "support" && (
          <div className="space-y-6">
            {/* Contact options */}
            <div className="space-y-3">
              <a
                href={waHelp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full min-h-[44px] rounded-lg bg-blue-700 text-white text-sm font-medium px-4 py-3 hover:bg-blue-800 transition-colors"
              >
                💬 WhatsApp Reeve
              </a>
              <a
                href="tel:+917899874281"
                className="flex items-center justify-center gap-2 w-full min-h-[44px] rounded-lg border border-border text-foreground text-sm font-medium px-4 py-3 hover:bg-muted transition-colors"
              >
                📞 Call Reeve
              </a>
              <a
                href="mailto:hello@reeve.in"
                className="flex items-center justify-center gap-2 w-full min-h-[44px] rounded-lg border border-border text-foreground text-sm font-medium px-4 py-3 hover:bg-muted transition-colors"
              >
                ✉️ Email Reeve
              </a>
            </div>

            {/* FAQs */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">FAQs</h3>
              {FAQS.map((faq, i) => (
                <div
                  key={i}
                  className="border border-border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setFaqOpen((prev) => ({ ...prev, [i]: !prev[i] }))
                    }
                    className="w-full flex items-center justify-between text-left px-4 py-3 text-sm font-medium text-foreground min-h-[44px]"
                  >
                    <span>{faq.q}</span>
                    <span className="text-muted-foreground ml-3 shrink-0">
                      {faqOpen[i] ? "−" : "+"}
                    </span>
                  </button>
                  {faqOpen[i] && (
                    <div className="px-4 pb-4 text-sm text-muted-foreground border-t border-border pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
