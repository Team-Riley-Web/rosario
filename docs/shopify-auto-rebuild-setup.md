# Auto-rebuild a static Shopify site when products launch

Sets up an event-driven Shopify product webhook that calls a Netlify build hook
immediately when a product is created, plus a manual GitHub rebuild action and a
redirect so brand-new product URLs degrade gracefully while the build runs.

Reference implementation: this repo (rosario). Set up 2026-07-15.

## Why this exists

Static sites bake product pages at **build time**, but the search bar (and any
other live Storefront API call) shows products in **real time**. A product added
after the last deploy shows up in search but its page doesn't exist — and a
Netlify catch-all rewrite (`/* /index.html 200`) will silently serve the
homepage instead of a 404.

A Shopify product-created webhook → Netlify build hook gives the client a fresh
static catalog after every launch. Netlify's build hook URL acts as the shared
secret; no polling job or server has to be maintained.

## Prerequisites

- Static site (Astro or similar) that builds product pages from the Shopify
  Storefront API, deployed on Netlify from a GitHub repo (default branch builds).
- A Storefront API token in the project `.env` (`SHOPIFY_STORE_DOMAIN`,
  `SHOPIFY_STOREFRONT_TOKEN`). Read scope is enough.
- CLIs: `gh` (authed with repo admin), `netlify` (run `netlify login` first —
  sessions expire), `jq`.

## Step 1 — Add the workflow

Copy `.github/workflows/rebuild-on-product-changes.yml` from this repo into the
target repo. It is a manual emergency rebuild button; the normal launch path is
the Shopify webhook below.

## Step 2 — Create the Shopify product-created webhook

In Shopify admin, go to **Settings → Notifications → Webhooks → Create
webhook** (the exact menu label can vary by admin version):

- Event: **Product creation**
- Format: **JSON**
- URL: the Netlify build hook URL created in Step 4

Shopify POSTs the product event to Netlify, and Netlify immediately starts the
branch build. Add **Product update** or **Product deletion** webhooks too if
edits/removals must also be reflected in the static catalog.

## Step 3 — Add the fallback redirect

So unknown product URLs land on the shop page instead of the homepage during
the gap while the event-triggered build is running. In `netlify.toml`, **above**
any catch-all:

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

## Step 4 — Create the Netlify build hook and set the GitHub secret

```bash
REPO=owner/repo-name   # e.g. Team-Riley-Web/rosario
cd /path/to/project
netlify api listSites | jq -r '.[] | [.id, .name] | @tsv'   # find the site id
SITE_ID=<site-id>
hook=$(netlify api createSiteBuildHook \
  --data "{\"site_id\":\"$SITE_ID\",\"body\":{\"title\":\"Shopify product launches\",\"branch\":\"master\"}}")
NETLIFY_BUILD_HOOK_URL="https://api.netlify.com/build_hooks/$(echo "$hook" | jq -r '.id')"
printf '%s' "$NETLIFY_BUILD_HOOK_URL" \
  | gh secret set NETLIFY_BUILD_HOOK_URL --repo "$REPO"
```

Use the resulting `NETLIFY_BUILD_HOOK_URL` as both the GitHub secret and the
Shopify webhook URL in Step 2. (`branch` = the branch Netlify deploys; often
`main`.) Dashboard alternative:
Site configuration → Build & deploy → Build hooks → Add build hook.

## Step 5 — Push

```bash
git add .github/workflows/rebuild-on-product-changes.yml netlify.toml public/_redirects
git commit -m "Deploy immediately when Shopify products launch"
git push git@github.com:$REPO.git <branch>
```

**Gotcha:** if the `gh` OAuth token lacks the `workflow` scope, an HTTPS push
containing a workflow file is rejected (`refusing to allow an OAuth App to
create or update workflow`). Push over SSH as shown, or run
`gh auth refresh -s workflow`.

## Step 6 — Verify

```bash
gh workflow run rebuild-on-product-changes.yml --repo "$REPO"
# Then create a test product in Shopify and confirm a new Netlify deploy starts.
gh run list --repo "$REPO" --workflow=rebuild-on-product-changes.yml --limit 1
```

## Design notes / gotchas learned the hard way

- Shopify may retry a webhook if Netlify is unavailable. Netlify builds are safe
  to repeat; use Netlify's deploy queue to avoid overlap.
- A build hook URL is a credential. Keep it out of source control and rotate it
  in Netlify if it is exposed.
- Product-created events are the launch trigger. Add update/delete webhooks only
  when those changes also need static pages rebuilt.
