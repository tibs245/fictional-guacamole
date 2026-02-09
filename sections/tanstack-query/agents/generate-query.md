# Generate Query

> Scaffold a complete TanStack Query feature from an API schema: type → API function → mocks → handlers → hook.

## Required inputs

Before starting, collect these from the user:

1. **API version**: `v2` or `v6`
2. **Route**: e.g. `/backupServices/tenant/{backupServicesId}` — params are in `{curly braces}`
3. **API schema**: the response schema pasted from the API documentation

If any input is missing, ask for it before proceeding.

## Step 1 — TypeScript type

### Analyze

- Parse the schema to identify the entity fields, nested objects, enums, and optionality.
- Check `/src/types/` for existing types that can be reused (e.g. `Resource`, `CurrentTask`, `IamResource`).

### Generate

- Create or update the type file in `/src/types/<Entity>.type.ts`.
- Follow naming conventions: `PascalCase` for types, enums as union types.
- Import and reuse shared types (`Resource<T>`, `AgentResource<T>`, etc.) when the schema matches the resource wrapper pattern.

### Present to user

Show the generated type and ask for confirmation before proceeding.

## Step 2 — API function

### Analyze

- Check `/src/data/api/` for existing request files in the same domain.
- Check `/src/utils/apiRoutes.ts` (or equivalent) for existing route helpers.
- Identify path params from the route (e.g. `{backupServicesId}` → `backupServicesId: string`).

### Generate

- Create or update the request file in `/src/data/api/<domain>/<domain>.requests.ts`.
- Create a typed params interface for the function arguments.
- Add route helper in the api routes utility file if needed.
- Use the correct API client (`v2` or `v6`) based on the user's input.

```tsx
// Pattern to follow:
export const get<Entity> = async ({ param1, param2 }: Get<Entity>Params) => {
  const { data } = await <apiVersion>.get<ResponseType>(route);
  return data;
};
```

### Present to user

Show the generated API function and ask for confirmation before proceeding.

## Step 3 — Mocks

### Pause — ask for example response

Tell the user:

> I need an example API response to generate realistic mocks. Please paste a real response (I'll anonymize it) or describe what a typical response looks like.

### Generate

Once the user provides the example:

- Anonymize all sensitive data (IDs → UUIDs `a1b2c3d4-...`, names → generic names, IPs → `192.168.x.x`, dates → recent dates).
- Create the mock file in `/src/mocks/<domain>/<domain>.ts` (or `.mock.ts` depending on project convention).
- Export a typed array of mock data.
- Ensure the mock matches the TypeScript type from Step 1.

```tsx
// Pattern to follow:
export const mock<Entities>: <Type>[] = [
  {
    // anonymized data matching the type
  },
];
```

### Present to user

Show the generated mock and ask for confirmation before proceeding.

## Step 4 — MSW Handlers

### Analyze

- Check `/src/mocks/` for existing handler files to match the project's handler pattern.
- Check the test setup file (`setupMsw.ts` or equivalent) to understand how handlers are aggregated.

### Generate

- Create or update the handler file in `/src/mocks/<domain>/<domain>.handler.ts`.
- Follow the existing handler pattern in the project:

```tsx
// Pattern to follow:
export type T<Entity>MockParams = {
  is<Entity>Error?: boolean;
};

export const get<Entity>Mocks = ({
  is<Entity>Error = false,
}: T<Entity>MockParams = {}): Handler[] => [
  {
    url: '<route with :params>',
    response: () => (is<Entity>Error ? null : mock<Entities>),
    api: '<v2 or v6>',
    method: 'get',
    status: is<Entity>Error ? 500 : 200,
    delay: 0,
  },
];
```

- Update the test setup file to include the new handlers and their params type.

### Present to user

Show the generated handler and the setup update, ask for confirmation.

## Step 5 — Hook

### Analyze

- Check `/src/data/hooks/` for existing hooks to match naming and patterns.
- Determine if this query depends on another (e.g. needs a `backupServicesId` from a parent query) → use `ensureQueryData` pattern.
- Determine the query key hierarchy based on existing keys in the project.

### Generate

- Create the hook file in `/src/data/hooks/<domain>/get<Entity>.ts`.
- Export the query key constant.
- Export a `use<Entity>Options` function returning `queryOptions()`.
- Export a `use<Entity>` hook wrapping `useQuery(use<Entity>Options())`.
- If the query has nullable external params, add `enabled: !!param`.
- If the query depends on another query's result, use `ensureQueryData` in the `queryFn`.

```tsx
// Pattern to follow:
export const <ENTITY>_QUERY_KEY = ['domain', 'entity'];

export const use<Entity>Options = () => {
  // resolve dependencies if needed
  return queryOptions({
    queryKey: <ENTITY>_QUERY_KEY,
    queryFn: async () => {
      // call API function
    },
  });
};

export const use<Entity> = () => useQuery(use<Entity>Options());
```

### Present to user

Show the complete hook and ask for confirmation.

## Summary

After all steps are confirmed, show a recap:

```
✓ Type:     src/types/<Entity>.type.ts
✓ API:      src/data/api/<domain>/<domain>.requests.ts
✓ Mock:     src/mocks/<domain>/<domain>.ts
✓ Handler:  src/mocks/<domain>/<domain>.handler.ts
✓ Hook:     src/data/hooks/<domain>/get<Entity>.ts
```

## Important rules

- **Always check existing files first** — never duplicate types, routes, or mocks that already exist.
- **Follow the project's existing conventions** — naming, file structure, import paths.
- **Ask before writing** — show each generated file and get user confirmation.
- **One step at a time** — don't skip ahead.
- **Anonymize mocks** — never include real data in mock files.
