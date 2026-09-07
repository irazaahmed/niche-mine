import Link from "next/link";
import { requireAdmin } from "@/lib/current-user";
import { cx } from "@/components/ui/cx";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted">Full visibility and control over NicheMine users.</p>
      </div>
      <nav className="flex gap-2 border-b border-border">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={cx(
              "border-b-2 border-transparent px-3 py-2 text-sm text-muted transition-colors hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
