# wazoo-e2e

Reusable end-to-end integration and smoke test assertion flows for the Wazoo platform.
Houses the world lifecycle, world auth token management, SPARQL query round-trip, and
prod-health smoke assertions so every consumer (console e2e specs, QA gates, scripts)
shares one source of truth instead of duplicating them.

## Assertions

| Export                                   | Flow                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `testWorldLifecycle()`                   | Owner user resolves; world is created in `ACTIVE` state.                    |
| `testTokenManagement()`                  | World auth token is minted and the secret is returned.                      |
| `testSparqlQuery()`                      | SPARQL `INSERT DATA` succeeds, then `SELECT` returns the expected bindings. |
| `runWorldLifecycleSuite()`               | Chains the three assertions in order and best-effort cleanup.               |
| `testProdHealth()`                       | Prod-health family: app redirect, API health, OpenAPI, and 401 checks.      |
| `testUnauthenticatedAppRedirect()`       | Unauthenticated console app route redirects (3xx) instead of serving.       |
| `testApiHealth()`                        | Management/words API and console `/api/health` return `status: ok`.         |
| `testOpenApiReachable()`                 | Management/words API OpenAPI specs expose `openapi` + `paths`.              |
| `testUnauthenticatedApiCallsReturn401()` | Unauthenticated API calls return 401 on both APIs.                          |
| `testConsoleLandingPage()`               | Browser page loads, renders `<body>`, with no console/page errors.          |

Assertions are framework-agnostic: they operate on the minimal `E2eClient` interface (or
the structural `PageLike` for the browser-based landing-page check) and return
`AssertionResult { name, passed, detail }`, so each runner maps them to its own
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

### Prod-health checks

```ts
import {
  createPlaywrightClient,
  testConsoleLandingPage,
  testProdHealth,
} from "wazoo-e2e"

const config = {
  consoleBaseUrl: process.env.BASE_URL ?? "https://console.wazoo.dev",
  apiBaseUrl: process.env.API_BASE_URL ?? "https://api.wazoo.dev",
  worldsApiUrl: process.env.WORLDS_API_URL ?? "https://worlds-api.wazoo.dev",
}

// Inside a Playwright test with `request` and `page` fixtures:
const results = await testProdHealth(createPlaywrightClient(request), config)
for (const result of results) {
  expect(result.passed, `${result.name}: ${result.detail}`).toBe(true)
}

const landing = await testConsoleLandingPage(page)
expect(landing.passed, `${landing.name}: ${landing.detail}`).toBe(true)
```

## Live QA smoke gate

`npm run smoke` builds the package and runs the full suite against the environment from
`API_BASE_URL` / `WORLDS_API_URL` (defaults to `https://api-qa.wazoo.dev` /
`https://worlds-api-qa.wazoo.dev`), using `WAZOO_PLATFORM_ADMIN_TOKEN` for admin auth.
It exits non-zero on any assertion failure, so it can be wired into CI as a cross-repo
gate:

```sh
API_BASE_URL=https://api-qa.wazoo.dev \
WORLDS_API_URL=https://worlds-api-qa.wazoo.dev \
WAZOO_PLATFORM_ADMIN_TOKEN=wzp_... \
npm run smoke
```

## Development

```sh
npm install
npm run typecheck
npm test
npm run format:check
npm run build
```
