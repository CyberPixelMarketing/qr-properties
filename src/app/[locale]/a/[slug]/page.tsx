import type { Metadata } from "next";
import { preconnect, preload } from "react-dom";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicListings, getPublicProfile } from "@/lib/public-data";
import { listingImageUrl, publicAvatarUrl, thumbUrl } from "@/lib/listing-urls";
import { SITE_URL, SUPABASE_URL } from "@/lib/env";
import { AdvertiserHeader } from "@/components/public/advertiser-header";
import { PublicListings } from "@/components/public/public-listings";
import { Tracker } from "@/components/public/tracker";
import type { Advertiser } from "@/components/public/types";

export const revalidate = 60;

type Params = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await getPublicProfile(slug);
  if (!data) return {};
  const t = await getTranslations({ locale, namespace: "public" });
  const listings = await getPublicListings(slug);
  const cover = listings.find((l) => l.image_paths.length)?.image_paths[0];
  const image = cover ? listingImageUrl(cover) : publicAvatarUrl(data.profile.logo_path);
  const title = t("allProperties", { name: data.profile.display_name });
  return {
    title,
    description: data.profile.bio ?? undefined,
    alternates: { canonical: `${SITE_URL}/${locale}/a/${slug}`, languages: { ar: `/ar/a/${slug}`, en: `/en/a/${slug}` } },
    openGraph: { title, description: data.profile.bio ?? undefined, images: image ? [image] : undefined, type: "website" },
  };
}

export default async function AdvertiserPage({ params }: Params) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const data = await getPublicProfile(slug);
  if (!data) notFound();
  const { profile, links } = data;
  const items = await getPublicListings(slug);
  const t = await getTranslations("common");

  // Warm up the image host and the likely LCP image (newest top-level listing's cover).
  preconnect(SUPABASE_URL, { crossOrigin: "anonymous" });
  const firstCover = items
    .filter((i) => i.kind !== "unit")
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))[0]?.image_paths[0];
  if (firstCover) preload(thumbUrl(firstCover), { as: "image", fetchPriority: "high" });

  const advertiser: Advertiser = {
    slug: profile.slug,
    name: profile.display_name,
    logoUrl: publicAvatarUrl(profile.logo_path),
    phone: profile.phone,
    whatsapp: profile.whatsapp,
    email: profile.contact_email,
  };
  const pageUrl = `${SITE_URL}/${locale}/a/${slug}`;

  return (
    <div className="min-h-dvh bg-slate-50">
      <Tracker slug={slug} />
      <AdvertiserHeader profile={profile} links={links} advertiser={advertiser} pageUrl={pageUrl} />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <PublicListings items={items} advertiser={advertiser} qrUrl={`/api/qr/${slug}?size=600`} siteUrl={`${SITE_URL}/${locale}`} />
      </main>
      <footer className="py-8 text-center text-xs text-slate-500">{t("appName")}</footer>
    </div>
  );
}
