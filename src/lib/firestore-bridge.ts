/**
 * Firestore Bridge — menghubungkan ERP dengan database Firestore yang sama dengan Web Store
 * Kedua aplikasi menggunakan Firebase project yang sama: quick-codex-1cf5x
 * Web Store menggunakan database ID: ai-studio-9e420702-3e63-4587-a7e9-2f225c2ac0c6
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
import firebaseConfig from '../../firebase-applet-config.json';
import { WebStoreConfig, PaymentMethod, BahanBaku, ProductHpp, DetailResep, CalculationResult, Cabang } from '../types';
import { getSavedRecipeImage } from './image-generator';

// Inisialisasi Firebase untuk Firestore (sama dengan web store)
const app = initializeApp(firebaseConfig, 'erp-bridge');
const FIRESTORE_DB_ID = 'ai-studio-9e420702-3e63-4587-a7e9-2f225c2ac0c6';
export const db = getFirestore(app, FIRESTORE_DB_ID);

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
  bahanBaku: BahanBaku[]
): Promise<number> {
  let synced = 0;
  const batch = writeBatch(db);

  for (const calc of calculatedProducts) {
    const productId = `PRD-${calc.namaProduk.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    const productInfo = productHpp.find(
      (p) => p.namaProduk.toLowerCase().trim() === calc.namaProduk.toLowerCase().trim()
    );

    // Cari deskripsi & gambar dari berbagai sumber
    let displayImage = '';
    let description = calc.namaProduk;
    let kategori = productInfo?.kategori || 'Lainnya';

    const docRef = doc(db, 'products', productId);
    const existingSnap = await getDoc(docRef);
    if (existingSnap.exists()) {
      const existing = existingSnap.data() as any;
      displayImage = existing.imageUrl || '';
      description = existing.description || calc.namaProduk;
      kategori = existing.category || kategori;
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

    batch.set(docRef, {
      id: productId,
      name: calc.namaProduk,
      description,
      price: Math.round(calc.hargaJualPerPorsi),
      stock: Math.max(0, minStock),
      imageUrl: displayImage,
      category: kategori,
      rating: existingSnap.exists() ? (existingSnap.data() as any).rating || 5.0 : 5.0,
      reviewCount: existingSnap.exists() ? (existingSnap.data() as any).reviewCount || 0 : 0,
      hpp: Math.round(calc.hppPerPorsi),
      margin: Math.round(calc.marginPersen),
      updatedAt: serverTimestamp(),
    });

    synced++;
  }

  if (synced > 0) {
    await batch.commit();
  }

  return synced;
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
