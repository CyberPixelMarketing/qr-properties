import "server-only";
import QRCode from "qrcode";
import { SITE_URL } from "@/lib/env";

/** The single, permanent URL each advertiser's QR code encodes. */
export function qrTargetUrl(slug: string) {
  return `${SITE_URL}/a/${slug}?src=qr`;
}

const COLORS = { dark: "#0B2A5B", light: "#FFFFFF" };

export function qrSvg(slug: string, margin = 2) {
  return QRCode.toString(qrTargetUrl(slug), { type: "svg", errorCorrectionLevel: "H", margin, color: COLORS });
}

export function qrPng(slug: string, width = 1024, margin = 2) {
  return QRCode.toBuffer(qrTargetUrl(slug), { type: "png", errorCorrectionLevel: "H", margin, width, color: COLORS });
}
