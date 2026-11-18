import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { LanguageSwitcher } from "./language-switcher";
import { buttonClass } from "./ui";
import { QrCode } from "lucide-react";

export async function SiteHeader() {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-navy">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-white">
            <QrCode className="size-5" aria-hidden />
          </span>
          <span>{t("common.appName")}</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/pricing" className="hidden rounded-lg px-3 py-1.5 text-sm text-navy hover:bg-sky-soft sm:inline">
            {t("nav.pricing")}
          </Link>
          <LanguageSwitcher />
          {user ? (
            <Link href="/dashboard" className={buttonClass("primary", "px-3 py-2")}>
              {t("nav.dashboard")}
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-lg px-3 py-1.5 text-sm text-navy hover:bg-sky-soft sm:inline">
                {t("nav.login")}
              </Link>
              <Link href="/signup" className={buttonClass("primary", "px-3 py-2")}>
                {t("nav.signup")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
