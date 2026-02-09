# useQuery

> How to fetch and display data with `useQuery` using queryOptions from a factory.

## Prerequisites

- [02-query-options.md](./02-query-options.md)

## Rules

### Rule 1: Always consume queryOptions from the factory

Never write inline `queryKey` + `queryFn` in a component. Import the factory and call the appropriate method.

#### Correct

```tsx
import { useQuery } from '@tanstack/react-query';
import { productQueries } from './products.queries';

function ProductDetail({ id }: { id: string }) {
  const { data, isPending, error } = useQuery(productQueries.detail(id));
  // ...
}
```

#### Incorrect

```tsx
function ProductDetail({ id }: { id: string }) {
  const { data } = useQuery({
    queryKey: ['products', 'detail', id],
    queryFn: () => fetchProduct(id),
  });
}
```

---

### Rule 2: Handle all three states explicitly

Every `useQuery` consumer must handle loading, error, and success states. Never render as if `data` is always available.

#### Correct

```tsx
function ProductDetail({ id }: { id: string }) {
  const { data, isPending, error } = useQuery(productQueries.detail(id));

  if (isPending) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return <ProductView product={data} />;
}
```

#### Incorrect

```tsx
function ProductDetail({ id }: { id: string }) {
  const { data } = useQuery(productQueries.detail(id));

  // data can be undefined during loading — runtime crash
  return <h1>{data.name}</h1>;
}
```

---

### Rule 3: Use `enabled` for conditional queries

When a query depends on a value that may not exist yet (e.g., a selected ID), use the `enabled` option to prevent the query from firing.

#### Correct

```tsx
function ProductDetail({ id }: { id: string | undefined }) {
  const { data, isPending } = useQuery({
    ...productQueries.detail(id!),
    enabled: !!id,
  });

  if (!id) return <Placeholder />;
  if (isPending) return <Spinner />;
  return <ProductView product={data} />;
}
```

#### Incorrect

```tsx
// Query fires with undefined id — bad request, wrong cache entry
function ProductDetail({ id }: { id: string | undefined }) {
  const { data } = useQuery(productQueries.detail(id!));
  // ...
}
```

---

### Rule 4: Never copy query data into local state

Query data is managed by TanStack Query's cache. Copying it into `useState` creates a stale duplicate that won't receive background updates.

#### Correct

```tsx
function ProductDetail({ id }: { id: string }) {
  const { data } = useQuery(productQueries.detail(id));

  // Derive values directly from data
  const displayName = data?.name ?? 'Loading...';

  return <h1>{displayName}</h1>;
}
```

#### Incorrect

```tsx
function ProductDetail({ id }: { id: string }) {
  const { data } = useQuery(productQueries.detail(id));
  const [product, setProduct] = useState(null);

  useEffect(() => {
    if (data) setProduct(data); // stale copy — background refetch won't update it
  }, [data]);

  return <h1>{product?.name}</h1>;
}
```

---

### Rule 5: Destructure only what you need

Prefer extracting specific fields from the query result. Avoid spreading the entire result object into child components.

#### Correct

```tsx
const { data, isPending, error } = useQuery(productQueries.detail(id));
```

#### Incorrect

```tsx
// Spreading everything — unclear what the component actually uses
const queryResult = useQuery(productQueries.detail(id));
return <ProductView {...queryResult} />;
```

---

## Edge Cases

- **Stale data during background refetch**: When `isPending` is `false` and data exists, a background refetch may be happening. Use `isFetching` if you need to show a subtle refresh indicator while keeping stale data visible.
- **`isPending` vs `isLoading` vs `isFetching`** (v5 semantics):
  - `isPending`: `status === 'pending'` — no data in cache yet. **Use this for UI loading states.**
  - `isLoading`: `isPending && isFetching` — derived flag, subset of `isPending`. Only `true` when both no data AND actively fetching. Rarely needed directly.
  - `isFetching`: Any network request in progress (including background refetch of stale data).
  - **Rule: default to `isPending`** for showing spinners/skeletons. Use `isLoading` only if you need to distinguish "no data, not fetching" (e.g., `enabled: false` with no cache) from "no data, fetching".
  - Avoid `isLoading` as a reflex — it is NOT deprecated but it is a derived convenience flag, not the primary status check.
- **Overriding factory options per-consumer**: Spread the factory result and override:
  ```tsx
  useQuery({
    ...productQueries.detail(id),
    staleTime: 0,           // force fresh for this consumer
    refetchInterval: 5000,  // poll every 5s only here
  });
  ```

---

> Decision rationale: [D-03 — Never copy query data into useState](../decisions/D-03-no-state-duplication.md)
