import Stripe from 'stripe';

/** Create clients inside requests so Worker secrets are available at access time. */
export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.trim()) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  return new Stripe(key, {
    // Preserve the API version used by the existing billing handlers.
    apiVersion: '2024-11-20.acacia' as any,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/** Workers use asynchronous Web Crypto for webhook signature verification. */
export function verifyStripeWebhook(body: string, signature: string, secret: string) {
  return getStripeClient().webhooks.constructEventAsync(
    body,
    signature,
    secret,
    undefined,
    Stripe.createSubtleCryptoProvider(),
  );
}
