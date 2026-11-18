"use client";

import { useTranslations } from "next-intl";
import { Mail, Phone } from "lucide-react";
import { telHref, waHref } from "@/lib/contact";
import { buttonClass, cn } from "@/components/ui";
import type { Advertiser } from "./types";

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.13c-.24.68-1.42 1.31-1.96 1.36-.5.05-1.13.24-3.8-.79-3.2-1.26-5.23-4.53-5.39-4.74-.16-.21-1.29-1.72-1.29-3.28s.82-2.33 1.11-2.65c.29-.32.63-.4.84-.4l.6.01c.19.01.45-.07.71.54.26.63.89 2.18.97 2.34.08.16.13.34.03.55-.11.21-.16.34-.32.53-.16.18-.33.41-.47.55-.16.16-.32.33-.14.65.18.32.82 1.35 1.76 2.19 1.21 1.08 2.23 1.41 2.55 1.57.32.16.5.13.68-.08.18-.21.79-.92 1-1.24.21-.32.42-.26.71-.16.29.11 1.84.87 2.16 1.03.32.16.53.24.6.37.08.13.08.76-.16 1.44z" />
    </svg>
  );
}

export function ContactButtons({
  advertiser,
  waText,
  compact = false,
  className,
}: {
  advertiser: Advertiser;
  waText?: string;
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("public");
  const pad = compact ? "px-3 py-2" : "px-4 py-2.5";
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {advertiser.phone && (
        <a href={telHref(advertiser.phone)} className={buttonClass("secondary", pad)}>
          <Phone className="size-4" aria-hidden />
          {t("call")}
        </a>
      )}
      {advertiser.whatsapp && (
        <a href={waHref(advertiser.whatsapp, waText)} target="_blank" rel="noopener noreferrer" className={buttonClass("whatsapp", pad)}>
          <WhatsAppIcon className="size-4" />
          {t("whatsapp")}
        </a>
      )}
      {advertiser.email && (
        <a href={`mailto:${advertiser.email}`} className={buttonClass("secondary", pad)}>
          <Mail className="size-4" aria-hidden />
          {t("email")}
        </a>
      )}
    </div>
  );
}
