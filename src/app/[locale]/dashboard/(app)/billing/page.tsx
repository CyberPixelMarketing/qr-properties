import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { Card, cn } from "@/components/ui";

type Usage = {
  plan_code: string;
  plan_name_ar: string;
  plan_name_en: string;
  max_listings: number | null;
  listings_used: number;
  max_imports_per_day: number | null;
  imports_today: number;
};

function Meter({ label, used, max, unlimited }: { label: string; used: number; max: number | null; unlimited: string }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-medium text-navy">
          {used} / {max == null ? unlimited : max}
        </span>
      </div>
      {max != null && (
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sky-soft" aria-hidden>
          <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (used / Math.max(1, max)) * 100)}%` }} />
        </div>
      )}
    </div>
  );
}

export default async function BillingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase } = await requireUser(locale);
  const t = await getTranslations("billing");
  const tp = await getTranslations("pricing");

  const [{ data: usage }, { data: plans }] = await Promise.all([
    supabase.rpc("my_plan_usage").single<Usage>(),
    supabase
      .from("plans")
      .select("code,name_ar,name_en,price_monthly_aed,price_yearly_aed,max_listings,max_imports_per_day,is_coming_soon")
      .eq("is_public", true)
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  const nf = new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE");
  const name = (p: { name_ar: string; name_en: string }) => (locale === "ar" ? p.name_ar : p.name_en);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">{t("title")}</h1>
      {usage && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-muted">{t("current")}</p>
              <p className="text-xl font-bold text-navy">{locale === "ar" ? usage.plan_name_ar : usage.plan_name_en}</p>
            </div>
            <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">{t("active")}</span>
          </div>
          <Meter label={t("listings")} used={Number(usage.listings_used)} max={usage.max_listings} unlimited={t("unlimited")} />
          <Meter label={t("importsToday")} used={Number(usage.imports_today)} max={usage.max_imports_per_day} unlimited={t("unlimited")} />
        </Card>
      )}

      <p className="rounded-xl bg-sky-soft px-4 py-3 text-sm text-navy">{t("note")}</p>

      <div className="grid gap-4 md:grid-cols-3">
        {(plans ?? []).map((p) => {
          const current = p.code === usage?.plan_code;
          return (
            <Card key={p.code} className={cn("flex flex-col", current && "border-brand ring-2 ring-brand/20")}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-navy">{name(p)}</h2>
                {current && <span className="text-xs font-medium text-brand">{t("yourPlan")}</span>}
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {p.is_coming_soon ? (
                  <span className="inline-block rounded-full bg-sky-soft px-3 py-1 font-medium text-brand">{t("comingSoon")}</span>
                ) : Number(p.price_monthly_aed ?? 0) === 0 ? (
                  <p className="text-2xl font-bold text-navy">{t("free")}</p>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-navy">
                      {nf.format(Number(p.price_monthly_aed))} {t("aed")} <span className="text-sm font-normal">{t("perMonth")}</span>
                    </p>
                    {p.price_yearly_aed != null && (
                      <p className="text-muted">
                        {nf.format(Number(p.price_yearly_aed))} {t("aed")} {t("perYear")}
                      </p>
                    )}
                  </>
                )}
              </div>
              <ul className="mt-4 space-y-2 text-sm text-text">
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-brand" aria-hidden />
                  {p.max_listings == null ? tp("unlimitedListings") : tp("listings", { count: p.max_listings })}
                </li>
                {p.max_imports_per_day != null && (
                  <li className="flex items-center gap-2">
                    <Check className="size-4 text-brand" aria-hidden />
                    {tp("imports", { count: p.max_imports_per_day })}
                  </li>
                )}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
