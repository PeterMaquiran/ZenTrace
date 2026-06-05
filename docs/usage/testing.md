# Testing Guide

Replica ORM is validated entirely through tests.

> If tests pass, the feature works.

---

## 🧪 Test types

### Unit tests

Run logic-level tests:

```bash id="t2"
pnpm test:unit
```

---

### E2E tests (Cypress)

Run full browser validation:

```bash id="t3"
pnpm test:e2e
```

---

## 🔁 Development loop

Recommended workflow:

1. Write or update a test
2. Implement feature
3. Run Cypress
4. Refresh test
5. Repeat until green

---

## 🚨 Rule

- No feature is complete without a passing test
- UI is not a source of truth
- Logs are not a source of truth

Only tests define correctness.

---

## 🧠 Philosophy

Replica ORM is built in a **test-driven environment**:

> behavior is defined before implementation

---
