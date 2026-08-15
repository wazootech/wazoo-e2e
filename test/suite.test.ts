import { describe, expect, it } from "vitest"
import { createWorldContext } from "../src/context.js"
import { runWorldLifecycleSuite } from "../src/suite.js"
import type { E2eClient, E2eResponse } from "../src/client.js"

function response(status: number, body: unknown = {}): E2eResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async <T>() => body as T,
  }
}

const bindings = [
  { name: { value: "Alice" }, age: { value: "30" }, city: { value: "Portland" } },
]

const baseConfig = {
  apiBaseUrl: "http://api.test",
  worldsApiUrl: "http://worlds.test",
  adminToken: "admin-token",
}

function happyClient(): E2eClient {
  return {
    get: async () => response(200),
    post: async (url) =>
      url.includes("/sparql")
        ? response(200, { results: { bindings } })
        : url.includes("/auth/tokens")
          ? response(201, { token: { token: "wzt_test_secret_123" } })
          : response(201, { world: { state: "ACTIVE", worldUid: "w_test_uid" } }),
    delete: async () => response(200),
  }
}

describe("runWorldLifecycleSuite", () => {
  it("runs all three assertions and cleanup in order", async () => {
    const client = happyClient()
    const context = createWorldContext(client, baseConfig)
    const results = await runWorldLifecycleSuite(context)
    expect(results.map((r) => r.name)).toEqual([
      "testWorldLifecycle",
      "testTokenManagement",
      "testSparqlQuery",
      "cleanupWorld",
    ])
    for (const result of results) {
      expect(result.passed, `${result.name}: ${result.detail}`).toBe(true)
    }
  })

  it("skips downstream steps and still cleans up when world creation fails", async () => {
    const client: E2eClient = {
      get: async () => response(200),
      post: async () => response(400),
      delete: async () => response(200),
    }
    const context = createWorldContext(client, baseConfig)
    const results = await runWorldLifecycleSuite(context)
    expect(results[0]).toMatchObject({ name: "testWorldLifecycle", passed: false })
    expect(results[1]).toMatchObject({
      name: "testTokenManagement",
      passed: false,
      detail: expect.stringContaining("skipped"),
    })
    expect(results[2]).toMatchObject({
      name: "testSparqlQuery",
      passed: false,
      detail: expect.stringContaining("skipped"),
    })
    expect(results[3]).toMatchObject({ name: "cleanupWorld", passed: true })
  })

  it("treats a 404 cleanup as success (idempotent delete)", async () => {
    const client: E2eClient = {
      get: async () => response(200),
      post: async () => response(201, { world: { state: "ACTIVE" } }),
      delete: async () => response(404),    }
    const context = createWorldContext(client, baseConfig)
    const results = await runWorldLifecycleSuite(context)
    expect(results[3]).toMatchObject({ name: "cleanupWorld", passed: true })
  })
})
