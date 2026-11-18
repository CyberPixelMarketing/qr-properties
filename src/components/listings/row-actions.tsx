"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Link2, Trash2 } from "lucide-react";
import { deleteListingAction } from "@/app/[locale]/dashboard/(app)/listings/actions";
import { Button } from "@/components/ui";

export function CopyLinkButton({ url }: { url: string }) {
  const t = useTranslations("listings");
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      className="px-2.5 py-2"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      aria-label={t("copyLink")}
      title={t("copyLink")}
    >
      {done ? <Check className="size-4 text-green-600" aria-hidden /> : <Link2 className="size-4" aria-hidden />}
    </Button>
  );
}

export function DeleteListingButton({ id, isBuilding }: { id: string; isBuilding: boolean }) {
  const t = useTranslations("listings");
  const locale = useLocale();
  return (
    <form
      action={deleteListingAction}
      onSubmit={(e) => {
        if (!confirm(isBuilding ? t("deleteBuildingConfirm") : t("deleteConfirm"))) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" variant="ghost" className="px-2.5 py-2 text-red-600 hover:bg-red-50" aria-label={t("delete")} title={t("delete")}>
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </form>
  );
}
