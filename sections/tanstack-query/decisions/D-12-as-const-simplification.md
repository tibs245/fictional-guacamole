# D-12: `as const` placement — outer object only

**Status**: Adopted
**Date**: 2026-02-10
**Impacts**: [guides/01-query-keys.md](../guides/01-query-keys.md), [guides/02-query-options.md](../guides/02-query-options.md)

## Context

The original `queryKeys` pattern applied `as const` on every line — on each array literal and on each arrow function return value. This was inherited from older TypeScript versions where `as const` was required per-expression for readonly tuple inference.

```tsx
// Before — as const on every line (redundant)
export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (filters: ProductFilters) => [...queryKeys.products.all, 'list', { filters }] as const,
    detail: (id: string) => [...queryKeys.products.all, 'detail', id] as const,
  },
} as const;
```

With TypeScript in strict mode (`strict: true` in `tsconfig.json`), the outer `as const` on the object declaration is sufficient to infer all nested properties as deeply readonly. The inner assertions are redundant noise.

## Arguments For (outer-only `as const`)

- **Less visual clutter**: One `as const` at the end vs. one per line. The queryKeys file is easier to read and maintain.
- **TypeScript strict mode handles inference**: With `strict: true`, TypeScript infers readonly tuple types from the outer assertion. No per-expression assertion needed.
- **Reduces copy-paste errors**: Developers adding new keys no longer need to remember `as const` on each line. The outer assertion covers everything.
- **Consistent with modern TypeScript idioms**: TypeScript 5+ community patterns favor a single `as const` on the declaration.

## Arguments Against (trade-offs accepted)

- **Arrow function return types**: Strictly speaking, `as const` on the outer object makes the function references readonly, but does not automatically make the return types of arrow functions readonly tuples. In practice, this has no impact because TanStack Query's `queryKey` parameter accepts both `readonly` and mutable arrays, and `queryOptions()` handles type inference.
- **Requires strict mode**: Projects without `strict: true` may need per-expression `as const`. This is acceptable since strict mode is a prerequisite for all our guides.

## Verdict

**Apply `as const` once on the outer `queryKeys` object declaration. Remove all inner `as const` assertions.**

```tsx
// After — clean, single as const
export const queryKeys = {
  products: {
    all: ['products'],
    list: (filters: ProductFilters) =>
      [...queryKeys.products.all, 'list', { filters }],
    detail: (id: string) => [...queryKeys.products.all, 'detail', id],
  },
} as const;
```

## References

- [TypeScript handbook — const assertions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions)
- [TanStack Query v5 — Query Keys](https://tanstack.com/query/v5/docs/react/guides/query-keys)

## History

- 2026-02-10: Created — simplified `as const` placement to outer object only
