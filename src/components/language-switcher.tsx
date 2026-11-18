"use client";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Languages } from "lucide-react";

export function LanguageSwitcher() {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "ar" ? "en" : "ar";
  return (
    <Link
      href={pathname}
      locale={other}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-navy hover:bg-sky-soft"
      hrefLang={other}
    >
      <Languages className="size-4" aria-hidden />
      {t("switchLanguage")}
    </Link>
  );
}
