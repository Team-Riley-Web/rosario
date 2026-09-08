import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// /shop defaults its primary filter to the Murano group, so a homepage tile
// linking to a bare ?filter=<category> lands on Murano-only and silently hides
// every pearl and mixed-material piece. Rings showed 1 of 17 that way, and
// bracelets 17 of 38 — a regression with no visible error, which is why it is
// worth a test rather than a comment.
const homepage = readFileSync(resolve(process.cwd(), 'src/pages/index.astro'), 'utf8');
const CATEGORY_TILES = ['necklaces', 'earrings', 'bracelets', 'rings'];

describe('homepage collection tiles', () => {
  it.each(CATEGORY_TILES)('links %s across every material group', (category) => {
    expect(homepage).toContain(`href: '/shop?filter=${category}&group=all'`);
  });

  it('leaves no category tile on the Murano-only default', () => {
    for (const category of CATEGORY_TILES) {
      expect(homepage).not.toContain(`href: '/shop?filter=${category}'`);
    }
  });
});
