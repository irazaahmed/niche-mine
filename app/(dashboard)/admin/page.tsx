import { createAdminClient } from "@/lib/supabase/admin";
import { StatCard } from "@/components/ui/StatCard";
import { UsersIcon, TargetIcon, TrophyIcon, SparklesIcon } from "@/components/ui/icons";
import { estimateAiCostUsd } from "@/lib/admin/cost";

export default async function AdminOverviewPage() {
  const supabase = createAdminClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [{ count: totalUsers }, { count: totalNiches }, { count: totalFinalized }, { data: monthLogs }] =
    await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("niches").select("*", { count: "exact", head: true }),
      supabase.from("niches").select("*", { count: "exact", head: true }).eq("status", "finalized"),
      supabase
        .from("activity_log")
        .select("action, metadata")
        .gte("created_at", startOfMonth.toISOString())
        .in("action", ["generated_seed_prompt", "suggested_keyword", "analyzed_competitor", "finalized_niche"]),
    ]);

  const costEstimate = estimateAiCostUsd(monthLogs ?? []);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total users" value={totalUsers ?? 0} icon={<UsersIcon className="h-4 w-4" />} />
      <StatCard label="Niches researched" value={totalNiches ?? 0} icon={<TargetIcon className="h-4 w-4" />} />
      <StatCard label="Niches finalized" value={totalFinalized ?? 0} icon={<TrophyIcon className="h-4 w-4" />} tone="success" />
      <StatCard
        label="Est. AI cost this month"
        value={`$${costEstimate.toFixed(2)}`}
        icon={<SparklesIcon className="h-4 w-4" />}
        tone="accent"
      />
    </div>
  );
}
