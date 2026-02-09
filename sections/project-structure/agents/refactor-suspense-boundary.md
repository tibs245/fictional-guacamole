# Refactor: Suspense Boundary Pattern

> Incrementally migrate a module's pages and components to the Shell + Content pattern using `useSuspenseQuery`.

## Required inputs

Before starting, collect from the user:

1. **Module path**: the module directory (e.g., `packages/manager/modules/backup-agent`)
2. **Scope** (optional): a specific page or component to refactor. If not provided, the agent will orchestrate the full module.

## Overview

This agent refactors data-dependent pages and components from the `useQuery` + conditional rendering pattern to the **Suspense Boundary pattern** (Shell + Content split with `useSuspenseQuery`).

**The refactoring is incremental** — one page or component at a time. Each step is validated with lint + test + build before moving on.

## Phase 0 — Preparation

### Step 0.1: Verify dependencies

Check that the module has `react-error-boundary` installed:

```bash
# From the module directory
grep "react-error-boundary" package.json
```

If missing, tell the user:

> The module needs `react-error-boundary` to use the Shell + Content pattern. Please run:
> ```
> yarn add react-error-boundary
> ```

Do NOT install it yourself — let the user decide.

### Step 0.2: Verify data layer

Check that queryOptions factories exist in the module:

```bash
# Look for queryOptions files
find src/data -name "*.queries.ts" -o -name "*QueryOptions*" -o -name "*queryOptions*"
```

If query options are missing (inline `useQuery` calls with hardcoded keys), the data layer must be migrated first. Tell the user:

> This module doesn't use the queryOptions factory pattern yet. The data layer should be migrated first using the TanStack Query guides (02-query-options). Do you want me to migrate the data layer first, or should we skip this module?

### Step 0.3: Inventory pages and components to refactor

Scan for candidates — files that use `useQuery` with conditional rendering:

```bash
# Pages using useQuery with loading/error handling
grep -rl "useQuery" src/pages/ --include="*.tsx" | head -20
```

```bash
# Components using useQuery
grep -rl "useQuery" src/components/ --include="*.tsx" | head -20
```

For each file, check if it already uses the Shell + Content pattern:

```bash
# Already refactored — has .content.tsx sibling
find src -name "*.content.tsx"
```

Present the inventory to the user:

```
Pages to refactor:
  ✅ src/pages/services/listing/Listing.page.tsx  (already has .content.tsx)
  🔄 src/pages/vaults/dashboard/general-information/GeneralInformation.page.tsx
  🔄 src/pages/billing/listing/Listing.page.tsx

Components to refactor:
  🔄 src/components/CommonTiles/GeneralInformationTile/GeneralInformationTile.component.tsx
  🔄 src/components/CommonTiles/SubscriptionTile/SubscriptionTile.component.tsx
```

Ask the user to confirm which ones to refactor, or if they want to do all.

## Phase 1 — Refactor a single page or component

Execute this phase for each file selected. **One file at a time.**

### Step 1.1: Analyze the current file

Read the file and identify:

1. **Which queries** does it use? (look for `useQuery`, `useSuspenseQuery`, `useQueries`)
2. **What loading state** does it show? (`isLoading`, `isPending`, `<Spinner>`, skeleton)
3. **What error state** does it show? (`isError`, `error`, `<ErrorBoundary>`, error message)
4. **What is the business content?** — the JSX rendered in the success case
5. **Does it have static content visible during loading?** — if yes, this may NOT be a candidate (see "When NOT to use" below)

### Step 1.2: Decide if the pattern applies

The pattern applies when:
- The component is **entirely dependent on data** — nothing meaningful renders until data loads
- The component uses one or more `useQuery` calls with conditional rendering

The pattern does NOT apply when:
- The component has **static + dynamic content** (e.g., form with static labels + dynamic defaults) — use `useQuery` inline
- The data is **optional** (nice-to-have enhancement) — use `useQuery` with fallback values

If the pattern doesn't apply, tell the user and skip this file.

### Step 1.3: Create the Content file

Extract the business logic into a new `.content.tsx` file:

1. Move all `useQuery` calls → change to `useSuspenseQuery`
2. Remove all loading/error conditional rendering
3. Remove `undefined` guards on `data` — it's now guaranteed `T`
4. Keep all hooks, state, effects that relate to business logic
5. Export the content component

**Naming:**
- Page: `PageName.content.tsx` → exports `PageNameContent`
- Component: `ComponentName.content.tsx` → exports `ComponentNameContent`

### Step 1.4: Transform the original file into a Shell

The original file becomes the Shell:

1. Remove all business logic, hooks, and query calls
2. Add `<ErrorBoundary>` with a **custom fallback** specific to this page/component context
3. Add `<Suspense>` with an appropriate fallback (skeleton, spinner, or null)
4. Import and render the Content component

**ErrorBoundary rules:**
- Always provide a custom `fallbackRender` — never use a generic default
- For pages: consider `@ovh-ux/manager-react-components` ErrorBoundary if its behavior fits
- For components: use `react-error-boundary` with context-specific error display
- Include a retry button (`resetErrorBoundary`) when appropriate

**Shell template:**

```tsx
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { PageNameContent } from './PageName.content';

export default function PageNamePage() {
  return (
    <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => (
      <PageNameError error={error} onRetry={resetErrorBoundary} />
    )}>
      <Suspense fallback={<PageNameSkeleton />}>
        <PageNameContent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Step 1.5: Update imports

- Check that all imports in both files are correct
- Check that the route/parent component still imports the Shell correctly (default export preserved)
- If the original used named export, ensure the Shell preserves the same export name

### Step 1.6: Update tests

- **Content unit test**: If the original had a unit test, update it to test the Content component with `setQueryData` (pre-seeded cache) instead of mocking `useQuery`. Mount the `QueryClientProvider` manually with a pre-seeded `QueryClient` (see `project-structure` guide 04-test-utilities, Rule 3 — "Pre-seeding QueryClient cache"). If the builder has been extended to accept `.withQueryClient(queryClient)`, use that instead.
- **Integration test**: If a `.spec.tsx` exists, it should still work — MSW handlers feed the Suspense query. Verify it passes.
- **New test**: If no test exists for the Content component, create one using `setQueryData`.

### Step 1.7: Validate

Run lint, test, and build from the module directory:

```bash
# 1. Lint
yarn lint:modern:fix

# 2. Test relevant files
yarn test src/path/to/changed.test.tsx > /tmp/<module>-test.log 2>&1
tail -n 30 /tmp/<module>-test.log

# 3. Build
yarn build > /tmp/<module>-build.log 2>&1
tail -n 30 /tmp/<module>-build.log

# 4. Cleanup on success
rm -f /tmp/<module>-build.log /tmp/<module>-test.log
```

**Stop if any step fails.** Fix the issue before proceeding to the next page/component.

### Step 1.8: Present changes

Show the user:
- Files created/modified
- Before/after summary of the refactored file
- Test results

Ask for confirmation before moving to the next file.

## Phase 2 — Repeat for remaining files

Repeat Phase 1 for each page/component in the inventory. Process them in this order:

1. **Shared components first** (`src/components/`) — they may be used by pages
2. **Leaf pages** (no child routes) — simplest to refactor
3. **Parent pages** (with child routes) — may need boundary adjustments

## Phase 3 — Final validation

After all files are refactored:

```bash
# Full build validation
yarn build > /tmp/<module>-build.log 2>&1
tail -n 30 /tmp/<module>-build.log

# Run all tests
yarn test > /tmp/<module>-test.log 2>&1
tail -n 30 /tmp/<module>-test.log
```

Present a summary:

```
Refactoring complete for <module>:

  Pages refactored:
    ✅ Listing.page.tsx → Shell + Content
    ✅ GeneralInformation.page.tsx → Shell + Content
    ⏭️ EditConfiguration.page.tsx → skipped (static + dynamic content)

  Components refactored:
    ✅ GeneralInformationTile.component.tsx → Shell + Content

  Validation:
    ✅ Lint clean
    ✅ Tests pass
    ✅ Build succeeds
```

## Important rules

- **One file at a time** — never batch refactor multiple files without validating each one.
- **Always validate** (lint + test + build) after each file.
- **Never mock `useQuery` in new tests** — always use `setQueryData` for pre-seeding cache.
- **Preserve existing exports** — the Shell must export identically to the original file (default vs named export).
- **Custom error fallbacks always** — no generic error boundaries.
- **Ask before proceeding** — show changes and get user confirmation at each step.
- **Don't refactor what doesn't need it** — components with static + dynamic content, optional data, or already using `useSuspenseQuery` should be skipped.

## References

- [01-page-architecture](../guides/01-page-architecture.md) — Rule 7: Suspense boundary pattern
- [D-01-suspense-boundary-pattern](../decisions/D-01-suspense-boundary-pattern.md) — Full decision record
- [04-test-utilities](../guides/04-test-utilities.md) — Test wrapper builder with `setQueryData`
- [TanStack Query 05-use-suspense-query](../../tanstack-query/guides/05-use-suspense-query.md) — `useSuspenseQuery` rules
- [TanStack Query 02-query-options](../../tanstack-query/guides/02-query-options.md) — queryOptions factory pattern
- [Monorepo workflow 01-lint-and-build](../../monorepo-workflow/guides/01-lint-and-build.md) — Validation commands
