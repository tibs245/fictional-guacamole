# Commit Command

Create a conventional commit for the current changes.

## Instructions

1. Run `git status` and `git diff --staged` to see what will be committed
2. If nothing is staged, run `git diff` to see unstaged changes
3. Analyze the changes and determine:
   - The appropriate **type** (feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert)
   - The appropriate **scope** if applicable (server, shared, android, ios, db, auth, api, docs, deps)
   - A concise description of the changes

4. Consider the user's input: $ARGUMENTS
   - If empty, infer the commit message from the changes
   - If provided, incorporate their request into the commit message

5. Format the commit message following [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   <type>(<scope>): <description>
   ```

6. Stage all relevant files with `git add`
7. Create the commit with `git commit -m "<message>"`
8. Show the result with `git log -1`

## Conventional Commit Types

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting (no code change) |
| `refactor` | Code refactoring |
| `perf` | Performance improvement |
| `test` | Adding/fixing tests |
| `build` | Build system/dependencies |
| `ci` | CI/CD configuration |
| `chore` | Maintenance tasks |
| `revert` | Revert previous commit |

## Scopes

server, shared, android, ios, db, auth, api, docs, deps

## Examples

- `/commit` → Auto-detect and commit
- `/commit add device routes` → feat(api): add device routes
- `/commit fix auth bug` → fix(auth): resolve authentication issue
- `/commit update readme` → docs: update README
