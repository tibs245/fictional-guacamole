# D-13: Standardized query key naming conventions

**Status**: Adopted
**Date**: 2026-02-10
**Impacts**: [guides/01-query-keys.md](../guides/01-query-keys.md)

## Context

Query key factories used inconsistent naming across the codebase. Some features used `byId`, `byUser`, `byResource`, or `listByCategory` for their query key methods, while others followed the `all` / `list` / `detail` convention. This inconsistency made the cache structure harder to understand and invalidation patterns less predictable.

## Decision

**All query key factories must use the following standardized vocabulary:**

| Keyword | Role | Signature |
|---------|------|-----------|
| `all` | Everything for a feature — no pagination. Used as `queryKey` in `queryOptions` AND as prefix for invalidation. | `readonly array` (not a function) |
| `list` | Paginated or filtered collection | `(filters) => array` |
| `detail` | Single entity by identifier | `(id) => array` |
| `search` | Text search queries | `(query) => array` |

No intermediate scope functions (`lists()`, `details()`) — invalidate with `all` instead. Over-invalidating is cheap and avoids stale-data bugs. The naming in `queryKeys` mirrors the naming in `queryOptions` factories: `all` → `all`, `list` → `list`, `detail` → `detail`.

### `all` vs `list` — when to use which

- **`all`**: Fetches the full collection without pagination (e.g., a dropdown, a short reference list). The `queryOptions` factory exposes `productQueries.all()` which uses `queryKeys.products.all` directly. Also serves as the root prefix for invalidation.
- **`list(filters)`**: Fetches a paginated or filtered subset. Requires filters. Use when the data is too large to fetch everything or when the UI needs pagination/filtering.

### Forbidden patterns

- `byId(id)` → use `detail(id)`
- `byUser(userId)` → use `detail(userId)` or `list({ userId })` depending on cardinality
- `byResource(resourceId)` → use `detail(resourceId)`
- `listByCategory(cat)` → use `list({ category: cat })`
- Any other `by*` or `listBy*` variant → use `list` or `detail`

### How to choose between `detail` and `list`

- **`detail(id)`**: the query returns a single entity (or a single entity's associated data). The parameter identifies **one** resource.
- **`list(filters)`**: the query returns a collection. The parameter narrows the collection.

## Arguments For

- **Predictable cache structure**: Any developer can guess the key for "all products" (`queryKeys.products.all`) or "one product" (`queryKeys.products.detail(id)`) without reading the code. The naming in `queryKeys` matches the `queryOptions` factory.
- **Simple invalidation**: `invalidateQueries({ queryKey: queryKeys.products.all })` invalidates everything for a feature — no need to think about scope.
- **Aligned with ecosystem**: `all` is the standard in TkDodo's pattern and TanStack docs. No onboarding cost for developers familiar with the ecosystem.
- **LLM-friendly**: Standardized naming reduces ambiguity for code generation agents.

## Arguments Against (trade-offs accepted)

- **Less descriptive**: `detail(userId)` is less self-documenting than `byUser(userId)`. Mitigated by the hierarchical structure — the feature name provides context (`orderQueries.detail(userId)` clearly means "orders for this user").

### Considered alternative: `_root` instead of `all`

We considered renaming `all` to `_root` to signal that the root prefix is "internal plumbing". This was rejected for two reasons:

1. **Non-standard**: No article, doc, or blog in the ecosystem uses `_root`. A developer arriving on the project would not know where to look. `all` is immediately recognizable.
2. **`all` serves a dual role**: It is both a valid `queryKey` (for "fetch everything without pagination" via `productQueries.all()`) and the root prefix for invalidation. Calling it `_root` would imply it shouldn't be used in `queryOptions`, which is incorrect — `all` is a legitimate query.

## References

- [TkDodo — Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys)

## History

- 2026-02-10: Created — standardized naming vocabulary for query key factories
- 2026-02-10: Added trade-off analysis — rejected `_root` in favor of `all` (dual role: queryKey + invalidation prefix)
