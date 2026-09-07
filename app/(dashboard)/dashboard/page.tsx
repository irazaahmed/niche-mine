import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Table } from "@/components/ui/Table";
import { TargetIcon, PlusIcon } from "@/components/ui/icons";
import type { NicheStatus } from "@/lib/supabase/types";

const STATUS_TONE: Record<NicheStatus, "neutral" | "success" | "danger"> = {
  researching: "neutral",
  finalized: "success",
  rejected: "danger",
};

export default async function DashboardPage() {
  const { id: userId } = await requireUser();
  const supabase = await createClient();
  const { data: niches } = await supabase
    .from("niches")
    .select("id, country, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Your niches</h1>
          <p className="mt-1 text-sm text-muted">Track every niche you&rsquo;re researching, resume anytime.</p>
        </div>
        <Link href="/niches/new">
          <Button variant="primary" type="button">
            <span className="inline-flex items-center gap-2">
              <PlusIcon className="h-4 w-4" />
              Start New Niche Research
            </span>
          </Button>
        </Link>
      </div>

      {!niches || niches.length === 0 ? (
        <EmptyState
          icon={<TargetIcon className="h-5 w-5" />}
          action={{ href: "/niches/new", label: "Start New Niche Research" }}
        >
          No niches yet. Start your first research to see it tracked here.
        </EmptyState>
      ) : (
        <Table>
          <Table.Head>
            <Table.Th>Country</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Started</Table.Th>
            <Table.Th />
          </Table.Head>
          <Table.Body>
            {niches.map((n) => (
              <Table.Row key={n.id}>
                <Table.Td muted={false}>{n.country}</Table.Td>
                <Table.Td>
                  <Badge tone={STATUS_TONE[n.status]} dot>
                    {n.status}
                  </Badge>
                </Table.Td>
                <Table.Td>{new Date(n.created_at).toLocaleDateString()}</Table.Td>
                <Table.Td>
                  <Link href={`/niches/${n.id}`} className="text-accent-bright hover:underline">
                    Open →
                  </Link>
                </Table.Td>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </div>
  );
}
