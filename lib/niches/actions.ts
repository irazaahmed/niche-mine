"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/current-user";
import { getOpenAI, AI_MODEL_LIGHT, AI_MODEL_FINAL } from "@/lib/openai";
import { assertAiCallAllowed, recordAiCall, AiLimitExceededError } from "@/lib/ai-usage";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function fail(error: unknown): { ok: false; error: string } {
  if (error instanceof AiLimitExceededError) return { ok: false, error: error.message };
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return { ok: false, error: message };
}

// ---------------------------------------------------------------------
// Step 3: create a niche (country selection)
// ---------------------------------------------------------------------
export async function createNiche(formData: FormData) {
  const country = String(formData.get("country") ?? "").trim();
  if (!country) return;

  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("niches")
    .insert({ user_id: userId, country })
    .select("id")
    .single();

  if (error || !data) return;

  await supabase.from("activity_log").insert({ user_id: userId, action: "created_niche", metadata: { country } });
  redirect(`/niches/${data.id}`);
}

// ---------------------------------------------------------------------
// Step 4: AI-generated seed-keyword-hunting prompt for Ahrefs Keywords
// Explorer. Creates the seed_keyword_batches row the rest of the workflow
// (CSV upload, keyword selection) attaches to.
// ---------------------------------------------------------------------
const seedPromptFilters = z.object({
  dr_top10_max: z.number().optional(),
  min_volume: z.number().optional(),
  include_text: z.string().optional(),
});

export async function generateSeedPrompt(
  nicheId: string,
  roughIdea: string,
  filters: z.infer<typeof seedPromptFilters>
): Promise<ActionResult<{ batchId: string; prompt: string }>> {
  try {
    const { id: userId } = await requireUser();
    await assertAiCallAllowed(userId);

    const parsedFilters = seedPromptFilters.parse(filters);
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: AI_MODEL_LIGHT,
      messages: [
        {
          role: "system",
          content:
            "You write short, copy-pasteable seed-keyword-hunting prompts for a human to run manually in Ahrefs Keywords Explorer (and optionally ChatGPT for brainstorming). " +
            "Output ONLY the prompt text itself, 2-5 sentences, no preamble, no markdown headers. " +
            "It should tell the reader what seed term(s) to search, what modifier pattern to try (the user's rough idea, e.g. 'AI [Keyword]'), and remind them to apply the given filters in Ahrefs.",
        },
        {
          role: "user",
          content: `Rough idea: ${roughIdea}\nFilters to mention: DR of top 10 results <= ${
            parsedFilters.dr_top10_max ?? "n/a"
          }, minimum search volume >= ${parsedFilters.min_volume ?? "n/a"}, include text: "${
            parsedFilters.include_text ?? "n/a"
          }".`,
        },
      ],
    });

    const prompt = completion.choices[0]?.message?.content?.trim();
    if (!prompt) throw new Error("AI did not return a prompt.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seed_keyword_batches")
      .insert({ niche_id: nicheId, ai_prompt_used: prompt, filters_applied: parsedFilters })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Could not save the generated prompt.");

    await recordAiCall(userId, "generated_seed_prompt", {
      niche_id: nicheId,
      batch_id: data.id,
      tokens: completion.usage,
    });
    revalidatePath(`/niches/${nicheId}`);
    return { ok: true, data: { batchId: data.id, prompt } };
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------
// Step 6: attach the parsed CSV export to the seed batch.
// ---------------------------------------------------------------------
export async function attachCsvBatch(
  batchId: string,
  nicheId: string,
  csvFileUrl: string,
  parsedData: { headers: string[]; rows: Record<string, string | number | null>[] }
): Promise<ActionResult> {
  try {
    const { id: userId } = await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("seed_keyword_batches")
      .update({ csv_file_url: csvFileUrl, parsed_data: parsedData })
      .eq("id", batchId);
    if (error) throw new Error(error.message);

    await supabase.from("activity_log").insert({
      user_id: userId,
      action: "uploaded_csv",
      metadata: { niche_id: nicheId, batch_id: batchId, rows: parsedData.rows.length },
    });
    revalidatePath(`/niches/${nicheId}`);
    return { ok: true, data: undefined };
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------
// Step 7: AI suggests the most promising keyword from the parsed table.
// ---------------------------------------------------------------------
export async function suggestKeyword(
  batchId: string,
  headers: string[],
  rows: Record<string, string | number | null>[]
): Promise<ActionResult<{ keyword: string; reasoning: string }>> {
  try {
    const { id: userId } = await requireUser();
    await assertAiCallAllowed(userId);

    // Cap the sample sent to the model — a 5k-row Ahrefs export doesn't
    // need to be fully replayed for a "pick the best one" judgment call.
    const sample = rows.slice(0, 40);
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: AI_MODEL_LIGHT,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are helping pick the single most promising keyword from an Ahrefs Keywords Explorer export for a low-competition, high-volume niche site. " +
            'Favor high volume with a low top-10 Difficulty/DR. Reply as JSON: {"keyword": string, "reasoning": string (1-2 sentences)}.',
        },
        {
          role: "user",
          content: `Columns: ${headers.join(", ")}\nRows (JSON):\n${JSON.stringify(sample)}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("AI did not return a suggestion.");
    const parsed = z.object({ keyword: z.string(), reasoning: z.string() }).parse(JSON.parse(raw));

    await recordAiCall(userId, "suggested_keyword", {
      batch_id: batchId,
      keyword: parsed.keyword,
      tokens: completion.usage,
    });
    return { ok: true, data: parsed };
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------
// Step 8: user (or AI-assisted) picks the keyword to pursue + real volume.
// ---------------------------------------------------------------------
export async function selectKeyword(formData: FormData): Promise<void> {
  const batchId = String(formData.get("batchId") ?? "");
  const nicheId = String(formData.get("nicheId") ?? "");
  const keyword = String(formData.get("keyword") ?? "").trim();
  const volume = Number(formData.get("volume") ?? 0) || null;
  if (!batchId || !keyword) return;

  const { id: userId } = await requireUser();
  const supabase = await createClient();
  await supabase.from("selected_keywords").insert({ seed_batch_id: batchId, keyword, volume });
  await supabase.from("activity_log").insert({
    user_id: userId,
    action: "selected_keyword",
    metadata: { niche_id: nicheId, batch_id: batchId, keyword, volume },
  });
  revalidatePath(`/niches/${nicheId}`);
}

// ---------------------------------------------------------------------
// Step 9: competitor sites (1-3 lowest-DR SERP results) for the keyword.
// ---------------------------------------------------------------------
export async function addCompetitorSite(formData: FormData): Promise<void> {
  const selectedKeywordId = String(formData.get("selectedKeywordId") ?? "");
  const nicheId = String(formData.get("nicheId") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  const dr = formData.get("dr") ? Number(formData.get("dr")) : null;
  if (!selectedKeywordId || !url) return;

  const supabase = await createClient();
  await supabase.from("competitor_sites").insert({ selected_keyword_id: selectedKeywordId, url, dr });
  revalidatePath(`/niches/${nicheId}`);
}

// ---------------------------------------------------------------------
// Step 10: reverse-engineered Ahrefs data per competitor site.
// ---------------------------------------------------------------------
const topKeywordSchema = z.object({ keyword: z.string(), volume: z.number() });

export async function saveReverseEngineeredData(formData: FormData): Promise<void> {
  const competitorSiteId = String(formData.get("competitorSiteId") ?? "");
  const nicheId = String(formData.get("nicheId") ?? "");
  const organicTraffic = formData.get("organicTraffic") ? Number(formData.get("organicTraffic")) : null;
  const paidTraffic = formData.get("paidTraffic") ? Number(formData.get("paidTraffic")) : null;
  const topKeywordsRaw = String(formData.get("topKeywords") ?? "[]");
  if (!competitorSiteId) return;

  let topKeywords: z.infer<typeof topKeywordSchema>[] = [];
  try {
    topKeywords = z.array(topKeywordSchema).parse(JSON.parse(topKeywordsRaw));
  } catch {
    topKeywords = [];
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("reverse_engineered_data")
    .select("id")
    .eq("competitor_site_id", competitorSiteId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("reverse_engineered_data")
      .update({ organic_traffic: organicTraffic, paid_traffic: paidTraffic, top_keywords: topKeywords })
      .eq("id", existing.id);
  } else {
    await supabase.from("reverse_engineered_data").insert({
      competitor_site_id: competitorSiteId,
      organic_traffic: organicTraffic,
      paid_traffic: paidTraffic,
      top_keywords: topKeywords,
    });
  }

  revalidatePath(`/niches/${nicheId}`);
}

// ---------------------------------------------------------------------
// Step 11: AI reads the reverse-engineered data and gives a recommendation.
// ---------------------------------------------------------------------
export async function analyzeCompetitor(
  reverseEngineeredDataId: string,
  nicheId: string
): Promise<ActionResult<{ analysis: string }>> {
  try {
    const { id: userId } = await requireUser();
    await assertAiCallAllowed(userId);

    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("reverse_engineered_data")
      .select("*")
      .eq("id", reverseEngineeredDataId)
      .single();
    if (error || !row) throw new Error("Reverse-engineered data not found.");

    const { data: site } = await supabase
      .from("competitor_sites")
      .select("url, dr")
      .eq("id", row.competitor_site_id)
      .single();

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: AI_MODEL_LIGHT,
      messages: [
        {
          role: "system",
          content:
            "You review one competitor site's reverse-engineered Ahrefs metrics and give a short, direct verdict (3-4 sentences) on whether it's a promising lead for a low-competition niche site to target — cite the specific numbers you're reacting to.",
        },
        {
          role: "user",
          content: JSON.stringify({
            url: site?.url,
            dr: site?.dr,
            organic_traffic: row.organic_traffic,
            paid_traffic: row.paid_traffic,
            top_keywords: row.top_keywords,
          }),
        },
      ],
    });

    const analysis = completion.choices[0]?.message?.content?.trim();
    if (!analysis) throw new Error("AI did not return an analysis.");

    await supabase.from("reverse_engineered_data").update({ ai_analysis: analysis }).eq("id", reverseEngineeredDataId);
    await recordAiCall(userId, "analyzed_competitor", {
      niche_id: nicheId,
      reverse_engineered_data_id: reverseEngineeredDataId,
      tokens: completion.usage,
    });
    revalidatePath(`/niches/${nicheId}`);
    return { ok: true, data: { analysis } };
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------
// Step 12: finalize — larger model scores the niche and adds it to the
// shortlist. Only runs on explicit user action, never automatically.
// ---------------------------------------------------------------------
export async function finalizeNiche(nicheId: string): Promise<ActionResult<{ score: number }>> {
  try {
    const { id: userId } = await requireUser();
    await assertAiCallAllowed(userId);

    const supabase = await createClient();
    const { data: niche, error: nicheError } = await supabase
      .from("niches")
      .select(
        `id, country,
         seed_keyword_batches (
           id,
           selected_keywords (
             id, keyword, volume,
             competitor_sites (
               id, url, dr,
               reverse_engineered_data ( organic_traffic, paid_traffic, top_keywords, ai_analysis )
             )
           )
         )`
      )
      .eq("id", nicheId)
      .single();
    if (nicheError || !niche) throw new Error("Niche not found.");

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: AI_MODEL_FINAL,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a senior SEO strategist. Given a full niche research trail (seed keywords, the chosen keyword, competitor sites and their reverse-engineered Ahrefs metrics with per-competitor AI analysis), write a final verdict. " +
            'Reply as JSON: {"summary": string (a punchy 3-5 sentence writeup of whether this niche is worth pursuing and why), "score": number (0-100 confidence/quality score)}.',
        },
        { role: "user", content: JSON.stringify(niche) },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("AI did not return a verdict.");
    const parsed = z.object({ summary: z.string(), score: z.number() }).parse(JSON.parse(raw));

    await supabase.from("final_shortlist").insert({ niche_id: nicheId, summary: parsed.summary, score: parsed.score });
    await supabase.from("niches").update({ status: "finalized" }).eq("id", nicheId);
    await recordAiCall(userId, "finalized_niche", {
      niche_id: nicheId,
      score: parsed.score,
      tokens: completion.usage,
    });
    revalidatePath(`/niches/${nicheId}`);
    revalidatePath("/dashboard");
    return { ok: true, data: { score: parsed.score } };
  } catch (error) {
    return fail(error);
  }
}

// ---------------------------------------------------------------------
// Reject a niche (no AI call — a plain status change).
// ---------------------------------------------------------------------
export async function rejectNiche(formData: FormData): Promise<void> {
  const nicheId = String(formData.get("nicheId") ?? "");
  if (!nicheId) return;
  const supabase = await createClient();
  await supabase.from("niches").update({ status: "rejected" }).eq("id", nicheId);
  revalidatePath(`/niches/${nicheId}`);
  revalidatePath("/dashboard");
}
