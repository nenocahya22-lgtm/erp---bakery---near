/**
 * Script diagnostik untuk mengecek data Firestore yang sebenarnya
 * Jalankan: npx tsx api/check-firestore-data.ts
 * Atau: node --loader ts-node/esm api/check-firestore-data.ts
 * 
 * Mengecek collection: webstore_config, products, categories
 */

const PROJECT_ID = 'near-bakery-store';
const API_KEY = 'AIzaSyDAoTZXv7H849mwP4A29_Ohhbri7_ztLm4';

// Gunakan Firestore REST API langsung — tidak perlu SDK
interface DocResult {
  name: string;
  fields?: Record<string, any>;
  createTime?: string;
  updateTime?: string;
}

async function fetchCollection(collectionPath: string): Promise<DocResult[]> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionPath}?key=${API_KEY}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ⚠️ Collection ${collectionPath}: HTTP ${res.status} ${res.statusText}`);
      const body = await res.text();
      console.warn(`     ${body.substring(0, 300)}`);
      return [];
    }
    const data = await res.json();
    if (!data.documents) return [];
    return data.documents;
  } catch (e: any) {
    console.warn(`  ⚠️ Error fetching ${collectionPath}: ${e.message}`);
    return [];
  }
}

function extractFields(fields?: Record<string, any>): Record<string, any> {
  if (!fields) return {};
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value.stringValue !== undefined) result[key] = value.stringValue;
    else if (value.integerValue !== undefined) result[key] = parseInt(value.integerValue);
    else if (value.booleanValue !== undefined) result[key] = value.booleanValue;
    else if (value.doubleValue !== undefined) result[key] = value.doubleValue;
    else if (value.arrayValue?.values) {
      result[key] = value.arrayValue.values.map((v: any) => {
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.integerValue !== undefined) return parseInt(v.integerValue);
        if (v.booleanValue !== undefined) return v.booleanValue;
        if (v.mapValue?.fields) return extractFields(v.mapValue.fields);
        return v;
      });
    }
    else if (value.mapValue?.fields) result[key] = extractFields(value.mapValue.fields);
    else if (value.timestampValue) result[key] = value.timestampValue;
    else result[key] = value;
  }
  return result;
}

function printSeparator(title: string) {
  console.log('\n' + '='.repeat(70));
  console.log(`  ${title}`);
  console.log('='.repeat(70));
}

async function main() {
  console.log('🔥 FIRESTORE DIAGNOSTIC — near-bakery-store');
  console.log('   Mengecek data yang sebenarnya ada di database...\n');

  // 1. Cek webstore_config
  printSeparator('📄 COLLECTION: webstore_config');
  const wsConfigs = await fetchCollection('webstore_config');
  if (wsConfigs.length === 0) {
    console.log('  ❌ Tidak ada dokumen webstore_config!');
  }
  for (const doc of wsConfigs) {
    const docId = doc.name.split('/').pop();
    const data = extractFields(doc.fields);
    console.log(`\n  📄 Document: ${docId}`);
    console.log(`     storeName: ${data.storeName || 'N/A'}`);
    
    // Products
    const products = data.products || [];
    console.log(`     products: ${products.length} item`);
    products.forEach((p: any, i: number) => {
      const name = typeof p === 'string' ? p : p.productName || 'N/A';
      const active = typeof p === 'object' ? (p.active !== false ? '✅' : '❌ nonaktif') : '?';
      const image = typeof p === 'object' && p.displayImage ? `🖼️ ${p.displayImage.substring(0, 30)}...` : '🚫 no image';
      const kategori = typeof p === 'object' ? p.kategori || 'N/A' : 'N/A';
      const stock = typeof p === 'object' ? (p.stock !== undefined ? p.stock : 'not set') : 'N/A';
      const madeToOrder = typeof p === 'object' ? p.madeToOrder : 'N/A';
      console.log(`     [${i}] ${name} | ${active} | kategori: ${kategori} | image: ${image} | stock: ${stock}`);
    });
    
    // Categories
    const categories = data.categories || [];
    console.log(`     categories: [${categories.join(', ')}]`);
    console.log(`     madeToOrder: ${data.madeToOrder}`);
    console.log(`     lastUpdated: ${data.lastUpdated || data.updatedAt || 'N/A'}`);
  }

  // 2. Cek collection products
  printSeparator('📦 COLLECTION: products');
  const products = await fetchCollection('products');
  console.log(`  Total dokumen: ${products.length}`);
  for (const doc of products) {
    const docId = doc.name.split('/').pop();
    const data = extractFields(doc.fields);
    console.log(`\n  📄 ${docId}`);
    console.log(`     name: ${data.name || 'N/A'}`);
    console.log(`     price: ${data.price || 0}`);
    console.log(`     category: ${data.category || 'N/A'}`);
    console.log(`     stock: ${data.stock !== undefined ? data.stock : '❌ NOT SET'}`);
    console.log(`     madeToOrder: ${data.madeToOrder}`);
    console.log(`     imageUrl: ${data.imageUrl ? `🖼️ ${data.imageUrl.substring(0, 40)}...` : '🚫 no image'}`);
    console.log(`     updatedAt: ${data.updatedAt || 'N/A'}`);
  }

  // 3. Cek collection categories
  printSeparator('📂 COLLECTION: categories');
  const cats = await fetchCollection('categories');
  console.log(`  Total dokumen: ${cats.length}`);
  for (const doc of cats) {
    const docId = doc.name.split('/').pop();
    const data = extractFields(doc.fields);
    console.log(`\n  📄 Document: ${docId}`);
    console.log(`     categories: [${(data.categories || []).join(', ')}]`);
  }

  // 4. Cek collection erp_sync_log (jika ada)
  printSeparator('🔍 CHECKING ADDITIONAL COLLECTIONS');
  
  // Cari dokumen dengan name yang mengandung "pusat" di berbagai collection
  for (const doc of wsConfigs) {
    const data = extractFields(doc.fields);
    const products = data.products || [];
    // Cek apakah ada produk yang tidak aktif/harus dihapus tapi masih muncul
    const inactiveProducts = products.filter((p: any) => p.active === false);
    if (inactiveProducts.length > 0) {
      console.log(`\n  ⚠️ ${inactiveProducts.length} produk nonaktif di webstore_config:`);
      inactiveProducts.forEach((p: any) => console.log(`     - ${p.productName}`));
    }
  }

  // 5. Ringkasan masalah
  printSeparator('📋 RINGKASAN MASALAH');
  
  // Masalah 1: Produk di 'products' collection vs webstore_config
  const wsConfigProducts = wsConfigs.length > 0 
    ? (extractFields(wsConfigs[0].fields).products || []) 
    : [];
  const wsProductNames = new Set(
    wsConfigProducts.map((p: any) => (p.productName || '').toLowerCase().trim())
  );
  const staleProducts = products.filter(doc => {
    const data = extractFields(doc.fields);
    return !wsProductNames.has((data.name || '').toLowerCase().trim());
  });
  
  console.log(`\n  🔴 Produk di 'products' collection TAPI tidak ada di webstore_config (STALE): ${staleProducts.length}`);
  staleProducts.forEach(p => {
    const data = extractFields(p.fields);
    console.log(`     - ${data.name} (${data.category || 'N/A'}) | stock: ${data.stock}`);
  });

  // Masalah 2: Status habis — cek produk tanpa field stock
  const noStockProducts = products.filter(doc => {
    const data = extractFields(doc.fields);
    return data.stock === undefined || data.stock === null;
  });
  console.log(`\n  🟡 Produk tanpa field 'stock' (web store akan baca sebagai 0/habis): ${noStockProducts.length}`);
  noStockProducts.forEach(p => {
    const data = extractFields(p.fields);
    console.log(`     - ${data.name} | madeToOrder: ${data.madeToOrder}`);
  });

  // Masalah 3: Produk dengan image tapi tidak ada di ERP
  const productsWithImages = products.filter(doc => {
    const data = extractFields(doc.fields);
    return data.imageUrl && data.imageUrl.length > 0;
  });
  console.log(`\n  🖼️ Produk dengan gambar: ${productsWithImages.length}`);
  productsWithImages.forEach(p => {
    const data = extractFields(p.fields);
    console.log(`     - ${data.name}: imageUrl ada (${data.imageUrl.substring(0, 20)}...)`);
  });

  console.log('\n✅ Diagnostik selesai!\n');
}

main().catch(console.error);
