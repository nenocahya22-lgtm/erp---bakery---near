import React, { useState, useEffect } from 'react';
import { Layers, AlertTriangle, CheckCircle2, PackageOpen, Trash2 } from 'lucide-react';

export default function StokGudangTab() {
  const [stockLevels, setStockLevels] = useState<Record<string, { mainWh: number; kitchen: number; storefront: number; reorderPoint: number }>>(() => {
    const saved = localStorage.getItem('stock_levels_data');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('stock_levels_data', JSON.stringify(stockLevels));
  }, [stockLevels]);

  const handleUpdateReorderPoint = (material: string, val: number) => {
    setStockLevels(prev => ({
      ...prev,
      [material]: { ...prev[material], reorderPoint: val }
    }));
  };

  const getReorderAlerts = () => {
    const alerts: { material: string; current: number; min: number }[] = [];
    Object.entries(stockLevels).forEach(([mat, s]) => {
      const totalStock = s.mainWh + s.kitchen;
      if (totalStock <= s.reorderPoint) {
        alerts.push({ material: mat, current: totalStock, min: s.reorderPoint });
      }
    });
    return alerts;
  };

  const alerts = getReorderAlerts();

  const handleAddMaterial = () => {
    const name = window.prompt('Nama bahan baru:');
    if (!name || stockLevels[name]) return;
    setStockLevels(prev => ({
      ...prev, [name]: { mainWh: 0, kitchen: 0, storefront: 0, reorderPoint: 10 }
    }));
  };

  const handleDeleteMaterial = (name: string) => {
    if (!window.confirm(`Hapus "${name}" dari stok gudang?`)) return;
    setStockLevels(prev => {
      const updated = { ...prev };
      delete updated[name];
      return updated;
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <PackageOpen className="w-6 h-6 text-emerald-600" /> Stok Gudang
          </h2>
          <p className="text-xs text-gray-500 mt-1">Monitor stok multi-gudang dan atur titik pemesanan ulang (ROP).</p>
        </div>
        <button onClick={handleAddMaterial}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer">
          + Tambah Bahan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4.5 h-4.5 text-emerald-600" /> Level Stok Multi-Gudang
            </h3>
          </div>
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/20 text-[11px] font-bold text-gray-500 uppercase">
                  <th className="px-5 py-3">Bahan</th>
                  <th className="px-4 py-3 text-right">Gudang</th>
                  <th className="px-4 py-3 text-right">Dapur</th>
                  <th className="px-4 py-3 text-right">Toko</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-center">ROP</th>
                  <th className="px-5 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {Object.entries(stockLevels).map(([mat, s]) => {
                  const total = s.mainWh + s.kitchen + s.storefront;
                  const isAlert = total <= s.reorderPoint;
                  return (
                    <tr key={mat} className={isAlert ? 'bg-amber-50/30' : ''}>
                      <td className="px-5 py-3.5 font-semibold text-gray-950">{mat}</td>
                      <td className="px-4 py-3.5 text-right font-mono">{s.mainWh}</td>
                      <td className="px-4 py-3.5 text-right font-mono">{s.kitchen}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-gray-400">{s.storefront}</td>
                      <td className={`px-4 py-3.5 text-right font-mono font-bold ${isAlert ? 'text-amber-700' : 'text-emerald-800'}`}>{total}</td>                        <td className="px-5 py-3.5 text-center">
                          <input type="number" value={s.reorderPoint}
                            onChange={(e) => handleUpdateReorderPoint(mat, parseInt(e.target.value) || 0)}
                            className="w-16 border border-gray-200 bg-white rounded p-1 font-bold text-center text-xs font-mono" />
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button onClick={() => handleDeleteMaterial(mat)}
                            className="text-gray-400 hover:text-red-600 cursor-pointer"
                            title="Hapus Bahan">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {Object.keys(stockLevels).length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">Belum ada data stok. Klik "Tambah Bahan" untuk mulai.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3.5">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Reorder Alerts ({alerts.length})
            </h3>
            {alerts.length === 0 ? (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                <p className="text-xs font-bold text-emerald-800 mt-1">Stok Aman</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {alerts.map((a, idx) => (
                  <div key={idx} className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-red-900">{a.material}</span>
                      <span className="font-mono text-red-700 bg-white border border-red-200 px-1.5 py-0.5 rounded text-[10px] font-bold">{a.current} left</span>
                    </div>
                    <p className="text-red-700 text-[11px] mt-1">Stok di bawah ROP ({a.min}). Segera order!</p>
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
