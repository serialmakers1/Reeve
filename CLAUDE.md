# Reeve

Property management platform connecting owners and tenants in India. Owners list properties, tenants apply and sign leases — Reeve manages inspections, agreements, and the full rental lifecycle.

## Tech Stack
- React 18 + TypeScript (Vite + SWC)
- Tailwind CSS + shadcn/ui (Radix primitives)
- Supabase (Postgres + Auth + Storage)
- React Router v6
- Sentry for error tracking, PostHog for analytics

## Key Commands
npm run dev        # dev server on port 8080
npm run build      # production build
npm run lint       # eslint
npm run test       # vitest

## Path Aliases
@/ maps to ./src/ — always use this, never relative imports.

## Supabase
- Project ref: tfutuqqcxqqbirnsdpvz
- URL: https://tfutuqqcxqqbirnsdpvz.supabase.co
- Client: import { supabase } from "@/integrations/supabase/client"
- Types: src/integrations/supabase/types.ts — auto-generated, do not edit
- Auth storage key: reeve-auth
- Always use apply_migration for DDL. Never raw SQL for schema changes.

## Auth Architecture
- useAuth() — single source of truth. Returns { session, user, isLoading, isAuthenticated, signOut, refreshUser }
- useRequireAuth({ requireAdmin? }) — use on all protected pages
- Never call supabase.auth.getSession() in rendering logic or useEffect data gates — use useAuth(). Event handlers performing one-time mutations may call it directly.
- Never reference `session.user.id` in component render logic or Supabase queries — use `user.id` from `useRequireAuth()` or `useAuth()` instead. `session` is only valid inside async event handlers that explicitly call `await supabase.auth.getSession()`.
- Loading guards on protected pages must cover BOTH auth loading and data loading: `if (authLoading || dataLoading) return null` — never guard on data loading alone. Auth hydration takes a non-zero amount of time on mount; guarding only on data loading causes a race where `navigate('/login')` fires before auth has resolved.
- When destructuring from `useAuth()` in a component that also fetches data, always include `isLoading` (alias it as `authLoading`) and add it to every loading guard and useEffect dependency array.
- After signup, users row has ~1s trigger lag — fetchUserWithRetry handles this, do not remove

## User Roles
user | tenant | owner | admin | super_admin
Post-login redirect handled by authUtils.getDefaultRouteForRole(role)

## Route Guards
All authenticated routes use <OnboardingGuard>. Users with onboarding_completed: false are redirected to /onboarding.
Every new protected route must be wrapped in <OnboardingGuard>.

## Layout Rules
- All public/tenant pages use <Layout> (src/components/Layout.tsx) — includes Header + Footer
- Admin pages use <AdminLayout> (src/components/admin/AdminLayout.tsx)
- Never hardcode nav or footer inside pages — always use Layout

## Property Status Flow
draft → inspection_proposed → inspection_scheduled → inspected → listed → occupied → off_market
Display labels and colors live in src/lib/propertyStatus.ts — keep display logic there.

## Database Tables (22 total)
agreements, applications, application_notes, application_residents, documents,
eligibility, favourites, inspection_callbacks, keys_tracking, leads, leases,
maintenance_requests, owner_action_log, owner_bank_details, payments, profiles,
properties, property_condition_reports, property_images, users, visits
View: properties_with_flat_number

## TypeScript Config
strictNullChecks: false, noImplicitAny: false — intentional, do not tighten.

## Critical Gotchas
- Always use .maybeSingle() not .single() — single() throws on no rows
- The users table is separate from Supabase auth — query users for role/profile, never auth.users
- eligibility table gates visit scheduling — check eligibility status before any scheduling feature
- Property images stored in Supabase Storage — property_images table holds metadata + sort order
- Tenant KYC docs uploaded to `tenant-documents` Storage bucket — path: `{userId}/{applicationId}/{type}_{timestamp}.ext`. Separate from the documents DB table.
- BottomNav is fixed bottom-0 z-50, only renders when isAuthenticated — account for this on mobile layouts
- Mobile CTA bars in PropertyDetail use bottom-16 (logged in) or bottom-0 (logged out)
- OnboardingGuard runs on every render — no expensive calls inside it
- PostHog initialized in main.tsx — use posthog?.capture() with optional chaining everywhere

## Skills — Always Check Before Acting

Skills live in `.claude/skills/`. Before responding to any request, check if a skill applies.
The `using-superpowers` skill defines the full workflow — read it first if unsure.

Invoke the relevant skill when:
- Writing, reviewing, or debugging any React component → `react-best-practices`
- Writing, reviewing, or optimizing any Supabase query, migration, or RLS policy → `supabase-postgres-best-practices`
- Reviewing code for vulnerabilities, auth issues, or data exposure → `security-best-practices`
- Encountering any bug, unexpected behavior, or test failure → `systematic-debugging`
- Building any new UI component, page, or layout → `frontend-design`
- Designing or reviewing any UI/UX flow → `ui-ux-pro-max`
- Reviewing a design, giving UI feedback, or critiquing a screen → `product-designer`
- Starting any new feature or significant change → `brainstorming`

Never skip a skill because the task seems simple. Read the SKILL.md, then act.
