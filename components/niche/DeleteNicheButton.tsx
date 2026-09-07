"use client";

import { useState } from "react";
import { deleteNiche } from "@/lib/niches/actions";
import { Button } from "@/components/ui/Button";

/** Inline confirm — click "Delete" to reveal Yes/Cancel rather than a
 * browser confirm() dialog or a full type-to-confirm form (this only
 * removes the user's own in-progress research, not another account). */
export function DeleteNicheButton({ nicheId }: { nicheId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button type="button" variant="outline-danger" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted">Delete permanently?</span>
      <form action={deleteNiche}>
        <input type="hidden" name="nicheId" value={nicheId} />
        <Button variant="danger" type="submit">
          Yes, delete
        </Button>
      </form>
      <Button type="button" variant="outline" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
