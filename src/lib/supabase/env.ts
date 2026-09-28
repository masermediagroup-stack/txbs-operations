// Public, temporary validation-project configuration. These values are safe to
// expose to the browser and must be replaced when the production project is cut over.
const TEMP_SUPABASE_URL = "https://iixiigkevuqwewtagtee.supabase.co"
const TEMP_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_cTZV5qoiuNXrLh-_6cp7ow_6LZbtXjX"

export function hasSupabaseEnvironment() {
  return !shouldBypassAuthentication()
}

export function shouldBypassAuthentication() {
  return (
    process.env.VERCEL !== "1" &&
    process.env.TBS_RUNTIME_MODE === "test" &&
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
  if (!configuredUrl && !configuredPublishableKey && process.env.NEXT_PUBLIC_TBS_MODE === "demo") {
    return { url: TEMP_SUPABASE_URL, publishableKey: TEMP_SUPABASE_PUBLISHABLE_KEY }
  }
  if (!isValidSupabaseUrl(configuredUrl) || !configuredPublishableKey?.startsWith("sb_publishable_")) {
    throw new Error("Shared Supabase configuration is missing or invalid. Configure both URL and publishable key; demo fallback requires NEXT_PUBLIC_TBS_MODE=demo.")
  }
  const url = configuredUrl!
  const publishableKey = configuredPublishableKey

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
