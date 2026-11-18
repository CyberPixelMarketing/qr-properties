"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { LocateFixed, MapPin, SlidersHorizontal, X } from "lucide-react";
import { distanceMeters, type LatLng } from "@/lib/maps";
import { Button, cn } from "@/components/ui";
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

  const filtersActive = JSON.stringify(filters) !== JSON.stringify(EMPTY);
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));
  const total = groups.reduce((n, g) => n + (g.item.kind === "building" ? Math.max(1, g.units.length) : 1), 0);

  const selectCls =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

  return (
    <section className="space-y-4" aria-label={t("results", { count: total })}>
      {/* Location explainer shown before the browser prompt */}
      {(loc === "prompt" || loc === "locating") && (
        <div className="flex flex-col gap-3 rounded-card border border-blue-200 bg-sky-soft p-4 sm:flex-row sm:items-center">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-white">
            <MapPin className="size-6" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="font-bold text-navy">{t("locTitle")}</p>
            <p className="text-sm text-slate-600">{t("locBody")}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={locate} disabled={loc === "locating"}>
              <LocateFixed className="size-4" aria-hidden />
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

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600" aria-live="polite">
          {t("results", { count: total })} · {origin ? t("sortedNearest") : t("sortedNewest")}
        </p>
        <div className="flex gap-2">
          {!origin && (loc === "dismissed" || loc === "denied") && (
            <Button variant="secondary" onClick={locate} className="px-3 py-2">
              <LocateFixed className="size-4" aria-hidden />
              {t("sortNearest")}
            </Button>
          )}
          <Button
            variant={filtersActive ? "primary" : "secondary"}
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-controls="filters"
            className="px-3 py-2"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            {t("filters")}
          </Button>
        </div>
      </div>
      {loc === "denied" && !origin && <p className="text-xs text-slate-500">{t("locDenied")}</p>}

      {showFilters && (
        <div id="filters" className="grid grid-cols-2 gap-3 rounded-card border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-5">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-navy">{t("type")}</span>
            <select className={selectCls} value={filters.type} onChange={(e) => set("type", e.target.value as Filters["type"])}>
              <option value="all">{t("anyType")}</option>
              <option value="apartment">{t("apartments")}</option>
              <option value="building">{t("buildings")}</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-navy">{tl("purposeLabel")}</span>
            <select className={selectCls} value={filters.purpose} onChange={(e) => set("purpose", e.target.value as Filters["purpose"])}>
              <option value="all">{t("anyPurpose")}</option>
              <option value="sale">{tl("purpose.sale")}</option>
              <option value="rent">{tl("purpose.rent")}</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-navy">{t("beds")}</span>
            <select className={selectCls} value={filters.beds} onChange={(e) => set("beds", e.target.value as Filters["beds"])}>
              <option value="any">{t("anyBeds")}</option>
              <option value="0">{tl("studio")}</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4+</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-navy">{t("minPrice")}</span>
            <input className={cn(selectCls, "ltr-field")} inputMode="numeric" value={filters.min} onChange={(e) => set("min", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-navy">{t("maxPrice")}</span>
            <input className={cn(selectCls, "ltr-field")} inputMode="numeric" value={filters.max} onChange={(e) => set("max", e.target.value)} />
          </label>
          {filtersActive && (
            <button type="button" onClick={() => setFilters(EMPTY)} className="col-span-2 inline-flex items-center gap-1 text-sm text-brand hover:underline md:col-span-5">
              <X className="size-4" aria-hidden />
              {t("reset")}
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <p className="rounded-card border border-slate-200 bg-white p-8 text-center text-slate-600">{t("noListings")}</p>
      ) : groups.length === 0 ? (
        <p className="rounded-card border border-slate-200 bg-white p-8 text-center text-slate-600">{t("noResults")}</p>
      ) : (
        <div className="space-y-4">
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
