# Contributing to ZenTrace

Thank you for your interest in ZenTrace! We welcome bug reports, feature ideas, documentation improvements, and pull requests.

## Quick links

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Security policy](./SECURITY.md)
- [Commit message guide](./docs/contributing/commit-guide.md)
- [Branch naming guide](./docs/contributing/git-branch-guide.md)

## Ways to contribute

You do not need to write code to help:

- Report bugs with clear reproduction steps
- Suggest features or UX improvements for the DevTools panel
- Improve docs, examples, or README clarity
- Review open pull requests
- Share ZenTrace with developers who debug async JavaScript

## Development setup

### Requirements

- Node.js 22+
- pnpm 11+
- Chrome (for extension and Playwright tests)

### Install

```bash
git clone https://github.com/PeterMaquiran/ZenTrace.git
cd ZenTrace
pnpm install
```

Husky hooks are installed automatically via `pnpm install` (`prepare` script). If hooks are not running:

```bash
git config core.hooksPath .husky
chmod +x .husky/*
```

### Useful commands

```bash
pnpm dev:ui          # Trace UI dev server
pnpm dev:demo        # Demo app with example traces
pnpm build:package   # Build library output
pnpm test:package    # Unit tests (Vitest)
pnpm test:extension  # Extension + UI tests (Playwright)
pnpm lint:fix        # ESLint with auto-fix
pnpm format          # Prettier
```

## Workflow

1. **Find or open an issue** — For larger changes, discuss the approach first so work is not duplicated.
2. **Fork and branch** — Use the branch naming convention below.
3. **Write or update tests** — Logic changes should include Vitest coverage. UI or extension changes may need Playwright tests.
4. **Run checks locally** — Pre-push runs unit tests and validates your branch name.
5. **Open a pull request** — Fill out the PR template and link related issues.

## Branch naming

Format: `<type>/<scope>/<short-name>`

```
feat/ui/timeline-zoom
fix/core/span-leak
docs/readme/examples
chore/ci/node-22
```

Allowed types: `feat`, `fix`, `chore`, `refactor`, `test`, `docs`

Rules enforced by `scripts/check-branch.js`:

- Lowercase only, kebab-case
- `type` and `scope`: 1–20 characters
- `short-name`: 1–20 characters

The `developer` branch is reserved for maintainers.

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/) (strict mode).

```
<type>(<scope>): <subject>
```

Examples:

```
feat(core): add span attribute helpers
fix(ui): align timeline with scroll
test(http): cover redirect propagation
docs: add playwright setup guide
chore: bump vite
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `style`, `refactor`, `test`, `perf`

Rules:

- Subject max 100 characters
- No commit footers (no `BREAKING CHANGE`, no issue refs in body)
- One logical change per commit when possible

See [docs/contributing/commit-guide.md](./docs/contributing/commit-guide.md) for details.

## Code standards

- TypeScript only
- ESLint and Prettier must pass (lint-staged runs on commit)
- Avoid `any` unless there is a strong reason
- Match existing patterns in the area you are editing
- Keep changes focused — smaller PRs are reviewed faster

## Testing expectations

| Change type                     | Expected tests                     |
| ------------------------------- | ---------------------------------- |
| Core tracing, spans, decorators | Vitest (`pnpm test:package`)       |
| HTTP / log instrumentation      | Vitest                             |
| DevTools UI or extension        | Playwright (`pnpm test:extension`) |
| Docs only                       | No tests required                  |

Before opening a PR:

```bash
pnpm test:package
pnpm lint:fix
pnpm format
```

If your change touches the extension or UI, also run:

```bash
pnpm test:extension
```

## Project layout (short)

```
src/          Library: tracing core, decorators, exporters, instrumentation
ui/           DevTools panel (Preact + Vite)
extension/    Chrome extension bridge
examples/     Runnable trace examples
docs/         Architecture and usage guides
```

See [docs/development/architecture.md](./docs/development/architecture.md) for a deeper overview.

## Pull request checklist

- [ ] Branch name follows `<type>/<scope>/<short-name>`
- [ ] Commits follow Conventional Commits
- [ ] Tests added or updated for behavior changes
- [ ] `pnpm test:package` passes
- [ ] Lint and format pass
- [ ] PR description explains **why** the change is needed
- [ ] Screenshots or recordings included for UI changes

## Getting help

- Open a [GitHub Discussion](https://github.com/PeterMaquiran/ZenTrace/discussions) or issue if you are unsure where to start
- Comment on an existing issue and ask to be assigned before starting large work

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
