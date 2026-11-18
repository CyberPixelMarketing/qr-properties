import "server-only";
import * as cheerio from "cheerio";

/** What we try to pull out of any listing page, before (optional) AI clean-up. */
export type Extracted = {
  kind: "apartment" | "building" | null;
  purpose: "sale" | "rent" | null;
  title: string | null;
  description: string | null;
  price_aed: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  address_text: string | null;
  lat: number | null;
  lng: number | null;
  image_urls: string[];
};

export type PageSignals = {
  jsonLd: unknown[];
  og: Record<string, string[]>;
  text: string;
  imageCandidates: string[];
};

const LISTING_TYPES =
  /^(Residence|Apartment|House|SingleFamilyResidence|Accommodation|Place|Product|Offer|RealEstateListing|Room|Suite|ApartmentComplex)$/i;

function flatten(node: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(node)) node.forEach((n) => flatten(n, out));
  else if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    out.push(obj);
    if (obj["@graph"]) flatten(obj["@graph"], out);
    for (const v of Object.values(obj)) if (v && typeof v === "object") flatten(v, out);
  }
  return out;
}

const toNum = (v: unknown): number | null => {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object" && v && "value" in v) return toNum((v as { value: unknown }).value);
  const n = Number(String(v).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && String(v).match(/\d/) ? n : null;
};

const asArray = <T,>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v]);

function imgUrls(v: unknown): string[] {
  return asArray(v as unknown[]).flatMap((x) => {
    if (typeof x === "string") return [x];
    if (x && typeof x === "object") {
      const o = x as Record<string, unknown>;
      return [o.url, o.contentUrl].filter((u): u is string => typeof u === "string");
    }
    return [];
  });
}

export function readPage(html: string, baseUrl: string): PageSignals {
  const $ = cheerio.load(html);
  const jsonLd: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      jsonLd.push(JSON.parse($(el).contents().text()));
    } catch {
      /* ignore malformed blocks */
    }
  });

  const og: Record<string, string[]> = {};
  $("meta[property], meta[name]").each((_, el) => {
    const key = ($(el).attr("property") ?? $(el).attr("name") ?? "").toLowerCase();
    const val = $(el).attr("content");
    if (key && val && /^(og:|twitter:|description$|product:|place:)/.test(key)) (og[key] ??= []).push(val.trim());
  });

  const abs = (u: string) => {
    try {
      return new URL(u, baseUrl).toString();
    } catch {
      return null;
    }
  };
  const imageCandidates = new Set<string>();
  $("img").each((_, el) => {
    const src = $(el).attr("data-src") ?? $(el).attr("src") ?? $(el).attr("data-lazy-src");
    const w = Number($(el).attr("width") ?? 0);
    if (src && !src.startsWith("data:") && (w === 0 || w >= 300)) {
      const a = abs(src);
      if (a && /\.(jpe?g|png|webp|avif)(\?|$)/i.test(a)) imageCandidates.add(a);
    }
  });

  $("script,style,noscript,svg,iframe,header nav,footer").remove();
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 15000);

  return { jsonLd, og, text, imageCandidates: [...imageCandidates].slice(0, 40) };
}

/** Deterministic pass over JSON-LD then Open Graph — used alone when no AI key is configured. */
export function heuristicExtract(s: PageSignals, baseUrl: string): Extracted {
  const nodes = flatten(s.jsonLd);
  const main =
    nodes.find((n) => asArray(n["@type"] as string | string[]).some((t) => LISTING_TYPES.test(String(t)))) ?? {};
  const offer = (nodes.find((n) => asArray(n["@type"] as string | string[]).includes("Offer")) ?? main.offers ?? {}) as Record<string, unknown>;
  const geo = (nodes.find((n) => n["@type"] === "GeoCoordinates") ?? main.geo ?? {}) as Record<string, unknown>;
  const address = main.address as Record<string, unknown> | string | undefined;
  const og1 = (k: string) => s.og[k]?.[0] ?? null;

  const priceRaw = toNum(offer.price ?? offer.lowPrice ?? og1("product:price:amount") ?? og1("og:price:amount"));
  const currency = String(offer.priceCurrency ?? og1("product:price:currency") ?? "AED").toUpperCase();
  const floor = main.floorSize as Record<string, unknown> | undefined;
  let area = toNum(floor?.value ?? floor);
  const unit = String(floor?.unitCode ?? floor?.unitText ?? "").toUpperCase();
  if (area && /MTK|SQM|M2/.test(unit)) area = Math.round(area * 10.7639);

  const text = `${og1("og:title") ?? ""} ${og1("og:description") ?? ""} ${s.text.slice(0, 3000)}`.toLowerCase();
  const purpose = /\b(for rent|rent|yearly|per year|monthly)\b|للإيجار|ايجار|إيجار/.test(text)
    ? "rent"
    : /\b(for sale|sale|buy)\b|للبيع|بيع/.test(text)
      ? "sale"
      : null;

  const images = [...imgUrls(main.image), ...asArray(s.og["og:image"]), ...asArray(s.og["twitter:image"]), ...s.imageCandidates]
    .map((u) => {
      try {
        return new URL(u, baseUrl).toString();
      } catch {
        return null;
      }
    })
    .filter((u): u is string => Boolean(u));

  return {
    kind: null,
    purpose,
    title: (main.name as string) ?? og1("og:title") ?? og1("twitter:title"),
    description: (main.description as string) ?? og1("og:description") ?? og1("description"),
    price_aed: priceRaw != null && currency === "AED" ? priceRaw : null,
    bedrooms: toNum(main.numberOfBedrooms ?? main.numberOfRooms),
    bathrooms: toNum(main.numberOfBathroomsTotal ?? main.numberOfFullBathrooms),
    area_sqft: area,
    address_text:
      typeof address === "string"
        ? address
        : address
          ? [address.streetAddress, address.addressLocality, address.addressRegion].filter(Boolean).join(", ") || null
          : null,
    lat: toNum(geo.latitude),
    lng: toNum(geo.longitude),
    image_urls: [...new Set(images)],
  };
}
