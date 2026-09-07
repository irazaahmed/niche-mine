import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { signOutAction } from "@/lib/auth/actions";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SidebarNav } from "@/components/ui/SidebarNav";
import { DashboardSidebar } from "@/components/ui/DashboardSidebar";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { StatusBanner } from "@/components/ui/StatusBanner";

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

        <DashboardSidebar
          email={email}
          isAdmin={isAdmin}
          aiCallsRemaining={Math.max(profile.ai_calls_limit - profile.ai_calls_count, 0)}
          aiCallsLimit={profile.ai_calls_limit}
          signOutAction={signOutAction}
        />

        {/* Mobile / tablet top bar */}
        <div className="fixed inset-x-0 top-0 z-30 border-b border-border bg-surface/80 backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between px-4 pt-3">
            <Link href="/dashboard" className="min-w-0 flex-1 truncate font-heading text-sm font-semibold tracking-tight">
              NicheMine
            </Link>
            <div className="flex shrink-0 items-center gap-3">
              <Link href="/usage" className="text-xs text-muted">
                {Math.max(profile.ai_calls_limit - profile.ai_calls_count, 0)}/{profile.ai_calls_limit} AI
              </Link>
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
