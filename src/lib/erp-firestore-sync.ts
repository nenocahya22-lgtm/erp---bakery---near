import { db } from './firestore-bridge';
import {
  doc, getDoc, setDoc, serverTimestamp, Timestamp,
  onSnapshot, collection, query, orderBy, limit,
} from 'firebase/firestore';
import {
  BahanBaku, ProductHpp, DetailResep, Cabang, SuratOrder,
  WasteLog, WriteOffLog, RDExperiment, ProductTopping,
  BranchStock, BranchTransaction,
} from '../types';

const CABANG_ID = 'pusat';

interface ErpDoc<T> {
  items: T[];
  lastUpdated: Timestamp | null;
}

// ─── COLLECTION NAMES ───
const COLLECTIONS = {
  bahanBaku: 'erp_bahan_baku',
  productHpp: 'erp_products',
  detailResep: 'erp_detail_resep',
  cabangList: 'erp_cabang',
  suratOrders: 'erp_surat_orders',
  wasteLogs: 'erp_waste_logs',
  writeOffLogs: 'erp_writeoff_logs',
  rdExperiments: 'erp_rd_experiments',
  toppings: 'erp_toppings',
  cabangStok: 'erp_cabang_stok',
  branchTransactions: 'erp_branch_transactions',
} as const;

type CollectionKey = keyof typeof COLLECTIONS;

// ─── TRACK LAST SYNC TIMESTAMP ───
// Cooldown per-collection (5 detik) mencegah echo-back tanpa blokir perangkat lain
const lastSynced: Record<string, number> = {};

// ─── GENERIC SAVE ───
async function saveToFirestore<T>(key: CollectionKey, items: T[]): Promise<void> {
  try {
    await setDoc(doc(db, COLLECTIONS[key], CABANG_ID), {
      items,
      lastUpdated: serverTimestamp(),
    });
    // Set cooldown 5 detik untuk mencegah echo-back
    // Ini menggantikan global flag isApplyingRemoteUpdate yang memblokir sync antar-perangkat
    lastSynced[key] = Date.now() + 5000;
  } catch (err) {
    console.warn(`Firestore sync error (${key}):`, err);
  }
}

// ─── GENERIC LOAD ───
async function loadFromFirestore<T>(key: CollectionKey): Promise<T[] | null> {
  try {
    const snap = await getDoc(doc(db, COLLECTIONS[key], CABANG_ID));
    if (!snap.exists()) return null;
    const data = snap.data() as ErpDoc<T>;
    if (data.lastUpdated) {
      lastSynced[key] = data.lastUpdated.toMillis?.() || Date.now();
    }
    return data.items || [];
  } catch (err) {
    console.warn(`Firestore load error (${key}):`, err);
    return null;
  }
}

// ─── GENERIC LISTENER ───
function listenFirestore<T>(
  key: CollectionKey,
  onData: (items: T[], fromRemote: boolean) => void,
): () => void {
  const unsub = onSnapshot(
    doc(db, COLLECTIONS[key], CABANG_ID),
    (snap) => {
      if (!snap.exists()) return;

      const data = snap.data() as ErpDoc<T>;
      const remoteTime = data.lastUpdated?.toMillis?.() || 0;
      const localTime = lastSynced[key] || 0;

      // Hanya terapkan jika remote data lebih baru dari cooldown lokal
      // Cooldown 5 detik (set oleh saveToFirestore) mencegah echo-back
      // tanpa memblokir perangkat LAIN yang juga sync
      if (remoteTime > localTime && data.items) {
        lastSynced[key] = remoteTime;
        onData(data.items, true);
      }
    },
    (err) => console.warn(`Firestore listener error (${key}):`, err),
  );
  return unsub;
}

// ─── PUBLIC API ───

export type ErpSyncData = {
  bahanBaku: BahanBaku[];
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  cabangList: Cabang[];
  suratOrders: SuratOrder[];
  wasteLogs: WasteLog[];
  writeOffLogs: WriteOffLog[];
  rdExperiments: RDExperiment[];
  toppings: ProductTopping[];
  cabangStok: BranchStock[];
  branchTransactions: BranchTransaction[];
};

export async function loadAllFromFirestore(): Promise<ErpSyncData | null> {
  const [
    bahanBaku, productHpp, detailResep, cabangList, suratOrders,
    wasteLogs, writeOffLogs, rdExperiments, toppings, cabangStok, branchTransactions,
  ] = await Promise.all([
    loadFromFirestore<BahanBaku>('bahanBaku'),
    loadFromFirestore<ProductHpp>('productHpp'),
    loadFromFirestore<DetailResep>('detailResep'),
    loadFromFirestore<Cabang>('cabangList'),
    loadFromFirestore<SuratOrder>('suratOrders'),
    loadFromFirestore<WasteLog>('wasteLogs'),
    loadFromFirestore<WriteOffLog>('writeOffLogs'),
    loadFromFirestore<RDExperiment>('rdExperiments'),
    loadFromFirestore<ProductTopping>('toppings'),
    loadFromFirestore<BranchStock>('cabangStok'),
    loadFromFirestore<BranchTransaction>('branchTransactions'),
  ]);

  const hasAnyData = bahanBaku || productHpp || detailResep || cabangList ||
    suratOrders || wasteLogs || writeOffLogs || rdExperiments ||
    toppings || cabangStok || branchTransactions;

  if (!hasAnyData) return null;

  return {
    bahanBaku: bahanBaku || [],
    productHpp: productHpp || [],
    detailResep: detailResep || [],
    cabangList: cabangList || [],
    suratOrders: suratOrders || [],
    wasteLogs: wasteLogs || [],
    writeOffLogs: writeOffLogs || [],
    rdExperiments: rdExperiments || [],
    toppings: toppings || [],
    cabangStok: cabangStok || [],
    branchTransactions: branchTransactions || [],
  };
}

export async function saveBahanBaku(items: BahanBaku[]): Promise<void> {
  return saveToFirestore('bahanBaku', items);
}

export async function saveProductHpp(items: ProductHpp[]): Promise<void> {
  return saveToFirestore('productHpp', items);
}

export async function saveDetailResep(items: DetailResep[]): Promise<void> {
  return saveToFirestore('detailResep', items);
}

export async function saveCabangList(items: Cabang[]): Promise<void> {
  return saveToFirestore('cabangList', items);
}

export async function saveSuratOrders(items: SuratOrder[]): Promise<void> {
  return saveToFirestore('suratOrders', items);
}

export async function saveWasteLogs(items: WasteLog[]): Promise<void> {
  return saveToFirestore('wasteLogs', items);
}

export async function saveWriteOffLogs(items: WriteOffLog[]): Promise<void> {
  return saveToFirestore('writeOffLogs', items);
}

export async function saveRdExperiments(items: RDExperiment[]): Promise<void> {
  return saveToFirestore('rdExperiments', items);
}

export async function saveToppings(items: ProductTopping[]): Promise<void> {
  return saveToFirestore('toppings', items);
}

export async function saveCabangStok(items: BranchStock[]): Promise<void> {
  return saveToFirestore('cabangStok', items);
}

export async function saveBranchTransactions(items: BranchTransaction[]): Promise<void> {
  return saveToFirestore('branchTransactions', items);
}

// ─── REAL-TIME LISTENER ───
export interface ErpSyncListener {
  onBahanBaku: (items: BahanBaku[], fromRemote: boolean) => void;
  onProductHpp: (items: ProductHpp[], fromRemote: boolean) => void;
  onDetailResep: (items: DetailResep[], fromRemote: boolean) => void;
  onCabangList: (items: Cabang[], fromRemote: boolean) => void;
  onSuratOrders: (items: SuratOrder[], fromRemote: boolean) => void;
  onWasteLogs: (items: WasteLog[], fromRemote: boolean) => void;
  onWriteOffLogs: (items: WriteOffLog[], fromRemote: boolean) => void;
  onRdExperiments: (items: RDExperiment[], fromRemote: boolean) => void;
  onToppings: (items: ProductTopping[], fromRemote: boolean) => void;
  onCabangStok: (items: BranchStock[], fromRemote: boolean) => void;
  onBranchTransactions: (items: BranchTransaction[], fromRemote: boolean) => void;
}

export function listenAllChanges(listeners: ErpSyncListener): () => void {
  const unsubs: (() => void)[] = [];
  unsubs.push(listenFirestore<BahanBaku>('bahanBaku', listeners.onBahanBaku));
  unsubs.push(listenFirestore<ProductHpp>('productHpp', listeners.onProductHpp));
  unsubs.push(listenFirestore<DetailResep>('detailResep', listeners.onDetailResep));
  unsubs.push(listenFirestore<Cabang>('cabangList', listeners.onCabangList));
  unsubs.push(listenFirestore<SuratOrder>('suratOrders', listeners.onSuratOrders));
  unsubs.push(listenFirestore<WasteLog>('wasteLogs', listeners.onWasteLogs));
  unsubs.push(listenFirestore<WriteOffLog>('writeOffLogs', listeners.onWriteOffLogs));
  unsubs.push(listenFirestore<RDExperiment>('rdExperiments', listeners.onRdExperiments));
  unsubs.push(listenFirestore<ProductTopping>('toppings', listeners.onToppings));
  unsubs.push(listenFirestore<BranchStock>('cabangStok', listeners.onCabangStok));
  unsubs.push(listenFirestore<BranchTransaction>('branchTransactions', listeners.onBranchTransactions));
  return () => unsubs.forEach(fn => fn());
}

// ─── BULK SAVE — tanpa global flag, cooldown per-collection dari saveToFirestore ───
export async function saveAllToFirestore(data: ErpSyncData): Promise<void> {
  await Promise.all([
    saveToFirestore('bahanBaku', data.bahanBaku),
    saveToFirestore('productHpp', data.productHpp),
    saveToFirestore('detailResep', data.detailResep),
    saveToFirestore('cabangList', data.cabangList),
    saveToFirestore('suratOrders', data.suratOrders),
    saveToFirestore('wasteLogs', data.wasteLogs),
    saveToFirestore('writeOffLogs', data.writeOffLogs),
    saveToFirestore('rdExperiments', data.rdExperiments),
    saveToFirestore('toppings', data.toppings),
    saveToFirestore('cabangStok', data.cabangStok),
    saveToFirestore('branchTransactions', data.branchTransactions),
  ]);
}
