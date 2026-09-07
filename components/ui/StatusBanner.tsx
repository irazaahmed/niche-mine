import type { ReactNode } from "react";
import { cx } from "./cx";

const TONE = {
  neutral: "border-border bg-surface/60 text-muted",
  success: "border-emerald-400/30 bg-emerald-400/10 text-success-text",
  warning: "border-amber-400/30 bg-amber-400/10 text-warning-text",
  danger: "border-red-500/30 bg-red-500/10 text-danger-text",
};

/** Full-width alert box for trial/limit/error banners and form messages. */
export function StatusBanner({
  tone,
  children,
  className,
}: {
  tone: keyof typeof TONE;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("rounded-2xl border px-5 py-3.5 text-sm", TONE[tone], className)}>
      {children}
    </div>
  );
}
