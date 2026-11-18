"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, X } from "@/components/icons";
import { buttonClass } from "@/components/ui";

/** Figma S80 "QR card" + S80a "QR code sheet". */
export function QrCard({
  slug,
  title,
  body,
  advertiserName,
}: {
  slug: string;
  title: string;
  body: string;
  advertiserName: string;
}) {
  const t = useTranslations("public");
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <section className="flex items-center gap-3.5 rounded-card bg-white p-4 shadow-card">
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-[15px] font-medium leading-[26px] text-ink">{title}</h2>
          <p className="text-[13px] leading-[22px] text-muted">{body}</p>
          <button type="button" onClick={() => setOpen(true)} className="text-[13px] font-semibold leading-[22px] text-brand hover:underline">
            {t("qrShow")}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-lg border border-line bg-white p-1"
          aria-label={t("qrShow")}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/qr/${slug}?size=320`} alt="" className="size-[84px] lg:size-[120px]" loading="lazy" />
        </button>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("qrSheetTitle")}
            className="w-full max-w-sm space-y-4 rounded-t-3xl bg-white p-5 text-center shadow-xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-ink">{t("qrSheetTitle")}</h2>
              <button type="button" onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full bg-page" aria-label={t("close")}>
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="mx-auto w-fit rounded-2xl border border-line p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/qr/${slug}?size=720`} alt={t("qrSheetTitle")} className="size-60" />
            </div>
            <p className="text-[15px] font-medium text-ink">{advertiserName}</p>
            <p className="text-[13px] text-muted">{t("qrCardBody")}</p>
            <a href={`/api/qr/${slug}?format=png&size=1600&download=1`} className={buttonClass("primary", "w-full")}>
              <Download className="size-[18px]" aria-hidden />
              {t("qrDownload")}
            </a>
          </div>
        </div>
      )}
    </>
  );
}
