import React, { useState, useEffect } from 'react';
import { BahanBaku, BranchStock, Cabang, SuratOrder } from '../types';
import { Package, Search, ClipboardList, Building2, ShoppingCart, Truck, CheckCircle2, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { safeGetLocalStorage } from '../lib/safe-json';

interface MaterialsTabProps {
  bahanBaku: BahanBaku[];
  cabangList: Cabang[];
  cabangStok: BranchStock[];
  suratOrders?: SuratOrder[];
  onUpdateSuratOrder?: (id: string, so: SuratOrder) => void;
}

export default function MaterialsTab({ bahanBaku, cabangList, cabangStok, suratOrders = [], onUpdateSuratOrder }: MaterialsTabProps) {
  const [search, setSearch] = useState('');
  
  // ─── BATAS AMAN — Sync dari FEFO safety stock ───
  const [batasAman, setBatasAman] = useState<Record<string, number>>(() =>
    safeGetLocalStorage<Record<string, number>>('fefo_safety_stock_data', {})
  );
  
  useEffect(() => {
    localStorage.setItem('fefo_safety_stock_data', JSON.stringify(batasAman));
  }, [batasAman]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <Package className="w-6 h-6 text-emerald-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">📦 Daftar Bahan Baku (Read-Only)</h2>
            <p className="text-xs text-gray-500">Lihat semua bahan baku yang terdaftar. Data dikelola sepenuhnya di <strong>🏛️ Data Pusat → Bahan</strong>.</p>
          </div>
        </div>
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[10px] text-blue-800 flex items-start gap-2">
          <Building2 className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Data Terpusat:</strong> Tambah, edit, dan hapus bahan baku hanya dilakukan di menu <strong>🏛️ Data Pusat</strong>. Modul ini hanya untuk melihat dan memantau stok opname cabang.
          </div>
        </div>
      </div>

      {/* Daftar Bahan */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input type="text" placeholder="Cari bahan..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <span className="text-[10px] text-gray-500 bg-gray-50 px-2.5 py-1.5 rounded-lg font-bold">{bahanBaku.length} bahan</span>
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
                  <th className="px-4 py-3">Kategori</th>
                  <th className="px-4 py-3">Kemasan</th>
                  <th className="px-4 py-3">Satuan</th>
                  <th className="px-4 py-3 text-right">Harga Beli</th>
                  <th className="px-4 py-3 text-right">Harga Satuan</th>
                  <th className="px-4 py-3 text-right">Stok Pusat</th>
                  <th className="px-4 py-3 text-center">Batas Aman</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {bahanBaku.filter(b => b.nama.toLowerCase().includes(search.toLowerCase())).map((b, idx) => (
                  <tr key={b.nama} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-500">{b.kode || `BB-${String(idx + 1).padStart(3,'0')}`}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{b.nama}</td>
                    <td className="px-4 py-3"><span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{b.kategori || 'Produk'}</span></td>
                    <td className="px-4 py-3 font-mono">{b.isiKemasan}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">{b.satuan}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(b.hargaBeli)}</td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500">{formatCurrency(b.hargaSatuan)}/{b.satuan}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{b.isiKemasan} {b.satuan}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input type="number" min="0"
                          value={batasAman[b.nama] || 500}
                          onChange={e => setBatasAman({ ...batasAman, [b.nama]: parseInt(e.target.value) || 0 })}
                          className="w-16 border border-gray-200 rounded-lg p-1 text-center font-mono text-[10px]" />
                        <span className="text-[9px] text-gray-400">{b.satuan}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {b.isiKemasan < (batasAman[b.nama] || 500) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 font-bold text-[9px] rounded-full">
                          <AlertTriangle className="w-2.5 h-2.5" /> Kritis
                        </span>
                      ) : b.isiKemasan < (batasAman[b.nama] || 500) * 1.5 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 font-bold text-[9px] rounded-full">
                          Menipis
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold text-[9px] rounded-full">Aman</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )        }
        <div className="p-3 bg-blue-50 border-t border-blue-100 text-[10px] text-blue-800 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong>💡 Batas Aman:</strong> Angka "Batas Aman" sinkron otomatis dengan modul <strong>FEFO & Expiry</strong>. Stok <span className="text-red-600 font-bold">merah</span> = kritis, <span className="text-amber-600 font-bold">kuning</span> = menipis, <span className="text-emerald-600 font-bold">hijau</span> = aman. Data terpusat — cukup atur di satu tempat.
          </span>
        </div>
      </div>

      {/* Ringkasan Stok Cabang */}
      {cabangList.filter(c => c.isActive).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" /> Ringkasan Stok Cabang
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Gambaran stok teoritis vs fisik per cabang.</p>
          </div>
          <div className="divide-y divide-gray-100">
            {cabangList.filter(c => c.isActive).map(cabang => {
              const cabangStockItems = cabangStok.filter(s => s.cabangId === cabang.id);
              if (cabangStockItems.length === 0) return null;
              return (
                <div key={cabang.id} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-gray-900">{cabang.nama}</span>
                    <span className="text-[9px] text-gray-500">{cabangStockItems.length} bahan</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {cabangStockItems.slice(0, 8).map(item => (
                      <div key={item.bahanNama} className="bg-gray-50 p-2 rounded-lg border border-gray-100 text-[10px]">
                        <span className="font-semibold text-gray-700 block">{item.bahanNama}</span>
                        <span className="font-mono text-emerald-700">T: {item.stokTeoritis} | F: {item.stokFisik}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 bg-blue-50 border-t border-blue-100 text-[10px] text-blue-800">
            Detail stok opname ada di <strong>Data Pusat → Stok Opname</strong>.
          </div>
        </div>
      )}

      {/* ─── STOK OPNAME CABANG (TERHUBUNG KE DATA PUSAT) ─── */}
      {cabangList.filter(c => c.isActive).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-600" /> 📋 Stok Opname Cabang
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Data stok opname per cabang — terhubung langsung ke <strong>🏛️ Data Pusat → Stok Opname</strong>. Staff cabang melakukan input fisik via dashboard masing-masing.</p>
          </div>
          <div className="divide-y divide-gray-100">
            {cabangList.filter(c => c.isActive).map(cabang => {
              const cabangStockItems = cabangStok.filter(s => s.cabangId === cabang.id);
              if (cabangStockItems.length === 0) return null;
              const totalSelisih = cabangStockItems.reduce((sum, s) => sum + (s.stokFisik - s.stokTeoritis), 0);
              return (
                <div key={cabang.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-gray-900">{cabang.nama}</span>
                      <span className="text-[9px] text-gray-500">{cabangStockItems.length} bahan di-SO</span>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      totalSelisih === 0 ? 'bg-emerald-100 text-emerald-800' :
                      totalSelisih > 0 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {totalSelisih === 0 ? '✅ Balance' : totalSelisih > 0 ? `🔵 Plus ${totalSelisih}` : `🔴 Minus ${Math.abs(totalSelisih)}`}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50">
                          <th className="px-3 py-2 rounded-l-lg">Bahan</th>
                          <th className="px-3 py-2 text-right">Teoritis</th>
                          <th className="px-3 py-2 text-right">Fisik</th>
                          <th className="px-3 py-2 text-right">Selisih</th>
                          <th className="px-3 py-2 text-center rounded-r-lg">Analisa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {cabangStockItems.map(item => {
                          const selisih = item.stokFisik - item.stokTeoritis;
                          return (
                            <tr key={`${item.cabangId}-${item.bahanNama}`} className={`hover:bg-gray-50 ${selisih !== 0 ? 'bg-amber-50/30' : ''}`}>
                              <td className="px-3 py-2.5 font-semibold text-gray-900">{item.bahanNama}</td>
                              <td className="px-3 py-2.5 text-right font-mono">{item.stokTeoritis} {item.satuan}</td>
                              <td className="px-3 py-2.5 text-right font-mono">{item.stokFisik} {item.satuan}</td>
                              <td className={`px-3 py-2.5 text-right font-mono font-bold ${
                                selisih === 0 ? 'text-emerald-600' : selisih > 0 ? 'text-blue-600' : 'text-red-600'
                              }`}>{selisih > 0 ? `+${selisih}` : selisih}</td>
                              <td className="px-3 py-2.5 text-center">
                                {selisih === 0 ? (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">✅ Aman</span>
                                ) : selisih > 0 ? (
                                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">🔵 Plus</span>
                                ) : (
                                  <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold">🔴 Minus</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-[10px] text-gray-400 text-right">
                    Data sinkron langsung dengan <strong>Data Pusat → Stok Opname</strong>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="p-3 bg-blue-50 border-t border-blue-100 text-[10px] text-blue-800">
            <strong>🔗 Terhubung:</strong> Stok opname di sini diambil dari input staff cabang di dashboard masing-masing. Data yang sama tampil di <strong>🏛️ Data Pusat → Stok Opname</strong>. Tidak perlu input ulang.
          </div>
        </div>
      )}

      {/* ─── SURAT ORDER MASUK (KONFIRMASI TERIMA) ─── */}
      {onUpdateSuratOrder && suratOrders.filter(s => s.status === 'dikirim').length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" /> Barang Masuk dari Pusat — Konfirmasi Terima
              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-lg">{suratOrders.filter(s => s.status === 'dikirim').length} dalam perjalanan</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">KONFIRMASI penerimaan barang dari pusat. Setelah dikonfirmasi, stok cabang otomatis bertambah.</p>
          </div>
          <div className="divide-y divide-gray-100">
            {suratOrders.filter(s => s.status === 'dikirim').slice(0, 5).map(so => (
              <div key={so.id} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-xs">{so.cabangNama}</span>
                    <span className="text-[9px] font-mono text-gray-400">{so.id.substring(0, 12)}</span>
                    <span className="text-[9px] text-gray-400">{new Date(so.tanggalKirim).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {so.items.map((item, idx) => (
                      <span key={idx} className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded">{item.bahanNama}: <strong>{item.qty}</strong></span>
                    ))}
                  </div>
                </div>
                <button onClick={() => {
                  if (window.confirm(`Konfirmasi penerimaan barang dari "${so.cabangNama}"?\nStok cabang akan bertambah secara otomatis.`)) {
                    onUpdateSuratOrder(so.id, { ...so, status: 'diterima' });
                  }
                }}
                  className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold px-3 py-1.5 rounded-lg transition cursor-pointer shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Konfirmasi Terima
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── PERMINTAAN PENDING ─── */}
      {suratOrders.filter(s => s.status === 'minta').length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-amber-600" /> Permintaan Barang dari Cabang
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded-lg">{suratOrders.filter(s => s.status === 'minta').length} pending</span>
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {suratOrders.filter(s => s.status === 'minta').map(so => (
              <div key={so.id} className="p-4 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 text-xs">{so.cabangNama}</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {so.items.map((item, idx) => (
                      <span key={idx} className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded">{item.bahanNama}: {item.qty}</span>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-amber-600 font-bold">Proses di Data Pusat → Pengiriman</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
