/** Existing API endpoints may return a collection, a single item, or no content. */
export function collection<T extends object>(data: unknown): T[] {
  if (data == null) return [];
  const items = Array.isArray(data) ? data : [data];
  if (
    items.some(
      (item) =>
        item === null || typeof item !== "object" || Array.isArray(item),
    )
  ) {
    throw new Error("Invalid API collection");
  }
  return items as T[];
}
