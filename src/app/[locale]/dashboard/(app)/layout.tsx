import { redirect } from "next/navigation";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { signOutAction } from "@/app/[locale]/(site)/(auth)/actions";
import { LogOut, QrCode } from "lucide-react";

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
      <div className="min-h-dvh bg-slate-50">
        <header className="border-b border-slate-200 bg-navy text-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-bold"
            >
              <QrCode className="size-5" aria-hidden />
              {t("common.appName")}
            </Link>
            <div className="flex items-center gap-1 [&_a]:text-white [&_a:hover]:bg-white/10">
              <LanguageSwitcher />
              <form action={signOutAction}>
                <input type="hidden" name="locale" value={locale} />
                <button className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm hover:bg-white/10">
                  <LogOut className="size-4" aria-hidden />
                  <span className="hidden sm:inline">{t("nav.logout")}</span>
                </button>
              </form>
            </div>
          </div>
        </header>
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
          <aside className="md:sticky md:top-6 md:self-start">
            <DashboardNav isAdmin={profile.role === "admin"} />
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </NextIntlClientProvider>
  );
}
