import { defineConfig } from 'astro/config';
import alpinejs from '@astrojs/alpinejs';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://rosarioleonardi.shop',
  integrations: [
    alpinejs({ entrypoint: '/src/entrypoint' }),
    // /listing-pending is a noindex placeholder served at unbuilt product URLs;
    // listing it in the sitemap would contradict its robots tag.
    sitemap({ filter: (page) => !page.includes('/listing-pending') }),
  ],
});
