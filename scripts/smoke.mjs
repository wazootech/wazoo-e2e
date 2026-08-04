/**
 * Live QA smoke gate: runs the shared world lifecycle assertion suite
 * against the configured environment (defaults to QA).
 *
 * Env:
 *   API_BASE_URL              default https://api-qa.wazoo.dev
 *   WORLDS_API_URL            default https://worlds-api-qa.wazoo.dev
 *   WAZOO_PLATFORM_ADMIN_TOKEN  required
 *
 * Exits non-zero if any assertion fails, so CI treats it as a gate.
 */
import {
  createFetchClient,
  createWorldContext,
  runWorldLifecycleSuite,
} from "../dist/index.js"

const API_BASE_URL = process.env.API_BASE_URL ?? "https://api-qa.wazoo.dev"
const WORLDS_API_URL = process.env.WORLDS_API_URL ?? "https://worlds-api-qa.wazoo.dev"
const ADMIN_TOKEN = process.env.WAZOO_PLATFORM_ADMIN_TOKEN

if (!ADMIN_TOKEN) {
  console.error(
    "WAZOO_PLATFORM_ADMIN_TOKEN is required. Generate one locally with " +
      "`npm run launch:seed-admin` in wazoo-api and export it before running the smoke gate.",
  )
  process.exit(1)
}

console.log(`Smoke gate targets: ${API_BASE_URL} / ${WORLDS_API_URL}`)

const client = createFetchClient()
const context = createWorldContext(client, {
  apiBaseUrl: API_BASE_URL,
  worldsApiUrl: WORLDS_API_URL,
  adminToken: ADMIN_TOKEN,
})

const results = await runWorldLifecycleSuite(context)

let failed = false
for (const result of results) {
  const icon = result.passed ? "PASS" : "FAIL"
  console.log(`${icon}  ${result.name}: ${result.detail}`)
  if (!result.passed) failed = true
}

if (failed) {
  console.error("Smoke gate failed.")
  process.exit(1)
}
console.log("Smoke gate passed.")
