/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PresetImage {
  name: string;
  url: string;
  category: string;
}

export const CATEGORIES = [
  'Roti & Sourdough',
  'Viennoiserie & Croissant',
  'Kue & Tart',
  'Kue Kering & Cookies',
  'Minuman Kopi & Teh'
];

export const PRESET_IMAGES: PresetImage[] = [
  {
    name: 'Sourdough Bread Signature',
    url: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&q=80&w=600',
    category: 'Roti & Sourdough'
  },
  {
    name: 'Butter Croissant Klasik',
    url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=600',
    category: 'Viennoiserie & Croissant'
  },
  {
    name: 'Cinnamon Roll Cream Cheese',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600',
    category: 'Viennoiserie & Croissant'
  },
  {
    name: 'Strawberry Chiffon Cake Mini',
    url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=600',
    category: 'Kue & Tart'
  },
  {
    name: 'Double Chocolate Sea Salt Cookies',
    url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=80&w=600',
    category: 'Kue Kering & Cookies'
  },
  {
    name: 'Premium Cold Brew Latte',
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=600',
    category: 'Minuman Kopi & Teh'
  }
];

export const SAMPLE_PRODUCTS: any[] = [];
