import { useState, useEffect, useRef, useCallback } from 'react';
import {
  loadAllFromFirestore, saveAllToFirestore, listenAllChanges,
  saveBahanBaku, saveProductHpp, saveDetailResep, saveCabangList,
  saveSuratOrders, saveWasteLogs, saveWriteOffLogs, saveRdExperiments,
  saveToppings, saveCabangStok, saveBranchTransactions,
} from '../lib/erp-firestore-sync';
import type { BahanBaku, ProductHpp, DetailResep, Cabang, SuratOrder, WasteLog, WriteOffLog, ProductTopping, BranchStock, BranchTransaction, OpnameDraft } from '../types';
import type { RDExperiment } from '../components/RdSandboxTab';

interface ERPDataSetters {
  setBahanBaku: (v: BahanBaku[] | ((prev: BahanBaku[]) => BahanBaku[])) => void;
  setProductHpp: (v: ProductHpp[] | ((prev: ProductHpp[]) => ProductHpp[])) => void;
  setDetailResep: (v: DetailResep[] | ((prev: DetailResep[]) => DetailResep[])) => void;
  setCabangList: (v: Cabang[] | ((prev: Cabang[]) => Cabang[])) => void;
  setSuratOrders: (v: SuratOrder[] | ((prev: SuratOrder[]) => SuratOrder[])) => void;
  setWasteLogs: (v: WasteLog[] | ((prev: WasteLog[]) => WasteLog[])) => void;
  setWriteOffLogs: (v: WriteOffLog[] | ((prev: WriteOffLog[]) => WriteOffLog[])) => void;
  setRdExperiments: (v: RDExperiment[] | ((prev: RDExperiment[]) => RDExperiment[])) => void;
  setToppings: (v: ProductTopping[] | ((prev: ProductTopping[]) => ProductTopping[])) => void;
  setCabangStok: (v: BranchStock[] | ((prev: BranchStock[]) => BranchStock[])) => void;
  setBranchTransactions: (v: BranchTransaction[] | ((prev: BranchTransaction[]) => BranchTransaction[])) => void;
}

interface ERPDataValues {
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
}

interface UseFirestoreSyncParams {
  isOwnerAuthenticated: boolean;
  branchAuth: { id: string; nama: string } | null;
  data: ERPDataValues;
  setters: ERPDataSetters;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const CLEAN_DIRTY = {
  bahanBaku: false, productHpp: false, detailResep: false,
  cabangList: false, suratOrders: false, wasteLogs: false,
  writeOffLogs: false, rdExperiments: false, toppings: false,
  cabangStok: false, branchTransactions: false,
} as const;

export function useFirestoreSync({
  isOwnerAuthenticated,
  branchAuth,
  data,
  setters,
  showToast,
}: UseFirestoreSyncParams) {
  const [firestoreLoaded, setFirestoreLoaded] = useState(false);
  const [firestoreStatus, setFirestoreStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const firestoreRetryRef = useRef(0);
  const hasDataOnMountRef = useRef(false);
  const prevDataRef = useRef<ERPDataValues>(data);
  const dirtyRef = useRef<Record<string, boolean>>({ ...CLEAN_DIRTY });

  useEffect(() => {
    hasDataOnMountRef.current = data.bahanBaku.length > 0 || data.productHpp.length > 0 || data.detailResep.length > 0;
  }, []);

  // ─── CHANGE DETECTION ───
  // Runs after every render to find collections that changed and mark them dirty
  useEffect(() => {
    const keys = Object.keys(CLEAN_DIRTY);
    for (const key of keys) {
      const k = key as keyof ERPDataValues;
      if (JSON.stringify(data[k]) !== JSON.stringify(prevDataRef.current[k])) {
        dirtyRef.current[k] = true;
      }
    }
    prevDataRef.current = data;
  });

  // ─── INITIAL LOAD ───
  const doLoadFromFirestore = useCallback(() => {
    if (!isOwnerAuthenticated && !branchAuth) return;
    setFirestoreStatus('loading');
    loadAllFromFirestore().then(remoteData => {
      firestoreRetryRef.current = 0;
      const hasRemoteData = remoteData !== null && (
        remoteData.bahanBaku.length > 0 ||
        remoteData.productHpp.length > 0 ||
        remoteData.detailResep.length > 0 ||
        remoteData.cabangList.length > 0 ||
        remoteData.suratOrders.length > 0 ||
        remoteData.wasteLogs.length > 0 ||
        remoteData.writeOffLogs.length > 0 ||
        remoteData.rdExperiments.length > 0 ||
        remoteData.toppings.length > 0 ||
        remoteData.cabangStok.length > 0 ||
        remoteData.branchTransactions.length > 0
      );

      if (hasRemoteData) {
        setters.setBahanBaku(remoteData!.bahanBaku);
        setters.setProductHpp(remoteData!.productHpp);
        setters.setDetailResep(remoteData!.detailResep);
        setters.setCabangList(remoteData!.cabangList);
        setters.setSuratOrders(remoteData!.suratOrders);
        setters.setWasteLogs(remoteData!.wasteLogs);
        setters.setWriteOffLogs(remoteData!.writeOffLogs);
        setters.setRdExperiments(remoteData!.rdExperiments);
        setters.setToppings(remoteData!.toppings);
        setters.setCabangStok(remoteData!.cabangStok);
        setters.setBranchTransactions(remoteData!.branchTransactions);
        prevDataRef.current = { ...remoteData! };
        dirtyRef.current = { ...CLEAN_DIRTY };
        setFirestoreStatus('connected');
        showToast('☁️ Data tersinkron dari cloud — semua perangkat pakai data terbaru!', 'success');
      } else {
        const hasLocalData = data.bahanBaku.length > 0 || data.productHpp.length > 0 || data.detailResep.length > 0;
        if (hasLocalData) {
          saveAllToFirestore({
            bahanBaku: data.bahanBaku, productHpp: data.productHpp, detailResep: data.detailResep,
            cabangList: data.cabangList, suratOrders: data.suratOrders,
            wasteLogs: data.wasteLogs, writeOffLogs: data.writeOffLogs, rdExperiments: data.rdExperiments,
            toppings: data.toppings, cabangStok: data.cabangStok, branchTransactions: data.branchTransactions,
          }).then(() => {
            dirtyRef.current = { ...CLEAN_DIRTY };
            setFirestoreStatus('connected');
            showToast('☁️ Data lokal diunggah ke cloud — aman di semua perangkat!', 'success');
          });
        } else {
          setFirestoreStatus('connected');
        }
      }
      setFirestoreLoaded(true);
    }).catch(err => {
      console.warn('Firestore load error:', err);
      firestoreRetryRef.current++;
      if (firestoreRetryRef.current < 3) {
        const delay = firestoreRetryRef.current * 3000;
        showToast(`⏳ Gagal sync cloud (${firestoreRetryRef.current}/3), coba lagi ${delay/1000} detik...`, 'info');
        setTimeout(doLoadFromFirestore, delay);
      } else {
        setFirestoreStatus('error');
        setFirestoreLoaded(true);
        showToast('⚠️ Gagal sync cloud setelah 3 kali percobaan — data aman di localStorage.', 'warning');
      }
    });
  }, [isOwnerAuthenticated, branchAuth, data.bahanBaku, data.productHpp, data.detailResep, data.cabangList, data.suratOrders, data.wasteLogs, data.writeOffLogs, data.rdExperiments, data.toppings, data.cabangStok, data.branchTransactions, setters, showToast]);

  useEffect(() => {
    if ((isOwnerAuthenticated || branchAuth) && !firestoreLoaded) {
      doLoadFromFirestore();
    }
  }, [isOwnerAuthenticated, branchAuth, firestoreLoaded, doLoadFromFirestore]);

  // ─── AUTO-SAVE TO FIRESTORE ───
  useEffect(() => {
    if (!firestoreLoaded) return;
    if (!hasDataOnMountRef.current && data.bahanBaku.length === 0 && data.productHpp.length === 0) return;
    const timer = setTimeout(() => {
      const saves: Promise<void>[] = [];
      if (dirtyRef.current.bahanBaku) saves.push(saveBahanBaku(data.bahanBaku));
      if (dirtyRef.current.productHpp) saves.push(saveProductHpp(data.productHpp));
      if (dirtyRef.current.detailResep) saves.push(saveDetailResep(data.detailResep));
      if (dirtyRef.current.cabangList) saves.push(saveCabangList(data.cabangList));
      if (dirtyRef.current.suratOrders) saves.push(saveSuratOrders(data.suratOrders));
      if (dirtyRef.current.wasteLogs) saves.push(saveWasteLogs(data.wasteLogs));
      if (dirtyRef.current.writeOffLogs) saves.push(saveWriteOffLogs(data.writeOffLogs));
      if (dirtyRef.current.rdExperiments) saves.push(saveRdExperiments(data.rdExperiments));
      if (dirtyRef.current.toppings) saves.push(saveToppings(data.toppings));
      if (dirtyRef.current.cabangStok) saves.push(saveCabangStok(data.cabangStok));
      if (dirtyRef.current.branchTransactions) saves.push(saveBranchTransactions(data.branchTransactions));
      if (saves.length === 0) return;
      Promise.all(saves).then(() => {
        dirtyRef.current = { ...CLEAN_DIRTY };
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [data.bahanBaku, data.productHpp, data.detailResep, data.cabangList, data.suratOrders, data.wasteLogs, data.writeOffLogs, data.rdExperiments, data.toppings, data.cabangStok, data.branchTransactions, firestoreLoaded]);

  // ─── REAL-TIME LISTENER ───
  useEffect(() => {
    if (!firestoreLoaded) return;
    const unsub = listenAllChanges({
      onBahanBaku: (items, fromRemote) => {
        setters.setBahanBaku(items);
        if (fromRemote) prevDataRef.current.bahanBaku = items;
      },
      onProductHpp: (items, fromRemote) => {
        setters.setProductHpp(items);
        if (fromRemote) prevDataRef.current.productHpp = items;
      },
      onDetailResep: (items, fromRemote) => {
        setters.setDetailResep(items);
        if (fromRemote) prevDataRef.current.detailResep = items;
      },
      onCabangList: (items, fromRemote) => {
        setters.setCabangList(items);
        if (fromRemote) prevDataRef.current.cabangList = items;
      },
      onSuratOrders: (items, fromRemote) => {
        setters.setSuratOrders(items);
        if (fromRemote) prevDataRef.current.suratOrders = items;
      },
      onWasteLogs: (items, fromRemote) => {
        setters.setWasteLogs(items);
        if (fromRemote) prevDataRef.current.wasteLogs = items;
      },
      onWriteOffLogs: (items, fromRemote) => {
        setters.setWriteOffLogs(items);
        if (fromRemote) prevDataRef.current.writeOffLogs = items;
      },
      onRdExperiments: (items, fromRemote) => {
        setters.setRdExperiments(items);
        if (fromRemote) prevDataRef.current.rdExperiments = items;
      },
      onToppings: (items, fromRemote) => {
        setters.setToppings(items);
        if (fromRemote) prevDataRef.current.toppings = items;
      },
      onCabangStok: (items, fromRemote) => {
        setters.setCabangStok(items);
        if (fromRemote) prevDataRef.current.cabangStok = items;
      },
      onBranchTransactions: (items, fromRemote) => {
        setters.setBranchTransactions(items);
        if (fromRemote) prevDataRef.current.branchTransactions = items;
      },
    });
    return () => unsub();
  }, [firestoreLoaded, setters]);

  // ─── MANUAL SYNC ───
  const handleManualSync = useCallback(async () => {
    setIsManualSyncing(true);
    try {
      const remoteData = await loadAllFromFirestore();
      const hasRemoteData = remoteData !== null && (
        remoteData.bahanBaku.length > 0 ||
        remoteData.productHpp.length > 0 ||
        remoteData.detailResep.length > 0
      );
      if (hasRemoteData) {
        setters.setBahanBaku(remoteData!.bahanBaku);
        setters.setProductHpp(remoteData!.productHpp);
        setters.setDetailResep(remoteData!.detailResep);
        setters.setCabangList(remoteData!.cabangList);
        setters.setSuratOrders(remoteData!.suratOrders);
        setters.setWasteLogs(remoteData!.wasteLogs);
        setters.setWriteOffLogs(remoteData!.writeOffLogs);
        setters.setRdExperiments(remoteData!.rdExperiments);
        setters.setToppings(remoteData!.toppings);
        setters.setCabangStok(remoteData!.cabangStok);
        setters.setBranchTransactions(remoteData!.branchTransactions);
        prevDataRef.current = { ...remoteData! };
        dirtyRef.current = { ...CLEAN_DIRTY };
        setFirestoreStatus('connected');
        showToast('☁️ Sync manual berhasil — data dari cloud dimuat!', 'success');
      } else {
        const hasLocalData = data.bahanBaku.length > 0 || data.productHpp.length > 0 || data.detailResep.length > 0;
        if (hasLocalData) {
          await saveAllToFirestore({
            bahanBaku: data.bahanBaku, productHpp: data.productHpp, detailResep: data.detailResep,
            cabangList: data.cabangList, suratOrders: data.suratOrders,
            wasteLogs: data.wasteLogs, writeOffLogs: data.writeOffLogs, rdExperiments: data.rdExperiments,
            toppings: data.toppings, cabangStok: data.cabangStok, branchTransactions: data.branchTransactions,
          });
          dirtyRef.current = { ...CLEAN_DIRTY };
          setFirestoreStatus('connected');
          showToast('☁️ Data lokal diunggah ke cloud!', 'success');
        } else {
          setFirestoreStatus('connected');
          showToast('☁️ Cloud terhubung — tidak ada data untuk disync.', 'info');
        }
      }
    } catch (err) {
      setFirestoreStatus('error');
      showToast('⚠️ Gagal sync — periksa koneksi internet.', 'error');
    } finally {
      setIsManualSyncing(false);
    }
  }, [data, setters, showToast]);

  return {
    firestoreLoaded,
    firestoreStatus,
    isManualSyncing,
    handleManualSync,
  };
}
