import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  Shield,
  Users,
} from "@/components/icons";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Card } from "@/components/ui";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { profile } = await requireUser(locale);
  const t = await getTranslations("admin");
  const tn = await getTranslations("nav");
  const messages = await getMessages();

  if (profile.role !== "admin" || profile.is_suspended) {
    return (
      <main className="grid min-h-dvh place-items-center bg-page p-4">
        <Card className="max-w-sm text-center">
          <Shield className="mx-auto mb-3 size-8 text-subtle" aria-hidden />
          <p className="text-text">{t("notAdmin")}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm font-medium text-brand hover:underline"
          >
            {tn("dashboard")}
          </Link>
        </Card>
      </main>
    );
  }

  const items = [
    { href: "/admin/users", label: t("users"), icon: Users },
    { href: "/admin/listings", label: t("listings"), icon: Building2 },
    { href: "/admin/plans", label: t("plans"), icon: CreditCard },
  ];
  return (
    <NextIntlClientProvider messages={messages}>
      <div className="min-h-dvh bg-page">
        <header className="bg-navy text-white">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <span className="flex items-center gap-2 font-bold">
              <Shield className="size-5" aria-hidden /> {t("title")}
            </span>
            <div className="flex items-center gap-1 [&_a]:text-white [&_a:hover]:bg-white/10">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm"
              >
                <LayoutDashboard className="size-4" aria-hidden />
                <span className="hidden sm:inline">{tn("dashboard")}</span>
              </Link>
              <LanguageSwitcher />
            </div>
          </div>
        </header>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pt-4">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-navy ring-1 ring-line hover:bg-sky-soft"
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto max-w-6xl px-4 py-5">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
