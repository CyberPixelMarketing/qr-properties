"use client";

import { useTranslations } from "next-intl";
import { Mail, Phone, WhatsApp } from "@/components/icons";
import { telHref, waHref } from "@/lib/contact";
import { buttonClass, cn } from "@/components/ui";
import type { Advertiser } from "./types";

export function WhatsAppIcon({ className }: { className?: string }) {
  return <WhatsApp className={className} aria-hidden />;
}

/**
 * Alfareej contact buttons: WhatsApp (green) + Call (outline / secondary), optional email.
 * `variant="bar"` mirrors the details bottom bar (WhatsApp + secondary Call, equal widths).
 */
export function ContactButtons({
  advertiser,
  waText,
  variant = "card",
  showEmail = true,
  className,
}: {
  advertiser: Advertiser;
  waText?: string;
  variant?: "card" | "bar";
  showEmail?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("public");
  return (
    <div className={cn("flex gap-2.5", className)}>
      {advertiser.whatsapp && (
        <a
          href={waHref(advertiser.whatsapp, waText)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass("whatsapp", "min-w-0 flex-1")}
        >
          <WhatsApp className="size-[18px]" aria-hidden />
          {t("whatsapp")}
        </a>
      )}
      {advertiser.phone && (
        <a href={telHref(advertiser.phone)} className={buttonClass(variant === "bar" ? "secondary" : "outline", "min-w-0 flex-1")}>
          <Phone className="size-[18px]" aria-hidden />
          {t("call")}
        </a>
      )}
      {showEmail && advertiser.email && (
        <a
          href={`mailto:${advertiser.email}`}
          className={buttonClass("outline", "w-11 shrink-0 px-0")}
          aria-label={t("email")}
          title={t("email")}
        >
          <Mail className="size-5" aria-hidden />
        </a>
      )}
    </div>
  );
}
