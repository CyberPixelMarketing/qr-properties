import { NextResponse, type NextRequest } from "next/server";
import { qrPng, qrSvg } from "@/lib/qr";

export const runtime = "nodejs";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

// Generated on demand, never stored. One QR per advertiser.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) return NextResponse.json({ error: "invalid_slug" }, { status: 400 });

  const sp = request.nextUrl.searchParams;
  const format = sp.get("format") === "svg" ? "svg" : "png";
  const size = Math.min(4096, Math.max(128, Number(sp.get("size")) || 1024));
  const download = sp.get("download") === "1";
  const headers: Record<string, string> = {
    "cache-control": "public, max-age=86400, s-maxage=604800, immutable",
  };
  if (download) headers["content-disposition"] = `attachment; filename="qr-${slug}.${format}"`;

  if (format === "svg") {
    return new NextResponse(await qrSvg(slug), { headers: { ...headers, "content-type": "image/svg+xml" } });
  }
  const png = await qrPng(slug, size);
  return new NextResponse(new Uint8Array(png), { headers: { ...headers, "content-type": "image/png" } });
}
