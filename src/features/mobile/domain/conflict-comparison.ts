/** Include only the records named by the retained command, never unrelated snapshot rows. */
export function conflictRecords(snapshot: unknown, entityIds: readonly string[]) {
  const ids = new Set(entityIds)
  const records: Record<string, unknown[]> = {}
  if (!snapshot || typeof snapshot !== "object") return records
  for (const [collection, value] of Object.entries(snapshot)) {
    if (!Array.isArray(value)) continue
    const matches = value.filter((item: unknown) => item !== null && typeof item === "object"
      && "id" in item && typeof item.id === "string" && ids.has(item.id))
    if (matches.length) records[collection] = matches
  }
  return records
}
