"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function adminClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");
  const { data } = await supabase.from("profiles").select("role,is_suspended").eq("id", user.id).single();
  if (data?.role !== "admin" || data.is_suspended) throw new Error("forbidden");
  return { supabase, adminId: user.id };
}

const loc = (fd: FormData) => (fd.get("locale") === "en" ? "en" : "ar");

export async function setSuspendedAction(fd: FormData) {
  const { supabase, adminId } = await adminClient();
  const id = z.uuid().parse(fd.get("id"));
  if (id === adminId) return; // never lock yourself out
  const suspended = fd.get("suspended") === "1";
  await supabase.from("profiles").update({ is_suspended: suspended }).eq("id", id);
  revalidatePath(`/${loc(fd)}/admin/users`);
  revalidatePath("/[locale]/a/[slug]", "layout");
}

export async function setPlanAction(fd: FormData) {
  const { supabase } = await adminClient();
  const profileId = z.uuid().parse(fd.get("id"));
  const planId = z.uuid().parse(fd.get("plan_id"));
  const { data: live } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("profile_id", profileId)
    .in("status", ["active", "trialing", "past_due"])
    .maybeSingle();
  if (live) await supabase.from("subscriptions").update({ plan_id: planId, provider: "admin" }).eq("id", live.id);
  else await supabase.from("subscriptions").insert({ profile_id: profileId, plan_id: planId, status: "active", provider: "admin" });
  revalidatePath(`/${loc(fd)}/admin/users`);
}

export async function adminListingStatusAction(fd: FormData) {
  const { supabase } = await adminClient();
  const id = z.uuid().parse(fd.get("id"));
  const status = z.enum(["published", "hidden"]).parse(fd.get("status"));
  await supabase.from("listings").update({ status }).eq("id", id);
  revalidatePath(`/${loc(fd)}/admin/listings`);
  revalidatePath("/[locale]/a/[slug]", "layout");
}

export async function adminDeleteListingAction(fd: FormData) {
  const { supabase } = await adminClient();
  const id = z.uuid().parse(fd.get("id"));
  // Photos stay in the owner's storage folder (storage policies are owner-only);
  // they're unreachable once the rows are gone.
  await supabase.from("listings").delete().eq("id", id);
  revalidatePath(`/${loc(fd)}/admin/listings`);
  revalidatePath("/[locale]/a/[slug]", "layout");
}

export type PlanState = { ok?: boolean; error?: string } | undefined;

const optNum = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0), "number");

export async function savePlanAction(_: PlanState, fd: FormData): Promise<PlanState> {
  const { supabase } = await adminClient();
  const parsed = z
    .object({
      id: z.uuid(),
      name_ar: z.string().trim().min(1).max(60),
      name_en: z.string().trim().min(1).max(60),
      price_monthly_aed: optNum,
      price_yearly_aed: optNum,
      max_listings: optNum,
      max_imports_per_day: optNum,
    })
    .safeParse({
      id: fd.get("id"),
      name_ar: fd.get("name_ar"),
      name_en: fd.get("name_en"),
      price_monthly_aed: fd.get("price_monthly_aed") ?? "",
      price_yearly_aed: fd.get("price_yearly_aed") ?? "",
      max_listings: fd.get("max_listings") ?? "",
      max_imports_per_day: fd.get("max_imports_per_day") ?? "",
    });
  if (!parsed.success) return { error: "invalid" };
  const { id, ...rest } = parsed.data;
  const { error } = await supabase
    .from("plans")
    .update({
      ...rest,
      max_listings: rest.max_listings == null ? null : Math.round(rest.max_listings),
      max_imports_per_day: rest.max_imports_per_day == null ? null : Math.round(rest.max_imports_per_day),
      is_active: fd.get("is_active") === "on",
      is_public: fd.get("is_public") === "on",
      is_coming_soon: fd.get("is_coming_soon") === "on",
    })
    .eq("id", id);
  if (error) return { error: "save" };
  revalidatePath(`/${loc(fd)}/admin/plans`);
  revalidatePath(`/${loc(fd)}/pricing`);
  return { ok: true };
}
