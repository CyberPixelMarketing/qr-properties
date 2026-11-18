import { NextResponse, type NextRequest } from "next/server";
import { getPaymentProvider } from "@/lib/payments/provider";

export const runtime = "nodejs";

// Provider webhook endpoint (e.g. Stripe). Inactive until a provider is configured.
export async function POST(request: NextRequest) {
  const provider = getPaymentProvider();
  if (!provider.enabled) return NextResponse.json({ error: "payments_disabled" }, { status: 501 });
  const body = await request.text();
  const result = await provider.handleWebhook(body, request.headers);
  return NextResponse.json(result);
}
