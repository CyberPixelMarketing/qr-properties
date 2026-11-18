import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SITE_URL } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { getPublicListings, getPublicProfile } from "@/lib/public-data";
import { formatAed, listingImageUrl, publicAvatarUrl } from "@/lib/listing-urls";
import { ContactButtons } from "@/components/public/contact-buttons";
import { ImageSlider } from "@/components/public/image-slider";
import { Specs } from "@/components/public/listing-cards";
import { ShareButton } from "@/components/public/share-button";
import { Tracker } from "@/components/public/tracker";
import type { Advertiser, PublicItem } from "@/components/public/types";
import { LanguageSwitcher } from "@/components/language-switcher";
import { buttonClass } from "@/components/ui";

export const revalidate = 60;

type Params = { params: Promise<{ locale: string; slug: string; id: string }> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(slug: string, id: string) {
  if (!UUID_RE.test(id)) return null;
  const data = await getPublicProfile(slug);
  if (!data) return null;
  const all = await getPublicListings(slug);
  const item = all.find((l) => l.id === id);
  if (!item) return null;
  const building = item.building_id ? (all.find((l) => l.id === item.building_id) ?? null) : null;
  const units = item.kind === "building" ? all.filter((l) => l.building_id === item.id) : [];
  // Description + maps link are not in the list RPC payload for size; fetch them here.
  const supabase = createPublicClient();
  const { data: extra } = await supabase
    .from("listings")
    .select("description,maps_url")
    .eq("id", item.building_id && item.kind === "unit" ? item.building_id : item.id)
    .maybeSingle();
  const { data: own } = await supabase.from("listings").select("description").eq("id", item.id).maybeSingle();
  return { ...data, item, building, units, description: own?.description ?? null, mapsUrl: extra?.maps_url ?? null };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug, id } = await params;
  const d = await load(slug, id);
  if (!d) return {};
  const cover = d.item.image_paths[0] ?? d.building?.image_paths[0];
  const price = d.item.price_aed != null ? ` · ${formatAed(d.item.price_aed, locale)}` : "";
  const title = `${d.item.title}${price}`;
  const description = d.description?.slice(0, 180) ?? d.item.address_text ?? d.profile.display_name;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${locale}/a/${slug}/p/${id}` },
    openGraph: { title, description, images: cover ? [listingImageUrl(cover)] : undefined, type: "website" },
  };
}

export default async function ListingDetailPage({ params }: Params) {
  const { locale, slug, id } = await params;
  setRequestLocale(locale);
  const d = await load(slug, id);
  if (!d) notFound();
  const t = await getTranslations("public");
  const tl = await getTranslations("listings");
  const { profile, item, building, units } = d;

  const advertiser: Advertiser = {
    slug: profile.slug,
    name: profile.display_name,
    logoUrl: publicAvatarUrl(profile.logo_path),
    phone: profile.phone,
    whatsapp: profile.whatsapp,
    email: profile.contact_email,
  };
  const url = `${SITE_URL}/${locale}/a/${slug}/p/${id}`;
  const lat = item.lat;
  const lng = item.lng;
  const paths = item.image_paths.length ? item.image_paths : (building?.image_paths ?? []);
  const qrUrl = `/api/qr/${slug}?size=600`;

  return (
    <div className="min-h-dvh bg-slate-50 pb-24 md:pb-10">
      <Tracker slug={slug} listingId={item.id} />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
          <Link href={`/a/${slug}`} className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-navy">
            <ArrowRight className="size-4 shrink-0 ltr:rotate-180" aria-hidden />
            {advertiser.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={advertiser.logoUrl} alt="" className="size-8 rounded-lg object-contain" />
            )}
            <span className="truncate">{t("allProperties", { name: profile.display_name })}</span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-0 sm:px-4 sm:pt-5">
        <ImageSlider
          paths={paths}
          qrUrl={qrUrl}
          advertiserName={profile.display_name}
          alt={item.title}
          size="full"
          priority
          className="aspect-[4/3] sm:rounded-card md:aspect-[16/9]"
        />

        <div className="grid gap-5 px-4 sm:px-0 md:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <section className="space-y-3 rounded-card border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-full bg-navy px-2.5 py-1 font-medium text-white">{tl(`kind.${item.kind}`)}</span>
                {item.purpose && <span className="rounded-full bg-sky-soft px-2.5 py-1 font-medium text-brand">{tl(`purpose.${item.purpose}`)}</span>}
              </div>
              {item.price_aed != null && (
                <p className="text-3xl font-bold text-navy">
                  {formatAed(item.price_aed, locale)}
                  {item.purpose === "rent" && <span className="ms-1 text-base font-normal text-slate-500">{t("perYear")}</span>}
                </p>
              )}
              <h1 className="text-xl font-bold text-brand">{item.title}</h1>
              {building && (
                <Link href={`/a/${slug}/p/${building.id}`} className="text-sm text-slate-600 hover:underline">
                  {t("inBuilding", { name: building.title })}
                </Link>
              )}
              {item.address_text && (
                <p className="flex items-center gap-1.5 text-sm text-slate-600">
                  <MapPin className="size-4 text-slate-400" aria-hidden />
                  {item.address_text}
                </p>
              )}
              <Specs item={item} className="border-t border-slate-100 pt-3 text-base" />
            </section>

            {d.description && (
              <section className="rounded-card border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-2 font-bold text-navy">{t("description")}</h2>
                <p className="whitespace-pre-line leading-relaxed text-slate-700">{d.description}</p>
              </section>
            )}

            {units.length > 0 && (
              <section className="space-y-2 rounded-card border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-bold text-navy">{t("units", { count: units.length })}</h2>
                <ul className="divide-y divide-slate-100">
                  {units.map((u: PublicItem) => (
                    <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link href={`/a/${slug}/p/${u.id}`} className="line-clamp-1 font-medium text-brand hover:underline">
                          {u.title}
                        </Link>
                        <Specs item={u} className="text-xs" />
                      </div>
                      {u.price_aed != null && <span className="shrink-0 font-bold text-navy">{formatAed(u.price_aed, locale)}</span>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {lat != null && lng != null && (
              <section className="space-y-3 rounded-card border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="font-bold text-navy">{t("location")}</h2>
                <iframe
                  title={t("location")}
                  src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=${locale}&output=embed`}
                  className="h-64 w-full rounded-xl border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
                <a
                  href={d.mapsUrl ?? `https://www.google.com/maps?q=${lat},${lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClass("secondary")}
                >
                  <MapPin className="size-4" aria-hidden />
                  {t("openInMaps")}
                </a>
              </section>
            )}
          </div>

          <aside className="hidden md:block">
            <div className="sticky top-5 space-y-3 rounded-card border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                {advertiser.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={advertiser.logoUrl} alt="" className="size-12 rounded-xl object-contain" />
                )}
                <p className="font-bold text-navy">{profile.display_name}</p>
              </div>
              <ContactButtons advertiser={advertiser} waText={t("waMessage", { title: item.title, url })} className="[&>a]:flex-1" />
              <ShareButton url={url} title={item.title} className="w-full" />
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="flex gap-2 [&>div]:flex-1 [&>div>a]:flex-1">
          <ContactButtons advertiser={{ ...advertiser, email: null }} compact waText={t("waMessage", { title: item.title, url })} />
          <ShareButton url={url} title={item.title} className="px-3 py-2" />
        </div>
      </div>
    </div>
  );
}
