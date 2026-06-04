import React, { useState } from 'react';
import { Calendar, Flame } from 'lucide-react';
import { ProductHpp } from '../types';

interface MpsTabProps {
  productHpp: ProductHpp[];
}

export default function MpsTab({ productHpp }: MpsTabProps) {
  const [preOrders, setPreOrders] = useState<Record<string, number>>({});
  const [displayStock, setDisplayStock] = useState<Record<string, number>>({});

  const getBakingRecommendation = (prodName: string) => {
    const orders = preOrders[prodName] || 0;
    const stock = displayStock[prodName] || 0;
    const target = orders - stock + 10; // safety buffer
    return target > 0 ? target : 0;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-emerald-600" /> Jadwal Produksi (MPS)
        </h2>
        <p className="text-xs text-gray-500 mt-1">Rencanakan jumlah panggangan harian berdasarkan pre-order dan stok tersisa.</p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 bg-amber-50 p-3 rounded-xl border border-amber-100 text-xs text-amber-900">
          <Flame className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Tim oven perlu membakar target hari ini agar etalase tidak kosong!</span>
        </div>

        <div className="space-y-4">
          {productHpp.map((p) => {
            const rec = getBakingRecommendation(p.namaProduk);
            return (
              <div key={p.namaProduk} className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-900">{p.namaProduk}</span>
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-mono font-bold">
                    Stok: {displayStock[p.namaProduk] || 0} pcs
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Pre-Order</span>
                    <input type="number" value={preOrders[p.namaProduk] || 0}
                      onChange={(e) => setPreOrders(pv => ({ ...pv, [p.namaProduk]: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-white border border-gray-200 p-2 rounded font-mono font-bold" />
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Stok Toko</span>
                    <input type="number" value={displayStock[p.namaProduk] || 0}
                      onChange={(e) => setDisplayStock(pv => ({ ...pv, [p.namaProduk]: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-white border border-gray-200 p-2 rounded font-mono font-bold" />
                  </div>
                </div>
                <div className="flex justify-between border-t border-gray-150 pt-2 text-xs font-semibold">
                  <span className="text-gray-500">Rekomendasi Oven:</span>
                  <span className="text-emerald-700 font-mono font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-150">
                    {rec} porsi
                  </span>
                </div>
              </div>
            );
          })}
          {productHpp.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">Belum ada produk. Buat resep dulu di tab Formulasi Resep.</p>
          )}
        </div>

        <button onClick={() => alert('Jadwal produksi dapur berhasil dikonfirmasi!')}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer">
          Rilis Lembar Kerja Dapur
        </button>
      </div>
    </div>
  );
}
