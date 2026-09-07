"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/current-user";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setUserStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!userId || (status !== "active" && status !== "blocked")) return;

  const supabase = createAdminClient();
  await supabase.from("users").update({ status }).eq("id", userId);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function updateUserLimits(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const aiCallsLimit = Number(formData.get("aiCallsLimit"));
  const plan = String(formData.get("plan") ?? "free");
  if (!userId || Number.isNaN(aiCallsLimit)) return;

  const supabase = createAdminClient();
  await supabase.from("users").update({ ai_calls_limit: aiCallsLimit, plan }).eq("id", userId);
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (!userId) return;

  const supabase = createAdminClient();
  // Deletes the auth.users row; the FK from public.users (on delete cascade)
  // and every niches/... row beneath it cascades from there.
  await supabase.auth.admin.deleteUser(userId);
  revalidatePath("/admin/users");
}
