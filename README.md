# wazoo-e2e

Reusable end-to-end integration and smoke test assertion flows for the Wazoo platform.
Houses the world lifecycle, world auth token management, and SPARQL query round-trip
assertions so every consumer (console e2e specs, QA gates, scripts) shares one source of
truth instead of duplicating them.

## Assertions

| Export                     | Flow                                                                        |
| -------------------------- | --------------------------------------------------------------------------- |
| `testWorldLifecycle()`     | Owner user resolves; world is created in `ACTIVE` state.                    |
| `testTokenManagement()`    | World auth token is minted and the secret is returned.                      |
| `testSparqlQuery()`        | SPARQL `INSERT DATA` succeeds, then `SELECT` returns the expected bindings. |
| `runWorldLifecycleSuite()` | Chains the three assertions in order and best-effort cleanup.               |

Assertions are framework-agnostic: they operate on the minimal `E2eClient` interface and
return `AssertionResult { name, passed, detail }`, so each runner maps them to its own
primitives.

## Usage

```ts
import {
  createPlaywrightClient,
  createWorldContext,
  runWorldLifecycleSuite,
} from "wazoo-e2e"

// Inside a Playwright test with the `request` fixture:
const client = createPlaywrightClient(request)
const context = createWorldContext(client, {
  apiBaseUrl: process.env.API_BASE_URL ?? "http://localhost:8080",
  worldsApiUrl: process.env.WORLDS_API_URL ?? "http://localhost:8081",
  adminToken: process.env.WAZOO_PLATFORM_ADMIN_TOKEN!,
})
const results = await runWorldLifecycleSuite(context)
for (const result of results) {
  expect(result.passed, `${result.name}: ${result.detail}`).toBe(true)
}
```

Outside Playwright, use `createFetchClient()` for a plain `fetch`-backed client.

## Development

```sh
npm install
npm run typecheck
npm test
npm run format:check
npm run build
```
