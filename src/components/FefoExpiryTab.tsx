import React, { useState, useEffect } from 'react';
import { ShieldAlert, Calendar, AlertTriangle, Clock, Package, Trash2, Plus, Printer, RefreshCw, AlertOctagon } from 'lucide-react';
import { BahanBaku, ProductHpp, WasteLog } from '../types';

interface BatchLog {
  id: string;
  batchNo: string;
  materialName: string;
  bahanNama: string;
  qtySecured: number;
  qty: number;
  unit: string;
  satuan: string;
  supplier: string;
  expDate: string;
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
  onAddWasteLog?: (log: WasteLog, cabangId?: string) => void;
}

export default function FefoExpiryTab({ bahanBaku, productHpp, onAddWasteLog }: FefoExpiryTabProps) {
  const [batches, setBatches] = useState<BatchLog[]>(() => {
    const saved = localStorage.getItem('fefo_expiry_batches_data');
    return saved ? JSON.parse(saved) : [];
  });
  const [showForm, setShowForm] = useState(false);
  const [formBahan, setFormBahan] = useState('');
  const [formBatch, setFormBatch] = useState('');
  const [formQty, setFormQty] = useState('');
  const [formSupplier, setFormSupplier] = useState('');
  const [formExpiry, setFormExpiry] = useState('');
  const [safetyStock, setSafetyStock] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('fefo_safety_stock_data');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('fefo_expiry_batches_data', JSON.stringify(batches));
  }, [batches]);

  useEffect(() => {
    localStorage.setItem('fefo_safety_stock_data', JSON.stringify(safetyStock));
  }, [safetyStock]);

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBahan || !formBatch || !formExpiry) return;
    const qty = parseFloat(formQty) || 0;
    const bahanInfo = bahanBaku.find(b => b.nama === formBahan);
    const newBatch: BatchLog = {
      id: `batch-${Date.now()}`,
      batchNo: formBatch,
      materialName: formBahan,
      bahanNama: formBahan,
      qtySecured: qty,
      qty: qty,
      unit: bahanInfo?.satuan || 'gr',
      satuan: bahanInfo?.satuan || 'gr',
      supplier: formSupplier,
      expDate: formExpiry,
      expiryDate: formExpiry,
      dateAdded: new Date().toISOString().substring(0, 10),
    };
    setBatches(prev => [newBatch, ...prev]);
    setFormBatch('');
    setFormQty('');
    setFormSupplier('');
    setFormExpiry('');
    setShowForm(false);
  };

  const handleDeleteBatch = (id: string) => {
    setBatches(prev => prev.filter(b => b.id !== id));
  };

  const handleConvertToWaste = (batch: BatchLog) => {
    if (!onAddWasteLog) return;
    const confirmMsg = `Konversi batch "${batch.batchNo}" (${batch.bahanNama} ${batch.qty} ${batch.satuan}) ke Waste?\n\nBatch ini akan dihapus dari daftar dan dicatat sebagai waste.`;
    if (!window.confirm(confirmMsg)) return;

    const wasteLog: WasteLog = {
      id: `waste-${Date.now()}`,
      bahanNama: batch.bahanNama,
      qtyWasted: batch.qty,
      satuan: batch.satuan,
      lossValue: batch.qty * (bahanBaku.find(b => b.nama === batch.bahanNama)?.hargaSatuan || 0),
      tanggal: new Date().toISOString().substring(0, 10),
      penyebab: `Expired — Batch ${batch.batchNo}`,
      kategori: 'expired',
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

  const [productExpiry, setProductExpiry] = useState<ProductExpiryLog[]>(() => {
    const saved = localStorage.getItem('fefo_product_expiry_data');
    return saved ? JSON.parse(saved) : [];
  });

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

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-emerald-600" /> FEFO & Expiry Alert
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Lacak batch bahan baku berdasarkan tanggal kedaluwarsa (First Expired First Out) + peringatan stok kritis.
            Batch expired bisa dikonversi langsung ke Waste.
          </p>
        </div>
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
            <style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:900px;margin:0 auto;padding:40px;color:#1f2937;}h1{font-size:22px;color:#065f46;}.meta{color:#6b7280;font-size:12px;margin-bottom:20px;}table{width:100%;border-collapse:collapse;}th{background:#f3f4f6;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;}td{padding:8px;border-bottom:1px solid #e5e7eb;}.alert{display:inline-block;padding:6px 14px;border-radius:8px;font-size:13px;margin-right:8px;}.red{background:#fef2f2;color:#dc2626;}.amber{background:#fffbeb;color:#d97706;}.green{background:#f0fdf4;color:#059669;}@media print{body{padding:20px;}}</style></head><body>
            <h1>📋 LAPORAN BATCH & EXPIRY</h1>
            <div class="meta">Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { year:'numeric',month:'long',day:'numeric' })}</div>
            <div style="margin-bottom:16px;">
              <span class="alert red">⚠️ Kedaluwarsa: ${expiredBatches.length}</span>
              <span class="alert amber">⏰ Kritis: ${criticalBatches.length}</span>
              <span class="alert green">✅ Stok Kritis: ${lowStockItems.length}</span>
            </div>
            <table><thead><tr><th>Batch</th><th>Bahan</th><th style="text-align:right;">Stok</th><th>Supplier</th><th style="text-align:right;">Expired</th><th style="text-align:center;">Status</th></tr></thead><tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#9ca3af;padding:20px;">Belum ada batch.</td></tr>'}</tbody></table>
            <p style="margin-top:40px;text-align:center;color:#9ca3af;font-size:11px;">Near Bakery & Co. ERP — FEFO & Expiry System</p>
            <script>window.print();<\/script></body></html>
          `);
          printWin.document.close();
        }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
          <Printer className="w-3.5 h-3.5" /> Cetak
        </button>
      </div>

      {/* KONEKSI INFO */}
      {onAddWasteLog && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[10px] text-blue-800 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 shrink-0" />
          <span><span className="font-bold">Terhubung ke Waste:</span> Batch expired bisa langsung dikonversi ke Waste Log dengan klik tombol "→ Waste" pada batch merah.</span>
        </div>
      )}

      {/* ALERT PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className={`p-4 rounded-xl border shadow-xs ${expiredBatches.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${expiredBatches.length > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            <div>
              <span className="text-xs font-bold text-gray-700 block">Kedaluwarsa</span>
              <span className="font-mono font-black text-lg">{expiredBatches.length}</span>
              <span className="text-[10px] text-gray-500 ml-1">batch</span>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border shadow-xs ${criticalBatches.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <Clock className={`w-5 h-5 ${criticalBatches.length > 0 ? 'text-amber-600' : 'text-gray-400'}`} />
            <div>
              <span className="text-xs font-bold text-gray-700 block">Kritis (≤3 hr)</span>
              <span className="font-mono font-black text-lg">{criticalBatches.length}</span>
              <span className="text-[10px] text-gray-500 ml-1">batch</span>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border shadow-xs ${warningBatches.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <Calendar className={`w-5 h-5 ${warningBatches.length > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
            <div>
              <span className="text-xs font-bold text-gray-700 block">Akan Expired</span>
              <span className="font-mono font-black text-lg">{warningBatches.length}</span>
              <span className="text-[10px] text-gray-500 ml-1">batch</span>
            </div>
          </div>
        </div>
        <div className={`p-4 rounded-xl border shadow-xs ${lowStockItems.length > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-2">
            <Package className={`w-5 h-5 ${lowStockItems.length > 0 ? 'text-blue-600' : 'text-gray-400'}`} />
            <div>
              <span className="text-xs font-bold text-gray-700 block">Stok Kritis</span>
              <span className="font-mono font-black text-lg">{lowStockItems.length}</span>
              <span className="text-[10px] text-gray-500 ml-1">bahan</span>
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
                <select required value={formBahan} onChange={(e) => setFormBahan(e.target.value)}
                  className="border border-gray-200 rounded-lg p-2 bg-white">
                  <option value="">-- Bahan --</option>
                  {bahanBaku.map(b => <option key={b.nama} value={b.nama}>{b.nama}</option>)}
                </select>
                <input type="text" required placeholder="No. Batch" value={formBatch}
                  onChange={(e) => setFormBatch(e.target.value)}
                  className="border border-gray-200 rounded-lg p-2" />
                <input type="number" required min="1" placeholder="Qty" value={formQty}
                  onChange={(e) => setFormQty(e.target.value)}
                  className="border border-gray-200 rounded-lg p-2 font-mono" />
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
                  return (
                    <tr key={b.id} className={`hover:bg-gray-50/50 ${isExpired ? 'bg-red-50/50' : isCritical ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3 font-mono font-bold text-gray-800">{b.batchNo}</td>
                      <td className="px-4 py-3">{b.bahanNama}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {b.qty >= 1000 ? `${(b.qty / 1000).toFixed(1)} kg` : `${b.qty} ${b.satuan}`}
                      </td>
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
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Belum ada batch. Tambah batch pertama!</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FEFO Recommendation */}
          {fefoRec && (
            <div className="m-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs">
              <span className="text-[10px] font-bold text-amber-700 uppercase block mb-1">Rekomendasi FEFO:</span>
              <p className="font-bold text-slate-900 font-mono">{fefoRec.batchNo} - {fefoRec.bahanNama}</p>
              <p className="text-gray-600">Exp: <span className="font-bold text-red-700">{fefoRec.expiryDate}</span></p>
              <p className="text-[10px] text-amber-700 mt-1 italic">Gunakan batch ini terlebih dahulu untuk mencegah waste.</p>
            </div>
          )}
        </div>

        {/* KANAN: Settings */}
        <div className="lg:col-span-4 space-y-4">
          {/* Product Expiry */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" /> Produk Jadi Expiry
            </h4>
            <p className="text-xs text-gray-500 mb-3">Pantau produk jadi yang mendekati expired date.</p>
            {productExpiry.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-xs text-gray-400">Belum ada data produk jadi expired.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {productExpiry.map(p => (
                  <div key={p.id} className={`p-3 rounded-lg border text-xs ${
                    p.status === 'expired' ? 'bg-red-50 border-red-200' :
                    p.status === 'warning' ? 'bg-amber-50 border-amber-200' :
                    'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800">{p.namaProduk}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        p.status === 'expired' ? 'bg-red-200 text-red-800' :
                        p.status === 'warning' ? 'bg-amber-200 text-amber-800' :
                        'bg-green-200 text-green-800'
                      }`}>{p.status}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Batch: {p.batchNo} | Qty: {p.qty} pcs</p>
                    <p className="text-[10px] text-gray-500">Exp: {p.expiryDate}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Safety Stock */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Safety Stock Settings</h4>
            <p className="text-xs text-gray-500 mb-3">Atur batas minimal stok per bahan.</p>
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
                      <span className="font-mono text-red-600 font-bold block">{qty.toFixed(0)} {bahanBaku.find(b => b.nama === name)?.satuan || 'gr'}</span>
                      <span className="text-[9px] text-red-500">Min: {safetyStock[name] || 500}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info koneksi */}
          {onAddWasteLog && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[10px] text-emerald-800">
              <AlertOctagon className="w-3 h-3 inline mr-1" />
              <span className="font-bold">Terhubung ke Waste Control:</span> Klik ikon peringatan 🔔 pada batch expired untuk otomatis mencatat waste.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
