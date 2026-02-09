# Test Utilities

> Test wrapper builder, centralized mocks, MSW setup, and the patterns that power unit and integration tests.

## Rules

### Rule 1: Centralized mocks in `test-utils/mocks/`

Third-party and design system mocks are centralized — never duplicated per test file.

#### Structure

```
src/test-utils/
├── mocks/
│   ├── ods-components.tsx     ← ODS design system → HTML primitives
│   ├── react-router-dom.tsx   ← Router hooks and Link
│   └── react-i18next.tsx      ← Translation hook
├── globalMocks.ts             ← vi.hoisted() global mocks
├── testWrapperBuilder.tsx      ← Builder pattern for providers
├── testWrapperProviders.tsx    ← Provider factory functions
├── setupMsw.ts                ← MSW handler aggregation
└── Test.utils.tsx              ← renderTest() entry point
```

#### ODS components → HTML primitives

Design system components are replaced with simple HTML equivalents. Each mock uses `vi.fn().mockImplementation()` so it can be spied on:

- `OdsButton` → `<button>`
- `OdsInput` → `<input>` (with `onOdsChange` → `onChange` mapping)
- `OdsSpinner` → `<div data-testid="spinner">`
- `OdsSelect` → `<select>` (with `onOdsChange` mapping)

> **Reference**: `modules/backup-agent/src/test-utils/mocks/ods-components.tsx`

#### Router mocks

Minimal implementations that satisfy imports without a real router:

- `useHref` → returns the URL as-is
- `useNavigate` → returns a `vi.fn()` (spyable)
- `useParams` → returns `{}`
- `useLocation` → returns default location object
- `Link` → renders as `<a>`

> **Reference**: `modules/backup-agent/src/test-utils/mocks/react-router-dom.tsx`

#### i18n mocks

Translation function returns the key with a prefix (`translated_key`) — tests can assert on translation keys without loading real translations.

> **Reference**: `modules/backup-agent/src/test-utils/mocks/react-i18next.tsx`

---

### Rule 2: `vi.hoisted()` for mock hoisting

When a mock needs to be referenced by both the `vi.mock()` factory and the test code, use `vi.hoisted()`. This ensures the mock variable is created before ES module imports are evaluated.

#### Global mocks (shared across all tests)

```tsx
// globalMocks.ts — loaded via vitest setupFiles
const { useNavigationGetUrlMock } = vi.hoisted(() => ({
  useNavigationGetUrlMock: vi.fn().mockReturnValue({
    data: '',
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@ovh-ux/manager-react-shell-client', async () => {
  const actual = await vi.importActual('@ovh-ux/manager-react-shell-client');
  return { ...actual, useNavigationGetUrl: useNavigationGetUrlMock };
});
```

#### Per-test mocks (control return values per test case)

```tsx
const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return { ...actual, useQuery: mockUseQuery };
});

describe('MyComponent', () => {
  it('renders loading state', () => {
    mockUseQuery.mockReturnValue({ isLoading: true, data: undefined });
    render(<MyComponent />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders data', () => {
    mockUseQuery.mockReturnValue({ isLoading: false, data: mockData });
    render(<MyComponent />);
    expect(screen.getByText(mockData.name)).toBeVisible();
  });
});
```

> **Reference**: `modules/backup-agent/src/test-utils/globalMocks.ts`
> `modules/backup-agent/src/pages/billing/listing/_components/__tests__/BillingPriceCell.component.test.tsx`

---

### Rule 3: Test wrapper builder for provider composition

Tests needing React context providers use a **fluent builder pattern**. Each provider is opt-in — compose only what the test requires.

#### Usage

```tsx
// Unit test — just needs QueryClient + i18n
const wrapper = await testWrapperBuilder()
  .withQueryClient()
  .withI18next()
  .build();

render(<MyComponent />, { wrapper });
```

```tsx
// Integration test — needs the full stack
const Providers = await testWrapperBuilder()
  .withQueryClient()
  .withI18next()
  .withShellContext()
  .withAppContext({ appName: 'my-app', scope: 'Enterprise' })
  .build();

render(<Providers><TestApp initialRoute="/services" /></Providers>);
```

#### How it works

The builder collects provider configuration, then `build()` assembles them using `reduceRight` — first provider added becomes the outermost wrapper. Each `add*Provider` function pushes a React component into the providers array.

Key: `.withQueryClient()` creates a `new QueryClient` with `retry: false` for both queries and mutations — tests should fail fast, not retry.

> **Reference implementation**:
> `modules/backup-agent/src/test-utils/testWrapperBuilder.tsx`
> `modules/backup-agent/src/test-utils/testWrapperProviders.tsx`

#### Pre-seeding QueryClient cache with `setQueryData`

For Content components using `useSuspenseQuery` (Shell + Content pattern), you need to pre-seed the cache so the component receives guaranteed data without a real API call.

**Current limitation**: `.withQueryClient()` creates the QueryClient internally and doesn't accept an external one. Until the builder is extended (see evolution below), mount the `QueryClientProvider` manually:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

// Seed the cache before rendering
queryClient.setQueryData(
  productQueries.detail(productId).queryKey,
  mockProductData,
);

// Mount QueryClientProvider manually
render(
  <QueryClientProvider client={queryClient}>
    <MyContent />
  </QueryClientProvider>,
);
```

This verifies that `select` transforms run correctly on cached data during render.

#### Evolution: extend the builder to accept an external QueryClient

To support `setQueryData` via the builder, apply this change to `testWrapperProviders.tsx`:

```diff
-export const addQueryClientProvider = (providers: TestProvider[]) => {
-  const queryClient = new QueryClient({
+export const addQueryClientProvider = (
+  providers: TestProvider[],
+  externalClient?: QueryClient,
+) => {
+  const queryClient = externalClient ?? new QueryClient({
     defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
   });
```

And in `testWrapperBuilder.tsx`:

```diff
-  withQueryClient: boolean;
+  withQueryClient: boolean;
+  queryClient?: QueryClient;

-    withQueryClient: () => {
-      config.withQueryClient = true;
-      return builder;
+    withQueryClient: (queryClient?: QueryClient) => {
+      config.withQueryClient = true;
+      config.queryClient = queryClient;
+      return builder;

-    if (config.withQueryClient) addQueryClientProvider(providers);
+    if (config.withQueryClient) addQueryClientProvider(providers, config.queryClient);
```

After this change, both patterns work:

```tsx
// Without pre-seeding — builder creates its own QueryClient
const wrapper = await testWrapperBuilder().withQueryClient().build();

// With pre-seeding — pass your own QueryClient
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});
queryClient.setQueryData(queryKey, mockData);
const wrapper = await testWrapperBuilder().withQueryClient(queryClient).build();
```

---

### Rule 4: MSW handlers power integration tests

Each API domain exposes a `get*Mocks(params): Handler[]` factory. All factories are aggregated into a single `setupMswMock()` call.

#### Unified `MockParams` type

All handler params are intersected into a single type — one object controls the entire mock surface:

```tsx
export type MockParams = TVaultMockParams &
  TLocationMockParams &
  TTenantMockParams &
  TAgentMockParams &
  // ... every domain
```

#### Error simulation via boolean flags

Each domain type exposes `is<Domain>Error?: boolean` flags:

```tsx
await renderTest({
  initialRoute: '/services',
  isVspcTenantsError: true,   // this API returns 500
  isVaultsError: false,        // this one works fine
});
```

#### `renderTest()` — the integration test entry point

Combines MSW setup + wrapper builder + TestApp in a single call:

```tsx
export const renderTest = async ({
  initialRoute,
  ...mockParams
}: { initialRoute?: string } & MockParams = {}) => {
  setupMswMock(mockParams);

  const Providers = await testWrapperBuilder()
    .withQueryClient()
    .withI18next()
    .withShellContext()
    .build();

  return render(
    <Providers>
      <TestApp initialRoute={formatSafePath(initialRoute)} />
    </Providers>,
  );
};
```

> **Reference implementation**:
> `modules/backup-agent/src/test-utils/setupMsw.ts`
> `modules/backup-agent/src/test-utils/Test.utils.tsx`

---

## Summary

```
test-utils/
├── mocks/                     ← Centralized: ODS → HTML, router, i18n
├── globalMocks.ts             ← vi.hoisted() for shared mocks
├── testWrapperBuilder.tsx      ← Fluent builder for providers
├── testWrapperProviders.tsx    ← Provider factory functions (reduceRight)
├── setupMsw.ts                ← MockParams + handler aggregation
└── Test.utils.tsx              ← renderTest() = MSW + builder + render
```

All reference files: `modules/backup-agent/src/test-utils/`
