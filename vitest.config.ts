import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    env: {
      SHOPIFY_STORE_DOMAIN: 'demo-store.myshopify.com',
      SHOPIFY_STOREFRONT_TOKEN: 'test-token',
      PUBLIC_SHOPIFY_STORE_DOMAIN: 'demo-store.myshopify.com',
      PUBLIC_SHOPIFY_STOREFRONT_TOKEN: 'test-token',
      PUBLIC_HEADLESS_DOMAINS: 'demo-headless.example',
    },
  },
});
