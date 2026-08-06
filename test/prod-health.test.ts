import { describe, expect, it } from "vitest"
import {
  testApiHealth,
  testOpenApiReachable,
  testProdHealth,
  testUnauthenticatedApiCallsReturn401,
  testUnauthenticatedAppRedirect,
} from "../src/assertions/prod-health.js"
import type { E2eClient, E2eResponse, RequestOptions } from "../src/client.js"

function response(status: number, body: unknown = {}): E2eResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async <T>() => body as T,
  }
}

/** URL-routed mock client. */
function makeClient(routes: Record<string, () => E2eResponse>): E2eClient {
  return {
    get: async (url, options?: RequestOptions) => {
      const handler = routes[url]
      if (!handler) throw new Error(`no route for GET ${url}`)
      return handler()
    },
    post: async () => response(405),
    delete: async () => response(405),
  }
}

const config = {
  consoleBaseUrl: "http://console.test",
  apiBaseUrl: "http://api.test",
  worldsApiUrl: "http://worlds.test",
}

describe("testUnauthenticatedAppRedirect", () => {
  it("passes when the app route redirects (3xx)", async () => {
    let sawMaxRedirects: number | undefined
    const client: E2eClient = {
      get: async (_url, options) => {
        sawMaxRedirects = options?.maxRedirects
        return response(302)
      },
      post: async () => response(405),
      delete: async () => response(405),
    }
    const result = await testUnauthenticatedAppRedirect(client, config)
    expect(sawMaxRedirects).toBe(0)
    expect(result.passed).toBe(true)
  })

  it("fails when the app route serves 200", async () => {
    const client = makeClient({ "http://console.test/worlds": () => response(200) })
    const result = await testUnauthenticatedAppRedirect(client, config)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("3xx")
  })
})

describe("testApiHealth", () => {
  it("passes when all health endpoints return 200 with status ok", async () => {
    const client = makeClient({
      "http://api.test/health": () => response(200, { status: "ok" }),
      "http://worlds.test/health": () => response(200, { status: "ok" }),
      "http://console.test/api/health": () => response(200, { status: "ok" }),
    })
    const result = await testApiHealth(client, config)
    expect(result.passed).toBe(true)
  })

  it("fails when a health endpoint returns non-200", async () => {
    const client = makeClient({
      "http://api.test/health": () => response(200, { status: "ok" }),
      "http://worlds.test/health": () => response(503),
      "http://console.test/api/health": () => response(200, { status: "ok" }),
    })
    const result = await testApiHealth(client, config)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("503")
  })

  it("fails when a health endpoint body status is not ok", async () => {
    const client = makeClient({
      "http://api.test/health": () => response(200, { status: "degraded" }),
      "http://worlds.test/health": () => response(200, { status: "ok" }),
      "http://console.test/api/health": () => response(200, { status: "ok" }),
    })
    const result = await testApiHealth(client, config)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("status ok")
  })
})

describe("testOpenApiReachable", () => {
  it("passes when both OpenAPI specs expose openapi + paths", async () => {
    const client = makeClient({
      "http://api.test/openapi.json": () =>
        response(200, { openapi: "3.1.0", paths: {} }),
      "http://worlds.test/openapi.json": () =>
        response(200, { openapi: "3.1.0", paths: {} }),
    })
    const result = await testOpenApiReachable(client, config)
    expect(result.passed).toBe(true)
  })

  it("fails when a spec is missing paths", async () => {
    const client = makeClient({
      "http://api.test/openapi.json": () =>
        response(200, { openapi: "3.1.0", paths: {} }),
      "http://worlds.test/openapi.json": () => response(200, { openapi: "3.1.0" }),
    })
    const result = await testOpenApiReachable(client, config)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("openapi/paths")
  })
})

describe("testUnauthenticatedApiCallsReturn401", () => {
  it("passes when both APIs reject unauthenticated calls with 401", async () => {
    const client = makeClient({
      "http://api.test/v1/worlds": () => response(401),
      "http://worlds.test/worlds": () => response(401),
    })
    const result = await testUnauthenticatedApiCallsReturn401(client, config)
    expect(result.passed).toBe(true)
  })

  it("fails when the management API returns 200", async () => {
    const client = makeClient({
      "http://api.test/v1/worlds": () => response(200),
      "http://worlds.test/worlds": () => response(401),
    })
    const result = await testUnauthenticatedApiCallsReturn401(client, config)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("401")
  })
})

describe("testProdHealth", () => {
  it("returns four passed results when every check succeeds", async () => {
    const client = makeClient({
      "http://console.test/worlds": () => response(302),
      "http://api.test/health": () => response(200, { status: "ok" }),
      "http://worlds.test/health": () => response(200, { status: "ok" }),
      "http://console.test/api/health": () => response(200, { status: "ok" }),
      "http://api.test/openapi.json": () =>
        response(200, { openapi: "3.1.0", paths: {} }),
      "http://worlds.test/openapi.json": () =>
        response(200, { openapi: "3.1.0", paths: {} }),
      "http://api.test/v1/worlds": () => response(401),
      "http://worlds.test/worlds": () => response(401),
    })
    const results = await testProdHealth(client, config)
    expect(results).toHaveLength(4)
    for (const result of results) {
      expect(result.passed).toBe(true)
    }
  })

  it("reports the failing assertion when one check fails", async () => {
    const client = makeClient({
      "http://console.test/worlds": () => response(200),
      "http://api.test/health": () => response(200, { status: "ok" }),
      "http://worlds.test/health": () => response(200, { status: "ok" }),
      "http://console.test/api/health": () => response(200, { status: "ok" }),
      "http://api.test/openapi.json": () =>
        response(200, { openapi: "3.1.0", paths: {} }),
      "http://worlds.test/openapi.json": () =>
        response(200, { openapi: "3.1.0", paths: {} }),
      "http://api.test/v1/worlds": () => response(401),
      "http://worlds.test/worlds": () => response(401),
    })
    const results = await testProdHealth(client, config)
    expect(results.filter((r) => !r.passed).map((r) => r.name)).toEqual([
      "testUnauthenticatedAppRedirect",
    ])
  })
})
