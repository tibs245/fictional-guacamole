# D-09: When optimistic updates are worth it

**Status**: Adopted
**Date**: 2026-02-06
**Impacts**: [guides/08-mutations.md](../guides/08-mutations.md)

## Context

Optimistic updates apply changes to the cache immediately before the server confirms. If the server rejects the change, the cache rolls back to the previous state. This gives the user instant feedback but adds significant complexity (snapshot, rollback, concurrent mutation handling).

## Arguments For (use optimistic updates)

- **Instant feedback**: The UI reflects the change immediately. No spinner, no delay.
- **Perceived performance**: The app feels faster even if the actual mutation takes time.
- **Critical for certain UX patterns**: Toggle switches, drag-and-drop reordering, like buttons — these interactions feel broken with a loading delay.

## Arguments Against (skip optimistic updates)

- **Complexity**: The onMutate/onError/onSettled pattern is ~20 lines of boilerplate per mutation. Snapshot, cancel, update, rollback, invalidate.
- **Rollback is jarring**: If the mutation fails, the UI snaps back to the old state. This is confusing for the user, especially if they've already scrolled away.
- **Concurrent mutations**: Multiple optimistic updates on the same data can conflict. Requires `isMutating()` checks and careful invalidation timing.
- **Server-computed fields**: If the server modifies the data (timestamps, computed totals), the optimistic cache will be wrong until the invalidation refetch.
- **Testing burden**: Optimistic updates need testing for success, failure, and concurrent scenarios.

## Verdict

**Don't use optimistic updates by default. Reserve them for interactions where the delay is perceptible AND the user expectation is immediate:**

| Interaction | Optimistic? | Why |
|-------------|-------------|-----|
| Toggle (active/inactive) | Yes | Sub-second expectation, binary state |
| Like/favorite button | Yes | Instant feedback is standard UX |
| Form submission (create) | No | Users expect a brief loading state for forms |
| Delete with confirmation | No | The confirmation dialog already adds delay |
| Drag-and-drop reorder | Yes | Must feel instant to be usable |
| Text field update | No | Use debounced mutation, not optimistic |
| Bulk operations | No | Users expect bulk ops to take time |

**Rule of thumb**: If the mutation is triggered by a single click/tap and the user expects the result to be reflected within ~100ms, use optimistic updates. Otherwise, a loading state is fine.

## References

- [TkDodo — Mastering Mutations in React Query](https://tkdodo.eu/blog/mastering-mutations-in-react-query) (optimistic updates section)
- [TkDodo — Concurrent Optimistic Updates](https://tkdodo.eu/blog/concurrent-optimistic-updates-in-react-query)
- [TanStack Query v5 docs — Optimistic Updates](https://tanstack.com/query/v5/docs/react/guides/optimistic-updates)

## History

- 2026-02-06: Created
