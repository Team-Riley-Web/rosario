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