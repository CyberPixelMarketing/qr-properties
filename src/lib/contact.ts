/** Phone helpers for tel: and wa.me links (UAE-aware). */
export function digitsOnly(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export function telHref(phone: string) {
  return `tel:${digitsOnly(phone)}`;
}

/** wa.me needs the international number without "+" or leading zeros. Local UAE numbers (05x…) get 971. */
export function waNumber(phone: string) {
  let d = digitsOnly(phone).replace(/^\+/, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (/^0[1-9]/.test(d)) d = `971${d.slice(1)}`;
  return d;
}

export function waHref(phone: string, text?: string) {
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${waNumber(phone)}${q}`;
}

export function waShareHref(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
