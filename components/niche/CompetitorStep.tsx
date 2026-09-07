"use client";

import { addCompetitorSite } from "@/lib/niches/actions";
import { StepCard } from "./StepCard";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import type { CompetitorSiteRow } from "@/lib/supabase/types";

const MAX_SITES = 3;

export function CompetitorStep({
  nicheId,
  selectedKeywordId,
  sites,
}: {
  nicheId: string;
  selectedKeywordId: string | null;
  sites: CompetitorSiteRow[];
}) {
  const atLimit = sites.length >= MAX_SITES;

  return (
    <StepCard
      number={4}
      title="Add the lowest-DR competitor sites"
      subtitle={selectedKeywordId ? "1-3 sites from the keyword's SERP" : "Select a keyword first"}
      done={sites.length > 0}
      muted={!selectedKeywordId}
    >
      {selectedKeywordId && (
        <div className="flex flex-col gap-4">
          {sites.length > 0 && (
            <div className="flex flex-col gap-2">
              {sites.map((s) => (
                <Surface key={s.id} className="flex items-center justify-between gap-3">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm text-accent-bright hover:underline">
                    {s.url}
                  </a>
                  {s.dr !== null && <span className="shrink-0 text-xs text-muted">DR {s.dr}</span>}
                </Surface>
              ))}
            </div>
          )}

          {!atLimit && (
            <form action={addCompetitorSite} className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="selectedKeywordId" value={selectedKeywordId} />
              <input type="hidden" name="nicheId" value={nicheId} />
              <div className="flex-1">
                <Label htmlFor="url" size="sm" muted>
                  Site URL
                </Label>
                <Input id="url" name="url" type="url" required placeholder="https://example.com/page" />
              </div>
              <div className="w-28">
                <Label htmlFor="dr" size="sm" muted>
                  DR
                </Label>
                <Input id="dr" name="dr" type="number" placeholder="12" />
              </div>
              <Button variant="outline" type="submit">
                Add site
              </Button>
            </form>
          )}
        </div>
      )}
    </StepCard>
  );
}
