"use client";

import { useFormStatus } from "react-dom";
import { cx } from "./cx";

const DEFAULT_CLASS =
  "btn-sheen mt-1 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-accent font-medium text-white transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_36px_-6px_var(--color-accent)] disabled:opacity-70";

// Lives inside a <form> whose action is a server action — useFormStatus
// flips to pending the instant the form submits, so the button shows a
// spinner immediately instead of sitting there looking frozen while the
// server action (and any redirect) resolves.
export function FormSubmitButton({
  children,
  pendingLabel,
  className = DEFAULT_CLASS,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={cx(className)}>
      {pending ? (
        <>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  );
}
