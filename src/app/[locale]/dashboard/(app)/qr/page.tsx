import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle, Download, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { qrTargetUrl } from "@/lib/qr";
import { buttonClass, Card } from "@/components/ui";

export default async function QrPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { profile } = await requireUser(locale);
  const t = await getTranslations("qr");
  const slug = profile.slug!;
  const temporaryDomain = /\.vercel\.app$|localhost/.test(new URL(SITE_URL).hostname);

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-navy">{t("title")}</h1>
      <p className="mt-2 text-slate-600">{t("subtitle")}</p>
      {temporaryDomain && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("domainWarning")}
        </p>
      )}
      <div className="mt-6 grid items-center gap-6 sm:grid-cols-[260px_1fr]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/qr/${slug}?size=780`} alt={t("title")} className="mx-auto aspect-square w-64 rounded-2xl border border-slate-200 bg-white p-3" />
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-500">{t("target")}</p>
            <p className="break-all font-medium text-navy" dir="ltr">
              {qrTargetUrl(slug)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/qr/${slug}?format=png&size=2048&download=1`} className={buttonClass("primary")}>
              <Download className="size-4" aria-hidden />
              {t("downloadPng")}
            </a>
            <a href={`/api/qr/${slug}?format=svg&download=1`} className={buttonClass("secondary")}>
              <Download className="size-4" aria-hidden />
              {t("downloadSvg")}
            </a>
            <a href={`/${locale}/a/${slug}`} target="_blank" rel="noopener" className={buttonClass("ghost")}>
              <ExternalLink className="size-4" aria-hidden />
              {t("openPage")}
            </a>
          </div>
        </div>
      </div>
    </Card>
  );
}
