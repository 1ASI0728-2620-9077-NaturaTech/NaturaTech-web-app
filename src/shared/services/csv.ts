/** Quote all cells and neutralize spreadsheet formulas in textual values. */
export function toCSV<T extends object>(rows: T[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]) as (keyof T)[];
  const cell = (value: unknown): string => {
    let text = value == null ? "" : String(value);
    if (typeof value === "string" && /^[\s]*[=+\-@\t\r\n]/.test(text))
      text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  return [
    keys.map(cell).join(","),
    ...rows.map((row) => keys.map((key) => cell(row[key])).join(",")),
  ].join("\r\n");
}
export function downloadCSV<T extends object>(
  rows: T[],
  filename: string,
): void {
  if (!rows.length) return;
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", toCSV(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
