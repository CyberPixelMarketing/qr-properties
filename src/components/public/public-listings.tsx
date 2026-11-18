"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LocateFixed, MapPin, SlidersHorizontal, X } from "@/components/icons";
import { distanceMeters, type LatLng } from "@/lib/maps";
import { Button, Segmented, cn } from "@/components/ui";
import { BuildingCard, ListingCard } from "./listing-cards";
import type { Advertiser, PublicItem } from "./types";

type LocState = "checking" | "prompt" | "locating" | "granted" | "denied" | "unsupported" | "dismissed";
type Filters = {
  type: "all" | "apartment" | "building";
  purpose: "all" | "sale" | "rent";
  beds: "any" | "0" | "1" | "2" | "3" | "4";
  min: string;
  max: string;
};
const EMPTY: Filters = { type: "all", purpose: "all", beds: "any", min: "", max: "" };
const DISMISS_KEY = "loc-dismissed";

function matches(u: PublicItem, f: Filters) {
  if (f.purpose !== "all" && u.purpose !== f.purpose) return false;
  if (f.beds !== "any") {
    const b = Number(f.beds);
    if (u.bedrooms == null) return false;
    if (b === 4 ? u.bedrooms < 4 : u.bedrooms !== b) return false;
  }
  const min = Number(f.min.replace(/[^\d.]/g, ""));
  const max = Number(f.max.replace(/[^\d.]/g, ""));
  if (f.min && (u.price_aed == null || u.price_aed < min)) return false;
  if (f.max && (u.price_aed == null || u.price_aed > max)) return false;
  return true;
}

export function PublicListings({
  items,
  advertiser,
  qrUrl,
  siteUrl,
}: {
  items: PublicItem[];
  advertiser: Advertiser;
  qrUrl: string;
  siteUrl: string;
}) {
  const t = useTranslations("public");
  const tl = useTranslations("listings");
  const [loc, setLoc] = useState<LocState>("checking");
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [showFilters, setShowFilters] = useState(false);

  function locate() {
    if (!("geolocation" in navigator)) return setLoc("unsupported");
    setLoc("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // Used only in this browser to sort the list — never sent or stored.
        setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoc("granted");
      },
      () => setLoc("denied"),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  useEffect(() => {
    if (!("geolocation" in navigator)) return setLoc("unsupported");
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {}
    const fallback = () => setLoc(dismissed ? "dismissed" : "prompt");
    if (!navigator.permissions?.query) return fallback();
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((p) => {
        if (p.state === "granted") locate();
        else if (p.state === "denied") setLoc("denied");
        else fallback();
      })
      .catch(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setLoc("dismissed");
  };

  // Group units under their buildings, filter, then sort.
  const groups = useMemo(() => {
    const unitsByBuilding = new Map<string, PublicItem[]>();
    for (const it of items) {
      if (it.kind === "unit" && it.building_id) {
        const arr = unitsByBuilding.get(it.building_id) ?? [];
        arr.push(it);
        unitsByBuilding.set(it.building_id, arr);
      }
    }
    const sellableFilterActive = filters.purpose !== "all" || filters.beds !== "any" || filters.min !== "" || filters.max !== "";

    const top = items
      .filter((it) => it.kind !== "unit")
      .flatMap((it) => {
        if (it.kind === "apartment") {
          if (filters.type === "building" || !matches(it, filters)) return [];
          return [{ item: it, units: [] as PublicItem[] }];
        }
        if (filters.type === "apartment") return [];
        const units = (unitsByBuilding.get(it.id) ?? []).filter((u) => matches(u, filters));
        if (sellableFilterActive && units.length === 0) return [];
        return [{ item: it, units }];
      })
      .map((g) => ({
        ...g,
        distance:
          origin && g.item.lat != null && g.item.lng != null
            ? distanceMeters(origin, { lat: g.item.lat, lng: g.item.lng })
            : null,
      }));

    if (origin) top.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    else top.sort((a, b) => (b.item.published_at ?? "").localeCompare(a.item.published_at ?? ""));
    return top;
  }, [items, filters, origin]);

  // "Filters" badge counts only the extra filters (purpose has its own segmented control).
  const extraActive = filters.type !== "all" || filters.beds !== "any" || filters.min !== "" || filters.max !== "";
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const total = groups.reduce((n, g) => n + (g.item.kind === "building" ? Math.max(1, g.units.length) : 1), 0);

  const selectCls =
    "w-full min-h-11 rounded-xl border border-line bg-white px-3 text-[13px] text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15";

  return (
    <section className="space-y-3" aria-label={t("results", { count: total })}>
      {/* Location explainer shown before the browser prompt */}
      {(loc === "prompt" || loc === "locating") && (
        <div className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card sm:flex-row sm:items-center">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sky-soft text-brand">
            <MapPin className="size-[22px]" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="text-[15px] font-semibold text-ink">{t("locTitle")}</p>
            <p className="text-[13px] leading-[22px] text-muted">{t("locBody")}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={locate} disabled={loc === "locating"} className="flex-1 sm:flex-none">
              <LocateFixed className="size-[18px]" aria-hidden />
              {loc === "locating" ? t("locating") : t("locAllow")}
            </Button>
            {loc === "prompt" && (
              <Button variant="ghost" onClick={dismiss}>
                {t("locLater")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Segmented purpose (Figma S80) + filters */}
      <div className="flex items-center gap-2">
        <Segmented
          className="flex-1"
          name="purpose"
          value={filters.purpose}
          onChange={(v) => set("purpose", v)}
          options={[
            { value: "all", label: t("segAll") },
            { value: "sale", label: t("segSale") },
            { value: "rent", label: t("segRent") },
          ]}
        />
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          aria-controls="filters"
          aria-label={t("filters")}
          className={cn(
            "relative grid size-[46px] shrink-0 place-items-center rounded-xl border bg-white",
            extraActive ? "border-brand text-brand" : "border-line text-ink",
          )}
        >
          <SlidersHorizontal className="size-5" aria-hidden />
          {extraActive && <span className="absolute end-2 top-2 size-2 rounded-full bg-brand" />}
        </button>
      </div>

      {showFilters && (
        <div id="filters" className="grid grid-cols-2 gap-3 rounded-card bg-white p-4 shadow-card md:grid-cols-4">
          <label className="space-y-1">
            <span className="text-[13px] font-semibold text-ink">{t("type")}</span>
            <select className={selectCls} value={filters.type} onChange={(e) => set("type", e.target.value as Filters["type"])}>
              <option value="all">{t("anyType")}</option>
              <option value="apartment">{t("apartments")}</option>
              <option value="building">{t("buildings")}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[13px] font-semibold text-ink">{t("beds")}</span>
            <select className={selectCls} value={filters.beds} onChange={(e) => set("beds", e.target.value as Filters["beds"])}>
              <option value="any">{t("anyBeds")}</option>
              <option value="0">{tl("studio")}</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4+</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[13px] font-semibold text-ink">{t("minPrice")}</span>
            <input className={cn(selectCls, "ltr-field")} inputMode="numeric" value={filters.min} onChange={(e) => set("min", e.target.value)} />
          </label>
          <label className="space-y-1">
            <span className="text-[13px] font-semibold text-ink">{t("maxPrice")}</span>
            <input className={cn(selectCls, "ltr-field")} inputMode="numeric" value={filters.max} onChange={(e) => set("max", e.target.value)} />
          </label>
          {extraActive && (
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...EMPTY, purpose: f.purpose }))}
              className="col-span-2 inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline md:col-span-4"
            >
              <X className="size-4" aria-hidden />
              {t("reset")}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[13px] text-muted" aria-live="polite">
          {t("results", { count: total })} · {origin ? t("sortedNearest") : t("sortedNewest")}
        </p>
        {!origin && (loc === "dismissed" || loc === "denied") && (
          <button type="button" onClick={locate} className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline">
            <LocateFixed className="size-4" aria-hidden />
            {t("sortNearest")}
          </button>
        )}
      </div>
      {loc === "denied" && !origin && <p className="px-1 text-xs text-muted">{t("locDenied")}</p>}

      {items.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-muted shadow-card">{t("noListings")}</p>
      ) : groups.length === 0 ? (
        <p className="rounded-card bg-white p-8 text-center text-muted shadow-card">{t("noResults")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g, i) =>
            g.item.kind === "building" ? (
              <BuildingCard
                key={g.item.id}
                building={g.item}
                units={g.units}
                advertiser={advertiser}
                qrUrl={qrUrl}
                siteUrl={siteUrl}
                distance={g.distance}
                nearest={Boolean(origin) && i === 0}
                defaultOpen={Boolean(origin) && i === 0}
                priority={i === 0}
              />
            ) : (
              <ListingCard
                key={g.item.id}
                item={g.item}
                advertiser={advertiser}
                qrUrl={qrUrl}
                siteUrl={siteUrl}
                distance={g.distance}
                nearest={Boolean(origin) && i === 0}
                priority={i === 0}
              />
            ),
          )}
        </div>
      )}
    </section>
  );
}
