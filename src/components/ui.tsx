import { clsx } from "clsx";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export const cn = clsx;

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "whatsapp";
// Alfareej buttons: primary, secondary (primarySoft), outline, whatsapp — 14px radius.
const variants: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-[0_4px_10px_rgb(41_125_191/0.25)] hover:bg-brand-dark",
  secondary: "bg-sky-soft text-brand hover:bg-[#dcebf8]",
  outline: "border border-brand bg-white text-brand hover:bg-sky-soft",
  ghost: "bg-transparent text-ink hover:bg-sky-soft",
  danger: "bg-red-50 text-red-700 hover:bg-red-100",
  whatsapp: "bg-whatsapp text-white hover:brightness-95",
};

export function buttonClass(variant: Variant = "primary", extra?: string) {
  return cn(
    "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[14px] px-4 py-2.5 text-[13px] font-semibold transition",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-60",
    variants[variant],
    extra,
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

const fieldBase =
  "w-full min-h-12 rounded-xl border border-line bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-subtle " +
  "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 aria-[invalid=true]:border-red-500";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, "min-h-24", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-card bg-white p-4 shadow-card sm:p-5", className)}>{children}</div>;
}

export function Alert({ tone = "error", children }: { tone?: "error" | "success" | "info"; children: ReactNode }) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-green-200 bg-green-50 text-green-800",
    info: "border-blue-200 bg-sky-soft text-navy",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border px-4 py-3 text-sm", tones[tone])}>
      {children}
    </div>
  );
}

/** Alfareej "Segmented" control: white track, active segment in primarySoft. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  name,
  className,
}: {
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  name?: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" className={cn("flex gap-1 rounded-xl border border-line bg-white p-1", className)}>
      {options.map((o) => (
        <label
          key={o.value}
          className={cn(
            "flex h-9 flex-1 cursor-pointer items-center justify-center rounded-[9px] text-[13px] font-semibold transition",
            value === o.value ? "bg-sky-soft text-brand" : "text-muted hover:text-ink",
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
