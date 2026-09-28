type Page<T> = { data: T[] | null; error: { message: string } | null }

/** The caller must order by a unique key (or a unique composite key). */
export async function readAllRows<T>(query: { range(from: number, to: number): PromiseLike<Page<T>> }): Promise<Page<T>> {
  const data: T[] = []
  for (;;) {
    const page = await query.range(data.length, data.length + 499)
    if (page.error) throw new Error(`Could not load a complete dataset: ${page.error.message}`)
    if (!page.data?.length) return { data, error: null }
    // Advance by the actual response size; a server may impose a lower page cap.
    data.push(...page.data)
  }
}
