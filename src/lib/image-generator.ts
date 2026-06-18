/**
 * AI Image Generator — Menggunakan Pollinations AI (GRATIS & UNLIMITED)
 * Menggantikan sistem Unsplash statis dengan AI Generatif sungguhan.
 */

/**
 * Auto-generate a descriptive image prompt from product name + kategori.
 * Menambahkan instruksi "Professional Food Photography" agar hasil estetik.
 */
export function buildAutoPrompt(productName: string, kategori?: string): string {
  const kategoriLabel = kategori || 'Bakery Product';
  
  // Base prompt untuk kualitas profesional
  const qualityStyle = "professional food photography, cinematic lighting, sharp focus, 8k resolution, detailed texture, artisan style, appetizing, high-end bakery aesthetic";
  
  return `${productName} ${kategoriLabel}, ${qualityStyle}`;
}

/**
 * Generates an AI Image URL menggunakan Pollinations AI.
 * Sistem ini GRATIS, tidak butuh API Key, dan menghasilkan gambar baru dari nol.
 */
export function getFoodImageForPrompt(prompt: string): string {
  const cleanPrompt = encodeURIComponent(prompt.trim() || "delicious bakery product professional photography");
  
  // Menggunakan Pollinations AI - Gratis & Tanpa Limit
  // Menambahkan parameter seed random agar setiap generate bisa menghasilkan variasi berbeda
  const seed = Math.floor(Math.random() * 1000000);
  
  // Format URL: https://image.pollinations.ai/prompt/{prompt}?width=1024&height=1024&seed={seed}&nologo=true
  return `https://image.pollinations.ai/prompt/${cleanPrompt}?width=800&height=800&seed=${seed}&nologo=true&model=flux`;
}

/**
 * Persist custom recipe images in localStorage so changes are durable.
 */
export function getSavedRecipeImage(productName: string): string {
  const key = `recipe_img_${productName.toLowerCase().trim()}`;
  const saved = localStorage.getItem(key);
  if (saved) return saved;
  
  // Return placeholder jika belum pernah generate
  return ""; 
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
