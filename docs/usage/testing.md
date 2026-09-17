# Testing

ZenTrace uses Vitest for the library and Playwright for the DevTools extension.

```bash
pnpm test:package      # unit tests
pnpm test:extension    # extension + panel (needs Chrome)
```

CI runs both (see `.github/workflows/ci.yml`).

| Change                                         | Tests to update |
| ---------------------------------------------- | --------------- |
| Spans, decorators, exporters, HTTP/log capture | Vitest          |
| DevTools panel or Chrome extension             | Playwright      |
| Docs only                                      | None            |

Playwright tests that load the extension need a headed browser. See
[playwright.md](./playwright.md) for `attachZenTrace` in your own suite.
