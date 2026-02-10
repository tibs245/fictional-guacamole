# Component SRP — 4-File Split for Complex Components

> When a data-dependent component has non-trivial loading or error states, split it into four files: Shell, Content, Loading, and Error. Each file has a single responsibility.

This guide extends the Shell + Content pattern from [01-page-architecture (Rule 7)](./01-page-architecture.md). Read that rule first.

## Rules

### Rule 1: Apply the 4-file split when Loading or Error have their own logic

The Shell + Content split (Rule 7) is sufficient when loading and error fallbacks are trivial (a spinner, a generic message). Extract Loading and Error into dedicated files **only when they have meaningful logic**.

#### When to split

- The loading state reproduces the content layout as a skeleton (multiple rows, tiles, form fields)
- The error state includes retry logic, contextual messages, or degraded rendering
- The component has multiple queries with distinct loading/error behaviors
- The fallbacks are complex enough to warrant their own unit tests

#### When NOT to split

Small components with simple state switches stay in a single file. The overhead of 4 files is not worth it.

For cases where **no split is appropriate at all** (static + dynamic content visible during loading, optional data), see [D-01 — When NOT to use](../decisions/D-01-suspense-boundary-pattern.md#when-not-to-use).

##### Correct — single file for trivial components

```tsx
// AgentDataLocationCell.component.tsx
// Simple cell: pending → skeleton, error → dash, success → value
// No need for 4 files — this is a trivial switch
export const AgentDataLocationCell = ({ vaultId }: Pick<Agent, 'vaultId'>) => {
  const queryClient = useQueryClient();
  const {
    data: region,
    isPending,
    isError,
  } = useQuery({
    ...vaultsQueries.withClient(queryClient).detail(vaultId!),
    select: selectVaultRegion,
  });

  if (!vaultId || isError) {
    return <DataGridTextCell>-</DataGridTextCell>;
  }

  if (isPending) {
    return <OdsSkeleton />;
  }

  return <ResourceLocationCell region={region} />;
};
```

##### Correct — 4-file split for complex components

```
EditConfiguration/
├── EditConfiguration.page.tsx       ← Shell: Suspense + ErrorBoundary + layout
├── EditConfiguration.content.tsx    ← Content: form logic with guaranteed data
├── EditConfiguration.loading.tsx    ← Loading: skeleton matching the form layout
├── EditConfiguration.error.tsx      ← Error: contextual message + retry
└── _hooks/
    └── useEditConfigurationForm.tsx
```

#### Decision criteria summary

| Complexity | Pattern | Files |
|-----------|---------|-------|
| Trivial (spinner, dash) | Single component with `useQuery` | 1 |
| Standard (generic skeleton) | Shell + Content (Rule 7) | 2 |
| Complex (structured skeleton, retry, contextual error) | 4-file SRP split | 4 |

> **Decision record**: See [D-02-component-srp-split](../decisions/D-02-component-srp-split.md) for the full rationale and trade-offs.

---

### Rule 2: File naming convention

Each file uses a suffix that signals its responsibility:

| Responsibility | Suffix | Example |
|---------------|--------|---------|
| Shell / Entry point | `.page.tsx` or `.component.tsx` | `EditConfiguration.page.tsx` |
| Content (business logic) | `.content.tsx` | `EditConfiguration.content.tsx` |
| Loading (skeleton) | `.loading.tsx` | `EditConfiguration.loading.tsx` |
| Error (fallback) | `.error.tsx` | `EditConfiguration.error.tsx` |

These suffixes extend the existing naming convention from [01-page-architecture](./01-page-architecture.md#file-naming-conventions).

---

### Rule 3: The Shell orchestrates the three others

The Shell is the entry point. It imports Content, Loading, and Error, then composes them with `<Suspense>` and `<ErrorBoundary>`. It contains **no business logic**.

```tsx
// EditConfiguration.page.tsx — Shell
//
// imports: Suspense, ErrorBoundary, useNavigate, useParams, Drawer,
//          EditConfigurationContent, EditConfigurationLoading, EditConfigurationError
//

export const EditConfigurationPage = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const goBack = () => navigate('..');

  return (
    <Drawer isOpen heading={t('edit_configuration')} onDismiss={goBack}>
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <EditConfigurationError error={error} onRetry={resetErrorBoundary} />
        )}
      >
        <Suspense fallback={<EditConfigurationLoading />}>
          <EditConfigurationContent agentId={agentId!} onSuccess={goBack} />
        </Suspense>
      </ErrorBoundary>
    </Drawer>
  );
};
```

The Shell can own **layout-level concerns** (Drawer wrapper, navigation, heading) that exist regardless of loading state.

---

### Rule 4: The Content uses `useSuspenseQuery` — data is guaranteed

The Content component receives guaranteed data from `useSuspenseQuery`. It focuses exclusively on business logic: forms, data display, user interactions.

```tsx
// EditConfiguration.content.tsx — Content
//
// imports: useSuspenseQuery, agentsQueries, tenantsQueries,
//          useEditConfigurationVSPCTenantAgent, useNotifications, useForm, etc.
//

export const EditConfigurationContent = ({
  agentId,
  onSuccess,
}: {
  agentId: string;
  onSuccess: () => void;
}) => {
  // data is ALWAYS defined — no undefined check, no loading guard
  const { data: resourceAgent } = useSuspenseQuery(agentsQueries.detail(agentId));
  const { data: policies } = useSuspenseQuery(tenantsQueries.vspcPolicies());

  //
  // mutation setup, useForm, notifications, onSubmit handler...
  //

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Pure form content — no loading spinners, no error blocks */}
    </form>
  );
};
```

**Key difference with the single-file approach**: `data` is `T`, not `T | undefined`. No `isSuccess &&` guards. No `isPending` spinners in the JSX.

---

### Rule 5: The Loading component mirrors the Content layout

The Loading component renders a skeleton that matches the structure of the real content. This provides a smooth visual transition and avoids layout shifts.

```tsx
// EditConfiguration.loading.tsx — Loading
import { OdsSkeleton } from '@ovhcloud/ods-components/react';

export const EditConfigurationLoading = () => (
  <div className="flex flex-col gap-4">
    {/* Mirrors the form layout from Content */}
    <OdsSkeleton />               {/* Name field */}
    <OdsSkeleton />               {/* Service field */}
    <OdsSkeleton />               {/* IP field */}
    <OdsSkeleton className="h-12" /> {/* Policy select */}
  </div>
);
```

#### Why not just a spinner?

A skeleton that mirrors the layout:
- Prevents layout shift when data arrives
- Gives users a sense of the page structure before it loads
- Is testable independently — you can verify the skeleton matches expectations

---

### Rule 6: The Error component is contextual and actionable

The Error component provides context-specific error handling. It should tell the user **what went wrong** and **what they can do about it**.

```tsx
// EditConfiguration.error.tsx — Error
//
// imports: OdsMessage, OdsButton, useTranslation
//

type EditConfigurationErrorProps = {
  error: Error;
  onRetry: () => void;
};

export const EditConfigurationError = ({
  error,
  onRetry,
}: EditConfigurationErrorProps) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 items-center">
      <OdsMessage color="critical" isDismissible={false}>
        {t('edit_configuration_error', { message: error.message })}
      </OdsMessage>
      <OdsButton
        label={t('retry')}
        onClick={onRetry}
        variant="outline"
      />
    </div>
  );
};
```

#### The Error component:
- Receives `error` and `onRetry` (from `resetErrorBoundary`)
- Displays a message specific to its context (not a generic "Something went wrong")
- Provides a retry action when recovery is possible
- Can display a degraded view (e.g., show cached data with a warning)

---

## Full example: Before and After

### Before — single file mixing all concerns

```tsx
// EditConfiguration.page.tsx — 150+ lines, mixed responsibilities
export const EditConfigurationPage = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const goBack = () => navigate('..');
  const {
    data: resourceAgent,
    isPending: isLoading,
    error,
    isSuccess,
    refetch,
  } = useQuery(agentsQueries.detail(agentId!));

  const { data: policies, isPending: isPoliciesLoading } = useQuery(
    tenantsQueries.vspcPolicies(),
  );

  const { mutate, isPending } = useEditConfigurationVSPCTenantAgent({ ... });
  const { register, control, handleSubmit, formState } = useForm({ ... });

  return (
    <form>
      <Drawer heading={resourceAgent?.currentState.name ?? t('edit_configuration')} ...>
        {isLoading && (
          <div className="flex justify-center items-center h-full">
            <OdsSpinner />  {/* ← Loading buried in JSX */}
          </div>
        )}

        {!!error && (
          <ErrorBoundary ... />  {/* ← Error handling inline */}
        )}

        {isSuccess && (
          <>
            {/* 80+ lines of form content buried inside isSuccess guard */}
            {/* data is T | undefined despite the guard */}
          </>
        )}
      </Drawer>
    </form>
  );
};
```

**Problems**:
- Three responsibilities mixed in one file (loading, error, business logic)
- `data` is `T | undefined` everywhere, even inside `isSuccess` guard
- Loading is a generic spinner, not a skeleton reflecting the layout
- Hard to test the form logic without mocking query states
- Error handling is not reusable or independently testable

### After — 4-file SRP split

```
EditConfiguration/
├── EditConfiguration.page.tsx       ← 25 lines — Shell
├── EditConfiguration.content.tsx    ← 80 lines — Pure form logic
├── EditConfiguration.loading.tsx    ← 15 lines — Skeleton
├── EditConfiguration.error.tsx      ← 20 lines — Error + retry
└── _hooks/
    └── useEditConfigurationForm.tsx ← Form hook (optional extraction)
```

Each file is focused, testable, and readable independently.

---

## Testing

The 4-file split improves testability at every level:

| File | What to test | How |
|------|-------------|-----|
| `.content.tsx` | Business logic, form validation, user interactions | Pre-seed QueryClient with `setQueryData`, render content directly |
| `.loading.tsx` | Skeleton structure matches expected layout | Render in isolation, snapshot or assert structure |
| `.error.tsx` | Error message display, retry button behavior | Pass mock `error` and `onRetry` props |
| `.page.tsx` | Integration: boundaries compose correctly | Integration test with MSW, verify transitions |

See [03-testing-strategy](./03-testing-strategy.md) and [04-test-utilities](./04-test-utilities.md) for testing patterns.
