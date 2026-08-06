import type { AssertionResult } from "../context.js"

/** Structural subset of a browser console message (Playwright ConsoleMessage). */
export interface ConsoleMessageLike {
  type(): string
  text(): string
}

/**
 * Structural subset of a browser page (Playwright `page` fixture, Puppeteer,
 * etc.). No browser dependency is required — any structurally compatible
 * page object works.
 */
export interface PageLike {
  goto(url: string): Promise<{ status(): number } | null>
  on(event: "pageerror", listener: (error: Error) => void): void
  on(event: "console", listener: (message: ConsoleMessageLike) => void): void
  locator(selector: string): { count(): Promise<number> }
}

/** Benign Chromium warning emitted in report-only mode; filtered out. */
const REPORT_ONLY_WARNING =
  "'upgrade-insecure-requests' is ignored when delivered in a report-only policy"

/**
 * Assert the console landing page loads (status < 400), renders a <body>,
 * and emits no page errors or console errors. Mirrors the wazoo-console
 * prod-health landing-page check.
 */
export async function testConsoleLandingPage(page: PageLike): Promise<AssertionResult> {
  const name = "testConsoleLandingPage"
  const errors: string[] = []
  page.on("pageerror", (err) => errors.push(err.message))
  page.on("console", (msg) => {
    if (msg.type() !== "error") return
    if (msg.text().includes(REPORT_ONLY_WARNING)) return
    errors.push(msg.text())
  })
  try {
    const response = await page.goto("/")
    if (response === null || response.status() >= 400) {
      return {
        name,
        passed: false,
        detail:
          response === null
            ? "landing page navigation returned no response"
            : `landing page returned status ${response.status()}`,
      }
    }
    const bodyCount = await page.locator("body").count()
    if (bodyCount === 0) {
      return { name, passed: false, detail: "landing page has no <body> element" }
    }
    if (errors.length > 0) {
      return {
        name,
        passed: false,
        detail: `console/page errors: ${errors.join("; ")}`,
      }
    }
    return {
      name,
      passed: true,
      detail: "landing page loaded without console errors",
    }
  } catch (err) {
    return { name, passed: false, detail: String(err) }
  }
}
