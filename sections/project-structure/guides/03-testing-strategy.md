# Testing Strategy

> What to test, where to put tests, and the distinction between unit and integration tests.

## Rules

### Rule 1: Two test levels with clear responsibilities

| | Unit tests | Integration tests |
|---|---|---|
| **What** | Components, hooks, utils — in isolation | Pages — assembled with data |
| **Where** | `__tests__/<Name>.test.tsx` next to the file | `<PageName>.spec.tsx` next to the page |
| **Runner** | Vitest | Vitest + MSW |
| **Goal** | Every code path, every edge case | The page renders, data displays, interactions work |
| **Data** | Props / mocks | MSW handlers returning mock data |

---

### Rule 2: Unit test every component, hook, and utility

Every file in `_components/`, `_hooks/`, `src/components/`, `src/hooks/`, and `src/utils/` gets a unit test. Cover all usage scenarios.

#### File placement

```
src/pages/services/listing/
├── _components/
│   ├── TenantNameCell.component.tsx
│   └── __tests__/
│       └── TenantNameCell.component.test.tsx
├── _hooks/
│   ├── useVspcTenantListingColumns.tsx
│   └── __tests__/
│       └── useVspcTenantListingColumns.test.tsx
```

```
src/components/CommonCells/ResourceStatusCell/
├── ResourceStatusCell.component.tsx
└── __tests__/
    └── ResourceStatusCell.component.test.tsx
```

#### What to test in a component

```tsx
// __tests__/TenantNameCell.component.test.tsx
describe('TenantNameCell', () => {
  it('renders the tenant name', () => {
    render(<TenantNameCell item={mockTenant} />);
    expect(screen.getByText(mockTenant.currentState.name)).toBeInTheDocument();
  });

  it('links to the tenant dashboard', () => {
    render(<TenantNameCell item={mockTenant} />);
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      expect.stringContaining(`/services/dashboard/${mockTenant.id}`),
    );
  });
});
```

#### What to test in a hook

```tsx
// __tests__/useVspcTenantListingColumns.test.tsx
describe('useVspcTenantListingColumns', () => {
  it('returns the expected column ids', () => {
    const { result } = renderHook(() => useVspcTenantListingColumns());
    expect(result.current.map((c) => c.id)).toEqual([
      'name', 'location', 'status', 'actions',
    ]);
  });
});
```

---

### Rule 3: Integration tests verify the assembled page

Since every component and hook is unit tested, the integration test does not need to re-test individual behaviors. It verifies that **the page assembles correctly** and **the data flows through**.

#### File placement

```
src/pages/services/listing/
├── Listing.page.tsx
└── Listing.spec.tsx        ← integration test
```

#### What to test in a page integration test

```tsx
// Listing.spec.tsx
describe('ServiceListingPage', () => {
  it('displays the list of tenants', async () => {
    await renderTest({ initialRoute: '/services' });

    // Verify data from MSW mock is displayed
    await waitFor(() => {
      expect(screen.getByText(mockVspcTenants[0].currentState.name)).toBeInTheDocument();
    });
  });

  it('displays an error state on API failure', async () => {
    await renderTest({
      initialRoute: '/services',
      isVspcTenantsError: true,
    });

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

#### What NOT to test in a page integration test

```tsx
// ❌ Don't re-test column rendering logic — that's the unit test's job
expect(screen.getByText('192.168.1.10')).toBeInTheDocument(); // agent IP display
expect(screen.getByText('14d-windows')).toBeInTheDocument();  // policy badge format

// ❌ Don't test component internals — that's _components/__tests__'s job
expect(screen.getByRole('link')).toHaveAttribute('href', '/specific/path');
```

---

### Rule 4: MSW handlers power integration tests

Integration tests use MSW handlers from `/src/mocks/`. Each handler supports error simulation via params.

#### Setup

```tsx
// src/test-utils/setupMsw.ts
export const setupMswMock = (mockParams: MockParams = {}) => {
  server.resetHandlers(
    ...toMswHandlers([
      ...getServicesMocks(mockParams),
      ...getVaultMocks(mockParams),
      ...getAgentMocks(mockParams),
      // ...
    ]),
  );
};
```

#### Render utility

```tsx
// src/test-utils/Test.utils.tsx
export const renderTest = async ({
  initialRoute,
  ...mockParams
}: { initialRoute?: string } & MockParams) => {
  setupMswMock(mockParams);
  // renders with QueryClient, i18n, shell context, etc.
};
```

#### Error simulation

```tsx
// Pass params to simulate specific failures
await renderTest({
  initialRoute: '/services',
  isVspcTenantsError: true,   // services API returns 500
  isVaultsError: false,        // vaults API works fine
});
```

---

### Rule 5: Test file naming conventions

| Test type | Extension | Location | Example |
|-----------|-----------|----------|---------|
| Integration test | `.spec.tsx` | Same level as the page | `Listing.spec.tsx` |
| Unit test (component) | `.test.tsx` | `__tests__/` folder | `__tests__/TenantNameCell.component.test.tsx` |
| Unit test (hook) | `.test.tsx` | `__tests__/` folder | `__tests__/useColumns.test.tsx` |
| Unit test (util) | `.test.ts` | `__tests__/` folder | `__tests__/formatDate.test.ts` |

---

## Summary

```
Unit tested (exhaustive, every case):
  ├── _components/*.component.tsx    → __tests__/*.test.tsx
  ├── _hooks/*.tsx                   → __tests__/*.test.tsx
  ├── src/components/**              → __tests__/*.test.tsx
  ├── src/hooks/**                   → __tests__/*.test.tsx
  └── src/utils/**                   → __tests__/*.test.ts

Integration tested (assembled, data flows):
  └── src/pages/**/*.page.tsx        → *.spec.tsx (with MSW)
```
