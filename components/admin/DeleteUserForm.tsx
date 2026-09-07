"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Button } from "@/components/ui/Button";

/** Type-to-confirm guard for an irreversible action — the delete button
 * stays disabled until the typed text exactly matches the user's email, so
 * a misclick can't take out a real user's account and all their research. */
export function DeleteUserForm({
  userId,
  userEmail,
  action,
}: {
  userId: string;
  userEmail: string;
  action: (formData: FormData) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const matches = confirmText === userEmail;

  return (
    <form action={action} onSubmit={() => setSubmitting(true)} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Label htmlFor="confirmEmail" size="sm" muted>
        Type <span className="font-semibold text-foreground">{userEmail}</span> to confirm
      </Label>
      <Input
        id="confirmEmail"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        variant="danger"
        className="max-w-sm text-sm"
        autoComplete="off"
      />
      <Button variant="danger" type="submit" disabled={!matches || submitting} className="self-start">
        {submitting ? "Deleting…" : "Permanently delete user"}
      </Button>
    </form>
  );
}
