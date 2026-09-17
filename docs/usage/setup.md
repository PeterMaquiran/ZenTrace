# Development setup

Requirements:

- Node.js 22+
- pnpm 11+
- Chrome (extension + Playwright)

```bash
git clone https://github.com/PeterMaquiran/ZenTrace.git
cd ZenTrace
pnpm install
```

Husky hooks install via the `prepare` script. If they are not active:

```bash
git config core.hooksPath .husky
chmod +x .husky/*
```

## Commands

```bash
pnpm dev:ui          # DevTools panel UI
pnpm dev:demo        # Instrumented demo app
pnpm build:package   # Library output in dist/
pnpm build:extension # Chrome extension bundle
pnpm test:package    # Vitest
pnpm test:extension  # Playwright (headed Chrome + extension)
```

Load the built `extension/` folder in `chrome://extensions/` (Developer mode →
Load unpacked). Details are in the [root README](../../README.md).

Optional local overrides go in `.env.local` (do not commit it).
