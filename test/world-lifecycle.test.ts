import { describe, expect, it } from "vitest"
import { testWorldLifecycle } from "../src/assertions/world-lifecycle.js"
import { createWorldContext } from "../src/context.js"
import type { E2eClient, E2eResponse } from "../src/client.js"

function response(status: number, body: unknown = {}): E2eResponse {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async <T>() => body as T,
  }
}

function makeClient(routes: {
  usersMe?: () => E2eResponse
  createWorld?: () => E2eResponse
}): E2eClient {
  return {
    get: async () => (routes.usersMe ?? (() => response(200)))(),
    post: async () =>
      (
        routes.createWorld ??
        (() =>
          response(201, {
            world: { state: "ACTIVE", worldUid: "w_test_uid" },
          }))
      )(),
    delete: async () => response(200),
  }
}

const baseConfig = {
  apiBaseUrl: "http://api.test",
  worldsApiUrl: "http://worlds.test",
  adminToken: "admin-token",
}

describe("testWorldLifecycle", () => {
  it("passes when user exists and world is created ACTIVE", async () => {
    const client = makeClient({})
    const context = createWorldContext(client, baseConfig)
    const result = await testWorldLifecycle(context)
    expect(result.passed).toBe(true)
    expect(result.detail).toContain("ACTIVE")
    expect(context.worldUid).toBe("w_test_uid")
  })

  it("fails when the owner user cannot be resolved", async () => {
    const client = makeClient({ usersMe: () => response(404) })
    const context = createWorldContext(client, baseConfig)
    const result = await testWorldLifecycle(context)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("ensure user")
  })

  it("fails when world creation returns a non-201", async () => {
    const client = makeClient({ createWorld: () => response(400) })
    const context = createWorldContext(client, baseConfig)
    const result = await testWorldLifecycle(context)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("create world")
  })

  it("fails when world state is not ACTIVE", async () => {
    const client = makeClient({
      createWorld: () => response(201, { world: { state: "SUSPENDED" } }),
    })
    const context = createWorldContext(client, baseConfig)
    const result = await testWorldLifecycle(context)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("SUSPENDED")
  })
})
