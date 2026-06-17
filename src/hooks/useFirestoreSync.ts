import { useState, useEffect, useRef, useCallback } from 'react';
import { loadAllFromFirestore, saveAllToFirestore, listenAllChanges } from '../lib/erp-firestore-sync';
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

  useEffect(() => {
    hasDataOnMountRef.current = data.bahanBaku.length > 0 || data.productHpp.length > 0 || data.detailResep.length > 0;
  }, []);

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
      saveAllToFirestore({
        bahanBaku: data.bahanBaku, productHpp: data.productHpp, detailResep: data.detailResep,
        cabangList: data.cabangList, suratOrders: data.suratOrders,
        wasteLogs: data.wasteLogs, writeOffLogs: data.writeOffLogs, rdExperiments: data.rdExperiments,
        toppings: data.toppings, cabangStok: data.cabangStok, branchTransactions: data.branchTransactions,
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [data.bahanBaku, data.productHpp, data.detailResep, data.cabangList, data.suratOrders, data.wasteLogs, data.writeOffLogs, data.rdExperiments, data.toppings, data.cabangStok, data.branchTransactions, firestoreLoaded]);

  // ─── REAL-TIME LISTENER ───
  useEffect(() => {
    if (!firestoreLoaded) return;
    const unsub = listenAllChanges({
      onBahanBaku: (items) => { setters.setBahanBaku(items); },
      onProductHpp: (items) => { setters.setProductHpp(items); },
      onDetailResep: (items) => { setters.setDetailResep(items); },
      onCabangList: (items) => { setters.setCabangList(items); },
      onSuratOrders: (items) => { setters.setSuratOrders(items); },
      onWasteLogs: (items) => { setters.setWasteLogs(items); },
      onWriteOffLogs: (items) => { setters.setWriteOffLogs(items); },
      onRdExperiments: (items) => { setters.setRdExperiments(items); },
      onToppings: (items) => { setters.setToppings(items); },
      onCabangStok: (items) => { setters.setCabangStok(items); },
      onBranchTransactions: (items) => { setters.setBranchTransactions(items); },
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
