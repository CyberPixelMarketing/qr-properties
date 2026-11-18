import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  account_type: "office" | "individual" | null;
  display_name: string | null;
  slug: string | null;
  logo_path: string | null;
  bio: string | null;
  phone: string | null;
  whatsapp: string | null;
  contact_email: string | null;
  role: "advertiser" | "admin";
  is_suspended: boolean;
  onboarded_at: string | null;
  created_at: string;
};

export type CredentialLink = { id: string; label: string; url: string; sort_order: number };

/** Current user + profile, or redirect to login. Cached per request. */
export const requireUser = cache(async (locale: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,account_type,display_name,slug,logo_path,bio,phone,whatsapp,contact_email,role,is_suspended,onboarded_at,created_at")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) redirect(`/${locale}/login`);

  return { supabase, user, profile };
});

export function publicStorageUrl(bucket: string, path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
