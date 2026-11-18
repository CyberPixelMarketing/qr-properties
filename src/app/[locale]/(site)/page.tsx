import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonClass } from "@/components/ui";
import { Link2, MapPin, QrCode } from "@/components/icons";

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
    <div>
      {/* Hero: white panel with rounded bottom (Figma S10 "Hero") */}
      <section className="rounded-b-[23px] bg-white">
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-8 text-center sm:pb-16 sm:pt-14">
          <h1 className="text-[27px] font-bold leading-[38px] text-ink sm:text-5xl sm:leading-[1.25]">{t("title")}</h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-[26px] text-muted sm:text-lg">{t("subtitle")}</p>
          <Link href="/signup" className={buttonClass("primary", "mt-8 min-h-12 px-8 text-[15px]")}>
            {t("cta")}
          </Link>
        </div>
      </section>
      <section className="mx-auto grid max-w-5xl gap-3 px-4 py-8 sm:grid-cols-3 sm:py-12">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="flex flex-col items-center gap-2 rounded-card bg-white px-4 py-6 text-center">
            <span className="grid size-[46px] place-items-center rounded-full bg-sky-soft text-brand">
              <Icon className="size-[22px]" aria-hidden />
            </span>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <p className="text-[13px] leading-[22px] text-muted">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
