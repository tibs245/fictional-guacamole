# D-01: queryOptions() mandatory vs inline options

**Status**: Adopted
**Date**: 2026-02-06
**Impacts**: [guides/02-query-options.md](../guides/02-query-options.md)

## Context

In TanStack Query v5, there are two ways to configure a query:

1. **Inline**: pass a raw object `{ queryKey, queryFn, ... }` directly to `useQuery()`.
2. **queryOptions()**: pass the same object through the `queryOptions()` helper first, then pass the result to any consumer.

The question is whether `queryOptions()` should be mandatory for all queries, or optional for simple cases.

## Arguments For (mandatory queryOptions)

- **Type safety at definition time**: `queryOptions()` validates all property names at compile time. A typo like `stallTime` instead of `staleTime` is caught immediately. Inline objects have no such validation — they're just a plain generic type.
- **Single source of truth**: The queryKey and queryFn live together in one place. Every consumer (useQuery, useSuspenseQuery, useQueries, prefetchQuery, invalidateQueries, getQueryData) references the same object. No risk of key/fn mismatch.
- **Enables the full v5 API surface**: `useSuspenseQuery`, `useQueries`, `queryClient.prefetchQuery`, and `queryClient.ensureQueryData` all accept the same options object. Without `queryOptions()`, you'd need to duplicate key/fn pairs for each usage.
- **Automatic type inference on cache reads**: When you call `queryClient.getQueryData(opts.queryKey)`, the return type is automatically inferred from the queryFn return type. Without queryOptions, you'd need manual generic parameters.
- **Encourages co-location**: The factory pattern (one `*.queries.ts` per feature) emerges naturally. This improves discoverability and reduces scattered query definitions.
- **Consistency**: Every query follows the same pattern. New team members or LLM agents learn one approach, not two.

## Arguments Against (keep inline as option)

- **Overhead for trivial queries**: A query used in exactly one component, with no prefetching or invalidation needed, gains little from a separate factory file.
- **Extra file per feature**: The `*.queries.ts` file is one more file to create and maintain.
- **Learning curve**: Junior developers must learn the factory pattern before writing their first query.

## Verdict

**queryOptions() is mandatory for all queries.**

The "overhead" arguments don't hold up in practice:
- A trivial query today becomes complex tomorrow (add prefetching, add another consumer). Retrofitting the factory pattern later is more expensive than starting with it.
- The extra file is 10-20 lines. It's a feature, not overhead — it forces co-location and discoverability.
- The learning curve is minimal: the factory is just a plain object with methods that return `queryOptions()`.

The type safety and single-source-of-truth benefits are significant and compound as the codebase grows. The consistency benefit is especially important for LLM-assisted development — one pattern to learn, one pattern to generate.

### Sub-decision: Factory structure and QueryClient injection

**Problem 1 — Self-reference**: An object literal cannot reference its own properties during construction. A `detailEnriched` method cannot call `this.all()`.

**Problem 2 — QueryClient access**: Some queryFn need the QueryClient (for `ensureQueryData`, `getQueryData`, etc.), but `queryOptions()` is called outside React components where `useQueryClient()` is unavailable.

**Solution**: Define factory methods as standalone functions (solving self-reference), then assemble them into the exported object. For methods needing QueryClient, use a `withClient(queryClient)` curried function that returns an object of client-dependent methods.

**Why currying over other approaches**:
- **vs. parameter per method** (`detail(id, queryClient)`): Currying avoids passing `queryClient` to every call — inject once, use many.
- **vs. custom hooks** (`useProductDetail(id)`): Hooks hide the queryOptions object, making it impossible to reuse for `prefetchQuery`, `invalidateQueries`, etc. outside components.
- **vs. singleton import** (`import { queryClient }`): Breaks testability and prevents multiple QueryClient contexts.

## References

- [TkDodo — The Query Options API](https://tkdodo.eu/blog/the-query-options-api)
- [TanStack Query v5 docs — Query Options](https://tanstack.com/query/v5/docs/react/guides/query-options)
- [TkDodo — Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys) (factory pattern origin)

## History

- 2026-02-06: Created
- 2026-02-06: Added sub-decision on factory structure and `withClient()` currying pattern
