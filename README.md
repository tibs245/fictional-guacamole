# 🥑 Fictional Guacamole
## (or future @ovh-ux/ai-rules)

AI rules, guides, and agents for development in the [ovh/manager](https://github.com/ovh/manager) monorepo.

This package provides a set of **standardized best practices**, designed to be consumed by AI tools (Cursor, GitHub Copilot, Claude, etc.) in order to generate code that is consistent and aligned with OVHcloud Manager project conventions.

## Why this project?

- **Code guides** that LLMs follow to generate code conforming to project patterns
- **Architecture Decision Records (ADR)** that document the *why* behind each practice
- **Specialized agents** capable of executing complex tasks (scaffolding, refactoring) end to end
- **An interactive installer** that deploys rules in the native format of each IDE

## Available sections

Content is organized into three independent sections:

### TanStack Query

Patterns for data fetching with TanStack Query v5.

| Content | Description |
|---------|-------------|
| 9 guides | Query keys, query options, useQuery, select, useSuspenseQuery, useQueries, dependent queries, mutations, testing |
| 13 ADR | Architectural decisions (key centralization, invalidation vs setQueryData, staleTime strategy, etc.) |
| 1 agent | `generate-query` — scaffolds a complete feature from an API schema |

### Project Structure

Page, component, hook, and test architecture.

| Content | Description |
|---------|-------------|
| 4 guides | Page architecture (Shell + Content), components/hooks, testing strategy, test utilities |
| 1 ADR | Suspense boundary pattern (Shell + Content) |
| 1 agent | `refactor-suspense-boundary` — migrates existing pages to the Shell + Content pattern |

### Monorepo Workflow

Lint, build, and test commands for working in the monorepo.

| Content | Description |
|---------|-------------|
| 1 guide | Lint, build, test — execution order and best practices |

## Project architecture

```
@ovh-ux/ai-rules/
├── bin/
│   └── install.js                # Interactive CLI
├── installers/
│   ├── cursor.js                 # Generates .cursor/rules/*.mdc
│   └── copilot.js                # Generates .github/instructions/*.md
├── commands/
│   └── commit.md                 # Conventional commit guide
├── sections/
│   ├── tanstack-query/
│   │   ├── 00-index.md           # Routing table for agents
│   │   ├── guides/               # 9 code guides
│   │   ├── decisions/            # 13 ADR
│   │   ├── agents/               # generate-query agent
│   │   └── CHANGELOG.md
│   ├── project-structure/
│   │   ├── 00-index.md
│   │   ├── guides/               # 4 guides
│   │   ├── decisions/            # 1 ADR
│   │   └── agents/               # refactor-suspense-boundary agent
│   └── monorepo-workflow/
│       ├── 00-index.md
│       └── guides/               # 1 guide
└── package.json
```

### How AI agents navigate the rules

Each section contains a `00-index.md` file that serves as a **routing table**. When an AI agent works on a task, it:

1. Reads the index of the relevant section
2. Identifies the guide(s) to load using the routing table
3. Follows the dependency graph between guides
4. Generates code that conforms to the rules

Routing table example:

```
"I need to create a queries file for a feature"
  → 01-query-keys + 02-query-options

"I need to write tests for my page"
  → 03-testing-strategy
```

## Installation

### Prerequisites

- Node.js >= 18

### Install the package

```bash
git clone git@github.com:tibs245/fictional-guacamole.git /tmp/fictional-guacamole
# then
node /tmp/fictional-guacamole/bin/install.js
```

The interactive installer guides you through three steps:

1. **Target directory** — where to install the rules (default: current directory)
2. **Sections** — choose which sections to install (or all)
3. **Target IDE** — Cursor or GitHub Copilot

### Output by IDE

#### Cursor

Rules are generated as `.mdc` files in `.cursor/rules/`:

```
.cursor/rules/
├── tanstack-query-index.mdc           # Auto-attached on src/data/**
├── tanstack-query-01-query-keys.mdc   # Loaded by AI via description
├── tanstack-query-02-query-options.mdc
├── ...
├── tanstack-query-decisions.mdc       # All ADRs grouped together
└── tanstack-query-generate-query.mdc  # Agent
```

- The **index** is auto-attached via glob (loads automatically when you edit files matching the pattern)
- **Guides** are loaded on demand by the AI via their `description` field
- **ADRs** are grouped into a single file for manual reference

#### GitHub Copilot

Rules are generated in `.github/instructions/`:

```
.github/instructions/
├── tanstack-query-guides.instructions.md      # All guides + index
├── tanstack-query-decisions.instructions.md   # All ADRs
└── tanstack-query-generate-query.instructions.md  # Agent
```

Each file uses the `applyTo` frontmatter to define which files the instructions apply to.

## Tech stack

This package produces rules for projects using:

- **React 18+** with Suspense and Error Boundaries
- **TanStack Query v5** (formerly React Query)
- **TypeScript** (strict mode)
- **React Router v6+**
- **ODS** (OVHcloud Design System)
- **Vitest** + **React Testing Library** + **MSW** for testing
- **react-i18next** for internationalization

## Contributing

The practices documented here are not set in stone. Each guide is accompanied by ADRs that explain the reasoning behind each decision. To propose a change:

1. Read the corresponding ADR in `sections/<section>/decisions/`
2. Use AI to challenge your proposed changes with full knowledge of the decision history
3. Open a PR with your proposed change
4. Update the ADR to reflect the new decision
