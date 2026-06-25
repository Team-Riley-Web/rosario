# Astro Shopify Starter

A reusable Astro starter for headless Shopify storefronts. It includes product listing and product detail pages, a Shopify cart drawer, checkout handoff, search, discount redirect support, local mock data, and test coverage.

## Start a New Store From This Template

When you duplicate this project for a new store, update the Git remote before pushing anything.

First check where the duplicate points:

```bash
git remote -v
git status --short --branch
```

If `origin` still points to this starter repo, replace it with the new repo:

```bash
git remote remove origin
git remote add origin https://github.com/YOUR-ORG/YOUR-NEW-REPO.git
git branch -M master
git push -u origin master
```

Only run `git push` after `git remote -v` shows the new repository URL.

## Fresh Repo Option

If the duplicate should have no starter Git history, remove Git metadata and initialize a new repository:

```bash
rm -rf .git
git init
git add .
git commit -m "Initial Shopify starter"
git branch -M master
git remote add origin https://github.com/YOUR-ORG/YOUR-NEW-REPO.git
git push -u origin master
```

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

Set `HEADLESS_DOMAINS` / `PUBLIC_HEADLESS_DOMAINS` to the deployed storefront domains so checkout URLs are normalized back to Shopify.

## Verify Changes

```bash
npm run test:unit
npm run build
npm run test:e2e
```
