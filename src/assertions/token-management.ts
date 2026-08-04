import type { AssertionResult, WorldE2EContext } from "../context.js"

/**
 * Assert world auth token management: a token can be minted for the world
 * and returned with a usable secret. Stores the token on the context for
 * downstream SPARQL assertions.
 */
export async function testTokenManagement(
  context: WorldE2EContext,
): Promise<AssertionResult> {
  const { client, config, slug, ownerEmail } = context
  try {
    const tokenRes = await client.post(
      `${config.apiBaseUrl}/v1/worlds/${slug}/auth/tokens?email=${encodeURIComponent(ownerEmail)}`,
      {
        headers: {
          Authorization: `Bearer ${config.adminToken}`,
          "Content-Type": "application/json",
        },
        data: { name: "e2e-test-token" },
      },
    )
    if (tokenRes.status !== 201) {
      return {
        name: "testTokenManagement",
        passed: false,
        detail: `create token: expected 201, got ${tokenRes.status}`,
      }
    }
    const tokenBody = await tokenRes.json<{
      token?: { token?: string }
    }>()
    const worldToken: string | undefined = tokenBody.token?.token
    if (!worldToken) {
      return {
        name: "testTokenManagement",
        passed: false,
        detail: "create token: response did not include token secret",
      }
    }
    context.worldToken = worldToken
    return {
      name: "testTokenManagement",
      passed: true,
      detail: `world auth token minted (${worldToken.slice(0, 12)}...)`,
    }
  } catch (err) {
    return {
      name: "testTokenManagement",
      passed: false,
      detail: String(err),
    }
  }
}
