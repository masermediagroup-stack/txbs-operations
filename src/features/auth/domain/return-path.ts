/** Accept application-relative URLs only, including after percent decoding. */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== "string") return "/"
  let decoded = value
  try {
    for (let i = 0; i < 3; i++) {
      if (!decoded.startsWith("/") || decoded.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(decoded)) return "/"
      const next = decodeURIComponent(decoded)
      if (next === decoded) break
      decoded = next
    }
    const url = new URL(decoded, "https://tbs.invalid")
    if (url.origin !== "https://tbs.invalid" || url.pathname === "/login") return "/"
    return value
  } catch {
    return "/"
  }
}
