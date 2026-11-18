import { redirect } from "next/navigation";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { requireUser, publicStorageUrl } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { Card } from "@/components/ui";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { profile } = await requireUser(locale);
  if (profile.onboarded_at) redirect(`/${locale}/dashboard`);
  const t = await getTranslations("profile");
  const messages = await getMessages();

  return (
    <main className="min-h-dvh bg-sky-soft/60 px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <Card className="p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-navy">
            {t("onboardingTitle")}
          </h1>
          <p className="mb-6 mt-2 text-muted">{t("onboardingSubtitle")}</p>
          <NextIntlClientProvider messages={messages}>
            <ProfileForm
              profile={profile}
              credentials={[]}
              logoUrl={publicStorageUrl("avatars", profile.logo_path)}
              siteUrl={SITE_URL}
              onboarding
            />
          </NextIntlClientProvider>
        </Card>
      </div>
    </main>
  );
}
