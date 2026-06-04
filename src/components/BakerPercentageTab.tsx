import React, { useState } from 'react';
import { Percent, Scale, Wheat, Droplets } from 'lucide-react';
import { BahanBaku, DetailResep } from '../types';

interface BakerPercentageTabProps {
  bahanBaku: BahanBaku[];
  detailResep: DetailResep[];
}

export default function BakerPercentageTab({ bahanBaku, detailResep }: BakerPercentageTabProps) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [targetDoughWeight, setTargetDoughWeight] = useState(5000); // grams total dough wanted
  const [mode, setMode] = useState<'grams' | 'baker_pct'>('grams');

  // Find the recipe ingredients for selected product
  const resep = detailResep.filter(r => r.namaProduk === selectedProduct);
  
  // Find the flour ingredient(s) - usually the one with highest quantity
  const flourBahan = bahanBaku.find(b => {
    const name = b.nama.toLowerCase();
    return name.includes('tepung') || name.includes('terigu') || name.includes('tapioka');
  });
  const flourTotal = resep
    .filter(r => {
      const b = bahanBaku.find(b => b.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim());
      return b && (b.nama.toLowerCase().includes('tepung') || b.nama.toLowerCase().includes('terigu'));
    })
    .reduce((sum, r) => sum + r.takaran, 0);

  // Baker's % calculations based on flour = 100%
  const bakerPercentages = resep.map(r => {
    const bahan = bahanBaku.find(b => b.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim());
    const isFlour = bahan && (bahan.nama.toLowerCase().includes('tepung') || bahan.nama.toLowerCase().includes('terigu'));
    const pct = flourTotal > 0 ? (r.takaran / flourTotal) * 100 : 0;
    return { ...r, bahan, pct, isFlour };
  });

  // Target dough scaling: if we want X grams total, calculate scaled amounts
  const scaleFactor = targetDoughWeight > 0 && flourTotal > 0 
    ? targetDoughWeight / (resep.reduce((s, r) => s + r.takaran, 0))
    : 0;

  const scaledIngredients = bakerPercentages.map(r => ({
    ...r,
    scaledAmount: r.takaran * scaleFactor,
  }));

  // Hydration calculation
  const hydrationPct = (() => {
    const liquidTotal = resep
      .filter(r => {
        const b = bahanBaku.find(b => b.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim());
        return b && (b.nama.toLowerCase().includes('air') || b.nama.toLowerCase().includes('susu') || b.nama.toLowerCase().includes('cream'));
      })
      .reduce((sum, r) => sum + r.takaran, 0);
    return flourTotal > 0 ? (liquidTotal / flourTotal) * 100 : 0;
  })();

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Percent className="w-6 h-6 text-emerald-600" /> Baker's Percentage & Dough Scaling
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Persentase Baker (tepung = 100%) — skala resep berdasarkan target berat adonan total.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KIRI: Kontrol */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-emerald-600" /> Target & Kontrol
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Pilih Produk</label>
              <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
                <option value="">-- Pilih Produk --</option>
                {[...new Set(detailResep.map(r => r.namaProduk))].map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {selectedProduct && resep.length > 0 && (
              <>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                    Target Berat Adonan Total: <span className="text-emerald-700 font-mono font-bold">{targetDoughWeight.toLocaleString()} gr</span>
                  </label>
                  <input type="range" min="500" max="50000" step="100" value={targetDoughWeight}
                    onChange={(e) => setTargetDoughWeight(parseInt(e.target.value))}
                    className="w-full accent-emerald-600" />
                  <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                    <span>0.5 kg</span><span>5 kg</span><span>25 kg</span><span>50 kg</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setMode('grams')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      mode === 'grams' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                    Gram
                  </button>
                  <button onClick={() => setMode('baker_pct')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                      mode === 'baker_pct' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                    Baker's %
                  </button>
                </div>

                {/* Hydration Card */}
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-800 flex items-center gap-1">
                      <Droplets className="w-3.5 h-3.5" /> Hidrasi Adonan
                    </span>
                    <span className="font-mono font-black text-blue-900">{hydrationPct.toFixed(1)}%</span>
                  </div>
                  <p className="text-[10px] text-blue-600 mt-1">
                    {hydrationPct < 55 ? 'Rendah — bagus untuk pastry/roti keras' :
                     hydrationPct < 65 ? 'Sedang — roti tawar standar' :
                     hydrationPct < 75 ? 'Tinggi — roti artisan/crusty' :
                     'Sangat Tinggi — ciabatta/focaccia'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* KANAN: Tabel Baker's Percentage */}
        <div className="lg:col-span-8">
          {!selectedProduct || resep.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-xs flex flex-col items-center justify-center text-center">
              <Percent className="w-12 h-12 text-gray-200 stroke-1 mb-3" />
              <p className="text-sm text-gray-500 font-semibold">Pilih Produk</p>
              <p className="text-xs text-gray-400 mt-1">Pilih produk untuk melihat analisis Baker's Percentage.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Tepung (100%)</span>
                  <span className="block font-mono font-black text-lg text-emerald-800">{flourTotal.toFixed(0)} gr</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Target Adonan</span>
                  <span className="block font-mono font-black text-lg text-emerald-800">{targetDoughWeight.toLocaleString()} gr</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Scale Factor</span>
                  <span className="block font-mono font-black text-lg text-blue-800">×{scaleFactor.toFixed(2)}</span>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    {mode === 'grams' ? 'Takaran Skala (gram)' : 'Baker\'s Percentage (%)'}
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50/50">
                        <th className="px-4 py-2.5">Bahan</th>
                        <th className="px-4 py-2.5 text-right">Resep Asli (gr)</th>
                        <th className="px-4 py-2.5 text-right">Baker's %</th>
                        {mode === 'grams' && (
                          <th className="px-4 py-2.5 text-right text-emerald-700">×{scaleFactor.toFixed(2)} Target</th>
                        )}
                        <th className="px-4 py-2.5 text-center">Satuan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {scaledIngredients.map((r, i) => (
                        <tr key={i} className={`hover:bg-gray-50/50 ${r.isFlour ? 'bg-amber-50/30' : ''}`}>
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {r.isFlour && <Wheat className="w-3 h-3 inline text-amber-600 mr-1" />}
                            {r.namaBahan}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">{r.takaran}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">{r.pct.toFixed(1)}%</td>
                          {mode === 'grams' && (
                            <td className="px-4 py-3 text-right font-mono font-black text-emerald-700">
                              {r.scaledAmount >= 1000 
                                ? `${(r.scaledAmount / 1000).toFixed(2)} kg`
                                : `${Math.round(r.scaledAmount)} gr`}
                            </td>
                          )}
                          <td className="px-4 py-3 text-center text-gray-400">{r.bahan?.satuan || 'gr'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Kitchen Note */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800">
                <span className="font-bold block mb-1">📋 Instruksi Dapur:</span>
                <span>Gunakan kolom "Target" untuk menimbang bahan hari ini. Tepung selalu 100% — sesuaikan bahan lain secara proporsional menggunakan Baker's Percentage.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
