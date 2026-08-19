# Auto-rebuild a static Shopify site when products launch

Sets up a Shopify product-creation webhook that calls a Netlify build hook
immediately when a product is created, a daily catalog check as a safety net, a
manual GitHub rebuild action, and a redirect so brand-new product URLs degrade
gracefully while the build runs.

Reference implementation: this repo (rosario). Set up 2026-07-15.

## Why this exists

Static sites bake product pages at **build time**, but the search bar (and any
other live Storefront API call) shows products in **real time**. A product added
after the last deploy shows up in search but its page doesn't exist — and a
Netlify catch-all rewrite (`/* /index.html 200`) will silently serve the
homepage instead of a 404.

## The two triggers

Both exist on purpose, and neither is redundant:

| Trigger | Latency | Role |
|---|---|---|
| Shopify **Product creation** webhook → Netlify build hook | ~2-4 min | The fast path for launches |
| Daily scheduled catalog fingerprint (GitHub Actions) | up to 24h | Safety net for dropped webhooks |

Webhook delivery is best-effort. Shopify retries, but if a webhook is ultimately
dropped the product would never publish — so the daily job stays as a backstop.

**Cost control is in the fingerprint.** The daily job hashes the sorted set of
product **handles** only. A launch adds a handle and a deletion removes one, so
either triggers a build; editing a price, description, or image changes no
handle and therefore costs **zero build minutes**. Do not switch the
fingerprint back to `handle + updatedAt` — that rebuilds on every product edit.

The fingerprint is stored in the Actions cache, never in a commit, so it can't
itself trigger a deploy.

## Prerequisites

- Static site (Astro or similar) that builds product pages from the Shopify
  Storefront API, deployed on Netlify from a GitHub repo (default branch builds).
- A Storefront API token in the project `.env` (`SHOPIFY_STORE_DOMAIN`,
  `SHOPIFY_STOREFRONT_TOKEN`). Read scope is enough.
- CLIs: `gh` (authed with repo admin), `netlify` (run `netlify login` first —
  sessions expire), `jq`.

## Step 1 — Add the workflow

Copy `.github/workflows/rebuild-on-product-changes.yml` from this repo into the
target repo. It carries both the daily `schedule:` safety net and a
`workflow_dispatch` manual rebuild button. A manual run always builds,
regardless of the fingerprint.

Note: a scheduled workflow only runs from the repo's **default branch**. It has
no effect until merged there.

## Step 2 — Create the Shopify product-created webhook

In Shopify admin, go to **Settings → Notifications → Webhooks → Create
webhook** (the exact menu label can vary by admin version):

- Event: **Product creation**
- Format: **JSON**
- URL: the Netlify build hook URL created in Step 4

Shopify POSTs the product event to Netlify, and Netlify immediately starts the
branch build.

**Do not add a "Product update" webhook.** It fires on every price, inventory,
and copy edit, and each one costs a full Netlify build — this is the per-change
pattern that blows the build budget. Product-creation only.

## Step 3 — Add the fallback redirect

So unknown product URLs land on the shop page instead of the homepage during
the gap while the build is running. In `netlify.toml`, **above** any catch-all:

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

To recover the URL later without creating a second hook:

```bash
netlify api listSiteBuildHooks --data "{\"site_id\":\"$SITE_ID\"}" \
  | jq -r '.[] | "https://api.netlify.com/build_hooks/" + .id + "  # " + .title'
```

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
gh run list --repo "$REPO" --workflow=rebuild-on-product-changes.yml --limit 1
# Then create a test product in Shopify and confirm a new Netlify deploy starts.
```

Confirm the schedule is actually registered (a workflow with no `schedule:` on
the default branch silently never runs):

```bash
gh api "repos/$REPO/actions/runs?per_page=5" \
  --jq '.workflow_runs[] | [.created_at, .name, .event, .conclusion] | @tsv'
```

Look for rows with event `schedule`. Their absence means the cron is not live.

## Design notes / gotchas learned the hard way

- **Keep the docs and the workflow in sync.** On 2026-08-19 the daily job was
  deleted in favour of the webhook, but the webhook was never registered in
  Shopify admin — leaving no trigger at all. The docs described a system that
  wasn't running. Verify with the `event: schedule` check above.
- On a day when a launch webhook already fired, the next scheduled run sees a
  changed handle set and builds once more (~2 min). That duplicate is the price
  of the safety net; it happens at most once per launch day.
- Shopify may retry a webhook if Netlify is unavailable. Netlify builds are safe
  to repeat; use Netlify's deploy queue to avoid overlap.
- A build hook URL is a credential. Keep it out of source control and rotate it
  in Netlify if it is exposed.
- The fingerprint step fails loudly if Shopify returns zero products, rather
  than recording an empty catalog and triggering a spurious rebuild.
