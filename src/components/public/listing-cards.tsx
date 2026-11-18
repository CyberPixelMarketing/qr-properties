"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bath, BedDouble, ChevronDown, MapPin, Maximize2, Navigation } from "@/components/icons";
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

/** Figma "specs" row: bed + bath (+ area) with Ionicons outline. */
function Specs({ item, className }: { item: PublicItem; className?: string }) {
  const t = useTranslations("public");
  const tl = useTranslations("listings");
  const locale = useLocale();
  if (item.bedrooms == null && item.bathrooms == null && item.area_sqft == null) return null;
  const nf = (n: number) => n.toLocaleString(locale === "ar" ? "ar-AE" : "en-AE");
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] leading-[22px] text-text", className)}>
      {item.bedrooms != null && (
        <li className="inline-flex items-center gap-1">
          <BedDouble className="size-[15px]" aria-hidden />
          {item.bedrooms === 0 ? tl("studio") : t("bedsN", { n: item.bedrooms })}
        </li>
      )}
      {item.bathrooms != null && (
        <li className="inline-flex items-center gap-1">
          <Bath className="size-[15px]" aria-hidden />
          {t("bathsN", { n: item.bathrooms })}
        </li>
      )}
      {item.area_sqft != null && (
        <li className="inline-flex items-center gap-1">
          <Maximize2 className="size-[15px]" aria-hidden />
          {t("sqft", { n: nf(Number(item.area_sqft)) })}
        </li>
      )}
    </ul>
  );
}

function Price({ item, size = "lg" }: { item: PublicItem; size?: "lg" | "sm" }) {
  const t = useTranslations("public");
  const locale = useLocale();
  if (item.price_aed == null) return null;
  return (
    <p className={cn("font-bold text-ink", size === "lg" ? "text-xl leading-8" : "text-[15px] leading-6")}>
      {formatAed(item.price_aed, locale)}
      {item.purpose === "rent" && <span> {t("perYear")}</span>}
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
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-[18px]",
        nearest ? "bg-success text-white" : "bg-white text-ink shadow-card",
      )}
    >
      <Navigation className="size-3" aria-hidden />
      {nearest && <span>{t("nearest")} ·</span>}
      {label(meters)}
    </span>
  );
}

function PurposePill({ label }: { label: string }) {
  return <span className="rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-medium leading-[18px] text-white">{label}</span>;
}

/** Figma "Property card": media with overlay pills, then price / title / location / specs. */
export function ListingCard({
  item,
  advertiser,
  qrUrl,
  distance,
  nearest,
  priority,
}: {
  item: PublicItem;
  advertiser: Advertiser;
  qrUrl: string;
  siteUrl?: string;
  distance: number | null;
  nearest?: boolean;
  priority?: boolean;
}) {
  const tl = useTranslations("listings");
  const href = `/a/${advertiser.slug}/p/${item.id}`;
  return (
    <article className={cn("flex flex-col overflow-hidden rounded-card bg-white shadow-card", nearest && "ring-2 ring-success")}>
      <div className="relative">
        <ImageSlider
          paths={item.image_paths}
          qrUrl={qrUrl}
          advertiserName={advertiser.name}
          alt={item.title}
          className="h-[170px] sm:h-[190px]"
          priority={priority}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
          {item.purpose ? <PurposePill label={tl(`purpose.${item.purpose}`)} /> : <span />}
          <DistanceBadge meters={distance} nearest={nearest} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <Price item={item} />
        <Link href={href} className="line-clamp-2 text-[15px] font-medium leading-[26px] text-text hover:text-brand">
          {item.title}
        </Link>
        {item.address_text && (
          <p className="flex items-center gap-1 text-[13px] leading-[22px] text-muted">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">{item.address_text}</span>
          </p>
        )}
        <Specs item={item} />
      </div>
    </article>
  );
}

function UnitRow({ unit, advertiser, siteUrl }: { unit: PublicItem; advertiser: Advertiser; siteUrl: string }) {
  const t = useTranslations("public");
  const href = `/a/${advertiser.slug}/p/${unit.id}`;
  return (
    <li className="space-y-2 rounded-xl bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={href} className="line-clamp-1 text-[15px] font-medium text-text hover:text-brand">
            {unit.title}
          </Link>
          <Specs item={unit} />
        </div>
        <Price item={unit} size="sm" />
      </div>
      <ContactButtons
        advertiser={advertiser}
        showEmail={false}
        variant="bar"
        className="[&>a]:min-h-9 [&>a]:py-1.5"
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
        "flex flex-col overflow-hidden rounded-card bg-white shadow-card",
        open && "sm:col-span-2 lg:col-span-3",
        nearest && "ring-2 ring-success",
      )}
    >
      <div className={cn(open && "md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]")}>
        <div className="relative">
          <ImageSlider
            paths={building.image_paths}
            qrUrl={qrUrl}
            advertiserName={advertiser.name}
            alt={building.title}
            className={cn("h-[170px] sm:h-[190px]", open && "md:h-full md:min-h-64")}
            priority={priority}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2.5">
            <span className="rounded-full bg-ink px-2.5 py-0.5 text-[11px] font-medium leading-[18px] text-white">{tl("kind.building")}</span>
            <DistanceBadge meters={distance} nearest={nearest} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5 p-3.5">
          <Link href={href} className="text-xl font-bold leading-8 text-ink hover:text-brand">
            {building.title}
          </Link>
          {building.address_text && (
            <p className="flex items-center gap-1 text-[13px] leading-[22px] text-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              {building.address_text}
            </p>
          )}
          <p className="text-[13px] font-semibold text-brand">{t("units", { count: units.length })}</p>
          {units.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls={panelId}
              className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[14px] bg-sky-soft px-4 text-[13px] font-semibold text-brand hover:bg-[#dcebf8]"
            >
              {open ? t("hideUnits") : t("showUnits")}
              <ChevronDown className={cn("size-4 transition", open && "rotate-180")} aria-hidden />
            </button>
          )}
        </div>
      </div>
      {open && units.length > 0 && (
        <ul id={panelId} className="grid gap-2 bg-page p-3 sm:grid-cols-2">
          {units.map((u) => (
            <UnitRow key={u.id} unit={u} advertiser={advertiser} siteUrl={siteUrl} />
          ))}
        </ul>
      )}
    </article>
  );
}

export { Specs, Price, DistanceBadge };
