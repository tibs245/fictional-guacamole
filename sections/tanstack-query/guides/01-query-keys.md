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

### Rule 2: Keys are always arrays, typed with `as const` on the outer object

Never use a string as a query key. Always use an array. Apply `as const` **once on the outer `queryKeys` object declaration** — TypeScript strict mode infers all nested properties as deeply readonly. Do not add `as const` on each individual line inside the object.

#### Correct

```tsx
queryKey: ['products']
queryKey: ['products', 'detail', id]
```

#### Incorrect

```tsx
queryKey: 'products'                    // string — breaks hierarchy
queryKey: `products-detail-${id}`       // string interpolation — no hierarchy
```

---

### Rule 3: Hierarchical structure with self-referencing factory

Keys follow a consistent pattern: `[feature]` → `[feature, scope, params]`. Each level builds on `all` using spread syntax. The factory object references itself to build the hierarchy.

Prefer a flat structure: `all` is the root prefix, used both as a `queryKey` in `queryOptions` (fetch everything, no pagination) and as the invalidation target. `list` and `detail` spread from `all`. Do not add intermediate scope functions (`lists()`, `details()`) — they add indirection without practical benefit. Invalidating `all` is simpler, safer, and not costly.

#### Correct

```tsx
// /src/data/queryKeys.ts
export const queryKeys = {
  products: {
    all: ['products'],
    list: (filters: ProductFilters) =>
      [...queryKeys.products.all, 'list', { filters }],
    detail: (id: string) => [...queryKeys.products.all, 'detail', id],
  },
  orders: {
    all: ['orders'],
    list: (filters: OrderFilters) =>
      [...queryKeys.orders.all, 'list', { filters }],
    detail: (id: string) => [...queryKeys.orders.all, 'detail', id],
  },
} as const;
```

Key points:
- `all` is a plain array (broadest level) — used as `queryKey` for "get everything" (no pagination) and as prefix for invalidation
- `list(filters)` is for paginated / filtered collections — only when you need filters
- `detail(id)` is for single entity by identifier
- Each level spreads from `all` — the hierarchy is always consistent
- The naming in `queryKeys` mirrors the naming in `queryOptions` factories: `all` → `all`, `list` → `list`, `detail` → `detail`

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

// Invalidate EVERYTHING about products (all + lists + details) — preferred default
queryClient.invalidateQueries({ queryKey: queryKeys.products.all });

// Invalidate one specific filtered list
queryClient.invalidateQueries({
  queryKey: queryKeys.products.list({ status: 'active' }),
});

// Invalidate one specific product detail
queryClient.invalidateQueries({
  queryKey: queryKeys.products.detail('42'),
});
```

**Prefer broad invalidation**: After a mutation, invalidate `all` rather than trying to target only lists or only details. Over-invalidating is safe, cheap, and avoids subtle stale-data bugs. Narrow invalidation (targeting a specific `list(filters)` or `detail(id)`) is only useful when you know exactly which cache entry changed.

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

## Query key vocabulary — standard keywords

Use these keywords consistently across all `queryKeys` entries. Never invent ad-hoc names like `byId`, `byResource`, `byUser`, or `listByCategory`.

| Keyword | Type | Description | Example key |
|---------|------|-------------|-------------|
| `all` | `readonly array` | Everything for a feature — no pagination. Used as `queryKey` in `queryOptions` AND as prefix for invalidation. | `['products']` |
| `list` | `(filters) => array` | Paginated or filtered collection. Only when filters/pagination are needed. | `['products', 'list', { status: 'active' }]` |
| `detail` | `(id) => array` | Single entity by identifier. **Never** use `byId`, `byResource`, or `byUser`. | `['products', 'detail', '42']` |
| `search` | `(query) => array` | Text search queries. | `['products', 'search', 'laptop']` |

### `all` vs `list` — when to use which

- **`all`**: Use when fetching the full collection without pagination (e.g., a dropdown, a short reference list). The `queryOptions` factory exposes `productQueries.all()` which uses `queryKeys.products.all` directly.
- **`list(filters)`**: Use when the collection is paginated or filtered (e.g., a table with page/status params). Requires filters.

### Rules

- `all` is always a **plain array** (not a function) — it serves a dual role: `queryKey` for "get everything" and root prefix for invalidation.
- `list(filters)` / `detail(id)` / `search(query)` spread from `all` — no intermediate scope functions needed.
- **Invalidate with `all`** after mutations. Since all keys start with `all`, this invalidates everything (including `list` and `detail` queries). It is cheap and avoids missing stale entries.
- The naming in `queryKeys` mirrors the naming in `queryOptions` factories: `all` → `all`, `list` → `list`, `detail` → `detail`.
- When you need orders for a specific user, model it as `orderQueries.detail(userId)` or `orderQueries.list({ userId })` depending on whether the result is a single entity or a filtered collection. Never create a `byUser` variant.

---

> Decision rationale: [D-02 — Centralized queryKeys.ts vs co-located keys](../decisions/D-02-query-keys-colocation.md)
