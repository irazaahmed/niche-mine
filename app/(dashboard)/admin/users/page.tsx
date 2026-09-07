import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

export default async function AdminUsersPage() {
  const supabase = createAdminClient();
  const { data: users } = await supabase.from("users").select("*").order("created_at", { ascending: false });

  return (
    <Table>
      <Table.Head>
        <Table.Th>Email</Table.Th>
        <Table.Th>Role</Table.Th>
        <Table.Th>Plan</Table.Th>
        <Table.Th>Status</Table.Th>
        <Table.Th>AI usage</Table.Th>
        <Table.Th>Signed up</Table.Th>
        <Table.Th />
      </Table.Head>
      <Table.Body>
        {(users ?? []).map((u) => (
          <Table.Row key={u.id}>
            <Table.Td muted={false}>{u.email}</Table.Td>
            <Table.Td>
              <Badge tone={u.role === "admin" ? "accent" : "neutral"}>{u.role}</Badge>
            </Table.Td>
            <Table.Td className="capitalize">{u.plan}</Table.Td>
            <Table.Td>
              <Badge tone={u.status === "active" ? "success" : "danger"} dot>
                {u.status}
              </Badge>
            </Table.Td>
            <Table.Td numeric>
              {u.ai_calls_count} / {u.ai_calls_limit}
            </Table.Td>
            <Table.Td>{new Date(u.created_at).toLocaleDateString()}</Table.Td>
            <Table.Td>
              <Link href={`/admin/users/${u.id}`} className="text-accent-bright hover:underline">
                Manage →
              </Link>
            </Table.Td>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}
