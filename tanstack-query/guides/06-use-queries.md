# useQueries

> How to run multiple queries in parallel using `useQueries`, with dynamic lists and result aggregation.

## Prerequisites

- [02-query-options.md](./02-query-options.md)

## Rules

### Rule 1: Use `useQueries` for dynamic parallel queries

When the number of queries is determined at runtime (e.g., a list of IDs), use `useQueries`. Do not call `useQuery` in a loop — hooks must not be called conditionally or in loops.

#### Correct

```tsx
import { useQueries } from '@tanstack/react-query';
import { productQueries } from './products.queries';

function ProductComparison({ ids }: { ids: string[] }) {
  const results = useQueries({
    queries: ids.map((id) => productQueries.detail(id)),
  });

  const isPending = results.some((r) => r.isPending);
  if (isPending) return <Spinner />;

  return (
    <ComparisonTable products={results.map((r) => r.data!)} />
  );
}
```

#### Incorrect

```tsx
// Hooks in a loop — violates Rules of Hooks
function ProductComparison({ ids }: { ids: string[] }) {
  const products = ids.map((id) => {
    return useQuery(productQueries.detail(id)); // ERROR: hook in loop
  });
}
```

---

### Rule 2: Use `combine` to aggregate results

The `combine` option transforms the array of query results into a single value. Use it to derive loading states, merge data, or compute aggregates.

#### Correct

```tsx
function ProductComparison({ ids }: { ids: string[] }) {
  const { data, isPending } = useQueries({
    queries: ids.map((id) => productQueries.detail(id)),
    combine: (results) => ({
      data: results.map((r) => r.data).filter(Boolean),
      isPending: results.some((r) => r.isPending),
    }),
  });

  if (isPending) return <Spinner />;
  return <ComparisonTable products={data} />;
}
```

#### Incorrect

```tsx
// Manual aggregation outside — verbose and repeated
function ProductComparison({ ids }: { ids: string[] }) {
  const results = useQueries({
    queries: ids.map((id) => productQueries.detail(id)),
  });

  const isPending = results.some((r) => r.isPending);
  const hasError = results.some((r) => r.isError);
  const data = results.map((r) => r.data).filter(Boolean);
  // duplicated in every component that uses useQueries
}
```

---

### Rule 3: For a fixed number of queries, prefer multiple `useQuery` calls

If you always fetch exactly 2-3 known queries, use separate `useQuery` calls. `useQueries` is for dynamic lists.

#### Correct

```tsx
// Fixed, known queries — separate useQuery calls are clearer
function Dashboard() {
  const { data: users } = useQuery(userQueries.count());
  const { data: orders } = useQuery(orderQueries.recent());
  const { data: revenue } = useQuery(revenueQueries.today());

  return <DashboardView users={users} orders={orders} revenue={revenue} />;
}
```

#### Incorrect

```tsx
// useQueries for a fixed set — unnecessarily complex
function Dashboard() {
  const results = useQueries({
    queries: [
      userQueries.count(),
      orderQueries.recent(),
      revenueQueries.today(),
    ],
  });
  // results[0].data, results[1].data... — no named access, confusing
}
```

---

## Edge Cases

- **Empty array**: `useQueries({ queries: [] })` is valid and returns an empty array. Useful when the list of IDs is initially empty.
- **Mixed query types**: Queries in the array can come from different factories — they don't need to be the same type. But `combine` works best when types are homogeneous.
- **`useSuspenseQueries`**: The Suspense equivalent exists. All queries suspend together — the component only renders when ALL queries resolve:
  ```tsx
  const results = useSuspenseQueries({
    queries: ids.map((id) => productQueries.detail(id)),
  });
  // All data entries are guaranteed defined
  ```
- **De-duplication**: If the same queryKey appears multiple times in the array, TanStack Query de-duplicates the network request. But the results array still has one entry per input.

---

> Decision rationale: [D-06 — useQueries vs multiple useQuery](../decisions/D-06-use-queries-vs-multiple.md)
