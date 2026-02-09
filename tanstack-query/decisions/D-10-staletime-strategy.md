# D-10: staleTime default and cache strategy

**Status**: Adopted
**Date**: 2026-02-06
**Impacts**: [guides/09-query-client-setup.md](../guides/09-query-client-setup.md)

## Context

TanStack Query's default `staleTime` is `0` — data is stale immediately after fetching. This means every component mount, window focus, and network reconnect triggers a refetch. The question is whether to keep this default or set a higher global value.

## Arguments For (staleTime: 0 — the library default)

- **Always fresh data**: Every interaction gets the latest server state. No risk of displaying outdated information.
- **Simple mental model**: Data is always refetched when needed. No guessing about freshness.
- **Good for real-time apps**: Chat, notifications, live dashboards benefit from aggressive refetching.

## Arguments Against (staleTime: 0)

- **Excessive requests**: A component that mounts 5 times during navigation triggers 5 identical requests. This wastes bandwidth and server resources.
- **Perceived slowness**: Even though stale data is shown instantly (stale-while-revalidate), the background refetch adds network chatter and potential UI flicker when data changes.
- **Most data doesn't change that fast**: Product catalogs, user profiles, configuration — this data changes on the order of minutes or hours, not milliseconds.
- **Server load at scale**: In an application with hundreds of active queries, `staleTime: 0` means hundreds of refetches on every window focus.

## Verdict

**Set a global staleTime of 5 minutes. Override per-query based on data volatility.**

| Data type | Recommended staleTime |
|-----------|----------------------|
| Real-time (notifications, chat) | 0 or `refetchInterval` |
| Frequently changing (order status) | 30 seconds – 1 minute |
| Standard (product lists, user data) | 5 minutes (global default) |
| Rarely changing (settings, config) | 30 minutes – 1 hour |
| Static reference data (countries, currencies) | `Infinity` |

The override happens at the queryOptions level, not at the consumer level:

```tsx
export const configQueries = {
  countries: () =>
    queryOptions({
      queryKey: ['config', 'countries'],
      queryFn: fetchCountries,
      staleTime: Infinity, // never refetch — data doesn't change
    }),
};
```

This gives each feature control over its own freshness requirements while keeping a sensible default for everything else.

## References

- [TkDodo — Practical React Query](https://tkdodo.eu/blog/practical-react-query) (staleTime section)
- [TkDodo — Thinking in React Query](https://tkdodo.eu/blog/thinking-in-react-query) (mental model)
- [TanStack Query v5 docs — Important Defaults](https://tanstack.com/query/v5/docs/react/guides/important-defaults)

## History

- 2026-02-06: Created
