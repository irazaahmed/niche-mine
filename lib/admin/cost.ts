// Rough USD cost estimate for the admin dashboard — not a billing-accurate
// figure, just enough to flag "AI spend is trending up this month".
// Public per-1M-token pricing as of writing; update if OpenAI reprices.
const PRICE_PER_MILLION_TOKENS = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 2.5, output: 10.0 },
} as const;

const ACTION_MODEL: Record<string, keyof typeof PRICE_PER_MILLION_TOKENS> = {
  generated_seed_prompt: "gpt-4o-mini",
  suggested_keyword: "gpt-4o-mini",
  analyzed_competitor: "gpt-4o-mini",
  finalized_niche: "gpt-4o",
};

interface TokenMetadata {
  tokens?: { prompt_tokens?: number; completion_tokens?: number } | null;
}

export function estimateAiCostUsd(logs: { action: string; metadata: TokenMetadata | null }[]): number {
  let total = 0;
  for (const log of logs) {
    const model = ACTION_MODEL[log.action];
    const tokens = log.metadata?.tokens;
    if (!model || !tokens) continue;
    const price = PRICE_PER_MILLION_TOKENS[model];
    total += ((tokens.prompt_tokens ?? 0) * price.input) / 1_000_000;
    total += ((tokens.completion_tokens ?? 0) * price.output) / 1_000_000;
  }
  return total;
}
