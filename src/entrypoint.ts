// @ts-nocheck  — Alpine store methods use `this` bound to the reactive proxy at runtime;
// TypeScript cannot infer that type from object literals in strict mode.
import type { Alpine } from 'alpinejs';
import intersect from '@alpinejs/intersect';
import { searchProducts } from './lib/cart-client';
import { createCartStore } from './lib/cart-store';

const fmt = (amount: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(amount) || 0);

export default (Alpine: Alpine) => {
  Alpine.plugin(intersect);

  Alpine.store('cart', createCartStore());

  Alpine.store('search', {
    isOpen: false,
    query: '',
    results: [],
    isLoading: false,

    open() {
      this.isOpen = true;
      this.query = '';
      this.results = [];
    },
    close() { this.isOpen = false; },

    submitSearch() {
      const q = this.query.trim();
      if (!q) return;
      window.location.href = `/shop?group=all&search=${encodeURIComponent(q)}`;
    },

    async doSearch() {
      const q = this.query.trim();
      if (!q) { this.results = []; return; }
      this.isLoading = true;
      try {
        this.results = (await searchProducts(q)).slice(0, 3);
      } catch {
        this.results = [];
      } finally {
        this.isLoading = false;
      }
    },

    formatPrice: fmt,
  });
};
