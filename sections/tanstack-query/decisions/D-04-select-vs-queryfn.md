# D-04: select vs queryFn transformation

**Status**: Adopted
**Date**: 2026-02-06
**Impacts**: [guides/04-select.md](../guides/04-select.md)

## Context

Fetched data often needs to be transformed before use in components. Two approaches exist:

1. **Transform in queryFn**: Normalize or reshape data inside the query function. All consumers see the transformed shape.
2. **Transform in select**: Apply per-consumer transformations that don't affect the cache.

The question is when to use which.

## Arguments For (queryFn for universal transforms)

- **Single normalization point**: If the API returns `{ data: { items: [...] } }` and every consumer just needs the items array, unwrap it once in queryFn. No consumer should know about the raw API shape.
- **Cache stores the useful shape**: The cache contains already-normalized data, making `getQueryData` reads and optimistic updates simpler.
- **No repeated work**: The transformation runs once per fetch, not once per consumer per render.

## Arguments For (select for per-component transforms)

- **Re-render optimization**: Components using `select` only re-render when their selected slice changes, not when any field in the cached data changes.
- **Multiple views of same data**: A list component needs full items, a counter needs `.length`, a summary needs `.slice(0, 5)`. Each component selects its own view from one shared cache entry.
- **Cache stays complete**: The full data is in cache for any consumer that needs it. Select doesn't discard information.
- **Composable**: Small selector functions can be composed and tested independently.

## Verdict

**Use both, for different purposes:**

| Situation | Approach |
|-----------|----------|
| API response normalization (unwrapping, field renaming) | queryFn |
| Every consumer needs the exact same transformation | queryFn |
| Different components need different views of the same data | select |
| Filtering, sorting, counting, slicing for a specific component | select |

**Decision rule**: If you'd put the transformation in every consumer's select, it belongs in queryFn. If only some consumers need it, use select.

### Sub-decision: Curried selectors vs useCallback

**Problem**: When a selector depends on an external value (prop, ID, filter), the function reference changes on every render, causing TanStack Query to re-run the selector unnecessarily. Two patterns exist to maintain referential stability.

**Option A — Curried function outside the component** (chosen):
```tsx
const selectByCategory = (categoryId: string) => (products: Product[]) =>
  products.filter((p) => p.categoryId === categoryId);
```

**Option B — useCallback inside the component**:
```tsx
const selectByCategory = useCallback(
  (products: Product[]) => products.filter((p) => p.categoryId === categoryId),
  [categoryId],
);
```

**Why currying wins**:
- **Testability**: Pure function, no React test harness needed. `selectByCategory('cat-1')(mockProducts)` works in a unit test.
- **Reusability**: Can be imported and used in any component, hook, or utility — not tied to a specific component's scope.
- **Composability**: Curried selectors compose naturally (`pipe(selectByCategory(id), selectActive)`).
- **No hook dependency**: `useCallback` is a React hook with its own rules and gotchas (stale closures, deps arrays). Currying has none of that.

**When useCallback is acceptable**: Truly one-off selectors with component-local logic that will never be reused. This should be rare — if it's worth parameterizing, it's worth extracting.

### Sub-decision: Where to store selectors

**Problem**: Selectors are a transformation layer between cache data and UI needs. Where should they live?

**Option A — Dedicated `*.selectors.ts` per feature** (chosen):
```
src/features/products/
├── products.queries.ts
├── products.selectors.ts    ← here
└── components/
```

**Option B — Inside `*.queries.ts`**: Mixes cache definition (what to fetch, how) with UI concerns (how to derive component views). Violates separation of concerns.

**Option C — Inside components**: Selectors become untestable, unreusable, and invisible to other developers.

**Why a dedicated file wins**:
- **Separation of concerns**: Queries define cache behavior (fetch, key, stale time). Selectors define UI projections (filter, map, count). Different responsibilities → different files.
- **Discoverability**: A developer looking for "how do I filter products by category?" finds it in `products.selectors.ts`, not buried in a component.
- **Testability**: The file is a collection of pure functions — trivial to unit test with no React setup.
- **Composability**: Selectors can import and compose other selectors from the same file.

**Inlining threshold**: A trivial one-liner selector used in a single component (e.g., `select: (p) => p.name`) can stay inline. If it has parameters, is reused, or involves more than a single property access — extract it.

## References

- [TkDodo — React Query Data Transformations](https://tkdodo.eu/blog/react-query-data-transformations)
- [TkDodo — React Query Render Optimizations](https://tkdodo.eu/blog/react-query-render-optimizations)
- [TanStack Query v5 docs — select](https://tanstack.com/query/v5/docs/react/guides/render-optimizations)

## History

- 2026-02-06: Created
- 2026-02-06: Added sub-decisions on curried selectors vs `useCallback` and selector file location
