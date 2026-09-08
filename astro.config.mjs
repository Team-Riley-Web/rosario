import { defineConfig } from 'astro/config';
import alpinejs from '@astrojs/alpinejs';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // www, not the apex: the apex 301s to www, so canonical/og:url/sitemap built
  // from the apex all pointed at a redirect rather than the URL that serves.
  site: 'https://www.rosarioleonardi.shop',
  integrations: [
    alpinejs({ entrypoint: '/src/entrypoint' }),
    // /listing-pending is a noindex placeholder served at unbuilt product URLs;
    // listing it in the sitemap would contradict its robots tag.
    sitemap({ filter: (page) => !page.includes('/listing-pending') }),
  ],
});
