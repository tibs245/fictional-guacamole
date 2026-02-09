# Page Architecture

> How pages are structured, how to use `_components/` and `_hooks/`, and how routing fits in.

## Rules

### Rule 1: A page is a thin orchestrator

A page file (`.page.tsx`) orchestrates data and layout. It should not contain complex logic, large JSX trees, or inline business rules. Delegate to `_components/` and `_hooks/`.

When a page depends on data loading, use the **Shell + Content pattern** (see Rule 7): the `.page.tsx` file owns the Suspense and ErrorBoundary, while the `.content.tsx` file contains the business logic with guaranteed data.

#### Correct

```tsx
// src/pages/services/listing/Listing.page.tsx — Shell
function ServiceListingPage() {
  return (
    <ErrorBoundary fallbackRender={({ error }) => <ErrorFallback error={error} />}>
      <Suspense fallback={<ListingSkeleton />}>
        <ListingContent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

```tsx
// src/pages/services/listing/Listing.content.tsx — Content
function ListingContent() {
  const { data: tenants } = useSuspenseQuery(tenantsQueryOptions());
  const columns = useVspcTenantListingColumns();

  return <Datagrid items={tenants} columns={columns} />;
}
```

#### Incorrect

```tsx
// ❌ Page with inline column definitions, cell renderers, and business logic
function ServiceListingPage() {
  const { data: tenants } = useVSPCTenants();

  const columns = useMemo(() => [
    {
      id: 'name',
      cell: (item) => (
        <a href={`/services/dashboard/${item.id}`}>
          {item.currentState.name}
        </a>
      ),
    },
    {
      id: 'status',
      cell: (item) => {
        const color = item.resourceStatus === 'READY' ? 'green' : 'red';
        return <Badge color={color}>{item.resourceStatus}</Badge>;
      },
    },
    // 50 more lines of column definitions...
  ], []);

  return <Datagrid items={tenants} columns={columns} />;
}
```

```tsx
// ❌ Page that mixes loading/error/content in a single component
function EditConfigurationPage() {
  const { data, isLoading, error, isSuccess } = useQuery(...);

  return (
    <Drawer>
      {isLoading && <OdsSpinner />}
      {!!error && <ErrorBoundary ... />}
      {isSuccess && (
        // 80+ lines of form content buried under conditions
      )}
    </Drawer>
  );
}
```

---

### Rule 2: `_components/` and `_hooks/` are page-scoped

Each page can have a `_components/` and `_hooks/` subdirectory. The underscore prefix signals that these are **private to this page** and must not be imported from outside.

```
src/pages/services/listing/
├── Listing.page.tsx              ← the page
├── Listing.spec.tsx              ← integration test
├── _components/                  ← components used ONLY by this page
│   ├── TenantNameCell.component.tsx
│   ├── TenantActionCell.component.tsx
│   └── index.ts
└── _hooks/                       ← hooks used ONLY by this page
    └── useVspcTenantListingColumns.tsx
```

#### Why the underscore?

- It signals **scope** — `_components/` belongs to this page, `src/components/` belongs to the app.
- It prevents accidental coupling — no other page should import from another page's `_components/`.
- It makes deletion safe — if you remove a page, you remove its `_components/` and `_hooks/` with it.

---

### Rule 3: Page-specific components solve one page-level need

A page-specific component exists because the page needs it, and only this page needs it. It is tightly coupled to the page's data model and routing.

#### Typical page-specific components

```tsx
// _components/TenantNameCell.component.tsx
// Renders a tenant name as a link to its dashboard — specific to services listing
export const TenantNameCell = ({ item }: { item: Resource<VspcTenant> }) => {
  const href = useHref(`/services/dashboard/${item.id}`);
  return <a href={href}>{item.currentState.name}</a>;
};
```

```tsx
// _components/TenantActionCell.component.tsx
// Renders action menu for a tenant row — specific to services listing
export const TenantActionCell = ({ item }: { item: Resource<VspcTenant> }) => {
  // delete action, edit action, etc.
};
```

---

### Rule 4: Page-specific hooks encapsulate page logic

The most common pattern is a `useColumns` hook that returns table column definitions. It keeps the page file clean and the column logic testable.

#### Correct

```tsx
// _hooks/useVspcTenantListingColumns.tsx
export const useVspcTenantListingColumns = () => {
  return useMemo(() => [
    { id: 'name', cell: TenantNameCell, label: t('name') },
    { id: 'location', cell: ResourceLocationCell, label: t('location') },
    { id: 'status', cell: ResourceStatusCell, label: t('status') },
    { id: 'actions', cell: TenantActionCell },
  ], [t]);
};
```

Other common patterns:
- `useDashboardTabs` — returns tab configuration for a dashboard page
- Form-related hooks — form validation, submission logic

---

### Rule 5: Nesting `_components/` is allowed when it improves readability

A page-specific component can itself have `_components/` if it is complex enough to warrant decomposition. There is no hard depth limit — use judgment. The goal is readability, maintainability, and testability.

```
src/pages/vaults/dashboard/general-information/
├── GeneralInformation.page.tsx
└── _components/
    ├── general-information-vault-tile/
    │   └── GeneralInformationVaultTile.component.tsx
    └── subscription-tile/
        ├── SubscriptionTile.component.tsx
        └── _components/                          ← nested sub-components
            ├── BillingType.component.tsx
            ├── ConsumptionDetails.component.tsx
            └── ConsumptionRegionsList.component.tsx
```

---

### Rule 6: Routing defines page hierarchy

Routes are defined in `src/routes/routes.tsx`. Primary pages (listings) live under `MainLayout` which provides shared navigation tabs. Secondary pages (dashboards, detail views) live outside `MainLayout` and have their own layout.

#### Route structure

```
ROOT (/)
├── Under MainLayout (with top-level tab navigation):
│   ├── /services          → ServiceListingPage
│   ├── /vaults            → VaultListingPage
│   └── /billing           → BillingListingPage
│
└── Outside MainLayout (independent layouts):
    ├── /services/dashboard/:tenantId  → TenantDashboardPage
    │   ├── /                          → GeneralInformationPage
    │   └── /agents                    → AgentListingPage
    │
    └── /vaults/dashboard/:vaultId     → VaultDashboardPage
        ├── /                          → GeneralInformationPage
        └── /buckets                   → VaultBucketsPage
```

#### Modal routes

Delete confirmations, creation forms, and other modals are nested routes rendered on top of their parent page:

```tsx
<Route path="services" Component={ServiceListingPage}>
  <Route path="delete" Component={DeleteTenantPage} />
</Route>
```

---

### Rule 7: Suspense boundary pattern for data-dependent pages and components

When a page or component is **entirely dependent on data loading**, split it into a Shell and a Content. The Shell owns the Suspense + ErrorBoundary, the Content owns the business logic with `useSuspenseQuery`.

This pattern applies at **two levels**:
- **Pages**: `*.page.tsx` (Shell) + `*.content.tsx` (Content)
- **Components**: `*.component.tsx` (Shell) + `*.content.tsx` (Content)

Each component managing its own boundary means **independent loading and error states** — one failing component doesn't break its siblings.

> **Decision record**: See [D-01-suspense-boundary-pattern](../decisions/D-01-suspense-boundary-pattern.md) for the full rationale, alternatives considered, and trade-offs.

#### File structure — page level

```
src/pages/services/listing/
├── Listing.page.tsx            ← Shell: Suspense + ErrorBoundary
├── Listing.content.tsx         ← Content: useSuspenseQuery + business logic
├── Listing.spec.tsx            ← Integration test
├── _components/
└── _hooks/
```

#### File structure — component level

```
src/components/CommonTiles/GeneralInformationTile/
├── GeneralInformationTile.component.tsx   ← Shell: Suspense + ErrorBoundary
├── GeneralInformationTile.content.tsx     ← Content: useSuspenseQuery + render
└── __tests__/
    └── GeneralInformationTile.content.test.tsx
```

#### Shell — owns the boundaries

The Shell is small and formulaic. It chooses:
- **What to show during loading** — a Skeleton layout, a Spinner, or `null`
- **What to show on error** — always custom, specific to the page/component context

```tsx
// Listing.page.tsx
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { ListingContent } from './Listing.content';
import { ListingSkeleton } from './_components/ListingSkeleton.component';

export default function ListingPage() {
  return (
    <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => (
      <ListingError error={error} onRetry={resetErrorBoundary} />
    )}>
      <Suspense fallback={<ListingSkeleton />}>
        <ListingContent />
      </Suspense>
    </ErrorBoundary>
  );
}
```

For pages, the `ErrorBoundary` from `@ovh-ux/manager-react-components` can also be used when appropriate (it integrates with React Router navigation and the shell).

#### Content — owns the business logic

The Content uses `useSuspenseQuery` — `data` is **always defined**, never `undefined`. No loading/error handling here. Pure business logic.

```tsx
// Listing.content.tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { vspcTenantsQueryOptions } from '@/data/queryOptions/tenants';
import { useTenantListingColumns } from './_hooks/useVspcTenantListingColumns';

export function ListingContent() {
  const { data: tenants } = useSuspenseQuery(vspcTenantsQueryOptions());
  const columns = useTenantListingColumns();

  return (
    <section className="flex flex-col gap-8">
      <Datagrid
        columns={columns}
        items={tenants}
        totalItems={tenants.length}
      />
    </section>
  );
}
```

#### Component-level example

A reusable tile that fetches its own data:

```tsx
// GeneralInformationTile.component.tsx — Shell
export function GeneralInformationTile({ vaultId }: { vaultId: string }) {
  return (
    <ErrorBoundary fallbackRender={({ error }) => (
      <TileError title="General Information" error={error} />
    )}>
      <Suspense fallback={<TileSkeleton rows={4} />}>
        <GeneralInformationTileContent vaultId={vaultId} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

```tsx
// GeneralInformationTile.content.tsx — Content
export function GeneralInformationTileContent({ vaultId }: { vaultId: string }) {
  const { data: vault } = useSuspenseQuery(vaultDetailsQueryOptions(vaultId));
  const { data: location } = useSuspenseQuery(locationQueryOptions(vault.region));

  return (
    <DashboardTile title="General Information">
      <TileRow label="Name">{vault.name}</TileRow>
      <TileRow label="Region">{location.label}</TileRow>
      <TileRow label="Status"><StatusBadge status={vault.status} /></TileRow>
    </DashboardTile>
  );
}
```

Because each component has its own boundary, a dashboard page becomes a composition of independent zones:

```tsx
// VaultDashboard.page.tsx
export default function VaultDashboardPage() {
  const { vaultId } = useRequiredParams('vaultId');

  return (
    <BaseLayout header={...}>
      <div className="grid grid-cols-2 gap-4">
        <GeneralInformationTile vaultId={vaultId} />   {/* own boundary */}
        <SubscriptionTile vaultId={vaultId} />          {/* own boundary */}
        <BucketsTile vaultId={vaultId} />               {/* own boundary */}
      </div>
    </BaseLayout>
  );
}
```

No need for boundaries in the page itself — each tile manages its own loading and error states.

#### When NOT to use this pattern

- **Components with static + dynamic content** — If the component has meaningful static content that should be visible during loading (e.g., a form with static labels + dynamic default values), use `useQuery` and handle loading inline.
- **Optional data** — If the data is a nice-to-have enhancement, not a requirement for rendering, `useQuery` with fallback values is simpler.

---

## File naming conventions

| Element | Extension | Example |
|---------|-----------|---------|
| Page (Shell) | `.page.tsx` | `Listing.page.tsx` |
| Page content | `.content.tsx` | `Listing.content.tsx` |
| Component (Shell) | `.component.tsx` | `GeneralInformationTile.component.tsx` |
| Component content | `.content.tsx` | `GeneralInformationTile.content.tsx` |
| Page-specific component | `.component.tsx` | `TenantNameCell.component.tsx` |
| Page-specific hook | `.tsx` or `.hooks.tsx` | `useVspcTenantListingColumns.tsx` |
| Integration test (page) | `.spec.tsx` | `Listing.spec.tsx` |
| Unit test (component/hook) | `.test.tsx` in `__tests__/` | `__tests__/TenantNameCell.component.test.tsx` |
| Layout | `.component.tsx` | `MainLayout.component.tsx` |
| Constants | `.constants.ts` | `routes.constants.ts` |
