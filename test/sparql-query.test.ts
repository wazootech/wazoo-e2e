import { describe, expect, it } from "vitest"
import { testSparqlQuery } from "../src/assertions/sparql-query.js"
import { createWorldContext } from "../src/context.js"
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

function makeClient(routes: {
  insert?: () => E2eResponse
  select?: () => E2eResponse
}): E2eClient {
  return {
    get: async () => response(200),
    post: async (url, options) => {
      if (!url.includes("sparql")) return response(404)
      const query = (options?.data as { query?: string } | undefined)?.query ?? ""
      if (query.includes("INSERT DATA")) {
        return (routes.insert ?? (() => response(200)))()
      }
      return (routes.select ?? (() => response(200, { results: { bindings } })))()
    },
    delete: async () => response(200),
  }
}

describe("testSparqlQuery", () => {
  it("passes on a full insert + select round trip", async () => {
    const client = makeClient({})
    const context = createWorldContext(client, baseConfig)
    context.worldToken = "wzt_test_secret_123"
    const result = await testSparqlQuery(context)
    expect(result.passed).toBe(true)
  })

  it("fails without a world token", async () => {
    const client = makeClient({})
    const context = createWorldContext(client, baseConfig)
    const result = await testSparqlQuery(context)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("world token")
  })

  it("fails when the insert is rejected", async () => {
    const client = makeClient({ insert: () => response(500) })
    const context = createWorldContext(client, baseConfig)
    context.worldToken = "wzt_test_secret_123"
    const result = await testSparqlQuery(context)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("sparql insert")
  })

  it("fails when select returns no bindings", async () => {
    const client = makeClient({
      select: () => response(200, { results: { bindings: [] } }),
    })
    const context = createWorldContext(client, baseConfig)
    context.worldToken = "wzt_test_secret_123"
    const result = await testSparqlQuery(context)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("no bindings")
  })

  it("fails when a binding value mismatches", async () => {
    const client = makeClient({
      select: () =>
        response(200, {
          results: {
            bindings: [
              {
                name: { value: "Bob" },
                age: { value: "30" },
                city: { value: "Portland" },
              },
            ],
          },
        }),
    })
    const context = createWorldContext(client, baseConfig)
    context.worldToken = "wzt_test_secret_123"
    const result = await testSparqlQuery(context)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("expected name=Alice")
  })
})
