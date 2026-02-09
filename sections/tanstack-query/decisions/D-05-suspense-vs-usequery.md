# D-05: useSuspenseQuery default vs useQuery default

**Status**: Adopted
**Date**: 2026-02-06
**Impacts**: [guides/05-use-suspense-query.md](../guides/05-use-suspense-query.md)

## Context

TanStack Query v5 offers two primary hooks for fetching data:

1. **useQuery**: Returns `{ data, isPending, error }`. The component handles all states.
2. **useSuspenseQuery**: Suspends during loading, throws to Error Boundary on error. `data` is always defined.

The question: which should be the default recommendation for new code?

## Arguments For (useSuspenseQuery as default)

- **Simpler component code**: No loading/error state handling. The component only renders the success case.
- **Type safety**: `data` is `T`, not `T | undefined`. No optional chaining, no null checks, no `if (!data)` guards.
- **Idiomatic React**: Suspense is React's recommended pattern for async operations. The React team actively promotes this model.
- **Centralized error handling**: Error Boundaries catch errors from multiple queries in a subtree. No need to repeat error UI in every component.
- **Composable loading states**: Suspense boundaries can be placed at any level in the tree — page-level skeleton, section-level spinner, or component-level placeholder.

## Arguments Against (useQuery as default)

- **Requires boundary setup**: Every Suspense component needs a `<Suspense>` + `<ErrorBoundary>` wrapper in a parent. Extra boilerplate if the project doesn't already use these patterns.
- **No `enabled` option**: Conditional queries must be handled by parent components. This can force component tree restructuring.
- **Waterfall risk**: Sequential `useSuspenseQuery` calls in one component create a waterfall. useQuery fires all queries in parallel by default.
- **Legacy compatibility**: Existing codebases using useQuery would need migration. Mixing both patterns in one project may confuse the team.
- **Less control over loading states**: With useQuery, you can show stale data while refetching. With Suspense, the boundary controls what's shown during loading.

## Verdict

**Both hooks are valid. Choose based on the component's context:**

| Situation | Recommended hook |
|-----------|-----------------|
| New feature with Suspense architecture already in place | `useSuspenseQuery` |
| Component needs conditional fetching (`enabled`) | `useQuery` |
| Existing feature using useQuery patterns | `useQuery` (don't refactor just for this) |
| Component shows stale data during background refetch | `useQuery` |
| Simple data display with clear loading/error boundaries | `useSuspenseQuery` |

**For new projects or features**: Prefer `useSuspenseQuery` if you're willing to invest in the Suspense + ErrorBoundary infrastructure. The upfront cost pays off in cleaner components.

**For existing projects**: Don't retrofit. Use `useQuery` where it already works. Introduce `useSuspenseQuery` gradually in new features.

## References

- [TanStack Query v5 docs — Suspense](https://tanstack.com/query/v5/docs/framework/react/guides/suspense)
- [React docs — Suspense for Data Fetching](https://react.dev/reference/react/Suspense)
- [TkDodo — Practical React Query](https://tkdodo.eu/blog/practical-react-query)

## Related decisions

- [project-structure / D-01 — Suspense Boundary Pattern](../../project-structure/decisions/D-01-suspense-boundary-pattern.md): Documents the Shell + Content file split pattern that implements this decision in practice. When adopting `useSuspenseQuery`, the component architecture follows the Shell (`.page.tsx` / `.component.tsx`) + Content (`.content.tsx`) pattern.

## History

- 2026-02-06: Created
- 2026-02-09: Added cross-reference to project-structure D-01 (Shell + Content pattern)
