# Auto-rebuild a static Shopify site when products launch

Sets up an hourly catalog check that calls a Netlify build hook when a product
is added or removed, a manual GitHub rebuild action, and a redirect so
brand-new product URLs degrade gracefully while the build runs.

Reference implementation: this repo (rosario). Set up 2026-07-15.
Revised 2026-08-31 — the product-creation webhook was removed; see
"Why there is no webhook" below.

## Why this exists

Static sites bake product pages at **build time**, but the search bar (and any
other live Storefront API call) shows products in **real time**. A product added
after the last deploy shows up in search but its page doesn't exist — and a
Netlify catch-all rewrite (`/* /index.html 200`) will silently serve the
homepage instead of a 404.

## The trigger

| Trigger | Latency | Role |
|---|---|---|
| Hourly scheduled catalog fingerprint (GitHub Actions) | up to ~1h | The only trigger |

**Cost control is in the fingerprint.** The job hashes the sorted set of
product **handles** only. A launch adds a handle and a deletion removes one, so
either triggers a build; editing a price, description, or image changes no
handle and therefore costs **zero build minutes**. Do not switch the
fingerprint to `handle + updatedAt` — that rebuilds on every product edit.

Content edits are not stranded by this: any build that runs rebuilds *every*
page, so price/photo/copy edits ship with the next launch. If a content edit
must go out immediately, run the workflow manually (Step 6) — a
`workflow_dispatch` run always builds.

The fingerprint is stored in the Actions cache, never in a commit, so it can't
itself trigger a deploy.

This repo is public, so the hourly Actions run costs nothing. On a **private**
repo, GitHub bills Actions in 1-minute increments — hourly is ~720 min/month
against a 2,000-minute free tier. Drop to every 2-4 hours there if that matters.

## Why there is no webhook

Earlier versions of this setup added a Shopify **Product creation** webhook
pointed at the Netlify build hook, as a ~2-4 minute fast path for launches.
**Do not do this.** It fires the instant the product is published, and the
real-world authoring workflow is:

1. Duplicate an existing product in Shopify (18 products in this catalog still
   carry `-copy` handles from this habit).
2. Publish it, and set the new title.
3. *Then* spend the next 5-10 minutes deleting the source product's photos and
   uploading the real ones.

The webhook builds at step 2. The page therefore ships with the **source
product's images**, and nothing ever corrects it — the handle already exists,
so the fingerprint is unchanged and the scheduled job skips the rebuild. The
page stays wrong until someone notices and rebuilds by hand.

That is exactly what happened to `rosario-leonardi-rare-vintage-silver-foil-ribbon-beads-...`:
published 2026-08-30 17:48:07Z, photos uploaded 17:49:29-17:55:34Z, and the
live page carried a pink necklace's 8 photos for ~22 hours until a manual
rebuild on 2026-08-31 15:40Z.

Building on a delay is both more correct and cheaper: by the time the hourly
check runs the photos are done, so a listing goes live once, with the right
images, in **one** build instead of two.

Also note **`images(first: N)`** in the product-detail query is a hard cap on
how many photos a product page can ever show. It was 8 here while 142 of 332
products had more than 8 photos; raised to 25 on 2026-08-31. Set it above the
largest photo set in the catalog.

## Prerequisites

- Static site (Astro or similar) that builds product pages from the Shopify
  Storefront API, deployed on Netlify from a GitHub repo (default branch builds).
- A Storefront API token in the project `.env` (`SHOPIFY_STORE_DOMAIN`,
  `SHOPIFY_STOREFRONT_TOKEN`). Read scope is enough.
- CLIs: `gh` (authed with repo admin), `netlify` (run `netlify login` first —
  sessions expire), `jq`.

## Step 1 — Add the workflow

Copy `.github/workflows/rebuild-on-product-changes.yml` from this repo into the
target repo. It carries the hourly `schedule:` and a `workflow_dispatch` manual
rebuild button. A manual run always builds, regardless of the fingerprint.

Note: a scheduled workflow only runs from the repo's **default branch**. It has
no effect until merged there.

## Step 2 — Make sure no product webhook exists

In Shopify admin, **Settings → Notifications → Webhooks**, delete any
**Product creation** or **Product update** webhook pointing at the Netlify
build hook. See "Why there is no webhook" above.

A leftover creation webhook is not just redundant — it actively publishes pages
with the wrong photos.

## Step 3 — Add the fallback redirect

So unknown product URLs land on the shop page instead of the homepage during
the gap before the next hourly build. In `netlify.toml`, **above** any
catch-all:

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
within the hour.

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

(`branch` = the branch Netlify deploys; often `main`.) Dashboard alternative:
Site configuration → Build & deploy → Build hooks → Add build hook.

To recover the URL later without creating a second hook:

```bash
netlify api listSiteBuildHooks --data "{\"site_id\":\"$SITE_ID\"}" \
  | jq -r '.[] | "https://api.netlify.com/build_hooks/" + .id + "  # " + .title'
```

## Step 5 — Push

```bash
git add .github/workflows/rebuild-on-product-changes.yml netlify.toml public/_redirects
git commit -m "Deploy when Shopify products launch"
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
```

Confirm the schedule is actually registered (a workflow with no `schedule:` on
the default branch silently never runs):

```bash
gh api "repos/$REPO/actions/runs?per_page=5" \
  --jq '.workflow_runs[] | [.created_at, .name, .event, .conclusion] | @tsv'
```

Look for rows with event `schedule`. Their absence means the cron is not live.

To audit whether the live site's images match Shopify, compare each shop card's
primary image to the product's current first image via the Storefront API —
that check is what found the stale page on 2026-08-31.

## Design notes / gotchas learned the hard way

- **Keep the docs and the workflow in sync.** On 2026-08-19 the daily job was
  deleted in favour of the webhook, but the webhook was never registered in
  Shopify admin — leaving no trigger at all. The docs described a system that
  wasn't running. Verify with the `event: schedule` check above.
- **A build that fires too early is worse than a build that fires late.** The
  removed creation webhook shipped a page with another product's photos and
  left no mechanism to correct it. Latency is recoverable; wrong content that
  nothing re-checks is not.
- **GitHub delays scheduled runs, sometimes by hours.** Against a `0 10 * * *`
  cron, real runs landed at 10:36, 10:38, 20:13, 21:08, 14:57 and 14:44 UTC on
  consecutive days, and the 2026-08-31 run had still not fired by 15:40Z. Never
  promise a customer a time window tighter than the cadence plus several hours;
  hourly makes the drift irrelevant.
- Shopify may retry a build-hook POST if Netlify is unavailable. Netlify builds
  are safe to repeat; use Netlify's deploy queue to avoid overlap.
- A build hook URL is a credential. Keep it out of source control and rotate it
  in Netlify if it is exposed.
- The fingerprint step fails loudly if Shopify returns zero products, rather
  than recording an empty catalog and triggering a spurious rebuild.
- A full build here is ~1m35s locally / ~2-3 min on Netlify for 363 pages, so
  the 300 min/month Netlify free tier is ~100 builds. Handle-only
  fingerprinting keeps actual usage near one build per launch.
