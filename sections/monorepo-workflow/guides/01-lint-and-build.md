# Lint, Test, and Build

> How to validate code changes in a module. Run these commands when the user asks to lint, test, or build, or when you've finished modifying code in a module.

## Rules

### Rule 1: Always run from the module directory

All commands must be executed from the module root, not the monorepo root.

```
# ✅ Correct — run from the module directory
cd packages/manager/modules/<module-name>

# ❌ Wrong — don't run from monorepo root
cd /path/to/manager
```

---

### Rule 2: Lint with `yarn lint:modern:fix`

Modern modules use `manager-lint` with an ESLint config:

```bash
yarn lint:modern:fix
```

- This runs ESLint with `--fix` on all `src/**/*.{ts,tsx}` files.
- Fix all auto-fixable issues, then review remaining errors.
- If errors remain, fix them manually and re-run until clean.

---

### Rule 3: Redirect verbose output to a temporary file

Build and test commands produce extremely verbose output that wastes context. **Always redirect to a temp file**, then read only the tail to check for success or errors.

#### Pattern

```bash
# Run command, redirect ALL output to temp file
yarn build > /tmp/<module>-build.log 2>&1

# Check the result — only read the last 30 lines
tail -n 30 /tmp/<module>-build.log
```

If the tail shows errors and you need more context:

```bash
# Read more lines around the error
tail -n 80 /tmp/<module>-build.log
```

```bash
# Search for specific error patterns in the log
grep -n "error TS" /tmp/<module>-build.log
```

The temp file avoids re-running a 2+ minute command just because the context was consumed.

#### Cleanup

**Always delete temp files when the validation session is over** (all lint/test/build pass):

```bash
rm -f /tmp/<module>-build.log /tmp/<module>-test.log
```

---

### Rule 4: Test with `yarn test <file>`

Run tests for specific files that were modified:

```bash
yarn test src/path/to/file.test.tsx > /tmp/<module>-test.log 2>&1
tail -n 30 /tmp/<module>-test.log
```

- Test output is extremely verbose (known logging issues). Always redirect to temp file.
- Run only the test files relevant to the changes — not the entire test suite.
- If the tail is unclear, search for the summary:

```bash
grep -A 5 "Tests:" /tmp/<module>-test.log
```

```bash
grep -B 2 "FAIL" /tmp/<module>-test.log
```

---

### Rule 5: Execution order

When full validation is needed:

```bash
# 1. Lint first (fastest, catches style + type issues early)
yarn lint:modern:fix

# 2. Test second (run relevant test files)
yarn test src/path/to/changed.test.tsx > /tmp/<module>-test.log 2>&1
tail -n 30 /tmp/<module>-test.log

# 3. Build last (slowest, catches compilation errors)
yarn build > /tmp/<module>-build.log 2>&1
tail -n 30 /tmp/<module>-build.log

# 4. Cleanup when everything passes
rm -f /tmp/<module>-build.log /tmp/<module>-test.log
```

Stop at the first failure — no point building if tests fail.

---

### Rule 6: When to run

| Trigger | Lint | Test | Build |
|---------|------|------|-------|
| User explicitly asks | ✅ | ✅ | ✅ |
| Finished modifying code and user asked to validate | ✅ | ✅ | ✅ |
| Quick single-file fix | Only if user asks | Only if user asks | Only if user asks |

**Do not run automatically** after every edit — wait for the user to ask or until a set of changes is complete.

---

## Quick reference

```bash
# From the module directory:
yarn lint:modern:fix                                           # lint + auto-fix

yarn test src/path/to/file.test.tsx > /tmp/mod-test.log 2>&1   # test (to temp file)
tail -n 30 /tmp/mod-test.log                                   # check result

yarn build > /tmp/mod-build.log 2>&1                           # build (to temp file)
tail -n 30 /tmp/mod-build.log                                  # check result

rm -f /tmp/mod-build.log /tmp/mod-test.log                     # cleanup
```
