import { defineConfig } from 'astro/config';
import alpinejs from '@astrojs/alpinejs';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://rosarioleonardi.shop',
  integrations: [
    alpinejs({ entrypoint: '/src/entrypoint' }),
    sitemap(),
  ],
});
