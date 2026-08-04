import { describe, expect, it } from "vitest"
import { testTokenManagement } from "../src/assertions/token-management.js"
import { createWorldContext } from "../src/context.js"
import type { E2eClient, E2eResponse } from "../src/client.js"

function response(status: number, body: unknown = {}): E2eResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async <T>() => body as T,
  }
}

const baseConfig = {
  apiBaseUrl: "http://api.test",
  worldsApiUrl: "http://worlds.test",
  adminToken: "admin-token",
}

describe("testTokenManagement", () => {
  it("mints a token and stores it on the context", async () => {
    const client: E2eClient = {
      get: async () => response(200),
      post: async () => response(201, { token: { token: "wzt_test_secret_123" } }),
      delete: async () => response(200),
    }
    const context = createWorldContext(client, baseConfig)
    const result = await testTokenManagement(context)
    expect(result.passed).toBe(true)
    expect(context.worldToken).toBe("wzt_test_secret_123")
  })

  it("fails when token creation is not 201", async () => {
    const client: E2eClient = {
      get: async () => response(200),
      post: async () => response(401),
      delete: async () => response(200),
    }
    const context = createWorldContext(client, baseConfig)
    const result = await testTokenManagement(context)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("expected 201")
  })

  it("fails when the response omits the token secret", async () => {
    const client: E2eClient = {
      get: async () => response(200),
      post: async () => response(201, { token: {} }),
      delete: async () => response(200),
    }
    const context = createWorldContext(client, baseConfig)
    const result = await testTokenManagement(context)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("token secret")
    expect(context.worldToken).toBeUndefined()
  })
})
