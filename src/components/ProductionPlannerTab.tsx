import React, { useState } from 'react';
import { ShoppingCart, ArrowRight, Package } from 'lucide-react';
import { ProductHpp, DetailResep, CalculationResult } from '../types';

interface ProductionPlannerTabProps {
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  calculatedProducts: CalculationResult[];
  bahanBaku: any[];
}

export default function ProductionPlannerTab({ productHpp, detailResep, calculatedProducts, bahanBaku }: ProductionPlannerTabProps) {
  const [targets, setTargets] = useState<Record<string, number>>({});

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // Hitung kebutuhan bahan baku total berdasarkan target produksi
  const calculateNeeds = () => {
    const needs: Record<string, { total: number; satuan: string; hargaTotal: number; perProduk: { nama: string; qty: number }[] }> = {};

    Object.entries(targets).forEach(([prodName, prodQty]) => {
      if (!prodQty || prodQty <= 0) return;
      const resep = detailResep.filter(r => r.namaProduk === prodName);
      const calcProd = calculatedProducts.find(p => p.namaProduk === prodName);

      resep.forEach(r => {
        const totalQty = r.takaran * prodQty;
        const bahanInfo = bahanBaku.find(b => b.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim());
        const hargaSatuan = bahanInfo?.hargaSatuan || 0;

        if (!needs[r.namaBahan]) {
          needs[r.namaBahan] = { total: 0, satuan: 'gr', hargaTotal: 0, perProduk: [] };
        }
        // Cari satuan dari bahan baku yang sesuai
        if (bahanInfo?.satuan) needs[r.namaBahan].satuan = bahanInfo.satuan;
        needs[r.namaBahan].total += totalQty;
        needs[r.namaBahan].hargaTotal += totalQty * hargaSatuan;
        needs[r.namaBahan].perProduk.push({ nama: prodName, qty: Math.round(totalQty * 10) / 10 });
      });
    });

    return needs;
  };

  const needs = calculateNeeds();
  const totalHargaBahan = Object.values(needs).reduce((sum, n) => sum + n.hargaTotal, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-emerald-600" /> Production Batch Planner
        </h2>
        <p className="text-xs text-gray-500 mt-1">Masukkan jumlah roti/kue yang ingin diproduksi, sistem akan hitung total kebutuhan bahan baku.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KIRI: Input Target Produksi */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">Target Produksi Hari Ini</h3>
          <div className="space-y-3">
            {productHpp.map(p => (
              <div key={p.namaProduk} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{p.namaProduk}</span>
                <input type="number" min="0" value={targets[p.namaProduk] || ''}
                  onChange={(e) => setTargets(prev => ({ ...prev, [p.namaProduk]: parseInt(e.target.value) || 0 }))}
                  className="w-20 border border-gray-200 rounded-lg p-2 text-xs font-mono font-bold text-center"
                  placeholder="0" />
                <span className="text-[10px] text-gray-400 w-8">pcs</span>
              </div>
            ))}
            {productHpp.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Belum ada produk. Buat resep dulu.</p>
            )}
          </div>

          {productHpp.length > 0 && (
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs space-y-1">
              <div className="flex justify-between font-bold text-emerald-800">
                <span>Total Produk Diproduksi:</span>
                <span>{Object.values(targets).reduce((a, b) => a + b, 0)} pcs</span>
              </div>
              <div className="flex justify-between font-bold text-emerald-800">
                <span>Estimasi Biaya Bahan:</span>
                <span className="font-mono">{formatCurrency(totalHargaBahan)}</span>
              </div>
            </div>
          )}
        </div>

        {/* KANAN: Hasil Kebutuhan Bahan */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <Package className="w-4 h-4 text-emerald-600" /> Daftar Belanja Bahan Baku
          </h3>

          {Object.keys(needs).length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">Masukkan target produksi di samping untuk melihat kebutuhan bahan.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(needs).sort(([, a], [, b]) => b.total - a.total).map(([bahan, data]) => {
                const dalamKg = data.total >= 1000;
                return (
                  <div key={bahan} className="bg-gray-50 p-4 rounded-xl border border-gray-150">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-gray-900 text-sm">{bahan}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {dalamKg ? `${(data.total / 1000).toFixed(1)} kg` : `${Math.round(data.total)} ${data.satuan}`}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-800 text-xs">{formatCurrency(data.hargaTotal)}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {data.perProduk.map((pp, i) => (
                        <span key={i} className="text-[9px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-600">
                          {pp.nama}: {pp.qty}gr
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-xs">
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>Total Kebutuhan Bahan:</span>
                  <span className="font-mono">{formatCurrency(totalHargaBahan)}</span>
                </div>
                <p className="text-[10px] text-emerald-600 mt-1">
                  Gunakan daftar ini untuk belanja ke supplier hari ini. Jumlah sudah termasuk semua produk yang dipilih.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
