"use client";

import { useState, useTransition } from "react";
import { saveReverseEngineeredData, analyzeCompetitor } from "@/lib/niches/actions";
import { StepCard } from "./StepCard";
import { Surface } from "@/components/ui/Surface";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { StatusBanner } from "@/components/ui/StatusBanner";
import type { CompetitorSiteRow, ReverseEngineeredDataRow } from "@/lib/supabase/types";

interface SiteWithData {
  site: CompetitorSiteRow;
  data: ReverseEngineeredDataRow | null;
}

function topKeywordsToText(topKeywords: ReverseEngineeredDataRow["top_keywords"]): string {
  if (!topKeywords) return "";
  return topKeywords.map((k) => `${k.keyword}: ${k.volume}`).join("\n");
}

function parseTopKeywordsText(text: string): { keyword: string; volume: number }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [keyword, volume] = line.split(":").map((p) => p.trim());
      return { keyword: keyword ?? line, volume: Number(volume) || 0 };
    });
}

function CompetitorAnalysisCard({ nicheId, site, data }: { nicheId: string } & SiteWithData) {
  const [analysis, setAnalysis] = useState(data?.ai_analysis ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleAnalyze() {
    if (!data) return;
    setError(null);
    startTransition(async () => {
      const result = await analyzeCompetitor(data.id, nicheId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAnalysis(result.data.analysis);
    });
  }

  return (
    <Surface className="flex flex-col gap-3">
      <p className="truncate text-sm font-medium text-foreground">{site.url}</p>

      <form action={saveReverseEngineeredData} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <input type="hidden" name="competitorSiteId" value={site.id} />
        <input type="hidden" name="nicheId" value={nicheId} />
        <div>
          <Label htmlFor={`organic-${site.id}`} size="sm" muted>
            Organic traffic
          </Label>
          <Input id={`organic-${site.id}`} name="organicTraffic" type="number" defaultValue={data?.organic_traffic ?? ""} />
        </div>
        <div>
          <Label htmlFor={`paid-${site.id}`} size="sm" muted>
            Paid traffic
          </Label>
          <Input id={`paid-${site.id}`} name="paidTraffic" type="number" defaultValue={data?.paid_traffic ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor={`kw-${site.id}`} size="sm" muted>
            Top ranking keywords (one per line, &ldquo;keyword: volume&rdquo;)
          </Label>
          <input type="hidden" name="topKeywords" id={`kw-hidden-${site.id}`} />
          <Textarea
            id={`kw-${site.id}`}
            rows={3}
            defaultValue={topKeywordsToText(data?.top_keywords ?? null)}
            placeholder={"best ai tool: 5400\nfree ai generator: 2200"}
            onChange={(e) => {
              const hidden = document.getElementById(`kw-hidden-${site.id}`) as HTMLInputElement | null;
              if (hidden) hidden.value = JSON.stringify(parseTopKeywordsText(e.target.value));
            }}
          />
        </div>
        <div className="sm:col-span-2">
          <Button variant="outline" type="submit">
            Save data
          </Button>
        </div>
      </form>

      {error && <StatusBanner tone="danger">{error}</StatusBanner>}

      {analysis ? (
        <Surface className="text-sm text-foreground">{analysis}</Surface>
      ) : (
        <Button type="button" variant="outline" onClick={handleAnalyze} disabled={pending || !data}>
          {pending ? "Analyzing…" : "Analyze with AI"}
        </Button>
      )}
    </Surface>
  );
}

export function ReverseEngineeredStep({ nicheId, sites }: { nicheId: string; sites: SiteWithData[] }) {
  return (
    <StepCard
      number={5}
      title="Reverse-engineer each competitor"
      subtitle={sites.length > 0 ? "Ahrefs metrics per site, then an AI read on each" : "Add a competitor site first"}
      done={sites.some((s) => s.data?.ai_analysis)}
      muted={sites.length === 0}
    >
      {sites.length > 0 && (
        <div className="flex flex-col gap-4">
          {sites.map(({ site, data }) => (
            <CompetitorAnalysisCard key={site.id} nicheId={nicheId} site={site} data={data} />
          ))}
        </div>
      )}
    </StepCard>
  );
}
