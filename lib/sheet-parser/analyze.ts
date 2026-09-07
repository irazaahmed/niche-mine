import { SheetRow } from "./parseSheet";
import { inferColumnType } from "./cleanData";

export interface ColumnSummary {
  header: string;
  type: "number" | "date" | "text";
  aggregatable?: boolean;
  total?: number;
  average?: number;
  min?: number;
  max?: number;
  uniqueValues?: number;
  topValues?: { label: string; count: number }[];
}

export interface AnalysisResult {
  rowCount: number;
  columnCount: number;
  columns: ColumnSummary[];
}

// Score/rate-style columns (0-100 difficulty, per-click cost, ratios) are
// numeric but summing them across rows produces a meaningless number --
// only count-like columns (Volume, Traffic, Clicks) should be totaled.
const NON_ADDITIVE_HEADER_PATTERN =
  /difficulty|\bcpc\b|\bcps\b|\bctr\b|score|rate|ratio|percent|%|index|rating|density/i;

export function analyzeData(headers: string[], rows: SheetRow[]): AnalysisResult {
  const columns: ColumnSummary[] = headers.map((header) => {
    const type = inferColumnType(rows, header);
    const values = rows.map((r) => r[header]).filter((v) => v !== null && v !== undefined && v !== "");

    if (type === "number") {
      const nums = values.map((v) => Number(v)).filter((n) => !isNaN(n));
      const total = nums.reduce((a, b) => a + b, 0);
      return {
        header,
        type,
        aggregatable: !NON_ADDITIVE_HEADER_PATTERN.test(header),
        total,
        average: nums.length ? total / nums.length : 0,
        min: nums.length ? Math.min(...nums) : 0,
        max: nums.length ? Math.max(...nums) : 0,
      };
    }

    const counts = new Map<string, number>();
    for (const v of values) {
      const key = String(v);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const topValues = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

    return {
      header,
      type,
      uniqueValues: counts.size,
      // A "top values" chart is only informative when values actually
      // repeat; for near-unique columns (e.g. Keyword) every bar would
      // show count 1, so leave topValues off entirely.
      topValues: topValues[0]?.count > 1 ? topValues : undefined,
    };
  });

  return { rowCount: rows.length, columnCount: headers.length, columns };
}

// Used by the custom chart picker, where the user explicitly asks to chart
// a column -- unlike analyzeData's auto-detected charts, this doesn't hide
// near-unique columns since the user already knows what they want to see.
export function computeTopValues(
  rows: SheetRow[],
  header: string,
  limit = 8
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const v = row[header];
    if (v === null || v === undefined || v === "") continue;
    const key = String(v);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}
