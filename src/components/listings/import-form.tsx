"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Download, Loader2 } from "@/components/icons";
import { Link } from "@/i18n/navigation";
import { useFormSubmit } from "@/lib/use-form-submit";
import { Alert, Button, Field, Input, buttonClass } from "@/components/ui";
import { importListingAction, type ImportState } from "@/app/[locale]/dashboard/(app)/import/actions";

export function ImportForm({ disabled }: { disabled?: boolean }) {
  const t = useTranslations("import");
  const locale = useLocale();
  const [state, action, pending] = useActionState<ImportState, FormData>(importListingAction, undefined);
  const onSubmit = useFormSubmit(action);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="locale" value={locale} />
      {state?.error && (
        <Alert>
          <p>{t(`errors.${state.error}` as never)}</p>
          {!["invalid_url", "PLAN_LIMIT_IMPORTS", "PLAN_LIMIT_LISTINGS"].includes(state.error) && (
            <Link href="/dashboard/listings/new?kind=apartment" className={buttonClass("secondary", "mt-3")}>
              {t("manual")}
            </Link>
          )}
        </Alert>
      )}
      <Field label={t("url")} htmlFor="url" hint={t("ownOnly")}>
        <Input id="url" name="url" type="url" inputMode="url" required placeholder="https://" className="ltr-field" disabled={pending} />
      </Field>
      <Button type="submit" disabled={pending || disabled} className="w-full sm:w-auto">
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />}
        {t("submit")}
      </Button>
      {pending && (
        <p className="text-sm text-muted" role="status">
          {t("working")}
        </p>
      )}
    </form>
  );
}
