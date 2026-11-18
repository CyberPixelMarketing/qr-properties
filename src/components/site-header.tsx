import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { LanguageSwitcher } from "./language-switcher";
import { BrandLogo } from "./brand-logo";
import { buttonClass } from "./ui";

export async function SiteHeader() {
  const t = await getTranslations();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" aria-label={t("common.appName")}>
          <BrandLogo className="h-7 w-auto" priority />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link href="/pricing" className="hidden rounded-xl px-3 py-2 text-[13px] font-semibold text-ink hover:bg-page sm:inline">
            {t("nav.pricing")}
          </Link>
          <LanguageSwitcher />
          {user ? (
            <Link href="/dashboard" className={buttonClass("primary", "px-4")}>
              {t("nav.dashboard")}
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden rounded-xl px-3 py-2 text-[13px] font-semibold text-ink hover:bg-page sm:inline">
                {t("nav.login")}
              </Link>
              <Link href="/signup" className={buttonClass("primary", "px-3.5")}>
                {t("nav.signup")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
