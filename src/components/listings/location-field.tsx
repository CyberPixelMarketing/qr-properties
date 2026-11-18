"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, MapPin, Search } from "lucide-react";
import { Button, Field, Input } from "@/components/ui";
import { extractLatLng, isGoogleMapsUrl, mapsUrlFor, type LatLng } from "@/lib/maps";

const PinMap = dynamic(() => import("./pin-map"), {
  ssr: false,
  loading: () => <div className="h-80 animate-pulse rounded-xl bg-slate-100" />,
});

export function LocationField({
  initialUrl,
  initialPoint,
  error,
}: {
  initialUrl: string;
  initialPoint: LatLng | null;
  error?: string;
}) {
  const t = useTranslations("listings");
  const tc = useTranslations("common");
  const [url, setUrl] = useState(initialUrl);
  const [point, setPoint] = useState<LatLng | null>(initialPoint);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState<LatLng | null>(initialPoint);

  async function resolve(value = url) {
    setMsg(null);
    const v = value.trim();
    if (!v) return;
    if (!isGoogleMapsUrl(v)) return setMsg("not_google");
    const local = extractLatLng(v);
    if (local) return setPoint(local);
    setBusy(true);
    try {
      const res = await fetch("/api/maps/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: v }),
      });
      const data = await res.json();
      if (res.ok && typeof data.lat === "number") {
        setPoint({ lat: data.lat, lng: data.lng });
      } else {
        setMsg(data.error ?? "fetch_failed");
        if (data.error === "no_coords") setPicking(true);
      }
    } catch {
      setMsg("fetch_failed");
    } finally {
      setBusy(false);
    }
  }

  const confirmPin = () => {
    if (!draft) return;
    setPoint(draft);
    // If no link was given, generate one from the pin so the listing still has a Maps link.
    if (!url.trim() || !isGoogleMapsUrl(url)) setUrl(mapsUrlFor(draft));
    setPicking(false);
    setMsg(null);
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name="maps_url" value={url.trim()} />
      <input type="hidden" name="lat" value={point ? point.lat.toFixed(7) : ""} />
      <input type="hidden" name="lng" value={point ? point.lng.toFixed(7) : ""} />

      <Field label={t("mapsUrl")} htmlFor="maps_url_input" hint={t("mapsHint")} error={error}>
        <div className="flex gap-2">
          <Input
            id="maps_url_input"
            type="url"
            inputMode="url"
            placeholder="https://maps.app.goo.gl/…"
            value={url}
            className="ltr-field"
            onChange={(e) => {
              setUrl(e.target.value);
              setPoint(null);
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (pasted) setTimeout(() => resolve(pasted), 0);
            }}
            onBlur={() => !point && url && resolve()}
            aria-invalid={Boolean(error)}
          />
          <Button type="button" variant="secondary" onClick={() => resolve()} disabled={busy || !url}>
            <Search className="size-4" aria-hidden />
            <span className="hidden sm:inline">{busy ? t("resolving") : t("resolve")}</span>
          </Button>
        </div>
      </Field>

      {msg && <p className="text-sm text-amber-700">{t(`mapsErrors.${msg}` as never)}</p>}

      {point && !picking && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle2 className="size-4" aria-hidden />
            {t("locationFound")}
            <span className="text-slate-500" dir="ltr">
              ({point.lat.toFixed(5)}, {point.lng.toFixed(5)})
            </span>
          </p>
          <PinMap value={point} interactive={false} height={180} />
        </div>
      )}

      {picking ? (
        <div className="space-y-2 rounded-xl border border-blue-200 bg-sky-soft/40 p-3">
          <p className="text-sm text-navy">{t("pickHint")}</p>
          <PinMap value={draft ?? point} onChange={setDraft} />
          <div className="flex gap-2">
            <Button type="button" onClick={confirmPin} disabled={!draft}>
              {t("confirmPin")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setPicking(false)}>
              {tc("cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setDraft(point);
            setPicking(true);
          }}
        >
          <MapPin className="size-4" aria-hidden />
          {t("pickOnMap")}
        </Button>
      )}
    </div>
  );
}
