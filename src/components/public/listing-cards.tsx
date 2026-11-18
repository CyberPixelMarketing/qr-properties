"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bath, BedDouble, ChevronDown, MapPin, Maximize2, Navigation } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatAed } from "@/lib/listing-urls";
import { cn } from "@/components/ui";
import { ContactButtons } from "./contact-buttons";
import { ImageSlider } from "./image-slider";
import type { Advertiser, PublicItem } from "./types";

export function useDistanceLabel() {
  const t = useTranslations("public");
  const locale = useLocale();
  return (m: number) => {
    const nf = new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", { maximumFractionDigits: m < 10000 ? 1 : 0 });
    const d = m < 1000 ? t("meters", { n: nf.format(Math.round(m / 10) * 10) }) : t("km", { n: nf.format(m / 1000) });
    return t("away", { distance: d });
  };
}

function Specs({ item, className }: { item: PublicItem; className?: string }) {
  const tl = useTranslations("listings");
  const locale = useLocale();
  if (item.bedrooms == null && item.bathrooms == null && item.area_sqft == null) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700", className)}>
      {item.bedrooms != null && (
        <li className="inline-flex items-center gap-1.5">
          <BedDouble className="size-4 text-slate-500" aria-hidden />
          <span>{item.bedrooms === 0 ? tl("studio") : item.bedrooms}</span>
          <span className="sr-only">{tl("bedrooms")}</span>
        </li>
      )}
      {item.bathrooms != null && (
        <li className="inline-flex items-center gap-1.5">
          <Bath className="size-4 text-slate-500" aria-hidden />
          <span>{item.bathrooms}</span>
          <span className="sr-only">{tl("bathrooms")}</span>
        </li>
      )}
      {item.area_sqft != null && (
        <li className="inline-flex items-center gap-1.5">
          <Maximize2 className="size-4 text-slate-500" aria-hidden />
          <span>
            {Number(item.area_sqft).toLocaleString(locale === "ar" ? "ar-AE" : "en-AE")} {locale === "ar" ? "قدم²" : "sqft"}
          </span>
        </li>
      )}
    </ul>
  );
}

function Price({ item, large = true }: { item: PublicItem; large?: boolean }) {
  const t = useTranslations("public");
  const tl = useTranslations("listings");
  const locale = useLocale();
  if (item.price_aed == null) return null;
  return (
    <p className={cn("font-bold text-navy", large ? "text-2xl" : "text-lg")}>
      {formatAed(item.price_aed, locale)}
      {item.purpose === "rent" && <span className="ms-1 text-sm font-normal text-slate-500">{t("perYear")}</span>}
      {item.purpose && (
        <span className="ms-2 rounded-full bg-sky-soft px-2 py-0.5 align-middle text-xs font-medium text-brand">
          {tl(`purpose.${item.purpose}`)}
        </span>
      )}
    </p>
  );
}

function DistanceBadge({ meters, nearest }: { meters: number | null; nearest?: boolean }) {
  const t = useTranslations("public");
  const label = useDistanceLabel();
  if (meters == null) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        nearest ? "bg-accent text-white" : "bg-sky-soft text-brand",
      )}
    >
      <Navigation className="size-3.5" aria-hidden />
      {nearest && <span>{t("nearest")} ·</span>}
      {label(meters)}
    </span>
  );
}

/** Horizontal on desktop, vertical on mobile. */
export function ListingCard({
  item,
  advertiser,
  qrUrl,
  siteUrl,
  distance,
  nearest,
  priority,
}: {
  item: PublicItem;
  advertiser: Advertiser;
  qrUrl: string;
  siteUrl: string;
  distance: number | null;
  nearest?: boolean;
  priority?: boolean;
}) {
  const t = useTranslations("public");
  const href = `/a/${advertiser.slug}/p/${item.id}`;
  const url = `${siteUrl}${href}`;
  return (
    <article
      className={cn(
        "overflow-hidden rounded-card border bg-white shadow-sm transition hover:shadow-md md:flex",
        nearest ? "border-accent ring-2 ring-accent/30" : "border-slate-200",
      )}
    >
      <ImageSlider
        paths={item.image_paths}
        qrUrl={qrUrl}
        advertiserName={advertiser.name}
        alt={item.title}
        className="aspect-[4/3] md:aspect-auto md:h-auto md:w-[42%] md:min-h-64 md:shrink-0"
        priority={priority}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Price item={item} />
          <DistanceBadge meters={distance} nearest={nearest} />
        </div>
        <Specs item={item} />
        <Link href={href} className="line-clamp-2 text-base font-bold text-brand hover:underline">
          {item.title}
        </Link>
        {item.address_text && (
          <p className="flex items-center gap-1.5 text-sm text-slate-600">
            <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">{item.address_text}</span>
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <ContactButtons advertiser={advertiser} compact waText={t("waMessage", { title: item.title, url })} />
          {advertiser.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={advertiser.logoUrl} alt={advertiser.name} className="hidden h-9 w-auto max-w-20 rounded object-contain sm:block" loading="lazy" />
          )}
        </div>
      </div>
    </article>
  );
}

function UnitRow({ unit, advertiser, siteUrl }: { unit: PublicItem; advertiser: Advertiser; siteUrl: string }) {
  const t = useTranslations("public");
  const href = `/a/${advertiser.slug}/p/${unit.id}`;
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="min-w-0 space-y-1">
        <Link href={href} className="line-clamp-1 font-bold text-brand hover:underline">
          {unit.title}
        </Link>
        <Price item={unit} large={false} />
        <Specs item={unit} className="text-xs" />
      </div>
      <ContactButtons
        advertiser={{ ...advertiser, email: null }}
        compact
        waText={t("waMessage", { title: unit.title, url: `${siteUrl}${href}` })}
      />
    </li>
  );
}

export function BuildingCard({
  building,
  units,
  advertiser,
  qrUrl,
  siteUrl,
  distance,
  nearest,
  defaultOpen,
  priority,
}: {
  building: PublicItem;
  units: PublicItem[];
  advertiser: Advertiser;
  qrUrl: string;
  siteUrl: string;
  distance: number | null;
  nearest?: boolean;
  defaultOpen?: boolean;
  priority?: boolean;
}) {
  const t = useTranslations("public");
  const tl = useTranslations("listings");
  const [open, setOpen] = useState(Boolean(defaultOpen));
  // Auto-expand once the building becomes the nearest result (location arrives after first render).
  useEffect(() => {
    if (defaultOpen) setOpen(true);
  }, [defaultOpen]);
  const href = `/a/${advertiser.slug}/p/${building.id}`;
  const panelId = `units-${building.id}`;

  return (
    <article
      className={cn(
        "overflow-hidden rounded-card border bg-white shadow-sm",
        nearest ? "border-accent ring-2 ring-accent/30" : "border-slate-200",
      )}
    >
      <div className="md:flex">
        <ImageSlider
          paths={building.image_paths}
          qrUrl={qrUrl}
          advertiserName={advertiser.name}
          alt={building.title}
          className="aspect-[4/3] md:aspect-auto md:min-h-56 md:w-[42%] md:shrink-0"
          priority={priority}
        />
        <div className="flex flex-1 flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-navy px-2.5 py-1 text-xs font-medium text-white">{tl("kind.building")}</span>
            <DistanceBadge meters={distance} nearest={nearest} />
          </div>
          <Link href={href} className="text-lg font-bold text-brand hover:underline">
            {building.title}
          </Link>
          {building.address_text && (
            <p className="flex items-center gap-1.5 text-sm text-slate-600">
              <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden />
              {building.address_text}
            </p>
          )}
          <p className="text-sm font-medium text-navy">{t("units", { count: units.length })}</p>
          {units.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={panelId}
              className="mt-auto inline-flex w-fit items-center gap-1.5 rounded-xl bg-sky-soft px-4 py-2.5 text-sm font-medium text-brand hover:bg-blue-100"
            >
              {open ? t("hideUnits") : t("showUnits")}
              <ChevronDown className={cn("size-4 transition", open && "rotate-180")} aria-hidden />
            </button>
          )}
        </div>
      </div>
      {open && units.length > 0 && (
        <ul id={panelId} className="space-y-2 border-t border-slate-100 bg-slate-50 p-3">
          {units.map((u) => (
            <UnitRow key={u.id} unit={u} advertiser={advertiser} siteUrl={siteUrl} />
          ))}
        </ul>
      )}
    </article>
  );
}

export { Specs, Price, DistanceBadge };
