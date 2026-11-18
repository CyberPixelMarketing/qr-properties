"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ListingState =
  | { ok?: boolean; error?: string; errorParams?: Record<string, string | number>; fieldErrors?: Record<string, string> }
  | undefined;

const num = (opts: { int?: boolean; min?: number; max?: number } = {}) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v.replace(/[,\s]/g, "")))
    .refine((v) => v === null || (!Number.isNaN(Number(v)) && (!opts.int || Number.isInteger(Number(v)))), "number")
    .transform((v) => (v === null ? null : Number(v)))
    .refine((v) => v === null || ((opts.min ?? -Infinity) <= v && v <= (opts.max ?? Infinity)), "number");

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

const schema = z.object({
  id: z.uuid(),
  kind: z.enum(["apartment", "building", "unit"]),
  building_id: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.uuid().nullable()),
  purpose: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.enum(["sale", "rent"]).nullable()),
  status: z.enum(["draft", "published", "hidden"]),
  title: z.string().trim().min(1, "required").max(200),
  description: text(8000),
  price_aed: num({ min: 0, max: 1e12 }),
  bedrooms: num({ int: true, min: 0, max: 50 }),
  bathrooms: num({ int: true, min: 0, max: 50 }),
  area_sqft: num({ min: 1, max: 1e7 }),
  maps_url: text(2048),
  lat: num({ min: -90, max: 90 }),
  lng: num({ min: -180, max: 180 }),
  address_text: text(300),
  images: z.array(z.string().max(500)).max(40),
});

function routeFor(locale: string, kind: string, buildingId: string | null) {
  return kind === "unit" && buildingId
    ? `/${locale}/dashboard/listings/${buildingId}/edit`
    : `/${locale}/dashboard/listings`;
}

export async function saveListingAction(_: ListingState, fd: FormData): Promise<ListingState> {
  const locale = fd.get("locale") === "en" ? "en" : "ar";
  const isNew = fd.get("mode") === "create";

  let images: unknown = [];
  try {
    images = JSON.parse(String(fd.get("images") ?? "[]"));
  } catch {
    return { error: "generic" };
  }
  const get = (k: string) => String(fd.get(k) ?? "");
  const parsed = schema.safeParse({
    id: get("id"),
    kind: get("kind"),
    building_id: get("building_id"),
    purpose: get("purpose"),
    status: get("status") || "draft",
    title: get("title"),
    description: get("description"),
    price_aed: get("price_aed"),
    bedrooms: get("bedrooms"),
    bathrooms: get("bathrooms"),
    area_sqft: get("area_sqft"),
    maps_url: get("maps_url"),
    lat: get("lat"),
    lng: get("lng"),
    address_text: get("address_text"),
    images,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors };
  }
  const d = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // Normalise by kind (mirrors DB constraints, but gives friendly errors first).
  if (d.kind === "unit") {
    d.maps_url = null;
    d.lat = null;
    d.lng = null;
    if (!d.building_id) return { error: "generic" };
  } else {
    d.building_id = null;
  }
  if (d.kind === "building") {
    d.purpose = null;
    d.price_aed = null;
    d.bedrooms = null;
    d.bathrooms = null;
    d.area_sqft = null;
  }
  if (d.status !== "draft") {
    if (d.kind !== "unit" && (d.lat === null || d.lng === null || !d.maps_url)) {
      return { fieldErrors: { maps_url: "location_required" } };
    }
    if (d.kind !== "building" && (!d.purpose || d.price_aed === null)) {
      return {
        fieldErrors: {
          ...(d.purpose ? {} : { purpose: "sellable_required" }),
          ...(d.price_aed === null ? { price_aed: "sellable_required" } : {}),
        },
      };
    }
  }

  // Images must live under this user's folder for this listing.
  const prefix = `${user.id}/${d.id}/`;
  if (d.images.some((p) => !p.startsWith(prefix))) return { error: "generic" };

  const { images: imagePaths, id, ...fields } = d;
  const row = { ...fields, owner_id: user.id };

  const res = isNew
    ? await supabase.from("listings").insert({ id, ...row })
    : await supabase.from("listings").update(row).eq("id", id).eq("owner_id", user.id).select("id").single();

  if (res.error) {
    if (res.error.message?.includes("PLAN_LIMIT_LISTINGS")) {
      const limit = res.error.hint?.match(/limit=(\d+)/)?.[1] ?? "";
      return { error: "PLAN_LIMIT_LISTINGS", errorParams: { limit } };
    }
    console.error("saveListing", res.error);
    return { error: "generic" };
  }

  // Replace image rows; remove storage files that were dropped.
  const { data: oldImgs } = await supabase.from("listing_images").select("storage_path").eq("listing_id", id);
  const del = await supabase.from("listing_images").delete().eq("listing_id", id);
  if (del.error) return { error: "generic" };
  if (imagePaths.length) {
    const ins = await supabase
      .from("listing_images")
      .insert(imagePaths.map((storage_path, i) => ({ listing_id: id, storage_path, sort_order: i })));
    if (ins.error) return { error: "generic" };
  }
  const removed = (oldImgs ?? []).map((r) => r.storage_path).filter((p) => !imagePaths.includes(p));
  if (removed.length) await supabase.storage.from("listing-images").remove(removed);

  revalidatePath(`/${locale}/dashboard/listings`, "layout");
  redirect(routeFor(locale, d.kind, d.building_id));
}

export async function setListingStatusAction(fd: FormData) {
  const locale = fd.get("locale") === "en" ? "en" : "ar";
  const id = z.uuid().safeParse(fd.get("id"));
  const status = z.enum(["draft", "published", "hidden"]).safeParse(fd.get("status"));
  if (!id.success || !status.success) return;
  const supabase = await createClient();
  await supabase.from("listings").update({ status: status.data }).eq("id", id.data);
  revalidatePath(`/${locale}/dashboard/listings`, "layout");
}

export async function deleteListingAction(fd: FormData) {
  const locale = fd.get("locale") === "en" ? "en" : "ar";
  const id = z.uuid().safeParse(fd.get("id"));
  if (!id.success) return;
  const supabase = await createClient();

  // Collect image files of the listing (and of its units, if it's a building) before the cascade.
  const { data: units } = await supabase.from("listings").select("id").eq("building_id", id.data);
  const ids = [id.data, ...(units ?? []).map((u) => u.id)];
  const { data: imgs } = await supabase.from("listing_images").select("storage_path").in("listing_id", ids);

  const { data: target } = await supabase.from("listings").select("kind,building_id").eq("id", id.data).single();
  const { error } = await supabase.from("listings").delete().eq("id", id.data);
  if (!error && imgs?.length) {
    await supabase.storage.from("listing-images").remove(imgs.map((i) => i.storage_path));
  }
  revalidatePath(`/${locale}/dashboard/listings`, "layout");
  if (target?.kind === "unit" && target.building_id) {
    redirect(`/${locale}/dashboard/listings/${target.building_id}/edit`);
  }
  redirect(`/${locale}/dashboard/listings`);
}
