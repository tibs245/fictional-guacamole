# Dependent Queries

> How to handle queries that depend on an external parameter or on the result of another query.

## Prerequisites

- [02-query-options.md](./02-query-options.md)

## Rules

### Rule 1: Use `enabled` only for nullable external parameters

When a query depends on a parameter that may be `undefined` or `null` (e.g., a function argument, a route param, a context value), use `enabled` to prevent the query from firing until the parameter is available.

#### Correct

```tsx
// userId comes from props/route — it may not be available yet
function useUserDetailsOptions({ userId }: { userId?: string }) {
  return queryOptions({
    ...userQueries.detail(userId!),
    enabled: !!userId,
  });
}
```

#### Incorrect

```tsx
// Don't use enabled to chain two queries — see Rule 2
function useUserOrdersOptions({ userId }: { userId: string }) {
  const { data: user } = useQuery(userQueries.detail(userId));

  return queryOptions({
    ...orderQueries.byUser(user?.organizationId!),
    enabled: !!user?.organizationId, // ❌ dependency on another query
  });
}
```

The problem with `enabled` for inter-query dependencies:

- `isLoading` on the second query is meaningless while the first hasn't resolved.
- `isError` on the first doesn't propagate — the second query stays idle, not in error.
- The component must juggle two separate loading/error states for what is conceptually one operation.
- `enabled` can not work si overwritted

---

### Rule 2: Use `ensureQueryData` / `fetchQueryData` for inter-query dependencies

When query B needs the result of query A, resolve the dependency inside the `queryFn` using `ensureQueryData` or `fetchQueryData`. This keeps the dependency logic in the data layer, not in React.

#### `ensureQueryData` — uses cache if available

```tsx
// ensureQueryData: returns cached data if fresh, fetches only if stale/missing.
// Use this when the dependent data doesn't need to be up-to-date on every refetch.
export const useGetExampleId = () => {
  const queryClient = useQueryClient();

  return async () =>
    (await queryClient.ensureQueryData(getExampleOptions()))[0]?.id;
};
```

#### `fetchQueryData` — always refetches

```tsx
// fetchQueryData: always hits the network, regardless of cache state.
// Use this when you need fresh data on every refetch of the dependent query.
export const useGetExampleId = () => {
  const queryClient = useQueryClient();

  return async () =>
    (await queryClient.fetchQuery(getExampleOptions()))[0]?.id;
};
```

#### Full example

```tsx
export const useOtherExampleDetailsOptions = ({
  ...options
}: Partial<
  Omit<
    DefinedInitialDataOptions<
      Resource<Tenant>,
      unknown,
      Resource<WithRegion<Tenant>>
    >,
    'queryKey' | 'queryFn'
  >
> = {}) => {
  const getExampleId = useGetExampleId();

  return queryOptions({
    queryFn: async () => {
      const exampleId = await getExampleId();
      return getTenantDetails(ExampleId!);
    },
    queryKey: BACKUP_TENANT_DETAILS_QUERY_KEY,
    select: (data): Resource<WithRegion<Tenant>> =>
      mapTenantResourceToTenantResourceWithRegion(data),
    ...options,
  });
};
```

#### Why this is better

- **One `isLoading`** — covers the entire chain.
- **One `isError`** — if any step fails, the query is in error.
- **Ensure `enabled`** — if enabled is overwritten, the dependency is not breaked.
- **No React coupling** — the dependency is resolved in the data layer.
- **Cache-aware** — `ensureQueryData` avoids redundant network calls correctly.

#### `ensureQueryData` vs `fetchQuery` — which one?

Both are valid. The choice depends on your use case:

| | `ensureQueryData` | `fetchQuery` |
|---|---|---|
| **Behavior** | Returns cache if fresh, fetches if stale/missing | Always fetches from network |
| **Use when** | The dependent data is stable and doesn't change often | The dependent data must be fresh on every refetch |
| **Example** | A service ID that rarely changes | A token or session that must be current |

Add a comment above the function to clarify your choice — if someone revisits this later, they should understand why one was picked over the other.

---

### Rule 3: With useSuspenseQuery, sequential queries are natural

In Suspense mode, sequential dependent queries don't need `enabled`. The first query suspends, then the component re-renders with data, then the second query fires and suspends again. Suspense boundaries handle the loading states.

#### Correct

```tsx
function UserOrders({ userId }: { userId: string }) {
  // First render: suspends here until user is loaded
  const { data: user } = useSuspenseQuery(userQueries.detail(userId));

  // Second render: suspends here until orders are loaded
  const { data: orders } = useSuspenseQuery(
    orderQueries.byUser(user.organizationId),
  );

  // Both are guaranteed defined
  return <OrderList user={user} orders={orders} />;
}
```

Note: This creates a waterfall (user fetched, then orders fetched). If you need parallel loading, restructure so both queries can fire independently (see [06-use-queries.md](./06-use-queries.md)).

---

## Edge Cases

- **Multiple dependent levels**: A → B → C chains work the same way. Each level calls `ensureQueryData`/`fetchQuery` inside the `queryFn`. Keep it to 2-3 levels max — deeper chains indicate you may need a dedicated backend endpoint.
- **Circular dependencies**: If A needs B and B needs A, something is wrong with your data model. Refactor the API.
- **Dependent query with prefetch**: You can prefetch the dependent query if you know the dependency value ahead of time:
  ```tsx
  // In a route loader or parent component
  const user = await queryClient.ensureQueryData(userQueries.detail(userId));
  await queryClient.prefetchQuery(orderQueries.byUser(user.organizationId));
  ```

---

> Decision rationale: [D-07 — Dependent queries pattern](../decisions/D-07-dependent-queries-pattern.md)
