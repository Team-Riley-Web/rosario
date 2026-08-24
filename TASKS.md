# Tasks

Queue of work for Claude. Add new tasks to the bottom. Do not remove or edit an
unchecked task unless you are starting it.

## Rules
- Work on only one task at a time.
- New tasks go at the bottom of the list.
- Do not abandon or interrupt the current task unless the user explicitly says "interrupt".
- Finish, test, and verify the current task before starting the next.
- Before starting another task, re-read this file and select the oldest pending (unchecked) task.
- After completing a task, check it off, briefly tell the user it's done, and state which task is starting next.
- Do not combine unrelated tasks into one implementation.

## Queue

- [x] I added miss USA images into the folder. Please figure out appropriate pages, places on the home page, and other pages to use these images. don't overdo it
  Done 2026-08-07: Used all 3 photos in 3 spots, kept the family-history "Our
  Story" page untouched since these are unrelated to that narrative.
  - Home, "Meet the Beads" section (was disabled/commented out) — reactivated
    it with ms-usa-3.png (blue necklace), portrait-cropped 3:4.
  - Home, "Need a Gift" section — swapped the old flat product shot for
    ms-usa-2.png (warm candid smile), tuned the crop to keep her face framed.
  - Shop page — added a small intro banner above the product grid (that page
    had no lead-in content at all) using ms-usa-1.png.
  Verified all three at desktop (1440px) and mobile (390px) with the browse
  skill; no console errors.
- [x] On the Our Story page under the crossing, change then "identical" label to just twins. I actually Have a photo of the 2 twins reuniting in the 50's. Rosario's twin was Vincent. "Vincenzo" if you had a male child and you are Italian, the first male child is always named Vincenzo. "Vincent"
  Done 2026-08-07: In `src/pages/about.astro`, "The Crossing" section - removed
  both uses of "identical" and named the previously-unnamed twin: "twin
  brothers Rosario and Vincenzo stood on a dock..." and "His twin, Vincenzo -
  known in New York as Vincent - and that branch of the family remained
  Leonardo...".
  Note: did not add the reunion photo - it wasn't in the assets folder. There
  are two unused old photos already sitting in assets (`brothers.HEIC`,
  `brothers2.HEIC`) but they look like two young men in early-1900s suits, not
  an older-age 1950s reunion, so I didn't assume they were the same photo and
  left them out rather than mislabel. Send over the actual reunion photo (or
  confirm one of those two is it) and I'll drop it in.
- [ ] Lisa Leonardi says https://rosarioleonardi.myshopify.com/ is popping up.
  Make that screen redirect to the main site.
  Blocked 2026-08-12: `curl -I https://rosarioleonardi.myshopify.com/`
  returns `200 OK` from Shopify, so this request never reaches the Netlify/Astro
  site. A Netlify redirect in this repo cannot affect the `.myshopify.com`
  storefront. Fix needs Shopify admin/theme access: either set the public custom
  domain as Shopify's primary/redirect domain if it is connected there, or edit
  the active Shopify theme to immediately redirect visitors to
  `https://rosarioleonardi.shop/`.
- [x] Replace the 24-hour scheduled GitHub product-change check with an
  event-driven redeploy for every new Shopify product launch, so newly launched
  products appear on the main site promptly.
  Done 2026-08-19: Shopify Product creation webhooks call the Netlify build hook
  directly for immediate deploys (~2-4 min); GitHub retains a manual rebuild
  workflow. Updated `docs/shopify-auto-rebuild-setup.md` with the
  Shopify/Netlify setup and verification steps.
  Corrected same day: deleting the daily job left NO trigger at all, because the
  Shopify webhook was never registered. Restored the daily scheduled check as a
  safety net for dropped webhooks, and narrowed its fingerprint from
  `handle + updatedAt` to handles only, so product edits no longer cost a build.
- [x] Register the Product creation webhook in Shopify admin
  (Settings -> Notifications -> Webhooks), format JSON, URL = the
  `NETLIFY_BUILD_HOOK_URL` secret.
  Done 2026-08-19: registered, event `Product creation`, format JSON, pointed at
  build hook `6a57f6c32038cd0099b9b9fa`. Fast path is now live, so new products
  should appear in ~2-4 min; the daily 5:00 AM Central check remains as the
  backstop for dropped webhooks.
  Not yet confirmed by a real launch - the first product created will prove it.
  A webhook-fired deploy is distinguishable only by timestamp, not title: it
  reuses the build hook's name, "Shopify product changes (daily auto-rebuild)".
  Do NOT add a Product update webhook - it rebuilds on every edit.
- [x] Diagnose why the product listing opens with the "18 INCH NECKLACE" label
  over the top of the main product photo, especially on newly added listings,
  and provide a client-ready explanation.
  Done 2026-08-24: Confirmed on the live Green & Navy product page and in a
  clean mock-data build. The product template's `getStep()` helper selects the
  first Shopify tag (`product.tags[0]`) and renders it as an absolutely
  positioned badge over the main image, as well as above the product title.
  The affected listing's first tag is `18 inch necklace`; the text is not part
  of the uploaded photo. This behavior was inherited from an older skincare
  "step" badge and generalized during the storefront conversion.
- [x] Remove the automatic Shopify-tag badge from product photos and ensure
  the product-page eyebrow uses the actual Shopify category instead of an
  arbitrary tag such as necklace length.
  Done 2026-08-24: Removed the top-left tag overlay from every product image.
  Replaced the inherited `product.tags[0]` display rule with the Shopify
  product category, falling back to the first collection only when a category
  is unavailable. Added a Playwright regression test that failed against the
  old `Vintage` image badge and now verifies no tag is shown over the image and
  `Necklaces` appears as the product eyebrow. Verified with `npm run test:ci`:
  33 unit tests and 7 browser tests passed.
- [x] Reorder the shop so Lisa's pieces made with Moretti beads appear first,
  while the pictured iridescent/lampworked pieces populate last instead of
  appearing together at the top of the product listing.
  Done 2026-08-24: Replaced the shop's alphabetical default with a Featured
  merchandising order: finished Moretti jewelry first, standard products in
  the middle, and the 45-product non-Moretti Murano pendant family represented
  in the screenshot last. Kept alphabetical, best-selling, and price sorts as
  shopper-selectable options. Applied the same order to static pagination and
  client-side filtering, and added regression coverage for Moretti jewelry,
  ordinary products, the pictured pendant family, and loose Moretti beads.
  Verified against the live 328-product Shopify catalog and with
  `npm run test:ci`: 35 unit tests and 7 browser tests passed.
