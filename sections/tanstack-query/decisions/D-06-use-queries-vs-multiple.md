# D-06: useQueries vs multiple useQuery calls

**Status**: Adopted
**Date**: 2026-02-06
**Impacts**: [guides/06-use-queries.md](../guides/06-use-queries.md)

## Context

When a component needs data from multiple queries, two approaches exist:

1. **Multiple `useQuery` calls**: Each query gets its own hook call with a named result.
2. **`useQueries`**: A single hook call with an array of query configurations.

## Arguments For (useQueries)

- **Dynamic lists**: When the number of queries depends on runtime data (list of IDs), `useQueries` is the only correct option. You cannot call hooks in a loop.
- **Aggregated loading state**: The `combine` option lets you compute a single `isPending` from all queries.
- **Consistent API**: All queries are managed as a group with a single return value.

## Arguments For (multiple useQuery)

- **Named results**: `const { data: users }` is more readable than `results[0].data`.
- **Independent typing**: Each query result has its own type. No need for type assertions or index-based access.
- **Simpler mental model**: Each query is independent and self-documenting.
- **Selective consumption**: You can pass individual query results to different child components without unpacking an array.

## Verdict

**Use `useQueries` for dynamic (runtime-determined) query lists. Use multiple `useQuery` for fixed, known queries.**

| Situation | Approach |
|-----------|----------|
| List of IDs from props/state → parallel fetch | `useQueries` |
| Dashboard with 3 known widgets | Multiple `useQuery` |
| Comparison page with N selected items | `useQueries` |
| Page needing user + settings + notifications | Multiple `useQuery` |

The decision is purely about dynamism, not about the number of queries. Even 10 known queries are better as separate `useQuery` calls if the set is fixed at build time.

## References

- [TanStack Query v5 docs — Parallel Queries](https://tanstack.com/query/v5/docs/react/guides/parallel-queries)
- [TanStack Query v5 docs — useQueries](https://tanstack.com/query/v5/docs/react/reference/useQueries)

## History

- 2026-02-06: Created
