# Project Structure — Documentation Index

> How to organize pages, components, hooks, and tests in a module/app.

## Guides

| File | Use when you need to... |
|------|------------------------|
| [01-page-architecture](./guides/01-page-architecture.md) | Create a page, understand `_components/` and `_hooks/` |
| [02-components-and-hooks](./guides/02-components-and-hooks.md) | Create a component or hook — page-specific vs reusable |
| [03-testing-strategy](./guides/03-testing-strategy.md) | Know what to test, where to put tests, and how |
| [04-test-utilities](./guides/04-test-utilities.md) | Set up test-utils: wrapper builder, centralized mocks, MSW |

## Routing table

```
"I need to create a new page"
  → 01-page-architecture

"I need to add a component to a page"
  → 01-page-architecture + 02-components-and-hooks

"I need to create a reusable component"
  → 02-components-and-hooks

"I need to know where to put my hook"
  → 02-components-and-hooks

"I need to write tests for my page"
  → 03-testing-strategy

"I need to write unit tests for a component or hook"
  → 03-testing-strategy

"I need to set up test-utils / mocks / wrapper builder"
  → 04-test-utilities

"I need to write integration tests with MSW"
  → 03-testing-strategy (Rule 4) + 04-test-utilities (Rules 3-4)

"I need to document a reusable component's contract"
  → 02-components-and-hooks (Rule 6)

"I need to handle loading/error states for a data-dependent page"
  → 01-page-architecture (Rule 7) + D-01 decision record

"Should I use useSuspenseQuery or useQuery?"
  → 01-page-architecture (Rule 7) + D-01 decision record

"I need to refactor a module to use Suspense boundaries"
  → Agent: refactor-suspense-boundary
```

## Agents

| File | Use when you need to... |
|------|------------------------|
| [refactor-suspense-boundary](./agents/refactor-suspense-boundary.md) | Migrate pages/components to the Shell + Content Suspense pattern |

## Decisions

| File | Topic |
|------|-------|
| [D-01-suspense-boundary-pattern](./decisions/D-01-suspense-boundary-pattern.md) | Shell + Content split with Suspense and ErrorBoundary |

## Dependencies between guides

```
01-page-architecture    ← foundation
02-components-and-hooks ← requires 01
03-testing-strategy     ← requires 01, 02
04-test-utilities       ← requires 03 (auto-attached on *.test.* / *.spec.*)
```
