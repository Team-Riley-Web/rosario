const importEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const processEnv = typeof process === 'undefined' ? {} : process.env;
const env = { ...importEnv, ...processEnv };

function getEnvValue(keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = env[key]?.trim();
    if (value && value !== 'your-store.myshopify.com') return value;
  }

  return fallback;
}

const USE_MOCKS = env.SHOPIFY_USE_MOCKS === 'true' || env.PUBLIC_SHOPIFY_USE_MOCKS === 'true';
const SHOULD_THROW_SHOPIFY_ERRORS =
  !USE_MOCKS && (env.NETLIFY === 'true' || env.CONTEXT === 'production' || env.SHOPIFY_STRICT_FETCH === 'true');

export const SHOPIFY_DOMAIN = getEnvValue(['SHOPIFY_STORE_DOMAIN', 'PUBLIC_SHOPIFY_STORE_DOMAIN'], 'your-store.myshopify.com');
const STOREFRONT_TOKEN = getEnvValue(['SHOPIFY_STOREFRONT_TOKEN', 'PUBLIC_SHOPIFY_STOREFRONT_TOKEN']);
const API_VERSION = getEnvValue(['SHOPIFY_API_VERSION', 'PUBLIC_SHOPIFY_API_VERSION'], '2026-01');
export const FEATURED_COLLECTION_HANDLE = 'best-sellers';

export const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

function handleShopifyError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);

  if (SHOULD_THROW_SHOPIFY_ERRORS) {
    throw new Error(`${context}: ${message}`);
  }

  console.warn(`${context}:`, message);
}

export async function shopifyFetch<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  if (SHOPIFY_DOMAIN === 'your-store.myshopify.com' && !USE_MOCKS) {
    throw new Error('Missing Shopify store domain');
  }

  if (!STOREFRONT_TOKEN && !USE_MOCKS) {
    throw new Error('Missing Shopify Storefront API token');
  }

  const res = await fetch(STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`Shopify API error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data as T;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  category: { id: string; name: string } | null;
  availableForSale: boolean;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
  };
  images: { edges: Array<{ node: { url: string; altText: string | null } }> };
  variants: { edges: Array<{ node: { id: string; title: string; price: { amount: string } } }> };
  tags: string[];
  collections: { edges: Array<{ node: { title: string; handle: string } }> };
}

export interface ShopifyProductDetail extends Omit<ShopifyProduct, 'priceRange' | 'variants' | 'images'> {
  descriptionHtml: string;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  options?: Array<{ name: string; values: string[] }>;
  images: { edges: Array<{ node: { url: string; altText: string | null } }> };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: { amount: string };
        availableForSale: boolean;
        sellingPlanAllocations?: {
          edges: Array<{
            node: {
              sellingPlan: {
                id: string;
                name: string;
                description: string | null;
                recurringDeliveries: boolean;
                options: Array<{ name: string; value: string }>;
              };
              priceAdjustments: Array<{
                price: { amount: string; currencyCode: string };
                compareAtPrice: { amount: string; currencyCode: string } | null;
                perDeliveryPrice: { amount: string; currencyCode: string };
              }>;
            };
          }>;
        };
      };
    }>;
  };
  sellingPlanGroups?: {
    edges: Array<{
      node: {
        name: string;
        options: Array<{ name: string; values: string[] }>;
        sellingPlans: {
          edges: Array<{
            node: {
              id: string;
              name: string;
              description: string | null;
              recurringDeliveries: boolean;
              options: Array<{ name: string; value: string }>;
            };
          }>;
        };
      };
    }>;
  };
  relatedProducts?: ShopifyProduct[];
}

function isRetailProduct(product: ShopifyProduct): boolean {
  const productText = [product.title, product.handle, product.description, ...product.tags]
    .join(' ')
    .toLowerCase();

  if (
    productText.includes('back bar') ||
    productText.includes('wholesale') ||
    productText.includes('whole sale')
  ) {
    return false;
  }

  const collections = product.collections.edges.map(({ node }) => `${node.title} ${node.handle}`.toLowerCase());
  if (collections.length > 0 && collections.every((c) => c.includes('wholesale') || c.includes('back bar'))) {
    return false;
  }

  return true;
}

function filterRetailProducts(products: ShopifyProduct[]): ShopifyProduct[] {
  return products.filter(isRetailProduct);
}

const PRODUCT_FIELDS = `
  id
  title
  handle
  description
  category {
    id
    name
  }
  availableForSale
  tags
  priceRange {
    minVariantPrice { amount currencyCode }
  }
  images(first: 2) {
    edges { node { url altText } }
  }
  variants(first: 1) {
    edges { node { id title price { amount } } }
  }
  collections(first: 10) {
    edges { node { title handle } }
  }
`;

function getMockProducts(): ShopifyProduct[] {
  return [
    {
      id: 'gid://shopify/Product/1001',
      title: 'Cobalt Millefiori Statement Necklace',
      handle: 'cobalt-millefiori-statement-necklace',
      description: 'Restored vintage Murano Millefiori glass with a bold cobalt palette.',
      category: { id: 'gid://shopify/TaxonomyCategory/aa-1-13-7', name: 'Necklaces' },
      availableForSale: true,
      tags: ['Vintage', 'Millefiori'],
      priceRange: { minVariantPrice: { amount: '328.00', currencyCode: 'USD' } },
      images: { edges: [{ node: { url: '/favicon.svg', altText: 'Cobalt Millefiori Statement Necklace' } }] },
      variants: {
        edges: [{ node: { id: 'gid://shopify/ProductVariant/2001', title: 'Default Title', price: { amount: '328.00' } } }],
      },
      collections: { edges: [{ node: { title: 'Vintage Millefiori', handle: 'vintage-millefiori' } }] },
    },
    {
      id: 'gid://shopify/Product/1002',
      title: 'Emerald Moretti Glass Bracelet',
      handle: 'emerald-moretti-glass-bracelet',
      description: 'Signature design made with glass beads sourced through the Moretti partnership.',
      category: { id: 'gid://shopify/TaxonomyCategory/aa-1-13-2', name: 'Bracelets' },
      availableForSale: true,
      tags: ['Signature Moretti'],
      priceRange: { minVariantPrice: { amount: '246.00', currencyCode: 'USD' } },
      images: { edges: [{ node: { url: '/favicon.svg', altText: 'Emerald Moretti Glass Bracelet' } }] },
      variants: {
        edges: [{ node: { id: 'gid://shopify/ProductVariant/2002', title: 'Default Title', price: { amount: '246.00' } } }],
      },
      collections: { edges: [{ node: { title: 'Signature Moretti Designs', handle: 'signature-moretti-designs' } }] },
    },
    {
      id: 'gid://shopify/Product/1003',
      title: 'Ruby Uncirculated Vintage Pendant',
      handle: 'ruby-uncirculated-vintage-pendant',
      description: 'Rare uncirculated vintage glass sourced through European supplier relationships.',
      category: { id: 'gid://shopify/TaxonomyCategory/aa-1-13-7', name: 'Necklaces' },
      availableForSale: false,
      tags: ['Uncirculated Vintage'],
      priceRange: { minVariantPrice: { amount: '198.00', currencyCode: 'USD' } },
      images: { edges: [{ node: { url: '/favicon.svg', altText: 'Ruby Uncirculated Vintage Pendant' } }] },
      variants: {
        edges: [{ node: { id: 'gid://shopify/ProductVariant/2003', title: 'Default Title', price: { amount: '198.00' } } }],
      },
      collections: { edges: [{ node: { title: 'Uncirculated Vintage Finds', handle: 'uncirculated-vintage-finds' } }] },
    },
    {
      id: 'gid://shopify/Product/1004',
      title: 'Freshwater Pearl Drop Earrings',
      handle: 'freshwater-pearl-drop-earrings',
      description: 'Freshwater pearls curated with the same sourcing integrity as the Murano pieces.',
      category: { id: 'gid://shopify/TaxonomyCategory/aa-1-13-4', name: 'Earrings' },
      availableForSale: true,
      tags: ['Freshwater Pearls'],
      priceRange: { minVariantPrice: { amount: '124.00', currencyCode: 'USD' } },
      images: { edges: [{ node: { url: '/favicon.svg', altText: 'Freshwater Pearl Drop Earrings' } }] },
      variants: {
        edges: [{ node: { id: 'gid://shopify/ProductVariant/2004', title: 'Default Title', price: { amount: '124.00' } } }],
      },
      collections: { edges: [{ node: { title: 'Freshwater Pearls', handle: 'freshwater-pearls' } }] },
    },
    {
      id: 'gid://shopify/Product/1005',
      title: 'Murano Millefiori Bead Set',
      handle: 'murano-millefiori-bead-set',
      description: 'Authentic Murano Millefiori beads for makers who need materials they can trust.',
      category: null,
      availableForSale: true,
      tags: ['Beads for Makers', 'Millefiori'],
      priceRange: { minVariantPrice: { amount: '62.00', currencyCode: 'USD' } },
      images: { edges: [{ node: { url: '/favicon.svg', altText: 'Murano Millefiori Bead Set' } }] },
      variants: {
        edges: [{ node: { id: 'gid://shopify/ProductVariant/2005', title: 'Default Title', price: { amount: '62.00' } } }],
      },
      collections: { edges: [{ node: { title: 'Beads for Makers', handle: 'beads-for-makers' } }] },
    },
    {
      id: 'gid://shopify/Product/1006',
      title: 'Lampwork Bead Maker Bundle',
      handle: 'lampwork-bead-maker-bundle',
      description: 'A maker-friendly selection of authentic Murano lampwork beads.',
      category: null,
      availableForSale: true,
      tags: ['Beads for Makers', 'Lampwork'],
      priceRange: { minVariantPrice: { amount: '58.00', currencyCode: 'USD' } },
      images: { edges: [{ node: { url: '/favicon.svg', altText: 'Lampwork Bead Maker Bundle' } }] },
      variants: {
        edges: [{ node: { id: 'gid://shopify/ProductVariant/2006', title: 'Default Title', price: { amount: '58.00' } } }],
      },
      collections: { edges: [{ node: { title: 'Beads for Makers', handle: 'beads-for-makers' } }] },
    },
    {
      id: 'gid://shopify/Product/1007',
      title: 'Amber Restored Millefiori Necklace',
      handle: 'amber-restored-millefiori-necklace',
      description: 'Restored vintage Millefiori glass with warm amber and gold tones.',
      category: { id: 'gid://shopify/TaxonomyCategory/aa-1-13-7', name: 'Necklaces' },
      availableForSale: true,
      tags: ['Vintage', 'Millefiori'],
      priceRange: { minVariantPrice: { amount: '344.00', currencyCode: 'USD' } },
      images: { edges: [{ node: { url: '/favicon.svg', altText: 'Amber Restored Millefiori Necklace' } }] },
      variants: {
        edges: [{ node: { id: 'gid://shopify/ProductVariant/2007', title: 'Default Title', price: { amount: '344.00' } } }],
      },
      collections: { edges: [{ node: { title: 'Vintage Millefiori', handle: 'vintage-millefiori' } }] },
    },
  ];
}

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String, $sortKey: ProductSortKeys) {
    products(first: $first, after: $after, sortKey: $sortKey, query: "NOT tag:wholesale") {
      edges {
        cursor
        node {
          ${PRODUCT_FIELDS}
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

const COLLECTION_PRODUCTS_QUERY = `
  query GetCollectionProducts($handle: String!, $first: Int!) {
    collection(handle: $handle) {
      products(first: $first) {
        edges {
          node {
            ${PRODUCT_FIELDS}
          }
        }
      }
    }
  }
`;

const PRODUCT_BY_HANDLE_LISTING_QUERY = `
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      ${PRODUCT_FIELDS}
    }
  }
`;

export async function getProducts(first = 24, sortKey = 'BEST_SELLING'): Promise<ShopifyProduct[]> {
  if (USE_MOCKS) return getMockProducts().slice(0, first);

  try {
    const data = await shopifyFetch<{ products: { edges: Array<{ node: ShopifyProduct }> } }>(
      PRODUCTS_QUERY,
      { first, after: null, sortKey }
    );
    return filterRetailProducts(data.products.edges.map(e => e.node));
  } catch (error) {
    handleShopifyError('Shopify products fetch failed', error);
    return [];
  }
}

export async function getAllProducts(sortKey = 'BEST_SELLING'): Promise<ShopifyProduct[]> {
  if (USE_MOCKS) return getMockProducts();

  const products: ShopifyProduct[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    try {
      const data = await shopifyFetch<{
        products: {
          edges: Array<{ node: ShopifyProduct }>;
          pageInfo: { hasNextPage: boolean; endCursor: string | null };
        };
      }>(
        PRODUCTS_QUERY,
        { first: 100, after, sortKey }
      );

      products.push(...data.products.edges.map(e => e.node));
      hasNextPage = data.products.pageInfo.hasNextPage;
      after = data.products.pageInfo.endCursor;
    } catch (error) {
      handleShopifyError('Shopify all-products fetch failed', error);
      return filterRetailProducts(products);
    }
  }

  return filterRetailProducts(products);
}

export async function getCollectionProducts(handle: string, first = 24): Promise<ShopifyProduct[]> {
  if (USE_MOCKS) return getMockProducts().filter(product => {
    const text = product.collections.edges.map(({ node }) => node.title.toLowerCase()).join(' ');
    return handle === 'featured' || handle === FEATURED_COLLECTION_HANDLE || text.includes(handle.toLowerCase());
  }).slice(0, first);

  try {
    const data = await shopifyFetch<{
      collection: { products: { edges: Array<{ node: ShopifyProduct }> } } | null;
    }>(
      COLLECTION_PRODUCTS_QUERY,
      { handle, first }
    );
    return filterRetailProducts(data.collection?.products.edges.map(e => e.node) ?? []);
  } catch (error) {
    handleShopifyError('Shopify collection fetch failed', error);
    return [];
  }
}

export async function getProductsByHandles(handles: readonly string[]): Promise<ShopifyProduct[]> {
  if (USE_MOCKS) {
    const products = getMockProducts();
    return handles
      .map(handle => products.find(product => product.handle === handle))
      .filter((product): product is ShopifyProduct => Boolean(product));
  }

  const products = await Promise.all(handles.map(async (handle) => {
    try {
      const data = await shopifyFetch<{ product: ShopifyProduct | null }>(
        PRODUCT_BY_HANDLE_LISTING_QUERY,
        { handle }
      );
      return data.product;
    } catch (error) {
      handleShopifyError(`Shopify product fetch failed for ${handle}`, error);
      return null;
    }
  }));

  return products.filter((product): product is ShopifyProduct => Boolean(product));
}

export async function getFeaturedProducts(): Promise<ShopifyProduct[]> {
  const collectionProducts = await getCollectionProducts(FEATURED_COLLECTION_HANDLE, 24);
  if (collectionProducts.length >= 4) return collectionProducts;

  const fallbackProducts = await getProducts(24);
  const featuredProductIds = new Set(collectionProducts.map(product => product.id));
  const uniqueFallbackProducts = fallbackProducts.filter(product => !featuredProductIds.has(product.id));

  return [...collectionProducts, ...uniqueFallbackProducts].slice(0, 24);
}

export function formatPrice(amount: string, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parseFloat(amount));
}

const PRODUCT_DETAIL_QUERY = `
  query GetProduct($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      description
      descriptionHtml
      category {
        id
        name
      }
      availableForSale
      tags
      priceRange {
        minVariantPrice { amount currencyCode }
        maxVariantPrice { amount currencyCode }
      }
      options {
        name
        values
      }
      images(first: 8) {
        edges { node { url altText } }
      }
      variants(first: 20) {
        edges {
          node {
            id
            title
            availableForSale
            price { amount }
            sellingPlanAllocations(first: 10) {
              edges {
                node {
                  sellingPlan {
                    id
                    name
                    description
                    recurringDeliveries
                    options { name value }
                  }
                  priceAdjustments {
                    price { amount currencyCode }
                    compareAtPrice { amount currencyCode }
                    perDeliveryPrice { amount currencyCode }
                  }
                }
              }
            }
          }
        }
      }
      sellingPlanGroups(first: 10) {
        edges {
          node {
            name
            options { name values }
            sellingPlans(first: 10) {
              edges {
                node {
                  id
                  name
                  description
                  recurringDeliveries
                  options { name value }
                }
              }
            }
          }
        }
      }
      metafield(namespace: "custom", key: "related_products") {
        references(first: 4) {
          edges {
            node {
              ... on Product {
                ${PRODUCT_FIELDS}
              }
            }
          }
        }
      }
      collections(first: 10) {
        edges { node { title handle } }
      }
    }
  }
`;

export async function getProductByHandle(handle: string): Promise<ShopifyProductDetail | null> {
  if (USE_MOCKS) {
    const mock = getMockProducts().find(p => p.handle === handle);
    if (!mock) return null;
    return {
      ...mock,
      descriptionHtml: `<p>${mock.description}</p>`,
      priceRange: {
        ...mock.priceRange,
        maxVariantPrice: mock.priceRange.minVariantPrice,
      },
      images: mock.images,
      variants: {
        edges: mock.variants.edges.map(e => ({
          node: { ...e.node, availableForSale: mock.availableForSale },
        })),
      },
    };
  }

  try {
    const data = await shopifyFetch<{ product: ShopifyProductDetail | null }>(
      PRODUCT_DETAIL_QUERY,
      { handle }
    );
    if (!data.product) return null;
    const rawReferences = (data.product as ShopifyProductDetail & {
      metafield?: { references?: { edges: Array<{ node: ShopifyProduct }> } } | null;
    }).metafield?.references?.edges.map(({ node }) => node) ?? [];

    return {
      ...data.product,
      relatedProducts: filterRetailProducts(rawReferences),
    };
  } catch (error) {
    handleShopifyError(`Shopify product detail fetch failed for ${handle}`, error);
    return null;
  }
}
