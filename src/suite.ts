import { testSparqlQuery } from "./assertions/sparql-query.js"
import { testTokenManagement } from "./assertions/token-management.js"
import { testWorldLifecycle } from "./assertions/world-lifecycle.js"
import { cleanupWorld } from "./cleanup.js"
import type { AssertionResult, WorldE2EContext } from "./context.js"

/**
 * Run the full world lifecycle suite against a live environment:
 * world lifecycle -> token management -> SPARQL query round-trip, followed
 * by best-effort cleanup. Returns one result per step so runners can map
 * failures to their own assertion primitives.
 */
export async function runWorldLifecycleSuite(
  context: WorldE2EContext,
): Promise<AssertionResult[]> {
  const results: AssertionResult[] = []

  results.push(await testWorldLifecycle(context))
  if (results[0]!.passed) {
    results.push(await testTokenManagement(context))
  } else {
    results.push({
      name: "testTokenManagement",
      passed: false,
      detail: "skipped: world lifecycle failed",
    })
  }
  if (context.worldToken) {
    results.push(await testSparqlQuery(context))
  } else {
    results.push({
      name: "testSparqlQuery",
      passed: false,
      detail: "skipped: no world token",
    })
  }

  results.push(await cleanupWorld(context))
  return results
}
