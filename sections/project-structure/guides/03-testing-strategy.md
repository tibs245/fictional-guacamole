# Testing Strategy

> What to test, where to put tests, and the philosophy behind each test level.

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

Every file in `_components/`, `_hooks/`, `src/components/`, `src/hooks/`, and `src/utils/` gets a unit test.

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

#### What to test: behavior, not implementation

Ask: **"What does this component/hook do for the user?"** — test that.

- **Component**: What does it render? What happens when the user interacts with it?
- **Hook**: What does it return? How does it react to different inputs?
- **Utility**: What does it output for each input?

#### Prefer accessibility selectors

Use selectors that reflect what the user perceives — not implementation details:

```tsx
// ✅ Accessibility selectors — test what the user sees
screen.getByRole('link', { name: /tenant name/i });
screen.getByRole('button', { name: /delete/i });
screen.getByLabelText('Email address');
screen.getByText('No results found');

// ⚠️ testId — only when no accessible selector exists (e.g., ODS wrappers)
screen.getByTestId('spinner');

// ❌ Avoid — tests implementation, not behavior
container.querySelector('.tenant-name-cell');
screen.getByTestId('tenant-name');  // when getByRole/getByText would work
```

Priority order: `getByRole` > `getByLabelText` > `getByText` > `getByTestId`.

---

### Rule 3: Use `it.each` for exhaustive case coverage

When a component or utility has multiple input/output combinations, use `it.each` to test all cases with minimal boilerplate.

#### Object array pattern (use `$property` in test name)

Best for complex test data with many properties:

```tsx
it.each([
  { input: MOCKS[0], expected: 'eu-west-par' },
  { input: MOCKS[1], expected: 'eu-west-rbx' },
  { input: MOCKS[2], expected: 'ap-southeast-sgp' },
])(
  'should map region to "$expected"',
  ({ input, expected }) => {
    expect(mapToRegion(input)).toBe(expected);
  },
);
```

#### Tuple array pattern (use `%s` in test name)

Best for simple input → output mappings:

```tsx
it.each([
  ['/services', '/services'],
  ['/services/:id', '/services/[a-zA-Z0-9-]+'],
])('converts %s to regex %s', (url, expectedRegex) => {
  expect(urlToStringRegex(url)).toEqual(expectedRegex);
});
```

> **Reference**: See real-world `it.each` examples in
> `modules/backup-agent/src/data/mappers/__tests__/mapTenantToTenantWithRegion.test.ts`
> `modules/backup-agent/src/utils/__tests__/urlToStringRegex.test.ts`

---

### Rule 4: Integration tests verify the assembled page

Since every component and hook is unit tested, the integration test does not re-test individual behaviors. It verifies that **the page assembles correctly** and **the data flows through**.

#### File placement

```
src/pages/services/listing/
├── Listing.page.tsx
└── Listing.spec.tsx        ← integration test
```

#### Prefix with `[INTEGRATION]`

```tsx
describe('[INTEGRATION] - Listing page', () => {
  it('displays the list of tenants', async () => {
    await renderTest({ initialRoute: urls.listingTenants });
    await waitFor(
      () => expect(screen.getByText(tenantId)).toBeVisible(),
      { timeout: 10_000 },
    );
  });

  it('displays an error state on API failure', async () => {
    await renderTest({ initialRoute: '/services', isVspcTenantsError: true });
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

#### What NOT to test in a page integration test

```tsx
// ❌ Don't re-test column rendering logic — that's the unit test's job
expect(screen.getByText('192.168.1.10')).toBeInTheDocument();

// ❌ Don't test component internals — that's _components/__tests__'s job
expect(screen.getByRole('link')).toHaveAttribute('href', '/specific/path');
```

> **Reference**: See real integration tests in
> `modules/backup-agent/src/pages/services/listing/Listing.spec.tsx`
> `modules/backup-agent/src/pages/vaults/listing/Listing.spec.tsx`

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
  ├── _components/*.component.tsx    → __tests__/*.test.tsx   (+ it.each)
  ├── _hooks/*.tsx                   → __tests__/*.test.tsx   (+ it.each)
  ├── src/components/**              → __tests__/*.test.tsx   (+ it.each)
  ├── src/hooks/**                   → __tests__/*.test.tsx   (+ it.each)
  └── src/utils/**                   → __tests__/*.test.ts    (+ it.each)

Integration tested (assembled, data flows):
  └── src/pages/**/*.page.tsx        → *.spec.tsx (with MSW)
```

> **Test utilities** (builder, mocks, MSW setup) are documented in a separate guide:
> → [04-test-utilities](./04-test-utilities.md)
