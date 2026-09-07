import { requireUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Table } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarChartIcon, SparklesIcon, ClockIcon } from "@/components/ui/icons";

export default async function UsagePage() {
  const { id: userId, profile } = await requireUser();
  const supabase = await createClient();
  const AI_ACTIONS = ["generated_seed_prompt", "suggested_keyword", "analyzed_competitor", "finalized_niche"];
  const { data: recentAiCalls } = await supabase
    .from("activity_log")
    .select("id, action, metadata, created_at")
    .eq("user_id", userId)
    .in("action", AI_ACTIONS)
    .order("created_at", { ascending: false })
    .limit(20);

  const remaining = Math.max(profile.ai_calls_limit - profile.ai_calls_count, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">AI usage</h1>
        <p className="mt-1 text-sm text-muted">Your daily AI call allowance and recent AI activity.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Calls used today" value={profile.ai_calls_count} icon={<SparklesIcon className="h-4 w-4" />} />
        <StatCard label="Calls remaining" value={remaining} icon={<BarChartIcon className="h-4 w-4" />} tone={remaining === 0 ? "danger" : "success"} />
        <StatCard label="Resets on" value={profile.last_reset_date} icon={<ClockIcon className="h-4 w-4" />} />
      </div>

      {!recentAiCalls || recentAiCalls.length === 0 ? (
        <EmptyState>No AI activity yet — generate a seed prompt or run an analysis to see it here.</EmptyState>
      ) : (
        <Card padding="none">
          <Table bare>
            <Table.Head>
              <Table.Th>Action</Table.Th>
              <Table.Th>When</Table.Th>
            </Table.Head>
            <Table.Body>
              {recentAiCalls.map((row) => (
                <Table.Row key={row.id}>
                  <Table.Td muted={false} className="capitalize">{row.action.replaceAll("_", " ")}</Table.Td>
                  <Table.Td>{new Date(row.created_at).toLocaleString()}</Table.Td>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card>
      )}
    </div>
  );
}
