import { useState, useRef, useEffect } from "react";

const SANS = "'DM Sans', system-ui, sans-serif";

// ── Types ─────────────────────────────────────────────────────────────────────

type ServiceChoice =
  | "property_management"
  | "vacant_property_care"
  | "find_tenant"
  | "nri_property_sale"
  | "nri_rent_tds"
  | "khata_mutation"
  | "not_sure";
type PropertyTypeOption =
  | "apartment"
  | "villa_row_house"
  | "independent_house"
  | "plot_land";
type PreferredContactOption = "whatsapp" | "scheduled_call" | "telegram" | "botim";

interface FormData {
  serviceChoice:    ServiceChoice | "";
  buildingStreet:   string;
  localityArea:     string;
  propertyType:     PropertyTypeOption | "";
  name:             string;
  phone:            string;
  email:            string;
  preferredContact: PreferredContactOption | "";
  basedIn:          string;
  notes:            string;
  company_website:  string; // honeypot — never persisted
}

type FieldErrors = Partial<Record<keyof FormData, string>>;
type SubmitState = "idle" | "verifying" | "submitting" | "success" | "error";

interface PropertyEnquiryFormProps {
  initialService?: Exclude<ServiceChoice, "not_sure"> | null;
}

// ── Turnstile global ──────────────────────────────────────────────────────────

declare global {
  interface Window {
    turnstile?: {
      render(el: string | HTMLElement, params: object): string;
      // execute() takes the container selector (e.g. "#property-enquiry-turnstile")
      execute(containerSelector: string): void;
      // reset() and remove() take the widgetId returned by render()
      reset(widgetId: string): void;
      remove(widgetId: string): void;
    };
  }
}

// ── Validation helpers ────────────────────────────────────────────────────────

// ' = ' (straight apostrophe)
// ' = ' (left single quotation mark)
// ' = ' (right single quotation mark)
const NAME_RE   = /^[\p{L}\p{M} .'''\-]{2,80}$/u;
const BLDG_RE   = /^[\p{L}\p{N} .,'''\-\/#&():]{1,120}$/u;
const LOCALE_RE = /^[\p{L}\p{N} .,'''\-\/&()]{2,80}$/u;
const HAS_LETTER          = /\p{L}/u;
const HAS_LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;
const CTRL_CHARS          = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const EMAIL_RE            = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidPhone(v: string): boolean {
  if (v.length > 30) return false;
  const norm = v.replace(/[\s()\-.]/g, "");
  if (!/^\+?\d+$/.test(norm)) return false;
  const digits = norm.replace(/^\+/, "");
  return digits.length >= 7 && digits.length <= 15;
}

function isValidEmail(v: string): boolean {
  return v.length <= 254 && EMAIL_RE.test(v.trim());
}

// ── Service options ───────────────────────────────────────────────────────────

const SERVICE_OPTIONS = [
  { value: "property_management",  label: "Property Management",       bg: "bg-[#F0F5FF]", border: "border-[#2563EB]" },
  { value: "vacant_property_care", label: "Vacant Property Care",      bg: "bg-[#EFFBF8]", border: "border-[#0F9F8F]" },
  { value: "find_tenant",          label: "Find a Tenant",             bg: "bg-[#FFF2ED]", border: "border-[#F46F52]" },
  { value: "nri_property_sale",    label: "NRI Property Sale",         bg: "bg-[#F5F3FF]", border: "border-[#7C3AED]" },
  { value: "nri_rent_tds",         label: "NRI Rent & TDS",            bg: "bg-[#EFF6FF]", border: "border-[#2563EB]" },
  { value: "khata_mutation",       label: "Khata & Mutation",          bg: "bg-[#FFFBEB]", border: "border-[#D97706]" },
  { value: "not_sure",             label: "Not sure / Something else", bg: "bg-[#F2F5FA]", border: "border-[#0057F2]" },
] as const;

function getServiceLabel(value: ServiceChoice | ""): string {
  return SERVICE_OPTIONS.find((o) => o.value === value)?.label ?? String(value);
}

// ── Step validators ───────────────────────────────────────────────────────────

function validateStep1(d: FormData): FieldErrors {
  const e: FieldErrors = {};
  if (!d.serviceChoice)  e.serviceChoice  = "Please select a service.";
  const loc = d.localityArea.trim();
  if (!loc || !LOCALE_RE.test(loc) || !HAS_LETTER.test(loc)) {
    e.localityArea = "Enter a valid locality or area.";
  }
  const bldg = d.buildingStreet.trim();
  if (bldg && (!BLDG_RE.test(bldg) || !HAS_LETTER_OR_DIGIT.test(bldg))) {
    e.buildingStreet = "Enter a valid building or street name.";
  }
  if (!d.propertyType) {
    e.propertyType = "Please select a property type.";
  }
  return e;
}

function validateStep2(d: FormData): FieldErrors {
  const e: FieldErrors = {};
  const name = d.name.trim();
  if (!name || !NAME_RE.test(name) || !HAS_LETTER.test(name)) {
    e.name = "Use letters, spaces, apostrophes, periods or hyphens only.";
  }
  if (!isValidPhone(d.phone)) {
    e.phone = "Enter a valid phone number with 7–15 digits.";
  }
  if (d.email.trim() && !isValidEmail(d.email)) {
    e.email = "Enter a valid email address.";
  }
  if (!d.preferredContact) {
    e.preferredContact = "Please select how you'd like to be contacted.";
  }
  const based = d.basedIn.trim();
  if (!based || !LOCALE_RE.test(based) || !HAS_LETTER.test(based)) {
    e.basedIn = "Enter a valid city or location.";
  }
  if (d.notes.length > 1000) {
    e.notes = "Keep this to 1,000 characters or fewer.";
  }
  if (d.notes.trim() && CTRL_CHARS.test(d.notes)) {
    e.notes = "Keep this to 1,000 characters or fewer.";
  }
  return e;
}

// ── focusFirstError ───────────────────────────────────────────────────────────

const FIELD_ID_MAP: Partial<Record<keyof FormData, string>> = {
  serviceChoice:    "service-property_management",
  buildingStreet:   "buildingStreet",
  localityArea:     "localityArea",
  propertyType:     "type-apartment",
  name:             "name",
  phone:            "phone",
  email:            "email",
  preferredContact: "contact-whatsapp",
  basedIn:          "basedIn",
  notes:            "notes",
};

const FIELD_ORDER: Array<keyof FormData> = [
  "serviceChoice", "buildingStreet", "localityArea", "propertyType",
  "name", "phone", "email", "preferredContact", "basedIn", "notes",
];

function focusFirstError(errors: FieldErrors) {
  for (const field of FIELD_ORDER) {
    if (!errors[field]) continue;
    const id = FIELD_ID_MAP[field];
    if (!id) continue;
    const el = document.getElementById(id);
    if (!el) continue;
    el.focus();
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    break;
  }
}

// ── Payload builder ───────────────────────────────────────────────────────────

function buildPayload(d: FormData) {
  const emailTrimmed = d.email.trim();
  return {
    serviceChoice:    d.serviceChoice,
    buildingStreet:   d.buildingStreet.trim() || undefined,
    localityArea:     d.localityArea.trim(),
    propertyType:     d.propertyType,
    name:             d.name.trim(),
    phone:            d.phone.trim(),
    email:            emailTrimmed ? emailTrimmed.toLowerCase() : undefined,
    preferredContact: d.preferredContact,
    basedIn:          d.basedIn.trim(),
    notes:            d.notes.trim() || undefined,
    company_website:  d.company_website,
  };
}

// ── makeInitialFormData ───────────────────────────────────────────────────────

function makeInitialFormData(
  initialService?: PropertyEnquiryFormProps["initialService"]
): FormData {
  return {
    serviceChoice:    initialService ?? "",
    buildingStreet:   "",
    localityArea:     "",
    propertyType:     "",
    name:             "",
    phone:            "",
    email:            "",
    preferredContact: "",
    basedIn:          "",
    notes:            "",
    company_website:  "",
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Req() {
  return (
    <span aria-hidden="true" className="ml-1 text-[#D14343]">
      *
    </span>
  );
}

function Opt() {
  return (
    <span
      className="ml-1.5 text-[12px] font-[500] text-[#7A8593]"
      style={{ fontFamily: SANS }}
    >
      Optional
    </span>
  );
}

function FieldError({ id, msg }: { id: string; msg: string | undefined }) {
  if (!msg) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1 text-[13px] font-[500] text-[#B42318]"
      style={{ fontFamily: SANS }}
    >
      {msg}
    </p>
  );
}

function RadioCard({
  id,
  name,
  value,
  checked,
  onChange,
  label,
  selectedBg,
  selectedBorder,
  disabled = false,
  required = false,
}: {
  id: string;
  name: string;
  value: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  selectedBg: string;
  selectedBorder: string;
  disabled?: boolean;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={[
        "flex items-center h-full min-h-[52px] px-4 rounded-[11px]",
        "border transition-colors duration-[100ms]",
        "focus-within:outline focus-within:outline-2 focus-within:outline-offset-2",
        disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
        checked
          ? `${selectedBg} ${selectedBorder}`
          : "bg-white border-[#D9DEE7] hover:bg-[#F8FAFC] hover:border-[#B8C5D8]",
      ].join(" ")}
      style={{ outlineColor: "#8FB7FF" }}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className="sr-only"
      />
      <span
        className="text-[14px] font-[600] text-[#243244]"
        style={{ fontFamily: SANS }}
      >
        {label}
      </span>
    </label>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PropertyEnquiryForm({
  initialService,
}: PropertyEnquiryFormProps) {
  const [step,        setStep]        = useState<1 | 2>(1);
  const [formData,    setFormData]    = useState<FormData>(() => makeInitialFormData(initialService));
  const [errors,      setErrors]      = useState<FieldErrors>({});
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [tsError,     setTsError]     = useState(false);
  // showServiceSelector: true when showing full grid, false when showing compact chip
  const [showServiceSelector, setShowServiceSelector] = useState(!initialService);

  const widgetIdRef           = useRef<string | null>(null);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const pendingPayloadRef     = useRef<ReturnType<typeof buildPayload> | null>(null);
  const formTopRef            = useRef<HTMLDivElement>(null);

  // ── scrollToFormTop ──────────────────────────────────────────────────────

  function scrollToFormTop() {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    formTopRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  // ── setField ─────────────────────────────────────────────────────────────

  function setField<K extends keyof FormData>(key: K, val: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  // ── handleBlur ───────────────────────────────────────────────────────────

  function handleBlur(field: keyof FormData) {
    let allErrors: FieldErrors;
    if (
      field === "name" ||
      field === "phone" ||
      field === "email" ||
      field === "preferredContact" ||
      field === "basedIn" ||
      field === "notes"
    ) {
      allErrors = validateStep2(formData);
    } else {
      allErrors = validateStep1(formData);
    }
    setErrors((prev) => ({ ...prev, [field]: allErrors[field] ?? undefined }));
  }

  // ── Turnstile — script load ───────────────────────────────────────────────

  useEffect(() => {
    if (step !== 2) return;

    if (!document.getElementById("cf-ts-script")) {
      const s = document.createElement("script");
      s.id = "cf-ts-script";
      s.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
  }, [step]);

  // ── Turnstile — widget lifecycle ──────────────────────────────────────────

  useEffect(() => {
    if (step !== 2) {
      if (widgetIdRef.current !== null) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      return;
    }

    const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

    function render() {
      if (
        !window.turnstile ||
        !turnstileContainerRef.current ||
        widgetIdRef.current !== null
      )
        return;

      const containerWidth = turnstileContainerRef.current.offsetWidth;
      const tsSize = containerWidth < 300 ? "compact" : "flexible";

      widgetIdRef.current = window.turnstile.render(
        turnstileContainerRef.current,
        {
          sitekey,
          action:     "property_enquiry",
          appearance: "interaction-only",
          execution:  "execute",
          size:       tsSize,
          callback: (token: string) => {
            const payload = pendingPayloadRef.current;
            if (!payload) return;
            doSubmit(payload, token);
          },
          "error-callback": () => {
            setTsError(true);
            setSubmitState("error");
          },
          "expired-callback": () => {
            setTsError(true);
            setSubmitState("error");
          },
        }
      );
    }

    if (window.turnstile) {
      render();
    } else {
      const script = document.getElementById("cf-ts-script");
      script?.addEventListener("load", render, { once: true });
      return () => script?.removeEventListener("load", render);
    }

    return () => {
      if (widgetIdRef.current !== null) {
        window.turnstile?.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Submit flow ───────────────────────────────────────────────────────────

  function handleSubmitClick() {
    setTsError(false);

    const stepErrors = validateStep2(formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      focusFirstError(stepErrors);
      return;
    }
    setErrors({});

    if (!window.turnstile || widgetIdRef.current === null) {
      setTsError(true);
      setSubmitState("error");
      return;
    }

    pendingPayloadRef.current = buildPayload(formData);
    setSubmitState("verifying");

    // Reset before execute when recovering from a previous error
    if (submitState === "error" && widgetIdRef.current !== null) {
      window.turnstile.reset(widgetIdRef.current);
    }
    window.turnstile.execute("#property-enquiry-turnstile");
  }

  async function doSubmit(
    payload: ReturnType<typeof buildPayload>,
    token: string
  ) {
    setSubmitState("submitting");
    try {
      const res = await fetch("/api/submit-property-enquiry", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...payload, turnstileToken: token }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        code?: string;
        error?: string;
      };
      if (data.success) {
        if (widgetIdRef.current !== null) {
          window.turnstile?.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        }
        pendingPayloadRef.current = null;
        setSubmitState("success");
        scrollToFormTop();
        return;
      }
      if (data.code === "turnstile_failed") {
        setTsError(true);
      }
      throw new Error(data.error ?? `HTTP ${res.status}`);
    } catch {
      setSubmitState("error");
      if (widgetIdRef.current !== null) {
        window.turnstile?.reset(widgetIdRef.current);
      }
    }
  }

  function handleRetry() {
    setTsError(false);

    const stepErrors = validateStep2(formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      focusFirstError(stepErrors);
      setSubmitState("idle");
      return;
    }
    setErrors({});

    if (!window.turnstile || widgetIdRef.current === null) {
      setTsError(true);
      setSubmitState("error");
      return;
    }

    pendingPayloadRef.current = buildPayload(formData);
    setSubmitState("verifying");
    window.turnstile.reset(widgetIdRef.current);
    window.turnstile.execute("#property-enquiry-turnstile");
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  function handleContinue() {
    const stepErrors = validateStep1(formData);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      focusFirstError(stepErrors);
      return;
    }
    setErrors({});
    setStep(2);
    scrollToFormTop();
  }

  function handleBack() {
    if (step === 2 && (submitState !== "idle" || tsError)) {
      setSubmitState("idle");
      setTsError(false);
      pendingPayloadRef.current = null;
    }
    setStep(1);
    scrollToFormTop();
  }

  // ── Derived state ─────────────────────────────────────────────────────────

  const isLocked = submitState === "verifying" || submitState === "submitting";

  // ── Input class helper ────────────────────────────────────────────────────

  function inputCls(hasError: boolean) {
    return [
      "h-[48px] w-full rounded-[10px] border bg-white px-4",
      "text-[16px] font-[500] text-[#0B1526] placeholder:text-[#9099A8]",
      "focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
      "disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-[100ms]",
      hasError ? "border-[#D14343]" : "border-[#D6DCE6]",
    ].join(" ");
  }

  function labelCls() {
    return "block text-[14px] font-[650] text-[#243244] mb-1.5";
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (submitState === "success") {
    return (
      <div role="status" aria-live="polite" className="py-10 text-center" ref={formTopRef}>
        <div className="w-12 h-12 mx-auto rounded-full bg-[#F0FDF4] flex items-center justify-center mb-5">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 13L9 17L19 7"
              stroke="#16A34A"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3
          style={{ fontFamily: SANS }}
          className="text-[21px] lg:text-[24px] font-[700] text-[#0B1526] mb-3"
        >
          Thanks — we've got your enquiry.
        </h3>
        <p
          style={{ fontFamily: SANS }}
          className="text-[15px] font-[500] text-[#536074] leading-[1.55] max-w-[360px] mx-auto"
        >
          We'll review what you shared and get back to you within a day using your preferred
          contact method.
          {formData.preferredContact === "scheduled_call" &&
            " We'll coordinate the time before calling."}
        </p>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (step === 1) handleContinue();
        else handleSubmitClick();
      }}
    >
      {/* Top anchor — used by scrollToFormTop */}
      <div ref={formTopRef} />

      {/* Progress + step title */}
      <div>
        <div aria-label={`Step ${step} of 2`}>
          <p
            className="text-[12px] font-[700] uppercase tracking-[0.07em] text-[#718096]"
            style={{ fontFamily: SANS }}
          >
            STEP {step} OF 2
          </p>
          <div className="flex gap-[6px] mt-2">
            {([1, 2] as const).map((n) => (
              <div
                key={n}
                className="h-[4px] flex-1 rounded-full transition-colors duration-[200ms]"
                style={{ background: n <= step ? "#0057F2" : "#E3E8EF" }}
              />
            ))}
          </div>
        </div>
        <h3
          className="mt-5 text-[21px] sm:text-[22px] font-[700] text-[#0B1526]"
          style={{ fontFamily: SANS }}
        >
          {step === 1 ? "Your property" : "About you"}
        </h3>
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div className="mt-6 space-y-6">

          {/* Service choice */}
          <fieldset
            aria-required="true"
            aria-describedby={errors.serviceChoice ? "serviceChoice-error" : undefined}
          >
            <legend className={labelCls()} style={{ fontFamily: SANS }}>
              Which service are you interested in?<Req />
            </legend>

            {/* Compact chip — shown when initialService provided and selector is closed */}
            {!showServiceSelector && initialService && (
              <div className="flex items-center justify-between gap-3 mt-2 px-4 py-3 rounded-[11px] border border-[#D9DEE7] bg-white">
                <span className="text-[14px] font-[700] text-[#243244]">
                  {getServiceLabel(formData.serviceChoice)}
                </span>
                <button
                  type="button"
                  onClick={() => setShowServiceSelector(true)}
                  className="-my-2 -mr-2 px-2 py-2 min-h-[40px] inline-flex items-center text-[13px] font-[650] text-[#0057F2] shrink-0 hover:text-[#0049D1] hover:underline transition-colors duration-[150ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ outlineColor: "#8FB7FF" }}
                >
                  Change
                </button>
              </div>
            )}

            {/* Full selector — shown when no initialService, or when Change was clicked */}
            {showServiceSelector && (
              <>
                <div className="mt-2 grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
                  {SERVICE_OPTIONS.map((opt) => (
                    <div
                      key={opt.value}
                      className={[
                        "h-full",
                        opt.value === "not_sure" ? "min-[360px]:col-span-2" : "",
                      ].join(" ")}
                    >
                      <RadioCard
                        id={`service-${opt.value}`}
                        name="serviceChoice"
                        value={opt.value}
                        checked={formData.serviceChoice === opt.value}
                        onChange={() => setField("serviceChoice", opt.value)}
                        label={opt.label}
                        selectedBg={opt.bg}
                        selectedBorder={opt.border}
                        required
                      />
                    </div>
                  ))}
                </div>
                {/* Done button — only rendered when opened via Change (keyboard-safe close) */}
                {initialService && (
                  <button
                    type="button"
                    onClick={() => setShowServiceSelector(false)}
                    className="mt-1 -ml-2 px-2 py-2 min-h-[40px] text-[13px] font-[600] text-[#0057F2] hover:text-[#0049D1] hover:underline transition-colors duration-[150ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ outlineColor: "#8FB7FF", fontFamily: SANS }}
                  >
                    Done
                  </button>
                )}
              </>
            )}

            <FieldError id="serviceChoice-error" msg={errors.serviceChoice} />
          </fieldset>

          {/* Property location */}
          <div>
            <p className={`${labelCls()} mb-3`} style={{ fontFamily: SANS }}>
              Where is the property?
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="buildingStreet" className={labelCls()} style={{ fontFamily: SANS }}>
                  Building / street<Opt />
                </label>
                <input
                  id="buildingStreet"
                  autoComplete="off"
                  placeholder="Building name or street"
                  value={formData.buildingStreet}
                  onChange={(e) => setField("buildingStreet", e.target.value)}
                  onBlur={() => handleBlur("buildingStreet")}
                  aria-invalid={!!errors.buildingStreet}
                  aria-describedby={errors.buildingStreet ? "buildingStreet-error" : undefined}
                  className={inputCls(!!errors.buildingStreet)}
                  style={{ outlineColor: "#8FB7FF", fontFamily: SANS }}
                />
                <FieldError id="buildingStreet-error" msg={errors.buildingStreet} />
              </div>
              <div>
                <label htmlFor="localityArea" className={labelCls()} style={{ fontFamily: SANS }}>
                  Locality / area<Req />
                </label>
                <input
                  id="localityArea"
                  required
                  autoComplete="off"
                  placeholder="e.g. Whitefield"
                  value={formData.localityArea}
                  onChange={(e) => setField("localityArea", e.target.value)}
                  onBlur={() => handleBlur("localityArea")}
                  aria-invalid={!!errors.localityArea}
                  aria-describedby={errors.localityArea ? "localityArea-error" : undefined}
                  className={inputCls(!!errors.localityArea)}
                  style={{ outlineColor: "#8FB7FF", fontFamily: SANS }}
                />
                <FieldError id="localityArea-error" msg={errors.localityArea} />
              </div>
            </div>
          </div>

          {/* Property type */}
          <fieldset
            aria-required="true"
            aria-describedby={errors.propertyType ? "propertyType-error" : undefined}
          >
            <legend className={labelCls()} style={{ fontFamily: SANS }}>
              Property type<Req />
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  { value: "apartment",         label: "Apartment" },
                  { value: "villa_row_house",   label: "Villa / row house" },
                  { value: "independent_house", label: "Independent house" },
                  { value: "plot_land",         label: "Plot / land" },
                ] as const
              ).map((opt) => (
                <RadioCard
                  key={opt.value}
                  id={`type-${opt.value}`}
                  name="propertyType"
                  value={opt.value}
                  checked={formData.propertyType === opt.value}
                  onChange={() => setField("propertyType", opt.value)}
                  label={opt.label}
                  selectedBg="bg-[#F0F5FF]"
                  selectedBorder="border-[#2563EB]"
                  required
                />
              ))}
            </div>
            <FieldError id="propertyType-error" msg={errors.propertyType} />
          </fieldset>

          {formData.propertyType === "plot_land" && (
            <p
              className="text-[13.5px] font-[500] text-[#536074]"
              style={{ fontFamily: SANS }}
            >
              We'll confirm eligibility and pricing after reviewing the property.
            </p>
          )}

          <button
            type="submit"
            className="w-full h-[52px] rounded-[12px] text-[16px] font-[700] text-white bg-[#0057F2] hover:bg-[#0049D1] active:bg-[#003FB6] transition-colors duration-[100ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ outlineColor: "#8FB7FF", fontFamily: SANS }}
          >
            Continue →
          </button>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div className="mt-6 space-y-5">
          {/* Honeypot — off-screen, filled by bots only */}
          <input
            type="text"
            id="company_website"
            name="company_website"
            tabIndex={-1}
            aria-hidden="true"
            autoComplete="off"
            value={formData.company_website}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, company_website: e.target.value }))
            }
            style={{
              position:      "absolute",
              left:          "-9999px",
              width:         "1px",
              height:        "1px",
              overflow:      "hidden",
              opacity:       0,
              pointerEvents: "none",
            }}
          />

          {/* Name */}
          <div>
            <label htmlFor="name" className={labelCls()} style={{ fontFamily: SANS }}>
              Name<Req />
            </label>
            <input
              id="name"
              required
              autoComplete="name"
              disabled={isLocked}
              value={formData.name}
              onChange={(e) => setField("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              className={inputCls(!!errors.name)}
              style={{ outlineColor: "#8FB7FF", fontFamily: SANS }}
            />
            <FieldError id="name-error" msg={errors.name} />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className={labelCls()} style={{ fontFamily: SANS }}>
              Phone<Req />
            </label>
            <input
              id="phone"
              type="tel"
              required
              autoComplete="tel"
              disabled={isLocked}
              placeholder="+91 98765 43210"
              value={formData.phone}
              onChange={(e) => setField("phone", e.target.value)}
              onBlur={() => handleBlur("phone")}
              aria-invalid={!!errors.phone}
              aria-describedby={
                errors.phone ? "phone-error" : "phone-hint"
              }
              className={inputCls(!!errors.phone)}
              style={{ outlineColor: "#8FB7FF", fontFamily: SANS }}
            />
            {!errors.phone && (
              <p
                id="phone-hint"
                className="mt-1 text-[12.5px] font-[500] text-[#7A8593]"
                style={{ fontFamily: SANS }}
              >
                Include the country code if you're outside India.
              </p>
            )}
            <FieldError id="phone-error" msg={errors.phone} />
          </div>

          {/* Email — optional */}
          <div>
            <label htmlFor="email" className={labelCls()} style={{ fontFamily: SANS }}>
              Email<Opt />
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              disabled={isLocked}
              value={formData.email}
              onChange={(e) => setField("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={inputCls(!!errors.email)}
              style={{ outlineColor: "#8FB7FF", fontFamily: SANS }}
            />
            <FieldError id="email-error" msg={errors.email} />
          </div>

          {/* Contact method */}
          <fieldset
            aria-required="true"
            aria-describedby={
              errors.preferredContact ? "preferredContact-error" : undefined
            }
          >
            <legend className={labelCls()} style={{ fontFamily: SANS }}>
              How should we contact you?<Req />
            </legend>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  { value: "whatsapp",       label: "WhatsApp" },
                  { value: "scheduled_call", label: "Scheduled phone call" },
                  { value: "telegram",       label: "Telegram" },
                  { value: "botim",          label: "BOTIM" },
                ] as const
              ).map((opt) => (
                <RadioCard
                  key={opt.value}
                  id={`contact-${opt.value}`}
                  name="preferredContact"
                  value={opt.value}
                  checked={formData.preferredContact === opt.value}
                  onChange={() => setField("preferredContact", opt.value)}
                  label={opt.label}
                  selectedBg="bg-[#EEF4FF]"
                  selectedBorder="border-[#0057F2]"
                  disabled={isLocked}
                  required
                />
              ))}
            </div>
            <FieldError id="preferredContact-error" msg={errors.preferredContact} />
          </fieldset>

          {/* Based in */}
          <div>
            <label htmlFor="basedIn" className={labelCls()} style={{ fontFamily: SANS }}>
              Where are you based?<Req />
            </label>
            <input
              id="basedIn"
              required
              autoComplete="off"
              disabled={isLocked}
              placeholder="e.g. Toronto, Dubai, Bengaluru"
              value={formData.basedIn}
              onChange={(e) => setField("basedIn", e.target.value)}
              onBlur={() => handleBlur("basedIn")}
              aria-invalid={!!errors.basedIn}
              aria-describedby={
                errors.basedIn ? "basedIn-error" : "basedIn-hint"
              }
              className={inputCls(!!errors.basedIn)}
              style={{ outlineColor: "#8FB7FF", fontFamily: SANS }}
            />
            {!errors.basedIn && (
              <p
                id="basedIn-hint"
                className="mt-1 text-[12.5px] font-[500] text-[#7A8593]"
                style={{ fontFamily: SANS }}
              >
                City is enough.
              </p>
            )}
            <FieldError id="basedIn-error" msg={errors.basedIn} />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className={labelCls()} style={{ fontFamily: SANS }}>
              Anything else<Opt />
            </label>
            <textarea
              id="notes"
              rows={3}
              disabled={isLocked}
              placeholder="Anything we should know about the property or timing?"
              value={formData.notes}
              onChange={(e) => setField("notes", e.target.value)}
              onBlur={() => handleBlur("notes")}
              aria-invalid={!!errors.notes}
              aria-describedby={
                errors.notes ? "notes-error" : "notes-hint"
              }
              className={[
                "w-full rounded-[10px] border bg-white px-4 py-3 resize-none",
                "text-[16px] font-[500] text-[#0B1526] placeholder:text-[#9099A8]",
                "focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                "disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-[100ms]",
                errors.notes ? "border-[#D14343]" : "border-[#D6DCE6]",
              ].join(" ")}
              style={{ outlineColor: "#8FB7FF", fontFamily: SANS }}
            />
            {!errors.notes && (
              <p
                id="notes-hint"
                className="mt-1 text-[12.5px] font-[500] text-[#7A8593]"
                style={{ fontFamily: SANS }}
              >
                A couple of lines is enough.
              </p>
            )}
            <FieldError id="notes-error" msg={errors.notes} />
          </div>

          {/* Turnstile — centered so compact (150px) looks good on 320px phones */}
          <div
            id="property-enquiry-turnstile"
            ref={turnstileContainerRef}
            className="mt-2 flex justify-center"
            style={{ width: "100%" }}
          />

          {/* Error banner */}
          {submitState === "error" && (
            <div
              role="alert"
              className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <p
                className="text-[13px] font-[500] text-[#B42318]"
                style={{ fontFamily: SANS }}
              >
                {tsError
                  ? "We couldn't verify this submission. Please try again."
                  : "We couldn't send your enquiry. Please try again."}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="text-[13px] font-[700] text-[#0057F2] shrink-0 hover:underline"
                style={{ fontFamily: SANS }}
              >
                Try again
              </button>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-1">
            <button
              type="submit"
              disabled={isLocked}
              className="w-full h-[52px] rounded-[12px] text-[16px] font-[700] text-white bg-[#0057F2] hover:bg-[#0049D1] active:bg-[#003FB6] transition-colors duration-[100ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ outlineColor: "#8FB7FF", fontFamily: SANS }}
            >
              {submitState === "verifying"
                ? "Verifying…"
                : submitState === "submitting"
                ? "Sending…"
                : "Send property enquiry"}
            </button>
            <p
              className="mt-3 text-center text-[12.5px] font-[500] text-[#687386]"
              style={{ fontFamily: SANS }}
            >
              We'll get back to you within a day. No spam calls. We don't sell your enquiry.
            </p>
            <button
              type="button"
              onClick={handleBack}
              disabled={isLocked}
              className="mt-3 w-full h-[48px] rounded-[12px] text-[14px] font-[600] text-[#536074] border border-[#D6DCE6] bg-white hover:bg-[#F7F9FC] transition-colors duration-[100ms] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ outlineColor: "#8FB7FF", fontFamily: SANS }}
            >
              Back
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
