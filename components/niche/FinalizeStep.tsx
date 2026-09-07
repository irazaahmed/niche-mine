"use client";

import { useState, useTransition } from "react";
import { finalizeNiche, rejectNiche } from "@/lib/niches/actions";
import { StepCard } from "./StepCard";
import { Button } from "@/components/ui/Button";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { Surface } from "@/components/ui/Surface";
import type { FinalShortlistRow, NicheStatus } from "@/lib/supabase/types";

export function FinalizeStep({
  nicheId,
  status,
  hasAnalysis,
  shortlist,
}: {
  nicheId: string;
  status: NicheStatus;
  hasAnalysis: boolean;
  shortlist: FinalShortlistRow | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleFinalize() {
    setError(null);
    startTransition(async () => {
      const result = await finalizeNiche(nicheId);
      if (!result.ok) setError(result.error);
    });
  }

  if (status === "finalized" && shortlist) {
    return (
      <StepCard number={6} title="Final verdict" done>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="font-heading text-3xl font-semibold text-accent-bright">{shortlist.score}</span>
            <span className="text-sm text-muted">/ 100 confidence score</span>
          </div>
          <Surface className="text-sm text-foreground">{shortlist.summary}</Surface>
        </div>
      </StepCard>
    );
  }

  if (status === "rejected") {
    return (
      <StepCard number={6} title="Final verdict" done>
        <StatusBanner tone="danger">This niche was rejected.</StatusBanner>
      </StepCard>
    );
  }

  return (
    <StepCard
      number={6}
      title="Finalize this niche"
      subtitle={hasAnalysis ? "AI scores the niche and adds it to your shortlist" : "Analyze at least one competitor first"}
      muted={!hasAnalysis}
    >
      {hasAnalysis && (
        <div className="flex flex-col gap-3">
          {error && <StatusBanner tone="danger">{error}</StatusBanner>}
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" type="button" onClick={handleFinalize} disabled={pending}>
              {pending ? "Scoring…" : "Finalize this niche"}
            </Button>
            <form action={rejectNiche}>
              <input type="hidden" name="nicheId" value={nicheId} />
              <Button variant="outline-danger" type="submit">
                Reject this niche
              </Button>
            </form>
          </div>
        </div>
      )}
    </StepCard>
  );
}
