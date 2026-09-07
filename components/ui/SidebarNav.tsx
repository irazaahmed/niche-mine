"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./cx";
import { HomeIcon, BarChartIcon } from "./icons";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: HomeIcon },
  { href: "/usage", label: "AI Usage", icon: BarChartIcon },
];

/** Desktop: vertical list with an active-item accent bar (or, when
 * `collapsed`, a centered icon-only rail with the label as a native
 * tooltip). Mobile: flat horizontal pill strip, same active-state color. */
export function SidebarNav({
  variant,
  collapsed = false,
}: {
  variant: "desktop" | "mobile";
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  if (variant === "mobile") {
    return (
      <>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-accent bg-accent/10 text-accent-bright"
                  : "border-border text-muted hover:border-accent hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <nav className="flex flex-col gap-1 border-t border-border pt-4">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={cx(
              "flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-sm transition-colors",
              collapsed && "justify-center px-0",
              active
                ? "border-l-accent bg-accent/10 text-foreground"
                : "border-l-transparent text-muted hover:bg-accent/10 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && item.label}
          </Link>
        );
      })}
    </nav>
  );
}
