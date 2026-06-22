# Security Policy

## Supported versions

ZenTrace is in early development (`0.x`). Security fixes are applied to the latest release on the default branch.

| Version | Supported |
| ------- | --------- |
| 0.0.x   | ✅        |
| < 0.0   | ❌        |

## Reporting a vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, report them privately using one of these channels:

1. **[GitHub Private Security Advisory](https://github.com/PeterMaquiran/ZenTrace/security/advisories/new)** (preferred)
2. Open a minimal issue asking maintainers for a private contact path (do not include exploit details publicly)

Include as much detail as you can:

- Description of the vulnerability and potential impact
- Steps to reproduce or a proof of concept
- Affected versions or components (library, extension, UI)
- Any suggested fix, if you have one

## What to expect

- **Acknowledgment** within 7 days
- **Status update** within 14 days with triage outcome or next steps
- **Coordinated disclosure** — we will agree on a reasonable timeline before publishing details

We appreciate responsible disclosure and will credit reporters in the advisory or release notes when they wish to be named.

## Scope

The following are in scope for security reports:

- The `zentrace` npm package and its runtime behavior
- The Chrome extension and DevTools panel
- Supply-chain or CI configuration that could affect contributors or users

The following are generally out of scope:

- Issues that require a user to run untrusted code with ZenTrace enabled in development
- Denial-of-service from intentionally tracing extremely large payloads when argument capture is enabled (documented dev-time behavior)
- Vulnerabilities in third-party dependencies already fixed upstream — please still report if our pinned version is affected

## Safe usage notes

ZenTrace is designed for **local development and debugging**. It can capture function arguments, return values, and HTTP details when explicitly enabled. Do not enable sensitive argument capture against production data or secrets.
