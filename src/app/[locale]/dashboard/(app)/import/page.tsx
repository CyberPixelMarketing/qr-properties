import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { Card, cn } from "@/components/ui";
import { ImportForm } from "@/components/listings/import-form";

export const maxDuration = 60;

export default async function ImportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase, profile } = await requireUser(locale);
  const t = await getTranslations("import");
  const format = await getFormatter();

  const [{ data: usage }, { data: jobs }] = await Promise.all([
    supabase.rpc("my_plan_usage").single<{ max_imports_per_day: number | null; imports_today: number }>(),
    supabase
      .from("import_jobs")
      .select("id,url,status,error,listing_id,created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const max = usage?.max_imports_per_day ?? null;
  const remaining = max == null ? null : Math.max(0, max - Number(usage?.imports_today ?? 0));

  const tone = { pending: "bg-amber-50 text-amber-700", succeeded: "bg-green-50 text-green-700", failed: "bg-red-50 text-red-700" } as const;
  const label = { pending: t("statusPending"), succeeded: t("statusSucceeded"), failed: t("statusFailed") } as const;

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-navy">{t("title")}</h1>
        <p className="mb-6 mt-2 text-slate-600">{t("subtitle")}</p>
        <ImportForm disabled={remaining === 0} />
        {remaining != null && <p className="mt-4 text-sm text-slate-500">{t("remaining", { n: remaining, max: max! })}</p>}
      </Card>

      {jobs && jobs.length > 0 && (
        <Card>
          <h2 className="mb-3 font-bold text-navy">{t("recent")}</h2>
          <ul className="divide-y divide-slate-100">
            {jobs.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-slate-700" dir="ltr">
                    {j.url}
                  </p>
                  <p className="text-xs text-slate-500">
                    {format.relativeTime(new Date(j.created_at))}
                    {j.error ? ` · ${t(`errors.${j.error}` as never)}` : ""}
                  </p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-xs", tone[j.status as keyof typeof tone])}>
                  {label[j.status as keyof typeof label]}
                </span>
                {j.listing_id && (
                  <Link href={`/dashboard/listings/${j.listing_id}/edit`} className="text-xs font-medium text-brand hover:underline">
                    {t("openDraft")}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
