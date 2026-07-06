import type { Cart } from '../../src/lib/cart-client';
import type { ShopifyProduct } from '../../src/lib/shopify';

export const variantId = 'gid://shopify/ProductVariant/2001';
export const alternateVariantId = 'gid://shopify/ProductVariant/2002';
export const sellingPlanId = 'gid://shopify/SellingPlan/3001';

export const productFixture: ShopifyProduct = {
  id: 'gid://shopify/Product/1001',
  title: 'Cobalt Millefiori Statement Necklace',
  handle: 'cobalt-millefiori-statement-necklace',
  description: 'Restored vintage Murano Millefiori necklace fixture',
  category: { id: 'gid://shopify/TaxonomyCategory/aa-1-13-7', name: 'Necklaces' },
  availableForSale: true,
  tags: ['Vintage', 'Millefiori'],
  priceRange: { minVariantPrice: { amount: '28.00', currencyCode: 'USD' } },
  images: { edges: [{ node: { url: 'https://cdn.example.com/product.jpg', altText: 'Product image' } }] },
  variants: { edges: [{ node: { id: variantId, title: 'Default Title', price: { amount: '28.00' } } }] },
  collections: { edges: [{ node: { title: 'Vintage Millefiori', handle: 'vintage-millefiori' } }] },
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
              title: 'Cobalt Millefiori Statement Necklace',
              handle: 'cobalt-millefiori-statement-necklace',
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
      productTitle: 'Cobalt Millefiori Statement Necklace',
      productHandle: 'cobalt-millefiori-statement-necklace',
      imageUrl: 'https://cdn.example.com/product.jpg',
      imageAlt: 'Product image',
      sellingPlanId: '',
      sellingPlanName: '',
    }] : [],
  };
}
