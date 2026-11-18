import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Bath, BedDouble, MapPin, Maximize2, PriceTag, SwapHorizontal } from "@/components/icons";
import { Link } from "@/i18n/navigation";
import { SITE_URL } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { getPublicListings, getPublicProfile } from "@/lib/public-data";
import { formatAed, listingImageUrl, publicAvatarUrl } from "@/lib/listing-urls";
import { ContactButtons } from "@/components/public/contact-buttons";
import { ImageSlider } from "@/components/public/image-slider";
import { ShareButton } from "@/components/public/share-button";
import { Tracker } from "@/components/public/tracker";
import type { Advertiser, PublicItem } from "@/components/public/types";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { ComponentType } from "react";
import { buttonClass } from "@/components/ui";

function SpecItem({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sky-soft text-brand">
        <Icon className="size-[17px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium leading-[18px] text-muted">{label}</p>
        <p className="text-[13px] font-semibold leading-[22px] text-ink">{value}</p>
      </div>
    </div>
  );
}

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
  const nf = (n: number) => n.toLocaleString(locale === "ar" ? "ar-AE" : "en-AE");

  const specs = [
    item.purpose && { icon: SwapHorizontal, label: t("purposeLabel"), value: tl(`purpose.${item.purpose}`) },
    { icon: PriceTag, label: t("typeLabel"), value: tl(`kind.${item.kind}`) },
    item.bedrooms != null && { icon: BedDouble, label: t("bedsLabel"), value: item.bedrooms === 0 ? tl("studio") : t("bedsN", { n: item.bedrooms }) },
    item.bathrooms != null && { icon: Bath, label: t("bathsLabel"), value: String(item.bathrooms) },
    item.area_sqft != null && { icon: Maximize2, label: t("areaLabel"), value: t("sqft", { n: nf(Number(item.area_sqft)) }) },
  ].filter(Boolean) as { icon: ComponentType<{ className?: string }>; label: string; value: string }[];

  const roundBtn = "grid size-10 place-items-center rounded-full bg-white text-ink shadow-card hover:bg-page";

  return (
    <div className="min-h-dvh bg-page pb-28">
      <Tracker slug={slug} listingId={item.id} />
      <main className="mx-auto max-w-3xl">
        {/* Gallery with floating actions (Figma S15 "Gallery") */}
        <div className="relative">
          <ImageSlider
            paths={paths}
            qrUrl={qrUrl}
            advertiserName={profile.display_name}
            alt={item.title}
            size="full"
            priority
            className="aspect-[6/5] sm:aspect-[16/10] md:mt-4 md:rounded-card"
          />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
            <Link href={`/a/${slug}`} className={roundBtn} aria-label={t("allProperties", { name: profile.display_name })}>
              <ArrowRight className="size-5 ltr:rotate-180" aria-hidden />
            </Link>
            <div className="flex items-center gap-2 [&_a]:rounded-full [&_a]:bg-white [&_a]:shadow-card">
              <LanguageSwitcher />
              <ShareButton iconOnly url={url} title={item.title} />
            </div>
          </div>
        </div>

        {/* Summary (white, rounded bottom) */}
        <section className="space-y-2 rounded-b-[19px] bg-white p-4 md:mt-3 md:rounded-card md:shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-sky-soft px-2.5 py-1 text-[11px] font-medium leading-[18px] text-brand">
              {[item.purpose && tl(`purpose.${item.purpose}`), tl(`kind.${item.kind}`)].filter(Boolean).join(" · ")}
            </span>
            <Link href={`/a/${slug}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand hover:underline">
              {advertiser.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={advertiser.logoUrl} alt="" className="size-6 rounded-full bg-white object-contain" />
              )}
              <span className="max-w-48 truncate">{profile.display_name}</span>
            </Link>
          </div>
          {item.price_aed != null && (
            <p className="text-[27px] font-bold leading-[38px] text-ink">
              {formatAed(item.price_aed, locale)}
              {item.purpose === "rent" && <span className="text-[17px]"> {t("perYear")}</span>}
            </p>
          )}
          <h1 className="text-[15px] font-medium leading-[26px] text-text">{item.title}</h1>
          {building && (
            <Link href={`/a/${slug}/p/${building.id}`} className="block text-[13px] font-semibold text-brand hover:underline">
              {t("inBuilding", { name: building.title })}
            </Link>
          )}
          {item.address_text && (
            <p className="flex items-center gap-1 text-[13px] leading-[22px] text-muted">
              <MapPin className="size-3.5" aria-hidden />
              {item.address_text}
            </p>
          )}
        </section>

        <div className="space-y-3 p-4 md:px-0">
          {/* Property details grid */}
          <section className="space-y-3.5 rounded-[19px] bg-white p-4">
            <h2 className="text-base font-semibold leading-[27px] text-ink">{t("propertySpecs")}</h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
              {specs.map((sp) => (
                <SpecItem key={sp.label} icon={sp.icon} label={sp.label} value={sp.value} />
              ))}
            </div>
          </section>

          {d.description && (
            <section className="rounded-[19px] bg-white p-4">
              <h2 className="mb-2 text-base font-semibold text-ink">{t("description")}</h2>
              <p className="whitespace-pre-line text-[15px] leading-[26px] text-text">{d.description}</p>
            </section>
          )}

          {units.length > 0 && (
            <section className="space-y-1 rounded-[19px] bg-white p-4">
              <h2 className="text-base font-semibold text-ink">{t("units", { count: units.length })}</h2>
              <ul className="divide-y divide-divider">
                {units.map((u: PublicItem) => (
                  <li key={u.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/a/${slug}/p/${u.id}`} className="line-clamp-1 text-[15px] font-medium text-text hover:text-brand">
                        {u.title}
                      </Link>
                      <p className="text-[13px] text-muted">
                        {[
                          u.bedrooms != null && (u.bedrooms === 0 ? tl("studio") : t("bedsN", { n: u.bedrooms })),
                          u.bathrooms != null && t("bathsN", { n: u.bathrooms }),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {u.price_aed != null && <span className="shrink-0 text-[15px] font-bold text-ink">{formatAed(u.price_aed, locale)}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {lat != null && lng != null && (
            <section className="space-y-3 rounded-[19px] bg-white p-4">
              <h2 className="text-base font-semibold text-ink">{t("location")}</h2>
              <iframe
                title={t("location")}
                src={`https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=${locale}&output=embed`}
                className="h-56 w-full rounded-xl border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a
                href={d.mapsUrl ?? `https://www.google.com/maps?q=${lat},${lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass("secondary", "w-full")}
              >
                <MapPin className="size-[18px]" aria-hidden />
                {t("openInMaps")}
              </a>
            </section>
          )}
        </div>
      </main>

      {/* Bottom bar (Figma S15): WhatsApp + Call */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white px-4 py-3.5">
        <div className="mx-auto max-w-3xl">
          <ContactButtons advertiser={advertiser} variant="bar" waText={t("waMessage", { title: item.title, url })} />
        </div>
      </div>
    </div>
  );
}
