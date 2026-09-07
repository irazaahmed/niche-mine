import { ParsedSheet, SheetRow } from "./parseSheet";

export interface CleanResult {
  headers: string[];
  rows: SheetRow[];
  removedEmptyRows: number;
  removedDuplicates: number;
}

export function cleanData(parsed: ParsedSheet): CleanResult {
  const headers = parsed.headers.filter((h) => h && h.trim() !== "");

  let rows = parsed.rows.map((row) => {
    const cleaned: SheetRow = {};
    for (const h of headers) {
      const value = row[h];
      cleaned[h] = typeof value === "string" ? value.trim() : value;
    }
    return cleaned;
  });

  const beforeEmpty = rows.length;
  rows = rows.filter((row) =>
    headers.some((h) => row[h] !== null && row[h] !== undefined && row[h] !== "")
  );
  const removedEmptyRows = beforeEmpty - rows.length;

  const beforeDupe = rows.length;
  const seen = new Set<string>();
  rows = rows.filter((row) => {
    const key = JSON.stringify(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const removedDuplicates = beforeDupe - rows.length;

  return { headers, rows, removedEmptyRows, removedDuplicates };
}

export type ColumnType = "number" | "date" | "text";

export function inferColumnType(rows: SheetRow[], header: string): ColumnType {
  const sample = rows
    .map((r) => r[header])
    .filter((v) => v !== null && v !== undefined && v !== "")
    .slice(0, 50);

  if (sample.length === 0) return "text";

  const numericCount = sample.filter((v) => typeof v === "number" || !isNaN(Number(v))).length;
  if (numericCount / sample.length > 0.8) return "number";

  const dateCount = sample.filter((v) => !isNaN(Date.parse(String(v)))).length;
  if (dateCount / sample.length > 0.8) return "date";

  return "text";
}
