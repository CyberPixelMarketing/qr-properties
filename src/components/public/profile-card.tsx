import { getFormatter, getTranslations } from "next-intl/server";
import { BadgeCheck, Building2, Person } from "@/components/icons";
import type { PublicProfile } from "@/lib/public-data";
import { ContactButtons } from "./contact-buttons";
import type { Advertiser } from "./types";

/** Figma S80 "Profile card": avatar, name, type · member since, credential pills, stats, contact. */
export async function ProfileCard({
  profile,
  links,
  advertiser,
  stats,
}: {
  profile: PublicProfile;
  links: { id: string; label: string; url: string }[];
  advertiser: Advertiser;
  stats: { rent: number; sale: number; active: number };
}) {
  const t = await getTranslations("public");
  const format = await getFormatter();
  const since = format.dateTime(new Date(profile.created_at), { month: "long", year: "numeric" });
  const AvatarIcon = profile.account_type === "office" ? Building2 : Person;

  return (
    <section className="space-y-3.5 rounded-card bg-white p-4 shadow-card">
      <div className="flex items-center gap-3">
        <div className="grid size-[58px] shrink-0 place-items-center overflow-hidden rounded-full bg-brand text-white">
          {advertiser.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={advertiser.logoUrl} alt={profile.display_name} className="size-full bg-white object-contain" />
          ) : (
            <AvatarIcon className="size-[26px]" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <h1 className="text-[17px] font-semibold leading-7 text-ink">{profile.display_name}</h1>
          <p className="text-[13px] leading-[22px] text-muted">
            {profile.account_type === "office" ? t("officeType") : t("individualType")} · {t("memberSince", { date: since })}
          </p>
        </div>
      </div>

      {profile.bio && <p className="text-[13px] leading-[22px] text-text">{profile.bio}</p>}

      {links.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={t("verified")}>
          {links.map((l) => (
            <li key={l.id}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium leading-[18px] text-success hover:underline"
              >
                <BadgeCheck className="size-3" aria-hidden />
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      )}

      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          { n: stats.active, label: t("statActive") },
          { n: stats.sale, label: t("statSale") },
          { n: stats.rent, label: t("statRent") },
        ].map((s) => (
          <div key={s.label} className="flex flex-col-reverse rounded-xl bg-page py-2.5">
            <dt className="text-[11px] font-medium leading-[18px] text-muted">{s.label}</dt>
            <dd className="text-xl font-bold leading-8 text-brand">{s.n}</dd>
          </div>
        ))}
      </dl>

      <ContactButtons advertiser={advertiser} />
    </section>
  );
}
