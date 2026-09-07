import type { ReactNode } from "react";
import { cx } from "./cx";

const PADDING = {
  none: "",
  md: "p-6",
  lg: "p-7",
};

const RADIUS = {
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
};

/** The one frosted-card surface for dashboard content. */
export function Card({
  children,
  padding = "md",
  radius = "2xl",
  className,
}: {
  children: ReactNode;
  padding?: keyof typeof PADDING;
  radius?: keyof typeof RADIUS;
  className?: string;
}) {
  return (
    <div className={cx("glass overflow-hidden", RADIUS[radius], PADDING[padding], className)}>
      {children}
    </div>
  );
}
