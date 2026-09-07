"use client";

import { useState, useTransition } from "react";
import { suggestKeyword, selectKeyword, type KeywordSuggestion } from "@/lib/niches/actions";
import { StepCard } from "./StepCard";
import { KeywordDataTable } from "./KeywordDataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Surface } from "@/components/ui/Surface";
import { StatusBanner } from "@/components/ui/StatusBanner";
export function KeywordSelectionStep({
  nicheId,
  batchId,
  parsedData,
  existing,
}: {
  nicheId: string;
  batchId: string;
  parsedData: { headers: string[]; rows: Record<string, string | number | null>[] } | null;
  existing: { keyword: string; volume: number | null } | null;
}) {
  const [suggestion, setSuggestion] = useState<KeywordSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSuggest() {
    if (!parsedData) return;
    setError(null);
    startTransition(async () => {
      const result = await suggestKeyword(batchId, parsedData.headers, parsedData.rows);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuggestion(result.data);
    });
  }

  if (existing) {
    return (
      <StepCard number={3} title="Selected keyword" done>
        <div className="flex flex-wrap items-center gap-3">
          <p className="font-heading text-lg font-semibold">{existing.keyword}</p>
          {existing.volume !== null && <span className="text-sm text-muted">Volume: {existing.volume.toLocaleString()}</span>}
        </div>
      </StepCard>
    );
  }

  return (
    <StepCard
      number={3}
      title="Pick the keyword to pursue"
      subtitle={parsedData ? "Ask AI for a suggestion, or search the table below and pick your own" : "Upload a CSV first"}
      muted={!parsedData}
    >
      {parsedData && (
        <div className="flex flex-col gap-4">
          <Button type="button" variant="outline" onClick={handleSuggest} disabled={pending}>
            {pending ? "Thinking…" : "Ask AI to suggest a keyword"}
          </Button>

          {error && <StatusBanner tone="danger">{error}</StatusBanner>}

          {suggestion && suggestion.found && (
            <Surface>
              <p className="font-medium text-foreground">{suggestion.keyword}</p>
              <p className="mt-1 text-sm text-muted">{suggestion.reasoning}</p>
            </Surface>
          )}

          {suggestion && !suggestion.found && (
            <StatusBanner tone="warning">
              <p className="font-medium">No good nano-niche match in this list.</p>
              <p className="mt-1">{suggestion.reasoning}</p>
              {suggestion.nextSearch && (
                <p className="mt-2">
                  <span className="font-medium">Try next in Ahrefs:</span> {suggestion.nextSearch}
                </p>
              )}
            </StatusBanner>
          )}

          <KeywordDataTable headers={parsedData.headers} rows={parsedData.rows} />

          <form action={selectKeyword} className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <input type="hidden" name="batchId" value={batchId} />
            <input type="hidden" name="nicheId" value={nicheId} />
            <div className="flex-1">
              <Label htmlFor="keyword" size="sm" muted>
                Keyword
              </Label>
              <Input id="keyword" name="keyword" required defaultValue={(suggestion?.found && suggestion.keyword) || ""} />
            </div>
            <div className="w-36">
              <Label htmlFor="volume" size="sm" muted>
                Actual volume
              </Label>
              <Input id="volume" name="volume" type="number" placeholder="From Google" />
            </div>
            <Button variant="primary" type="submit">
              Confirm keyword
            </Button>
          </form>
        </div>
      )}
    </StepCard>
  );
}
