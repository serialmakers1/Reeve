## [2026-05-03] feat | BreadcrumbList added to 4 routes; openingHours on homepage; areaServed as City objects [15:27 IST]
## [2026-05-03] sec | Added 6 baseline security headers in vercel.json (CSP deferred) [11:15 IST]
## [2026-05-03] perf | Batch A: hero WebP, contrast, headings, Razorpay lazy load, Google Fonts non-blocking [11:10 IST]
## [2026-05-03] feat | JSON-LD schema injected for 5 pre-rendered routes via prerender.mjs [09:55 IST]
## [2026-05-03] feat | SSG implemented for 5 public marketing routes; og:description fixed [09:35 IST]
## [2026-04-30] feat | ReferProperty refactor — types regenerated, admin Leads.tsx referrer fields added [14:22 IST]
## [2026-04-30] feat | ReferProperty refactor — schema migration + frontend rewrite [14:15 IST]
## [2026-04-30] diagnose | ReferProperty refactor — diagnosis complete, findings documented [IST]
## [2026-04-25] perf | Frontend: gated realtime behind auth, QueryClient defaults, lazy admin routes [17:30 IST]
## [2026-04-25] diagnose | P1 gap audit — FK indexes, storage policies, bucket config [16:30 IST]
## [2026-04-25] fix | Search path hardening: 9 SECURITY DEFINER functions + drop ensure_user_exists + config.toml send-sms-otp verify_jwt=false [15:30 IST]
## [2026-04-25] diagnose | Pre-launch P0 audit — 8 items checked, 9 issues found [14:30 IST]
## [2026-04-25] refactor | Property Details tab: show only owner-submitted Basic Details, add View Listing link, replace WhatsApp footer with /contact link [13:00 IST]
## [2026-04-25] feat | Enabled WhatsApp card on /contact, updated grid to 2×2 [12:00 IST]
## [2026-04-24] fix | Co-resident dedup + RLS delete policy + ApplicationDetail restructure + Contact CTA [20:00 IST]
## [2026-04-24] feat | Step 3 revamp: remove ITR/bank uploads, add work_email/linkedin_url, drag-and-drop salary slip zone [18:00 IST]
## [2026-04-22] feat | Visit scheduler — admin exact-time reschedule mode [19:00 IST]
## [2026-04-19] feature | Hid WhatsApp card in Contact.tsx, added Call Reeve card with tel link [15:00 IST]
## [2026-04-19] feature | Restructured /login to split-screen layout, right trust panel added [14:30 IST]
## [2026-04-18] feat | Created OwnerLandingPage.tsx — new /owners route, 7 sections, dark theme, lifecycle flow, calculator, FAQ [18:30 IST]
## [2026-04-14] refactor | Remove pendingReturnTo localStorage — replaced with query param + sessionStorage returnTo [13:00 IST]
## [2026-04-14] feat | PropertyDetail + Eligibility: add verification gates (phone+Google) + proactive VerificationStrip UI [12:00 IST]
## [2026-04-14] feat | Profile: wire returnTo navigation for phone OTP and Google link success paths [11:00 IST]
## [2026-04-14] fix | Profile: parse OAuth error hash on mount to show toast when Google account already linked to another user [10:30 IST]
## [2026-04-14] fix | verify-phone-otp: add legitimate-user pre-check (SPURIOUS_ROW_MAX_AGE_MS=60s) — abort with 409 if phone belongs to existing user, never delete legitimate accounts [10:00 IST]
## [2026-04-13] fix | supabase client: add noOpLock to fix Web Lock deadlock causing white screen on profile refresh for phone+Google users [18:30 IST]
## [2026-04-13] fix | useAuth: fix white screen on profile refresh for phone+Google users — skip INITIAL_SESSION, increase setTimeout to 100ms [18:00 IST]
## [2026-04-13] fix | useAuth: wrap onAuthStateChange in setTimeout(0) to fix DB deadlock on page refresh [17:30 IST]
## [2026-04-13] fix | useAuth: add 5s safety timeout to prevent infinite loading after OAuth redirect [17:00 IST]
## [2026-04-13] fix | Profile: navigate to clean /profile after Google linking to clear OAuth fragments [16:30 IST]
## [2026-04-13] fix | Profile: fix Google linking email+name update, show email in Google section, hide change phone once verified [16:00 IST]
## [2026-04-13] fix | config: add manual linking + confirm phone display format correct [15:30 IST]
## [2026-04-13] fix | verify-phone-otp: cleanup spurious public.users row + standardise phone format [15:00 IST]
## [2026-04-13] fix | verify-phone-otp: delete spurious phone user before PUT to prevent unique constraint violation [14:30 IST]
## [2026-04-13] fix | verify-phone-otp: fix Admin API HTTP method PATCH→PUT for user update [14:00 IST]
## [2026-04-13] fix | Profile: use fetch instead of functions.invoke to fix missing Authorization header [13:30 IST]
## [2026-04-13] fix | Profile: capture Google token before signInWithOtp to fix 401 on verify-phone-otp [13:00 IST]
## [2026-04-13] fix | verify-phone-otp: add CORS headers + cleanup spurious phone auth rows [12:30 IST]
## [2026-04-13] fix | handle_user_updated: add email_confirmed_at block for Google OAuth users [12:00 IST]
## [2026-04-09] feature | verify-phone-otp edge function: phone linking for OAuth users [14:30 IST]
## [2026-04-09] fix | Profile: fix shouldCreateUser for phone OTP [14:15 IST]
## [2026-04-09] fix | Profile: fix phone OTP for Google OAuth users [14:00 IST]
## [2026-04-09] diagnose | Profile phone+Google linking diagnostic [13:30 IST]
## [2026-04-09] fix | useAuth: retry loadUser on null row to fix trigger race condition [13:00 IST]
## [2026-04-09] fix | Login: fix Google OAuth redirect — remove !user guard from redirect useEffect [12:30 IST]
## [2026-04-09] fix | Add on_auth_user_updated trigger for phone OTP user row creation [11:30 IST]
## [2026-04-09] fix | send-sms-otp: fix Content-Type header on hook response — Supabase Auth requires application/json on all responses [10:00 IST]
## [2026-04-08] fix | send-sms-otp: fix webhook secret extraction — pass raw base64 string to Webhook constructor, not decoded bytes [20:00 IST]
## [2026-04-08] feat | Profile redesign: 4-section layout (name, phone OTP verify, Google link, emergency contact) + dual verification gate on Schedule Visit and Apply [19:30 IST]
## [2026-04-08] refactor | Core auth: phone OTP + Google OAuth, remove onboarding, fix route protection [18:30 IST]
## [2026-04-08] security | send-sms-otp: webhook signature verification added [18:00 IST]
## [2026-04-08] add | Edge function send-sms-otp deployed [17:30 IST]
## [2026-04-08] migrate | DB migration: drop onboarding_completed, fix handle_new_user trigger for phone OTP [17:00 IST]
## [2026-04-08] fix | RequestCallbackModal: iOS keyboard gap — disable vaul repositionInputs, handle keyboard ourselves [16:00 IST]
## [2026-04-08] fix | RequestCallbackModal: iOS keyboard gap — visualViewport targets Drawer scroll container, not Dialog [15:00 IST]
## [2026-04-08] fix | RequestCallbackModal: iOS keyboard gap via structural approach — top-anchored h-dvh, overflow-y-scroll, scrollIntoView on focus [14:00 IST]
## [2026-04-08] fix | RequestCallbackModal: slot ranges, night window range, greying rule >= for India and international [13:00 IST]
## [2026-04-08] fix | RequestCallbackModal: correct timezone select to 7 options [12:30 IST]
## [2026-04-08] fix | RequestCallbackModal: iOS keyboard gap via visualViewport listener [12:00 IST]
## [2026-04-07] fix | Fix 6 UI/logic bugs in RequestCallbackModal: +91 prefix, timezone select, intl phone fields, night window gate, step 4 phone display, call/range summary [12:00 IST]
## [2026-04-07] fix | Fix 4 bugs in RequestCallbackModal: phone normalise, modal size, mobile keyboard, timezone slots [11:00 IST]
## [2026-04-07] feature | Wire RequestCallbackButton into Contact, Admin sidebar, ApplicationDetail, MyPropertyDetail [10:00 IST]
## [2026-04-06] feat | Build /admin/callbacks page + App.tsx route [12:45 IST]
## [2026-04-06] feature | Build RequestCallbackButton + RequestCallbackModal [12:30 IST]
## [2026-04-06] migration | Create callback_requests table [12:00 IST]
## [2026-04-06] migrate | Created visit_events table, extended profiles and visits, added no-show auto-block trigger [11:33 IST]
## [2026-04-06] feat | Created shared VisitSchedulerModal component [11:37 IST]
## [2026-04-06] feat | Rewrote VisitsList: event timeline, fixed date picker, status labels, scheduling block [11:45 IST]
## [2026-04-06] feat | Added 4 admin visit actions to FieldCalendar + fixed rescheduled status filter [11:52 IST]
## [2026-04-06] feat | Built /admin/visits Visit Logs page with filters and row detail drawer [12:04 IST]
## [2026-04-06] feat | Added no-show monitoring and unblock capability to TenantPipeline [12:18 IST]
## [2026-04-06] feat | Surfaced visit notes and admin tenant notes in AdminApplicationDetail [12:35 IST]
## [2026-04-06] feat | Added scheduling block gate and VisitSchedulerModal to PropertyDetail [12:52 IST]

## [2026-04-18] feat | Created OwnerClarityGuide.tsx — owner clarity guide page with 13 sections, TOC, progress bar [18:30 IST]

## [2026-04-19] diagnose | Token payment flow — pre-implementation diagnosis complete [14:30 IST]

## [2026-04-19] diagnose | Razorpay UPI token payment — pre-implementation diagnosis [15:00 IST]

## [2026-04-19] migrate | Razorpay Phase 1 — payments UNIQUE constraint, RLS policies, remove payment_pending from WITHDRAWABLE_STATUSES [15:15 IST]

## [2026-04-19] feat | Razorpay Phase 2 — create-razorpay-order Edge Function [15:30 IST]

## [2026-04-19] feat | Razorpay Phase 3 — verify-razorpay-payment webhook handler [15:50 IST]

## [2026-04-19] feat | Razorpay Phase 4 — frontend checkout, owner_accepted CTA, payment_received screen [16:10 IST]

## [2026-04-19] feat | Footer rewrite — nav links, legal identity block for Meta Business Verification [18:31 IST]

## [2026-04-19] fix | Footer desktop grid 3→4 cols, For Tenants into own column [18:45 IST]

## [2026-04-20] diagnose | Token payment refund policy — pre-implementation diagnosis [14:00 IST]

## [2026-04-22] diagnose | Visit time slot filtering — diagnosis complete [09:22 IST]

## [2026-04-22] feat | Visit scheduler — Early Morning slot, past-slot filtering, 4PM cutoff, 7-day window, full slot label in My Visits [09:40 IST]

## [2026-04-22] diagnose | Visit module — 3 bugs + systemic issues diagnosed [10:36 IST]

## [2026-04-22] backend | Visit module — schema reconciled, RPCs + RLS + status trigger added [11:05 IST]

## [2026-04-22] diagnose | Visit module post-migration — 3 issues diagnosed [12:30 IST]

## [2026-04-22] fix | Visit module — reschedule linkage column + tenant timeline filter + Visit Logs notes display [13:30 IST]

## [2026-04-22] diagnose | Eligibility scheduler — unification feasibility diagnosed [14:30 IST]

## [2026-04-22] refactor | Eligibility scheduler unified with VisitSchedulerModal; legacy component deleted [15:30 IST]

## [2026-04-24] diagnose | Codebase audit for WhyReeveFeeModal — modal, tokens, fonts, animations [12:24 IST]

## [2026-04-24] feat | Built WhyReeveFeeModal — 5-screen pain-first story modal for 7% fee [12:45 IST]

## [2026-04-24] fix | WhyReeveFeeModal — fixed empty slides (CSS translateX formula), desktop overflow (overflow-hidden + [&>button]:hidden), added touch swipe nav [13:09 IST]

## [2026-04-24] fix | WhyReeveFeeModal — fixed progressive slide drift and desktop width [13:19 IST]

## [2026-04-24] fix | WhyReeveFeeModal — moved Screen 5 CTA to footer, rewrote Screen 4 narrative [13:42 IST]

## [2026-05-03] perf | Logo dims, hero LCP fade removed, contrast fix [12:30 IST]

## [2026-05-03] feat | Created public/llms.txt and public/llms-full.txt for AI agent discoverability [14:04 IST]

## [2026-05-05] diagnose | PostHog owner funnel tracking audit — listed gaps for 5 funnel steps [11:30 IST]

## [2026-05-05] feat | Instrumented PostHog owner funnel — 5 events across 6 files [12:15 IST]

## [2026-05-17] diagnose | Inspection report PDF export — surveyed codebase, produced diagnosis [IST]
## [2026-05-17] feat | Export dialog + form integration; removed window.print flow [23:55 IST]
## [2026-05-17] feat | PDF document & generator for inspection reports — 9 sections, ReportDocument, generate.ts, dev test button [23:40 IST]
## [2026-05-17] feat | Foundations for inspection report PDF export (migration, deps, types, formatters) [23:18 IST]
## [2026-05-29] feat | Added legal disclaimer section to inspection report PDFs [18:20 IST]
## [2026-05-29] diagnose | Inspection form resilience audit — surveyed save flow, identified loss paths [18:50 IST]
## [2026-05-29] fix | InspectionForm save resilience: re-populate refs on failure, surface failed state with retry, flush before completion [19:15 IST]
## [2026-06-05] diagnose | Audit 4 PDF/form issues: BHK duplication, paint condition, drive link, features+furniture missing [14:30 IST]
## [2026-06-05] fix | PDF render fixes: BHK formatting, furniture and room features now visible [17:45 IST]
## [2026-06-06] feat | Add Google Drive walkthrough link to inspection form and PDF [11:20 IST]
## [2026-06-06] feat | Add paint_condition field to inspection rooms (form + PDF) [11:40 IST]
