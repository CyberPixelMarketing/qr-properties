"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Records one page/listing view per browser session. Stores nothing about the visitor. */
export function Tracker({ slug, listingId }: { slug: string; listingId?: string }) {
  useEffect(() => {
    const src = new URLSearchParams(window.location.search).get("src");
    const key = `tv:${slug}:${listingId ?? "page"}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage unavailable — still count */
    }
    createClient()
      .rpc("track_event", {
        p_slug: slug,
        p_type: listingId ? "listing_view" : "page_view",
        p_src: src === "qr" || src === "share" ? src : "direct",
        p_listing_id: listingId ?? null,
      })
      .then(() => {});
  }, [slug, listingId]);
  return null;
}
