// Premium Unsplash food photography mapping for professional-looking ERP assets
const PREMIUM_FOOD_IMAGES: { keywords: string[]; url: string }[] = [
  {
    keywords: ['roti', 'bread', 'tawar', 'sobek', 'gandum', 'baguette'],
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['cokelat', 'chocolate', 'cocoa', 'lumer', 'meses'],
    url: 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['kue', 'cake', 'bolu', 'tart', 'sponge', 'chiffon', 'ulang tahun'],
    url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['brownies', 'bronis', 'panggang', 'kukus'],
    url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['donat', 'donut', 'doughnut', 'glaze'],
    url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['cookies', 'biskuit', 'choko chip', 'kue kering', 'nastar'],
    url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['keju', 'cheese', 'mozzarella', 'cheddar'],
    url: 'https://images.unsplash.com/photo-1486887396153-fa416526c132?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['kopi', 'coffee', 'espresso', 'latte', 'cappuccino'],
    url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['matcha', 'teh hijau', 'green tea'],
    url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80',
  },
  {
    keywords: ['susu', 'milk', 'keju', 'crim', 'cream', 'butter', 'mentega'],
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
];

// Generates an elegant culinary image URL deterministically or from the keyword database
export function getFoodImageForPrompt(prompt: string): string {
  const cleanPrompt = prompt.toLowerCase().trim();
  
  if (!cleanPrompt) {
    return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';
  }

  // Find dynamic matches based on keywords
  for (const item of PREMIUM_FOOD_IMAGES) {
    if (item.keywords.some(kw => cleanPrompt.includes(kw))) {
      return item.url;
    }
  }

  // Fallback to beautiful default recipes photorealistic culinary art with Picsum or SourceUnsplash search helper
  // Since we want dynamic, elegant variation, we construct a high-quality food-themed Source Unsplash link:
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
