import "server-only";

/**
 * Payment layer — interface only. Subscriptions live in `public.subscriptions`
 * (provider + provider_ref columns are ready). Plug Stripe in by implementing
 * this interface and setting PAYMENT_PROVIDER=stripe; nothing else in the app changes.
 */
export type BillingInterval = "month" | "year";

export interface CheckoutRequest {
  profileId: string;
  email: string | null;
  planCode: string;
  interval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentProvider {
  readonly name: string;
  readonly enabled: boolean;
  /** Returns a hosted checkout URL to redirect the user to. */
  createCheckout(req: CheckoutRequest): Promise<{ url: string }>;
  /** Returns a customer-portal URL for managing / cancelling a subscription. */
  createPortal(profileId: string, returnUrl: string): Promise<{ url: string }>;
  /**
   * Verifies and applies a provider webhook. Implementations update
   * `subscriptions` (status, plan_id, current_period_end, provider_ref) with the service-role client.
   */
  handleWebhook(rawBody: string, headers: Headers): Promise<{ received: boolean }>;
}

export class PaymentsDisabledError extends Error {
  constructor() {
    super("payments_disabled");
  }
}

/** Default: payments switched off (all accounts on the free plan). */
class NoopProvider implements PaymentProvider {
  readonly name = "none";
  readonly enabled = false;
  async createCheckout(): Promise<{ url: string }> {
    throw new PaymentsDisabledError();
  }
  async createPortal(): Promise<{ url: string }> {
    throw new PaymentsDisabledError();
  }
  async handleWebhook(): Promise<{ received: boolean }> {
    return { received: false };
  }
}

export function getPaymentProvider(): PaymentProvider {
  switch (process.env.PAYMENT_PROVIDER) {
    // case "stripe": return new StripeProvider(process.env.STRIPE_SECRET_KEY!, process.env.STRIPE_WEBHOOK_SECRET!);
    default:
      return new NoopProvider();
  }
}
