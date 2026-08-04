import type { AssertionResult, WorldE2EContext } from "../context.js"

/**
 * Assert the world lifecycle: the owner user exists and a world can be
 * created in the ACTIVE state. Mirrors the wazoo-console e2e flow.
 */
export async function testWorldLifecycle(
  context: WorldE2EContext,
): Promise<AssertionResult> {
  const { client, config, slug, ownerEmail } = context
  try {
    // ── Step 0: Ensure owner user exists ──
    const userRes = await client.get(
      `${config.apiBaseUrl}/v1/users/me?email=${encodeURIComponent(ownerEmail)}`,
      { headers: { Authorization: `Bearer ${config.adminToken}` } },
    )
    if (userRes.status < 200 || userRes.status >= 300) {
      return {
        name: "testWorldLifecycle",
        passed: false,
        detail: `ensure user: expected 2xx, got ${userRes.status}`,
      }
    }

    // ── Step 1: Create world ──
    const createRes = await client.post(`${config.apiBaseUrl}/v1/worlds`, {
      headers: {
        Authorization: `Bearer ${config.adminToken}`,
        "Content-Type": "application/json",
      },
      data: {
        worldId: slug,
        ownerEmail,
        world: { displayName: "E2E Test", region: "auto" },
      },
    })
    if (createRes.status !== 201) {
      return {
        name: "testWorldLifecycle",
        passed: false,
        detail: `create world: expected 201, got ${createRes.status}`,
      }
    }
    const created = await createRes.json<{ world: { state: string } }>()
    if (created.world.state !== "ACTIVE") {
      return {
        name: "testWorldLifecycle",
        passed: false,
        detail: `create world: expected state ACTIVE, got ${created.world.state}`,
      }
    }
    return {
      name: "testWorldLifecycle",
      passed: true,
      detail: `world ${slug} created and ACTIVE`,
    }
  } catch (err) {
    return {
      name: "testWorldLifecycle",
      passed: false,
      detail: String(err),
    }
  }
}
