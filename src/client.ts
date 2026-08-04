/**
 * Minimal HTTP client abstraction so assertions work across runners
 * (Playwright, vitest, plain node scripts, ...).
 */

export interface RequestOptions {
  headers?: Record<string, string>
  data?: unknown
}

export interface E2eResponse {
  status: number
  ok: boolean
  json<T = unknown>(): Promise<T>
}

export interface E2eClient {
  get(url: string, options?: RequestOptions): Promise<E2eResponse>
  post(url: string, options?: RequestOptions): Promise<E2eResponse>
  delete(url: string, options?: RequestOptions): Promise<E2eResponse>
}

/** Structural subset of Playwright's APIRequestContext/APIResponse. */
export interface PlaywrightRequestLike {
  get(
    url: string,
    options?: { headers?: Record<string, string>; data?: unknown },
  ): Promise<PlaywrightResponseLike>
  post(
    url: string,
    options?: { headers?: Record<string, string>; data?: unknown },
  ): Promise<PlaywrightResponseLike>
  delete(
    url: string,
    options?: { headers?: Record<string, string>; data?: unknown },
  ): Promise<PlaywrightResponseLike>
}

export interface PlaywrightResponseLike {
  status(): number
  ok(): boolean
  json(): Promise<unknown>
}

/**
 * Adapt a Playwright `request` fixture (or any structurally compatible
 * client) to {@link E2eClient}. No @playwright/test dependency is needed.
 */
export function createPlaywrightClient(request: PlaywrightRequestLike): E2eClient {
  const wrap = (response: PlaywrightResponseLike): E2eResponse => ({
    status: response.status(),
    ok: response.ok(),
    json: <T>() => response.json() as Promise<T>,
  })
  return {
    get: (url, options) => request.get(url, options).then(wrap),
    post: (url, options) => request.post(url, options).then(wrap),
    delete: (url, options) => request.delete(url, options).then(wrap),
  }
}

/**
 * Fetch-based {@link E2eClient} for use outside Playwright
 * (e.g. plain node scripts or a CI smoke gate).
 */
export function createFetchClient(baseUrl = ""): E2eClient {
  const request = async (
    method: "GET" | "POST" | "DELETE",
    url: string,
    options?: RequestOptions,
  ): Promise<E2eResponse> => {
    const headers: Record<string, string> = {
      ...(options?.headers ?? {}),
    }
    let body: string | undefined
    if (options?.data !== undefined) {
      headers["Content-Type"] ??= "application/json"
      body = JSON.stringify(options.data)
    }
    const init: RequestInit = { method, headers }
    if (body !== undefined) init.body = body
    const response = await fetch(`${baseUrl}${url}`, init)
    return {
      status: response.status,
      ok: response.ok,
      json: () => response.json(),
    }
  }
  return {
    get: (url, options) => request("GET", url, options),
    post: (url, options) => request("POST", url, options),
    delete: (url, options) => request("DELETE", url, options),
  }
}
