import React, { useState } from 'react';
import { BahanBaku } from '../types';
import { PackageOpen, AlertTriangle, FileText, CheckCircle2, Star, Mail, RefreshCw, Layers } from 'lucide-react';

interface InventoryTabProps {
  bahanBaku: BahanBaku[];
}

interface BatchLog {
  batchNo: string;
  materialName: string;
  qtySecured: number;
  unit: string;
  supplier: string;
  expDate: string; // YYYY-MM-DD
}

interface SupplierRating {
  name: string;
  contractPrice: string;
  complianceRatio: number; // 0 - 100%
  defectRate: number; // %
  rating: number; // 1-5 estrellas
  lastPO: string;
}

export default function InventoryTab({ bahanBaku }: InventoryTabProps) {
  // Current stock levels with persistent localStorage syncing to connect POS sales deductions
  const [stockLevels, setStockLevels] = useState<Record<string, { mainWh: number; kitchen: number; storefront: number; reorderPoint: number }>>(() => {
    const saved = localStorage.getItem('stock_levels_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        // Fallback
      }
    }
    return {};
  });

  // Track stock level changes to update local storage
  React.useEffect(() => {
    localStorage.setItem('stock_levels_data', JSON.stringify(stockLevels));
  }, [stockLevels]);

  // Supplier cards
  const [suppliers] = useState<SupplierRating[]>([]);

  // Inventory Batch logs for FEFO/FIFO
  const [batchLogs, setBatchLogs] = useState<BatchLog[]>([]);

  // PO States
  const [draftPOVisible, setDraftPOVisible] = useState(false);
  const [poSupplier, setPoSupplier] = useState('');
  const [poMaterial, setPoMaterial] = useState('');
  const [poQty, setPoQty] = useState('');

  const getFEFORecommendation = (material: string) => {
    // Find batches for this material, sort by expire date ascending
    const relevant = batchLogs.filter(b => b.materialName.toLowerCase().trim() === material.toLowerCase().trim());
    if (relevant.length === 0) return null;
    const sorted = [...relevant].sort((a,b) => new Date(a.expDate).getTime() - new Date(b.expDate).getTime());
    return sorted[0];
  };

  const getReorderAlerts = () => {
    const alerts: { material: string; current: number; min: number; desc: string }[] = [];
    Object.entries(stockLevels).forEach(([mat, s]) => {
      const spec = s as { mainWh: number; kitchen: number; storefront: number; reorderPoint: number };
      const totalStock = spec.mainWh + spec.kitchen;
      if (totalStock <= spec.reorderPoint) {
        alerts.push({
          material: mat,
          current: totalStock,
          min: spec.reorderPoint,
          desc: `Stok kritis gabungan gudang ${totalStock} di bawah titik reorder ${spec.reorderPoint}!`
        });
      }
    });
    return alerts;
  };

  const alerts = getReorderAlerts();

  const handleUpdateReorderPoint = (material: string, val: number) => {
    setStockLevels(prev => ({
      ...prev,
      [material]: {
        ...prev[material],
        reorderPoint: val
      }
    }));
  };

  return (
    <div id="inventory-tab-container" className="space-y-6">
      
      {/* HEADER SECTION PANEL */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <PackageOpen className="w-6 h-6 text-emerald-600" />
            Inventori & Rantai Pasok (FEFO, Safety Stock & Multi-WH)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Pelacakan First Expired First Out (FEFO) secara otomatis, monitor stok mentega multi-gudang secara real-time, dan atur draf purchase order otomatis.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: MULTI-WH STOCKS & SAFETY POINTS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* MULTI STOCKS TABLE */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4.5 h-4.5 text-emerald-600" />
                Penyimpanan Multi-Gudang (Multi-Warehouse Stock)
              </h3>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold">
                Level Monitor Aktif
              </span>
            </div>

            <div className="overflow-x-auto text-xs sm:text-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/20 text-[11px] font-bold text-gray-500 uppercase">
                    <th className="px-5 py-3">Nama Bahan Baku</th>
                    <th className="px-4 py-3 text-right">Gudang Utama</th>
                    <th className="px-4 py-3 text-right">Dapur Produksi</th>
                    <th className="px-4 py-3 text-right">Etalase Toko</th>
                    <th className="px-4 py-3 text-right">Total Stok</th>
                    <th className="px-5 py-3 text-center w-36">Batas Minimum (ROP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {Object.entries(stockLevels).map(([mat, s]) => {
                    const spec = s as { mainWh: number; kitchen: number; storefront: number; reorderPoint: number };
                    const totalStock = spec.mainWh + spec.kitchen + spec.storefront;
                    const isAlert = totalStock <= spec.reorderPoint;
                    
                    return (
                      <tr key={mat} className={`hover:bg-emerald-50/10 ${isAlert ? 'bg-amber-50/20' : ''}`}>
                        <td className="px-5 py-3.5 font-semibold text-gray-950 flex flex-col">
                          <span>{mat}</span>
                          {isAlert && (
                            <span className="text-[10px] text-amber-600 font-bold mt-0.5 select-none">
                              ⚠️ Reorder Alert!
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-800">{spec.mainWh} Log</td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-800">{spec.kitchen} Log</td>
                        <td className="px-4 py-3.5 text-right font-mono text-gray-450">{spec.storefront} Log</td>
                        <td className={`px-4 py-3.5 text-right font-mono font-bold ${isAlert ? 'text-amber-700' : 'text-emerald-800'}`}>
                          {totalStock}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <input
                            type="number"
                            value={spec.reorderPoint}
                            onChange={(e) => handleUpdateReorderPoint(mat, parseInt(e.target.value) || 0)}
                            className="w-16 border border-gray-200 bg-white rounded p-1 font-bold text-center text-xs font-mono"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* FEFO BATCH TRACKERS */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1 pb-2 border-b border-gray-50">
              <PackageOpen className="w-4 h-4 text-emerald-600" />
              Batch & Lot Expiry Tracking (FEFO Matrix)
            </h3>
            
            <p className="text-xs text-gray-500">
              Sistem ERP Bakery otomatis memunculkan draf rekomendasi First Expired, First Out (FEFO) agar adonan dibuat menggunakan batch telur/mentega paling dahulu mendekati kedaluwarsa.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Batch list panel */}
              <div className="border border-gray-150 rounded-xl overflow-hidden text-xs max-h-[200px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500">
                    <tr className="border-b border-gray-1.5">
                      <th className="p-2.5">No Batch</th>
                      <th className="p-2.5">Bahan</th>
                      <th className="p-2.5">Exp Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700 font-mono">
                    {batchLogs.map((b) => {
                      const daysLeft = Math.ceil((new Date(b.expDate).getTime() - new Date('2026-06-03').getTime()) / (1000 * 3600 * 24));
                      const isDanger = daysLeft <= 10;
                      return (
                        <tr key={b.batchNo} className={isDanger ? 'bg-red-50/45 text-red-900' : ''}>
                          <td className="p-2.5 font-bold">{b.batchNo}</td>
                          <td className="p-2.5 font-sans">{b.materialName}</td>
                          <td className="p-2.5">
                            {b.expDate} 
                            {isDanger && <span className="block text-[9px] text-red-600 font-bold">({daysLeft} hari lagi!)</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Dynamic FEFO recommendations visualizer */}
              <div className="bg-amber-50 p-4 border border-amber-100 rounded-xl flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide block">Rekomendasi Pemakaian Mentega:</span>
                  {(() => {
                    const rec = getFEFORecommendation('Mentega');
                    if (!rec) return <p className="text-xs text-amber-800">Tidak ada data batch.</p>;
                    return (
                      <div className="mt-2 space-y-1.5 text-xs">
                        <p className="font-bold text-slate-900 font-mono text-sm">{rec.batchNo}</p>
                        <p className="text-gray-600">Terbuka / Masuk Supplier: <span className="font-medium font-mono text-gray-800">{rec.supplier}</span></p>
                        <p className="text-gray-600">Batas Kadaluwarsa: <span className="font-mono font-bold text-red-700">{rec.expDate}</span></p>
                      </div>
                    );
                  })()}
                </div>
                <div className="text-[9px] text-amber-700 italic border-t border-amber-200 pt-2 mt-2">
                  *Abaikan batch B-MEN-3308 hari ini; habiskan B-MEN-3305 terlebih dahulu guna mencegah kerugian wastage kedaluwarsa.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REORDER POINT ALERTS & AUTO PURCHASE ORDERS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* REORDER POINTS WATCH LIST */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3.5">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-50">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Reorder Alerts ({alerts.length})
            </h3>

            {alerts.length === 0 ? (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center space-y-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-800 uppercase">Stok Aman Terjaga</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {alerts.map((a, idx) => (
                  <div key={idx} className="p-3 bg-red-50 border border-red-100 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold font-sans text-red-900">{a.material}</span>
                      <span className="font-mono text-red-700 bg-white border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {a.current} pcs left
                      </span>
                    </div>
                    <p className="text-red-700 text-[11px] leading-relaxed">{a.desc}</p>
                    <button
                      onClick={() => {
                        setPoMaterial(a.material);
                        setDraftPOVisible(true);
                      }}
                      className="text-[10px] font-bold text-red-800 hover:text-red-950 underline mt-1 block"
                    >
                      Buat PO Supplier Sekarang ➔
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AUTO PURCHASE ORDER DRAFT GENERATOR */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                Draf PO Supplier Otomatis
              </h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Pilih Supplier Resmi</label>
                <select
                  value={poSupplier}
                  onChange={(e) => setPoSupplier(e.target.value)}
                  className="w-full text-xs font-medium border border-gray-200 rounded-lg p-2.5 bg-white"
                >
                  {suppliers.map(s => (
                    <option key={s.name} value={s.name}>{s.name} ({s.complianceRatio}% Ontime)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Bahan Baku</label>
                  <input
                    type="text"
                    value={poMaterial}
                    onChange={(e) => setPoMaterial(e.target.value)}
                    className="w-full text-xs font-medium border border-gray-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Kuantitas Order</label>
                  <input
                    type="number"
                    value={poQty}
                    onChange={(e) => setPoQty(e.target.value)}
                    className="w-full text-xs font-medium border border-gray-200 rounded-lg p-2 font-mono font-bold"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  alert(`Berhasil membuat berkas Draf PO: ${poMaterial} berjumlah ${poQty} unit siap kirim ke email ${poSupplier}!`);
                }}
                className="w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                Kirim PO Langsung via Email Supplier
              </button>
            </div>
          </div>

          {/* VENDOR SCORECARD LIST */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-55">
              <Star className="w-4 h-4 text-emerald-600" />
              Supplier Performance Ratings
            </h3>

            <div className="space-y-3.5 max-h-[180px] overflow-y-auto pr-1">
              {suppliers.map((s, idx) => (
                <div key={idx} className="flex justify-between items-start text-xs border-b border-gray-50 pb-2">
                  <div>
                    <span className="font-bold text-gray-950 block">{s.name}</span>
                    <span className="text-[10px] text-gray-400 font-medium">Bahan: <span className="font-semibold">{s.contractPrice}</span></span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-800 text-sm block">★ {s.rating.toFixed(1)}</span>
                    <span className="text-[9px] text-gray-400 font-medium block">On-time: {s.complianceRatio}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
