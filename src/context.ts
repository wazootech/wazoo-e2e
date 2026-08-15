import type { E2eClient } from "./client.js"

export interface WorldE2EConfig {
  /** Management API base URL (wazoo-api). */
  apiBaseUrl: string
  /** Data-plane API base URL (worlds-api). */
  worldsApiUrl: string
  /** Platform admin token (WAZOO_PLATFORM_ADMIN_TOKEN). */
  adminToken: string
  /** Optional run id; defaults to Date.now(). */
  runId?: string
}

export interface WorldE2EContext {
  config: WorldE2EConfig
  client: E2eClient
  runId: string
  slug: string
  ownerEmail: string
  /** worlds-api uid (`w_...`) of the created world, for data-plane calls. */
  worldUid?: string
  worldToken?: string
}

export function createWorldContext(
  client: E2eClient,
  config: WorldE2EConfig,
): WorldE2EContext {
  const runId = config.runId ?? String(Date.now())
  return {
    config,
    client,
    runId,
    slug: `e2e-${runId}`,
    ownerEmail: `e2e+${runId}@wazoo.dev`,
  }
}

export interface AssertionResult {
  name: string
  passed: boolean
  detail: string
}
