import "server-only";
import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import type { PublicItem } from "@/components/public/types";

export type PublicProfile = {
  id: string;
  slug: string;
  display_name: string;
  account_type: "office" | "individual";
  logo_path: string | null;
  bio: string | null;
  phone: string | null;
  whatsapp: string | null;
  contact_email: string | null;
};

export const getPublicProfile = cache(async (slug: string) => {
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) return null;
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("profiles")
    .select("id,slug,display_name,account_type,logo_path,bio,phone,whatsapp,contact_email")
    .eq("slug", slug)
    .maybeSingle<PublicProfile>();
  if (!data) return null;
  const { data: links } = await supabase
    .from("credential_links")
    .select("id,label,url")
    .eq("profile_id", data.id)
    .order("sort_order");
  return { profile: data, links: links ?? [] };
});

export const getPublicListings = cache(async (slug: string) => {
  const supabase = createPublicClient();
  const { data } = await supabase.rpc("get_advertiser_listings", { p_slug: slug });
  return ((data ?? []) as PublicItem[]).map((r) => ({
    ...r,
    price_aed: r.price_aed == null ? null : Number(r.price_aed),
    area_sqft: r.area_sqft == null ? null : Number(r.area_sqft),
  }));
});
