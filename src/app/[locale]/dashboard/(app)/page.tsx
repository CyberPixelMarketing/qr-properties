import { getTranslations, setRequestLocale } from "next-intl/server";
import { Building2, Eye, Home, Link2, QrCode, ScanLine } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { buttonClass, Card } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";

type Usage = { plan_name_ar: string; plan_name_en: string; max_listings: number | null; listings_used: number };
type Stats = { page_views: number; qr_scans: number; listing_views: number };

export default async function DashboardHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase, profile } = await requireUser(locale);
  const t = await getTranslations("dashboard");
  const ts = await getTranslations("stats");
  const tn = await getTranslations("nav");
  const tl = await getTranslations("listings");

  const [{ data: usage }, { data: stats }, { data: perListing }] = await Promise.all([
    supabase.rpc("my_plan_usage").single<Usage>(),
    supabase.rpc("my_stats", { p_days: 30 }).single<Stats>(),
    supabase.rpc("my_listing_views", { p_days: 30 }),
  ]);
  const top = ((perListing ?? []) as { listing_id: string; views: number }[])
    .sort((a, b) => Number(b.views) - Number(a.views))
    .slice(0, 5);
  const { data: topRows } = top.length
    ? await supabase.from("listings").select("id,title,kind").in("id", top.map((x) => x.listing_id))
    : { data: [] as { id: string; title: string; kind: string }[] };
  const titleOf = new Map((topRows ?? []).map((r) => [r.id, r.title]));

  const publicUrl = `${SITE_URL}/a/${profile.slug}`;
  const cards = [
    { label: ts("pageViews"), value: stats?.page_views ?? 0, icon: Eye },
    { label: ts("qrScans"), value: stats?.qr_scans ?? 0, icon: ScanLine },
    { label: ts("listingViews"), value: stats?.listing_views ?? 0, icon: Building2 },
  ];
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">{t("welcome", { name: profile.display_name ?? "" })}</h1>

      <section aria-labelledby="stats-h">
        <h2 id="stats-h" className="mb-3 text-sm font-medium text-slate-500">
          {ts("title")}
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {cards.map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-4">
              <Icon className="mb-2 size-5 text-brand" aria-hidden />
              <p className="text-2xl font-bold text-navy">{nf.format(Number(value))}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-medium text-slate-500">{t("publicPage")}</h2>
          <a href={`/${locale}/a/${profile.slug}`} target="_blank" rel="noopener" className="mt-2 block break-all font-medium text-brand hover:underline" dir="ltr">
            {publicUrl}
          </a>
          <div className="mt-4 flex flex-wrap gap-2">
            <CopyButton text={publicUrl} />
            <Link href="/dashboard/qr" className={buttonClass("ghost")}>
              <QrCode className="size-4" aria-hidden />
              {tn("qr")}
            </Link>
          </div>
        </Card>
        {usage && (
          <Card>
            <h2 className="text-sm font-medium text-slate-500">{t("planCard")}</h2>
            <p className="mt-2 text-xl font-bold text-navy">{locale === "ar" ? usage.plan_name_ar : usage.plan_name_en}</p>
            <p className="mt-1 text-sm text-slate-600">
              {usage.max_listings == null
                ? t("listingsUsedUnlimited", { used: usage.listings_used })
                : t("listingsUsed", { used: usage.listings_used, max: usage.max_listings })}
            </p>
            {usage.max_listings != null && (
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-sky-soft" aria-hidden>
                <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (usage.listings_used / Math.max(1, usage.max_listings)) * 100)}%` }} />
              </div>
            )}
            <Link href="/dashboard/billing" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
              {tn("billing")}
            </Link>
          </Card>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-bold text-navy">{ts("topListings")}</h2>
          {top.length === 0 ? (
            <p className="text-sm text-slate-500">{ts("noData")}</p>
          ) : (
            <ol className="space-y-2">
              {top.map((x) => (
                <li key={x.listing_id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/dashboard/listings/${x.listing_id}/edit`} className="truncate text-navy hover:underline">
                    {titleOf.get(x.listing_id) ?? "—"}
                  </Link>
                  <span className="shrink-0 text-slate-500">{ts("views", { n: nf.format(Number(x.views)) })}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-bold text-navy">{ts("quick")}</h2>
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/listings/new?kind=apartment" className={buttonClass("primary")}>
              <Home className="size-4" aria-hidden />
              {tl("newApartment")}
            </Link>
            <Link href="/dashboard/listings/new?kind=building" className={buttonClass("secondary")}>
              <Building2 className="size-4" aria-hidden />
              {tl("newBuilding")}
            </Link>
            <Link href="/dashboard/import" className={buttonClass("secondary")}>
              <Link2 className="size-4" aria-hidden />
              {tn("import")}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
