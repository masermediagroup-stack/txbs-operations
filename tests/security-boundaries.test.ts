// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { safeReturnPath } from "@/features/auth/domain/return-path"
import { getSupabaseEnvironment, shouldBypassAuthentication } from "@/lib/supabase/env"
import { toCsv } from "@/features/reports/domain/operations-reports"

afterEach(() => vi.unstubAllEnvs())
describe("security boundaries", () => {
  it.each(["//example.com", "/\\example.com", "/%2fexample.com", "/%255cexample.com", "/\n/example.com", "https://example.com", "/login"])("rejects unsafe return path %s", (value) => expect(safeReturnPath(value)).toBe("/"))
  it("preserves a record and its filters", () => expect(safeReturnPath("/inventory?site=lavon&query=board")).toBe("/inventory?site=lavon&query=board"))
  it("fails closed for an incomplete shared environment", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "")
    vi.stubEnv("NEXT_PUBLIC_TBS_MODE", "shared")
    expect(getSupabaseEnvironment).toThrow("configuration")
  })
  it("requires explicit isolated test mode as well as the bypass flag", () => {
    vi.stubEnv("TBS_E2E_AUTH_BYPASS", "1")
    vi.stubEnv("TBS_RUNTIME_MODE", "shared")
    vi.stubEnv("VERCEL", "")
    expect(shouldBypassAuthentication()).toBe(false)
    vi.stubEnv("TBS_RUNTIME_MODE", "test")
    expect(shouldBypassAuthentication()).toBe(true)
    vi.stubEnv("VERCEL", "1")
    expect(shouldBypassAuthentication()).toBe(false)
  })
  it("neutralizes spreadsheet formulas without converting numeric negatives", () => {
    const result = toCsv(["Name", "Quantity"], [["=1+1", -3], [" +SUM(A1)", 4], ["@value", null], ["\tformula", 2]])
    expect(result).toContain("'=1+1,-3")
    expect(result).toContain("' +SUM(A1),4")
    expect(result).toContain("'@value,Unknown")
    expect(result).toContain("'\tformula,2")
  })
})
