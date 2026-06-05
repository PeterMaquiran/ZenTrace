# Replica ORM — Development Setup

Replica ORM is a **browser-native database runtime** built with a strict **test-driven workflow**.

> The system is considered correct only when tests pass.

---

## 🧰 Requirements

- Node.js 22+
- pnpm 11+
- Chrome (recommended for Cypress)

---

## 📦 fork repo

---

## 📦 Installation

Install dependencies:

```bash id="d1"
pnpm install
```

---

## 🪝 Git Hooks (Husky)

Replica ORM uses Husky to enforce code quality before commits.

After cloning the repo, ensure hooks are active:

```bash
git config core.hooksPath .husky
```

Verify:

```bash
git config core.hooksPath
# expected: .husky
```

Make hooks executable:

```bash
chmod +x .husky/*
```

---

## 🚀 Start Development Environment

Run the full dev stack:

```bash id="d2"
pnpm dev
```

This will:

- Start Vite playground
- Open Cypress test runner
- Watch for file changes

---

## ⚙️ Environment Setup

Create a local environment file:

```bash id="d3"
.env.local
```

Example:

```bash id="d4"
PLAYGROUNDPORT=5173
```

> `.env.local` overrides `.env` for local development. Only create .env.local to override .env file.

---

## 🧪 Development Workflow (Core Principle)

Replica ORM is built using a **test-first development loop**.

### Rule:

> A feature is only valid when tests pass.

---

### Standard workflow:

1. Write or update a test (Cypress or Vitest)
2. Start dev environment:

```bash id="d5"
pnpm dev
```

1. Open Cypress test runner
2. Implement or modify code
3. Refresh tests
4. Repeat until green

---

### Mental Model

- UI is NOT source of truth
- Logs are NOT source of truth
- Only tests define correctness

---

## 🧪 Running Tests

### Unit tests

```bash id="d6"
pnpm test:unit
```

### End-to-end tests (Cypress)

```bash id="d7"
pnpm test:e2e
```

---

## 🏗 Build

```bash id="d8"
pnpm build
```

---

## 🧠 Project Philosophy

Replica ORM is built with:

- Local-first architecture
- Deterministic execution
- Test-driven validation
- Browser-native runtime

---

## 🔁 Core Development Loop

```text id="d9"
Write test → Fail → Implement → Pass → Refactor
```

---

## ⚠️ Important Notes

- Always use `pnpm`
- Node 22+ required
- Do not manually edit `.env` (use `.env.local`)
- Cypress is the primary validation tool

---

## 🚀 Summary

If tests pass → feature is correct.
If tests fail → system is broken.

---
