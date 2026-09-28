"use client"

import { useEffect } from "react"

/** Old workers could cache a redirected private page as their offline fallback. */
export function PublicCacheCleanup() {
  useEffect(() => {
    if (!("caches" in window)) return
    void caches.keys().then((names) => Promise.all(names
      .filter((name) => name.startsWith("tbs-yard-") && name.endsWith("-shell") && name !== "tbs-yard-v4-shell")
      .map((name) => caches.delete(name)))).catch(() => undefined)
  }, [])
  return null
}
