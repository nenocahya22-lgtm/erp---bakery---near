/**
 * Firestore Bridge — menghubungkan ERP dengan database Firestore yang sama dengan Web Store
 * Kedua aplikasi menggunakan Firebase project: near-bakery-store
 * 
 * Project near-bakery-store berisi: chats, orders, products, categories, webstore_config
 * Google Auth untuk Owner Login tetap pakai project yang sama (near-bakery-store).
 */


import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  Timestamp,
  deleteDoc,
  DocumentData,
} from 'firebase/firestore';
import { WebStoreConfig, PaymentMethod, BahanBaku, ProductHpp, DetailResep, CalculationResult, Cabang } from '../types';

// Firebase config untuk project Web Store (near-bakery-store)
// — database yang SAMA digunakan oleh aplikasi Web Store (storenear)
// — Semua data ERP + Web Store disatukan di project yang sama
// Konfigurasi dari environment variables (VITE_* untuk client-side)
const webStoreFirebaseConfig = {
  projectId: import.meta.env.VITE_WEBSTORE_PROJECT_ID || '',
  appId: import.meta.env.VITE_WEBSTORE_APP_ID || '',
  apiKey: import.meta.env.VITE_WEBSTORE_API_KEY || '',
  authDomain: import.meta.env.VITE_WEBSTORE_AUTH_DOMAIN || '',
  storageBucket: import.meta.env.VITE_WEBSTORE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_WEBSTORE_MESSAGING_SENDER_ID || '',
};

// Inisialisasi Firebase untuk Firestore (project Web Store)
// CATATAN: Jika env vars kosong (misal di Vercel tanpa env vars),
// Firebase akan menggunakan config kosong — app tetap render & error
// akan muncul sebagai warning, bukan blank screen.
const _firestoreDbId = (import.meta.env.VITE_WEBSTORE_DATABASE_ID || '').trim();
const app = initializeApp(webStoreFirebaseConfig, 'erp-bridge');
const _useNamedDb = _firestoreDbId.length > 0;
export const db = _useNamedDb
  ? getFirestore(app, _firestoreDbId)
  : getFirestore(app);

// Anonymous Auth — ERP perlu login anonim ke Firebase agar Firestore Rules
// yang require `request.auth != null` (seperti collection chats) bisa diakses.
// Project quick-codex-1cf5x dari AI Studio, kita tidak bisa edit Rules-nya,
// jadi ERP login anonim untuk memenuhi syarat auth.
const _auth = getAuth(app);
signInAnonymously(_auth).catch((err) => {
  console.warn('⚠️ Anonymous auth skipped (chats may not load):', err.message);
});

// ============================================================================
// WEB STORE CONFIG — simpan & baca konfigurasi web store dari Firestore
// ============================================================================

/** Simpan konfigurasi web store ke Firestore (per cabang) */
export async function saveWebStoreConfig(cabangId: string, config: WebStoreConfig): Promise<void> {
  const docRef = doc(db, 'webstore_config', cabangId);
  await setDoc(docRef, {
    ...config,
    cabangId,
    lastUpdated: Timestamp.now(),
    updatedAt: serverTimestamp(),
  });
}

/** Baca konfigurasi web store dari Firestore */
export async function getWebStoreConfig(cabangId: string): Promise<WebStoreConfig | null> {
  const docRef = doc(db, 'webstore_config', cabangId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data() as DocumentData;
  return {
    ...data,
    lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || new Date().toISOString(),
  } as WebStoreConfig;
}

/** Listen real-time ke perubahan webstore_config */
export function listenWebStoreConfig(
  cabangId: string,
  onData: (config: WebStoreConfig) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, 'webstore_config', cabangId);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as DocumentData;
        onData({
          ...data,
          lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || new Date().toISOString(),
        } as WebStoreConfig);
      }
    },
    onError
  );
}

/** Get all web store configs (for all branches) */
export async function getAllWebStoreConfigs(): Promise<{ cabangId: string; config: WebStoreConfig }[]> {
  const colRef = collection(db, 'webstore_config');
  const snap = await getDocs(colRef);
  const results: { cabangId: string; config: WebStoreConfig }[] = [];
  snap.forEach((d) => {
    const data = d.data() as DocumentData;
    results.push({
      cabangId: d.id,
      config: {
        ...data,
        lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || new Date().toISOString(),
      } as WebStoreConfig,
    });
  });
  return results;
}

// ============================================================================
// PRODUCT SYNC — push data produk dari ERP ke Firestore untuk web store
// ============================================================================

/** Sinkronisasi produk dari ERP (HPP + kalkulasi) ke Firestore 'products' collection */
export async function syncProductsToFirestore(
  calculatedProducts: CalculationResult[],
  productHpp: ProductHpp[],
  detailResep: DetailResep[],
  bahanBaku: BahanBaku[],
  cabangId: string = 'pusat'
): Promise<number> {
  let synced = 0;
  const batch = writeBatch(db);

  // Baca webstore config sekali sebelum loop (gambar produk, kategori, diskon)
  let wsProductImages: Record<string, string> = {};
  let wsConfig: WebStoreConfig | null = null;
  try {
    wsConfig = await getWebStoreConfig(cabangId);
    if (wsConfig?.products) {
      wsConfig.products.forEach((p: any) => {
        if (p.displayImage) wsProductImages[p.productName.toLowerCase().trim()] = p.displayImage;
      });
    }
  } catch (e) { /* silent */ }

  // Batch: ambil semua existing products dari Firestore dalam 1 parallel call
  // (daripada sequential getDoc per produk yang lambat untuk >50 produk)
  const productRefs = calculatedProducts.map(calc => ({
    calc,
    productId: hashProductName(calc.namaProduk),
    productInfo: productHpp.find(
      (p) => p.namaProduk.toLowerCase().trim() === calc.namaProduk.toLowerCase().trim()
    ),
  }));

  const existingSnaps = await Promise.all(
    productRefs.map(p => getDoc(doc(db, 'products', p.productId)).catch(() => null))
  );

  // Map productId -> existing data untuk lookup cepat
  const existingDataMap = new Map<string, DocumentData>();
  existingSnaps.forEach((snap, i) => {
    if (snap?.exists()) {
      existingDataMap.set(productRefs[i].productId, snap.data());
    }
  });

  // Legacy migration: cek juga old ID (PRD-nama-produk) untuk produk yang belum migrasi
  await Promise.all(productRefs.map(async (pRef) => {
    const { productId, calc } = pRef;
    if (existingDataMap.has(productId)) return; // Already has new ID
    const oldId = 'PRD-' + calc.namaProduk.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (oldId === productId) return; // Same ID, no migration needed
    try {
      const oldSnap = await getDoc(doc(db, 'products', oldId));
      if (oldSnap.exists()) {
        // Copy legacy data to new ID
        const oldData = oldSnap.data();
        existingDataMap.set(productId, oldData);
        console.log('Migrated legacy product: ' + oldId + ' -> ' + productId);
      }
    } catch (e) { /* silent */ }
  }));

  for (const pRef of productRefs) {
    const { calc, productId, productInfo } = pRef;

    // Cari deskripsi & gambar dari berbagai sumber
    let displayImage = '';
    let description = calc.namaProduk;
    let kategori = productInfo?.kategori || 'Lainnya';

    const existingData = existingDataMap.get(productId);
    if (existingData) {
      displayImage = existingData.imageUrl || '';
      description = existingData.description || calc.namaProduk;
      kategori = existingData.category || kategori;
    }

    // Ambil gambar dari WebStoreConfig (produk images yang diupload di WebStoreManager)
    if (!displayImage) {
      displayImage = wsProductImages[calc.namaProduk.toLowerCase().trim()] || '';
    }

    // Ambil gambar dari ERP image storage (RecipesTab) jika sudah di-save user
    // — hanya pakai gambar yang eksplisit di-generate/di-upload oleh user
    // — jangan pakai fallback Unsplash otomatis dari getSavedRecipeImage
    if (!displayImage) {
      const savedKey = `recipe_img_${calc.namaProduk.toLowerCase().trim()}`;
      const explicitlySaved = localStorage.getItem(savedKey);
      if (explicitlySaved) {
        displayImage = explicitlySaved;
      }
    }

    // Dapatkan deskripsi dari productInfo / existing data
    if (!description || description === calc.namaProduk) {
      description = productInfo?.kategori 
        ? `${calc.namaProduk} — ${productInfo.kategori} lezat dari Near Bakery & Co. Dibuat dengan bahan-bahan pilihan berkualitas terbaik.`
        : `${calc.namaProduk} — Lezat dari Near Bakery & Co. Dibuat dengan bahan-bahan pilihan berkualitas terbaik.`;
    }

    // Cek diskon dari WebStoreConfig
    let discountPercent = 0;
    if (wsConfig?.products) {
      const wsProduct = wsConfig.products.find(
        (p: any) => p.productName.toLowerCase().trim() === calc.namaProduk.toLowerCase().trim()
      );
      if (wsProduct && wsProduct.discountPercent) {
        discountPercent = Math.min(100, Math.max(0, Number(wsProduct.discountPercent)));
      }
    }

    // ─── VARIAN — mapping dari productHpp ke web store ───
    const productWithVariants = productHpp.find(
      (p) => p.namaProduk.toLowerCase().trim() === calc.namaProduk.toLowerCase().trim()
    );
    const webVariants = productWithVariants?.variants
      ?.filter(v => v.active !== false && v.hargaJual > 0)
      .map(v => ({
        id: v.id,
        name: v.name,
        price: v.hargaJual,
        originalPrice: v.hargaJual,
      })) || undefined;

    batch.set(doc(db, 'products', productId), {
      id: productId,
      name: calc.namaProduk,
      description,
      price: Math.round(calc.hargaJualPerPorsi),
      variants: webVariants,
      discountPercent: discountPercent > 0 ? discountPercent : undefined,
      originalPrice: discountPercent > 0 ? Math.round(calc.hargaJualPerPorsi) : undefined,
      // stock: tidak dikirim — Open PO system, pelanggan tidak perlu lihat stok
      imageUrl: displayImage,
      category: kategori,
      rating: existingData?.rating || 5.0,
      reviewCount: existingData?.reviewCount || 0,
      // HPP & margin TIDAK disinkron ke produk publik — hanya untuk internal ERP
      // Pelanggan web store tidak boleh melihat biaya produksi
      updatedAt: serverTimestamp(),
    });

    synced++;
  }

  if (synced > 0) {
    try {
      await batch.commit();
    } catch (commitErr: any) {
      console.error('[Sync Error] Batch commit gagal:', commitErr);
      console.error('[Sync Error] Kode:', commitErr.code);
      console.error('[Sync Error] Pesan:', commitErr.message);
      // Lempar ulang dengan pesan yang lebih jelas
      if (commitErr.code === 'permission-denied') {
        throw new Error('Izin Firestore ditolak. Periksa Firebase Rules atau pastikan Anonymous Auth aktif.');
      } else if (commitErr.code === 'unavailable') {
        throw new Error('Firestore tidak dapat dijangkau. Periksa koneksi internet Anda.');
      } else if (commitErr.code === 'not-found') {
        throw new Error('Project Firestore tidak ditemukan. Periksa konfigurasi VITE_WEBSTORE_* di .env.');
      }
      throw commitErr; // throw asli jika bukan kode yang dikenal
    }
  }

  // ─── SYNC KATEGORI ke collection terpisah agar web store bisa baca ───
  // Firestore sebagai Single Source of Truth: pull kategori existing dulu dari Firestore,
  // lalu merge dengan kategori dari ERP agar tidak ada kategori Web Store yang hilang.
  let catList: string[] = [];
  let catIcons: Record<string, string> = {};
  
  // 🔄 PULL kategori dari Firestore terlebih dahulu
  try {
    const existingCats = await getFirestoreCategories(cabangId);
    if (existingCats && existingCats.categories.length > 0) {
      catList = existingCats.categories;
      catIcons = existingCats.categoryIcons || {};
    }
  } catch (e) { /* silent */ }
  
  let mergedCategories = [...catList];
  
  // 🔄 SCAN kategori dari products collection (Web Store) agar kategori Web Store ikut terdeteksi
  try {
    const prodSnap = await getDocs(collection(db, 'products'));
    const webStoreCategories = new Set<string>();
    prodSnap.forEach(p => {
      const cat = p.data().category;
      if (cat && typeof cat === 'string' && cat.trim()) webStoreCategories.add(cat.trim());
    });
    for (const cat of webStoreCategories) {
      if (!mergedCategories.includes(cat)) {
        mergedCategories.push(cat);
        if (!catIcons[cat]) catIcons[cat] = 'package';
      }
    }
  } catch (e) { /* silent — non-critical */ }
  
  // 🔄 MERGE dengan kategori dari ERP (tambah yang belum ada)
  const erpCategories = [...new Set(productHpp.map(p => p.kategori || 'Lainnya').filter(Boolean))];
  for (const cat of erpCategories) {
    if (!mergedCategories.includes(cat)) {
      mergedCategories.push(cat);
      if (!catIcons[cat]) catIcons[cat] = 'package';
    }
  }
  catList = mergedCategories;
  
  // Fallback ke default jika masih kosong
  if (catList.length === 0) {
    catList = ['Roti & Sourdough', 'Viennoiserie & Croissant', 'Kue & Tart', 'Kue Kering & Cookies', 'Minuman Kopi & Teh'];
    catIcons = {
      'Roti & Sourdough': 'wheat',
      'Viennoiserie & Croissant': 'croissant',
      'Kue & Tart': 'cake',
      'Kue Kering & Cookies': 'cookie',
      'Minuman Kopi & Teh': 'coffee'
    };
  }
  
  try {
    const catDocRef = doc(db, 'categories', cabangId);
    await setDoc(catDocRef, {
      cabangId,
      categories: catList,
      categoryIcons: catIcons,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('Failed to sync categories:', e);
  }

  return synced;
}

// ============================================================================
// PRODUCT FETCH — baca semua produk yang ada di Firestore (dari web store)
// ============================================================================

export interface FirestoreProductSummary {
  docId: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;
  hpp?: number;
  margin?: number;
  discountPercent?: number;
}

/** Ambil semua produk dari collection 'products' di Firestore (web store products) */
export async function getAllFirestoreProducts(): Promise<FirestoreProductSummary[]> {
  try {
    const colRef = collection(db, 'products');
    const snap = await getDocs(colRef);
    const products: FirestoreProductSummary[] = [];
    snap.forEach((d) => {
      const data = d.data() as DocumentData;
      products.push({
        docId: data.id || d.id,
        name: data.name || '',
        price: data.price || 0,
        category: data.category || 'Lainnya',
        imageUrl: data.imageUrl || '',
        hpp: data.hpp || 0,
        margin: data.margin || 0,
        discountPercent: data.discountPercent || 0,
      });
    });
    return products;
  } catch (e) {
    console.warn('Failed to fetch firestore products:', e);
    return [];
  }
}

/** Ambil daftar kategori dari Firestore (collection categories/{cabangId}) — fallback scan products */
export async function getFirestoreCategories(cabangId: string = 'pusat'): Promise<{ categories: string[]; categoryIcons: Record<string, string> } | null> {
  try {
    const docRef = doc(db, 'categories', cabangId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as DocumentData;
      const cats = data.categories || [];
      if (cats.length > 0) {
        return { categories: cats, categoryIcons: data.categoryIcons || {} };
      }
    }
    // Fallback: scan categories dari products collection
    const prodSnap = await getDocs(collection(db, 'products'));
    const catSet = new Set<string>();
    prodSnap.forEach(p => {
      const cat = p.data().category;
      if (cat && typeof cat === 'string' && cat.trim()) catSet.add(cat.trim());
    });
    if (catSet.size > 0) {
      return { categories: [...catSet], categoryIcons: {} };
    }
    return null;
  } catch (e) {
    console.warn('Failed to fetch categories:', e);
    return null;
  }
}

/** Simpan kategori ke Firestore (collection categories/{cabangId}) */
export async function saveCategoriesToFirestore(
  cabangId: string,
  categories: string[],
  categoryIcons: Record<string, string>,
): Promise<void> {
  const catDocRef = doc(db, 'categories', cabangId);
  await setDoc(catDocRef, {
    cabangId,
    categories,
    categoryIcons,
    updatedAt: serverTimestamp(),
  });
}

// ============================================================================
// ORDERS — baca dan listen orders dari web store
// ============================================================================

// Tipe data untuk order dari web store
export interface WebStoreOrderItem {
  /** productId dari Firestore collection 'products' — cocokkan dengan namaProduk di ProductHpp via field `id` */
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
}

export interface WebStoreOrder {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: WebStoreOrderItem[];
  totalAmount: number;
  status: 'Menunggu Pembayaran' | 'Diproses' | 'Dikirim' | 'Selesai' | 'Dibatalkan';
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    postalCode: string;
  };
  paymentMethod: string;
  paymentStatus: 'Belum Bayar' | 'Lunas';
  cabangId?: string;
  createdAt: any;
}

/** Listen real-time untuk orders baru dari web store */
export function listenNewOrders(
  onNewOrder: (order: WebStoreOrder) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, 'orders'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as WebStoreOrder;
          onNewOrder(data);
        }
      });
    },
    onError
  );
}

/** Listen orders untuk cabang tertentu */
export function listenBranchOrders(
  cabangId: string,
  onOrder: (order: WebStoreOrder) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, 'orders'),
    where('cabangId', '==', cabangId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          onOrder(change.doc.data() as WebStoreOrder);
        }
      });
    },
    onError
  );
}

/** Listen perubahan status order — untuk auto-deduct stok saat order diproses/dibayar
 *  Hanya trigger callback ketika status berubah dari 'Menunggu Pembayaran' / 'Belum Bayar'
 *  menjadi 'Diproses' / 'Lunas' / 'Selesai' (pembayaran sudah dikonfirmasi).
 */
export function listenOrderStatusChanges(
  onStatusChange: (order: WebStoreOrder, previousStatus: string) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, 'orders'),
    orderBy('createdAt', 'desc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          orderStatusCache.set(change.doc.id, { status: (change.doc.data() as WebStoreOrder).status, timestamp: Date.now() });
        } else if (change.type === 'modified') {
          const newData = change.doc.data() as WebStoreOrder;
          const prevEntry = orderStatusCache.get(change.doc.id);
          const prevStatus = prevEntry?.status;
          
          if (prevStatus && prevStatus !== newData.status) {
            // Status berubah! Cek apakah dari pending → confirmed
            const pendingStatuses = ['Menunggu Pembayaran', 'Belum Bayar', ''];
            const confirmedStatuses = ['Diproses', 'Lunas', 'Selesai'];
            
            if (pendingStatuses.includes(prevStatus) && confirmedStatuses.includes(newData.status)) {
              // Pembayaran sudah dikonfirmasi! Saatnya deduct stok bahan baku
              onStatusChange(newData, prevStatus);
            }
          }
          
          // Update cache dengan status terbaru
          orderStatusCache.set(change.doc.id, { status: newData.status, timestamp: Date.now() });
        }
      });
    },
    onError
  );
}

// Local cache untuk melacak status order sebelumnya (untuk deteksi perubahan status)
// Auto-flush: hapus entry lebih dari 10 menit agar tidak memory leak
const orderStatusCache = new Map<string, { status: string; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 menit
setInterval(() => {
  const now = Date.now();
  orderStatusCache.forEach((val, key) => {
    if (now - val.timestamp > CACHE_TTL) orderStatusCache.delete(key);
  });
}, 60_000); // cleanup tiap 1 menit

/** Ambil semua orders untuk ditampilkan di dashboard */
export async function getAllOrders(cabangId?: string): Promise<WebStoreOrder[]> {
  const constraints: any[] = [];
  if (cabangId) {
    constraints.push(where('cabangId', '==', cabangId));
  }
  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(100));

  const q = query(collection(db, 'orders'), ...constraints);
  const snap = await getDocs(q);
  const orders: WebStoreOrder[] = [];
  snap.forEach((d) => orders.push(d.data() as WebStoreOrder));
  return orders;
}

// --- HELPER: Stable product ID from name ---
function hashProductName(name: string): string {
  let hash = 0;
  const s = name.toLowerCase().trim();
  for (let i = 0; i < s.length; i++) {
    const chr = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return 'PRD-' + Math.abs(hash).toString(36).padStart(6, '0').slice(0, 8);
}

// --- UPDATE ORDER STATUS di Firestore ---
export async function updateOrderStatus(orderId: string, newStatus: string, paymentStatus?: string): Promise<void> {
  const orderRef = doc(db, 'orders', orderId);
  const updateData: any = { status: newStatus };
  if (paymentStatus) updateData.paymentStatus = paymentStatus;
  await setDoc(orderRef, updateData, { merge: true });
}

// ============================================================================
// SUBDOMAIN MAPPING — mapping subdomain web store ke cabang
// ============================================================================

/** Daftarkan subdomain untuk cabang tertentu */
export async function registerSubdomain(subdomain: string, cabangId: string, cabangNama: string): Promise<void> {
  const docRef = doc(db, 'cabang_subdomains', subdomain);
  await setDoc(docRef, {
    subdomain,
    cabangId,
    cabangNama,
    createdAt: serverTimestamp(),
  });
}

/** Cari cabangId berdasarkan subdomain */
export async function getCabangIdBySubdomain(subdomain: string): Promise<{ cabangId: string; cabangNama: string } | null> {
  const docRef = doc(db, 'cabang_subdomains', subdomain);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  const data = snap.data() as DocumentData;
  return { cabangId: data.cabangId, cabangNama: data.cabangNama };
}

/** Dapatkan semua mapping subdomain */
export async function getAllSubdomains(): Promise<{ subdomain: string; cabangId: string; cabangNama: string }[]> {
  const colRef = collection(db, 'cabang_subdomains');
  const snap = await getDocs(colRef);
  const results: { subdomain: string; cabangId: string; cabangNama: string }[] = [];
  snap.forEach((d) => {
    const data = d.data() as DocumentData;
    results.push({ subdomain: d.id, cabangId: data.cabangId, cabangNama: data.cabangNama });
  });
  return results;
}

// ============================================================================
// NOTIFICATIONS — kirim notifikasi untuk ditampilkan di ERP
// ============================================================================

export interface WebStoreNotification {
  id?: string;
  type: 'new_order' | 'order_updated' | 'order_cancelled' | 'stock_low';
  title: string;
  body: string;
  orderId?: string;
  cabangId?: string;
  cabangNama?: string;
  amount?: number;
  read: boolean;
  createdAt: any;
}

/** Kirim notifikasi ke collection notifications ERP */
export async function sendNotification(notif: Omit<WebStoreNotification, 'id' | 'createdAt'>): Promise<void> {
  const notifRef = doc(collection(db, 'erp_notifications'));
  await setDoc(notifRef, {
    id: notifRef.id,
    ...notif,
    read: false,
    createdAt: serverTimestamp(),
  });
}

/** Listen notifikasi real-time untuk ERP */
export function listenNotifications(
  onNotif: (notif: WebStoreNotification) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, 'erp_notifications'),
    where('read', '==', false),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          onNotif(change.doc.data() as WebStoreNotification);
        }
      });
    },
    onError
  );
}

/** Tandai notifikasi sebagai sudah dibaca */
export async function markNotificationRead(notifId: string): Promise<void> {
  const docRef = doc(db, 'erp_notifications', notifId);
  await setDoc(docRef, { read: true }, { merge: true });
}

// ============================================================================
// CHAT — listen chat dari Web Store (LiveChat) untuk ERP
// ============================================================================

export interface ChatSummary {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerEmail: string;
  lastMessage?: string;
  lastMessageTime?: any;
  unreadBySeller?: boolean;
  unreadByBuyer?: boolean;
}

/** Listen real-time untuk chat rooms baru / update dari Web Store */
export function listenNewChats(
  onChatUpdate: (chat: ChatSummary) => void,
  onError?: (err: Error) => void
) {
  const q = query(
    collection(db, 'chats'),
    orderBy('lastMessageTime', 'desc'),
    limit(20)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const data = change.doc.data() as DocumentData;
          onChatUpdate({
            id: change.doc.id,
            buyerId: data.buyerId,
            buyerName: data.buyerName || 'Pelanggan',
            buyerEmail: data.buyerEmail || '',
            lastMessage: data.lastMessage || '',
            lastMessageTime: data.lastMessageTime,
            unreadBySeller: data.unreadBySeller || false,
            unreadByBuyer: data.unreadByBuyer || false,
          });
        }
      });
    },
    onError
  );
}

/** Ambil semua chat rooms untuk ditampilkan */
export async function getAllChats(): Promise<ChatSummary[]> {
  try {
    const q = query(collection(db, 'chats'), orderBy('lastMessageTime', 'desc'), limit(50));
    const snap = await getDocs(q);
    const chats: ChatSummary[] = [];
    snap.forEach((d) => {
      const data = d.data() as DocumentData;
      chats.push({
        id: d.id,
        buyerId: data.buyerId,
        buyerName: data.buyerName || 'Pelanggan',
        buyerEmail: data.buyerEmail || '',
        lastMessage: data.lastMessage || '',
        lastMessageTime: data.lastMessageTime,
        unreadBySeller: data.unreadBySeller || false,
        unreadByBuyer: data.unreadByBuyer || false,
      });
    });
    return chats;
  } catch (e) {
    console.warn('Failed to fetch chats:', e);
    return [];
  }
}
