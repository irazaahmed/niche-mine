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
    const supabase = await createClient();
    const { data: nicheRow } = await supabase.from("niches").select("country").eq("id", nicheId).single();
    const country = nicheRow?.country ?? "my target country";

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: AI_MODEL_LIGHT,
      messages: [
        {
          role: "system",
          content:
            "You write a short, casual, first-person prompt that the user will paste into ChatGPT or Claude. " +
            "The user wants ChatGPT/Claude to generate a stream of SHORT keyword combinations (2-4 words each) built around their modifier pattern — " +
            "not long-tail phrases, not explanations, not full sentences. Each combination is something they'll type directly into Ahrefs Keywords Explorer's empty search box (no seed keyword typed in Ahrefs itself, just a country selected) to see what volume/difficulty comes back for it. " +
            "Output ONLY the prompt text itself (plain text, first person, no markdown, no headers, no preamble).\n\n" +
            "Model the prompt on this exact shape (adapt the wording and examples to the user's own modifier pattern below, don't reuse this text verbatim):\n" +
            '"Hey, I\'m using Ahrefs Keywords Explorer with an empty search, just [country] selected as the country. Help me find short combinations of \'AI [Keyword]\' — mix up where the word goes and add modifiers, e.g. \'AI Tool\', \'Tool AI\', \'Buy AI Software\', \'AI for Beginners\'. I\'m trying to find low-competition AI niches. Keep answers short — just the list of combinations, no explanations — until I say otherwise."\n\n' +
            "Requirements: (1) mention the country and that Ahrefs is searched with no seed keyword typed in, just that country selected, (2) give 3-4 short example combinations using the user's own modifier pattern to show the variety wanted (word before/after, plus a commercial verb like buy/best/get, plus an audience/purpose modifier), (3) state the goal is finding low-competition niches (mention their include-text filter if given), (4) explicitly tell it to keep every answer short — just a plain list of combinations, no explanations — until told otherwise, since this will be an ongoing back-and-forth. Keep the whole prompt to 3-4 sentences.",
        },
        {
          role: "user",
          content: `Modifier pattern: ${roughIdea}\nTarget country: ${country}\nInclude text filter (if any): ${
            parsedFilters.include_text ?? "n/a"
          }`,
        },
      ],
    });

    const prompt = completion.choices[0]?.message?.content?.trim();
    if (!prompt) throw new Error("AI did not return a prompt.");

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
export interface KeywordSuggestion {
  found: boolean;
  keyword: string | null;
  reasoning: string;
  nextSearch: string | null;
}

export async function suggestKeyword(
  batchId: string,
  headers: string[],
  rows: Record<string, string | number | null>[]
): Promise<ActionResult<KeywordSuggestion>> {
  try {
    const { id: userId } = await requireUser();
    await assertAiCallAllowed(userId);

    const supabase = await createClient();
    const { data: batchRow } = await supabase
      .from("seed_keyword_batches")
      .select("niche_id")
      .eq("id", batchId)
      .single();
    let country = "unspecified";
    if (batchRow?.niche_id) {
      const { data: nicheRow } = await supabase.from("niches").select("country").eq("id", batchRow.niche_id).single();
      if (nicheRow?.country) country = nicheRow.country;
    }

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
            "You are helping pick ONE promising keyword from an Ahrefs Keywords Explorer export, to pursue as a NANO-NICHE website topic.\n\n" +
            "Niche levels (narrowest wins): Macro/Sub-niche is broad (e.g. 'Cricket'), Micro-niche is narrower (e.g. 'PSL 2026'), Nano-niche is very specific (e.g. 'PSL 2026 Teams'). " +
            "Nano niches are the easiest to rank for and are the goal here. " +
            "NEVER pick a broad single- or two-word head term (e.g. just 'AI', 'AI Tools', 'AI Software') even if its raw volume looks huge — those are macro/micro-level and already claimed by high-authority sites. " +
            "Prefer a specific, problem-solving phrase that names a concrete tool, task, audience, or use case over a generic head term, even if its volume is smaller — specificity beats raw volume here.\n\n" +
            "Favor high volume with low competition (lowest available top-10 DR/KD/Difficulty column). Rough search-volume benchmarks by market tier (from the target country given): " +
            "Tier-1 countries (US, UK, Australia, Western Europe) — roughly 15k+ monthly volume is workable since CPC is high; " +
            "Tier-2 countries (South Asia, Southeast Asia, and similar lower-CPC markets) — roughly 30k+ is preferred since more traffic is needed to earn the same amount; " +
            "if the country doesn't clearly fit either tier, just apply the general 'higher volume, lower competition, more specific' principle.\n\n" +
            "If NONE of the rows are a genuinely good nano-niche pick (every row is a broad head term, or fails the volume/competition bar for the given country), do not force a pick. " +
            "Instead set found=false, keyword=null, explain in reasoning why nothing here qualifies, and use nextSearch to recommend a concrete next search to run in Ahrefs Keywords Explorer — a specific volume threshold (a number), a specific DR threshold for the top 10 or top 5 results (a number), and one or two specific include-text words/phrases worth searching for next, based on patterns you noticed in this data.\n\n" +
            'Reply as JSON: {"found": boolean, "keyword": string | null, "reasoning": string (1-2 sentences), "nextSearch": string | null (only when found is false — a concrete instruction like "Search Ahrefs with min volume 10000, top-10 DR under 20, include text \'X\'")}.',
        },
        {
          role: "user",
          content: `Target country: ${country}\nColumns: ${headers.join(", ")}\nRows (JSON):\n${JSON.stringify(sample)}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error("AI did not return a suggestion.");
    const parsed = z
      .object({
        found: z.boolean(),
        keyword: z.string().nullable(),
        reasoning: z.string(),
        nextSearch: z.string().nullable().optional(),
      })
      .parse(JSON.parse(raw));

    await recordAiCall(userId, "suggested_keyword", {
      batch_id: batchId,
      found: parsed.found,
      keyword: parsed.keyword,
      tokens: completion.usage,
    });
    return {
      ok: true,
      data: { found: parsed.found, keyword: parsed.keyword, reasoning: parsed.reasoning, nextSearch: parsed.nextSearch ?? null },
    };
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

// ---------------------------------------------------------------------
// Permanently delete a niche and everything under it (RLS restricts this
// to the owner or an admin; the FK chain is ON DELETE CASCADE).
// ---------------------------------------------------------------------
export async function deleteNiche(formData: FormData): Promise<void> {
  const nicheId = String(formData.get("nicheId") ?? "");
  if (!nicheId) return;
  const supabase = await createClient();
  await supabase.from("niches").delete().eq("id", nicheId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
