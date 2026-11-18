import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireUser, publicStorageUrl, type CredentialLink } from "@/lib/auth";
import { SITE_URL } from "@/lib/env";
import { Card } from "@/components/ui";
import { ProfileForm } from "@/components/dashboard/profile-form";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { supabase, profile } = await requireUser(locale);
  const t = await getTranslations("profile");
  const { data: creds } = await supabase
    .from("credential_links")
    .select("id,label,url,sort_order")
    .eq("profile_id", profile.id)
    .order("sort_order")
    .returns<CredentialLink[]>();

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold text-navy">{t("title")}</h1>
      <ProfileForm
        profile={profile}
        credentials={creds ?? []}
        logoUrl={publicStorageUrl("avatars", profile.logo_path)}
        siteUrl={SITE_URL}
      />
    </Card>
  );
}
