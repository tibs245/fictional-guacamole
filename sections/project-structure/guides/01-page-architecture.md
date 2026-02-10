# Page Architecture

> How pages are structured, how to use `_components/` and `_hooks/`, and how routing fits in.

## Rules

### Rule 1: A page is a thin orchestrator

A page file (`.page.tsx`) orchestrates data and layout. It should not contain complex logic, large JSX trees, or inline business rules. Delegate to `_components/` and `_hooks/`.

When a page depends on data loading, use the **Shell + Content pattern** (see Rule 7 and [05-component-srp](./05-component-srp.md)): the `.page.tsx` file owns the Suspense and ErrorBoundary, while the `.content.tsx` file contains the business logic with guaranteed data.

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

When a page or component is **entirely dependent on data loading**, split it into a **Shell** and a **Content**. The Shell owns the `<Suspense>` + `<ErrorBoundary>`, the Content owns the business logic with `useSuspenseQuery`.

```tsx
// Listing.page.tsx — Shell
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

```tsx
// Listing.content.tsx — Content (data is ALWAYS defined)
export function ListingContent() {
  const { data: tenants } = useSuspenseQuery(vspcTenantsQueryOptions());
  return <Datagrid items={tenants} columns={useTenantListingColumns()} />;
}
```

This pattern applies at **both page and component levels**, creating independent loading/error states per component.

For complex cases where Loading or Error have their own logic (structured skeletons, retry, contextual messages), the split extends to 4 files. See **[05-component-srp](./05-component-srp.md)** for the full pattern, decision criteria, examples, and file naming conventions.

> **Decision records**: [D-01-suspense-boundary-pattern](../decisions/D-01-suspense-boundary-pattern.md) (Shell + Content) | [D-02-component-srp-split](../decisions/D-02-component-srp-split.md) (4-file SRP)

---

## File naming conventions

| Element | Extension | Example |
|---------|-----------|---------|
| Page (Shell) | `.page.tsx` | `Listing.page.tsx` |
| Page content | `.content.tsx` | `Listing.content.tsx` |
| Page loading | `.loading.tsx` | `Listing.loading.tsx` |
| Page error | `.error.tsx` | `Listing.error.tsx` |
| Component (Shell) | `.component.tsx` | `GeneralInformationTile.component.tsx` |
| Component content | `.content.tsx` | `GeneralInformationTile.content.tsx` |
| Component loading | `.loading.tsx` | `GeneralInformationTile.loading.tsx` |
| Component error | `.error.tsx` | `GeneralInformationTile.error.tsx` |
| Page-specific component | `.component.tsx` | `TenantNameCell.component.tsx` |
| Page-specific hook | `.tsx` or `.hooks.tsx` | `useVspcTenantListingColumns.tsx` |
| Integration test (page) | `.spec.tsx` | `Listing.spec.tsx` |
| Unit test (component/hook) | `.test.tsx` in `__tests__/` | `__tests__/TenantNameCell.component.test.tsx` |
| Layout | `.component.tsx` | `MainLayout.component.tsx` |
| Constants | `.constants.ts` | `routes.constants.ts` |
