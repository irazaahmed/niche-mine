"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { SidebarNav } from "./SidebarNav";
import { BrandGlyph } from "./BrandMark";
import { cx } from "./cx";
import { ShieldIcon, LogOutIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, SparklesIcon } from "./icons";

const STORAGE_KEY = "nichemine-sidebar-collapsed";

/** Desktop sidebar shell with a collapse toggle — collapsed state shows
 * icons only (centered, native title tooltips) for a denser rail. Persisted
 * to localStorage so it survives navigation and reloads. Mobile keeps the
 * separate horizontal top bar in the layout, unaffected by this. */
export function DashboardSidebar({
  email,
  isAdmin,
  aiCallsRemaining,
  aiCallsLimit,
  signOutAction,
}: {
  email: string;
  isAdmin: boolean;
  aiCallsRemaining: number;
  aiCallsLimit: number;
  signOutAction: (formData: FormData) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  // Reads the persisted preference after mount rather than in the lazy
  // useState initializer: the server always renders expanded (no access to
  // localStorage), so matching that on the client's first render avoids a
  // hydration mismatch — this effect intentionally re-renders once to apply
  // the real preference, syncing local state from an external source.
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <aside
      className={cx(
        "hidden shrink-0 flex-col border-r border-border bg-surface p-4 transition-[width] duration-200 lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto",
        collapsed ? "w-[4.5rem]" : "w-60"
      )}
    >
      <div className={cx("flex items-center gap-2.5 pb-4", collapsed ? "flex-col" : "px-2")}>
        <Link href="/dashboard" className={cx("flex min-w-0 items-center gap-2.5", !collapsed && "flex-1")}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-bright">
            <BrandGlyph size={16} />
          </span>
          {!collapsed && <p className="min-w-0 flex-1 truncate font-heading font-semibold tracking-tight">NicheMine</p>}
        </Link>
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent/10 hover:text-foreground"
        >
          {collapsed ? <PanelLeftOpenIcon className="h-4 w-4" /> : <PanelLeftCloseIcon className="h-4 w-4" />}
        </button>
      </div>

      <SidebarNav variant="desktop" collapsed={collapsed} />

      <Link
        href="/usage"
        title={collapsed ? `${aiCallsRemaining} of ${aiCallsLimit} AI queries left today` : undefined}
        className={cx(
          "mt-3 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted transition-colors hover:bg-accent/10 hover:text-foreground",
          collapsed && "justify-center px-0"
        )}
      >
        <SparklesIcon className="h-3.5 w-3.5 shrink-0" />
        {!collapsed && (
          <span>
            {aiCallsRemaining}/{aiCallsLimit} AI queries today
          </span>
        )}
      </Link>

      {isAdmin && (
        <Link
          href="/admin"
          title={collapsed ? "Admin" : undefined}
          className={cx(
            "mt-4 flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-sm text-accent-bright transition-colors hover:bg-accent/15",
            collapsed && "justify-center px-0"
          )}
        >
          <ShieldIcon className="h-4 w-4 shrink-0" />
          {!collapsed && "Admin"}
        </Link>
      )}

      <div className={cx("mt-auto flex pt-6", collapsed ? "flex-col items-center gap-2" : "flex-col")}>
        {!collapsed && <p className="truncate px-3 text-xs text-muted">{email}</p>}
        <div className={cx("flex items-center", collapsed ? "flex-col gap-2" : "mt-1 justify-between")}>
          <ThemeToggle align="left" />
          <form action={signOutAction}>
            <button
              type="submit"
              title={collapsed ? "Sign out" : undefined}
              className={cx(
                "flex items-center gap-1.5 rounded-lg text-sm text-muted transition-colors hover:bg-surface hover:text-foreground",
                collapsed ? "h-10 w-10 justify-center" : "px-3 py-2"
              )}
            >
              <LogOutIcon className="h-4 w-4 shrink-0" />
              {!collapsed && "Sign out"}
            </button>
          </form>
        </div>
      </div>

      {!collapsed && (
        <a
          href="https://www.cybrumsolutions.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 px-3 text-[11px] text-muted transition-colors hover:text-accent-bright"
        >
          by Cybrum Solutions
        </a>
      )}
    </aside>
  );
}
