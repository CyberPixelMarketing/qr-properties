"use client";

import { useFormSubmit } from "@/lib/use-form-submit";
import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Alert, Button, Field, Input, Textarea, cn } from "@/components/ui";
import { saveListingAction, type ListingState } from "@/app/[locale]/dashboard/(app)/listings/actions";
import { ImageManager, type ManagedImage } from "./image-manager";
import { LocationField } from "./location-field";

export type ListingFormValues = {
  id: string;
  kind: "apartment" | "building" | "unit";
  building_id: string | null;
  purpose: "sale" | "rent" | null;
  status: "draft" | "published" | "hidden";
  title: string;
  description: string | null;
  price_aed: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  area_sqft: number | null;
  maps_url: string | null;
  lat: number | null;
  lng: number | null;
  address_text: string | null;
};

function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-2">
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex cursor-pointer items-center justify-center rounded-xl border px-3 py-2.5 text-sm font-medium transition",
            value === o.value ? "border-brand bg-sky-soft text-brand" : "border-slate-300 text-slate-700 hover:border-slate-400",
          )}
        >
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="sr-only"
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

export function ListingForm({
  mode,
  ownerId,
  values,
  images: initialImages,
  buildingName,
}: {
  mode: "create" | "update";
  ownerId: string;
  values: ListingFormValues;
  images: ManagedImage[];
  buildingName?: string | null;
}) {
  const t = useTranslations("listings");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<ListingState, FormData>(saveListingAction, undefined);
  const onSubmit = useFormSubmit(formAction);
  const [purpose, setPurpose] = useState(values.purpose);
  const [images, setImages] = useState<ManagedImage[]>(initialImages);
  const [status, setStatus] = useState(values.status);
  const [uploading, setUploading] = useState(false);

  const isBuilding = values.kind === "building";
  const isUnit = values.kind === "unit";
  const fe = state?.fieldErrors ?? {};
  const err = (k: string) => (fe[k] ? t(`errors.${fe[k]}` as never) : undefined);

  const errorText = state?.error
    ? t(`errors.${state.error}` as never, (state.errorParams ?? {}) as never)
    : null;

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="id" value={values.id} />
      <input type="hidden" name="kind" value={values.kind} />
      <input type="hidden" name="building_id" value={values.building_id ?? ""} />
      <input type="hidden" name="images" value={JSON.stringify(images.map((i) => i.path))} />
      <input type="hidden" name="status" value={status} />

      {errorText && <Alert>{errorText}</Alert>}
      {Object.keys(fe).length > 0 && !errorText && <Alert>{t("errors.generic")}</Alert>}

      {isUnit && buildingName && (
        <Alert tone="info">
          {t("inBuilding", { name: buildingName })} · {t("unitInheritsLocation")}
        </Alert>
      )}

      {/* Basics */}
      <section className="space-y-5">
        {!isBuilding && (
          <Field label={t("purposeLabel")} error={err("purpose")}>
            <Segmented
              name="purpose"
              value={purpose}
              onChange={setPurpose}
              options={[
                { value: "sale", label: t("purpose.sale") },
                { value: "rent", label: t("purpose.rent") },
              ]}
            />
          </Field>
        )}

        <Field label={isBuilding ? t("buildingName") : t("titleLabel")} htmlFor="title" error={err("title")}>
          <Input
            id="title"
            name="title"
            defaultValue={values.title}
            maxLength={200}
            required
            placeholder={isBuilding ? "" : t("titlePlaceholder")}
            aria-invalid={Boolean(fe.title)}
          />
        </Field>

        {!isBuilding && (
          <>
            <Field
              label={purpose === "rent" ? t("pricePerYear") : t("price")}
              htmlFor="price_aed"
              error={err("price_aed")}
            >
              <Input
                id="price_aed"
                name="price_aed"
                inputMode="decimal"
                defaultValue={values.price_aed ?? ""}
                className="ltr-field"
                aria-invalid={Boolean(fe.price_aed)}
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label={t("bedrooms")} htmlFor="bedrooms" error={err("bedrooms")} hint={t("studio") + " = 0"}>
                <Input id="bedrooms" name="bedrooms" inputMode="numeric" defaultValue={values.bedrooms ?? ""} className="ltr-field" />
              </Field>
              <Field label={t("bathrooms")} htmlFor="bathrooms" error={err("bathrooms")}>
                <Input id="bathrooms" name="bathrooms" inputMode="numeric" defaultValue={values.bathrooms ?? ""} className="ltr-field" />
              </Field>
              <Field label={t("area")} htmlFor="area_sqft" error={err("area_sqft")}>
                <Input id="area_sqft" name="area_sqft" inputMode="decimal" defaultValue={values.area_sqft ?? ""} className="ltr-field" />
              </Field>
            </div>
          </>
        )}

        <Field label={t("description")} htmlFor="description" error={err("description")}>
          <Textarea id="description" name="description" rows={5} maxLength={8000} defaultValue={values.description ?? ""} />
        </Field>
      </section>

      {/* Location */}
      {!isUnit && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-navy">{t("location")}</h2>
          <Field label={t("address")} htmlFor="address_text">
            <Input
              id="address_text"
              name="address_text"
              maxLength={300}
              defaultValue={values.address_text ?? ""}
              placeholder={t("addressPlaceholder")}
            />
          </Field>
          <LocationField
            initialUrl={values.maps_url ?? ""}
            initialPoint={values.lat != null && values.lng != null ? { lat: values.lat, lng: values.lng } : null}
            error={err("maps_url")}
          />
        </section>
      )}
      {isUnit && <input type="hidden" name="address_text" value={values.address_text ?? ""} />}

      {/* Images */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-navy">{t("images")}</h2>
        <ImageManager ownerId={ownerId} listingId={values.id} images={images} onChange={setImages} onBusyChange={setUploading} />
      </section>

      {/* Status + submit */}
      <section className="sticky bottom-0 -mx-5 space-y-3 border-t border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <Field label={t("statusLabel")}>
          <Segmented
            name="_status"
            value={status}
            onChange={setStatus}
            options={(["draft", "published", "hidden"] as const).map((s) => ({ value: s, label: t(`status.${s}`) }))}
          />
        </Field>
        <Button type="submit" className="w-full" disabled={pending || uploading}>
          {pending ? tc("saving") : status === "published" ? t("publish") : t("save")}
        </Button>
      </section>
    </form>
  );
}
