import OpenAI from "openai";

let client: OpenAI | null = null;

/** Lazily constructed so importing this module doesn't throw when
 * OPENAI_API_KEY isn't set yet (e.g. during `next build`). */
export function getOpenAI(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

// Per CLAUDE.md section 5: gpt-4o-mini for everything except the explicit
// "Finalize this niche" scoring call, which alone justifies the larger model.
export const AI_MODEL_LIGHT = "gpt-4o-mini";
export const AI_MODEL_FINAL = "gpt-4o";
