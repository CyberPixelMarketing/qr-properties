import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Building, Home, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { imagesFor, LISTING_COLUMNS, type ListingRow as Row } from "@/lib/listings";
import { ListingRow } from "@/components/listings/listing-row";
import { buttonClass, Card, cn } from "@/components/ui";

const FILTERS = ["all", "published", "draft", "hidden"] as const;

export default async function ListingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { status } = await searchParams;
  const filter = FILTERS.includes(status as (typeof FILTERS)[number]) ? (status as (typeof FILTERS)[number]) : "all";
  const { supabase, profile } = await requireUser(locale);
  const t = await getTranslations("listings");

  let q = supabase
    .from("listings")
    .select(LISTING_COLUMNS)
    .eq("owner_id", profile.id)
    .in("kind", ["apartment", "building"])
    .order("created_at", { ascending: false });
  if (filter !== "all") q = q.eq("status", filter);
  const { data: rows } = await q.returns<Row[]>();
  const list = rows ?? [];

  const buildingIds = list.filter((r) => r.kind === "building").map((r) => r.id);
  const { data: units } = buildingIds.length
    ? await supabase.from("listings").select("building_id").in("building_id", buildingIds)
    : { data: [] as { building_id: string }[] };
  const unitCounts = new Map<string, number>();
  for (const u of units ?? []) unitCounts.set(u.building_id, (unitCounts.get(u.building_id) ?? 0) + 1);

  const images = await imagesFor(supabase, list.map((r) => r.id));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy">{t("title")}</h1>
        <div className="flex gap-2">
          <Link href="/dashboard/listings/new?kind=apartment" className={buttonClass("primary")}>
            <Home className="size-4" aria-hidden />
            {t("newApartment")}
          </Link>
          <Link href="/dashboard/listings/new?kind=building" className={buttonClass("secondary")}>
            <Building className="size-4" aria-hidden />
            {t("newBuilding")}
          </Link>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto" aria-label={t("statusLabel")}>
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/dashboard/listings" : `/dashboard/listings?status=${f}`}
            aria-current={filter === f ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium",
              filter === f ? "bg-navy text-white" : "bg-white text-navy ring-1 ring-slate-200 hover:bg-sky-soft",
            )}
          >
            {f === "all" ? t("all") : t(`status.${f}`)}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-slate-600">{t("empty")}</p>
          <Link href="/dashboard/listings/new?kind=apartment" className={buttonClass("primary", "mt-4")}>
            <Plus className="size-4" aria-hidden />
            {t("newApartment")}
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <ListingRow
              key={r.id}
              row={r}
              cover={images.get(r.id)?.[0]?.url}
              unitsCount={unitCounts.get(r.id)}
              publicUrl={`${SITE_URL}/a/${profile.slug}/p/${r.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
