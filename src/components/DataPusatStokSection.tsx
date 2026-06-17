import React from 'react';
import { BahanBaku, Cabang, SuratOrder } from '../types';
import { Package } from 'lucide-react';

interface DataPusatStokSectionProps {
  bahanBaku: BahanBaku[];
  cabangList: Cabang[];
  suratOrders: SuratOrder[];
}

export default function DataPusatStokSection({ bahanBaku, cabangList, suratOrders }: DataPusatStokSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-xs p-6">
      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
        <Package className="w-4 h-4 text-emerald-600" /> Stok Pusat — Real-time
      </h3>
      <p className="text-xs text-gray-500 mb-4">
        Stok pusat terhitung dari <strong>isiKemasan (stok input manual)</strong> dikurangi <strong>SO yang sudah dikirim ke cabang</strong>.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-[10px] uppercase font-bold text-emerald-800">Total Jenis Bahan</p>
          <p className="text-xl font-black text-emerald-700 font-mono mt-1">{bahanBaku.length}</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-[10px] uppercase font-bold text-blue-800">Total Cabang Aktif</p>
          <p className="text-xl font-black text-blue-700 font-mono mt-1">{cabangList.filter(c => c.isActive).length}</p>
        </div>
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-[10px] uppercase font-bold text-amber-800">SO Dikirim</p>
          <p className="text-xl font-black text-amber-700 font-mono mt-1">{suratOrders.filter(s => s.status === 'dikirim').length}</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
          <p className="text-[10px] uppercase font-bold text-purple-800">Permintaan Pending</p>
          <p className="text-xl font-black text-purple-700 font-mono mt-1">{suratOrders.filter(s => s.status === 'minta').length}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50">
              <th className="px-3 py-2.5 rounded-l-lg">Bahan</th>
              <th className="px-3 py-2.5 text-right">Stok Gudang</th>
              <th className="px-3 py-2.5 text-right">Total Dikirim</th>
              <th className="px-3 py-2.5 text-right rounded-r-lg">Sisa (Display)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bahanBaku.map(b => {
              const totalDikirim = suratOrders
                .filter(s => s.status === 'dikirim' || s.status === 'diterima')
                .flatMap(s => s.items)
                .filter(i => i.bahanNama === b.nama)
                .reduce((acc, i) => acc + i.qty, 0);
              const stokAwal = b.isiKemasan + totalDikirim;
              return (
                <tr key={b.nama} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-semibold text-gray-900">{b.nama}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{b.isiKemasan} {b.satuan}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-red-600">{totalDikirim > 0 ? `-${totalDikirim}` : '-'} {b.satuan}</td>
                  <td className={`px-3 py-2.5 text-right font-mono font-bold ${b.isiKemasan < 10 ? 'text-red-700' : 'text-emerald-700'}`}>{b.isiKemasan} {b.satuan}</td>
                </tr>
              );
            })}
            {bahanBaku.length === 0 && (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">Belum ada bahan baku.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl text-[10px] text-blue-800">
        <strong>Alur Stok Pusat → Cabang:</strong><br />
        1. Cabang minta barang → Status <strong>"🕐 Minta"</strong> (pending)<br />
        2. Owner setujui → Status <strong>"Dikirim"</strong> → <strong>Stok Pusat berkurang</strong> ✅<br />
        3. Cabang terima → Status <strong>"Diterima"</strong> → <strong>Stok Cabang bertambah</strong> ✅<br />
        Stok pusat otomatis ter-update dari setiap pengiriman.
      </div>
    </div>
  );
}
