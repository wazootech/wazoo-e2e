import type { AssertionResult, WorldE2EContext } from "./context.js"

/**
 * Best-effort cleanup: delete the e2e world created by the suite.
 * Idempotent — a 404 (world never created or already gone) counts as
 * success so failed assertions don't produce spurious cleanup noise.
 * Safe to call even when world creation failed.
 */
export async function cleanupWorld(context: WorldE2EContext): Promise<AssertionResult> {
  const { client, config, slug, ownerEmail } = context
  try {
    const res = await client.delete(
      `${config.apiBaseUrl}/v1/worlds/${slug}?email=${encodeURIComponent(ownerEmail)}`,
      { headers: { Authorization: `Bearer ${config.adminToken}` } },
    )
    if (res.ok || res.status === 404) {
      return {
        name: "cleanupWorld",
        passed: true,
        detail:
          res.status === 404
            ? `world ${slug} did not exist; nothing to delete`
            : `deleted world ${slug}`,
      }
    }
    return {
      name: "cleanupWorld",
      passed: false,
      detail: `delete world: expected ok or 404, got ${res.status}`,
    }
  } catch (err) {
    return {
      name: "cleanupWorld",
      passed: false,
      detail: String(err),
    }
  }
}
