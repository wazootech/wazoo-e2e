import { describe, expect, it } from "vitest"
import { testConsoleLandingPage } from "../src/assertions/console-landing-page.js"
import type {
  ConsoleMessageLike,
  PageLike,
} from "../src/assertions/console-landing-page.js"

interface PageHarness {
  page: PageLike
  emitPageError(message: string): void
  emitConsole(message: ConsoleMessageLike): void
}

/** Capture listeners and let tests fire events, like a real browser page. */
function makePage(options: {
  status?: number
  gotoThrows?: boolean
  bodyCount?: number
}): PageHarness {
  let pageErrorListener: ((error: Error) => void) | undefined
  let consoleListener: ((message: ConsoleMessageLike) => void) | undefined
  const page: PageLike = {
    goto: async () => {
      if (options.gotoThrows) throw new Error("navigation failed")
      return options.status === undefined ? null : { status: () => options.status! }
    },
    on: ((event: string, listener: (arg: unknown) => void) => {
      if (event === "pageerror") pageErrorListener = listener as (error: Error) => void
      if (event === "console")
        consoleListener = listener as (message: ConsoleMessageLike) => void
    }) as PageLike["on"],
    locator: () => ({ count: async () => options.bodyCount ?? 1 }),
  }
  return {
    page,
    emitPageError: (message) => pageErrorListener?.(new Error(message)),
    emitConsole: (message) => consoleListener?.(message),
  }
}

function consoleMessage(type: string, text: string): ConsoleMessageLike {
  return { type: () => type, text: () => text }
}

describe("testConsoleLandingPage", () => {
  it("passes when the page loads with no errors", async () => {
    const { page } = makePage({ status: 200 })
    const result = await testConsoleLandingPage(page)
    expect(result.passed).toBe(true)
  })

  it("fails when the response status is 500", async () => {
    const { page } = makePage({ status: 500 })
    const result = await testConsoleLandingPage(page)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("500")
  })

  it("fails when goto returns no response", async () => {
    const { page } = makePage({})
    const result = await testConsoleLandingPage(page)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("no response")
  })

  it("fails when navigation throws", async () => {
    const { page } = makePage({ gotoThrows: true })
    const result = await testConsoleLandingPage(page)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("navigation failed")
  })

  it("fails when there is no <body> element", async () => {
    const { page } = makePage({ status: 200, bodyCount: 0 })
    const result = await testConsoleLandingPage(page)
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("<body>")
  })

  it("fails on page errors", async () => {
    const { page, emitPageError } = makePage({ status: 200 })
    const resultPromise = testConsoleLandingPage(page)
    emitPageError("TypeError: x is not a function")
    const result = await resultPromise
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("TypeError")
  })

  it("fails on console errors", async () => {
    const { page, emitConsole } = makePage({ status: 200 })
    const resultPromise = testConsoleLandingPage(page)
    emitConsole(consoleMessage("error", "Failed to load resource"))
    const result = await resultPromise
    expect(result.passed).toBe(false)
    expect(result.detail).toContain("Failed to load resource")
  })

  it("ignores the benign report-only upgrade-insecure-requests warning", async () => {
    const { page, emitConsole } = makePage({ status: 200 })
    emitConsole(
      consoleMessage(
        "error",
        "'upgrade-insecure-requests' is ignored when delivered in a report-only policy",
      ),
    )
    const result = await testConsoleLandingPage(page)
    expect(result.passed).toBe(true)
  })

  it("ignores non-error console messages", async () => {
    const { page, emitConsole } = makePage({ status: 200 })
    emitConsole(consoleMessage("warning", "deprecated API"))
    const result = await testConsoleLandingPage(page)
    expect(result.passed).toBe(true)
  })
})
