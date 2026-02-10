# D-02: Centralized queryKeys.ts vs co-located keys in queryOptions factories

**Status**: Adopted
**Date**: 2026-02-06
**Impacts**: [guides/01-query-keys.md](../guides/01-query-keys.md), [guides/02-query-options.md](../guides/02-query-options.md)

## Context

Query keys need to be consistent and accessible for both query definitions and cache operations (invalidation, prefetching, reading). Two patterns exist:

1. **Centralized `queryKeys.ts`**: A single file per app/module at `/src/data/queryKeys.ts` exports all key factories. Query options files import from it.
2. **Co-located in queryOptions factories**: Keys are defined inside the `queryOptions()` calls within each feature's `*.queries.ts`. Consumers access keys via `factory.method().queryKey`.

## Arguments For (centralized queryKeys.ts)

- **Global visibility**: One file shows ALL cache keys in the project. You can immediately see every domain entity, every scope, and spot naming conflicts or overlaps.
- **Separation of concerns**: Keys define the cache STRUCTURE (what is cached and how it's organized). QueryFn defines the cache BEHAVIOR (how data is fetched). These are different responsibilities.
- **Self-referencing hierarchy**: The `queryKeys` object can reference itself (`queryKeys.products.all` inside `queryKeys.products.list()`), creating a true hierarchical tree where each level builds on the root. This guarantees structural consistency. An object literal defining queryOptions cannot reference its own properties during construction.
- **Invalidation without queryOptions**: When invalidating after a mutation, you only need the key — not the queryFn. Importing `queryKeys.products.all` is lighter and clearer than importing the full queryOptions factory just to access `.queryKey`.
- **Established convention**: The pattern from TkDodo's "Effective React Query Keys" article is widely adopted and proven at scale.

## Arguments Against (centralized — trade-offs accepted)

- **Drift risk**: Keys are defined in one file, queryFn in another. A rename or restructure requires updating both. Mitigated by TypeScript — if a key shape changes, queryOptions using it will fail to compile.
- **Type inference gap**: `queryOptions()` infers the return type of queryFn and associates it with the key. A standalone key factory has no knowledge of what data each key represents. Cache reads (`getQueryData`) require a manual generic parameter.
- **Extra indirection**: Developers must look in two files (queryKeys.ts + feature.queries.ts) instead of one.

## Arguments For (co-located — pattern NOT chosen)

- **Single source of truth**: Key and queryFn defined together — no mismatch possible.
- **`queryOptions()` type inference**: Return type of queryFn flows automatically to cache reads.
- **One file per feature**: No separate keys file to maintain.

## Verdict

**Centralize keys in `/src/data/queryKeys.ts`.**

The self-referencing hierarchy is the deciding factor. Each level spreads from its parent:

```tsx
// as const only on the outer object — not on each line
export const queryKeys = {
  products: {
    all: ['products'],
    list: (filters) => [...queryKeys.products.all, 'list', { filters }],
    detail: (id) => [...queryKeys.products.all, 'detail', id],
  },
} as const;
```

This pattern is impossible with co-located keys inside an object literal (the object cannot reference itself during construction). While standalone functions assembled into a factory can solve the self-reference problem, it sacrifices the global visibility that a single centralized file provides.

The drift risk is acceptable because TypeScript catches mismatches at compile time. The type inference trade-off is minor — manual generics on `getQueryData` are a small price for the structural guarantees of centralized keys.

## References

- [TkDodo — Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys) (original factory pattern)
- [TanStack Query v5 docs — Query Keys](https://tanstack.com/query/v5/docs/react/guides/query-keys)

## History

- 2026-02-06: Created — adopted centralized pattern over co-located
- 2026-02-10: Updated `as const` examples — single `as const` on the outer object only (see D-12)
