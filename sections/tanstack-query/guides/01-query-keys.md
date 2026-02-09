# Query Keys

> How to declare and structure query keys in a centralized `queryKeys.ts` file. This is the foundation — query options depend on it.

## Prerequisites

None — this is the first file to create in a feature.

## Rules

### Rule 1: One centralized `queryKeys.ts` per app or module

All query keys for an app or module live in a single file at `/src/data/queryKeys.ts`. This file is the registry of your entire cache structure.

#### Correct

```
src/
  data/
    queryKeys.ts          ← all query keys for this app/module
  features/
    products/
      products.queries.ts ← query options import keys from queryKeys.ts
      ProductList.tsx
    orders/
      orders.queries.ts
```

#### Incorrect

```
src/
  features/
    products/
      products.keys.ts   ← keys scattered per feature, no global view
    orders/
      orders.keys.ts
```

---

### Rule 2: Keys are always arrays, typed with `as const`

Never use a string as a query key. Always use an array. Use `as const` for type safety — this gives you readonly tuple types instead of `string[]`.

#### Correct

```tsx
queryKey: ['products'] as const
queryKey: ['products', 'detail', id] as const
```

#### Incorrect

```tsx
queryKey: 'products'                    // string — breaks hierarchy
queryKey: `products-detail-${id}`       // string interpolation — no hierarchy
queryKey: ['products', 'detail', id]    // missing as const — loses type precision
```

---

### Rule 3: Hierarchical structure with self-referencing factory

Keys follow a consistent pattern: `[feature]` → `[feature, scope]` → `[feature, scope, params]`. Each level builds on the previous one using spread syntax. The factory object references itself to build the hierarchy.

#### Correct

```tsx
// /src/data/queryKeys.ts
export const queryKeys = {
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (filters: ProductFilters) =>
      [...queryKeys.products.lists(), { filters }] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (filters: OrderFilters) =>
      [...queryKeys.orders.lists(), { filters }] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
  },
} as const;
```

Key points:
- `all` is a plain array (broadest level) — not a function
- `lists()` and `details()` are scope-level functions (no params)
- `list(filters)` and `detail(id)` are param-level functions
- Each level spreads from its parent — the hierarchy is always consistent

#### Incorrect

```tsx
// Flat keys — no hierarchy, can't invalidate by scope
export const KEYS = {
  productList: ['product-list'],
  productDetail: (id: string) => ['product-detail', id],
};

// Keys that don't build on each other — manual, error-prone
export const queryKeys = {
  products: {
    all: ['products'],
    list: (filters) => ['products', 'list', { filters }],  // not spreading from all
    detail: (id) => ['products', 'detail', id],             // not spreading from all
  },
};
```

---

### Rule 4: Invalidation uses prefix matching

`invalidateQueries` matches all queries whose key STARTS WITH the provided key. The hierarchy enables granular invalidation at any level.

#### Examples

```tsx
import { queryKeys } from '@/data/queryKeys';

// Invalidate EVERYTHING about products (lists, details, all)
queryClient.invalidateQueries({ queryKey: queryKeys.products.all });

// Invalidate all product lists (but not details)
queryClient.invalidateQueries({ queryKey: queryKeys.products.lists() });

// Invalidate one specific filtered list
queryClient.invalidateQueries({
  queryKey: queryKeys.products.list({ status: 'active' }),
});

// Invalidate one specific product detail
queryClient.invalidateQueries({
  queryKey: queryKeys.products.detail('42'),
});
```

---

### Rule 5: Never put unstable references in keys

Query keys are compared by deep equality. If you pass an object that is recreated on every render, it creates a new query entry each time.

#### Correct

```tsx
// Primitive values — stable
queryKeys.products.list({ status, page })

// Or use useMemo for complex derived filter objects
const filters = useMemo(() => ({ status, page }), [status, page]);
queryKeys.products.list(filters)
```

#### Incorrect

```tsx
// New unstable value every render — infinite cache entries
queryKeys.products.list({ status, page, timestamp: Date.now() })
```

---

## Edge Cases

- **Objects in keys are compared by value, not reference**: `{ status: 'active' }` will match another `{ status: 'active' }` even if they're different objects. TanStack Query uses deep equality.
- **Array order matters**: `['products', 'detail', id]` is NOT the same key as `['products', id, 'detail']`.
- **Undefined values**: Avoid `undefined` in keys. If a parameter can be absent, use `enabled: false` on the query instead of putting `undefined` in the key.
- **Adding a new feature**: Add a new top-level entry in `queryKeys`. Keep one entry per domain entity.

---

> Decision rationale: [D-02 — Centralized queryKeys.ts vs co-located keys](../decisions/D-02-query-keys-colocation.md)
