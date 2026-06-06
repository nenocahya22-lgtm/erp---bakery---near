import React, { useState } from 'react';
import { BahanBaku, BranchStock, Cabang } from '../types';
import { Package, Search, ClipboardList, Building2 } from 'lucide-react';

interface MaterialsTabProps {
  bahanBaku: BahanBaku[];
  cabangList: Cabang[];
  cabangStok: BranchStock[];
}

export default function MaterialsTab({ bahanBaku, cabangList, cabangStok }: MaterialsTabProps) {
  const [tab, setTab] = useState<'bahan' | 'stok_opname'>('bahan');
  const [search, setSearch] = useState('');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <Package className="w-6 h-6 text-emerald-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">📦 Bahan Baku</h2>
            <p className="text-xs text-gray-500">Daftar bahan baku, satuan, harga, dan stok opname cabang.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('bahan')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              tab === 'bahan' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <Package className="w-3.5 h-3.5 inline mr-1" /> Daftar Bahan
          </button>
          <button onClick={() => setTab('stok_opname')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
              tab === 'stok_opname' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            <ClipboardList className="w-3.5 h-3.5 inline mr-1" /> Stok Opname Cabang
          </button>
        </div>
      </div>

      {/* Tab: Daftar Bahan */}
      {tab === 'bahan' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" placeholder="Cari bahan..." value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>
          {bahanBaku.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Belum ada bahan baku terdaftar. Tambah via Data Pusat.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                    <th className="px-4 py-3">Kode</th>
                    <th className="px-4 py-3">Nama Bahan</th>
                    <th className="px-4 py-3">Kemasan</th>
                    <th className="px-4 py-3">Satuan</th>
                    <th className="px-4 py-3 text-right">Harga Beli</th>
                    <th className="px-4 py-3 text-right">Harga Satuan</th>
                    <th className="px-4 py-3 text-right">Stok Pusat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bahanBaku.filter(b => b.nama.toLowerCase().includes(search.toLowerCase())).map((b, idx) => (
                    <tr key={b.nama} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-gray-500">{b.kode || `BB-${String(idx + 1).padStart(3,'0')}`}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{b.nama}</td>
                      <td className="px-4 py-3 font-mono">{b.isiKemasan}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{b.satuan}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(b.hargaBeli)}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500">{formatCurrency(b.hargaSatuan)}/{b.satuan}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">{b.isiKemasan} {b.satuan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="p-3 bg-blue-50 border-t border-blue-100 text-[10px] text-blue-800">
            <strong>Catatan:</strong> Data bahan baku dikelola dari <strong>🏛️ Data Pusat → Bahan</strong>. Modul ini hanya untuk lihat daftar & stok opname cabang.
          </div>
        </div>
      )}

      {/* Tab: Stok Opname Cabang */}
      {tab === 'stok_opname' && (
        <div className="space-y-4">
          {cabangList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto stroke-1 mb-3" />
              <h3 className="text-sm font-bold text-gray-700">Belum ada cabang</h3>
              <p className="text-xs text-gray-400">Daftarkan cabang dulu untuk mulai tracking stok opname.</p>
            </div>
          ) : (
            cabangList.filter(c => c.isActive).map(cabang => {
              const cabangStockItems = cabangStok.filter(s => s.cabangId === cabang.id);
              return (
                <div key={cabang.id} className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-slate-50 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-600" /> {cabang.nama}
                    </h3>
                    <p className="text-[10px] text-gray-500">{cabang.alamat || '—'}</p>
                  </div>
                  <div className="p-4">
                    {cabangStockItems.length === 0 ? (
                      <div className="space-y-2">
                        {/* Show theoretically from SO sent */}
                        {bahanBaku.map(b => {
                          // This component is read-only, just display
                          return null;
                        })}
                        <p className="text-xs text-gray-400 text-center py-4">
                          Belum ada data stok opname. Silakan lakukan stok opname dari dashboard cabang masing-masing.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50">
                              <th className="px-3 py-2 rounded-l-lg">Bahan</th>
                              <th className="px-3 py-2 text-right">Teoritis</th>
                              <th className="px-3 py-2 text-right">Fisik (SO)</th>
                              <th className="px-3 py-2 text-right">Selisih</th>
                              <th className="px-3 py-2 text-center rounded-r-lg">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {cabangStockItems.map(item => {
                              const selisih = item.stokTeoritis - item.stokFisik;
                              return (
                                <tr key={`${item.cabangId}-${item.bahanNama}`} className={`hover:bg-gray-50 ${selisih !== 0 ? 'bg-amber-50/30' : ''}`}>
                                  <td className="px-3 py-2.5 font-semibold text-gray-900">{item.bahanNama}</td>
                                  <td className="px-3 py-2.5 text-right font-mono">{item.stokTeoritis}</td>
                                  <td className="px-3 py-2.5 text-right font-mono">{item.stokFisik}</td>
                                  <td className={`px-3 py-2.5 text-right font-mono font-bold ${selisih === 0 ? 'text-emerald-600' : selisih > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                    {selisih > 0 ? `+${selisih}` : selisih}
                                  </td>
                                  <td className="px-3 py-2.5 text-center">
                                    {selisih === 0 ? (
                                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">✅ Aman</span>
                                    ) : (
                                      <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">❌ Selisih</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-100 rounded-lg text-[10px] text-amber-800">
                      <strong>📋 Cara Stok Opname:</strong> Login sebagai staff cabang → buka modul <strong>Stock Opname</strong> → isi stok fisik per bahan.
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
