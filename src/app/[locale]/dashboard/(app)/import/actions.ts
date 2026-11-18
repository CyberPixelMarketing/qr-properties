"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeFetch, FetchBlockedError } from "@/lib/import/safe-fetch";
import { heuristicExtract, readPage, type Extracted } from "@/lib/import/extract";
import { aiEnabled, aiExtract } from "@/lib/import/ai";
import { copyImages } from "@/lib/import/images";
import { mapsUrlFor } from "@/lib/maps";

export type ImportState = { error?: string } | undefined;

const clamp = (s: string | null, n: number) => (s ? s.trim().slice(0, n) || null : null);
const int = (v: number | null, max: number) => (v == null || v < 0 || v > max ? null : Math.round(v));

export async function importListingAction(_: ImportState, fd: FormData): Promise<ImportState> {
  const locale = fd.get("locale") === "en" ? "en" : "ar";
  const parsed = z.string().trim().url().max(2048).safeParse(fd.get("url"));
  if (!parsed.success || !/^https?:\/\//i.test(parsed.data)) return { error: "invalid_url" };
  const url = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // Job row doubles as the per-plan daily rate limit (enforced by a DB trigger).
  const { data: job, error: jobErr } = await supabase
    .from("import_jobs")
    .insert({ profile_id: user.id, url })
    .select("id")
    .single();
  if (jobErr || !job) {
    return { error: jobErr?.message?.includes("PLAN_LIMIT_IMPORTS") ? "PLAN_LIMIT_IMPORTS" : "generic" };
  }
  const fail = async (code: string) => {
    await supabase.from("import_jobs").update({ status: "failed", error: code }).eq("id", job.id);
    revalidatePath(`/${locale}/dashboard/import`);
    return { error: code };
  };

  // 1) Fetch the page safely.
  let html: string;
  let finalUrl: string;
  try {
    const res = await safeFetch(url);
    if (res.status >= 400 || !/html|xml|text\/plain/i.test(res.contentType)) return fail("fetch_failed");
    html = res.body.toString("utf8");
    finalUrl = res.url;
  } catch (e) {
    return fail(e instanceof FetchBlockedError ? "blocked" : "fetch_failed");
  }

  // 2) JSON-LD → Open Graph → page text, then AI clean-up when a key is configured.
  const signals = readPage(html, finalUrl);
  let data: Extracted = heuristicExtract(signals, finalUrl);
  if (aiEnabled()) {
    try {
      data = await aiExtract(signals, finalUrl, data);
    } catch (e) {
      console.error("import ai", e);
    }
  }
  if (!data.title && data.price_aed == null && data.image_urls.length === 0) return fail("nothing_found");

  // 3) Copy photos into our storage, then create the draft.
  const listingId = crypto.randomUUID();
  const kind = data.kind === "building" ? "building" : "apartment";
  const imagePaths = await copyImages(supabase, user.id, listingId, data.image_urls);
  const hasPoint = data.lat != null && data.lng != null && Math.abs(data.lat) <= 90 && Math.abs(data.lng) <= 180;

  const { error: insErr } = await supabase.from("listings").insert({
    id: listingId,
    owner_id: user.id,
    kind,
    status: "draft",
    purpose: kind === "building" ? null : data.purpose,
    title: clamp(data.title, 200) ?? "—",
    description: clamp(data.description, 8000),
    price_aed: kind === "building" || data.price_aed == null || data.price_aed < 0 ? null : data.price_aed,
    bedrooms: kind === "building" ? null : int(data.bedrooms, 50),
    bathrooms: kind === "building" ? null : int(data.bathrooms, 50),
    area_sqft: kind === "building" || !data.area_sqft || data.area_sqft <= 0 ? null : data.area_sqft,
    address_text: clamp(data.address_text, 300),
    lat: hasPoint ? data.lat : null,
    lng: hasPoint ? data.lng : null,
    maps_url: hasPoint ? mapsUrlFor({ lat: data.lat!, lng: data.lng! }) : null,
    source_url: url,
  });
  if (insErr) {
    if (imagePaths.length) {
      await supabase.storage
        .from("listing-images")
        .remove(imagePaths.flatMap((p) => [p, p.replace(/\.webp$/, ".thumb.webp")]));
    }
    return fail(insErr.message?.includes("PLAN_LIMIT_LISTINGS") ? "PLAN_LIMIT_LISTINGS" : "generic");
  }
  if (imagePaths.length) {
    await supabase
      .from("listing_images")
      .insert(imagePaths.map((storage_path, i) => ({ listing_id: listingId, storage_path, sort_order: i })));
  }
  await supabase.from("import_jobs").update({ status: "succeeded", listing_id: listingId }).eq("id", job.id);

  revalidatePath(`/${locale}/dashboard`, "layout");
  redirect(`/${locale}/dashboard/listings/${listingId}/edit?imported=1`);
}
