# Components and Hooks — Page-Specific vs Reusable

> How to decide where a component or hook belongs, and the criteria for each.

## Rules

### Rule 1: Two locations, two intentions

| | Page-specific | Reusable |
|---|---|---|
| **Location** | `src/pages/<page>/_components/` or `_hooks/` | `src/components/` or `src/hooks/` |
| **Prefix** | `_` (underscore = private to this page) | No prefix (public to the app) |
| **Import path** | Relative: `./_components/MyCell.component` | Absolute: `@/components/CommonCells/MyCell` |
| **Coupling** | Tight — knows the page's data model, routing, context | Loose — generic props, no page knowledge |
| **Reuse** | One page only | 2+ pages minimum |
| **Deletion** | Removed with the page | Requires impact analysis |

---

### Rule 2: Start page-specific, promote when needed

Every component and hook starts in `_components/` or `_hooks/`. Only promote to `src/components/` or `src/hooks/` when **all** of these are true:

1. **Used in 2+ places** — It is actually needed by at least two different pages or features. Don't anticipate reuse.
2. **Generic interface** — It can work with simple, decoupled props. No dependency on a specific page's data model or route structure.
3. **Cohesion benefit** — Moving it to a shared location reduces duplication and ensures consistency (e.g., a status badge should look the same everywhere).

#### Correct — promotion

```tsx
// Started as: src/pages/services/listing/_components/StatusCell.component.tsx
// Used by: services listing, vaults listing, agents listing
// → Promoted to:
// src/components/CommonCells/ResourceStatusCell/ResourceStatusCell.component.tsx

type ResourceStatusCellProps = {
  status: ResourceStatus; // generic — not tied to any specific entity
};

export const ResourceStatusCell = ({ status }: ResourceStatusCellProps) => {
  const color = getResourceStatusColor(status);
  return <Badge color={color}>{status}</Badge>;
};
```

#### Incorrect — premature promotion

```tsx
// ❌ Created directly in src/components/ because "it might be reused"
// But it's only used by the agents listing page
// → Should stay in src/pages/agents/_components/
export const AgentPolicyCell = ({ agent }: { agent: Agent }) => {
  return <span>{agent.policy}</span>;
};
```

---

### Rule 3: Reusable components have generic, minimal props

A reusable component should not import page-specific types, hooks, or context. Its props are the minimum needed to render.

#### Correct

```tsx
// src/components/CommonCells/ResourceLocationCell/ResourceLocationCell.component.tsx
type ResourceLocationCellProps = {
  region: string; // just a string — works with any entity that has a region
};

export const ResourceLocationCell = ({ region }: ResourceLocationCellProps) => {
  const { data: location } = useLocationDetails(region);
  return <span>{location?.label ?? region}</span>;
};
```

#### Incorrect

```tsx
// ❌ Takes a full Resource<VspcTenant> — coupled to a specific entity
type Props = {
  tenant: Resource<VspcTenant>;
};

export const LocationCell = ({ tenant }: Props) => {
  return <span>{tenant.currentState.region}</span>;
};
```

---

### Rule 4: Reusable hooks abstract shared logic

Reusable hooks in `src/hooks/` provide app-wide utilities: feature flags, guide URLs, route param validation, etc. They know nothing about specific pages.

#### Examples

```tsx
// src/hooks/useRequiredParams.ts
// Extracts and validates required route params — used by every dashboard page
export const useRequiredParams = <T extends string>(params: T[]) => {
  const routeParams = useParams();
  // throws if any required param is missing
  return pick(routeParams, params) as Record<T, string>;
};

// src/hooks/useGuideUtils.ts
// Returns localized guide links — used on almost every page
export const useGuideUtils = () => {
  const { subsidiary } = useShell();
  return useMemo(() => ({
    main: guideLinks[subsidiary]?.main,
    agent: guideLinks[subsidiary]?.agent,
    // ...
  }), [subsidiary]);
};

// src/hooks/useGetFeatureAvailability.ts
// Feature flag check — used to conditionally render features
export const useGetFeatureAvailability = (feature: string) => {
  return useQuery(featureAvailabilityOptions(feature));
};
```

---

### Rule 5: Keep it readable, testable, maintainable

The organization (page-specific vs reusable) is a guideline. The real criteria are:

- **Readable** — A developer opening the file understands its purpose in < 30 seconds.
- **Testable** — The component/hook can be unit tested in isolation with clear inputs/outputs.
- **Maintainable** — Changing it doesn't require changes in unrelated parts of the app.
- **Business-driven** — It solves a concrete need, not an abstract "it might be useful" scenario.

If a component is page-specific but big, break it down with nested `_components/`. If a reusable component is becoming too complex with too many props to cover every use case, consider if it should stay page-specific instead.

---

## Organization patterns

### Reusable components — group by category

```
src/components/
├── CommonCells/             ← cells used in multiple Datagrids
│   ├── ResourceStatusCell/
│   ├── ResourceLocationCell/
│   └── ArrowLinkCell/
├── CommonTiles/             ← tiles used in multiple dashboards
│   └── GeneralInformationTile/
├── CommonFields/            ← form fields used in multiple forms
│   └── BaremetalOption/
└── ResourceStatusBadge/     ← standalone reusable component
```

### Reusable hooks — flat

```
src/hooks/
├── useGuideUtils.ts
├── useGetFeatureAvailability.ts
├── useMainGuideItem.ts
├── useRequiredParams.ts
└── __tests__/
```

---

## Decision flowchart

```
Is this component/hook used by only ONE page?
  → YES → Put it in _components/ or _hooks/ of that page

Is it used by 2+ pages?
  → YES → Can it work with generic, decoupled props?
    → YES → Promote to src/components/ or src/hooks/
    → NO  → Keep separate copies in each page's _components/
            (duplication is better than wrong abstraction)
```
