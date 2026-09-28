// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"

const { getCurrentOperator } = vi.hoisted(() => ({ getCurrentOperator: vi.fn() }))
vi.mock("@/features/auth/server/session", () => ({ getCurrentOperator }))

import { GET } from "@/app/api/auth/session/route"

afterEach(() => {
  vi.unstubAllEnvs()
  getCurrentOperator.mockReset()
})

describe("queued replay hold", () => {
  it("rejects unauthenticated callers before checking the hold", async () => {
    vi.stubEnv("TBS_REPLAY_HOLD", "1")
    getCurrentOperator.mockResolvedValue(null)
    const response = await GET()
    expect(response.status).toBe(401)
  })

  it("stops an active account before any queued photo upload can start", async () => {
    vi.stubEnv("TBS_REPLAY_HOLD", "1")
    getCurrentOperator.mockResolvedValue({ id: "operator-id", active: true })
    const response = await GET()
    expect(response.status).toBe(423)
    expect(response.headers.get("cache-control")).toBe("private, no-store")
    expect(await response.json()).toMatchObject({ code: "REPLAY_PAUSED" })
  })

  it("returns the original session result after the hold is released", async () => {
    vi.stubEnv("TBS_REPLAY_HOLD", "0")
    getCurrentOperator.mockResolvedValue({ id: "operator-id", active: true })
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ userId: "operator-id" })
  })
})
