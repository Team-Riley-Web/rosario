# Testing

## Local Setup

1. Copy `.env.example` to `.env`.
2. Set `SHOPIFY_STOREFRONT_TOKEN` and `PUBLIC_SHOPIFY_STOREFRONT_TOKEN` to a Storefront API token for a Shopify test store or development store.
3. Never commit real Storefront API tokens.
4. Install Playwright browsers once with `npx playwright install --with-deps chromium`.

## Commands

```bash
npm run test
npm run test:unit
npm run test:e2e
npm run test:ci
```

`test:e2e` builds with `SHOPIFY_USE_MOCKS=true` and `PUBLIC_SHOPIFY_USE_MOCKS=true`, starts Astro preview through Playwright, and intercepts Storefront cart mutations. It confirms checkout opens a Shopify checkout URL but does not complete payment.

## Netlify and GitHub CI

Use these environment variables in CI:

```bash
SHOPIFY_STORE_DOMAIN=cfcskincare.myshopify.com
SHOPIFY_API_VERSION=2024-01
SHOPIFY_STOREFRONT_TOKEN=<test token>
PUBLIC_SHOPIFY_STORE_DOMAIN=cfcskincare.myshopify.com
PUBLIC_SHOPIFY_API_VERSION=2024-01
PUBLIC_SHOPIFY_STOREFRONT_TOKEN=<test token>
```

For pull request validation, run:

```bash
npm ci
npx playwright install --with-deps chromium
npm run test:ci
```

For Netlify, keep the production build command as `npm run build`. Add a separate CI job for `npm run test:ci`, or configure a deploy check that runs it before production promotion.

## Shopify Test Mode and Bogus Gateway

Use Shopify Payments test mode or the Bogus Gateway only in a Shopify test/development store:

1. In Shopify admin, go to **Settings > Payments**.
2. Enable **test mode** for Shopify Payments, or activate **Bogus Gateway** if Shopify Payments is not available.
3. Place only manual QA orders with Shopify test card numbers.
4. Do not use a real card during launch testing.
5. Do not complete payment from automated Playwright tests.

## Manual Launch Checklist

- Unit tests pass with mocked Storefront responses.
- Integration tests pass for add, update, remove, persistence, empty state, unavailable variants, and friendly API errors.
- Playwright E2E passes through checkout URL handoff without payment.
- Production `.env` values are configured in Netlify.
- No real Storefront API token is committed.
- Test mode or Bogus Gateway has been verified in a Shopify test store.
- A real product can be added to cart in a staging deploy.
- Checkout URL opens Shopify checkout and stops before payment.

## Required Before Launch

All of these must pass before launch:

```bash
npm run test:unit
npm run test:e2e
npm run build
```
