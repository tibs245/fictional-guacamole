# Monorepo Workflow — Documentation Index

> Lint, test, build, and validation commands for working inside the OVHcloud Manager monorepo.

## Guides

| File | Use when you need to... |
|------|------------------------|
| [01-lint-and-build](./guides/01-lint-and-build.md) | Run lint, test, or build after modifying code in a module |

## Routing table

```
"I modified code in a module and need to validate"
  → 01-lint-and-build

"The build fails after my changes"
  → 01-lint-and-build (Rule 3 — check temp file)

"I need to run the linter"
  → 01-lint-and-build (Rule 2)

"I need to run tests"
  → 01-lint-and-build (Rule 4)

"Lint, test, and build please"
  → 01-lint-and-build (Rule 5 — full execution order)
```
