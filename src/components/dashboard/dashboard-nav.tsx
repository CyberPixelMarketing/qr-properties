"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Building2, CreditCard, Home, Link2, LayoutDashboard, Plus, QrCode, Shield, UserRound } from "@/components/icons";
import { cn } from "@/components/ui";

const items = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/dashboard/listings", key: "listings", icon: Building2 },
  { href: "/dashboard/import", key: "import", icon: Link2 },
  { href: "/dashboard/qr", key: "qr", icon: QrCode },
  { href: "/dashboard/profile", key: "profile", icon: UserRound },
  { href: "/dashboard/billing", key: "billing", icon: CreditCard },
] as const;

function useActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));
}

/** Desktop sidebar. */
export function DashboardNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const t = useTranslations("nav");
  const isActive = useActive();
  return (
    <nav className="flex flex-col gap-1 rounded-card bg-white p-2 shadow-card" aria-label={t("dashboard")}>
      {items.map(({ href, key, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition",
              active ? "bg-sky-soft text-brand" : "text-ink hover:bg-page",
            )}
          >
            <Icon className="size-[19px]" aria-hidden />
            {t(key)}
          </Link>
        );
      })}
      {isAdmin && (
        <Link href="/admin" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-ink hover:bg-page">
          <Shield className="size-[19px]" aria-hidden />
          {t("admin")}
        </Link>
      )}
    </nav>
  );
}

/** Mobile bottom tab bar (Figma S10 "Tab bar") with the centre "add listing" button. */
export function DashboardTabBar() {
  const t = useTranslations("nav");
  const tl = useTranslations("listings");
  const isActive = useActive();
  const tab = (href: string, label: string, Icon: typeof Home) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn("flex flex-1 flex-col items-center gap-0.5 py-1 text-[11px] font-medium", active ? "text-brand" : "text-muted")}
      >
        <Icon className="size-[21px]" aria-hidden />
        {label}
      </Link>
    );
  };
  return (
    <nav
      aria-label={t("dashboard")}
      className="fixed inset-x-0 bottom-0 z-40 flex items-end border-t border-line bg-white px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 md:hidden"
    >
      {tab("/dashboard", t("home"), Home)}
      {tab("/dashboard/listings", t("listings"), Building2)}
      <Link href="/dashboard/listings/new?kind=apartment" className="-mt-5 flex flex-1 flex-col items-center gap-0.5 text-[11px] font-medium text-text">
        <span className="grid size-[46px] place-items-center rounded-full bg-brand text-white shadow-[0_4px_10px_rgb(41_125_191/0.35)]">
          <Plus className="size-6" aria-hidden />
        </span>
        {tl("newApartment")}
      </Link>
      {tab("/dashboard/qr", t("qr"), QrCode)}
      {tab("/dashboard/profile", t("profile"), UserRound)}
    </nav>
  );
}
