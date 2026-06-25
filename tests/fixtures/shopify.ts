import type { Cart } from '../../src/lib/cart-client';
import type { ShopifyProduct } from '../../src/lib/shopify';

export const variantId = 'gid://shopify/ProductVariant/2001';
export const alternateVariantId = 'gid://shopify/ProductVariant/2002';
export const sellingPlanId = 'gid://shopify/SellingPlan/3001';

export const productFixture: ShopifyProduct = {
  id: 'gid://shopify/Product/1001',
  title: 'Starter Ceramic Mug',
  handle: 'ceramic-mug',
  description: 'Starter product fixture',
  availableForSale: true,
  tags: ['Featured'],
  priceRange: { minVariantPrice: { amount: '28.00', currencyCode: 'USD' } },
  images: { edges: [{ node: { url: 'https://cdn.example.com/product.jpg', altText: 'Product image' } }] },
  variants: { edges: [{ node: { id: variantId, title: 'Default Title', price: { amount: '28.00' } } }] },
  collections: { edges: [{ node: { title: 'Featured' } }] },
};

export function rawCart(quantity = 1, id = 'gid://shopify/Cart/cart-1') {
  return {
    id,
    checkoutUrl: 'https://demo-store.myshopify.com/checkouts/cn/test',
    discountCodes: [],
    totalQuantity: quantity,
    lines: {
      edges: quantity > 0 ? [{
        node: {
          id: 'gid://shopify/CartLine/line-1',
          quantity,
          sellingPlanAllocation: null,
          merchandise: {
            id: variantId,
            title: 'Default Title',
            price: { amount: '28.00', currencyCode: 'USD' },
            product: {
              title: 'Starter Ceramic Mug',
              handle: 'ceramic-mug',
              images: { edges: [{ node: { url: 'https://cdn.example.com/product.jpg', altText: 'Product image' } }] },
            },
          },
        },
      }] : [],
    },
    cost: { totalAmount: { amount: (28 * quantity).toFixed(2), currencyCode: 'USD' } },
  };
}

export function cartFixture(quantity = 1): Cart {
  return {
    id: 'gid://shopify/Cart/cart-1',
    checkoutUrl: 'https://demo-store.myshopify.com/checkouts/cn/test',
    discountCodes: [],
    totalQuantity: quantity,
    totalAmount: (28 * quantity).toFixed(2),
    items: quantity > 0 ? [{
      id: 'gid://shopify/CartLine/line-1',
      quantity,
      variantId,
      variantTitle: 'Default Title',
      price: '28.00',
      productTitle: 'Starter Ceramic Mug',
      productHandle: 'ceramic-mug',
      imageUrl: 'https://cdn.example.com/product.jpg',
      imageAlt: 'Product image',
      sellingPlanId: '',
      sellingPlanName: '',
    }] : [],
  };
}
