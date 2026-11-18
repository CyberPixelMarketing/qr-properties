"use client";

import { useEffect } from "react";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Records one page/listing view per browser session via a plain RPC call
 * (no Supabase client bundle on public pages). Stores nothing about the visitor.
 */
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
    const send = () =>
      fetch(`${SUPABASE_URL}/rest/v1/rpc/track_event`, {
        method: "POST",
        keepalive: true,
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, "content-type": "application/json" },
        body: JSON.stringify({
          p_slug: slug,
          p_type: listingId ? "listing_view" : "page_view",
          p_src: src === "qr" || src === "share" ? src : "direct",
          p_listing_id: listingId ?? null,
        }),
      }).catch(() => {});
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (w.requestIdleCallback) w.requestIdleCallback(send);
    else setTimeout(send, 1500);
  }, [slug, listingId]);
  return null;
}
