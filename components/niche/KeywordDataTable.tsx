"use client";

import { useMemo, useState } from "react";
import type { SheetRow } from "@/lib/sheet-parser/parseSheet";
import { Table } from "@/components/ui/Table";
import { Input } from "@/components/ui/Input";

export function KeywordDataTable({
  headers,
  rows,
  maxRows = 15,
}: {
  headers: string[];
  rows: SheetRow[];
  maxRows?: number;
}) {
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const needle = search.toLowerCase();
    return rows.filter((row) => headers.some((h) => String(row[h] ?? "").toLowerCase().includes(needle)));
  }, [rows, headers, search]);

  const visibleRows = filteredRows.slice(0, maxRows);

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search the table…"
        className="mt-0"
      />
      <Table>
        <Table.Head>
          {headers.map((h) => (
            <Table.Th key={h}>{h}</Table.Th>
          ))}
        </Table.Head>
        <Table.Body>
          {visibleRows.map((row, i) => (
            <Table.Row key={i}>
              {headers.map((h) => (
                <Table.Td key={h}>{row[h] === null || row[h] === undefined ? "—" : String(row[h])}</Table.Td>
              ))}
            </Table.Row>
          ))}
          {visibleRows.length === 0 && (
            <Table.Row>
              <Table.Td colSpan={headers.length}>No results.</Table.Td>
            </Table.Row>
          )}
        </Table.Body>
      </Table>
      {filteredRows.length > maxRows && (
        <p className="text-xs text-muted">
          Showing {maxRows} of {filteredRows.length} rows
        </p>
      )}
    </div>
  );
}
