# D-08: Invalidation vs setQueryData after mutation

**Status**: Adopted
**Date**: 2026-02-06
**Impacts**: [guides/08-mutations.md](../guides/08-mutations.md)

## Context

After a successful mutation, the cache needs to reflect the new server state. Two approaches:

1. **Invalidation**: Mark queries as stale. They refetch automatically.
2. **setQueryData**: Directly update the cache with the mutation response, no refetch.

## Arguments For (invalidation as default)

- **Always correct**: The refetch gets the true server state. No risk of cache/server mismatch.
- **Simple**: One line of code. No need to know the cache structure or merge logic.
- **Handles side effects**: If the server applies computed fields, triggers, or cascading changes, invalidation picks them all up. setQueryData can't know about server-side effects.
- **Works with lists**: After creating an item, the list needs re-sorting, re-paginating, re-filtering. Invalidation lets the server handle that.

## Arguments For (setQueryData)

- **No extra network request**: The mutation response already contains the updated data. Why refetch?
- **Instant cache update**: No flash of stale data between mutation success and refetch completion.
- **Reduced server load**: One fewer request per mutation.

## Verdict

**Default to invalidation. Use setQueryData only when ALL of these are true:**

1. The mutation response contains the COMPLETE, FINAL state of the entity.
2. No server-side computed fields or side effects that the response doesn't include.
3. The immediate cache update is noticeably better UX than waiting for a refetch.

In practice, invalidation covers 80%+ of cases. The extra network request is usually imperceptible (especially with stale-while-revalidate). setQueryData introduces maintenance burden — you must keep the cache update logic in sync with server changes.

**When using setQueryData, ALSO invalidate** to ensure eventual consistency:

```tsx
onSuccess: (updatedProduct) => {
  // Instant cache update
  queryClient.setQueryData(
    productQueries.detail(updatedProduct.id).queryKey,
    updatedProduct,
  );
  // Still invalidate everything — lists may need re-sorting
  queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
},
```

## References

- [TkDodo — Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query)
- [TanStack Query v5 docs — Invalidation from Mutations](https://tanstack.com/query/v5/docs/react/guides/invalidations-from-mutations)

## History

- 2026-02-06: Created
