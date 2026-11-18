import { redirect } from "next/navigation";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { DashboardNav, DashboardTabBar } from "@/components/dashboard/dashboard-nav";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { signOutAction } from "@/app/[locale]/(site)/(auth)/actions";
import { CreditCard, Link2, LogOut, Shield } from "@/components/icons";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { profile } = await requireUser(locale);
  if (!profile.onboarded_at) redirect(`/${locale}/dashboard/onboarding`);
  const t = await getTranslations();
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-dvh bg-page pb-24 md:pb-0">
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
            <Link href="/dashboard" aria-label={t("common.appName")}>
              <BrandLogo className="h-6 w-auto" priority />
            </Link>
            <div className="flex items-center gap-0.5">
              {/* Secondary pages reachable on mobile (the tab bar holds the main five) */}
              <Link href="/dashboard/import" className="grid size-10 place-items-center rounded-full text-ink hover:bg-page md:hidden" aria-label={t("nav.import")}>
                <Link2 className="size-5" aria-hidden />
              </Link>
              <Link href="/dashboard/billing" className="grid size-10 place-items-center rounded-full text-ink hover:bg-page md:hidden" aria-label={t("nav.billing")}>
                <CreditCard className="size-5" aria-hidden />
              </Link>
              {profile.role === "admin" && (
                <Link href="/admin" className="grid size-10 place-items-center rounded-full text-ink hover:bg-page md:hidden" aria-label={t("nav.admin")}>
                  <Shield className="size-5" aria-hidden />
                </Link>
              )}
              <LanguageSwitcher />
              <form action={signOutAction}>
                <input type="hidden" name="locale" value={locale} />
                <button className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-ink hover:bg-page" aria-label={t("nav.logout")}>
                  <LogOut className="size-[18px]" aria-hidden />
                  <span className="hidden sm:inline">{t("nav.logout")}</span>
                </button>
              </form>
            </div>
          </div>
        </header>
        <div className="mx-auto grid max-w-6xl gap-5 px-4 py-4 md:grid-cols-[230px_1fr] md:py-6">
          <aside className="hidden md:sticky md:top-20 md:block md:self-start">
            <DashboardNav isAdmin={profile.role === "admin"} />
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
        <DashboardTabBar />
      </div>
    </NextIntlClientProvider>
  );
}
