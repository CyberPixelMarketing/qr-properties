"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ProfileState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | undefined;

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

const schema = z.object({
  account_type: z.enum(["office", "individual"], { message: "required" }),
  display_name: z.string().trim().min(2, "required").max(120),
  slug: z.string().trim().toLowerCase().regex(SLUG_RE, "slugInvalid"),
  logo_path: optionalText(500),
  bio: optionalText(600),
  phone: optionalText(30).refine((v) => v === null || PHONE_RE.test(v), "invalidPhone"),
  whatsapp: optionalText(30).refine((v) => v === null || PHONE_RE.test(v), "invalidPhone"),
  contact_email: optionalText(254).refine((v) => v === null || z.email().safeParse(v).success, "invalidEmail"),
  credentials: z
    .array(
      z.object({
        label: z.string().trim().min(1, "required").max(80),
        url: z
          .string()
          .trim()
          .max(2048)
          .regex(/^https?:\/\/\S+$/i, "invalidUrl"),
      }),
    )
    .max(30),
});

export async function saveProfileAction(_: ProfileState, fd: FormData): Promise<ProfileState> {
  const locale = fd.get("locale") === "en" ? "en" : "ar";
  const onboarding = fd.get("onboarding") === "1";

  let credentials: unknown = [];
  try {
    credentials = JSON.parse(String(fd.get("credentials") ?? "[]"));
  } catch {
    return { error: "generic" };
  }

  const parsed = schema.safeParse({
    account_type: fd.get("account_type") ?? undefined,
    display_name: fd.get("display_name") ?? "",
    slug: fd.get("slug") ?? "",
    logo_path: fd.get("logo_path") ?? "",
    bio: fd.get("bio") ?? "",
    phone: fd.get("phone") ?? "",
    whatsapp: fd.get("whatsapp") ?? "",
    contact_email: fd.get("contact_email") ?? "",
    credentials,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { credentials: links, ...fields } = parsed.data;

  // The logo must live in the user's own storage folder.
  if (fields.logo_path && !fields.logo_path.startsWith(`${user.id}/`)) return { error: "generic" };

  const { data: available } = await supabase.rpc("is_slug_available", { p_slug: fields.slug });
  if (!available) return { fieldErrors: { slug: "slugTaken" } };

  const { data: current } = await supabase.from("profiles").select("onboarded_at").eq("id", user.id).single();

  const { error } = await supabase
    .from("profiles")
    .update({ ...fields, onboarded_at: current?.onboarded_at ?? new Date().toISOString() })
    .eq("id", user.id);
  if (error) {
    if (error.code === "23505") return { fieldErrors: { slug: "slugTaken" } };
    return { error: "generic" };
  }

  // Replace credential links (small list — simplest correct approach).
  const del = await supabase.from("credential_links").delete().eq("profile_id", user.id);
  if (del.error) return { error: "generic" };
  if (links.length) {
    const ins = await supabase
      .from("credential_links")
      .insert(links.map((l, i) => ({ ...l, profile_id: user.id, sort_order: i })));
    if (ins.error) return { error: "generic" };
  }

  revalidatePath(`/${locale}/dashboard`, "layout");
  revalidatePath("/[locale]/a/[slug]", "layout");
  if (onboarding) redirect(`/${locale}/dashboard`);
  return { ok: true };
}
