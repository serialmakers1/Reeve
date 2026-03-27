---
description: Review all changed files before pushing — catch bugs, broken logic, type errors
---
## Changed files in this branch

!`git diff --name-only HEAD`

## Full diff

!`git diff HEAD`

Review the above changes for:
1. TypeScript errors or type mismatches
2. Supabase query issues — missing .maybeSingle(), wrong table names, missing error handling
3. Mobile layout issues — fixed positioning conflicts, BottomNav overlap, footer padding
4. Auth logic — missing OnboardingGuard on new protected routes, direct supabase.auth calls
5. Any hardcoded values that should be dynamic

Run: npx tsc --noEmit

Report issues by file and line number. Flag anything that would break in production.
