"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Share2, X } from "lucide-react";
import { waShareHref } from "@/lib/contact";
import { Button, buttonClass, cn } from "@/components/ui";
import { WhatsAppIcon } from "./contact-buttons";

/** Web Share API on phones; copy-link + WhatsApp sheet everywhere else. */
export function ShareButton({
  url,
  title,
  text,
  variant = "secondary",
  className,
}: {
  url: string;
  title: string;
  text?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const t = useTranslations("public");
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const shareUrl = url.includes("?") ? `${url}&src=share` : `${url}?src=share`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector<HTMLElement>("a,button")?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function onShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (e) {
        if ((e as Error)?.name === "AbortError") return;
      }
    }
    setOpen(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <Button type="button" variant={variant} onClick={onShare} className={className}>
        <Share2 className="size-4" aria-hidden />
        {t("share")}
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setOpen(false)}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("shareTitle")}
            className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-navy">{t("shareTitle")}</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label={t("close")}>
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <p className="truncate rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600" dir="ltr">
              {shareUrl}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={copy} className={buttonClass("secondary")}>
                {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {copied ? t("copied") : t("copyLink")}
              </button>
              <a
                href={waShareHref(`${title}\n${shareUrl}`)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonClass("whatsapp"))}
              >
                <WhatsAppIcon className="size-4" />
                {t("whatsapp")}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
