import React, { useState } from 'react';
import { PackageOpen, ShieldAlert } from 'lucide-react';

interface BatchLog {
  batchNo: string;
  materialName: string;
  qtySecured: number;
  unit: string;
  supplier: string;
  expDate: string;
}

export default function FefoTab() {
  const [batchLogs, setBatchLogs] = useState<BatchLog[]>([]);
  const [newBatch, setNewBatch] = useState({ batchNo: '', materialName: '', qtySecured: 0, unit: 'kg', supplier: '', expDate: '' });

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatch.batchNo || !newBatch.materialName || !newBatch.expDate) return;
    setBatchLogs(prev => [newBatch as BatchLog, ...prev]);
    setNewBatch({ batchNo: '', materialName: '', qtySecured: 0, unit: 'kg', supplier: '', expDate: '' });
  };

  const getFEFORecommendation = () => {
    const sorted = [...batchLogs].sort((a, b) => new Date(a.expDate).getTime() - new Date(b.expDate).getTime());
    return sorted[0] || null;
  };

  const fefoRec = getFEFORecommendation();

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-emerald-600" /> Batch & FEFO
        </h2>
        <p className="text-xs text-gray-500 mt-1">Lacak batch bahan baku berdasarkan tanggal kedaluwarsa (First Expired First Out).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Tambah Batch Baru</h3>
          <form onSubmit={handleAddBatch} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">No Batch</label>
                <input type="text" required value={newBatch.batchNo}
                  onChange={(e) => setNewBatch(p => ({ ...p, batchNo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Bahan</label>
                <input type="text" required value={newBatch.materialName}
                  onChange={(e) => setNewBatch(p => ({ ...p, materialName: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg p-2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Qty</label>
                <input type="number" required value={newBatch.qtySecured}
                  onChange={(e) => setNewBatch(p => ({ ...p, qtySecured: parseInt(e.target.value) || 0 }))}
                  className="w-full border border-gray-200 rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Satuan</label>
                <select value={newBatch.unit} onChange={(e) => setNewBatch(p => ({ ...p, unit: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg p-2">
                  <option>kg</option><option>gr</option><option>liter</option><option>pcs</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Supplier</label>
              <input type="text" value={newBatch.supplier}
                onChange={(e) => setNewBatch(p => ({ ...p, supplier: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg p-2" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Exp Date</label>
              <input type="date" required value={newBatch.expDate}
                onChange={(e) => setNewBatch(p => ({ ...p, expDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg p-2" />
            </div>
            <button type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer">
              Simpan Batch
            </button>
          </form>
        </div>

        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <PackageOpen className="w-4 h-4 text-emerald-600" /> Daftar Batch & Rekomendasi FEFO
          </h3>

          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase font-bold text-gray-500">
                <tr className="border-b border-gray-100">
                  <th className="p-2.5">Batch</th><th className="p-2.5">Bahan</th><th className="p-2.5">Qty</th>
                  <th className="p-2.5">Supplier</th><th className="p-2.5">Exp Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {batchLogs.map((b) => {
                  const daysLeft = Math.ceil((new Date(b.expDate).getTime() - Date.now()) / (1000 * 3600 * 24));
                  return (
                    <tr key={b.batchNo} className={daysLeft <= 10 ? 'bg-red-50/50' : ''}>
                      <td className="p-2.5 font-bold font-mono">{b.batchNo}</td>
                      <td className="p-2.5">{b.materialName}</td>
                      <td className="p-2.5 font-mono">{b.qtySecured} {b.unit}</td>
                      <td className="p-2.5">{b.supplier}</td>
                      <td className="p-2.5 font-mono">{b.expDate}{daysLeft <= 10 && <span className="ml-1 text-red-600 font-bold">⚠️</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {batchLogs.length === 0 && <p className="text-xs text-gray-400 text-center py-8">Belum ada batch tercatat.</p>}
          </div>

          {fefoRec && (
            <div className="bg-amber-50 p-4 border border-amber-100 rounded-xl text-xs">
              <span className="text-[10px] font-bold text-amber-700 uppercase block mb-1">Rekomendasi FEFO:</span>
              <p className="font-bold text-slate-900 font-mono">{fefoRec.batchNo} - {fefoRec.materialName}</p>
              <p className="text-gray-600">Exp: <span className="font-bold text-red-700">{fefoRec.expDate}</span></p>
              <p className="text-[10px] text-amber-700 mt-1 italic">Gunakan batch ini terlebih dahulu untuk mencegah waste.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
