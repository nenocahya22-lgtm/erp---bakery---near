import React, { useState, useEffect } from 'react';
import { Star, FileText, Printer, Package, Trash2, Plus } from 'lucide-react';
import { BahanBaku, SATUAN_OPTIONS } from '../types';

interface SupplierRating {
  name: string;
  contractPrice: string;
  complianceRatio: number;
  rating: number;
  bahanSupplier: string[];
}

interface SupplierTabProps {
  bahanBaku: BahanBaku[];
}

export default function SupplierTab({ bahanBaku }: SupplierTabProps) {
  const [suppliers, setSuppliers] = useState<SupplierRating[]>(() => {
    const saved = localStorage.getItem('erp_suppliers_data');
    return saved ? JSON.parse(saved) : [];
  });
  const [newSup, setNewSup] = useState({ name: '', contractPrice: '', complianceRatio: 90, rating: 4, bahanSupplier: [] as string[] });
  const [selectedBahan, setSelectedBahan] = useState('');

  useEffect(() => {
    localStorage.setItem('erp_suppliers_data', JSON.stringify(suppliers));
  }, [suppliers]);

  const handleAddSupplier = () => {
    if (!newSup.name) return;
    setSuppliers(prev => [...prev, { ...newSup, name: newSup.name.trim(), bahanSupplier: newSup.bahanSupplier }]);
    setNewSup({ name: '', contractPrice: '', complianceRatio: 90, rating: 4, bahanSupplier: [] });
  };

  const handleDeleteSupplier = (name: string) => {
    if (!window.confirm(`Hapus supplier "${name}"?`)) return;
    setSuppliers(prev => prev.filter(s => s.name !== name));
  };

  const toggleBahanSupplier = (bahan: string) => {
    setNewSup(prev => ({
      ...prev,
      bahanSupplier: prev.bahanSupplier.includes(bahan)
        ? prev.bahanSupplier.filter(b => b !== bahan)
        : [...prev.bahanSupplier, bahan]
    }));
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Star className="w-6 h-6 text-emerald-600" /> Supplier & Purchase Order
        </h2>
        <p className="text-xs text-gray-500 mt-1">Kelola vendor supplier, hubungkan dengan bahan baku, dan buat draft purchase order.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SUPPLIER LIST */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">Daftar Supplier</h3>

          {suppliers.length > 0 && (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {suppliers.map((s, idx) => (
                <div key={idx} className="flex justify-between items-start text-xs border-b border-gray-50 pb-3 group">
                  <div className="flex-1">
                    <span className="font-bold text-gray-950 block">{s.name}</span>
                    <span className="text-[10px] text-gray-400">{s.contractPrice}</span>
                    {s.bahanSupplier.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.bahanSupplier.map(b => (
                          <span key={b} className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">{b}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex items-center gap-2 shrink-0">
                    <div>
                      <span className="font-bold text-emerald-800 text-sm block">★ {s.rating.toFixed(1)}</span>
                      <span className="text-[9px] text-gray-400">Ontime: {s.complianceRatio}%</span>
                    </div>
                    <button onClick={() => handleDeleteSupplier(s.name)}
                      className="text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      title="Hapus Supplier">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {suppliers.length === 0 && (
            <div className="text-center py-6">
              <Package className="w-8 h-8 text-gray-200 mx-auto stroke-1 mb-2" />
              <p className="text-xs text-gray-400">Belum ada supplier terdaftar.</p>
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-dashed border-gray-200">
            <h4 className="text-xs font-bold text-gray-700">Tambah Supplier Baru</h4>
            <div className="grid grid-cols-2 gap-2">
              <input type="text" placeholder="Nama Supplier" value={newSup.name}
                onChange={(e) => setNewSup(p => ({ ...p, name: e.target.value }))}
                className="border border-gray-200 rounded-lg p-2 text-xs" />
              <input type="text" placeholder="Harga kontrak" value={newSup.contractPrice}
                onChange={(e) => setNewSup(p => ({ ...p, contractPrice: e.target.value }))}
                className="border border-gray-200 rounded-lg p-2 text-xs" />
            </div>
            {/* Bahan yang disupply */}
            {bahanBaku.length > 0 && (
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Bahan yang Disupply</label>
                <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto">
                  {bahanBaku.map(b => (
                    <button key={b.nama} onClick={() => toggleBahanSupplier(b.nama)}
                      className={`text-[9px] px-2 py-0.5 rounded-full border cursor-pointer transition ${
                        newSup.bahanSupplier.includes(b.nama)
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                      }`}>
                      {b.nama}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button onClick={handleAddSupplier}
              disabled={!newSup.name}
              className="w-full bg-gray-950 hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs py-2 rounded-lg transition cursor-pointer">
              <Plus className="w-3 h-3 inline mr-1" /> Tambah Supplier
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
              <select 
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white"
                onChange={(e) => {}}
                onClick={() => { if (suppliers.length === 0) alert('Belum ada supplier. Tambah dulu!'); }}>
                {suppliers.length === 0
                  ? <option value="">-- Belum ada supplier --</option>
                  : suppliers.map(s => <option key={s.name} value={s.name}>{s.name} (★{s.rating})</option>)
                }
              </select>
            </div>
            {/* Bahan dari database */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Bahan Baku (dari Data Pusat)</label>
              <select className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
                <option value="">-- Pilih Bahan --</option>
                {bahanBaku.map(b => (
                  <option key={b.nama} value={b.nama}>{b.nama} ({formatCurrency(b.hargaSatuan)}/{b.satuan})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Qty</label>
                <input type="number" className="w-full border border-gray-200 rounded-lg p-2 font-mono" placeholder="0" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Satuan</label>
                <select className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
                  {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Estimasi Harga</label>
                <div className="border border-gray-200 rounded-lg p-2 text-gray-400 text-xs">Dari data bahan</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => alert('Cetak PO — fitur cetak akan segera diimplementasikan')}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                <Printer className="w-3.5 h-3.5" /> Cetak PO
              </button>
              <button onClick={() => alert('PO siap dikirim ke supplier!')}
                className="flex-1 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer">
                Kirim PO
              </button>
            </div>
          </div>

          {/* Info koneksi */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[10px] text-emerald-800">
            <Package className="w-3 h-3 inline mr-1" />
            <span className="font-bold">Terhubung ke Data Pusat:</span> {bahanBaku.length} bahan baku tersedia untuk PO.
            Supplier tersimpan di lokal dan siap untuk cetak PO.
          </div>
        </div>
      </div>
    </div>
  );
}
