import type { NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/proxy"
import { contentSecurityPolicy, contentSecurityPolicyHeader } from "@/lib/security/content-security-policy"

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const csp = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development")
  request.headers.set("x-nonce", nonce)
  request.headers.set("Content-Security-Policy", csp)
  const response = await updateSession(request)
  response.headers.set(contentSecurityPolicyHeader(process.env.TBS_CSP_ENFORCE === "1"), csp)
  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
