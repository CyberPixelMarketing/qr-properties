"use client";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Languages } from "@/components/icons";

export function LanguageSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "ar" ? "en" : "ar";
  return (
    <Link
      href={pathname}
      locale={other}
      className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink hover:bg-page"
      hrefLang={other}
    >
      <Languages className="size-[18px]" aria-hidden />
      {t("switchLanguage")}
    </Link>
  );
}
