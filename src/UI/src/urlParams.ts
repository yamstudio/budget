/** Repeated numeric ids (`?cat=1&cat=2`): invalid, negative and duplicate values are dropped. */
export const parseIds = (search: URLSearchParams, key: string): number[] => [
  ...new Set(
    search
      .getAll(key)
      .map(Number)
      .filter((n) => Number.isInteger(n) && n >= 0)
  ),
]

export const writeIds = (search: URLSearchParams, key: string, ids: number[]) => ids.forEach((id) => search.append(key, String(id)))
