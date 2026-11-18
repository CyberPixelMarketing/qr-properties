import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export const LISTING_COLUMNS =
  "id,kind,building_id,purpose,status,title,description,price_aed,bedrooms,bathrooms,area_sqft,maps_url,lat,lng,address_text,created_at,published_at";

export type ListingRow = {
  id: string;
  kind: "apartment" | "building" | "unit";
  building_id: string | null;
  purpose: "sale" | "rent" | null;
  status: "draft" | "published" | "hidden";
  title: string;
  description: string | null;
  price_aed: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  maps_url: string | null;
  lat: number | null;
  lng: number | null;
  address_text: string | null;
  created_at: string;
  published_at: string | null;
};

export function listingImageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;
}

/** Ordered images for a set of listings, keyed by listing id. */
export async function imagesFor(supabase: SupabaseClient, ids: string[]) {
  const map = new Map<string, { path: string; url: string }[]>();
  if (!ids.length) return map;
  const { data } = await supabase
    .from("listing_images")
    .select("listing_id,storage_path,sort_order,created_at")
    .in("listing_id", ids)
    .order("sort_order")
    .order("created_at");
  for (const r of data ?? []) {
    const list = map.get(r.listing_id) ?? [];
    list.push({ path: r.storage_path, url: listingImageUrl(r.storage_path) });
    map.set(r.listing_id, list);
  }
  return map;
}

export function formatAed(value: number | null, locale: string) {
  if (value == null) return "";
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(value);
}
