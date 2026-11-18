"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, ImagePlus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button, cn } from "@/components/ui";

export type ManagedImage = { path: string; url: string };

const MAX_EDGE = 1920;

/** Resize + re-encode to WebP in the browser so uploads stay small and pages stay fast. */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.82));
  return blob ?? file;
}

export function ImageManager({
  ownerId,
  listingId,
  images,
  onChange,
  onBusyChange,
}: {
  ownerId: string;
  listingId: string;
  images: ManagedImage[];
  onChange: (next: ManagedImage[]) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const t = useTranslations("listings");
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(false);
    const list = Array.from(files).filter((f) => /^image\/(jpeg|png|webp|heic|heif)$/.test(f.type) || f.type === "");
    const supabase = createClient();
    const added: ManagedImage[] = [];
    setProgress({ done: 0, total: list.length });
    onBusyChange?.(true);
    for (const [i, file] of list.entries()) {
      try {
        const blob = await compress(file);
        const ext = blob.type === "image/webp" ? "webp" : (file.name.split(".").pop() ?? "jpg").toLowerCase();
        const path = `${ownerId}/${listingId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("listing-images")
          .upload(path, blob, { contentType: blob.type || file.type, cacheControl: "31536000" });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
        added.push({ path, url: data.publicUrl });
      } catch {
        setError(true);
      }
      setProgress({ done: i + 1, total: list.length });
    }
    onChange([...images, ...added]);
    setProgress(null);
    onBusyChange?.(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <div key={img.path} className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="size-full object-cover" loading="lazy" />
            {i === 0 && (
              <span className="absolute start-2 top-2 rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-white">
                {t("cover")}
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(i, i - 1)}
                  disabled={i === 0}
                  className="grid size-8 place-items-center rounded-lg bg-white/90 text-navy disabled:opacity-40"
                  aria-label={t("moveUp")}
                >
                  <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, i + 1)}
                  disabled={i === images.length - 1}
                  className="grid size-8 place-items-center rounded-lg bg-white/90 text-navy disabled:opacity-40"
                  aria-label={t("moveDown")}
                >
                  <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
                </button>
              </div>
              <button
                type="button"
                onClick={() => onChange(images.filter((x) => x.path !== img.path))}
                className="grid size-8 place-items-center rounded-lg bg-white/90 text-red-600"
                aria-label={t("delete")}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={Boolean(progress)}
          className={cn(
            "flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-sky-soft/50 text-sm font-medium text-brand transition hover:bg-sky-soft",
            progress && "cursor-wait opacity-70",
          )}
        >
          <ImagePlus className="size-6" aria-hidden />
          {progress ? t("uploading", progress) : t("addImages")}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        className="hidden"
        onChange={(e) => onFiles(e.target.files)}
      />
      {error && <p className="text-sm text-red-600">{t("errors.generic")}</p>}
      <p className="text-xs text-slate-500">{t("imagesHint")}</p>
      {/* Keep an explicit button reachable for keyboard users when the grid is long */}
      {images.length > 8 && (
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
          <ImagePlus className="size-4" aria-hidden /> {t("addImages")}
        </Button>
      )}
    </div>
  );
}
