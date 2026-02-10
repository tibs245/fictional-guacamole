# TanStack Query v5 — Documentation Index

> Entry point for LLM agents. Read this file first, then open only the guide(s) you need.

## Guides (for code generation)

| File | Use when you need to... |
|------|------------------------|
| [01-query-keys](./guides/01-query-keys.md) | Define query keys in `/src/data/queryKeys.ts` (foundation) |
| [02-query-options](./guides/02-query-options.md) | Declare query options, create a `*.queries.ts` factory file |
| [03-use-query](./guides/03-use-query.md) | Fetch and display data with `useQuery` |
| [04-select](./guides/04-select.md) | Transform or filter fetched data for a component |
| [05-use-suspense-query](./guides/05-use-suspense-query.md) | Load data with React Suspense boundaries |
| [06-use-queries](./guides/06-use-queries.md) | Run multiple queries in parallel (dynamic list) |
| [07-dependent-queries](./guides/07-dependent-queries.md) | Chain queries where B depends on A's result |
| [08-mutations](./guides/08-mutations.md) | Create, update, or delete server data |
| [09-testing](./guides/09-testing.md) | Unit test select functions and page components |

## Routing table

```
"I need to define query keys for a feature"
  → 01-query-keys

"I need to create a queries file for a feature"
  → 01-query-keys + 02-query-options

"I need to fetch data and display it"
  → 01-query-keys + 02-query-options + 03-use-query

"I need to transform/filter the data I fetched"
  → 04-select (assumes 01 + 02 + 03)

"I need query B to wait for query A"
  → 07-dependent-queries (assumes 01 + 02)

"I need to load data with Suspense"
  → 05-use-suspense-query (assumes 01 + 02)

"I need to run N queries in parallel"
  → 06-use-queries (assumes 01 + 02)

"I need to create/update/delete a resource"
  → 08-mutations (assumes 01 + 02)

"I need to unit test my queries or page components"
  → 09-testing (assumes 02 + 04)

"I need to set up QueryClient for a new project"
  → 10-query-client-setup
```

## Dependencies between guides

```
01-query-keys     ← foundation, no dependencies — define keys first
02-query-options  ← requires 01
03-use-query      ← requires 01, 02
04-select         ← requires 01, 02, 03
05-use-suspense   ← requires 01, 02
06-use-queries    ← requires 01, 02
07-dependent      ← requires 01, 02
08-mutations      ← requires 01, 02
09-testing        ← requires 02, 04
```

## Decisions (for humans challenging practices)

The `decisions/` folder contains Architecture Decision Records (ADRs) explaining **why** each practice was chosen. These are not needed for code generation — they exist for developers who want to understand, challenge, or evolve the practices via PR.

| ADR | Decision | Related guide |
|-----|----------|---------------|
| [D-01](./decisions/D-01-query-options-mandatory.md) | queryOptions() mandatory vs inline | 02-query-options |
| [D-02](./decisions/D-02-query-keys-colocation.md) | Centralized queryKeys.ts vs co-located keys | 01-query-keys |
| [D-03](./decisions/D-03-no-state-duplication.md) | Never copy query data into useState | 03-use-query |
| [D-04](./decisions/D-04-select-vs-queryfn.md) | select vs queryFn transformation | 04-select |
| [D-05](./decisions/D-05-suspense-vs-usequery.md) | useSuspenseQuery vs useQuery default | 05-use-suspense-query |
| [D-06](./decisions/D-06-use-queries-vs-multiple.md) | useQueries vs multiple useQuery | 06-use-queries |
| [D-07](./decisions/D-07-dependent-queries-pattern.md) | Separate chained queries vs single queryFn | 07-dependent-queries |
| [D-08](./decisions/D-08-invalidation-vs-setquerydata.md) | Invalidation vs setQueryData after mutation | 08-mutations |
| [D-09](./decisions/D-09-optimistic-updates-when.md) | When optimistic updates are worth it | 08-mutations |
| [D-10](./decisions/D-10-staletime-strategy.md) | staleTime default and cache strategy | 09-query-client-setup |
| [D-11](./decisions/D-11-error-handling-strategy.md) | Error handling — Boundaries vs local vs global | 09-query-client-setup |
| [D-12](./decisions/D-12-as-const-simplification.md) | `as const` on outer object only (not per-line) | 01-query-keys |
| [D-13](./decisions/D-13-query-key-naming-conventions.md) | Standardized query key naming (`all`, `list`, `detail`) | 01-query-keys |
