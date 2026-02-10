# Select

> How to transform or filter fetched data per-component using the `select` option, without modifying the cache.

## Prerequisites

- [02-query-options.md](./02-query-options.md)
- [03-use-query.md](./03-use-query.md)

## Rules

### Rule 1: Use `select` to derive component-specific data

The `select` option transforms query data for one specific consumer. The cache keeps the original data untouched. Other consumers of the same query see the full data.

#### Correct

```tsx
import { useQuery } from '@tanstack/react-query';
import { productQueries } from './products.queries';

function ProductName({ id }: { id: string }) {
  const { data: name } = useQuery({
    ...productQueries.detail(id),
    select: (product) => product.name,
  });

  return <h1>{name}</h1>;
}
```

#### Incorrect

```tsx
// Fetching the full product then ignoring most of it
function ProductName({ id }: { id: string }) {
  const { data } = useQuery(productQueries.detail(id));
  // data is the full Product — component re-renders on ANY field change
  return <h1>{data?.name}</h1>;
}
```

---

### Rule 2: Extract static selectors outside the component

If the selector has no dependencies on component state, define it outside the component for referential stability. This prevents unnecessary re-renders.

#### Correct

```tsx
// Defined outside — stable reference, never recreated
const selectProductName = (product: Product) => product.name;

function ProductName({ id }: { id: string }) {
  const { data: name } = useQuery({
    ...productQueries.detail(id),
    select: selectProductName,
  });

  return <h1>{name}</h1>;
}
```

#### Incorrect

```tsx
function ProductName({ id }: { id: string }) {
  // New function every render — select runs every time even if result is the same
  const { data: name } = useQuery({
    ...productQueries.detail(id),
    select: (product) => product.name,
  });
}
```

---

### Rule 3: Use curried selectors for parameterized transformations

When a selector depends on an external value (prop, state, ID), extract it as a curried function outside the component. This gives referential stability (the outer function returns a new inner function only when the parameter changes), improves testability (pure function, no React needed), and eliminates the need for `useCallback`.

#### Correct

```tsx
// products.selectors.ts — pure, testable, reusable
export const selectByCategory =
  (categoryId: string) => (products: Product[]) =>
    products.filter((p) => p.categoryId === categoryId);

// Component — clean, no useCallback
import { selectByCategory } from './products.selectors';

function ProductsByCategory({ categoryId }: { categoryId: string }) {
  const { data: filtered } = useQuery({
    ...productQueries.all(),
    select: selectByCategory(categoryId),
  });

  return <ProductList products={filtered ?? []} />;
}
```

#### Incorrect

```tsx
function ProductsByCategory({ categoryId }: { categoryId: string }) {
  // Inline arrow with closure — new reference every render
  const { data: filtered } = useQuery({
    ...productQueries.all(),
    select: (products) => products.filter((p) => p.categoryId === categoryId),
  });
}
```

If the selector logic is truly one-off and not worth extracting, `useCallback` is not preferred because not easier to test and reuse:

```tsx
function ProductsByCategory({ categoryId }: { categoryId: string }) {
  const selectByCategory = useCallback(
    (products: Product[]) => products.filter((p) => p.categoryId === categoryId),
    [categoryId],
  );

  const { data: filtered } = useQuery({
    ...productQueries.all(),
    select: selectByCategory,
  });
}
```

---

### Rule 4: Universal transformations go in queryFn, not select

If EVERY consumer of a query needs the same transformation (e.g., normalizing API response shape), put it in the queryFn. Use `select` only for per-component derivation.

#### Correct

```tsx
// products.queries.ts — normalize once for everyone
export const productQueries = {
  list: (filters: ProductFilters) =>
    queryOptions({
      queryKey: queryKeys.products.list(filters),
      queryFn: async () => {
        const response = await fetchProducts(filters);
        // Universal normalization — all consumers need this shape
        return response.data.map(normalizeProduct);
      },
    }),
};

// Component — per-component derivation via select
function ActiveProductCount() {
  const { data: count } = useQuery({
    ...productQueries.list({}),
    select: (products) => products.filter((p) => p.isActive).length,
  });
  return <Badge count={count ?? 0} />;
}
```

#### Incorrect

```tsx
// Normalizing in select — every consumer must repeat it
function ProductList() {
  const { data } = useQuery({
    ...productQueries.list({}),
    select: (response) => response.data.map(normalizeProduct), // duplicated everywhere
  });
}
```

---

### Rule 5: Co-locate selectors in a dedicated `*.selectors.ts` file per feature

Selectors are the transformation layer between the cache and the UI. Store them alongside the query factory in a dedicated file.

#### File structure

```
src/features/products/
├── products.queries.ts      # queryOptions factories
├── products.selectors.ts    # select functions (static + curried)
└── components/
    └── ProductsByCategory.tsx
```

#### Correct

```tsx
// products.selectors.ts
import type { Product } from '@/types/product';

// Static selector — no parameter
export const selectProductNames = (products: Product[]) =>
  products.map((p) => p.name);

// Curried selector — parameterized
export const selectByCategory =
  (categoryId: string) => (products: Product[]) =>
    products.filter((p) => p.categoryId === categoryId);

// Composed selector
export const selectActiveByCategoryCount =
  (categoryId: string) => (products: Product[]) =>
    selectByCategory(categoryId)(products).filter((p) => p.isActive).length;
```

```tsx
// ProductsByCategory.tsx
import { productQueries } from '../products.queries';
import { selectByCategory } from '../products.selectors';

function ProductsByCategory({ categoryId }: { categoryId: string }) {
  const { data: filtered } = useQuery({
    ...productQueries.all(),
    select: selectByCategory(categoryId),
  });
  return <ProductList products={filtered ?? []} />;
}
```

#### Incorrect

```tsx
// Selectors scattered inside components — hard to find, test, and reuse
function ProductsByCategory({ categoryId }: { categoryId: string }) {
  const { data } = useQuery({
    ...productQueries.all(),
    select: (products) => products.filter((p) => p.categoryId === categoryId),
  });
}

// Or selectors inside the queries file — mixing concerns
// products.queries.ts
export const selectByCategory = ...; // doesn't belong here
export const productQueries = { ... };
```

#### When inlining is acceptable

A trivial one-liner used in a single component can stay inline for pragmatism:

```tsx
// Simple enough — no need for a separate file entry
const { data: name } = useQuery({
  ...productQueries.detail(id),
  select: (product) => product.name,
});
```

The threshold: if the selector has parameters, is reused, or involves more than a single property access — extract it.

---

## Edge Cases

- **Re-render optimization**: When using `select`, the component only re-renders if the selected value changes (structural equality check). This is a built-in optimization — a query returning a new object with the same `name` field won't re-render a component that only selects `name`.
- **Select with useSuspenseQuery**: Works exactly the same way:
  ```tsx
  const { data: name } = useSuspenseQuery({
    ...productQueries.detail(id),
    select: (product) => product.name,
  });
  // name is guaranteed to be defined (string, not string | undefined)
  ```
- **Composable selectors**: Build selectors by composing small functions in your `*.selectors.ts` file (see Rule 5):
  ```tsx
  // products.selectors.ts
  export const selectActive = (products: Product[]) => products.filter((p) => p.isActive);
  export const selectNames = (products: Product[]) => products.map((p) => p.name);
  export const selectActiveNames = (products: Product[]) => selectNames(selectActive(products));
  ```

---

> Decision rationale: [D-04 — select vs queryFn transformation](../decisions/D-04-select-vs-queryfn.md)
