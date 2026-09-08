import { describe, expect, it, vi } from 'vitest';
import {
  getFeaturedProducts,
  getShopProductPriority,
  getProducts,
  shopifyFetch,
  sortShopProductsForDisplay,
} from '../../src/lib/shopify';
import { productFixture, variantId } from '../fixtures/shopify';

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok,
    status,
    json: async () => body,
  })));
}

describe('Shopify product utilities', () => {
  it('orders Moretti jewelry first and the requested Murano pendant family last', () => {
    const morettiNecklace = {
      ...productFixture,
      id: 'gid://shopify/Product/moretti-necklace',
      title: 'Zinnia Moretti Necklace',
      handle: 'zinnia-moretti-necklace',
      tags: ['Ercole Moretti'],
    };
    const standardProduct = {
      ...productFixture,
      id: 'gid://shopify/Product/standard',
      title: 'Amber Pearl Bracelet',
      handle: 'amber-pearl-bracelet',
      category: { id: 'gid://shopify/TaxonomyCategory/bracelets', name: 'Bracelets' },
      tags: ['Pearls'],
    };
    const picturedPendant = {
      ...productFixture,
      id: 'gid://shopify/Product/pictured-pendant',
      title: 'Aardvark Handmade Iridescent Murano Pendant',
      handle: 'aardvark-handmade-iridescent-murano-pendant',
      tags: ['Fine Murano', 'Sterling Silver Box', 'Venetian Jewelry'],
    };

    const original = [picturedPendant, standardProduct, morettiNecklace];
    const sorted = sortShopProductsForDisplay(original);

    expect(sorted.map(product => product.id)).toEqual([
      morettiNecklace.id,
      standardProduct.id,
      picturedPendant.id,
    ]);
    expect(original[0].id).toBe(picturedPendant.id);
    expect(getShopProductPriority(morettiNecklace)).toBe(0);
    expect(getShopProductPriority(standardProduct)).toBe(1);
    expect(getShopProductPriority(picturedPendant)).toBe(2);
  });

  it('does not treat a loose Moretti bead as a finished Moretti jewelry piece', () => {
    const looseBead = {
      ...productFixture,
      title: 'Rare Ercole Moretti Pointed Oval Bead',
      handle: 'rare-ercole-moretti-pointed-oval-bead',
      category: { id: 'gid://shopify/TaxonomyCategory/jewelry', name: 'Jewelry' },
      tags: ['Ercole Moretti', 'Loose Murano Beads'],
      description: 'This listing is for one bead.',
    };

    expect(getShopProductPriority(looseBead)).toBe(1);
  });

  it('returns expected product fields from a product fetch', async () => {
    mockFetch({ data: { products: { edges: [{ node: productFixture }] } } });

    const products = await getProducts();

    expect(products[0]).toMatchObject({
      id: productFixture.id,
      title: 'Cobalt Millefiori Statement Necklace',
      handle: 'cobalt-millefiori-statement-necklace',
      availableForSale: true,
    });
    expect(products[0].priceRange.minVariantPrice).toEqual({ amount: '28.00', currencyCode: 'USD' });
    expect(products[0].images.edges[0].node.url).toContain('product.jpg');
  });

  it('handles variant IDs without stripping Storefront gid values', async () => {
    mockFetch({ data: { products: { edges: [{ node: productFixture }] } } });

    const products = await getProducts();

    expect(products[0].variants.edges[0].node.id).toBe(variantId);
  });

  it('returns products from the best-sellers Shopify collection', async () => {
    const handles = ['desk-notebook', 'gift-card', 'canvas-pouch'];
    const featuredProducts = handles.map((handle, index) => ({
      ...productFixture,
      id: `gid://shopify/Product/featured-${index}`,
      handle,
    }));

    vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body));
      expect(body.variables.handle).toBe('best-sellers');

      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: { collection: { products: { edges: featuredProducts.map(node => ({ node })) } } },
        }),
      };
    }));

    const products = await getFeaturedProducts();

    expect(products.map(product => product.handle)).toEqual(handles);
  });

  it('falls back to best-selling products when the best-sellers collection is empty', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
      const body = JSON.parse(String((init as RequestInit).body));

      if (body.query.includes('GetCollectionProducts')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: { collection: null },
          }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({
          data: { products: { edges: [{ node: productFixture }] } },
        }),
      };
    }));

    const products = await getFeaturedProducts();

    expect(products.map(product => product.handle)).toEqual(['cobalt-millefiori-statement-necklace']);
  });

  it('throws friendly API errors from shopifyFetch', async () => {
    mockFetch({ errors: [{ message: 'Access denied' }] });

    await expect(shopifyFetch('query Test')).rejects.toThrow('Access denied');
  });

  // A build issues one call per product, so a lone transient 503 used to take
  // the whole deploy with it. Retry the transient cases and only those.
  it('retries a transient 503 and succeeds', async () => {
    const responses = [
      { ok: false, status: 503, json: async () => ({}) },
      { ok: true, status: 200, json: async () => ({ data: { ok: true } }) },
    ];
    const fetchMock = vi.fn(async () => responses.shift());
    vi.stubGlobal('fetch', fetchMock);

    await expect(shopifyFetch('query Test')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('gives up after exhausting attempts on a persistent 503', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(shopifyFetch('query Test')).rejects.toThrow('Shopify API error: 503');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('does not retry a deterministic 400', async () => {
    const fetchMock = vi.fn(async () => ({ ok: false, status: 400, json: async () => ({}) }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(shopifyFetch('query Test')).rejects.toThrow('Shopify API error: 400');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a GraphQL error', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ errors: [{ message: 'Field does not exist' }] }),
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(shopifyFetch('query Test')).rejects.toThrow('Field does not exist');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries when fetch itself rejects', async () => {
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls += 1;
      if (calls === 1) throw new TypeError('network error');
      return { ok: true, status: 200, json: async () => ({ data: { ok: true } }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(shopifyFetch('query Test')).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
