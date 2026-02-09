# D-11: Error handling — Error Boundaries vs local vs global

**Status**: Adopted
**Date**: 2026-02-06
**Impacts**: [guides/09-query-client-setup.md](../guides/09-query-client-setup.md), [guides/05-use-suspense-query.md](../guides/05-use-suspense-query.md)

## Context

Query errors can be handled at three levels:

1. **Local (component-level)**: Check `error` from the hook, render error UI inline.
2. **Error Boundary**: Let errors propagate to a React Error Boundary that renders a fallback.
3. **Global (QueryCache callback)**: Handle errors in the QueryCache `onError` callback (e.g., toast notification).

The question is which level to use by default.

## Arguments For (local error handling)

- **Granular control**: Each component can show context-specific error messages and recovery actions.
- **No boundary setup required**: Works with plain `useQuery`, no wrapping needed.
- **Partial rendering**: The rest of the page renders normally. Only the failing component shows an error.

## Arguments For (Error Boundaries)

- **Centralized**: One boundary handles errors from all queries in a subtree.
- **Required for Suspense**: `useSuspenseQuery` requires Error Boundaries — errors are thrown, not returned.
- **Cleaner component code**: Components only handle the success case. Error/loading handled by boundaries.

## Arguments For (global QueryCache callback)

- **Cross-cutting concerns**: Logging, analytics, toast notifications — things that should happen for every error regardless of which component failed.
- **Background refetch errors**: When stale data exists and a background refetch fails, the user might not see a local error (data is still displayed). A global toast ensures the failure is visible.
- **Single implementation**: One callback handles all errors. No risk of forgetting error handling in a component.

## Verdict

**Use all three levels for different purposes:**

| Level | Use for |
|-------|---------|
| **Global (QueryCache.onError)** | Background refetch failure toasts, error logging/analytics |
| **Error Boundary** | Fatal errors when using `useSuspenseQuery`, section-level error recovery |
| **Local (component)** | Context-specific error messages, inline retry buttons, form validation errors |

### Implementation pattern

```
Global QueryCache.onError
  → Toasts for background refetch failures
  → Error logging to monitoring service

Error Boundary (per section/page)
  → "Something went wrong" fallback
  → Retry button via QueryErrorResetBoundary
  → Used with useSuspenseQuery components

Local error handling
  → "Failed to load products" with specific retry
  → Form submission errors
  → Used with useQuery components
```

### Key rule: don't toast AND show local error for the same failure

If a component handles the error locally (shows an error message), the global callback should not also toast for the same error. The `query.state.data !== undefined` check in QueryCache.onError ensures toasts only fire for background refetches (where data already exists), not for initial load failures (which are handled locally or by boundaries).

## References

- [TkDodo — React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling)
- [TanStack Query v5 docs — QueryErrorResetBoundary](https://tanstack.com/query/v5/docs/react/reference/QueryErrorResetBoundary)
- [React docs — Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)

## History

- 2026-02-06: Created
