// Shared (client + server) helpers for listing images and prices.

export function listingImageUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-images/${path}`;
}

/** Card-size variant uploaded alongside each WebP original. */
export function thumbPath(path: string) {
  return path.endsWith(".webp") ? path.replace(/\.webp$/, ".thumb.webp") : path;
}

export function thumbUrl(path: string) {
  return listingImageUrl(thumbPath(path));
}

export function withThumbs(paths: string[]) {
  return paths.flatMap((p) => (p.endsWith(".webp") ? [p, thumbPath(p)] : [p]));
}

export function formatAed(value: number | null, locale: string) {
  if (value == null) return "";
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 0,
  }).format(value);
}

export function publicAvatarUrl(path: string | null | undefined) {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}
