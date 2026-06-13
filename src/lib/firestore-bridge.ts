/**
 * Firestore Bridge — menghubungkan ERP dengan database Firestore yang sama dengan Web Store
 * Kedua aplikasi menggunakan Firebase project: quick-codex-1cf5x (Web Store)
 * 
 * CATATAN: Firebase App untuk Google Auth (Google Sheets) masih pakai project terpisah
 * (near-bakery-store) via firebase.ts. Hanya Firestore yang disatukan ke project Web Store
 * agar ERP dan Web Store berbagi data yang sama.
 */

import { initializeApp } from 'firebase/app';
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
} from 'firebase/firestore';
import { WebStoreConfig, PaymentMethod, BahanBaku, ProductHpp, DetailResep, CalculationResult, Cabang } from '../types';
import { getSavedRecipeImage } from './image-generator';

// Firebase config untuk project Web Store (quick-codex-1cf5x)
// — database yang SAMA digunakan oleh aplikasi Web Store (storenear)
// — Google Auth untuk Sheets tetap pakai project ERP terpisah
const webStoreFirebaseConfig = {
  projectId: 'quick-codex-1cf5x',
  appId: '1:540332291979:web:a7eb10f36506c6830fa18e',
  apiKey: 'AIzaSyCbKLmaJUA2CEtdodtdmhivSaEFPK7bd7I',
  authDomain: 'quick-codex-1cf5x.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-9e420702-3e63-4587-a7e9-2f225c2ac0c6',
  storageBucket: 'quick-codex-1cf5x.firebasestorage.app',
  messagingSenderId: '540332291979',
};

// Inisialisasi Firebase untuk Firestore (project Web Store)
const app = initializeApp(webStoreFirebaseConfig, 'erp-bridge');
export const db = getFirestore(app, webStoreFirebaseConfig.firestoreDatabaseId);

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
  const data = snap.data() as any;
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
        const data = snap.data() as any;
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
    const data = d.data() as any;
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
    productId: `PRD-${calc.namaProduk.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    productInfo: productHpp.find(
      (p) => p.namaProduk.toLowerCase().trim() === calc.namaProduk.toLowerCase().trim()
    ),
  }));

  const existingSnaps = await Promise.all(
    productRefs.map(p => getDoc(doc(db, 'products', p.productId)).catch(() => null))
  );

  // Map productId -> existing data untuk lookup cepat
  const existingDataMap = new Map<string, any>();
  existingSnaps.forEach((snap, i) => {
    if (snap?.exists()) {
      existingDataMap.set(productRefs[i].productId, snap.data());
    }
  });

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

    // Ambil gambar dari ERP image storage (RecipesTab) jika belum ada di Firestore
    if (!displayImage) {
      const savedImage = getSavedRecipeImage(calc.namaProduk);
      if (savedImage && !savedImage.includes('unsplash.com/photo-1546069901')) {
        // Only use if it's a custom saved image, not the generic fallback
        displayImage = savedImage;
      }
    }

    // Dapatkan deskripsi dari productInfo / existing data
    if (!description || description === calc.namaProduk) {
      description = productInfo?.kategori 
        ? `${calc.namaProduk} — ${productInfo.kategori} lezat dari Near Bakery & Co. Dibuat dengan bahan-bahan pilihan berkualitas terbaik.`
        : `${calc.namaProduk} — Lezat dari Near Bakery & Co. Dibuat dengan bahan-bahan pilihan berkualitas terbaik.`;
    }

    // Hitung stok dari bahan baku paling kritis
    const bahanNames = calc.bahanList.map((b) => b.namaBahan.toLowerCase().trim());
    const minStock = Math.min(
      ...bahanNames.map((name) => {
        const bahan = bahanBaku.find((b) => b.nama.toLowerCase().trim() === name);
        return bahan ? Math.floor(bahan.isiKemasan / (calc.bahanList.find((bl) => bl.namaBahan.toLowerCase().trim() === name)?.takaran || 1)) : 0;
      })
    );

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
      stock: Math.max(0, minStock),
      imageUrl: displayImage,
      category: kategori,
      rating: existingData ? (existingData as any).rating || 5.0 : 5.0,
      reviewCount: existingData ? (existingData as any).reviewCount || 0 : 0,
      // HPP & margin TIDAK disinkron ke produk publik — hanya untuk internal ERP
      // Pelanggan web store tidak boleh melihat biaya produksi
      updatedAt: serverTimestamp(),
    });

    synced++;
  }

  if (synced > 0) {
    await batch.commit();
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
      const data = d.data() as any;
      products.push({
        docId: data.id || d.id,
        name: data.name || '',
        price: data.price || 0,
        category: data.category || 'Lainnya',
        stock: data.stock || 0,
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
      const data = snap.data() as any;
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
export interface WebStoreOrder {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl: string;
  }[];
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
          // Track initial status untuk order yang baru masuk
          orderStatusCache.set(change.doc.id, (change.doc.data() as WebStoreOrder).status);
        } else if (change.type === 'modified') {
          const newData = change.doc.data() as WebStoreOrder;
          const prevStatus = orderStatusCache.get(change.doc.id);
          
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
          orderStatusCache.set(change.doc.id, newData.status);
        }
      });
    },
    onError
  );
}

// Local cache untuk melacak status order sebelumnya (untuk deteksi perubahan status)
const orderStatusCache = new Map<string, string>();

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
  const data = snap.data() as any;
  return { cabangId: data.cabangId, cabangNama: data.cabangNama };
}

/** Dapatkan semua mapping subdomain */
export async function getAllSubdomains(): Promise<{ subdomain: string; cabangId: string; cabangNama: string }[]> {
  const colRef = collection(db, 'cabang_subdomains');
  const snap = await getDocs(colRef);
  const results: { subdomain: string; cabangId: string; cabangNama: string }[] = [];
  snap.forEach((d) => {
    const data = d.data() as any;
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
          const data = change.doc.data() as any;
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
      const data = d.data() as any;
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
