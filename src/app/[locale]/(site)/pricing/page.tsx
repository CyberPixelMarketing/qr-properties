import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonClass, cn } from "@/components/ui";
import { Check } from "@/components/icons";

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pricing");
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("code,name_ar,name_en,price_monthly_aed,price_yearly_aed,max_listings,max_imports_per_day,is_coming_soon,is_default")
    .eq("is_public", true)
    .eq("is_active", true)
    .order("sort_order");

  const fmt = new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE");

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-navy">{t("title")}</h1>
        <p className="mt-3 text-muted">{t("subtitle")}</p>
      </header>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {(plans ?? []).map((p) => (
          <div
            key={p.code}
            className={cn(
              "flex flex-col rounded-card border bg-white p-6 shadow-sm",
              p.is_default ? "border-brand ring-2 ring-brand/20" : "border-line",
            )}
          >
            <h2 className="text-lg font-bold text-navy">{locale === "ar" ? p.name_ar : p.name_en}</h2>
            <div className="mt-3 min-h-14">
              {p.is_coming_soon ? (
                <span className="inline-block rounded-full bg-sky-soft px-3 py-1 text-sm font-medium text-brand">
                  {t("comingSoon")}
                </span>
              ) : Number(p.price_monthly_aed ?? 0) === 0 ? (
                <p className="text-3xl font-bold text-navy">{t("free")}</p>
              ) : (
                <p className="text-3xl font-bold text-navy">
                  {fmt.format(Number(p.price_monthly_aed))} <span className="text-base font-normal">{t("aed")} / {t("monthly")}</span>
                </p>
              )}
            </div>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-text">
              <li className="flex items-center gap-2">
                <Check className="size-4 text-brand" aria-hidden />
                {p.max_listings == null ? t("unlimitedListings") : t("listings", { count: p.max_listings })}
              </li>
              {p.max_imports_per_day != null && (
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-brand" aria-hidden />
                  {t("imports", { count: p.max_imports_per_day })}
                </li>
              )}
            </ul>
            {!p.is_coming_soon && (
              <Link href="/signup" className={buttonClass("primary", "mt-6 w-full")}>
                {t("startFree")}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
