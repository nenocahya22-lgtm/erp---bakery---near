import React, { useState } from 'react';
import { Star, FileText } from 'lucide-react';

interface SupplierRating {
  name: string;
  contractPrice: string;
  complianceRatio: number;
  rating: number;
}

export default function SupplierTab() {
  const [suppliers, setSuppliers] = useState<SupplierRating[]>([]);
  const [poVisible, setPoVisible] = useState(false);
  const [poSupplier, setPoSupplier] = useState('');
  const [poMaterial, setPoMaterial] = useState('');
  const [poQty, setPoQty] = useState('');
  const [newSup, setNewSup] = useState({ name: '', contractPrice: '', complianceRatio: 90, rating: 4 });

  const handleAddSupplier = () => {
    if (!newSup.name) return;
    setSuppliers(prev => [...prev, newSup as SupplierRating]);
    setNewSup({ name: '', contractPrice: '', complianceRatio: 90, rating: 4 });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Star className="w-6 h-6 text-emerald-600" /> Supplier & Purchase Order
        </h2>
        <p className="text-xs text-gray-500 mt-1">Kelola vendor supplier dan buat draft purchase order.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SUPPLIER LIST */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Daftar Supplier</h3>

          <div className="space-y-3 max-h-[250px] overflow-y-auto">
            {suppliers.map((s, idx) => (
              <div key={idx} className="flex justify-between items-start text-xs border-b border-gray-50 pb-2">
                <div>
                  <span className="font-bold text-gray-950 block">{s.name}</span>
                  <span className="text-[10px] text-gray-400">{s.contractPrice}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-emerald-800 text-sm block">★ {s.rating.toFixed(1)}</span>
                  <span className="text-[9px] text-gray-400">Ontime: {s.complianceRatio}%</span>
                </div>
              </div>
            ))}
            {suppliers.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Belum ada supplier terdaftar.</p>}
          </div>

          <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-dashed border-gray-200">
            <h4 className="text-xs font-bold text-gray-700">Tambah Supplier Baru</h4>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Nama" value={newSup.name}
                onChange={(e) => setNewSup(p => ({ ...p, name: e.target.value }))}
                className="border border-gray-200 rounded-lg p-2 text-xs" />
              <input type="text" placeholder="Harga kontrak" value={newSup.contractPrice}
                onChange={(e) => setNewSup(p => ({ ...p, contractPrice: e.target.value }))}
                className="border border-gray-200 rounded-lg p-2 text-xs" />
            </div>
            <button onClick={handleAddSupplier}
              className="w-full bg-gray-950 text-white font-bold text-xs py-2 rounded-lg hover:bg-gray-900 transition cursor-pointer">
              + Tambah Supplier
            </button>
          </div>
        </div>

        {/* PO DRAFT */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
            <FileText className="w-4 h-4 text-emerald-600" /> Draft Purchase Order
          </h3>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Supplier</label>
              <select value={poSupplier} onChange={(e) => setPoSupplier(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white"
                onClick={() => { if (suppliers.length === 0) alert('Belum ada supplier. Tambah dulu!'); }}>
                {suppliers.length === 0
                  ? <option value="">-- Belum ada supplier --</option>
                  : suppliers.map(s => <option key={s.name} value={s.name}>{s.name}</option>)
                }
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Bahan</label>
                <input type="text" value={poMaterial} onChange={(e) => setPoMaterial(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Qty</label>
                <input type="number" value={poQty} onChange={(e) => setPoQty(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 font-mono" />
              </div>
            </div>
            <button onClick={() => alert(`PO untuk ${poMaterial} sebanyak ${poQty} ke ${poSupplier} siap dikirim!`)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer">
              Kirim PO via Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
