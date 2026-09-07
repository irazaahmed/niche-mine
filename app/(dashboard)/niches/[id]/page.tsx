import { notFound } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Badge";
import { SeedPromptStep } from "@/components/niche/SeedPromptStep";
import { CsvUploadStep } from "@/components/niche/CsvUploadStep";
import { KeywordSelectionStep } from "@/components/niche/KeywordSelectionStep";
import { CompetitorStep } from "@/components/niche/CompetitorStep";
import { ReverseEngineeredStep } from "@/components/niche/ReverseEngineeredStep";
import { FinalizeStep } from "@/components/niche/FinalizeStep";
import { DeleteNicheButton } from "@/components/niche/DeleteNicheButton";
import type {
  NicheStatus,
  CompetitorSiteRow,
  ReverseEngineeredDataRow,
  FinalShortlistRow,
} from "@/lib/supabase/types";

const STATUS_TONE: Record<NicheStatus, "neutral" | "success" | "danger"> = {
  researching: "neutral",
  finalized: "success",
  rejected: "danger",
};

interface CompetitorSiteWithData extends CompetitorSiteRow {
  reverse_engineered_data: ReverseEngineeredDataRow[];
}

// Hand-typed cast for this nested select — the Database type in
// lib/supabase/types.ts has no `Relationships` metadata (that only exists
// after `supabase gen types` runs against a live project), so supabase-js
// can't infer embedded-resource shapes on its own.
interface NicheDetailRow {
  id: string;
  country: string;
  status: NicheStatus;
  created_at: string;
  seed_keyword_batches: {
    id: string;
    ai_prompt_used: string | null;
    filters_applied: Record<string, unknown> | null;
    csv_file_url: string | null;
    parsed_data: { headers: string[]; rows: Record<string, string | number | null>[] } | null;
    created_at: string;
    selected_keywords: {
      id: string;
      keyword: string;
      volume: number | null;
      created_at: string;
      competitor_sites: CompetitorSiteWithData[];
    }[];
  }[];
  final_shortlist: FinalShortlistRow[];
}

export default async function NichePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: nicheId } = await params;
  const { id: userId } = await requireUser();
  const supabase = await createClient();

  const { data: rawNiche } = await supabase
    .from("niches")
    .select(
      `id, country, status, created_at,
       seed_keyword_batches (
         id, ai_prompt_used, filters_applied, csv_file_url, parsed_data, created_at,
         selected_keywords (
           id, keyword, volume, created_at,
           competitor_sites (
             id, url, dr, created_at,
             reverse_engineered_data ( id, organic_traffic, paid_traffic, top_keywords, ai_analysis, created_at )
           )
         )
       ),
       final_shortlist ( id, summary, score, created_at )`
    )
    .eq("id", nicheId)
    .single();

  if (!rawNiche) notFound();
  const niche = rawNiche as unknown as NicheDetailRow;

  const batches = [...niche.seed_keyword_batches].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const batch = batches[0] ?? null;
  const selectedKeyword = batch?.selected_keywords?.[0] ?? null;
  const sites = (selectedKeyword?.competitor_sites ?? []) as CompetitorSiteWithData[];
  const shortlist = niche.final_shortlist?.[0] ?? null;
  const parsedData = batch?.parsed_data as { headers: string[]; rows: Record<string, string | number | null>[] } | null;

  const sitesWithData = sites.map((s) => ({
    site: s,
    data: s.reverse_engineered_data?.[0] ?? null,
  }));
  const hasAnalysis = sitesWithData.some((s) => s.data?.ai_analysis);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">{niche.country}</h1>
          <p className="mt-1 text-sm text-muted">Started {new Date(niche.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={STATUS_TONE[niche.status]} size="lg" dot>
            {niche.status}
          </Badge>
          <DeleteNicheButton nicheId={nicheId} />
        </div>
      </div>

      <SeedPromptStep nicheId={nicheId} existingPrompt={batch?.ai_prompt_used ?? null} />

      {batch && (
        <CsvUploadStep nicheId={nicheId} batchId={batch.id} userId={userId} existing={parsedData} />
      )}

      {batch && (
        <KeywordSelectionStep nicheId={nicheId} batchId={batch.id} parsedData={parsedData} existing={selectedKeyword} />
      )}

      <CompetitorStep nicheId={nicheId} selectedKeywordId={selectedKeyword?.id ?? null} sites={sites} />

      <ReverseEngineeredStep nicheId={nicheId} sites={sitesWithData} />

      <FinalizeStep nicheId={nicheId} status={niche.status} hasAnalysis={hasAnalysis} shortlist={shortlist} />
    </div>
  );
}
