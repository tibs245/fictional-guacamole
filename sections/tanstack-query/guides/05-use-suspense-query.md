# useSuspenseQuery

> How to load data with React Suspense boundaries using `useSuspenseQuery`. Data is always defined — no `undefined` checks.

## Prerequisites

- [02-query-options.md](./02-query-options.md)

## Rules

### Rule 1: `data` is always defined

Unlike `useQuery`, `useSuspenseQuery` guarantees that `data` is of type `T`, never `T | undefined`. Loading is handled by Suspense, errors by Error Boundaries.

#### Correct

```tsx
import { useSuspenseQuery } from '@tanstack/react-query';
import { productQueries } from './products.queries';

function ProductDetail({ id }: { id: string }) {
  // data is Product, not Product | undefined
  const { data } = useSuspenseQuery(productQueries.detail(id));

  return <h1>{data.name}</h1>; // safe — no optional chaining needed
}
```

#### Incorrect

```tsx
function ProductDetail({ id }: { id: string }) {
  const { data } = useSuspenseQuery(productQueries.detail(id));

  // Unnecessary — data is guaranteed defined in Suspense mode
  if (!data) return null;

  return <h1>{data.name}</h1>;
}
```

---

### Rule 2: Wrap with Suspense + ErrorBoundary + QueryErrorResetBoundary

Every component using `useSuspenseQuery` must be wrapped in a Suspense boundary (for loading) and an ErrorBoundary (for errors). Use `QueryErrorResetBoundary` to enable retry.

#### Correct

```tsx
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { QueryErrorResetBoundary } from '@tanstack/react-query';

function ProductPage({ id }: { id: string }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          fallbackRender={({ resetErrorBoundary }) => (
            <div>
              <p>Something went wrong.</p>
              <button onClick={resetErrorBoundary}>Retry</button>
            </div>
          )}
        >
          <Suspense fallback={<Spinner />}>
            <ProductDetail id={id} />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function ProductDetail({ id }: { id: string }) {
  const { data } = useSuspenseQuery(productQueries.detail(id));
  return <ProductView product={data} />;
}
```

#### Incorrect

```tsx
// No Suspense boundary — React throws an error
function ProductPage({ id }: { id: string }) {
  return <ProductDetail id={id} />;
}

// No ErrorBoundary — unhandled errors crash the app
function ProductPage({ id }: { id: string }) {
  return (
    <Suspense fallback={<Spinner />}>
      <ProductDetail id={id} />
    </Suspense>
  );
}
```

---

### Rule 3: Same queryOptions factory works for both hooks

The factory created with `queryOptions()` is consumed identically by `useQuery` and `useSuspenseQuery`. No changes to the factory are needed.

#### Correct

```tsx
// products.queries.ts — same factory for both hooks
export const productQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: ['products', 'detail', id],
      queryFn: () => fetchProduct(id),
    }),
};

// Component A — uses useQuery (handles loading/error inline)
const { data, isPending, error } = useQuery(productQueries.detail(id));

// Component B — uses useSuspenseQuery (Suspense handles loading/error)
const { data } = useSuspenseQuery(productQueries.detail(id));
```

---

### Rule 4: Do not use `enabled` with useSuspenseQuery

`useSuspenseQuery` does not support the `enabled` option. If you need conditional fetching, use `useQuery` with `enabled` instead, or restructure so the condition is resolved before the Suspense component renders.

#### Correct

```tsx
// Parent resolves condition, child always fetches
function ProductPage({ id }: { id: string | undefined }) {
  if (!id) return <Placeholder />;

  return (
    <Suspense fallback={<Spinner />}>
      <ProductDetail id={id} />
    </Suspense>
  );
}

function ProductDetail({ id }: { id: string }) {
  const { data } = useSuspenseQuery(productQueries.detail(id));
  return <ProductView product={data} />;
}
```

#### Incorrect

```tsx
// enabled is not supported — this won't work as expected
function ProductDetail({ id }: { id: string | undefined }) {
  const { data } = useSuspenseQuery({
    ...productQueries.detail(id!),
    enabled: !!id, // ignored by useSuspenseQuery
  });
}
```

---

## Edge Cases

- **Multiple suspense queries in one component**: Each `useSuspenseQuery` call suspends sequentially (waterfall). If you need parallel loading, split into separate components each wrapped in their own Suspense boundary, or use `useSuspenseQueries` (plural).
- **Select works with useSuspenseQuery**: The returned `data` type reflects the select output:
  ```tsx
  const { data: name } = useSuspenseQuery({
    ...productQueries.detail(id),
    select: (product) => product.name,
  });
  // name is string, not string | undefined
  ```
- **Background refetch errors**: When stale data exists and a background refetch fails, the error is NOT thrown to the Error Boundary. The stale data stays visible. Only the initial load throws to the boundary.

---

> Decision rationale: [D-05 — useSuspenseQuery default vs useQuery default](../decisions/D-05-suspense-vs-usequery.md)
>
> Architecture pattern: For file structure (Shell + Content split), see `project-structure` guide 01-page-architecture, Rule 7.
