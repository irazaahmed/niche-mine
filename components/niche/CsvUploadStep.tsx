"use client";

import { useState, useTransition } from "react";
import { parseSheetFile, isExcelFile, listExcelSheetNames, type ParsedSheet } from "@/lib/sheet-parser/parseSheet";
import { cleanData } from "@/lib/sheet-parser/cleanData";
import { attachCsvBatch } from "@/lib/niches/actions";
import { createClient } from "@/lib/supabase/client";
import { StepCard } from "./StepCard";
import { KeywordDataTable } from "./KeywordDataTable";
import { Button } from "@/components/ui/Button";
import { StatusBanner } from "@/components/ui/StatusBanner";

interface Existing {
  headers: string[];
  rows: Record<string, string | number | null>[];
}

export function CsvUploadStep({
  nicheId,
  batchId,
  userId,
  existing,
}: {
  nicheId: string;
  batchId: string;
  userId: string;
  existing: Existing | null;
}) {
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Existing["rows"] } | null>(existing);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(!!existing);
  const [pending, startTransition] = useTransition();

  async function processFile(file: File, sheetName?: string) {
    setError(null);
    try {
      const raw: ParsedSheet = await parseSheetFile(file, sheetName);
      const clean = cleanData(raw);
      setParsed({ headers: clean.headers, rows: clean.rows });
      setPendingFile(null);
      setSheetNames([]);
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file.");
    }
  }

  async function handleFile(file: File) {
    if (isExcelFile(file)) {
      try {
        const names = await listExcelSheetNames(file);
        if (names.length > 1) {
          setPendingFile(file);
          setSheetNames(names);
          return;
        }
      } catch {
        // fall through — processFile surfaces the real parsing error
      }
    }
    await processFile(file);
    // keep the raw file around so we can also store it in Supabase Storage
    setPendingFile(file);
  }

  function handleSave() {
    if (!parsed || !pendingFile) return;
    setError(null);
    startTransition(async () => {
      let csvFileUrl = "";
      try {
        const supabase = createClient();
        const path = `${userId}/${nicheId}/${Date.now()}-${pendingFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("seed-keyword-csvs")
          .upload(path, pendingFile);
        if (uploadError) throw new Error(uploadError.message);
        csvFileUrl = path;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload file.");
        return;
      }

      const result = await attachCsvBatch(batchId, nicheId, csvFileUrl, parsed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
    });
  }

  const isPickingSheet = pendingFile && sheetNames.length > 1 && !parsed;

  return (
    <StepCard number={2} title="Upload the Ahrefs CSV export" subtitle="Filtered export from Ahrefs Keywords Explorer" done={saved}>
      {!parsed && !isPickingSheet && (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-surface/40 p-10 text-center transition-colors hover:border-accent">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <p className="text-sm font-medium text-foreground">Click to select a .csv, .xlsx, or .xls file</p>
          <p className="text-xs text-muted">Max 10MB — Ahrefs/Semrush exports supported</p>
        </label>
      )}

      {isPickingSheet && (
        <div className="flex flex-wrap gap-2">
          {sheetNames.map((name) => (
            <Button key={name} type="button" variant="outline" onClick={() => pendingFile && processFile(pendingFile, name)}>
              {name}
            </Button>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-3">
          <StatusBanner tone="danger">{error}</StatusBanner>
        </div>
      )}

      {parsed && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <span>{parsed.rows.length} rows</span>
            <span>{parsed.headers.length} columns</span>
            {!saved && (
              <Button type="button" variant="outline" className="ml-auto" onClick={() => { setParsed(null); setPendingFile(null); }}>
                Choose a different file
              </Button>
            )}
          </div>
          <KeywordDataTable headers={parsed.headers} rows={parsed.rows} />
          {!saved && pendingFile && (
            <Button variant="primary" type="button" onClick={handleSave} disabled={pending}>
              {pending ? "Saving…" : "Save this table"}
            </Button>
          )}
        </div>
      )}
    </StepCard>
  );
}
