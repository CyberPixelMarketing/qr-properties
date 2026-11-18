"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useFormSubmit } from "@/lib/use-form-submit";
import { savePlanAction, type PlanState } from "@/app/[locale]/admin/actions";
import { Button, Card, Field, Input } from "@/components/ui";

export type PlanRow = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  price_monthly_aed: number | null;
  price_yearly_aed: number | null;
  max_listings: number | null;
  max_imports_per_day: number | null;
  is_active: boolean;
  is_public: boolean;
  is_coming_soon: boolean;
  is_default: boolean;
};

export function PlanForm({ plan }: { plan: PlanRow }) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [state, action, pending] = useActionState<PlanState, FormData>(savePlanAction, undefined);
  const onSubmit = useFormSubmit(action);
  const v = (n: number | null) => (n == null ? "" : String(n));
  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" name="id" value={plan.id} />
        <input type="hidden" name="locale" value={locale} />
        <div className="flex items-center justify-between">
          <p className="font-mono text-sm text-muted">
            {t("code")}: {plan.code} {plan.is_default && <span className="ms-2 rounded bg-sky-soft px-1.5 py-0.5 text-xs text-brand">{t("isDefault")}</span>}
          </p>
          {state?.ok && <span className="text-sm text-green-700">{t("saved")}</span>}
          {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="الاسم (عربي)" htmlFor={`ar-${plan.id}`}>
            <Input id={`ar-${plan.id}`} name="name_ar" defaultValue={plan.name_ar} />
          </Field>
          <Field label="Name (English)" htmlFor={`en-${plan.id}`}>
            <Input id={`en-${plan.id}`} name="name_en" defaultValue={plan.name_en} />
          </Field>
          <Field label={t("priceMonthly")} htmlFor={`pm-${plan.id}`} hint="AED">
            <Input id={`pm-${plan.id}`} name="price_monthly_aed" inputMode="decimal" defaultValue={v(plan.price_monthly_aed)} className="ltr-field" />
          </Field>
          <Field label={t("priceYearly")} htmlFor={`py-${plan.id}`} hint="AED">
            <Input id={`py-${plan.id}`} name="price_yearly_aed" inputMode="decimal" defaultValue={v(plan.price_yearly_aed)} className="ltr-field" />
          </Field>
          <Field label={t("maxListings")} htmlFor={`ml-${plan.id}`} hint={t("emptyUnlimited")}>
            <Input id={`ml-${plan.id}`} name="max_listings" inputMode="numeric" defaultValue={v(plan.max_listings)} className="ltr-field" />
          </Field>
          <Field label={t("maxImports")} htmlFor={`mi-${plan.id}`} hint={t("emptyUnlimited")}>
            <Input id={`mi-${plan.id}`} name="max_imports_per_day" inputMode="numeric" defaultValue={v(plan.max_imports_per_day)} className="ltr-field" />
          </Field>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          {(
            [
              ["is_active", t("isActive"), plan.is_active],
              ["is_public", t("isPublic"), plan.is_public],
              ["is_coming_soon", t("comingSoon"), plan.is_coming_soon],
            ] as const
          ).map(([name, label, checked]) => (
            <label key={name} className="inline-flex items-center gap-2">
              <input type="checkbox" name={name} defaultChecked={checked} className="size-4 accent-brand" />
              {label}
            </label>
          ))}
        </div>
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
      </form>
    </Card>
  );
}
