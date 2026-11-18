import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandLogo } from "@/components/brand-logo";
import { ArrowRight } from "@/components/icons";

/** White app bar (Figma "Header"): back/brand at start, title centre, actions at end. */
export function TopBar({
  title,
  backHref,
  backLabel,
  actions,
}: {
  title?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {backHref ? (
            <Link href={backHref} aria-label={backLabel} className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-ink hover:bg-page">
              <ArrowRight className="size-5 ltr:rotate-180" aria-hidden />
            </Link>
          ) : (
            <Link href="/" className="ps-1">
              <BrandLogo className="h-6 w-auto" priority />
            </Link>
          )}
        </div>
        {title && <p className="truncate text-center text-[17px] font-semibold text-ink">{title}</p>}
        <div className="flex flex-1 items-center justify-end gap-1">
          {actions}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
