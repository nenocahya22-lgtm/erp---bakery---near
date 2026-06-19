import { useState, useEffect, useRef, useCallback } from 'react';
import { safeGetLocalStorage } from '../lib/safe-json';
import { calculateAllProducts } from '../lib/calculations';
import { syncProductsToFirestore, getWebStoreConfig, saveWebStoreConfig, db, hashProductName } from '../lib/firestore-bridge';
import { doc, deleteDoc } from 'firebase/firestore';
import type {
  BahanBaku, ProductHpp, DetailResep, CalculationResult, WriteOffLog, WasteLog,
  Cabang, SuratOrder, BranchStock, BranchTransaction, ProductTopping,
  OpnameDraft,
} from '../types';
import type { RDExperiment } from '../components/RdSandboxTab';

export function useERPData(showConfirm?: (opts: { title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: string; onConfirm: () => void; onCancel?: () => void }) => void) {
  const [bahanBaku, setBahanBaku] = useState<BahanBaku[]>(() =>
    (safeGetLocalStorage<any[]>('bahan_baku_data', [])).map(b => ({
      ...b,
      stok: b.stok ?? b.isiKemasan ?? 0,
      isiKemasan: b.isiKemasan ?? b.stok ?? 0,
    }))
  );
  const [productHpp, setProductHpp] = useState<ProductHpp[]>(() =>
    safeGetLocalStorage<ProductHpp[]>('product_hpp_data', [])
  );
  const [detailResep, setDetailResep] = useState<DetailResep[]>(() =>
    safeGetLocalStorage<DetailResep[]>('detail_resep_data', [])
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);

  const [toppings, setToppings] = useState<ProductTopping[]>(() =>
    safeGetLocalStorage<ProductTopping[]>('toppings_data', [])
  );

  const [cabangList, setCabangList] = useState<Cabang[]>(() =>
    safeGetLocalStorage<Cabang[]>('cabang_list_data', [])
  );
  const [suratOrders, setSuratOrders] = useState<SuratOrder[]>(() =>
    safeGetLocalStorage<SuratOrder[]>('surat_orders_data', [])
  );

  const [cabangStok, setCabangStok] = useState<BranchStock[]>(() =>
    safeGetLocalStorage<BranchStock[]>('cabang_stok_data', [])
  );
  const [branchTransactions, setBranchTransactions] = useState<BranchTransaction[]>(() =>
    safeGetLocalStorage<BranchTransaction[]>('branch_transactions_data', [])
  );

  const [rdExperiments, setRdExperiments] = useState<RDExperiment[]>(() =>
    safeGetLocalStorage<RDExperiment[]>('rd_experiments_data', [])
  );

  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>(() =>
    safeGetLocalStorage<WasteLog[]>('waste_logs_data', [])
  );

  const [writeOffLogs, setWriteOffLogs] = useState<WriteOffLog[]>(() =>
    safeGetLocalStorage<WriteOffLog[]>('writeoff_logs_data', [])
  );

  const [opnameDrafts, setOpnameDrafts] = useState<OpnameDraft[]>(() =>
    safeGetLocalStorage<OpnameDraft[]>('opname_drafts_data', [])
  );

  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState('');

  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // ─── DEBOUNCED LOCALSTORAGE SAVE ───
  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('toppings_data', JSON.stringify(toppings)), 500);
    return () => clearTimeout(timer);
  }, [toppings]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('bahan_baku_data', JSON.stringify(bahanBaku)), 500);
    return () => clearTimeout(timer);
  }, [bahanBaku]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('product_hpp_data', JSON.stringify(productHpp)), 500);
    return () => clearTimeout(timer);
  }, [productHpp]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('detail_resep_data', JSON.stringify(detailResep)), 500);
    return () => clearTimeout(timer);
  }, [detailResep]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('cabang_list_data', JSON.stringify(cabangList)), 500);
    return () => clearTimeout(timer);
  }, [cabangList]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('surat_orders_data', JSON.stringify(suratOrders)), 500);
    return () => clearTimeout(timer);
  }, [suratOrders]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('cabang_stok_data', JSON.stringify(cabangStok)), 500);
    return () => clearTimeout(timer);
  }, [cabangStok]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('branch_transactions_data', JSON.stringify(branchTransactions)), 500);
    return () => clearTimeout(timer);
  }, [branchTransactions]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('rd_experiments_data', JSON.stringify(rdExperiments)), 500);
    return () => clearTimeout(timer);
  }, [rdExperiments]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('waste_logs_data', JSON.stringify(wasteLogs)), 500);
    return () => clearTimeout(timer);
  }, [wasteLogs]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('writeoff_logs_data', JSON.stringify(writeOffLogs)), 500);
    return () => clearTimeout(timer);
  }, [writeOffLogs]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('opname_drafts_data', JSON.stringify(opnameDrafts)), 500);
    return () => clearTimeout(timer);
  }, [opnameDrafts]);

  // ─── REFS FOR STALE-CLOSURE-SAFE ACCESS ───
  const bahanBakuRef = useRef(bahanBaku);
  const productHppRef = useRef(productHpp);
  const detailResepRef = useRef(detailResep);

  useEffect(() => { bahanBakuRef.current = bahanBaku; }, [bahanBaku]);
  useEffect(() => { productHppRef.current = productHpp; }, [productHpp]);
  useEffect(() => { detailResepRef.current = detailResep; }, [detailResep]);

  const calculatedProducts: CalculationResult[] = calculateAllProducts(bahanBaku, productHpp, detailResep);
  const calculatedProductsRef = useRef(calculatedProducts);
  useEffect(() => { calculatedProductsRef.current = calculatedProducts; }, [calculatedProducts]);

  const wasteTotalLoss = wasteLogs.reduce((acc, curr) => acc + curr.lossValue, 0);
  const rdTotalCost = rdExperiments.reduce((acc, curr) => acc + curr.components.reduce((sum, c) => sum + (c.takaran * c.unitPrice), 0) + curr.estOverhead, 0);

  // ─── HELPER: UPDATE BRANCH STOCK ───
  const updateBranchStock = (cabangId: string, bahanNama: string, qtyChange: number, satuan: string) => {
    setCabangStok(prev => {
      const existing = prev.find(s => s.cabangId === cabangId && s.bahanNama === bahanNama);
      if (existing) {
        return prev.map(s =>
          s.cabangId === cabangId && s.bahanNama === bahanNama
            ? { ...s, stokTeoritis: Math.max(0, s.stokTeoritis + qtyChange), lastUpdated: new Date().toISOString() }
            : s
        );
      }
      return [...prev, {
        cabangId, bahanNama, stokTeoritis: Math.max(0, qtyChange), stokFisik: 0, satuan, lastUpdated: new Date().toISOString(),
      }];
    });
  };

  const addBranchTransaction = (tx: Omit<BranchTransaction, 'id'>) => {
    setBranchTransactions(prev => [{
      ...tx, id: `btx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    }, ...prev]);
  };

  // ─── TOPPING HANDLERS ───
  const handleAddTopping = (t: ProductTopping) => {
    setToppings(prev => [...prev, t]);
  };

  const handleDeleteTopping = (id: string) => {
    setToppings(prev => prev.filter(t => t.id !== id));
  };

  // ─── R&D HANDLERS ───
  const handleAddRD = (exp: RDExperiment) => {
    setRdExperiments((prev) => [exp, ...prev]);
    if (exp.components.length > 0) {
      setBahanBaku(prev => prev.map(b => {
        const used = exp.components.find(c => c.bahanName === b.nama);
        if (used) {
          const newStok = Math.max(0, b.isiKemasan - used.takaran);
          return { ...b, isiKemasan: newStok, stok: newStok };
        }
        return b;
      }));
    }
    showToast(`🔬 Proyek Litbang "${exp.projectName}" berhasil! Bahan terpakai: ${exp.components.length} jenis.`, 'success');
  };

  const handleDeleteRD = (id: string) => {
    setRdExperiments((prev) => prev.filter((e) => e.id !== id));
    showToast('Proyek Litbang dihapus.', 'info');
  };

  // ─── WASTE HANDLERS ───
  const handleAddWasteLog = (log: WasteLog, cabangId?: string) => {
    setWasteLogs((prev) => [log, ...prev]);
    if (cabangId) {
      updateBranchStock(cabangId, log.bahanNama, -log.qtyWasted, log.satuan);
      addBranchTransaction({
        cabangId, tipe: 'waste', bahanNama: log.bahanNama, qty: log.qtyWasted, satuan: log.satuan,
        tanggal: new Date().toISOString(), refId: log.id,
      });
    }
    showToast(`Input Waste "${log.bahanNama}" berhasil dicatat!`, 'success');
  };

  const handleDeleteWasteLog = (id: string) => {
    setWasteLogs((prev) => prev.filter((w) => w.id !== id));
    showToast('Pencatatan Waste dihapus.', 'info');
  };

  const handleAddWriteOff = (log: WriteOffLog) => {
    setWriteOffLogs((prev) => [log, ...prev]);
    showToast(`Write-off "${log.namaProduk}" dicatat!`, 'success');
  };

  const handleDeleteWriteOff = (id: string) => {
    setWriteOffLogs((prev) => prev.filter((w) => w.id !== id));
    showToast('Write-off dihapus.', 'info');
  };

  // ─── MATERIAL HANDLERS ───
  const handleAddMaterial = (m: BahanBaku) => {
    if (m.isiKemasan <= 0) {
      showToast('Isi kemasan harus lebih dari 0!', 'error');
      return;
    }
    const duplicate = bahanBaku.some((b) => b.nama.toLowerCase().trim() === m.nama.toLowerCase().trim());
    if (duplicate) {
      showToast(`Bahan baku "${m.nama}" sudah terdaftar!`, 'error');
      return;
    }
    setBahanBaku((prev) => [...prev, m]);
    setHasUnsavedChanges(true);
    showToast(`Bahan Baku "${m.nama}" ditambahkan!`, 'success');
  };

  const handleEditMaterial = (oldName: string, updated: BahanBaku) => {
    if (updated.isiKemasan <= 0) {
      showToast('Isi kemasan harus lebih dari 0!', 'error');
      return;
    }
    setBahanBaku((prev) =>
      prev.map((b) => (b.nama.toLowerCase().trim() === oldName.toLowerCase().trim() ? updated : b))
    );
    setDetailResep((prev) =>
      prev.map((r) =>
        r.namaBahan.toLowerCase().trim() === oldName.toLowerCase().trim()
          ? { ...r, namaBahan: updated.nama }
          : r
      )
    );
    setHasUnsavedChanges(true);
    showToast(`Bahan Baku "${updated.nama}" disesuaikan!`, 'success');
  };

  const handleDeleteMaterial = (name: string) => {
    setBahanBaku((prev) => prev.filter((b) => b.nama.toLowerCase().trim() !== name.toLowerCase().trim()));
    setDetailResep((prev) => prev.filter((r) => r.namaBahan.toLowerCase().trim() !== name.toLowerCase().trim()));
    setHasUnsavedChanges(true);
    showToast(`Bahan Baku "${name}" dihapus!`, 'info');
  };

  // ─── PRODUCT HANDLERS ───
  const handleAddProduct = (p: ProductHpp, ingredients: DetailResep[]) => {
    setProductHpp((prev) => [...prev, p]);
    if (ingredients.length > 0) {
      setDetailResep((prev) => [...prev, ...ingredients]);
    }
    setHasUnsavedChanges(true);
    setTimeout(() => {
      const updatedCalc = calculateAllProducts(bahanBakuRef.current, [...productHppRef.current, p], detailResepRef.current);
      const allProducts = [...productHppRef.current, p].filter(pr => pr.status !== 'draft');
      if (allProducts.length > 0) {
        syncProductsToFirestore(updatedCalc, allProducts, detailResepRef.current, bahanBakuRef.current, 'pusat').catch((err) => {
          console.warn('Auto-sync after recipe creation failed:', err);
        });
      }
    }, 1000);
    showToast(`Resep Produk "${p.namaProduk}" diformulasikan!`, 'success');
  };

  const handleUpdateProductIngredients = (
    productName: string,
    updatedDetails: DetailResep[],
    porsiJual: number,
    status?: 'draft' | 'published'
  ) => {
    setProductHpp((prev) =>
      prev.map((p) =>
        p.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
          ? { ...p, porsiJual, ...(status ? { status } : {}) }
          : p
      )
    );
    setDetailResep((prev) => [
      ...prev.filter((r) => r.namaProduk.toLowerCase().trim() !== productName.toLowerCase().trim()),
      ...updatedDetails,
    ]);
    setHasUnsavedChanges(true);
    if (status === 'published') {
      showToast(`✅ Resep "${productName}" diterbitkan! Kini tersedia di semua modul.`, 'success');
      setTimeout(() => {
        const publishedAll = productHppRef.current.filter(pr => pr.status !== 'draft');
        const updatedCalc = calculateAllProducts(bahanBakuRef.current, publishedAll, detailResepRef.current);
        syncProductsToFirestore(updatedCalc, publishedAll, detailResepRef.current, bahanBakuRef.current, 'pusat').catch(console.warn);
      }, 500);
    } else {
      showToast(`Bahan resep "${productName}" diperbarui!`, 'success');
    }
  };

  const handleDeleteProduct = (productName: string) => {
    setProductHpp((prev) => prev.filter((p) => p.namaProduk.toLowerCase().trim() !== productName.toLowerCase().trim()));
    setDetailResep((prev) => prev.filter((r) => r.namaProduk.toLowerCase().trim() !== productName.toLowerCase().trim()));
    setHasUnsavedChanges(true);
    showToast(`Produk "${productName}" dihapus!`, 'info');

    // 🔥 HAPUS LANGSUNG dari Firestore — tidak pakai setTimeout!
    // Biar kalaupun user refresh halaman, delete sudah terkirim sebelum JS mati.
    // Hapus dari 2 kemungkinan ID: hash baru (hashProductName) + legacy lama (PRD- + slug)
    const newId = hashProductName(productName);
    const legacyId = 'PRD-' + productName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    Promise.allSettled([
      deleteDoc(doc(db, 'products', newId)),
      deleteDoc(doc(db, 'products', legacyId)),
    ]).catch(err => {
      console.warn('Failed to delete product from Firestore:', err);
    });

    // 🔥 Hapus juga dari webstore_config — biar tidak muncuk lagi saat reload Web Store Manager
    Promise.allSettled([
      (async () => {
        try {
          const config = await getWebStoreConfig('pusat');
          if (config && config.products) {
            const filteredProducts = config.products.filter(
              (p: any) => p.productName.toLowerCase().trim() !== productName.toLowerCase().trim()
            );
            if (filteredProducts.length !== config.products.length) {
              await saveWebStoreConfig('pusat', { ...config, products: filteredProducts });
            }
          }
        } catch (e) {
          console.warn('Gagal update webstore_config setelah hapus produk:', e);
        }
      })(),
    ]);

    // Auto-sync penghapusan ke Firestore — update data produk yang tersisa
    setTimeout(() => {
      const updatedCalc = calculateAllProducts(bahanBakuRef.current, productHppRef.current.filter(p => p.namaProduk.toLowerCase().trim() !== productName.toLowerCase().trim()), detailResepRef.current);
      const publishedProducts = productHppRef.current.filter(p => p.status !== 'draft' && p.namaProduk.toLowerCase().trim() !== productName.toLowerCase().trim());
      if (publishedProducts.length > 0 || productHppRef.current.filter(p => p.status !== 'draft').length !== publishedProducts.length) {
        syncProductsToFirestore(updatedCalc, publishedProducts, detailResepRef.current, bahanBakuRef.current, 'pusat').catch((err) => {
          console.warn('Auto-sync after product deletion failed:', err);
        });
      }
    }, 1000);
  };

  const handleUpdateProductPricing = (productName: string, hargaJual: number) => {
    setProductHpp((prev) =>
      prev.map((p) =>
        p.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
          ? { ...p, hargaJual }
          : p
      )
    );
    setHasUnsavedChanges(true);
  };

  // ─── VARIANT HANDLERS ───
  const handleAddVariant = (productName: string, variant: import('../types').ProductVariant) => {
    setProductHpp(prev => prev.map(p =>
      p.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
        ? { ...p, variants: [...(p.variants || []), variant] }
        : p
    ));
    setHasUnsavedChanges(true);
    showToast(`Varian "${variant.name}" ditambahkan ke ${productName}!`, 'success');
  };

  const handleUpdateVariant = (productName: string, variantId: string, updates: Partial<import('../types').ProductVariant>) => {
    setProductHpp(prev => prev.map(p =>
      p.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
        ? {
            ...p,
            variants: (p.variants || []).map(v =>
              v.id === variantId ? { ...v, ...updates } : v
            ),
          }
        : p
    ));
    setHasUnsavedChanges(true);
    showToast(`Varian ${productName} diperbarui!`, 'success');
  };

  const handleDeleteVariant = (productName: string, variantId: string) => {
    setProductHpp(prev => prev.map(p =>
      p.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
        ? { ...p, variants: (p.variants || []).filter(v => v.id !== variantId) }
        : p
    ));
    setHasUnsavedChanges(true);
    showToast(`Varian dihapus dari ${productName}!`, 'info');
  };

  // ─── POS SALE ───
  const handleCompletePOSSale = (productName: string, soldQty: number, totalRevenue: number, source?: string, cabangId?: string) => {
    try {
      const saved = localStorage.getItem('revenue_tracker_data');
      const tracker = saved ? JSON.parse(saved) : { transactions: [], dailyTotals: {} };
      const today = new Date().toISOString().substring(0, 10);
      const txEntry = {
        id: `rev-${Date.now()}`,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        product: productName,
        qty: soldQty,
        amount: totalRevenue,
        source: source || 'Walk-In POS',
        date: today,
      };
      tracker.transactions.push(txEntry);
      if (tracker.transactions.length > 500) {
        tracker.transactions = tracker.transactions.slice(-500);
      }
      if (!tracker.dailyTotals[today]) {
        tracker.dailyTotals[today] = { total: 0, sources: {} };
      }
      tracker.dailyTotals[today].total += totalRevenue;
      const src = txEntry.source;
      if (!tracker.dailyTotals[today].sources[src]) {
        tracker.dailyTotals[today].sources[src] = 0;
      }
      tracker.dailyTotals[today].sources[src] += totalRevenue;
      localStorage.setItem('revenue_tracker_data', JSON.stringify(tracker));
    } catch (err) {
      console.error('Failed to record revenue:', err);
    }

    setHasUnsavedChanges(true);
    const revStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalRevenue);
    showToast(`Transaksi Sukses! Menjual ${soldQty} pcs "${productName}" (${revStr}).`, 'success');
  };

  // ─── PRODUCTION ───
  const handleProductionComplete = (productName: string, batchQty: number) => {
    const ingredientsForProduct = detailResep.filter(
      (r) => r.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
    );
    if (ingredientsForProduct.length === 0) {
      showToast(`⚠️ Produk "${productName}" belum punya resep, stok tidak dipotong.`, 'info');
      return;
    }

    const productInfo = productHpp.find(
      (p) => p.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
    );
    const yieldPortions = productInfo?.porsiJual || 1;

    setBahanBaku((prev) =>
      prev.map((b) => {
        const ingredientUsed = ingredientsForProduct.find(
          (ing) => ing.namaBahan.toLowerCase().trim() === b.nama.toLowerCase().trim()
        );
        if (ingredientUsed) {
          const consumedAmount = (ingredientUsed.takaran / yieldPortions) * batchQty;
          const currentUnitStock = b.isiKemasan - consumedAmount;
          if (currentUnitStock < 50 && b.isiKemasan >= 50) {
            showToast(`⚠️ Stok ${b.nama} menipis (sisa ~${Math.round(currentUnitStock)} ${b.satuan}) — segera order!`, 'info');
          }
          const newStok = Math.max(0, Number(currentUnitStock.toFixed(2)));
          return { ...b, isiKemasan: newStok, stok: newStok };
        }
        return b;
      })
    );
    setHasUnsavedChanges(true);
    showToast(`🏭 Produksi ${batchQty}x "${productName}" dicatat! Bahan baku dikurangi dari stok pusat.`, 'success');
  };

  const handleBranchProductionComplete = (productName: string, batchQty: number) => {
    const ingredientsForProduct = detailResep.filter(
      (r) => r.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
    );
    if (ingredientsForProduct.length === 0) {
      showToast(`⚠️ Produk "${productName}" belum punya resep, stok cabang tidak dipotong.`, 'warning');
      return;
    }
    const productInfo = productHpp.find(
      (p) => p.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
    );
    const yieldPortions = productInfo?.porsiJual || 1;

    setCabangStok((prev) =>
      prev.map((s) => {
        const ingredientUsed = ingredientsForProduct.find(
          (ing) => ing.namaBahan.toLowerCase().trim() === s.bahanNama.toLowerCase().trim()
        );
        if (ingredientUsed) {
          const consumedAmount = (ingredientUsed.takaran / yieldPortions) * batchQty;
          return { ...s, stokTeoritis: Math.max(0, s.stokTeoritis - consumedAmount), lastUpdated: new Date().toISOString() };
        }
        return s;
      })
    );
    showToast(`🏭 Cabang: ${batchQty}x "${productName}" dicatat! Stok cabang otomatis dipotong.`, 'success');
  };

  // ─── CABANG HANDLERS ───
  const handleAddCabang = (c: Cabang) => {
    const dup = cabangList.some(cb => cb.username === c.username);
    if (dup) { showToast(`Username "${c.username}" sudah dipakai!`, 'error'); return; }
    setCabangList(prev => [...prev, c]);
    showToast(`Cabang "${c.nama}" berhasil didaftarkan!`, 'success');
  };

  const handleEditCabang = (id: string, c: Cabang) => {
    setCabangList(prev => prev.map(cb => cb.id === id ? c : cb));
    showToast(`Cabang "${c.nama}" diupdate!`, 'success');
  };

  const handleDeleteCabang = (id: string) => {
    setCabangList(prev => prev.filter(c => c.id !== id));
    showToast('Cabang dihapus.', 'info');
  };

  // ─── SURAT ORDER HANDLERS ───
  const handleAddSuratOrder = (so: SuratOrder) => {
    setSuratOrders(prev => [so, ...prev]);

    if (so.status === 'dikirim') {
      setBahanBaku(prev => prev.map(b => {
        const item = so.items.find(i => i.bahanNama === b.nama);
        if (item) {
          const newStok = Math.max(0, b.isiKemasan - item.qty);
          return { ...b, isiKemasan: newStok, stok: newStok };
        }
        return b;
      }));
    }

    so.items.forEach(item => {
      const bahan = bahanBaku.find(b => b.nama === item.bahanNama);
      addBranchTransaction({
        cabangId: so.cabangId, tipe: so.status === 'dikirim' ? 'so_kirim' : 'so_minta',
        bahanNama: item.bahanNama, qty: item.qty, satuan: bahan?.satuan || 'pcs',
        tanggal: new Date().toISOString(), refId: so.id,
      });
    });
    const msg = so.status === 'minta' ? `Permintaan dari "${so.cabangNama}" masuk!` : `Surat Order ke "${so.cabangNama}" dikirim!`;
    showToast(msg, 'success');
  };

  const handleUpdateSuratOrder = (id: string, so: SuratOrder) => {
    const prevStatus = suratOrders.find(s => s.id === id)?.status;
    setSuratOrders(prev => prev.map(s => s.id === id ? so : s));

    if (so.status === 'diterima' && prevStatus === 'diterima') {
      showToast('⚠️ Surat Order ini sudah diterima sebelumnya!', 'info');
      return;
    }

    if (so.status === 'dikirim' && prevStatus === 'minta') {
      setBahanBaku(prev => prev.map(b => {
        const item = so.items.find(i => i.bahanNama === b.nama);
        if (item) {
          const newStok = Math.max(0, b.isiKemasan - item.qty);
          return { ...b, isiKemasan: newStok, stok: newStok };
        }
        return b;
      }));
      showToast(`Permintaan "${so.cabangNama}" disetujui! Stok pusat berkurang.`, 'success');
    }

    if (so.status === 'diterima' && prevStatus !== 'diterima') {
      const original = suratOrders.find(s => s.id === id);
      const items = original?.items || so.items;
      // Jika langsung 'minta' → 'diterima' (skip 'dikirim'), kurangi stok pusat juga
      if (prevStatus === 'minta') {
        setBahanBaku(prev => prev.map(b => {
          const item = items.find(i => i.bahanNama === b.nama);
          if (item) {
            const newStok = Math.max(0, b.isiKemasan - (item.qtyTerima ?? item.qty));
            return { ...b, isiKemasan: newStok, stok: newStok };
          }
          return b;
        }));
      }
      items.forEach(item => {
        const actualQty = item.qtyTerima ?? item.qty;
        const bahan = bahanBaku.find(b => b.nama === item.bahanNama);
        updateBranchStock(so.cabangId, item.bahanNama, actualQty, bahan?.satuan || 'pcs');
        addBranchTransaction({
          cabangId: so.cabangId, tipe: 'so_terima', bahanNama: item.bahanNama, qty: item.qty,
          satuan: bahan?.satuan || 'pcs', tanggal: new Date().toISOString(), refId: so.id,
        });
      });
      showToast(`Surat Order ke "${so.cabangNama}" diterima! Stok cabang bertambah.`, 'success');
    }
  };

  const handleReturSuratOrder = async (id: string, returNote: string) => {
    const so = suratOrders.find(s => s.id === id);
    if (!so) return;
    const returConfirmed = await new Promise((resolve) => {
      showConfirm({
        title: "Retur Barang",
        message: `Retur semua barang dari "${so.cabangNama}"?\n\nStok akan dikembalikan ke pusat.\nCatatan: ${returNote}`,
        confirmLabel: "Retur",
        cancelLabel: "Batal",
        variant: "danger",
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!returConfirmed) return;

    setSuratOrders(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'diretur' as const, returNote } : s
    ));
    setBahanBaku(prev => prev.map(b => {
      const item = so.items.find(i => i.bahanNama === b.nama);
      if (item) {
        const newStok = b.isiKemasan + item.qty;
        return { ...b, isiKemasan: newStok, stok: newStok };
      }
      return b;
    }));
    so.items.forEach(item => {
      const bahan = bahanBaku.find(b => b.nama === item.bahanNama);
      addBranchTransaction({
        cabangId: so.cabangId, tipe: 'retur', bahanNama: item.bahanNama, qty: item.qty,
        satuan: bahan?.satuan || 'pcs', tanggal: new Date().toISOString(), refId: so.id,
      });
    });
    showToast(`🔄 Barang dari "${so.cabangNama}" diretur! Stok pusat dikembalikan.`, 'success');
  };

  // ─── STOCK OPNAME SYNC ───
  const handleSyncStokOpname = (cabangId: string, bahanNama: string, stokFisik: number, satuan: string) => {
    setCabangStok(prev => {
      const existing = prev.find(s => s.cabangId === cabangId && s.bahanNama === bahanNama);
      if (existing) {
        return prev.map(s =>
          s.cabangId === cabangId && s.bahanNama === bahanNama
            ? { ...s, stokFisik, lastUpdated: new Date().toISOString() }
            : s
        );
      }
      return [...prev, { cabangId, bahanNama, stokTeoritis: 0, stokFisik, satuan, lastUpdated: new Date().toISOString() }];
    });
  };

  // ─── OPNAME DRAFT HANDLERS ───
  const handleAddOpnameDraft = (cabangId: string, cabangNama: string, bahanNama: string, stokFisik: number, stokTeoritis: number, satuan: string, petugas: string) => {
    setOpnameDrafts(prev => {
      const filtered = prev.filter(d => !(d.cabangId === cabangId && d.bahanNama === bahanNama && d.status === 'pending'));
      const draft: OpnameDraft = {
        id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        cabangId, cabangNama, bahanNama, stokFisik, stokTeoritis, satuan,
        tanggal: new Date().toISOString(), petugas, status: 'pending',
      };
      return [...filtered, draft];
    });
  };

  const handleApproveOpname = (draftId: string) => {
    const draft = opnameDrafts.find(d => d.id === draftId);
    if (!draft) return;
    setCabangStok(prev => prev.map(s =>
      s.cabangId === draft.cabangId && s.bahanNama === draft.bahanNama
        ? { ...s, stokFisik: draft.stokFisik, lastUpdated: new Date().toISOString() }
        : s
    ));
    setOpnameDrafts(prev => prev.map(d =>
      d.id === draftId ? { ...d, status: 'approved' as const } : d
    ));
    showToast(`✅ Stok opname "${draft.bahanNama}" di ${draft.cabangNama} telah disetujui!`, 'success');
  };

  const handleRejectOpname = (draftId: string, note?: string) => {
    setOpnameDrafts(prev => prev.map(d =>
      d.id === draftId ? { ...d, status: 'rejected' as const, rejectNote: note } : d
    ));
    const draft = opnameDrafts.find(d => d.id === draftId);
    showToast(`❌ Stok opname "${draft?.bahanNama}" ditolak.`, 'info');
  };

  return {
    // state
    bahanBaku, setBahanBaku,
    productHpp, setProductHpp,
    detailResep, setDetailResep,
    cabangList, setCabangList,
    suratOrders, setSuratOrders,
    wasteLogs, setWasteLogs,
    writeOffLogs, setWriteOffLogs,
    rdExperiments, setRdExperiments,
    toppings, setToppings,
    cabangStok, setCabangStok,
    branchTransactions, setBranchTransactions,
    opnameDrafts, setOpnameDrafts,
    hasUnsavedChanges, setHasUnsavedChanges,
    spreadsheetId, setSpreadsheetId,
    spreadsheetTitle, setSpreadsheetTitle,
    lastAutoSaved, setLastAutoSaved,
    toasts, setToasts, showToast,
    calculatedProducts,
    wasteTotalLoss, rdTotalCost,

    // refs
    bahanBakuRef, productHppRef, detailResepRef, calculatedProductsRef,

    // helpers
    updateBranchStock, addBranchTransaction,

    // handlers
    handleAddMaterial, handleEditMaterial, handleDeleteMaterial,
    handleAddProduct, handleUpdateProductIngredients, handleDeleteProduct, handleUpdateProductPricing,
    handleAddVariant, handleUpdateVariant, handleDeleteVariant,
    handleAddCabang, handleEditCabang, handleDeleteCabang,
    handleAddSuratOrder, handleUpdateSuratOrder, handleReturSuratOrder,
    handleAddWasteLog, handleDeleteWasteLog, handleAddWriteOff, handleDeleteWriteOff,
    handleAddRD, handleDeleteRD,
    handleAddTopping, handleDeleteTopping,
    handleCompletePOSSale,
    handleProductionComplete, handleBranchProductionComplete,
    handleSyncStokOpname,
    handleAddOpnameDraft, handleApproveOpname, handleRejectOpname,
  };
}
