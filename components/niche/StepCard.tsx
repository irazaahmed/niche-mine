import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { CheckCircleIcon } from "@/components/ui/icons";

export function StepCard({
  number,
  title,
  subtitle,
  done = false,
  muted = false,
  children,
}: {
  number: number;
  title: string;
  subtitle?: string;
  done?: boolean;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <Card className={muted ? "opacity-60" : undefined}>
      <div className="flex items-center gap-3">
        <span
          className={cx(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
            done
              ? "border-emerald-400/40 bg-emerald-400/10 text-success-text"
              : "border-border bg-surface/60 text-muted"
          )}
        >
          {done ? <CheckCircleIcon className="h-4 w-4" /> : number}
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}
