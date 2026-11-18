"use client";

import { useFormSubmit } from "@/lib/use-form-submit";
import { useActionState, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { ImagePlus, Plus, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Alert, Button, Field, Input, Textarea, cn } from "@/components/ui";
import { saveProfileAction, type ProfileState } from "@/app/[locale]/dashboard/actions";
import type { CredentialLink, Profile } from "@/lib/auth";

type Cred = { key: string; label: string; url: string };
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

function toSlug(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/^-|-$/g, "");
}

export function ProfileForm({
  profile,
  credentials,
  logoUrl,
  siteUrl,
  onboarding = false,
}: {
  profile: Profile;
  credentials: CredentialLink[];
  logoUrl: string | null;
  siteUrl: string;
  onboarding?: boolean;
}) {
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const ta = useTranslations("auth");
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(saveProfileAction, undefined);
  const onSubmit = useFormSubmit(formAction);

  const [accountType, setAccountType] = useState(profile.account_type ?? "office");
  const [slug, setSlug] = useState(profile.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(profile.slug));
  const [slugStatus, setSlugStatus] = useState<"idle" | "ok" | "taken" | "invalid">("idle");
  const [logoPath, setLogoPath] = useState(profile.logo_path ?? "");
  const [logoPreview, setLogoPreview] = useState<string | null>(logoUrl);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);
  const [creds, setCreds] = useState<Cred[]>(() =>
    credentials.map((c) => ({ key: c.id, label: c.label, url: c.url })),
  );
  const fileRef = useRef<HTMLInputElement>(null);

  // Debounced slug availability check.
  useEffect(() => {
    if (!slug) return setSlugStatus("idle");
    if (!SLUG_RE.test(slug)) return setSlugStatus("invalid");
    const id = setTimeout(async () => {
      const { data } = await createClient().rpc("is_slug_available", { p_slug: slug });
      setSlugStatus(data ? "ok" : "taken");
    }, 400);
    return () => clearTimeout(id);
  }, [slug]);

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(false);
    if (file.size > 2 * 1024 * 1024 || !/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) {
      setUploadError(true);
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${profile.id}/logo-${Date.now()}.${ext}`;
    const { error } = await createClient().storage.from("avatars").upload(path, file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: file.type,
    });
    setUploading(false);
    if (error) return setUploadError(true);
    setLogoPath(path);
    setLogoPreview(URL.createObjectURL(file));
  }

  const fe = state?.fieldErrors ?? {};
  const err = (key: string) => {
    const code = fe[key];
    if (!code) return undefined;
    if (t.has(code as never)) return t(code as never);
    if (ta.has(code as never)) return ta(code as never);
    return tc("error");
  };

  const slugMessage =
    err("slug") ??
    (slugStatus === "taken" ? t("slugTaken") : slugStatus === "invalid" ? t("slugInvalid") : undefined);

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="onboarding" value={onboarding ? "1" : "0"} />
      <input type="hidden" name="logo_path" value={logoPath} />
      <input
        type="hidden"
        name="credentials"
        value={JSON.stringify(
          creds.filter((c) => c.label.trim() || c.url.trim()).map(({ label, url }) => ({ label, url })),
        )}
      />

      {state?.error && <Alert>{tc("error")}</Alert>}
      {state?.ok && <Alert tone="success">{tc("saved")}</Alert>}

      {/* Account type */}
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-navy">{t("accountType")}</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["office", "individual"] as const).map((v) => (
            <label
              key={v}
              className={cn(
                "flex cursor-pointer items-center justify-center rounded-xl border px-4 py-3 text-sm font-medium transition",
                accountType === v ? "border-brand bg-sky-soft text-brand" : "border-slate-300 text-slate-700",
              )}
            >
              <input
                type="radio"
                name="account_type"
                value={v}
                checked={accountType === v}
                onChange={() => setAccountType(v)}
                className="sr-only"
              />
              {t(v)}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Logo */}
      <Field label={t("logo")} error={uploadError ? t("uploadFailed") : undefined}>
        <div className="flex items-center gap-4">
          <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-sky-soft">
            {logoPreview ? (
              <Image src={logoPreview} alt="" fill sizes="80px" className="object-cover" unoptimized />
            ) : (
              <ImagePlus className="size-7 text-brand" aria-hidden />
            )}
          </div>
          <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? tc("loading") : logoPreview ? t("changeLogo") : t("uploadLogo")}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={onLogoChange}
          />
        </div>
      </Field>

      <Field
        label={accountType === "office" ? t("displayNameOffice") : t("displayNameIndividual")}
        htmlFor="display_name"
        error={err("display_name")}
      >
        <Input
          id="display_name"
          name="display_name"
          defaultValue={profile.display_name ?? ""}
          required
          maxLength={120}
          aria-invalid={Boolean(fe.display_name)}
          onChange={(e) => {
            if (!slugTouched) setSlug(toSlug(e.target.value));
          }}
        />
      </Field>

      <Field
        label={t("slug")}
        htmlFor="slug"
        error={slugMessage}
        hint={
          slugStatus === "ok" ? (
            <span className="inline-flex items-center gap-1 text-green-700">
              <CheckCircle2 className="size-3.5" aria-hidden /> {t("slugAvailable")}
            </span>
          ) : (
            t("slugHint")
          )
        }
      >
        <div className="flex items-stretch overflow-hidden rounded-xl border border-slate-300 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20" dir="ltr">
          <span className="flex items-center bg-slate-50 px-3 text-sm text-slate-500">{siteUrl.replace(/^https?:\/\//, "")}/a/</span>
          <input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
            }}
            required
            maxLength={40}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="min-w-0 flex-1 px-3 py-2.5 text-base outline-none"
            aria-invalid={Boolean(slugMessage)}
          />
        </div>
      </Field>
      {profile.onboarded_at && profile.slug && slug !== profile.slug && (
        <p className="-mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("slugWarning")}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("phone")} htmlFor="phone" error={err("phone")}>
          <Input id="phone" name="phone" type="tel" inputMode="tel" placeholder="+971 50 000 0000" defaultValue={profile.phone ?? ""} className="ltr-field" aria-invalid={Boolean(fe.phone)} />
        </Field>
        <Field label={t("whatsapp")} htmlFor="whatsapp" error={err("whatsapp")}>
          <Input id="whatsapp" name="whatsapp" type="tel" inputMode="tel" placeholder="+971 50 000 0000" defaultValue={profile.whatsapp ?? ""} className="ltr-field" aria-invalid={Boolean(fe.whatsapp)} />
        </Field>
      </div>

      <Field label={t("contactEmail")} htmlFor="contact_email" error={err("contact_email")}>
        <Input id="contact_email" name="contact_email" type="email" defaultValue={profile.contact_email ?? ""} className="ltr-field" aria-invalid={Boolean(fe.contact_email)} />
      </Field>

      <Field label={t("bio")} htmlFor="bio" error={err("bio")}>
        <Textarea id="bio" name="bio" maxLength={600} defaultValue={profile.bio ?? ""} />
      </Field>

      {/* Credential links */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-navy">{t("credentials")}</legend>
        <p className="text-xs text-slate-500">{t("credentialsHint")}</p>
        {creds.map((c, i) => (
          <div key={c.key} className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_2fr_auto]">
            <Input
              aria-label={t("credentialLabel")}
              placeholder={t("credentialLabel")}
              value={c.label}
              maxLength={80}
              onChange={(e) => setCreds((xs) => xs.map((x) => (x.key === c.key ? { ...x, label: e.target.value } : x)))}
              aria-invalid={Boolean(fe[`credentials.${i}.label`])}
            />
            <Input
              aria-label={t("credentialUrl")}
              placeholder="https://"
              value={c.url}
              type="url"
              className="ltr-field"
              onChange={(e) => setCreds((xs) => xs.map((x) => (x.key === c.key ? { ...x, url: e.target.value } : x)))}
              aria-invalid={Boolean(fe[`credentials.${i}.url`])}
            />
            <Button
              type="button"
              variant="danger"
              aria-label={tc("remove")}
              onClick={() => setCreds((xs) => xs.filter((x) => x.key !== c.key))}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
            {(fe[`credentials.${i}.label`] || fe[`credentials.${i}.url`]) && (
              <p className="text-sm text-red-600 sm:col-span-3">
                {err(`credentials.${i}.url`) ?? err(`credentials.${i}.label`)}
              </p>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          onClick={() => setCreds((xs) => [...xs, { key: crypto.randomUUID(), label: "", url: "" }])}
        >
          <Plus className="size-4" aria-hidden />
          {t("addCredential")}
        </Button>
      </fieldset>

      <Button type="submit" className="w-full sm:w-auto" disabled={pending || uploading || slugStatus === "taken"}>
        {pending ? tc("saving") : onboarding ? t("finish") : tc("save")}
      </Button>
    </form>
  );
}
