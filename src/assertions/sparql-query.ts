import type { AssertionResult, WorldE2EContext } from "../context.js"

const INSERT_QUERY = `PREFIX ex: <http://example.org/>
INSERT DATA {
  ex:Alice ex:name "Alice" ;
           ex:age "30" ;
           ex:city "Portland" .
}`

const SELECT_QUERY = `PREFIX ex: <http://example.org/>
SELECT ?name ?age ?city WHERE {
  ex:Alice ex:name ?name ;
           ex:age ?age ;
           ex:city ?city .
}`

/**
 * Assert SPARQL query round-trip: INSERT DATA succeeds, then SELECT returns
 * the expected bindings. Requires a world token on the context (see
 * {@link testTokenManagement}).
 */
export async function testSparqlQuery(
  context: WorldE2EContext,
): Promise<AssertionResult> {
  const { client, config, slug, worldToken } = context
  if (!worldToken) {
    return {
      name: "testSparqlQuery",
      passed: false,
      detail: "no world token on context; run testTokenManagement first",
    }
  }
  const headers = {
    Authorization: `Bearer ${worldToken}`,
    "Content-Type": "application/json",
  }
  try {
    // ── Step 1: SPARQL INSERT DATA ──
    const insertRes = await client.post(
      `${config.worldsApiUrl}/worlds/${slug}/sparql`,
      { headers, data: { query: INSERT_QUERY } },
    )
    if (insertRes.status !== 200) {
      return {
        name: "testSparqlQuery",
        passed: false,
        detail: `sparql insert: expected 200, got ${insertRes.status}`,
      }
    }

    // ── Step 2: SPARQL SELECT and verify ──
    const selectRes = await client.post(
      `${config.worldsApiUrl}/worlds/${slug}/sparql`,
      { headers, data: { query: SELECT_QUERY } },
    )
    if (selectRes.status !== 200) {
      return {
        name: "testSparqlQuery",
        passed: false,
        detail: `sparql select: expected 200, got ${selectRes.status}`,
      }
    }
    const results = await selectRes.json<{
      results?: {
        bindings?: Array<Record<string, { value: string }>>
      }
    }>()
    const bindings = results?.results?.bindings
    if (!bindings || bindings.length < 1) {
      return {
        name: "testSparqlQuery",
        passed: false,
        detail: "sparql select: no bindings returned",
      }
    }
    const first = bindings[0]!
    const checks: Array<[string, string]> = [
      ["name", "Alice"],
      ["age", "30"],
      ["city", "Portland"],
    ]
    for (const [key, expected] of checks) {
      const actual = first[key]?.value
      if (actual !== expected) {
        return {
          name: "testSparqlQuery",
          passed: false,
          detail: `sparql select: expected ${key}=${expected}, got ${actual}`,
        }
      }
    }
    return {
      name: "testSparqlQuery",
      passed: true,
      detail: "SPARQL insert + select round-tripped correctly",
    }
  } catch (err) {
    return {
      name: "testSparqlQuery",
      passed: false,
      detail: String(err),
    }
  }
}
