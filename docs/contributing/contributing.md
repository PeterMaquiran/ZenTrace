# Contributing guide

The full workflow (setup, branch names, commits, PR checklist) lives in
[CONTRIBUTING.md](../../CONTRIBUTING.md) at the repo root.

Short version:

1. Branch as `type/scope/short-name` (see [git-branch-guide.md](./git-branch-guide.md))
2. Use Conventional Commits (see [commit-guide.md](./commit-guide.md))
3. Add or update Vitest / Playwright tests for behavior changes
4. Run `pnpm test:package`, `pnpm lint:fix`, and `pnpm format`
5. Open a pull request with the template
