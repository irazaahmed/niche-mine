import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { setUserStatus, updateUserLimits, deleteUserAction } from "@/lib/admin/actions";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Table } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteUserForm } from "@/components/admin/DeleteUserForm";
import { estimateAiCostUsd } from "@/lib/admin/cost";

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;
  const supabase = createAdminClient();

  const { data: user } = await supabase.from("users").select("*").eq("id", userId).single();
  if (!user) notFound();

  const { data: logs } = await supabase
    .from("activity_log")
    .select("id, action, metadata, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  const costEstimate = estimateAiCostUsd(logs ?? []);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-heading text-lg font-semibold">{user.email}</p>
            <p className="mt-1 text-xs text-muted">Signed up {new Date(user.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={user.role === "admin" ? "accent" : "neutral"}>{user.role}</Badge>
            <Badge tone={user.status === "active" ? "success" : "danger"} dot>
              {user.status}
            </Badge>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <form action={setUserStatus}>
            <input type="hidden" name="userId" value={user.id} />
            <input type="hidden" name="status" value={user.status === "active" ? "blocked" : "active"} />
            <Button variant={user.status === "active" ? "outline-danger" : "outline"} type="submit">
              {user.status === "active" ? "Block user" : "Unblock user"}
            </Button>
          </form>
        </div>
      </Card>

      <Card>
        <h2 className="font-heading text-base font-semibold">Plan & AI limits</h2>
        <form action={updateUserLimits} className="mt-4 flex flex-wrap items-end gap-4">
          <input type="hidden" name="userId" value={user.id} />
          <div>
            <Label htmlFor="plan" size="sm" muted>
              Plan
            </Label>
            <Input id="plan" name="plan" defaultValue={user.plan} className="w-32" />
          </div>
          <div>
            <Label htmlFor="aiCallsLimit" size="sm" muted>
              AI calls limit (daily)
            </Label>
            <Input id="aiCallsLimit" name="aiCallsLimit" type="number" defaultValue={user.ai_calls_limit} className="w-32" />
          </div>
          <Button variant="outline" type="submit">
            Save
          </Button>
        </form>
        <p className="mt-3 text-xs text-muted">
          Used {user.ai_calls_count} / {user.ai_calls_limit} today · resets {user.last_reset_date} · est. cost from
          recent activity ${costEstimate.toFixed(4)}
        </p>
      </Card>

      <Card>
        <h2 className="font-heading text-base font-semibold">Recent activity</h2>
        <div className="mt-4">
          {!logs || logs.length === 0 ? (
            <EmptyState bordered={false}>No activity recorded yet.</EmptyState>
          ) : (
            <Table bare>
              <Table.Head>
                <Table.Th>Action</Table.Th>
                <Table.Th>When</Table.Th>
              </Table.Head>
              <Table.Body>
                {logs.map((log) => (
                  <Table.Row key={log.id}>
                    <Table.Td muted={false} className="capitalize">{log.action.replaceAll("_", " ")}</Table.Td>
                    <Table.Td>{new Date(log.created_at).toLocaleString()}</Table.Td>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      </Card>

      <Card className="border-red-500/30">
        <h2 className="font-heading text-base font-semibold text-danger-text">Danger zone</h2>
        <p className="mt-1 text-sm text-muted">
          Deletes the account and every niche, keyword, and competitor record it owns. This cannot be undone.
        </p>
        <div className="mt-4">
          <DeleteUserForm userId={user.id} userEmail={user.email} action={deleteUserAction} />
        </div>
      </Card>
    </div>
  );
}
