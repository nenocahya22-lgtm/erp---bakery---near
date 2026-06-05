import React, { useState, useEffect } from 'react';
import { ShieldAlert, PackageOpen, Calendar, AlertTriangle, Clock, Package, Trash2, Plus, RefreshCw } from 'lucide-react';
import { BahanBaku } from '../types';

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

interface FefoExpiryTabProps {
  bahanBaku: BahanBaku[];
}

export default function FefoExpiryTab({ bahanBaku }: FefoExpiryTabProps) {
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

  // Save batches to localStorage
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

  // FEFO Rekomendasi
  const getFEFORecommendation = () => {
    const active = batches.filter(b => new Date(b.expiryDate) >= new Date());
    const sorted = active.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    return sorted[0] || null;
  };

  const fefoRec = getFEFORecommendation();

  // Expiry alerts
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

  // Stock by ingredient
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
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-emerald-600" /> FEFO & Expiry Alert
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Lacak batch bahan baku berdasarkan tanggal kedaluwarsa (First Expired First Out) + peringatan stok kritis.
        </p>
      </div>

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

          <div className="overflow-y-auto max-h-[400px]">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50/50 sticky top-0">
                  <th className="px-4 py-2.5">Batch #</th>
                  <th className="px-4 py-2.5">Bahan</th>
                  <th className="px-4 py-2.5 text-right">Stok</th>
                  <th className="px-4 py-2.5">Supplier</th>
                  <th className="px-4 py-2.5 text-right">Expired</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                  <th className="px-4 py-2.5"></th>
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
                    <tr key={b.id} className={`hover:bg-gray-50/50 ${isExpired ? 'bg-red-50/30' : isCritical ? 'bg-amber-50/30' : ''}`}>
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
                        <button onClick={() => handleDeleteBatch(b.id)}
                          className="text-gray-400 hover:text-red-600 cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                        </button>
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

        {/* KANAN: Safety Stock & Reorder */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Safety Stock Settings</h4>
            <p className="text-xs text-gray-500 mb-3">Atur batas minimal stok per bahan. Sistem akan memberi alert jika stok di bawah batas.</p>
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
        </div>
      </div>
    </div>
  );
}
