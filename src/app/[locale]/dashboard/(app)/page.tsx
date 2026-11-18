import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { Card } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";

export default async function DashboardHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase, profile } = await requireUser(locale);
  const t = await getTranslations("dashboard");

  const { data: usage } = await supabase.rpc("my_plan_usage").single<{
    plan_name_ar: string;
    plan_name_en: string;
    max_listings: number | null;
    listings_used: number;
  }>();

  const publicUrl = `${SITE_URL}/a/${profile.slug}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-navy">{t("welcome", { name: profile.display_name ?? "" })}</h1>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-sm font-medium text-slate-500">{t("publicPage")}</h2>
          <p className="mt-2 break-all font-medium text-navy" dir="ltr">
            {publicUrl}
          </p>
          <div className="mt-4">
            <CopyButton text={publicUrl} />
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
                <div
                  className="h-full rounded-full bg-brand"
                  style={{ width: `${Math.min(100, (usage.listings_used / Math.max(1, usage.max_listings)) * 100)}%` }}
                />
              </div>
            )}
          </Card>
        )}
      </div>
      <p className="text-sm text-slate-500">{t("comingNext")}</p>
    </div>
  );
}
