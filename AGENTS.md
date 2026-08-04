# Agent guidelines

## What this repo is

Reusable end-to-end integration and smoke test assertion flows for the Wazoo platform:
world lifecycle, world auth token management, and SPARQL query round-trips. Consumers
(wazoo-console e2e specs, QA gates, scripts) import these flows instead of duplicating
them.

## How to work here

- Keep assertions framework-agnostic: they operate on the minimal `E2eClient` interface
  in `src/client.ts`, not on Playwright/vitest primitives.
- One flow per file under `src/assertions/`, named `test<Thing>()`, returning
  `AssertionResult { name, passed, detail }`.
- Add a vitest unit test per assertion using a mock client — no live environment
  required.
- Use `package.json` scripts as the source of truth for build, test, typecheck, and
  formatting commands.
- Run `npm run typecheck`, `npm test`, and `npm run format:check` for code changes. Run
  `npm run build` before release-facing changes.
