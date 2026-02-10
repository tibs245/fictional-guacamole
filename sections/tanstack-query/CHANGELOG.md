# Changelog — TanStack Query AI Rules

## [Unreleased] — 2026-02-10

### Changed

- **`as const` simplification** (D-12): Removed redundant `as const` from every line inside the `queryKeys` object. Only the outer object declaration keeps `as const`. Applies to `01-query-keys.md`, `02-query-options.md`, and `D-02`.
- **Standardized query key naming** (D-13): All query key factory methods now follow a strict vocabulary (`all`, `list`, `detail`, `search`). Removed non-standard names `byUser`, `byId`, `byResource`, `listByCategory` from all guides.
- **Removed `lists()` / `details()` scope functions**: Intermediate scope functions add indirection without practical benefit. `list` and `detail` now spread directly from `all`. Invalidation always targets `all` — simpler, safer, and not costly.
- **Clarified `all` vs `list` distinction**: `all` is the root prefix used in `queryOptions` for "fetch everything without pagination". `list(filters)` is for paginated or filtered collections. Both exist in `queryKeys` and in the `queryOptions` factory with the same names.
- **Hardcoded key strings replaced**: Replaced inline key arrays with `queryKeys.*` references in `08-mutations.md`, `D-08`, and `04-select.md`.

### Added

- **Query key vocabulary reference** in `01-query-keys.md`: New section documenting the standard keywords (`all`, `list`, `detail`, `search`) with descriptions, types, and `all` vs `list` usage guidance.
- **D-12 — `as const` simplification**: New decision record explaining why a single `as const` on the outer object is sufficient.
- **D-13 — Query key naming conventions**: New decision record standardizing the naming vocabulary, listing forbidden patterns, and documenting the rejected `_root` alternative.

---

## Refactoring plan for existing codebases

If your codebase was written before these changes, here is a migration checklist:

### 1. Simplify `as const` in `queryKeys.ts`

**Effort**: Low — mechanical find-and-replace.

```diff
 export const queryKeys = {
   products: {
-    all: ['products'] as const,
-    lists: () => [...queryKeys.products.all, 'list'] as const,
-    detail: (id: string) => [...queryKeys.products.details(), id] as const,
+    all: ['products'],
+    list: (filters: ProductFilters) => [...queryKeys.products.all, 'list', { filters }],
+    detail: (id: string) => [...queryKeys.products.all, 'detail', id],
   },
 } as const;
```

- Remove `as const` from every line inside the object.
- Keep the **single** `as const` at the end of the object declaration.
- Verify `strict: true` is set in your `tsconfig.json`.
- Run `tsc --noEmit` to confirm no type regressions.

### 2. Remove `lists()` / `details()` scope functions

**Effort**: Low to Medium — remove scope functions and update consumers.

```diff
 export const queryKeys = {
   products: {
     all: ['products'],
-    lists: () => [...queryKeys.products.all, 'list'],
-    list: (filters) => [...queryKeys.products.lists(), { filters }],
-    details: () => [...queryKeys.products.all, 'detail'],
-    detail: (id) => [...queryKeys.products.details(), id],
+    list: (filters) => [...queryKeys.products.all, 'list', { filters }],
+    detail: (id) => [...queryKeys.products.all, 'detail', id],
   },
 } as const;
```

- Replace `queryKeys.*.lists()` invalidation calls with `queryKeys.*.all`.
- `list` and `detail` now spread from `all` directly.
- Run `tsc --noEmit` to catch all broken references.

### 3. Rename non-standard query key methods

**Effort**: Medium — requires renaming + updating all consumers.

| Find | Replace with | Notes |
|------|-------------|-------|
| `byId(id)` | `detail(id)` | Single entity lookup |
| `byUser(userId)` | `detail(userId)` or `list({ userId })` | Use `detail` if result is a single entity/view, `list` if it's a filtered collection |
| `byResource(resourceId)` | `detail(resourceId)` | Single resource lookup |
| `listByCategory(cat)` | `list({ category: cat })` | Filtered collection |
| `getAll()` / `fetchAll()` | `all()` | Full collection, no pagination |

**Steps:**
1. Update `queryKeys.ts` — rename methods.
2. Update `*.queries.ts` — update references to renamed keys.
3. Update components/hooks — update `invalidateQueries`, `getQueryData`, etc.
4. Run `tsc --noEmit` to catch all broken references.
5. Run tests to verify behavior is unchanged.

### 4. Replace hardcoded key strings

**Effort**: Low — search for string array patterns in `invalidateQueries`, `setQueryData`, `getQueryData`.

```diff
- queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
+ queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
```

**Search pattern**: Look for `queryKey: [` in your codebase outside of `queryKeys.ts`. Every hit is a candidate for replacement.
