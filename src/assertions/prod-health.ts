import type { E2eClient } from "../client.js"
import type { AssertionResult } from "../context.js"

/**
 * Config for the prod-health assertion family. Mirrors the environment
 * variables used by the wazoo-console e2e suite (BASE_URL, API_BASE_URL,
 * WORLDS_API_URL).
 */
export interface ProdHealthConfig {
  /** Console origin, e.g. https://console.wazoo.dev */
  consoleBaseUrl: string
  /** Management API base URL (wazoo-api). */
  apiBaseUrl: string
  /** Data-plane API base URL (worlds-api). */
  worldsApiUrl: string
}

/**
 * Assert that an unauthenticated console app route redirects (3xx) instead
 * of serving the page. Mirrors the console prod-health redirect check.
 */
export async function testUnauthenticatedAppRedirect(
  client: E2eClient,
  config: ProdHealthConfig,
): Promise<AssertionResult> {
  const name = "testUnauthenticatedAppRedirect"
  try {
    const response = await client.get(`${config.consoleBaseUrl}/worlds`, {
      maxRedirects: 0,
    })
    if (response.status < 300 || response.status >= 400) {
      return {
        name,
        passed: false,
        detail: `expected 3xx redirect from /worlds, got ${response.status}`,
      }
    }
    return {
      name,
      passed: true,
      detail: `unauthenticated /worlds redirects (${response.status})`,
    }
  } catch (err) {
    return { name, passed: false, detail: String(err) }
  }
}

/**
 * Assert the API health endpoints return ok: management API, worlds API, and
 * the console's own /api/health proxy.
 */
export async function testApiHealth(
  client: E2eClient,
  config: ProdHealthConfig,
): Promise<AssertionResult> {
  const name = "testApiHealth"
  try {
    const urls = [
      `${config.apiBaseUrl}/health`,
      `${config.worldsApiUrl}/health`,
      `${config.consoleBaseUrl}/api/health`,
    ]
    for (const url of urls) {
      const response = await client.get(url)
      if (response.status !== 200) {
        return {
          name,
          passed: false,
          detail: `expected 200 from ${url}, got ${response.status}`,
        }
      }
      const body = await response.json<{ status?: string }>()
      if (body.status !== "ok") {
        return {
          name,
          passed: false,
          detail: `expected status ok from ${url}, got ${String(body.status)}`,
        }
      }
    }
    return { name, passed: true, detail: "health endpoints report ok" }
  } catch (err) {
    return { name, passed: false, detail: String(err) }
  }
}

/**
 * Assert the OpenAPI specs are reachable and expose `openapi` + `paths`.
 */
export async function testOpenApiReachable(
  client: E2eClient,
  config: ProdHealthConfig,
): Promise<AssertionResult> {
  const name = "testOpenApiReachable"
  try {
    const urls = [
      `${config.apiBaseUrl}/openapi.json`,
      `${config.worldsApiUrl}/openapi.json`,
    ]
    for (const url of urls) {
      const response = await client.get(url)
      if (response.status !== 200) {
        return {
          name,
          passed: false,
          detail: `expected 200 from ${url}, got ${response.status}`,
        }
      }
      const body = await response.json<{ openapi?: unknown; paths?: unknown }>()
      if (body.openapi === undefined || body.paths === undefined) {
        return {
          name,
          passed: false,
          detail: `openapi.json from ${url} missing openapi/paths`,
        }
      }
    }
    return { name, passed: true, detail: "OpenAPI specs reachable" }
  } catch (err) {
    return { name, passed: false, detail: String(err) }
  }
}

/**
 * Assert unauthenticated API calls return 401 on both the management API
 * and the worlds data-plane API.
 */
export async function testUnauthenticatedApiCallsReturn401(
  client: E2eClient,
  config: ProdHealthConfig,
): Promise<AssertionResult> {
  const name = "testUnauthenticatedApiCallsReturn401"
  try {
    const apiResponse = await client.get(`${config.apiBaseUrl}/v1/worlds`)
    if (apiResponse.status !== 401) {
      return {
        name,
        passed: false,
        detail: `expected 401 from ${config.apiBaseUrl}/v1/worlds, got ${apiResponse.status}`,
      }
    }
    const worldsResponse = await client.get(`${config.worldsApiUrl}/worlds`)
    if (worldsResponse.status !== 401) {
      return {
        name,
        passed: false,
        detail: `expected 401 from ${config.worldsApiUrl}/worlds, got ${worldsResponse.status}`,
      }
    }
    return { name, passed: true, detail: "unauthenticated API calls return 401" }
  } catch (err) {
    return { name, passed: false, detail: String(err) }
  }
}

/**
 * Run the prod-health assertion family: all HTTP-based checks against the
 * console, management API, and worlds API. Returns one result per assertion
 * so runners can map failures to their own primitives.
 */
export async function testProdHealth(
  client: E2eClient,
  config: ProdHealthConfig,
): Promise<AssertionResult[]> {
  return Promise.all([
    testUnauthenticatedAppRedirect(client, config),
    testApiHealth(client, config),
    testOpenApiReachable(client, config),
    testUnauthenticatedApiCallsReturn401(client, config),
  ])
}
