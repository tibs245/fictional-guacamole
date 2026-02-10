# D-01: Suspense Boundary Pattern for Data-Dependent Pages and Components

> Decision record for the Error / Loading / Content separation pattern using React Suspense and ErrorBoundary.

## Context

Pages and components that depend on API data currently mix three concerns in a single file:

```tsx
// ❌ Current pattern — all three states in one component
export default function EditConfigurationPage() {
  const { data, isLoading, error, isSuccess } = useQuery(...);

  return (
    <Drawer>
      {isLoading && <OdsSpinner />}
      {!!error && <ErrorBoundary ... />}
      {isSuccess && (
        // 80+ lines of actual business content
      )}
    </Drawer>
  );
}
```

### Problems with the current approach

1. **Pollution** — The business component is cluttered with loading/error plumbing. The actual content is buried inside `{isSuccess && (...)}`.
2. **Conditional `data`** — With `useQuery`, `data` is `T | undefined`. Every consumer must guard against `undefined`, even inside the `isSuccess` branch where it's guaranteed.
3. **Poor testability** — To test the content, you must mock the query to return success. You can't test the content component in isolation with guaranteed data.
4. **Mixed responsibilities** — A single file handles error display, loading display, and business logic. SRP is violated.
5. **Inconsistent loading states** — Some pages show `<OdsSpinner />`, others show `null`, others show skeleton. No unified pattern.

## Decision

Adopt the **Suspense Boundary pattern**: split data-dependent pages and components into a Shell (boundary) and a Content (business logic). This pattern applies at **both levels** — pages and components.

### The pattern at page level

```
PageName/
├── PageName.page.tsx       ← Shell: Suspense + ErrorBoundary
├── PageName.content.tsx    ← Content: useSuspenseQuery, business logic
├── _components/
└── _hooks/
```

### The pattern at component level

```
ComponentName/
├── ComponentName.component.tsx   ← Shell: Suspense + ErrorBoundary
├── ComponentName.content.tsx     ← Content: useSuspenseQuery, render
└── __tests__/
```

**Shell** — owns the boundaries:
```tsx
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

**Content** — owns the business logic:
```tsx
export function ListingContent() {
  // data is GUARANTEED to be defined — never undefined
  const { data } = useSuspenseQuery(tenantsQueryOptions());
  const columns = useTenantListingColumns();

  return (
    <Datagrid
      columns={columns}
      items={data}
      totalItems={data.length}
    />
  );
}
```

### Natural granularity through component boundaries

Because the pattern applies at the component level, granularity is automatic. A dashboard page doesn't need its own boundaries — each tile manages its own:

```tsx
// VaultDashboard.page.tsx — no Suspense/ErrorBoundary needed here
export default function VaultDashboardPage() {
  const { vaultId } = useRequiredParams('vaultId');
  return (
    <BaseLayout>
      <GeneralInformationTile vaultId={vaultId} />  {/* own Shell + Content */}
      <SubscriptionTile vaultId={vaultId} />          {/* own Shell + Content */}
      <BucketsTile vaultId={vaultId} />               {/* own Shell + Content */}
    </BaseLayout>
  );
}
```

Each tile loads and errors independently. A failed API for one tile doesn't break the others.

## Alternatives considered

### Alternative 1: Keep `useQuery` with conditional rendering (current)

```tsx
const { data, isLoading, isError } = useQuery(...);
if (isLoading) return <Spinner />;
if (isError) return <Error />;
return <Content data={data!} />;
```

**Pros**: Simple, no Suspense knowledge needed.
**Cons**: `data` is still `T | undefined` at the type level. Every guard is manual. Loading/error logic pollutes the component. No composition of boundaries.

**Rejected because**: It doesn't scale. With 2-3 queries per page, the conditional tree becomes unreadable.

### Alternative 2: `useSuspenseQuery` without separation (no Shell)

```tsx
export default function ListingPage() {
  const { data } = useSuspenseQuery(...);
  return <Datagrid items={data} />;
}
```

**Pros**: Simple, `data` is guaranteed.
**Cons**: Where does the `<Suspense>` go? It must be in a parent. This pushes the boundary to the router level, losing fine-grained control over fallbacks. Error handling defaults to React Router's `errorElement`, which is a full-page error.

**Rejected because**: We need per-component fallbacks, not just per-route.

### Alternative 3: HOC pattern (`withSuspense(Component)`)

```tsx
export default withSuspense(ListingContent, { fallback: <Skeleton /> });
```

**Pros**: Less boilerplate.
**Cons**: Hides the boundary composition. Hard to customize error handling per-page. Magic.

**Rejected because**: Explicit is better than implicit. The Shell file is small and clear.

## Rationale

### Why `useSuspenseQuery`

| | `useQuery` | `useSuspenseQuery` |
|---|---|---|
| `data` type | `T \| undefined` | `T` (guaranteed) |
| Loading state | Manual: `if (isPending)` | Automatic: Suspense catches it |
| Error state | Manual: `if (isError)` | Automatic: ErrorBoundary catches it |
| Component focus | Mixed (data + plumbing) | Pure business logic |
| Testability | Must mock loading/error states | Test content with real data shapes |

### Why custom ErrorBoundary fallbacks

Error display is always **context-specific**: a tile error shows a small inline message, a page error might show a full-page redirect, a form error might show a retry button. There is no useful generic default.

The approach:
- **Always provide a custom `fallbackRender`** specific to the page/component context
- For pages, the `ErrorBoundary` from `@ovh-ux/manager-react-components` can be used when its behavior (React Router navigation, shell integration) is appropriate
- `react-error-boundary` provides `fallbackRender`, `onReset`, and `resetKeys` for more flexible cases

### Why the pattern applies at both page and component levels

Applying the Shell + Content split only to pages would still leave components polluted. By applying it at both levels:

1. **Each component is autonomous** — it manages its own loading/error, no parent coordination needed
2. **Pages become pure composition** — assembling components, no boundary management
3. **Testability is uniform** — every `.content.tsx` receives guaranteed data, at both levels
4. **Granularity is free** — you don't need to decide "should I put one Suspense or three?" — each component decides for itself

## Consequences

### Positive
- Content components are pure business logic — no loading/error plumbing
- `data` is always `T`, never `undefined` — fewer type guards
- Loading and error states are customizable per-boundary, always context-specific
- Easier to test: Content with guaranteed data, Shell with boundary behavior
- Consistent pattern across the app at both page and component levels
- Independent loading/error per component — one failure doesn't cascade

### Negative
- Two files instead of one per data-dependent page/component
- Team must learn Suspense + ErrorBoundary mental model
- `react-error-boundary` as a dependency (lightweight, ~3 Ko)

### When NOT to use

- **Components with static + dynamic content** — If static content should be visible during loading (e.g., form labels), `useQuery` inline is simpler
- **Optional data** — If the data is a nice-to-have, `useQuery` with fallback values avoids unnecessary complexity

### Migration
- Not a big-bang migration. New pages/components adopt the pattern. Existing ones are migrated when touched.
- The Shell file is small (~15-20 lines) and formulaic.

## Related decisions

- [D-02 — Component SRP Split](./D-02-component-srp-split.md): Extends this pattern to 4 files (Shell / Content / Loading / Error) when loading or error fallbacks have non-trivial logic.

## History

- 2025-02-10: Added cross-reference to D-02 (4-file SRP split).
- 2025-02-09: Created — adopted the Shell + Content Suspense boundary pattern.
