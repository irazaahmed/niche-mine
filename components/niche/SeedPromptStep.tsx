"use client";

import { useState, useTransition } from "react";
import { generateSeedPrompt } from "@/lib/niches/actions";
import { StepCard } from "./StepCard";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { Surface } from "@/components/ui/Surface";

export function SeedPromptStep({
  nicheId,
  existingPrompt,
}: {
  nicheId: string;
  existingPrompt: string | null;
}) {
  const [prompt, setPrompt] = useState(existingPrompt);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(!existingPrompt);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const roughIdea = String(formData.get("roughIdea") ?? "");
    const drMax = formData.get("drMax") ? Number(formData.get("drMax")) : undefined;
    const minVolume = formData.get("minVolume") ? Number(formData.get("minVolume")) : undefined;
    const includeText = String(formData.get("includeText") ?? "") || undefined;

    startTransition(async () => {
      const result = await generateSeedPrompt(nicheId, roughIdea, {
        dr_top10_max: drMax,
        min_volume: minVolume,
        include_text: includeText,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPrompt(result.data.prompt);
      setEditing(false);
    });
  }

  return (
    <StepCard number={1} title="Generate a seed-keyword prompt" subtitle="AI writes a prompt to run manually in Ahrefs Keywords Explorer" done={!!prompt && !editing}>
      {prompt && !editing && (
        <div className="flex flex-col gap-3">
          <Surface className="whitespace-pre-wrap text-sm text-foreground">{prompt}</Surface>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigator.clipboard.writeText(prompt)}
            >
              Copy
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(true)}>
              Generate another
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <form action={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="roughIdea">Your rough idea</Label>
            <Input id="roughIdea" name="roughIdea" required placeholder='e.g. "AI [Keyword]" or "best [Keyword] for beginners"' />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="drMax" size="sm" muted>
                Max DR (top 10)
              </Label>
              <Input id="drMax" name="drMax" type="number" placeholder="20" />
            </div>
            <div>
              <Label htmlFor="minVolume" size="sm" muted>
                Min volume
              </Label>
              <Input id="minVolume" name="minVolume" type="number" placeholder="10000" />
            </div>
            <div>
              <Label htmlFor="includeText" size="sm" muted>
                Include text
              </Label>
              <Input id="includeText" name="includeText" placeholder="AI" />
            </div>
          </div>
          {error && <StatusBanner tone="danger">{error}</StatusBanner>}
          <Button variant="primary" type="submit" disabled={pending}>
            {pending ? "Generating…" : "Generate prompt"}
          </Button>
        </form>
      )}
    </StepCard>
  );
}
