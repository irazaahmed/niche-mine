import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { signOutAction } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SidebarNav } from "@/components/ui/SidebarNav";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { StatusBanner } from "@/components/ui/StatusBanner";
import { BrandGlyph } from "@/components/ui/BrandMark";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { email, profile } = await requireUser();
  const isAdmin = profile.role === "admin";

  return (
    <ToastProvider>
      <div className="relative flex min-h-screen lg:h-screen lg:overflow-hidden">
        <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-background">
          <div className="absolute inset-0 bg-grid-lines opacity-30" />
          <div className="glow-orb animate-float-slow absolute right-[-14%] top-[-12%] h-[30rem] w-[30rem] [--glow:color-mix(in_srgb,var(--color-accent)_9%,transparent)]" />
        </div>

        <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface p-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:overflow-y-auto">
          <div className="flex items-center gap-2.5 px-2 pb-4">
            <Link href="/dashboard" className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent-bright">
                <BrandGlyph size={16} />
              </span>
              <p className="min-w-0 flex-1 truncate font-heading font-semibold tracking-tight">NicheMine</p>
            </Link>
            <ThemeToggle />
          </div>

          <SidebarNav variant="desktop" />

          {isAdmin && (
            <Link
              href="/admin"
              className="mt-4 flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-sm text-accent-bright transition-colors hover:bg-accent/15"
            >
              Admin
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          )}

          <div className="mt-auto pt-6">
            <p className="truncate px-3 text-xs text-muted">{email}</p>
            <form action={signOutAction}>
              <button
                type="submit"
                className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>

          <a
            href="https://www.cybrumsolutions.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 px-3 text-[11px] text-muted transition-colors hover:text-accent-bright"
          >
            by Cybrum Solutions
          </a>
        </aside>

        {/* Mobile / tablet top bar */}
        <div className="fixed inset-x-0 top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between px-4 pt-3">
            <Link href="/dashboard" className="min-w-0 flex-1 truncate font-heading text-sm font-semibold tracking-tight">
              NicheMine
            </Link>
            <div className="flex shrink-0 items-center gap-3">
              {isAdmin && (
                <Link href="/admin" className="text-xs font-medium text-accent-bright">
                  Admin
                </Link>
              )}
              <ThemeToggle />
            </div>
          </div>
          <nav className="scrollbar-none flex gap-1.5 overflow-x-auto px-4 py-3">
            <SidebarNav variant="mobile" />
            <form action={signOutAction} className="shrink-0">
              <button
                type="submit"
                className="rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>

        <main className="min-w-0 flex-1 p-6 pt-[7.5rem] sm:p-8 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto lg:pt-8">
          {profile.status === "blocked" && (
            <div className="mb-6">
              <StatusBanner tone="danger">
                Your account has been blocked. Contact an admin if you think this is a mistake.
              </StatusBanner>
            </div>
          )}
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
