import "server-only";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { safeFetch } from "./safe-fetch";

/** Downloads remote photos (SSRF-guarded), re-encodes to WebP + thumbnail, stores under the user's folder. */
export async function copyImages(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
  urls: string[],
  max = 15,
): Promise<string[]> {
  const out: string[] = [];
  for (const url of urls.slice(0, max * 2)) {
    if (out.length >= max) break;
    try {
      const res = await safeFetch(url, { maxBytes: 12_000_000, timeoutMs: 15_000, accept: "image/*" });
      if (res.status !== 200 || !/^image\//.test(res.contentType)) continue;
      const img = sharp(res.body, { failOn: "error" }).rotate();
      const meta = await img.metadata();
      if ((meta.width ?? 0) < 300 || (meta.height ?? 0) < 200) continue; // skip icons/logos
      const full = await img.clone().resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
      const thumb = await img.clone().resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();
      const path = `${userId}/${listingId}/${crypto.randomUUID()}.webp`;
      const up = await supabase.storage.from("listing-images").upload(path, full, { contentType: "image/webp", cacheControl: "31536000" });
      if (up.error) continue;
      await supabase.storage
        .from("listing-images")
        .upload(path.replace(/\.webp$/, ".thumb.webp"), thumb, { contentType: "image/webp", cacheControl: "31536000" });
      out.push(path);
    } catch {
      /* skip unreadable image */
    }
  }
  return out;
}
