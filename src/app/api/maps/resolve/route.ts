import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { extractLatLng, isGoogleMapsUrl } from "@/lib/maps";

export const runtime = "nodejs";

const MAX_HOPS = 6;
const TIMEOUT_MS = 6000;
const UA = "Mozilla/5.0 (compatible; QRPropertiesBot/1.0)";

/** Follow redirects by hand so every hop is checked against the Google allowlist (SSRF guard). */
async function resolve(start: string): Promise<{ finalUrl: string; html?: string }> {
  let url = start;
  for (let i = 0; i < MAX_HOPS; i++) {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "consent.google.com") {
      const cont = new URL(url).searchParams.get("continue");
      if (!cont) break;
      url = cont;
      continue;
    }
    if (!isGoogleMapsUrl(url)) throw new Error("not_google");
    // Long URL already carries coordinates — no need to fetch.
    if (extractLatLng(url)) return { finalUrl: url };

    const res = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": UA, "accept-language": "en" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url).toString();
      continue;
    }
    // Final page: read a bounded slice of HTML as a last resort.
    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const dec = new TextDecoder();
      while (html.length < 400_000) {
        const { done, value } = await reader.read();
        if (done) break;
        html += dec.decode(value, { stream: true });
      }
      await reader.cancel().catch(() => {});
    }
    return { finalUrl: url, html };
  }
  return { finalUrl: url };
}

function fromHtml(html: string) {
  // Google embeds the map centre as [[[zoom, lng, lat]...
  const m = html.match(/\[\[\[\d+(?:\.\d+)?,(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)\]/);
  if (m) {
    const lng = parseFloat(m[1]);
    const lat = parseFloat(m[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }
  const meta = html.match(/center=(-?\d{1,3}\.\d+)%2C(-?\d{1,3}\.\d+)/);
  if (meta) return { lat: parseFloat(meta[1]), lng: parseFloat(meta[2]) };
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = z.object({ url: z.string().trim().url().max(2048) }).safeParse(await request.json().catch(() => null));
  if (!body.success || !isGoogleMapsUrl(body.data.url)) {
    return NextResponse.json({ error: "not_google" }, { status: 400 });
  }

  try {
    const direct = extractLatLng(body.data.url);
    if (direct) return NextResponse.json({ ...direct, url: body.data.url });

    const { finalUrl, html } = await resolve(body.data.url);
    const coords = extractLatLng(finalUrl) ?? (html ? fromHtml(html) : null);
    if (!coords) return NextResponse.json({ error: "no_coords", url: finalUrl }, { status: 422 });
    return NextResponse.json({ ...coords, url: body.data.url });
  } catch (e) {
    const code = e instanceof Error && e.message === "not_google" ? "not_google" : "fetch_failed";
    return NextResponse.json({ error: code }, { status: code === "not_google" ? 400 : 502 });
  }
}
