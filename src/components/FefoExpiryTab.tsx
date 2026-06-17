import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ShieldAlert, Calendar, AlertTriangle, Clock, Package, Trash2, Plus, Printer, RefreshCw, AlertOctagon, Database, Zap, CheckCircle2, Truck, TrendingUp, GitBranch, Percent, Sparkles, Share2, MapPin, ArrowRight } from 'lucide-react';
import { BahanBaku, ProductHpp, DetailResep, WasteLog, Cabang, SuratOrder, BranchStock, SATUAN_OPTIONS, DistributionRecommendation, StockSwapSuggestion, AutoPromoSignal } from '../types';
import { safeGetLocalStorage } from '../lib/safe-json';
import { calculateBahanADS } from '../lib/calculations';

interface BatchLog {
  id: string;
  batchNo: string;
  bahanNama: string;
  qty: number;
  satuan: string;
  supplier: string;
  expiryDate: string;
  dateAdded: string;
}

interface ProductExpiryLog {
  id: string;
  namaProduk: string;
  batchNo: string;
  qty: number;
  expiryDate: string;
  status: 'aman' | 'warning' | 'expired';
  notes: string;
}

interface FefoExpiryTabProps {
  bahanBaku: BahanBaku[];
  productHpp?: ProductHpp[];
  detailResep?: DetailResep[];
  onAddWasteLog?: (log: WasteLog, cabangId?: string) => void;
  cabangList?: Cabang[];
  suratOrders?: SuratOrder[];
  cabangStok?: BranchStock[];
}

export default function FefoExpiryTab({ bahanBaku, productHpp, detailResep = [], onAddWasteLog, cabangList = [], suratOrders = [], cabangStok = [] }: FefoExpiryTabProps) {
  const [batches, setBatches] = useState<BatchLog[]>(() =>
    safeGetLocalStorage<BatchLog[]>('fefo_expiry_batches_data', [])
  );
  const [showForm, setShowForm] = useState(false);
  const [formBahan, setFormBahan] = useState('');
  const [formBatch, setFormBatch] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formSatuan, setFormSatuan] = useState('gr');
  const [formSupplier, setFormSupplier] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [safetyStock, setSafetyStock] = useState<Record<string, number>>(() =>
    safeGetLocalStorage<Record<string, number>>('fefo_safety_stock_data', {})
  );
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [syncResult, setSyncResult] = useState<{ added: number; skipped: string[] } | null>(null);
  
  // ─── SMART DISTRIBUTION STATE ───
  const [leadTimes, setLeadTimes] = useState<Record<string, number>>(() =>
    safeGetLocalStorage<Record<string, number>>('fefo_lead_times', {})
  );
  const [showDistribusi, setShowDistribusi] = useState(false);
  const [distribusiBatchId] = useState<string | null>(null);
  const [autoPromoSignals, setAutoPromoSignals] = useState<AutoPromoSignal[]>(() =>
    safeGetLocalStorage<AutoPromoSignal[]>('fefo_auto_promo_signals', [])
  );
  const [localNotif, setLocalNotif] = useState<{ msg: string; type: 'success' | 'info' } | null>(null);
  
  useEffect(() => {
    if (localNotif) {
      const t = setTimeout(() => setLocalNotif(null), 4000);
      return () => clearTimeout(t);
    }
  }, [localNotif]);

  useEffect(() => {
    localStorage.setItem('fefo_expiry_batches_data', JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    localStorage.setItem('fefo_safety_stock_data', JSON.stringify(safetyStock));
  }, [safetyStock]);

  useEffect(() => {
    localStorage.setItem('fefo_lead_times', JSON.stringify(leadTimes));
  }, [leadTimes]);

  useEffect(() => {
    localStorage.setItem('fefo_auto_promo_signals', JSON.stringify(autoPromoSignals));
  }, [autoPromoSignals]);

  // ─── SYNC FROM STOK PUSAT ───
  const handleSyncFromStok = () => {
    const existingBahanNames = new Set(batches.map(b => b.bahanNama.toLowerCase()));
    const added: BatchLog[] = [];
    const skipped: string[] = [];

    bahanBaku.forEach(b => {
      if (b.isiKemasan <= 0) return;
      if (existingBahanNames.has(b.nama.toLowerCase())) {
        skipped.push(b.nama);
        return;
      }
      // Auto-generate batch from stock
      const defaultExpiry = new Date();
      defaultExpiry.setMonth(defaultExpiry.getMonth() + 3); // assume 3 months from now
      const expStr = defaultExpiry.toISOString().substring(0, 10);
      added.push({
        id: `batch-sync-${Date.now()}-${b.nama.replace(/\s/g, '-')}`,
        batchNo: `STK-${Date.now().toString().slice(-6)}`,
        bahanNama: b.nama,
        qty: b.isiKemasan,
        satuan: b.satuan,
        supplier: 'Dari Stok',
        expiryDate: expStr,
        dateAdded: new Date().toISOString().substring(0, 10),
      });
    });

    if (added.length > 0) {
      setBatches(prev => [...added, ...prev]);
    }
    setSyncResult({ added: added.length, skipped });
    setShowSyncConfirm(true);
    setTimeout(() => setShowSyncConfirm(false), 4000);
  };

  // ─── AUTO-DETECT: bahan yang ada stok tapi belum punya batch ───
  const bahanTanpaBatch = useMemo(() => {
    const batchBahan = new Set(batches.map(b => b.bahanNama.toLowerCase()));
    return bahanBaku.filter(b => b.isiKemasan > 0 && !batchBahan.has(b.nama.toLowerCase()));
  }, [bahanBaku, batches]);

  // ─── BATCH CRUD ───
  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBahan || !formBatch || !formExpiry) return;
    const qty = parseFloat(formQty) || 0;
    const bahanInfo = bahanBaku.find(b => b.nama === formBahan);      const newBatch: BatchLog = {
        id: `batch-${Date.now()}`,
        batchNo: formBatch,
        bahanNama: formBahan,
        qty: qty,
        satuan: formSatuan,
        supplier: formSupplier,
        expiryDate: formExpiry,
        dateAdded: new Date().toISOString().substring(0, 10),
      };
    setBatches(prev => [newBatch, ...prev]);
    setFormBatch(''); setFormQty(''); setFormSatuan('gr'); setFormSupplier(''); setFormExpiry('');
    setShowForm(false);
  };

  const handleDeleteBatch = (id: string) => {
    setBatches(prev => prev.filter(b => b.id !== id));
  };

  const handleConvertToWaste = async (batch: BatchLog) => {
    if (!onAddWasteLog) return;
    const confirmMsg = `Konversi batch "${batch.batchNo}" (${batch.bahanNama} ${batch.qty} ${batch.satuan}) ke Waste?\n\nBatch ini akan dihapus dari daftar dan dicatat sebagai waste.`;
    const confirmed_158 = await new Promise<boolean>((resolve) => {
      showConfirm({
        title: 'Konfirmasi',
        message: confirmMsg,
        confirmLabel: 'Ya',
        cancelLabel: 'Batal',
        variant: 'warning',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed_158) return;

    const wasteLog: WasteLog = {
      id: `waste-${Date.now()}`,
      bahanNama: batch.bahanNama,
      qtyWasted: batch.qty,
      satuan: batch.satuan,
      lossValue: batch.qty * (bahanBaku.find(b => b.nama === batch.bahanNama)?.hargaSatuan || 0),
      location: 'Gudang Utama',
      reason: `Expired — Batch ${batch.batchNo}`,
      dateLogged: new Date().toISOString().substring(0, 10),
    };
    onAddWasteLog(wasteLog);
    handleDeleteBatch(batch.id);
  };

  const getFEFORecommendation = () => {
    const active = batches.filter(b => new Date(b.expiryDate) >= new Date());
    const sorted = active.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    return sorted[0] || null;
  };

  const fefoRec = getFEFORecommendation();

  const today = new Date();
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

  const expiredBatches = batches.filter(b => new Date(b.expiryDate) < today);
  const criticalBatches = batches.filter(b => {
    const d = new Date(b.expiryDate);
    return d >= today && d <= in3Days;
  });
  const warningBatches = batches.filter(b => {
    const d = new Date(b.expiryDate);
    return d > in3Days && d <= in7Days;
  });

  const [productExpiry, setProductExpiry] = useState<ProductExpiryLog[]>(() =>
    safeGetLocalStorage<ProductExpiryLog[]>('fefo_product_expiry_data', [])
  );

  useEffect(() => {
    localStorage.setItem('fefo_product_expiry_data', JSON.stringify(productExpiry));
  }, [productExpiry]);

  const stockByBahan = batches.reduce((acc: Record<string, number>, b) => {
    if (!acc[b.bahanNama]) acc[b.bahanNama] = 0;
    acc[b.bahanNama] += b.qty;
    return acc;
  }, {});

  const lowStockItems = Object.entries(stockByBahan).filter(([name, qty]) => {
    const safe = safetyStock[name] || 500;
    return qty < safe;
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const daysUntil = (dateStr: string) => {
    const d = new Date(dateStr);
    return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  // ─── SMART DISTRIBUTION FUNCTIONS ───
  const getDistributionRecommendation = useCallback((batch: BatchLog): DistributionRecommendation | null => {
    const sisaHari = daysUntil(batch.expiryDate);
    if (sisaHari <= 0) return null;
    
    const lt = leadTimes[batch.bahanNama] || 1;
    const sisaHariEfektif = sisaHari - lt;
    if (sisaHariEfektif <= 0) {
      return {
        batchId: batch.id,
        batchNo: batch.batchNo,
        bahanNama: batch.bahanNama,
        expiryDate: batch.expiryDate,
        sisaHari,
        leadTime: lt,
        sisaHariEfektif: 0,
        adsPerCabang: [],
        rekomendasiCabangId: '',
        rekomendasiCabangNama: '⚠️ Tidak bisa dikirim (waktu kirim > sisa hari)',
        wasteRisk: 'tinggi',
      };
    }
    
    // Hitung ADS per cabang untuk bahan ini
    // Gunakan cabangList yang ada + data dummy untuk demo (karena detailResep tidak di-pass ke FEFO)
    const adsPerCabang = cabangList.map(cabang => {
      // Estimasi ADS berdasarkan data penjualan dari localStorage
      let ads = 0.5; // Default conservative
      try {
        const revenueRaw = localStorage.getItem('revenue_tracker_data');
        if (revenueRaw) {
          const parsed = JSON.parse(revenueRaw);
          const txns = parsed.transactions || [];
          // Filter transaksi untuk cabang ini dalam 14 hari terakhir
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 14);
          const recentTxns = txns.filter((t: any) => {
            if (!t.date || !t.qty) return false;
            const txSource = (t.source || '').toLowerCase();
            const cabangMatch = txSource.includes(cabang.nama.toLowerCase()) || 
              (cabang.id === 'pusat' && (txSource.includes('walk-in') || txSource.includes('pos')));
            return cabangMatch && new Date(t.date) >= cutoff;
          });
          const totalQty = recentTxns.reduce((s: number, t: any) => s + (t.qty || 0), 0);
          ads = totalQty / 14;
        }
      } catch (e) { /* silent */ }
      
      const kapasitasJual = ads * sisaHariEfektif;
      let skorPrioritas = 0;
      if (sisaHari <= 7) {
        skorPrioritas = kapasitasJual;
      } else {
        const stokSaatIni = cabangStok.find(s => s.cabangId === cabang.id && s.bahanNama === batch.bahanNama)?.stokTeoritis || 0;
        skorPrioritas = stokSaatIni > 0 && ads > 0 ? stokSaatIni / ads : kapasitasJual;
      }
      
      // Faktor bobot: makin tinggi ADS, makin cepat laku
      const rekomendasiQty = Math.round(kapasitasJual * 0.8); // 80% dari kapasitas untuk safety
      
      return { 
        cabangId: cabang.id, 
        cabangNama: cabang.nama, 
        ads: Math.round(ads * 10) / 10,
        rekomendasiQty: Math.max(1, rekomendasiQty),
        skorPrioritas,
      };
    });
    
    // Sortir berdasarkan prioritas
    adsPerCabang.sort((a, b) => b.skorPrioritas - a.skorPrioritas);
    
    const rekomendasi = adsPerCabang[0];
    const wasteRisk: 'rendah' | 'sedang' | 'tinggi' = 
      sisaHariEfektif <= 3 ? 'tinggi' :
      sisaHariEfektif <= 7 ? 'sedang' : 'rendah';
    
    return {
      batchId: batch.id,
      batchNo: batch.batchNo,
      bahanNama: batch.bahanNama,
      expiryDate: batch.expiryDate,
      sisaHari,
      leadTime: lt,
      sisaHariEfektif,
      adsPerCabang,
      rekomendasiCabangId: rekomendasi?.cabangId || '',
      rekomendasiCabangNama: rekomendasi?.cabangNama || '-',
      wasteRisk,
    };
  }, [cabangList, leadTimes, bahanBaku, cabangStok]);
  
  // ─── INTER-BRANCH REBALANCING (Stock Swap) ───
  const stockSwapSuggestions = useMemo((): StockSwapSuggestion[] => {
    if (cabangList.length < 2 || batches.length === 0) return [];
    
    const suggestions: StockSwapSuggestion[] = [];
    const today = new Date();
    
    // Cari batch yang akan expired dalam 7 hari
    const nearExpiryBatches = batches.filter(b => {
      const days = daysUntil(b.expiryDate);
      return days > 0 && days <= 7;
    });
    
    nearExpiryBatches.forEach(batch => {
      // Cari cabang yang punya stok bahan ini (teoritis) dan yang tidak punya
      interface CabangStokItem { cabang: Cabang; stok: number }
      const stokPerCabang: CabangStokItem[] = cabangList.map(c => ({
        cabang: c,
        stok: cabangStok.find(s => s.cabangId === c.id && s.bahanNama === batch.bahanNama)?.stokTeoritis || 0,
      }));
      const cabangWithStock: CabangStokItem[] = stokPerCabang.filter((c): c is CabangStokItem => c.stok > 0);
      
      const cabangWithoutStock: Cabang[] = cabangList.filter(c => 
        !cabangWithStock.some(cs => cs.cabang.id === c.id)
      );
      
      if (cabangWithStock.length >= 2) {
        // Ada cabang yang kelebihan stok hampir expired — rekomendasikan pindah ke cabang lain
        cabangWithStock.sort((a, b) => b.stok - a.stok);
        const cabangSumber = cabangWithStock[0];
        const cabangTujuan = cabangWithoutStock.length > 0 
          ? { id: cabangWithoutStock[0].id, nama: cabangWithoutStock[0].nama }
          : { id: cabangWithStock[cabangWithStock.length - 1].cabang.id, nama: cabangWithStock[cabangWithStock.length - 1].cabang.nama };
        
        if (cabangSumber.cabang.id !== cabangTujuan.id) {
          const lossValue = batch.qty * (bahanBaku.find(b => b.nama === batch.bahanNama)?.hargaSatuan || 0);
          suggestions.push({
            bahanNama: batch.bahanNama,
            dariCabangId: cabangSumber.cabang.id,
            dariCabangNama: cabangSumber.cabang.nama,
            keCabangId: cabangTujuan.id,
            keCabangNama: cabangTujuan.nama,
            qty: Math.min(batch.qty, cabangSumber.stok),
            satuan: batch.satuan,
            alasan: `Batch ${batch.batchNo} akan expired dalam ${daysUntil(batch.expiryDate)} hari di ${cabangSumber.cabang.nama}. Pindahkan ke ${cabangTujuan.nama} yang stoknya lebih rendah.`,
            potensiSavedValue: lossValue,
          });
        }
      }
    });
    
    return suggestions.slice(0, 5); // Max 5 suggestions
  }, [batches, cabangList, cabangStok, bahanBaku]);
  
  // ─── AUTO-PROMO TRIGGER ───
  const generateAutoPromoSignals = useCallback(() => {
    const today = new Date();
    const newSignals: AutoPromoSignal[] = [];
    
    const nearExpiryBatches = batches.filter(b => {
      const days = daysUntil(b.expiryDate);
      return days > 0 && days <= 5; // ≤5 hari lagi expired
    });
    
    nearExpiryBatches.forEach(batch => {
      // Cari produk yang menggunakan bahan ini
      const produkTerkait = productHpp?.filter(p => 
        // Infer dari nama — fallback
        p.namaProduk.toLowerCase().includes(batch.bahanNama.toLowerCase().split(' ')[0])
      ) || [];
      
      if (produkTerkait.length === 0) return;
      
      // Cari cabang dengan ADS tertinggi untuk produk ini
      // Simulasi: pilih cabang dengan penjualan tertinggi
      const cabangDenganStok = cabangList.filter(c => 
        cabangStok.some(s => s.cabangId === c.id && s.bahanNama === batch.bahanNama)
      );
      
      cabangDenganStok.forEach(cabang => {
        const existing = autoPromoSignals.find(
          s => s.productName === produkTerkait[0]?.namaProduk && 
              s.cabangId === cabang.id && 
              s.status === 'pending'
        );
        if (existing) return; // Sudah ada signal pending untuk produk+cabang ini
        
        const daysLeft = daysUntil(batch.expiryDate);
        const suggestedDiscount = daysLeft <= 2 ? 50 : daysLeft <= 4 ? 30 : 20;
        
        newSignals.push({
          id: `promo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          productName: produkTerkait[0].namaProduk,
          cabangId: cabang.id,
          cabangNama: cabang.nama,
          reason: `Batch bahan ${batch.bahanNama} (${batch.batchNo}) akan expired ${daysLeft} hari lagi. Diskon ${suggestedDiscount}% untuk mempercepat penjualan.`,
          suggestedDiscount,
          batchExpiry: batch.expiryDate,
          createdAt: today.toISOString(),
          status: 'pending',
        });
      });
    });
    
    if (newSignals.length > 0) {
      setAutoPromoSignals(prev => [...newSignals, ...prev]);
      return newSignals.length;
    }
    return 0;
  }, [batches, cabangList, cabangStok, productHpp, autoPromoSignals]);

  return (
    <div className="space-y-6">
      {/* LOCAL NOTIFICATION */}
      {localNotif && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl shadow-lg border text-xs font-bold transition-all ${
          localNotif.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-white border-slate-600'
        }`}>
          {localNotif.msg}
        </div>
      )}
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-600" /> FEFO & Expiry Alert
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Lacak batch bahan baku berdasarkan tanggal kedaluwarsa (First Expired First Out) + peringatan stok kritis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSyncFromStok}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
            <Database className="w-3.5 h-3.5" /> Sync dari Stok Pusat
          </button>
          <button onClick={() => {
            const printWin = window.open('', '_blank');
            if (!printWin) return;
            const rows = [...expiredBatches, ...criticalBatches, ...warningBatches, ...batches.filter(b => {
              const d = new Date(b.expiryDate);
              return d > in7Days;
            })].map(b => {
              const days = daysUntil(b.expiryDate);
              const isExpired = days < 0;
              const isCritical = days >= 0 && days <= 3;
              return `<tr${isExpired ? ' style="background:#fef2f2;"' : isCritical ? ' style="background:#fffbeb;"' : ''}>
                <td style="padding:8px;border-bottom:1px solid #eee;font-family:monospace;font-weight:bold;">${b.batchNo}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;">${b.bahanNama}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${b.qty >= 1000 ? (b.qty/1000).toFixed(1) + ' kg' : b.qty + ' ' + b.satuan}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;">${b.supplier || '-'}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatDate(b.expiryDate)}</td>
                <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;${isExpired ? 'color:#dc2626;font-weight:bold;' : ''}">${isExpired ? 'Expired!' : days + ' hr'}</td>
              </tr>`;
            }).join('');
            printWin.document.write(`
              <html><head><title>Laporan FEFO</title>
              <style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:900px;margin:0 auto;padding:40px;color:#1f2937;}h1{font-size:22px;color:#065f46;}table{width:100%;border-collapse:collapse;}th{background:#f3f4f6;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;}td{padding:8px;border-bottom:1px solid #e5e7eb;}.alert{display:inline-block;padding:6px 14px;border-radius:8px;font-size:13px;margin-right:8px;}@media print{body{padding:20px;}}</style></head><body>
              <h1>📋 LAPORAN BATCH & EXPIRY</h1>
              <p style="color:#6b7280;font-size:12px;">Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { year:'numeric',month:'long',day:'numeric' })}</p>
              <table><thead><tr><th>Batch</th><th>Bahan</th><th style="text-align:right;">Stok</th><th>Supplier</th><th style="text-align:right;">Expired</th><th style="text-align:center;">Status</th></tr></thead><tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px;">Belum ada batch.</td></tr>'}</tbody></table>
              <script>window.print();<\/script></body></html>
            `);
            printWin.document.close();
          }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
            <Printer className="w-3.5 h-3.5" /> Cetak
          </button>
        </div>
      </div>

      {/* SYNC RESULT TOAST */}
      {showSyncConfirm && syncResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[10px] text-emerald-800 flex items-center gap-2 animate-pulse">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Sync selesai!</strong> {syncResult.added} batch baru dibuat dari stok pusat.
            {syncResult.skipped.length > 0 && ` ${syncResult.skipped.length} bahan dilewati (sudah punya batch).`}
          </span>
        </div>
      )}

      {/* AUTO-DETECT BAHAN TANPA BATCH */}
      {bahanTanpaBatch.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>{bahanTanpaBatch.length} bahan</strong> dengan stok ({bahanTanpaBatch.map(b => `${b.nama} (${b.isiKemasan} ${b.satuan})`).join(', ')}) 
            {' '}belum punya batch FEFO. Klik <strong>"Sync dari Stok Pusat"</strong> untuk auto-buat batch.
          </span>
        </div>
      )}

      {/* KONEKSI INFO */}
      {onAddWasteLog && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[10px] text-blue-800 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 shrink-0" />
          <span><span className="font-bold">Terhubung ke Waste & Stok Pusat:</span> Batch expired bisa langsung dikonversi ke Waste. Sync otomatis narik data dari stok pusat.</span>
        </div>
      )}

      {/* ALERT PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className={`p-4 rounded-xl border shadow-xs ${expiredBatches.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${expiredBatches.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            <div>
              <span className="text-xs font-bold text-gray-700 block">Kedaluwarsa</span>
              <span className="font-mono font-black text-lg">{expiredBatches.length}</span>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border shadow-xs ${criticalBatches.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${criticalBatches.length > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
            <div>
              <span className="text-xs font-bold text-gray-700 block">Kritis (≤3 hr)</span>
              <span className="font-mono font-black text-lg">{criticalBatches.length}</span>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border shadow-xs ${warningBatches.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <Calendar className={`w-5 h-5 ${warningBatches.length > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
            <div>
              <span className="text-xs font-bold text-gray-700 block">Akan Expired</span>
              <span className="font-mono font-black text-lg">{warningBatches.length}</span>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border shadow-xs ${lowStockItems.length > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <Package className={`w-5 h-5 ${lowStockItems.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
            <div>
              <span className="text-xs font-bold text-gray-700 block">Stok Kritis</span>
              <span className="font-mono font-black text-lg">{lowStockItems.length}</span>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border shadow-xs ${bahanTanpaBatch.length > 0 ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <Database className={`w-5 h-5 ${bahanTanpaBatch.length > 0 ? 'text-purple-600' : 'text-gray-400'}`} />
            <div>
              <span className="text-xs font-bold text-gray-700 block">Tanpa Batch</span>
              <span className="font-mono font-black text-lg">{bahanTanpaBatch.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KIRI: Daftar Batch */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Daftar Batch</h4>
            <button onClick={() => setShowForm(!showForm)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
              <Plus className="w-3 h-3" /> Tambah Batch
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleAddBatch} className="p-4 bg-emerald-50 border-b border-emerald-100 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <select required value={formBahan} onChange={(e) => {
                  setFormBahan(e.target.value);
                  const b = bahanBaku.find(x => x.nama === e.target.value);
                  if (b) setFormSatuan(b.satuan);
                }}
                  className="border border-gray-200 rounded-lg p-2 bg-white">
                  <option value="">-- Bahan --</option>
                  {bahanBaku.map(b => <option key={b.nama} value={b.nama}>{b.nama} ({b.satuan})</option>)}
                </select>
                <input type="text" required placeholder="No. Batch" value={formBatch}
                  onChange={(e) => setFormBatch(e.target.value)}
                  className="border border-gray-200 rounded-lg p-2" />
                <div className="flex items-center gap-1">
                  <input type="number" required min="1" placeholder="Qty" value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg p-2 font-mono" />
                  <select value={formSatuan} onChange={e => setFormSatuan(e.target.value)}
                    className="border border-gray-200 rounded-lg p-2 font-bold bg-white min-w-[60px] text-center">
                    {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <input type="date" required value={formExpiry}
                  onChange={(e) => setFormExpiry(e.target.value)}
                  className="border border-gray-200 rounded-lg p-2" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <input type="text" placeholder="Supplier (opsional)" value={formSupplier}
                  onChange={(e) => setFormSupplier(e.target.value)}
                  className="border border-gray-200 rounded-lg p-2" />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-3 py-1.5 text-gray-500 text-xs font-bold rounded-lg hover:bg-gray-100 transition cursor-pointer">Batal</button>
                  <button type="submit"
                    className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition cursor-pointer">Simpan</button>
                </div>
              </div>
            </form>
          )}

          <div className="overflow-y-auto max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50/50 sticky top-0">
                  <th className="px-4 py-2.5">Batch #</th>
                  <th className="px-4 py-2.5">Bahan</th>
                  <th className="px-4 py-2.5 text-right">Stok</th>
                  <th className="px-4 py-2.5 text-center">Satuan</th>
                  <th className="px-4 py-2.5 text-right">Stok Pusat</th>
                  <th className="px-4 py-2.5">Supplier</th>
                  <th className="px-4 py-2.5 text-right">Expired</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  <th className="px-4 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[...expiredBatches, ...criticalBatches, ...warningBatches, ...batches.filter(b => {
                  const d = new Date(b.expiryDate);
                  return d > in7Days;
                })].map(b => {
                  const days = daysUntil(b.expiryDate);
                  const isExpired = days < 0;
                  const isCritical = days >= 0 && days <= 3;
                  const isWarning = days > 3 && days <= 7;
                  const stokPusat = bahanBaku.find(bb => bb.nama === b.bahanNama)?.isiKemasan || 0;
                  return (
                    <tr key={b.id} className={`hover:bg-gray-50/50 ${isExpired ? 'bg-red-50/50' : isCritical ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3 font-mono font-bold text-gray-800">{b.batchNo}</td>
                      <td className="px-4 py-3">{b.bahanNama}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {b.qty >= 1000 ? (b.qty / 1000).toFixed(1) : b.qty}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-gray-600">{b.satuan}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">{stokPusat} {b.satuan}</td>
                      <td className="px-4 py-3 text-gray-500">{b.supplier || '-'}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">{formatDate(b.expiryDate)}</td>
                      <td className="px-4 py-3 text-center">
                        {isExpired ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[9px]">Expired!</span>
                        ) : isCritical ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold text-[9px]">{days} hr</span>
                        ) : isWarning ? (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-bold text-[9px]">{days} hr</span>
                        ) : (
                          <span className="text-gray-400 text-[9px]">{days} hr</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {isExpired && onAddWasteLog && (
                            <button onClick={() => handleConvertToWaste(b)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded cursor-pointer"
                              title="Konversi ke Waste">
                              <AlertOctagon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => handleDeleteBatch(b.id)}
                            className="text-gray-400 hover:text-red-600 cursor-pointer p-1">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {batches.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Belum ada batch. Klik "Sync dari Stok Pusat" atau tambah manual!</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FEFO Recommendation */}
          {fefoRec && (
            <div className="m-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs">
              <span className="text-[10px] font-bold text-amber-700 uppercase block mb-1">Rekomendasi FEFO:</span>
              <p className="font-bold text-slate-900 font-mono">{fefoRec.batchNo} - {fefoRec.bahanNama}</p>
              <p className="text-gray-600">Exp: <span className="font-bold text-red-700">{formatDate(fefoRec.expiryDate)}</span></p>
              <p className="text-[10px] text-amber-700 mt-1 italic">Gunakan batch ini terlebih dahulu untuk mencegah waste.</p>
            </div>
          )}
        </div>

        {/* KANAN: Settings */}
        <div className="lg:col-span-4 space-y-4">
          {/* Safety Stock */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-emerald-600" /> Reorder Alert
            </h4>
            {lowStockItems.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">Semua stok aman. ✅</p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map(([name, qty]) => (
                  <div key={name} className="bg-red-50 p-3 rounded-lg border border-red-100 flex justify-between text-xs">
                    <span className="font-bold text-red-800">{name}</span>
                    <div className="text-right">
                      <span className="font-mono text-red-600 font-bold block">{(qty as number).toFixed(0)} {bahanBaku.find(b => b.nama === name)?.satuan || 'gr'}</span>
                      <span className="text-[9px] text-red-500">Min: {safetyStock[name] || 500}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Safety Stock Settings */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Safety Stock Settings</h4>
            <div className="space-y-2 text-xs max-h-[300px] overflow-y-auto">
              {bahanBaku.map(b => (
                <div key={b.nama} className="flex items-center gap-2">
                  <span className="flex-1 truncate font-medium text-gray-700">{b.nama}</span>
                  <input type="number" min="0" value={safetyStock[b.nama] || 500}
                    onChange={(e) => setSafetyStock({ ...safetyStock, [b.nama]: parseInt(e.target.value) || 0 })}
                    className="w-16 border border-gray-200 rounded p-1.5 text-center font-mono" />
                  <span className="text-gray-400 text-[9px]">{b.satuan}</span>
                </div>
              ))}
              {bahanBaku.length === 0 && (
                <p className="text-gray-400 text-center py-3">Tambah bahan baku dulu.</p>
              )}
            </div>
          </div>

          {/* Bahan tanpa batch quick-list */}
          {bahanTanpaBatch.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-purple-600" /> Bahan Tanpa Batch
              </h4>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                {bahanTanpaBatch.map(b => (
                  <div key={b.nama} className="flex items-center justify-between bg-purple-50 p-2 rounded-lg border border-purple-100 text-xs">
                    <span className="font-medium text-purple-900">{b.nama}</span>
                    <span className="font-mono text-purple-700">{b.isiKemasan} {b.satuan}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleSyncFromStok}
                className="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold py-2 rounded-lg transition cursor-pointer flex items-center justify-center gap-1">
                <Database className="w-3.5 h-3.5" /> Sync {bahanTanpaBatch.length} Bahan
              </button>
            </div>
          )}

          {/* ─── SALES VELOCITY / ADS ─── */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Sales Velocity
              </h4>
              <button onClick={() => setShowDistribusi(!showDistribusi)}
                className="px-2 py-1 text-[9px] font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition cursor-pointer">
                {showDistribusi ? 'Tutup' : 'Smart Distribusi ▸'}
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mb-2">Average Daily Sales per bahan — dihitung dari data transaksi 14 hari terakhir.</p>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {batches.slice(0, 10).map(batch => {
                const adsPerCabang = calculateBahanADS(batch.bahanNama, detailResep, 14);
                const cabangAds = Array.from(adsPerCabang.values());
                return (
                  <div key={batch.id} className="border border-gray-100 rounded-lg p-2 text-[10px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-700">{batch.bahanNama}</span>
                      <span className="text-gray-400">Batch: {batch.batchNo}</span>
                    </div>
                    {cabangAds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {cabangAds.map((ad, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-bold">
                            {ad.cabangNama}: {ad.dailyConsumption.toFixed(1)} {batch.satuan}/hari
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Belum ada data transaksi untuk bahan ini</span>
                    )}
                  </div>
                );
              })}
              {batches.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">Tambahkan batch untuk melihat Sales Velocity.</p>
              )}
            </div>
          </div>

          {/* ─── SMART DISTRIBUTION PANEL ─── */}
          {showDistribusi && (
            <div className="bg-white rounded-2xl border border-emerald-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-emerald-50 border-b border-emerald-100">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                  <GitBranch className="w-4 h-4 text-emerald-600" /> Smart Distribution
                </h4>
                <p className="text-[10px] text-gray-500 mt-1">
                  Rekomendasi distribusi batch ke cabang berdasarkan ADS (kecepatan jual) + lead time.
                </p>
              </div>
              
              {/* Lead Time Settings */}
              <div className="p-3 border-b border-gray-100">
                <h5 className="text-[10px] font-bold text-gray-600 uppercase mb-2">Lead Time (hari) per Bahan</h5>
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                  {bahanBaku.slice(0, 15).map(b => (
                    <div key={b.nama} className="flex items-center gap-2 text-[10px]">
                      <span className="flex-1 truncate font-medium text-gray-600">{b.nama}</span>
                      <input type="number" min="0" max="7" value={leadTimes[b.nama] || 1}
                        onChange={(e) => setLeadTimes({ ...leadTimes, [b.nama]: Math.max(0, parseInt(e.target.value) || 1) })}
                        className="w-10 border border-gray-200 rounded p-1 text-center font-mono" />
                      <span className="text-gray-400">hari</span>
                    </div>
                  ))}
                  {bahanBaku.length === 0 && <p className="text-xs text-gray-400">Tambah bahan dulu.</p>}
                </div>
              </div>
              
              {/* Recommendations per Batch */}
              <div className="p-3 space-y-2 max-h-[350px] overflow-y-auto">
                {batches.filter(b => new Date(b.expiryDate) >= new Date()).slice(0, 10).map(batch => {
                  const rec = getDistributionRecommendation(batch);
                  if (!rec) return null;
                  return (
                    <div key={batch.id} className={`border rounded-lg p-2.5 text-[10px] ${
                      rec.wasteRisk === 'tinggi' ? 'border-red-200 bg-red-50/30' :
                      rec.wasteRisk === 'sedang' ? 'border-amber-200 bg-amber-50/30' :
                      'border-emerald-200 bg-emerald-50/30'
                    }`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-gray-800">{batch.bahanNama}</span>
                        <span className={`px-1.5 py-0.5 rounded-full font-bold text-[8px] ${
                          rec.wasteRisk === 'tinggi' ? 'bg-red-100 text-red-700' :
                          rec.wasteRisk === 'sedang' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          Risiko Waste: {rec.wasteRisk.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-gray-600 mb-1.5">
                        <div>Batch: <span className="font-mono font-bold">{batch.batchNo}</span></div>
                        <div>Exp: <span className="font-bold">{formatDate(batch.expiryDate)}</span></div>
                        <div>Sisa: <span className="font-bold">{rec.sisaHari} hari</span></div>
                        <div>Lead: <span className="font-bold">{rec.leadTime} hari</span></div>
                        <div className="col-span-2">Efektif: <span className={`font-bold ${rec.sisaHariEfektif <= 3 ? 'text-red-600' : 'text-emerald-600'}`}>{rec.sisaHariEfektif} hari</span></div>
                      </div>
                      {rec.adsPerCabang.length > 0 && (
                        <div className="space-y-1 mb-1.5">
                          <span className="font-bold text-gray-500 text-[9px]">Prioritas Kirim:</span>
                          {rec.adsPerCabang.map((ac, i) => (
                            <div key={i} className={`flex items-center justify-between px-2 py-1 rounded ${
                              i === 0 ? 'bg-emerald-100 border border-emerald-200' : 'bg-gray-50'
                            }`}>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-2.5 h-2.5 text-gray-400" />
                                <span className="font-bold text-gray-700">{ac.cabangNama}</span>
                                {i === 0 && <span className="text-[8px] bg-emerald-600 text-white px-1 py-0.5 rounded-full font-bold">TOP</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">ADS: {ac.ads}/hr</span>
                                <span className="font-bold text-gray-700">{ac.rekomendasiQty} {batch.satuan}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-[9px] text-gray-500 italic">
                        Rekomendasi: kirim <strong>{rec.rekomendasiCabangNama}</strong> — {rec.wasteRisk === 'tinggi' ? 'prioritas tinggi untuk mencegah waste' : 'distribusi optimal berdasarkan ADS'}
                      </div>
                    </div>
                  );
                })}
                {batches.filter(b => new Date(b.expiryDate) >= new Date()).length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">Semua batch aktif. Tidak ada rekomendasi distribusi.</p>
                )}
              </div>
            </div>
          )}

          {/* ─── AUTO-PROMO TRIGGER ─── */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-amber-600" /> Auto-Promo Trigger
              </h4>
              <button onClick={() => {
                const count = generateAutoPromoSignals();
                if (count > 0) {
                  setLocalNotif({ msg: `🎯 ${count} sinyal promo otomatis dibuat!`, type: 'success' });
                } else {
                  setLocalNotif({ msg: '✅ Tidak ada batch yang perlu dipromokan saat ini.', type: 'info' });
                }
              }}
                className="px-2 py-1 text-[9px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition cursor-pointer flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Generate Sinyal
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mb-2">
              Deteksi batch yang akan expired ≤5 hari & buat sinyal diskon otomatis untuk Web Store.
            </p>
            {autoPromoSignals.filter(s => s.status === 'pending').length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {autoPromoSignals.filter(s => s.status === 'pending').slice(0, 5).map(signal => (
                  <div key={signal.id} className="border border-amber-200 bg-amber-50/30 rounded-lg p-2.5 text-[10px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-800">{signal.productName}</span>
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 font-bold rounded text-[8px]">-{signal.suggestedDiscount}%</span>
                    </div>
                    <p className="text-gray-600 mb-1">{signal.reason}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">📍 {signal.cabangNama}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => {
                          setAutoPromoSignals(prev => prev.map(s => 
                            s.id === signal.id ? { ...s, status: 'activated' as const } : s
                          ));
                          setLocalNotif({ msg: `✅ Sinyal promo untuk "${signal.productName}" diaktifkan!`, type: 'success' });
                        }}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[8px] transition cursor-pointer">
                          Aktifkan
                        </button>
                        <button onClick={() => {
                          setAutoPromoSignals(prev => prev.map(s => 
                            s.id === signal.id ? { ...s, status: 'dismissed' as const } : s
                          ));
                        }}
                          className="px-2 py-0.5 text-gray-400 hover:text-red-600 font-bold text-[8px] transition cursor-pointer">
                          Abaikan
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 text-center py-3">
                Belum ada sinyal promo. Klik "Generate Sinyal" untuk scan batch yang akan expired.
              </p>
            )}
            {autoPromoSignals.filter(s => s.status === 'activated').length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-[10px] text-emerald-700 font-bold">✅ {autoPromoSignals.filter(s => s.status === 'activated').length} sinyal sudah diaktifkan.</p>
              </div>
            )}
          </div>

          {/* ─── INTER-BRANCH REBALANCING ─── */}
          {stockSwapSuggestions.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-amber-200 shadow-xs border-l-4 border-l-amber-500">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-amber-600" /> Inter-Branch Rebalancing
              </h4>
              <p className="text-[10px] text-gray-500 mb-3">
                Deteksi stok yang hampir expired di satu cabang & rekomendasi pemindahan ke cabang lain untuk mencegah waste.
              </p>
              <div className="space-y-2">
                {stockSwapSuggestions.map((s, i) => (
                  <div key={i} className="border border-amber-100 bg-amber-50/30 rounded-lg p-2.5 text-[10px]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-bold text-gray-800">{s.bahanNama}</span>
                      <span className="text-gray-400">{s.qty} {s.satuan}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded font-bold">{s.dariCabangNama}</span>
                      <ArrowRight className="w-3 h-3 text-gray-400" />
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-bold">{s.keCabangNama}</span>
                    </div>
                    <p className="text-gray-500 mt-1">{s.alasan}</p>
                    <p className="text-[9px] text-amber-700 font-bold mt-1">
                      💰 Potensi selamat: {formatCurrency(s.potensiSavedValue)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── RINGKASAN EXPIRED PER CABANG ─── */}
          {expiredBatches.length > 0 && onAddWasteLog && (
            <div className="bg-white p-5 rounded-2xl border border-red-200 shadow-xs border-l-4 border-l-red-500">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" /> Ringkasan Expired per Cabang
              </h4>
              <p className="text-[10px] text-gray-500 mb-3">
                Bahan expired yang terdistribusi ke cabang — segera recall untuk dicatat sebagai waste.
              </p>
              <div className="space-y-2">
                {(() => {
                  // Compute expired items per cabang
                  const cabangExpired = new Map<string, { nama: string; items: { bahan: string; qty: number; satuan: string }[] }>();
                  expiredBatches.forEach(b => {
                    suratOrders
                      .filter(so => so.items.some(i => i.bahanNama === b.bahanNama))
                      .forEach(so => {
                        const cabang = cabangList.find(c => c.id === so.cabangId);
                        if (!cabang) return;
                        const item = so.items.find(i => i.bahanNama === b.bahanNama);
                        if (!item || item.qty <= 0) return;
                        if (!cabangExpired.has(cabang.id)) {
                          cabangExpired.set(cabang.id, { nama: cabang.nama, items: [] });
                        }
                        const existingItem = cabangExpired.get(cabang.id)!.items.find(i => i.bahan === b.bahanNama);
                        if (existingItem) {
                          existingItem.qty += item.qty;
                        } else {
                          cabangExpired.get(cabang.id)!.items.push({ bahan: b.bahanNama, qty: item.qty, satuan: b.satuan });
                        }
                      });
                  });
                  if (cabangExpired.size === 0) {
                    return <p className="text-[10px] text-gray-400 italic">Tidak ada batch expired yang terdistribusi ke cabang.</p>;
                  }
                  return Array.from(cabangExpired.values()).map(c => (
                    <div key={c.nama} className="border border-red-100 rounded-xl p-3 bg-white">
                      <div className="flex items-center gap-1.5 text-xs mb-1.5">
                        <span className="font-bold text-red-800">{c.nama}</span>
                        <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">{c.items.reduce((s,i) => s + i.qty, 0)} unit expired</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {c.items.map((item, idx) => (
                          <span key={idx} className="text-[9px] bg-amber-50 border border-amber-200 text-amber-800 px-1.5 py-0.5 rounded-lg font-medium">
                            {item.bahan}: {item.qty} {item.satuan}
                          </span>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
              <div className="mt-3 p-2 bg-red-50 border border-red-100 rounded-lg text-[10px] text-red-800">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                <strong>Total {expiredBatches.length} batch expired</strong> — gunakan tombol <strong>"Recall & Waste"</strong> di panel Distribusi Batch untuk menarik barang dari cabang dan mencatatnya sebagai waste otomatis.
              </div>
            </div>
          )}

          {expiredBatches.length > 0 && onAddWasteLog && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[10px] text-emerald-800">
              <Zap className="w-3 h-3 inline mr-1" />
              <span className="font-bold">Terhubung ke Waste Control:</span> Klik <strong>"Recall & Waste"</strong> pada batch expired di panel Distribusi Batch untuk recall dari cabang dan catat waste otomatis.
            </div>
          )}

          {expiredBatches.length > 0 && !onAddWasteLog && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-[10px] text-amber-800">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              <span className="font-bold">Ada {expiredBatches.length} batch expired</span> — hubungkan modul Waste Control untuk bisa melakukan recall ke cabang.
            </div>
          )}

          {/* ─── DISTRIBUSI BATCH KE CABANG ─── */}
          {suratOrders.length > 0 && cabangList.length > 0 && batches.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600" /> Distribusi Batch ke Cabang
              </h4>
              <p className="text-xs text-gray-500 mb-3">Tracking pengiriman batch berdasarkan Surat Order ke masing-masing cabang. Batch <strong>expired</strong> bisa langsung di-recall dari cabang dan dicatat sebagai waste.</p>
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {batches.slice(0, 20).map(batch => {
                  const isExpired = new Date(batch.expiryDate) < new Date();
                  // Cari SO yang mengirim bahan ini ke cabang
                  const distributions = suratOrders
                    .filter(so => so.items.some(i => i.bahanNama === batch.bahanNama))
                    .map(so => ({
                      cabang: cabangList.find(c => c.id === so.cabangId),
                      qty: so.items.find(i => i.bahanNama === batch.bahanNama)?.qty || 0,
                      status: so.status,
                      tanggal: so.tanggalKirim,
                    }))
                    .filter(d => d.qty > 0);

                  if (distributions.length === 0 && !isExpired) return null;
                  return (
                    <div key={batch.id} className={`border rounded-xl p-3 ${isExpired ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex items-center justify-between gap-2 text-xs mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-gray-700">{batch.batchNo}</span>
                          <span className="font-bold text-gray-900">{batch.bahanNama}</span>
                          <span className="text-gray-400">({batch.satuan})</span>
                          {isExpired && (
                            <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-[9px]">EXPIRED</span>
                          )}
                        </div>
                        {isExpired && onAddWasteLog && (
                          <button onClick={async () => {
                            const cabangDetails = distributions.map(d => `  • ${d.cabang?.nama || 'Unknown'}: ${d.qty} ${batch.satuan} (${d.status})`).join('\n');
                            const totalDistQty = distributions.reduce((s,d) => s + d.qty, 0);
                            const recallMsg = `⚠️ RECALL batch "${batch.batchNo}" (${batch.bahanNama})\n\nBatch ini sudah expired dan terdistribusi ke:\n${cabangDetails}\n\nTOTAL: ${totalDistQty} ${batch.satuan}\n\nKonversi semua ke Waste?`;
                            const confirmed_1110 = await new Promise<boolean>((resolve) => {
                              showConfirm({
                                title: 'Konfirmasi',
                                message: recallMsg,
                                confirmLabel: 'Ya',
                                cancelLabel: 'Batal',
                                variant: 'warning',
                                onConfirm: () => resolve(true),
                                onCancel: () => resolve(false),
                              });
                            });
                            if (!confirmed_1110) return;
                            // Create waste log for each cabang distribution
                            distributions.forEach(d => {
                              if (d.qty <= 0) return;
                              const wasteLog: WasteLog = {
                                id: `waste-recall-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
                                bahanNama: batch.bahanNama,
                                qtyWasted: d.qty,
                                satuan: batch.satuan,
                                lossValue: d.qty * (bahanBaku.find(b => b.nama === batch.bahanNama)?.hargaSatuan || 0),
                                location: 'Gudang Utama',
                                reason: d.cabang ? `Recall dari ${d.cabang.nama} - Batch ${batch.batchNo}` : `Recall expired - Batch ${batch.batchNo}`,
                                dateLogged: new Date().toISOString().substring(0, 10),
                              };
                              onAddWasteLog(wasteLog);
                            });
                            // Remove the expired batch
                            handleDeleteBatch(batch.id);
                          }}
                            className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer">
                            <AlertOctagon className="w-3 h-3" /> Recall & Waste
                          </button>
                        )}
                      </div>
                      {distributions.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {distributions.map((d, i) => (
                            <div key={i} className={`text-[9px] px-2 py-1 rounded-lg border font-bold ${
                              d.status === 'diterima' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                              d.status === 'dikirim' ? 'bg-amber-50 border-amber-200 text-amber-800' :
                              'bg-blue-50 border-blue-200 text-blue-800'
                            }`}>
                              {d.cabang?.nama || 'Unknown'}: {d.qty} {batch.satuan}
                              <span className="ml-1">({d.status === 'diterima' ? '✅' : d.status === 'dikirim' ? '📦' : '🕐'})</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {distributions.length === 0 && !isExpired && (
                        <span className="text-[10px] text-gray-400 italic">Belum ada distribusi ke cabang</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
