# Project Structure — Documentation Index

> How to organize pages, components, hooks, and tests in a module/app.

## Guides

| File | Use when you need to... |
|------|------------------------|
| [01-page-architecture](./guides/01-page-architecture.md) | Create a page, understand `_components/` and `_hooks/` |
| [02-components-and-hooks](./guides/02-components-and-hooks.md) | Create a component or hook — page-specific vs reusable |
| [03-testing-strategy](./guides/03-testing-strategy.md) | Know what to test, where to put tests, and how |

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
```

## Dependencies between guides

```
01-page-architecture    ← foundation
02-components-and-hooks ← requires 01
03-testing-strategy     ← requires 01, 02
```
