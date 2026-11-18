"use client";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Building2, LayoutDashboard, UserRound } from "lucide-react";
import { cn } from "@/components/ui";

// Items are added here as each phase ships (listings, QR, import, billing, admin).
const items = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/dashboard/listings", key: "listings", icon: Building2 },
  { href: "/dashboard/profile", key: "profile", icon: UserRound },
] as const;

export function DashboardNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col" aria-label={t("dashboard")}>
      {items.map(({ href, key, icon: Icon }) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
              active ? "bg-brand text-white" : "text-navy hover:bg-sky-soft",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t(key)}
          </Link>
        );
      })}
    </nav>
  );
}
