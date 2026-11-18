import { getTranslations } from "next-intl/server";
import { BadgeCheck, ExternalLink } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { PublicProfile } from "@/lib/public-data";
import { ContactButtons } from "./contact-buttons";
import { ShareButton } from "./share-button";
import type { Advertiser } from "./types";

export async function AdvertiserHeader({
  profile,
  links,
  advertiser,
  pageUrl,
}: {
  profile: PublicProfile;
  links: { id: string; label: string; url: string }[];
  advertiser: Advertiser;
  pageUrl: string;
}) {
  const t = await getTranslations("public");
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto max-w-6xl px-4 pb-6 pt-3">
        <div className="flex justify-end [&_a]:text-white [&_a:hover]:bg-white/10">
          <LanguageSwitcher />
        </div>
        <div className="flex items-start gap-4">
          <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white sm:size-24">
            {advertiser.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={advertiser.logoUrl} alt={profile.display_name} className="size-full object-contain" />
            ) : (
              <span className="text-3xl font-bold text-navy">{profile.display_name.slice(0, 1)}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{profile.display_name}</h1>
            {profile.bio && <p className="mt-1.5 text-sm leading-relaxed text-blue-100 sm:text-base">{profile.bio}</p>}
          </div>
        </div>

        {links.length > 0 && (
          <div className="mt-4">
            <p className="sr-only">{t("verified")}</p>
            <ul className="flex flex-wrap gap-2">
              {links.map((l) => (
                <li key={l.id}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 hover:bg-white/20"
                  >
                    <BadgeCheck className="size-3.5 text-accent" aria-hidden />
                    {l.label}
                    <ExternalLink className="size-3 opacity-70" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2 [&_a.bg-sky-soft]:bg-white [&_button.bg-sky-soft]:bg-white">
          <ContactButtons advertiser={advertiser} />
          <ShareButton url={pageUrl} title={t("allProperties", { name: profile.display_name })} />
        </div>
      </div>
    </header>
  );
}
