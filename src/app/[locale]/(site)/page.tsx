import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui";
import { MapPin, QrCode, Link2 } from "lucide-react";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  const features = [
    { icon: QrCode, title: t("f1Title"), body: t("f1Body") },
    { icon: MapPin, title: t("f2Title"), body: t("f2Body") },
    { icon: Link2, title: t("f3Title"), body: t("f3Body") },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:py-24">
      <section className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold leading-tight text-navy sm:text-5xl">{t("title")}</h1>
        <p className="mt-5 text-lg text-slate-600">{t("subtitle")}</p>
        <Link href="/signup" className={buttonClass("primary", "mt-8 px-8 py-3 text-base")}>
          {t("cta")}
        </Link>
      </section>
      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-card border border-slate-200 bg-white p-6 shadow-sm">
            <span className="mb-4 grid size-11 place-items-center rounded-xl bg-sky-soft text-brand">
              <Icon className="size-6" aria-hidden />
            </span>
            <h2 className="font-bold text-navy">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
