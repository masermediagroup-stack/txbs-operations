// @vitest-environment node
import { describe, expect, it } from "vitest"

import { contentSecurityPolicy, contentSecurityPolicyHeader } from "@/lib/security/content-security-policy"

describe("content security policy", () => {
  it("builds the enforced production policy around the request nonce", () => {
    const policy = contentSecurityPolicy("request-nonce", false)
    expect(policy).toContain("script-src 'self' 'nonce-request-nonce' 'strict-dynamic'")
    expect(policy).not.toContain("'unsafe-eval'")
    expect(policy).toContain("worker-src 'self' blob:")
    expect(policy).toContain("manifest-src 'self'")
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("frame-src 'none'")
    expect(policy).toContain("frame-ancestors 'none'")
    expect(policy).toContain("upgrade-insecure-requests")
    expect(contentSecurityPolicyHeader(true)).toBe("Content-Security-Policy")
  })

  it("allows development evaluation only while keeping report-only selectable", () => {
    const policy = contentSecurityPolicy("development-nonce", true)
    expect(policy).toContain("'unsafe-eval'")
    expect(policy).not.toContain("upgrade-insecure-requests")
    expect(contentSecurityPolicyHeader(false)).toBe("Content-Security-Policy-Report-Only")
  })
})
