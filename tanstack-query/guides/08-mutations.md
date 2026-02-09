# Mutations

> How to create composable mutation hooks with proper cache invalidation and optimistic updates.

## Prerequisites

- [02-query-options.md](./02-query-options.md)
- [01-query-keys.md](./01-query-keys.md)

## Rules

### Rule 1: Mutations are composable hooks

Mutations live in dedicated hook files (`/src/data/hook`), not inline in components. The hook encapsulates the `mutationFn` and cache invalidation, but exposes all `useMutation` options so consumers can compose their own `onSuccess`, `onError`, etc.

#### Correct

```tsx
// src/data/hook/useCreateProduct.ts
import { useMutation, useQueryClient, type UseMutationOptions } from '@tanstack/react-query';
import { productQueries } from './products.queries';

export const useCreateProduct = ({
  onSuccess,
  ...options
}: Omit<UseMutationOptions<Product, Error, CreateProductInput>, 'mutationFn'> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newProduct: CreateProductInput) => createProduct(newProduct),
    onSuccess: (...params) => {
      queryClient.invalidateQueries({ queryKey: productQueries.all().queryKey });
      onSuccess?.(...params);
    },
    ...options,
  });
};
```

```tsx
// In a component — the consumer composes behavior
function CreateProductForm() {
  const navigate = useNavigate();

  const mutation = useCreateProduct({
    onSuccess: () => {
      toast.success('Product created!');
      navigate('/products');
    },
  });

  return (
    <form onSubmit={handleFormSubmit((data) => mutation.mutate(data))}>
      {/* form fields */}
    </form>
  );
}
```

#### Incorrect

```tsx
// ❌ Mutation logic inline in the component — not reusable
function CreateProductForm() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueries.all().queryKey });
      toast.success('Created!');
    },
  });
}

// ❌ Hook that hardcodes UI behavior — not composable
export const useCreateProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueries.all().queryKey });
      toast.success('Created!'); // UI logic locked in the hook
    },
  });
};
```

Key points:

- The hook owns the `mutationFn` and cache invalidation — these are always the same regardless of where the mutation is used.
- The consumer's `onSuccess` is called **after** the invalidation, so the cache is already updated when the callback runs.
- `onError`, `onSettled`, and any other `useMutation` options can be overridden the same way.

---

### Rule 2: Prefer `mutate()` over `mutateAsync()`

Use `mutate()` with callbacks. Reserve `mutateAsync()` only when you need to await the result (e.g., sequential mutations).

#### Correct

```tsx
// mutate() — errors handled by callbacks, no try/catch needed
mutation.mutate(data, {
  onSuccess: () => toast.success('Created!'),
  onError: (error) => toast.error(error.message),
});
```

#### Incorrect

```tsx
// mutateAsync() without try/catch — unhandled promise rejection
const handleSubmit = async (data) => {
  await mutation.mutateAsync(data); // throws on error!
  toast.success('Created!');
};

// mutateAsync() correctly used (but mutate() would be simpler)
const handleSubmit = async (data) => {
  try {
    await mutation.mutateAsync(data);
    toast.success('Created!');
  } catch (error) {
    toast.error(error.message);
  }
};
```

---

### Rule 3: Invalidate at the right granularity

Use the query key hierarchy to invalidate only what's needed. Broader invalidation is safer, narrower is more efficient.

#### Correct

```tsx
// After creating a product — invalidate all product queries
queryClient.invalidateQueries({ queryKey: productQueries.all().queryKey });
// → refetches: product lists, product details, product searches

// After updating a specific product — invalidate that detail + lists
queryClient.invalidateQueries({ queryKey: productQueries.all().queryKey });
// Or more targeted:
queryClient.invalidateQueries({
  queryKey: productQueries.detail(updatedId).queryKey,
});
queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
```

#### Incorrect

```tsx
// Nuclear option — invalidates EVERYTHING in the cache
queryClient.invalidateQueries(); // never do this

// Too narrow — forgot to invalidate the list
queryClient.invalidateQueries({
  queryKey: productQueries.detail(id).queryKey,
});
// list still shows old data
```

---

### Rule 4: Optimistic updates — snapshot, update, rollback

For instant UI feedback, apply changes optimistically before the server confirms. Always implement rollback on error.

#### Correct

```tsx
export const useUpdateProduct = ({
  onMutate,
  onError,
  onSettled,
  ...options
}: Omit<UseMutationOptions<Product, Error, Product>, 'mutationFn'> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updatedProduct: Product) => updateProduct(updatedProduct),

    onMutate: async (updatedProduct) => {
      // 1. Cancel in-flight queries to avoid overwriting our optimistic update
      await queryClient.cancelQueries({
        queryKey: productQueries.detail(updatedProduct.id).queryKey,
      });

      // 2. Snapshot current data for rollback
      const previousProduct = queryClient.getQueryData(
        productQueries.detail(updatedProduct.id).queryKey,
      );

      // 3. Apply optimistic update
      queryClient.setQueryData(
        productQueries.detail(updatedProduct.id).queryKey,
        updatedProduct,
      );

      // 4. Return context for onError rollback
      return { previousProduct };
    },

    onError: (_error, updatedProduct, context) => {
      // Rollback to snapshot
      if (context?.previousProduct) {
        queryClient.setQueryData(
          productQueries.detail(updatedProduct.id).queryKey,
          context.previousProduct,
        );
      }
    },

    onSettled: (_data, _error, updatedProduct) => {
      // Always refetch to ensure consistency with server
      queryClient.invalidateQueries({
        queryKey: productQueries.detail(updatedProduct.id).queryKey,
      });
    },

    ...options,
  });
};
```

---

### Rule 5: Handle concurrent mutations with `isMutating`

When multiple mutations can target the same cache entry, avoid premature invalidation. Only invalidate when the last mutation settles.

#### Correct

```tsx
export const useUpdateProduct = ({
  onSettled,
  ...options
}: Omit<UseMutationOptions<Product, Error, Product>, 'mutationFn'> = {}) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProduct,
    mutationKey: ['products', 'update'],

    onSettled: (...params) => {
      // Only invalidate when this is the LAST pending mutation
      if (queryClient.isMutating({ mutationKey: ['products', 'update'] }) === 1) {
        queryClient.invalidateQueries({ queryKey: productQueries.all().queryKey });
      }
      onSettled?.(...params);
    },

    ...options,
  });
};
```

#### Incorrect

```tsx
// Every mutation invalidates — earlier mutations' refetches get overwritten
const mutation = useMutation({
  mutationFn: updateProduct,
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: productQueries.all().queryKey });
    // If 3 mutations are pending, this triggers 3 refetches — wasteful
  },
});
```

---

## Edge Cases

- **Return value from onSuccess**: If your `onSuccess` callback returns a promise (e.g., `return queryClient.invalidateQueries(...)`), the mutation stays in `pending` state until the invalidation completes. This is useful to keep the loading spinner visible during the refetch.
- **Callbacks on `mutate()` vs on `useMutation`**: Callbacks on `useMutation` always fire. Callbacks on `mutate()` only fire if the component is still mounted. Use `useMutation` callbacks for cache operations, `mutate()` callbacks for UI feedback (toast, navigation).
- **Single argument**: `mutationFn` receives exactly one argument. Pass an object if you need multiple values:
  ```tsx
  mutationFn: ({ id, data }: { id: string; data: UpdateInput }) => updateProduct(id, data),
  ```

---

> Decision rationale:
> - [D-08 — Invalidation vs setQueryData](../decisions/D-08-invalidation-vs-setquerydata.md)
> - [D-09 — When optimistic updates are worth it](../decisions/D-09-optimistic-updates-when.md)
