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

export const SAMPLE_PRODUCTS = [
  {
    name: 'Sourdough Bread Signature',
    description: 'Roti Sourdough ragi alami klasik khas Near Bakery & Co. Difermentasi lambat selama 24 jam menghasilkan kulit renyah (crusty) dan bagian dalam lembut kenyal (airy crumb) dengan aroma khas ragi liar yang aromatik.',
    price: 45000,
    stock: 15,
    category: 'Roti & Sourdough',
    imageUrl: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&q=80&w=600',
    rating: 4.9,
    reviewCount: 42
  },
  {
    name: 'Butter Croissant Klasik',
    description: 'Croissant mentega Perancis premium berlapis-lapis (laminated dough) rontok saat digigit (flaky). Menggunakan 100% French Normandy Butter asli untuk rasa gurih mentega yang mendalam dan harum.',
    price: 28000,
    stock: 25,
    category: 'Viennoiserie & Croissant',
    imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=600',
    rating: 4.8,
    reviewCount: 68
  },
  {
    name: 'Cinnamon Roll Cream Cheese',
    description: 'Roti gulung kayu manis klasik dengan harum rempah kayu manis bubuk premium pilihan, disiram dengan lelehan cream cheese glaze yang tebal, gurih, dan legit.',
    price: 32000,
    stock: 12,
    category: 'Viennoiserie & Croissant',
    imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600',
    rating: 4.8,
    reviewCount: 26
  },
  {
    name: 'Strawberry Chiffon Cake Mini',
    description: 'Kue sifon stroberi super lembut, ringan bagai awan, dipadukan dengan krim segar vanilla ringan dan potongan stroberi segar asam-manis lokal Lembang pilihan.',
    price: 85000,
    stock: 8,
    category: 'Kue & Tart',
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=600',
    rating: 4.7,
    reviewCount: 19
  },
  {
    name: 'Double Chocolate Sea Salt Cookies',
    description: 'Soft cookies premium bercita rasa cokelat hitam Belgia ganda yang padat, dengan taburan kristal garam laut (sea salt Maldon) di atasnya untuk sensasi manis-gurih yang lumer di mulut.',
    price: 22000,
    stock: 40,
    category: 'Kue Kering & Cookies',
    imageUrl: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&q=80&w=600',
    rating: 4.9,
    reviewCount: 35
  },
  {
    name: 'Premium Cold Brew Latte',
    description: 'Racikan kopi espresso arabika dingin premium dingin khas barista kami, dipadukan dengan susu segar rendah lemak bertekstur kental manis seimbang untuk menemani sajian roti.',
    price: 30000,
    stock: 30,
    category: 'Minuman Kopi & Teh',
    imageUrl: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=600',
    rating: 4.9,
    reviewCount: 51
  }
];
