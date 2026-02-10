# D-02: 4-File SRP Split for Complex Data-Dependent Components

**Status**: Adopted
**Date**: 2025-02-10
**Impacts**: `*.page.tsx`, `*.component.tsx`, `*.content.tsx`, `*.loading.tsx`, `*.error.tsx`

## Context

The Shell + Content pattern ([D-01](./D-01-suspense-boundary-pattern.md)) successfully separates boundary management from business logic. However, for complex components, the Shell still contains inline Loading and Error fallbacks that can grow in complexity:

```tsx
// Shell with inline fallbacks — works, but Loading and Error are not testable
export default function EditConfigurationPage() {
  return (
    <Drawer>
      <ErrorBoundary fallbackRender={({ error, resetErrorBoundary }) => (
        // 15+ lines of error UI with retry logic, contextual messages...
      )}>
        <Suspense fallback={
          // 20+ lines of skeleton mimicking the form layout...
        }>
          <EditConfigurationContent />
        </Suspense>
      </ErrorBoundary>
    </Drawer>
  );
}
```

### Problems with inline fallbacks

1. **Shell bloat** — The Shell grows beyond its ~15 line target when fallbacks have real logic.
2. **Not testable in isolation** — Loading and Error UI can't be unit tested independently.
3. **Not reusable** — A skeleton for a form might be useful in multiple places (edit, create) but is trapped in one Shell.
4. **Mixed readability** — Reading the Shell means parsing loading logic, error logic, AND boundary orchestration.

This is not an issue for trivial cases (a `<OdsSpinner />` or a generic error message). It becomes a problem when:
- The skeleton mirrors a complex layout (forms, dashboards, tables)
- Error handling includes retry logic, contextual messages, or degraded states
- The component has multiple data sources with distinct failure modes

## Decision

Extend the Shell + Content pattern to a **4-file split** when Loading or Error have meaningful logic:

```
ComponentName/
├── ComponentName.page.tsx       ← Shell: orchestrates boundaries
├── ComponentName.content.tsx    ← Content: business logic (useSuspenseQuery)
├── ComponentName.loading.tsx    ← Loading: skeleton / loading UI
├── ComponentName.error.tsx      ← Error: error fallback + retry
```

### Complexity threshold

This is NOT a universal rule. Apply the 4-file split only when it adds value:

| Complexity | Pattern | Files |
|-----------|---------|-------|
| Trivial — spinner, dash, one-line fallback | Single component with `useQuery` | 1 |
| Standard — generic skeleton, basic error | Shell + Content ([D-01](./D-01-suspense-boundary-pattern.md)) | 2 |
| Complex — structured skeleton, retry, contextual error | 4-file SRP split | 4 |

### What counts as "trivial"

A cell component that switches on loading/error/success is trivial:

```tsx
// ✅ Trivial — keep in one file
export const AgentLocationCell = ({ vaultId }: Pick<Agent, 'vaultId'>) => {
  const { data, isPending, isError } = useQuery(vaultsQueries.detail(vaultId!));
  if (!vaultId || isError) return <DataGridTextCell>-</DataGridTextCell>;
  if (isPending) return <OdsSkeleton />;
  return <ResourceLocationCell region={data.region} />;
};
```

### What counts as "complex"

A page or component where:
- The skeleton reproduces a multi-field form layout
- The error state includes a retry button and contextual message
- Loading/Error logic is worth a unit test

## Arguments for

1. **Full SRP** — Each file has exactly one responsibility. Reading any file tells you everything about that concern.
2. **Independent testability** — Loading skeleton tested with snapshots, Error tested with mock error + retry spy, Content tested with guaranteed data.
3. **Reusability** — A form skeleton might serve both "Edit" and "Create" pages. An error fallback with retry might be shared across similar forms.
4. **Readability** — The Shell stays at ~15 lines. Content is pure logic. Loading and Error are self-documenting.
5. **Progressive adoption** — Start with Shell + Content (D-01). Extract Loading/Error only when they grow complex enough.

## Arguments against

1. **More files** — 4 files instead of 2 for a single component. Increases directory noise.
2. **Overhead for simple cases** — A `<OdsSpinner />` doesn't need its own file. The complexity threshold is subjective.
3. **Navigation cost** — Developers need to jump between 4 files instead of 2 to understand the full picture.
4. **Learning curve** — New team members need to understand when 1, 2, or 4 files are appropriate.

## Verdict

Adopt the 4-file split as an **opt-in extension** of D-01, triggered by complexity. The Shell + Content pattern remains the default. Extract Loading and Error into separate files only when they contain non-trivial logic.

The naming convention (`.loading.tsx`, `.error.tsx`) makes the split self-documenting and consistent with the existing `.content.tsx` convention.

| Situation | Recommended approach |
|-----------|---------------------|
| Cell/badge with simple loading/error switch | Single file with `useQuery` |
| Page with generic spinner and basic error | Shell + Content (D-01) |
| Page with structured skeleton (form, table layout) | 4-file SRP split |
| Component with retry logic in error state | 4-file SRP split |
| Dashboard tile with custom error + skeleton | 4-file SRP split |
| Skeleton reusable across create/edit pages | 4-file SRP split (shared `.loading.tsx`) |

## Related decisions

- [D-01 — Suspense Boundary Pattern](./D-01-suspense-boundary-pattern.md): Foundation pattern. D-02 extends it, does not replace it.

## History

- 2025-02-10: Created — formalized the 4-file SRP split as an extension of D-01.
