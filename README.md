# Rosario Leonardi Murano Glass

Astro + Shopify storefront for Rosario Leonardi Murano Glass. The site presents one-of-a-kind Murano glass jewelry, restored vintage Millefiori, freshwater pearls, and maker beads while keeping Shopify responsible for catalog data, cart mutations, and checkout.

## Shopify Configuration

Copy `.env.example` to `.env`, then set the Shopify domains and Storefront API token:

```bash
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_CHECKOUT_DOMAIN=your-store.myshopify.com
SHOPIFY_STOREFRONT_TOKEN=...

PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
PUBLIC_SHOPIFY_CHECKOUT_DOMAIN=your-store.myshopify.com
PUBLIC_SHOPIFY_STOREFRONT_TOKEN=...
```

Never commit `.env` or private Shopify Admin tokens. If a private token is exposed, rotate it in Shopify Admin.

Set `HEADLESS_DOMAINS` / `PUBLIC_HEADLESS_DOMAINS` to deployed storefront domains so checkout URLs normalize back to Shopify.

## Local Development

```bash
npm install
npm run dev
```

Use mocks for local or CI verification when the live Shopify catalog is not needed:

```bash
SHOPIFY_USE_MOCKS=true PUBLIC_SHOPIFY_USE_MOCKS=true npm run build
```

## Verify Changes

```bash
npm run test:unit
npm run build
npm run test:e2e
```

## Git Remote Reset

This repository should push to:

```bash
git remote remove origin
git remote add origin https://github.com/Team-Riley-Web/rosario.git
git branch -M master
git push -u origin master
```
