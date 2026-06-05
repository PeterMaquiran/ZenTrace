# Contributing Guide

Thank you for contributing to Replica ORM.

This project is infrastructure-level software, so contributions must follow strict consistency rules.

---

## 🧱 Code standards

- TypeScript only
- ESLint must pass
- Prettier must pass
- No unused variables
- No `any` unless justified

---

## 🧪 Testing requirement

All contributions must include tests.

### Required:

- Unit tests for logic
- E2E tests for behavior (when relevant)

Run:

```bash id="c2"
pnpm test:unit
pnpm test:e2e
```

---

## 🔁 Workflow

1. Create a branch
2. Write tests first (preferred)
3. Implement feature
4. Ensure tests pass
5. Run lint + format
6. Submit PR

---

## 🚫 Do not

- Skip tests
- Commit broken code
- Disable linting rules without reason

---

## 🧠 Philosophy

Replica ORM is built on a simple rule:

> If it is not tested, it does not exist.

---
