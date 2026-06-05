# Git Branch Guide

This project uses a **strict branch naming convention** to keep work organized and predictable.

---

## Format

```bash id="b1"
<type>/<scope>/<short-name>
```

<type>/<scope>/<short-name>

- type → max 10 chars
- scope → max 10 chars
- short-name → max 20 chars, kebab-case
- lowercase only

---

## Examples

```bash id="b2"
feat/auth/login
fix/ui/button-crash
chore/dev/setup-husky
refactor/core/query-engine
test/api/user-sync
docs/git/branch-guide
```

---

## Types

### feat

New feature branch

```bash id="b4"
feat/auth/login
```

### fix

Bug fix branch

```bash id="b5"
fix/ui/crash
```

### chore

Maintenance / tooling

```bash id="b6"
chore/setup/eslint
```

### refactor

Code restructuring

```bash id="b7"
refactor/core/query
```

### test

Testing work

```bash id="b8"
test/api/sync
```

### docs

Documentation only

```bash id="b9"
docs/commit/guide
```

---

## Rules

- Use lowercase only
- Use kebab-case
- Keep names short and meaningful
- One purpose per branch
- Delete branch after merge
