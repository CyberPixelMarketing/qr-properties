/**
 * Google Maps link parsing. Pure functions — safe on server and client.
 * The server route (/api/maps/resolve) follows short-link redirects first.
 */

export type LatLng = { lat: number; lng: number };

const GOOGLE_HOSTS = [
  /^maps\.app\.goo\.gl$/i,
  /^goo\.gl$/i,
  /^(www\.)?google\.[a-z.]{2,6}$/i,
  /^maps\.google\.[a-z.]{2,6}$/i,
];

export function isGoogleMapsUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    if (!GOOGLE_HOSTS.some((re) => re.test(u.hostname))) return false;
    if (/^goo\.gl$/i.test(u.hostname)) return u.pathname.startsWith("/maps");
    if (/^(www\.)?google\./i.test(u.hostname)) return u.pathname.startsWith("/maps") || u.searchParams.has("q");
    return true;
  } catch {
    return false;
  }
}

export function isShortMapsUrl(raw: string): boolean {
  try {
    const h = new URL(raw).hostname.toLowerCase();
    return h === "maps.app.goo.gl" || h === "goo.gl";
  } catch {
    return false;
  }
}

function valid(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

const NUM = "(-?\\d{1,3}(?:\\.\\d+)?)";

/**
 * Extract coordinates from a (long) Google Maps URL.
 * Order matters: the pinned place (!3d!4d) beats the viewport centre (@lat,lng).
 */
export function extractLatLng(raw: string): LatLng | null {
  let text = raw;
  try {
    text = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }

  // 1) Place pin: ...!3d25.0805!4d55.1403
  const pin = [...text.matchAll(new RegExp(`!3d${NUM}!4d${NUM}`, "g"))].pop();
  if (pin) {
    const r = valid(parseFloat(pin[1]), parseFloat(pin[2]));
    if (r) return r;
  }

  // 2) Query params that carry "lat,lng"
  try {
    const u = new URL(raw);
    for (const key of ["q", "query", "ll", "destination", "center", "daddr", "sll"]) {
      const v = u.searchParams.get(key);
      const m = v?.match(new RegExp(`^\\s*${NUM}\\s*,\\s*${NUM}\\s*$`));
      if (m) {
        const r = valid(parseFloat(m[1]), parseFloat(m[2]));
        if (r) return r;
      }
    }
  } catch {
    /* not a URL */
  }

  // 3) /place/25.08,55.14 or /search/25.08,+55.14
  const path = text.match(new RegExp(`/(?:place|search|dir)/+${NUM},\\s*\\+?${NUM}`));
  if (path) {
    const r = valid(parseFloat(path[1]), parseFloat(path[2]));
    if (r) return r;
  }

  // 4) Viewport centre: @25.0805,55.1403,17z
  const at = text.match(new RegExp(`@${NUM},${NUM}`));
  if (at) {
    const r = valid(parseFloat(at[1]), parseFloat(at[2]));
    if (r) return r;
  }

  return null;
}

/** A canonical Google Maps link for a coordinate (used when the advertiser drops a pin). */
export function mapsUrlFor({ lat, lng }: LatLng) {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}

/** Haversine distance in metres (client-side fallback / display). */
export function distanceMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
