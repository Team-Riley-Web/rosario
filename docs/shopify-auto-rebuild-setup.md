# Auto-rebuild a static Shopify site when products change

Sets up a once-daily GitHub Action that rebuilds a Netlify site **only when the
Shopify catalog actually changed** (product created, edited, or deleted), plus a
redirect so brand-new product URLs degrade gracefully until the next build.

Reference implementation: this repo (rosario). Set up 2026-07-15.

## Why this exists

Static sites bake product pages at **build time**, but the search bar (and any
other live Storefront API call) shows products in **real time**. A product added
after the last deploy shows up in search but its page doesn't exist — and a
Netlify catch-all rewrite (`/* /index.html 200`) will silently serve the
homepage instead of a 404.

A per-change Shopify webhook → build hook would fix freshness but lets an
active client burn unlimited build minutes. This design caps it at **one build
per day, and zero on days nothing changed**, with nothing for the client to
know or do.

## Prerequisites

- Static site (Astro or similar) that builds product pages from the Shopify
  Storefront API, deployed on Netlify from a GitHub repo (default branch builds).
- A Storefront API token in the project `.env` (`SHOPIFY_STORE_DOMAIN`,
  `SHOPIFY_STOREFRONT_TOKEN`). Read scope is enough.
- CLIs: `gh` (authed with repo admin), `netlify` (run `netlify login` first —
  sessions expire), `jq`.

## Step 1 — Add the workflow

Copy `.github/workflows/rebuild-on-product-changes.yml` from this repo into the
target repo, unchanged unless noted:

- **Cron** is UTC: `0 10 * * *` = 5:00 AM Central. Adjust if desired.
- **API version** (`2026-01` in the URL) — match what the site itself uses.
- Scheduled workflows only run from the **default branch**.

How it works: pages through the full catalog (250 products/page), hashes every
`handle + updatedAt` pair into a fingerprint, compares against the previous
run's fingerprint stored in the **Actions cache**, and POSTs the Netlify build
hook only on a mismatch. Manual dispatch (Actions → Run workflow) always
forces a build — that's the "publish now" button.

## Step 2 — Add the fallback redirect

So unknown product URLs land on the shop page instead of the homepage during
the gap before the nightly build. In `netlify.toml`, **above** any catch-all:

```toml
[[redirects]]
  from = "/products/*"
  to = "/shop"
  status = "302"
```

And the same line in `public/_redirects` if the project has one:

```
/products/* /shop 302
```

Adjust `/products/*` and `/shop` to the project's actual routes. Netlify skips
the rule when a real static page exists at the path, so existing products are
unaffected. Use 302 (not 301) so browsers don't cache it — the page will exist
tomorrow.

## Step 3 — Set the GitHub secrets

```bash
REPO=owner/repo-name   # e.g. Team-Riley-Web/rosario
cd /path/to/project
set -a && source .env && set +a
printf '%s' "$SHOPIFY_STORE_DOMAIN"     | gh secret set SHOPIFY_STORE_DOMAIN     --repo "$REPO"
printf '%s' "$SHOPIFY_STOREFRONT_TOKEN" | gh secret set SHOPIFY_STOREFRONT_TOKEN --repo "$REPO"
```

## Step 4 — Create the Netlify build hook

```bash
netlify api listSites | jq -r '.[] | [.id, .name] | @tsv'   # find the site id
SITE_ID=<site-id>
hook=$(netlify api createSiteBuildHook \
  --data "{\"site_id\":\"$SITE_ID\",\"body\":{\"title\":\"Shopify product changes (daily auto-rebuild)\",\"branch\":\"master\"}}")
printf 'https://api.netlify.com/build_hooks/%s' "$(echo "$hook" | jq -r '.id')" \
  | gh secret set NETLIFY_BUILD_HOOK_URL --repo "$REPO"
```

(`branch` = the branch Netlify deploys; often `main`.) Dashboard alternative:
Site configuration → Build & deploy → Build hooks → Add build hook.

## Step 5 — Push

```bash
git add .github/workflows/rebuild-on-product-changes.yml netlify.toml public/_redirects
git commit -m "Add daily product-change rebuild and fallback redirect"
git push git@github.com:$REPO.git <branch>
```

**Gotcha:** if the `gh` OAuth token lacks the `workflow` scope, an HTTPS push
containing a workflow file is rejected (`refusing to allow an OAuth App to
create or update workflow`). Push over SSH as shown, or run
`gh auth refresh -s workflow`.

## Step 6 — Verify (two dispatches)

```bash
gh workflow run rebuild-on-product-changes.yml --repo "$REPO"
# wait for it, then run it a second time, then:
gh run list --repo "$REPO" --workflow=rebuild-on-product-changes.yml --limit 2
gh run view <run-id> --repo "$REPO" --log | grep -E "Products:|previous:|Catalog changed|No catalog"
```

- **Run 1** should log `previous: none`, trigger a build, and save the cache.
- **Run 2** should log `Cache restored`, a matching `previous:` hash, and
  `No catalog changes — skipping build`. **This is the critical check** — if
  the restore silently failed, every daily run would trigger a build and leak
  build minutes while looking green.

## Design notes / gotchas learned the hard way

- **Don't store the fingerprint in a repo variable** — the built-in
  `GITHUB_TOKEN` gets `403 Resource not accessible by integration` writing
  Actions variables, and a PAT would expire and break silently. Actions cache
  works with default permissions; daily runs keep the entry from being evicted
  (7-day unused limit).
- **Don't commit the fingerprint to the repo** — the daily commit would itself
  trigger a Netlify build on every run.
- `updatedAt` bumps on inventory changes too, so a **sale** also triggers the
  next morning's rebuild — desirable for one-of-a-kind items that need their
  sold-out state baked in.
- The zero-products guard aborts rather than fingerprinting an empty catalog,
  so a Shopify API hiccup can't cause a spurious rebuild (or worse, ship a
  build with no products).
- Cost envelope: worst case one build/day ≈ 30 builds × ~2–3 min = well inside
  Netlify's free 300 min/month even across several client sites; the check
  itself uses ~8 s/day of free GitHub Actions minutes.
