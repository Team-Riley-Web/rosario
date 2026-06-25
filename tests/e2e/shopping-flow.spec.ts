import { expect, test } from '@playwright/test';

const storefrontPattern = '**/api/2024-01/graphql.json';

function cart(quantity: number, discountCodes: Array<{ code: string; applicable: boolean }> = []) {
  return {
    id: 'gid://shopify/Cart/cart-1',
    checkoutUrl: 'https://demo-headless.example/cart/c/test-checkout?_s=session-id&_y=visitor-id&key=checkout-key',
    discountCodes,
    totalQuantity: quantity,
    lines: {
      edges: quantity > 0 ? [{
        node: {
          id: 'gid://shopify/CartLine/line-1',
          quantity,
          merchandise: {
            id: 'gid://shopify/ProductVariant/2001',
            title: 'Default Title',
            price: { amount: '28.00', currencyCode: 'USD' },
            product: {
              title: 'Starter Ceramic Mug',
              handle: 'ceramic-mug',
              images: { edges: [{ node: { url: '/favicon.svg', altText: 'Starter Ceramic Mug' } }] },
            },
          },
        },
      }] : [],
    },
    cost: { totalAmount: { amount: (28 * quantity).toFixed(2), currencyCode: 'USD' } },
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    document.cookie = 'shopify_starter_modal_dismissed=1; path=/; SameSite=Lax';
  });

  await page.route('https://demo-store.myshopify.com/checkouts/**', async route => {
    await route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><title>Mock Shopify Checkout</title><h1>Mock Shopify Checkout</h1>',
    });
  });

  await page.route(storefrontPattern, async route => {
    const body = route.request().postDataJSON();
    const query = String(body.query);
    const variables = body.variables ?? {};

    if (query.includes('cartCreate')) {
      await route.fulfill({ json: { data: { cartCreate: { cart: cart(0) } } } });
      return;
    }
    if (query.includes('cartLinesAdd')) {
      await route.fulfill({ json: { data: { cartLinesAdd: { cart: cart(variables.lines?.[0]?.quantity ?? 1) } } } });
      return;
    }
    if (query.includes('cartLinesUpdate')) {
      await route.fulfill({ json: { data: { cartLinesUpdate: { cart: cart(variables.lines?.[0]?.quantity ?? 1) } } } });
      return;
    }
    if (query.includes('cartDiscountCodesUpdate')) {
      await route.fulfill({
        json: {
          data: {
            cartDiscountCodesUpdate: {
              cart: cart(1, variables.discountCodes.map((code: string) => ({ code, applicable: true }))),
              userErrors: [],
            },
          },
        },
      });
      return;
    }
    if (query.includes('cartLinesRemove')) {
      await route.fulfill({ json: { data: { cartLinesRemove: { cart: cart(0) } } } });
      return;
    }
    if (query.includes('getCart')) {
      await route.fulfill({ json: { data: { cart: cart(1) } } });
      return;
    }

    await route.fulfill({ json: { data: {} } });
  });
});

test('customer can shop through checkout handoff without payment', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Astro Shopify Starter/);

  await page.getByRole('link', { name: /Shop All Products/i }).click();
  await expect(page).toHaveURL(/\/shop/);

  const productLink = page.getByRole('link', { name: /Starter Ceramic Mug/i }).first();
  await expect(productLink).toHaveAttribute('href', /ceramic-mug/);

  await page.getByRole('button', { name: /Add to Cart/i }).first().click();
  const dialog = page.getByRole('dialog', { name: /Shopping cart/i });
  await expect(dialog).toBeVisible();
  await expect(page.getByText('Starter Ceramic Mug').last()).toBeVisible();

  await dialog.getByRole('button', { name: /Increase quantity/i }).click();
  await expect(dialog.locator('span.w-8')).toHaveText('2');

  await dialog.getByRole('button', { name: /Remove item/i }).click();
  await expect(page.getByText(/Your cart is empty/i)).toBeVisible();

  await page.getByRole('button', { name: /Continue Shopping/i }).click();
  await page.getByRole('button', { name: /Add to Cart/i }).first().click();

  const checkout = page.getByRole('link', { name: /^Checkout$/i });
  await expect(checkout).toHaveAttribute('href', /demo-store.myshopify.com\/checkouts/);
  await page.getByRole('link', { name: /^Checkout$/i }).click();
  await expect(page).toHaveURL(/demo-store.myshopify.com\/checkouts/);
});

test('product buy now goes to Shopify checkout in the same tab', async ({ page }) => {
  await page.goto('/products/ceramic-mug');

  const popupPromise = page.waitForEvent('popup', { timeout: 1000 }).catch(() => null);
  await page.getByRole('button', { name: /^Buy Now$/i }).click();

  await expect(page).toHaveURL(/demo-store.myshopify.com\/checkouts/);
  expect(await popupPromise).toBeNull();
});

test('Discount links store discount and preserve tracking params', async ({ page }) => {
  let appliedDiscountCodes: string[] = [];

  await page.goto('/discount?code=WELCOME10&redirect=/shop&dt_id=0&utm_source=partner');

  await expect(page).toHaveURL(/\/shop\?dt_id=0&utm_source=partner$/);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('shopify_discount_code'))).toBe('WELCOME10');

  page.on('request', request => {
    if (!request.url().includes('/api/2024-01/graphql.json')) return;
    const body = request.postDataJSON();
    if (String(body.query).includes('cartDiscountCodesUpdate')) {
      appliedDiscountCodes = body.variables.discountCodes;
    }
  });

  await page.getByRole('button', { name: /Add to Cart/i }).first().click();

  await expect(page.getByRole('dialog', { name: /Shopping cart/i })).toBeVisible();
  expect(appliedDiscountCodes).toEqual(['WELCOME10']);
  await expect(page.getByRole('link', { name: /^Checkout$/i })).toHaveAttribute('href', /discount=WELCOME10/);
});

test('production discount slug WELCOME redirects and stores discount', async ({ page }) => {
  await page.goto('/discount?code=WELCOME&dt_id=0');

  await expect(page).toHaveURL(/\/\?dt_id=0$/);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('shopify_discount_code'))).toBe('WELCOME');
});

test('production discount slug SPRING redirects and stores discount', async ({ page }) => {
  await page.goto('/discount?code=SPRING&utm_source=partner');

  await expect(page.getByText('Applying discount')).toHaveCount(0);
  await expect(page).toHaveURL(/\/\?utm_source=partner$/);
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('shopify_discount_code'))).toBe('SPRING');
});

test('additional production discount slugs redirect and store discounts', async ({ page }) => {
  for (const code of ['SUMMER', 'FALL', 'WINTER']) {
    await page.goto(`/discount?code=${code}&utm_source=partner`);

    await expect(page).toHaveURL(/\/\?utm_source=partner$/);
    await expect.poll(async () => page.evaluate(() => localStorage.getItem('shopify_discount_code'))).toBe(code);
  }
});
