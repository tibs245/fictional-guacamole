# Query Options

> How to declare query configurations using the `queryOptions()` helper and the factory pattern.

## Prerequisites

- [01-query-keys.md](./01-query-keys.md) — query keys must be defined first in `/src/data/queryKeys.ts`

## Rules

### Rule 1: Always use `queryOptions()`, never inline options

Every query configuration must go through the `queryOptions()` helper from `@tanstack/react-query`. Never pass raw objects directly to `useQuery`, `useSuspenseQuery`, or any other consumer.

#### Correct

```tsx
import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/data/queryKeys';

export const productQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: queryKeys.products.detail(id),
      queryFn: () => fetchProduct(id),
      staleTime: 5 * 60 * 1000,
    }),
};
```

#### Incorrect

```tsx
// Inline options — no reusability, no type safety on typos
useQuery({
  queryKey: ['products', 'detail', id],  // hardcoded key — not from queryKeys.ts
  queryFn: () => fetchProduct(id),
  stallTime: 5 * 60 * 1000, // typo not caught!
});
```

---

### Rule 2: One `*.queries.ts` file per feature

Each feature (or domain entity) gets its own queries file. This file exports a single factory object containing all query configurations for that feature.

#### Correct

```
src/
  data/
    queryKeys.ts             ← centralized keys (see 01-query-keys.md)
  features/
    products/
      products.queries.ts    ← query options importing keys from queryKeys.ts
      ProductList.tsx
      ProductDetail.tsx
    orders/
      orders.queries.ts      ← query options importing keys from queryKeys.ts
      OrderList.tsx
```

#### Incorrect

```
src/
  queries/
    allQueries.ts    ← one giant file for everything
```

---

### Rule 3: Factory pattern with hierarchical methods

The factory object exposes methods organized from broad to specific. Each method returns a `queryOptions()` call. Define methods as standalone functions, then assemble them in the exported factory object. This allows methods to reference each other (which an object literal cannot do with its own properties).

#### Correct

```tsx
// products.queries.ts
import { queryOptions } from '@tanstack/react-query';
import { queryKeys } from '@/data/queryKeys';
import { fetchProducts, fetchProduct, searchProducts } from './products.api';

// ─── Standalone functions (can reference each other) ───

const all = () =>
  queryOptions({
    queryKey: queryKeys.products.all,
    queryFn: fetchProducts,
  });

const list = (filters: ProductFilters) =>
  queryOptions({
    queryKey: queryKeys.products.list(filters),
    queryFn: () => fetchProducts(filters),
  });

const detail = (id: string) =>
  queryOptions({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => fetchProduct(id),
    staleTime: 5 * 60 * 1000,
  });

const search = (query: string) =>
  queryOptions({
    queryKey: queryKeys.products.search(query),
    queryFn: () => searchProducts(query),
    staleTime: 30 * 1000,
  });

// ─── Factory assembles everything ───

export const productQueries = { all, list, detail, search };
```

#### Incorrect

```tsx
// Object literal — methods CANNOT reference each other
export const productQueries = {
  all: () => queryOptions({ ... }),
  detailEnriched: (id: string) =>
    queryOptions({
      queryFn: async () => {
        // ERROR: `this` is not the object, and `productQueries` is not yet defined
        const products = queryClient.ensureQueryData(this.all());
      },
    }),
};
```

---

### Rule 4: Use `withClient()` for queries that need QueryClient

When a queryFn needs the QueryClient (e.g., to read cache, ensureQueryData, or compose with other queries), use a `withClient()` curried function. This injects the QueryClient once and exposes all client-dependent methods.

Base methods (no QueryClient needed) stay at the top level for direct use in invalidation, prefetching, etc.

#### Correct

```tsx
// products.queries.ts
import { queryOptions, QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/data/queryKeys';

// ─── Base queries (no QueryClient needed) ───

const all = () =>
  queryOptions({
    queryKey: queryKeys.products.all,
    queryFn: fetchProducts,
  });

const detail = (id: string) =>
  queryOptions({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => fetchProduct(id),
  });

// ─── Queries needing QueryClient ───

const withClient = (queryClient: QueryClient) => ({
  getFirst: () =>
    queryOptions({
      queryKey: [...queryKeys.products.all, 'first'] as const,
      queryFn: async () => {
        const [firstProduct] = await queryClient.ensureQueryData(all());
        return firstProduct;
      },
    }),
});

// ─── Factory ───

export const productQueries = { all, detail, withClient };
```

```tsx
// In a component — inject queryClient once via currying
function FeaturedProduct() {
  const queryClient = useQueryClient();
  const pq = productQueries.withClient(queryClient);

  const { data } = useQuery(pq.getFirst());

  return <ProductCard product={data} />;
}

// Outside components — base methods work without queryClient
queryClient.invalidateQueries({ queryKey: productQueries.all().queryKey });
queryClient.prefetchQuery(productQueries.detail(id));
```

#### Incorrect

```tsx
// Importing a singleton queryClient — breaks testability
import { queryClient } from './queryClient';

const getFirst = () =>
  queryOptions({
    queryFn: async () => {
      const products = await queryClient.ensureQueryData(all()); // singleton!
      return products[0];
    },
  });

// Creating a custom hook — hides queryOptions, can't be used for prefetch
function usegetFirstProduct() {
  const queryClient = useQueryClient();
  return useQuery(/* ... */); // not reusable outside a component
}
```

---

### Rule 5: Consume queryOptions everywhere — same object, multiple consumers

The same factory methods are used across `useQuery`, `useSuspenseQuery`, `useQueries`, `prefetchQuery`, `invalidateQueries`, and `getQueryData`. This is the core benefit of the pattern.

#### Correct

```tsx
import { productQueries } from './products.queries';
import { queryKeys } from '@/data/queryKeys';

// In a component — base methods
const { data } = useQuery(productQueries.detail(id));

// In a Suspense component
const { data } = useSuspenseQuery(productQueries.detail(id));

// Parallel queries
const results = useQueries({
  queries: ids.map((id) => productQueries.detail(id)),
});

// In a component — client-dependent methods
const queryClient = useQueryClient();
const pq = productQueries.withClient(queryClient);
const { data } = useQuery(pq.getFirst());

// Prefetching (e.g., on hover or in a route loader)
queryClient.prefetchQuery(productQueries.detail(id));

// Invalidation after mutation — use queryKeys directly, no need to import the full factory
queryClient.invalidateQueries({ queryKey: queryKeys.products.all });

// Reading cache
const cached = queryClient.getQueryData(queryKeys.products.detail(id));
```

#### Incorrect

```tsx
// Hardcoded key strings — not from queryKeys.ts
queryClient.invalidateQueries({ queryKey: ['products'] }); // fragile, no type safety

// Duplicating queryFn inline
const { data } = useQuery({
  queryKey: queryKeys.products.detail(id),
  queryFn: () => fetchProduct(id), // should use productQueries.detail(id) instead
});
```

---

## Edge Cases

- **One-off queries that seem too simple for a factory**: Still use `queryOptions()` in a factory. Consistency across the codebase outweighs the minor overhead of one extra file. A "simple" query today often grows tomorrow.
- **Queries shared across features**: Create the factory in the feature that "owns" the data. Other features import from there. Never duplicate.
- **Dynamic staleTime per consumer**: Override at the consumer level by spreading the factory result:
  ```tsx
  useQuery({
    ...productQueries.detail(id),
    staleTime: 0, // force fresh for this specific use case
  });
  ```
- **No methods need queryClient**: Skip `withClient()` entirely. Only add it when the getFirst client-dependent query appears.
- **Memoizing `withClient()`**: The curried object is cheap to create (just closures). No need to memoize with `useMemo` unless profiling shows otherwise.

---

> Decision rationale: [D-01 — queryOptions() mandatory vs inline](../decisions/D-01-query-options-mandatory.md)
