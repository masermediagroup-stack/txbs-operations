// Public, temporary validation-project configuration. These values are safe to
// expose to the browser and must be replaced when the production project is cut over.
const TEMP_SUPABASE_URL = "https://iixiigkevuqwewtagtee.supabase.co"
const TEMP_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_cTZV5qoiuNXrLh-_6cp7ow_6LZbtXjX"

export function hasSupabaseEnvironment() {
  return Boolean(getSupabaseEnvironment())
}

export function shouldBypassAuthentication() {
  return (
    process.env.VERCEL !== "1" &&
    process.env.TBS_E2E_AUTH_BYPASS === "1"
  )
}

function normalizeEnvironmentValue(value: string | undefined) {
  const normalized = value?.trim()
  if (!normalized) return undefined

  const first = normalized[0]
  const last = normalized.at(-1)
  if (
    normalized.length >= 2 &&
    ((first === '"' && last === '"') ||
      (first === "'" && last === "'") ||
      (first === "`" && last === "`"))
  ) {
    return normalized.slice(1, -1).trim()
  }

  return normalized
}

export function getSupabaseEnvironment() {
  const configuredUrl = normalizeEnvironmentValue(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  )
  const configuredPublishableKey = normalizeEnvironmentValue(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  )
  const url = isValidSupabaseUrl(configuredUrl)
    ? configuredUrl
    : TEMP_SUPABASE_URL
  const publishableKey = configuredPublishableKey?.startsWith("sb_publishable_")
    ? configuredPublishableKey
    : TEMP_SUPABASE_PUBLISHABLE_KEY

  return { url, publishableKey }
}

function isValidSupabaseUrl(value: string | undefined): value is string {
  if (!value) return false

  try {
    const url = new URL(value)
    return url.protocol === "https:" && url.hostname.endsWith(".supabase.co")
  } catch {
    return false
  }
}
