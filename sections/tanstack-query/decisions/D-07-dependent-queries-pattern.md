# D-07: Dependent queries pattern

**Status**: Adopted
**Date**: 2026-02-06
**Updated**: 2026-02-09
**Impacts**: [guides/07-dependent-queries.md](../guides/07-dependent-queries.md)

## Context

When fetching data that has a dependency (e.g., fetch a service ID, then fetch tenant details using that ID), there are three approaches:

1. **`enabled` chaining**: Two separate queries in the component, query B disabled until query A resolves.
2. **`ensureQueryData` / `fetchQuery` in queryFn**: Query B resolves its dependency on A inside its own `queryFn`, using the queryClient.
3. **Single queryFn**: One cache entry that fetches both sequentially inside a single function.

## Decision

### `enabled` — only for nullable external parameters

`enabled` is the right tool when a query depends on a parameter that may not exist yet (route param, prop, context value). It is NOT the right tool for chaining two queries.

**Problems with `enabled` for inter-query dependencies:**

- `isPending` on the second query has no meaning while the first hasn't resolved — it stays `true` but the query hasn't even started.
- `isError` on the first query doesn't propagate to the second — the second stays idle, giving the component no unified error state.
- The component must manage two separate loading/error lifecycles for what is conceptually one data need.
- It couples React rendering logic to data-fetching orchestration.

### `ensureQueryData` / `fetchQuery` — default for inter-query dependencies

When query B needs the result of query A, resolve the dependency inside B's `queryFn`:

- **`ensureQueryData`**: Returns cached data if fresh, fetches only if stale or missing. Use when the dependent data is stable (e.g., a service ID that rarely changes).
- **`fetchQuery`**: Always fetches from the network. Use when the dependent data must be current on every refetch (e.g., a token or session).

**Benefits:**

- One `isPending`, one `isError` — the component sees a single query lifecycle.
- No React coupling — the dependency is resolved in the data layer.
- Cache-aware — `ensureQueryData` avoids redundant network calls.
- Cleaner component code — no `enabled` juggling, no intermediate `undefined` checks.

**Trade-off:** The dependent data (query A) is resolved inside queryFn, so it's not a separate cache entry that auto-refetches on its own schedule. This is intentional — use `ensureQueryData` when the cache is good enough, `fetchQuery` when freshness matters. Add a comment above the function to explain the choice for future readers.

### Single queryFn — only when data is truly inseparable

Use a single queryFn only when the data passes the "inseparable test":

- Would you EVER display one without the other? → Separate.
- Would you EVER invalidate one without the other? → Separate.
- Would you EVER use one in a different component? → Separate.

If "no" to all three, a single queryFn is acceptable.

## Summary

| Situation | Approach |
|---|---|
| Parameter may be `undefined` (prop, route param) | `enabled: !!param` |
| Query B needs result of query A, cache is fine | `ensureQueryData` in queryFn |
| Query B needs result of query A, must be fresh | `fetchQuery` in queryFn |
| Data always consumed together, never apart | Single queryFn |

## References

- [TanStack Query v5 docs — Dependent Queries](https://tanstack.com/query/v5/docs/react/guides/dependent-queries)
- [TkDodo — Practical React Query](https://tkdodo.eu/blog/practical-react-query)

## History

- 2026-02-06: Created — recommended `enabled` chaining as default
- 2026-02-09: Revised — `enabled` restricted to nullable external params, `ensureQueryData`/`fetchQuery` as default for inter-query dependencies
