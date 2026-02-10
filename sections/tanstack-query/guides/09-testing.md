# Testing

> How to unit test select functions and page components that consume TanStack Query hooks.

## Prerequisites

- [02-query-options.md](./02-query-options.md)
- [04-select.md](./04-select.md)

## What to test (and what NOT to test)

| Test | Why |
|---|---|
| `select` functions from queryOptions factories | Pure functions, your transformation logic |
| `select` functions added in page components | Tested implicitly via `setQueryData` + render |
| Page components consuming queries | Verify rendering with seeded cache data |
| **NOT** `useQuery` itself | You'd be testing TanStack Query, not your code |
| **NOT** `queryFn` | You'd be testing your API client, not your hook |

## Rules

### Rule 1: Test select functions as pure units

Select functions defined in queryOptions factories are pure functions. Test them directly with mock data from `/src/mocks` — no React, no QueryClient.

#### Correct

```tsx
import { describe, it, expect } from 'vitest';
import { productQueries } from './products.queries';
import { mockProducts } from '@/mocks/products';

describe('productQueries.list select', () => {
  it('filters products by category', () => {
    const options = productQueries.list({ category: 'electronics' });
    const result = options.select(mockProducts);

    expect(result).toEqual(
      mockProducts.filter((p) => p.category === 'electronics'),
    );
  });
});
```

#### Incorrect

```tsx
// ❌ Rendering a component just to test a select function
it('filters products', async () => {
  render(<ProductList category="electronics" />);
  await waitFor(() => {
    expect(screen.getByText('Laptop')).toBeInTheDocument();
  });
  // This tests rendering + fetching + select — too broad for a unit test
});
```

---

### Rule 2: Use `setQueryData` to seed the cache for page component tests

For unit tests of page components, seed the `QueryClient` cache with `setQueryData` before rendering. This is declarative, scales to any number of queries, and exercises the full React Query pipeline (cache → select → component) without network calls.

#### Setup

Use the test wrapper builder from `test-utils/` (see `project-structure` guide 04-test-utilities for the full builder pattern, Rules 1 and 3).

Always use `createQueryClientTest()` to create the test QueryClient — it sets `retry: false` and `staleTime: Infinity`. See `project-structure` guide 04-test-utilities, Rule 3 for the full implementation and rationale.

#### Correct — page with multiple queries

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClientTest } from '@/test-utils/createQueryClientTest';
import { userQueries } from '@/data/users.queries';
import { orderQueries } from '@/data/orders.queries';
import { notificationQueries } from '@/data/notifications.queries';
import { mockUser } from '@/mocks/users';
import { mockOrders } from '@/mocks/orders';
import { mockNotifications } from '@/mocks/notifications';
import { DashboardPage } from './DashboardPage';

describe('DashboardPage', () => {
  it('renders user info, orders, and notifications', () => {
    const queryClient = createQueryClientTest();

    // Seed each query independently — order doesn't matter
    queryClient.setQueryData(userQueries.detail('user-1').queryKey, mockUser);
    queryClient.setQueryData(orderQueries.detail('org-1').queryKey, mockOrders);
    queryClient.setQueryData(notificationQueries.all().queryKey, mockNotifications);

    render(
      <QueryClientProvider client={queryClient}>
        <DashboardPage userId="user-1" />
      </QueryClientProvider>,
    );

    expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    expect(screen.getByText(`${mockOrders.length} orders`)).toBeInTheDocument();
  });
});
```

This also tests any `select` added at the page level — the data flows through the full pipeline: `setQueryData` → cache → `select` → component render.

#### Incorrect

```tsx
// ❌ Mocking useQuery directly — fragile, order-dependent, skips React Query entirely
vi.mocked(useQuery)
  .mockReturnValueOnce({ data: mockUser, isSuccess: true } as any)
  .mockReturnValueOnce({ data: mockOrders, isSuccess: true } as any)
  .mockReturnValueOnce({ data: mockNotifications, isSuccess: true } as any);
// Breaks on re-render, doesn't test select, doesn't test cache
```

#### Why `setQueryData` is the right default

- **Declarative** — no call order to worry about, each query is seeded by its key.
- **Scales** — 3 queries = 3 lines, adding a 4th query = 1 more line.
- **Tests `select`** — data passes through the full React Query pipeline including any `select` on the page.
- **Uses your queryOptions factories** — if a query key changes, the test breaks at the right place.
- **No mock drift** — you use real mock data from `/src/mocks`, not ad-hoc return values.

---

## Edge Cases

- **Testing loading states**: `setQueryData` makes data available immediately — no loading state. If you need to test a loading state, don't seed that specific query. The component will see `isPending: true` for the unseeded query.
- **Testing error states**: Use `queryClient.setQueryDefaults(queryKey, { queryFn: () => Promise.reject(new Error('fail')) })` then let the query fire, or use MSW for integration tests.
- **Fresh QueryClient per test**: Always call `createQueryClientTest()` in each test to prevent cache leaks between tests. Never share a `QueryClient` across tests.

---

> Decision rationale: Testing strategy is derived from the composable hooks pattern ([08-mutations](./08-mutations.md)) and the queryOptions factory pattern ([02-query-options](./02-query-options.md)).
