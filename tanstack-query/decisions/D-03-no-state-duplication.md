# D-03: Never copy query data into useState

**Status**: Adopted
**Date**: 2026-02-06
**Impacts**: [guides/03-use-query.md](../guides/03-use-query.md)

## Context

A common anti-pattern is to sync query data into local React state:

```tsx
const { data } = useQuery(opts);
const [items, setItems] = useState([]);
useEffect(() => { if (data) setItems(data); }, [data]);
```

This pattern appears frequently in codebases migrating from manual fetch + useState to TanStack Query, or when developers want to "edit" the fetched data locally.

## Arguments For (never copy into state)

- **Stale data**: The local state copy won't update when TanStack Query refetches in the background (window focus, reconnect, interval). The user sees outdated data.
- **Double source of truth**: Two places hold the same data. Bugs arise from the question "which one is current?" — the cache or the state?
- **Wasted renders**: The `useEffect` sync triggers an extra render cycle that serves no purpose.
- **TanStack Query already IS the state manager**: The cache is reactive. Components re-render when cache data changes. Adding useState on top is redundant.
- **Select exists for transformations**: If you need a derived or filtered view of the data, use the `select` option (see guide 04) instead of copying + transforming in state.

## Arguments Against (sometimes copy to state)

- **Editable forms**: When the user needs to edit fetched data in a form (controlled inputs), you do need local state for the form values. But this is not "copying query data" — it's initializing a form. The form state and the cache are intentionally divergent until the user submits.
- **Drag-and-drop reordering**: Temporary UI state during interaction may require a local copy. But again, this is ephemeral interaction state, not a persistent copy.

## Verdict

**Never copy query data into `useState` as a way to "hold" the data.**

The two exceptions (form initialization, ephemeral interaction state) are not about syncing with the cache — they're about creating intentionally separate UI state for a specific interaction. The rule is:

- If you need the latest server data → read from query, never copy.
- If you need to let the user modify data before submitting → local form state is fine, but initialize it once (not sync in useEffect).

```tsx
// Form initialization — this is OK
const { data } = useQuery(productQueries.detail(id));
const [formValues, setFormValues] = useState<FormValues | null>(null);

useEffect(() => {
  if (data && !formValues) {
    setFormValues({ name: data.name, price: data.price });
  }
}, [data, formValues]);
```

## References

- [TkDodo — Practical React Query](https://tkdodo.eu/blog/practical-react-query) (section on "Keep server and client state separate")
- [TkDodo — Thinking in React Query](https://tkdodo.eu/blog/thinking-in-react-query) (mental model of cache as state)

## History

- 2026-02-06: Created
