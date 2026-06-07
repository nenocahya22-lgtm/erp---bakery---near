// Premium Unsplash food photography mapping for professional-looking ERP assets
const PREMIUM_FOOD_IMAGES: { keywords: string[]; url: string }[] = [
  // === ROTI & BREAD ===
  {
    keywords: ['roti tawar', 'roti putih', 'roti sandwich', 'bread loaf', 'tawar'],
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['roti sobek', 'roti pull apart', 'sweet bread'],
    url: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['baguette', 'roti eropa', 'roti prancis', 'french bread'],
    url: 'https://images.unsplash.com/photo-1549931319-a545753467c8?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['roti gandum', 'whole wheat', 'roti sehat', 'sourdough'],
    url: 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['roti panggang', 'roti bakar', 'toast'],
    url: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['roti', 'bread', 'gandum'],
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
  },
  // === COKELAT & CHOCOLATE ===
  {
    keywords: ['cokelat', 'chocolate', 'cocoa', 'meses'],
    url: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['lumer', 'molten', 'fondant', 'melted'],
    url: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['truffle', 'praline', 'bonbon'],
    url: 'https://images.unsplash.com/photo-1548907040-4baa42d10919?w=600&auto=format&fit=crop&q=80',
  },
  // === CAKE & KUE ===
  {
    keywords: ['kue', 'cake', 'bolu', 'sponge', 'chiffon'],
    url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['tart', 'pie', 'pastry'],
    url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['ulang tahun', 'birthday', 'celebration cake'],
    url: 'https://images.unsplash.com/photo-1562440499-64c9a111f713?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['cheesecake', 'keju cake'],
    url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['cupcake', 'muffin'],
    url: 'https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?w=600&auto=format&fit=crop&q=80',
  },
  // === BROWNIES & PANGGANGAN ===
  {
    keywords: ['brownies', 'bronis'],
    url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['panggang', 'kukus', 'steamed cake'],
    url: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600&auto=format&fit=crop&q=80',
  },
  // === DONAT ===
  {
    keywords: ['donat', 'donut', 'doughnut', 'glaze'],
    url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&auto=format&fit=crop&q=80',
  },
  // === COOKIES & BISKUIT ===
  {
    keywords: ['cookies', 'biskuit', 'choko chip', 'kue kering'],
    url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['nastar', 'kue nastar', 'pineapple tart'],
    url: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80',
  },
  // === KEJU ===
  {
    keywords: ['keju', 'cheese', 'mozzarella', 'cheddar'],
    url: 'https://images.unsplash.com/photo-1486887396153-fa416526c132?w=600&auto=format&fit=crop&q=80',
  },
  // === MINUMAN & DRINKS ===
  {
    keywords: ['kopi', 'coffee', 'espresso'],
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['latte', 'cappuccino', 'latte art'],
    url: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['matcha', 'teh hijau', 'green tea'],
    url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['es krim', 'ice cream', 'gelato'],
    url: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['smoothie', 'juice', 'jus', 'es'],
    url: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?w=600&auto=format&fit=crop&q=80',
  },
  // === BAHAN & INGREDIENTS ===
  {
    keywords: ['susu', 'milk', 'cream', 'butter', 'mentega'],
    url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['strawberry', 'stroberi', 'berry', 'selai'],
    url: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['pisang', 'banana', 'gedang'],
    url: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['pandan', 'hijau', 'coconut', 'kelapa', 'santan'],
    url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['kacang', 'almond', 'nut', 'walnut'],
    url: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&auto=format&fit=crop&q=80',
  },
];

/**
 * Auto-generate a descriptive image prompt from product name + kategori.
 * Used when user doesn't provide a custom prompt.
 */
export function buildAutoPrompt(productName: string, kategori?: string): string {
  const kategoriLabel = kategori || 'Produk';
  const styleHints: Record<string, string> = {
    'Roti': 'bakery bread artisan studio lighting',
    'Cake': 'cake dessert studio photography elegant',
    'Cookies': 'cookies biscuit artisan studio lighting',
    'Coffee': 'coffee beverage latte art studio lighting',
    'Lainnya': 'bakery food professional studio lighting',
  };
  const style = styleHints[kategori || 'Lainnya'] || styleHints['Lainnya'];
  return `${productName} ${style}`;
}

// Generates an elegant culinary image URL deterministically or from the keyword database
export function getFoodImageForPrompt(prompt: string): string {
  const cleanPrompt = prompt.toLowerCase().trim();
  
  if (!cleanPrompt) {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
  }

  // Find dynamic matches based on keywords — prefer most specific match
  let bestMatch: string | null = null;
  let bestScore = 0;
  for (const item of PREMIUM_FOOD_IMAGES) {
    for (const kw of item.keywords) {
      if (cleanPrompt.includes(kw) && kw.length > bestScore) {
        bestScore = kw.length;
        bestMatch = item.url;
      }
    }
  }
  if (bestMatch) return bestMatch;

  // Fallback: deterministic variation based on prompt hash
  return `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80&sig=${Math.abs(hashString(cleanPrompt))}`;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

// Persist custom recipe images in localStorage so changes are durable
export function getSavedRecipeImage(productName: string): string {
  const key = `recipe_img_${productName.toLowerCase().trim()}`;
  const saved = localStorage.getItem(key);
  if (saved) return saved;
  
  // Return default food photo based on the name
  return getFoodImageForPrompt(productName);
}

export function saveRecipeImage(productName: string, imageUrl: string): void {
  const key = `recipe_img_${productName.toLowerCase().trim()}`;
  localStorage.setItem(key, imageUrl);
}

/** Remove a saved recipe image from localStorage, reverting to default. */
export function deleteRecipeImage(productName: string): void {
  const key = `recipe_img_${productName.toLowerCase().trim()}`;
  localStorage.removeItem(key);
}
