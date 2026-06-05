# Git Commit Guide

This project uses **Conventional Commits (strict mode)** to keep history clean and consistent.

---

## Format

```bash
<type>(scope): <message>
```

- `type` → max 10 characters
- `scope` → optional, max 10 characters
- `message` → max 100 characters
- ❌ No footer allowed

---

## Examples

```bash
chore: setup tooling
feat(api): add login
fix(ui): button bug
refactor(core): simplify logic
test: add coverage
docs: update guide
```

---

## Types

### chore

Project setup and maintenance (no feature changes)

```bash
chore: setup husky
```

### feat

New feature

```bash
feat: add adapter
```

### fix

Bug fix

```bash
fix: sync issue
```

### refactor

Code changes without behavior change

```bash
refactor: clean logic
```

### test

Tests only

```bash
test: add tests
```

### docs

Documentation only

```bash
docs: update guide
```

---

## Rules

- Keep commits small
- One change per commit
- Use clear, short messages
- Stay under 20 chars
- Use scope when helpful
- ❌ No footer (no BREAKING CHANGE, no refs)

---

## First Commit

```bash
chore: bootstrap repo
```
