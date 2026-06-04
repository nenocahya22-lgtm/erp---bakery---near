import React, { useState } from 'react';
import { Shuffle, ArrowRight, TrendingUp, TrendingDown, Minus, AlertTriangle, Package } from 'lucide-react';
import { BahanBaku, ProductHpp, DetailResep, CalculationResult } from '../types';

interface SubstitutionSimulatorTabProps {
  bahanBaku: BahanBaku[];
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  calculatedProducts: CalculationResult[];
}

export default function SubstitutionSimulatorTab({
  bahanBaku, productHpp, detailResep, calculatedProducts
}: SubstitutionSimulatorTabProps) {
  const [originalBahan, setOriginalBahan] = useState('');
  const [substituteName, setSubstituteName] = useState('');
  const [substitutePrice, setSubstitutePrice] = useState('');
  const [substituteSatuan, setSubstituteSatuan] = useState('gr');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const original = bahanBaku.find(b => b.nama === originalBahan);
  const substituteUnitPrice = parseFloat(substitutePrice) || 0;

  // Find all products that use this ingredient
  const affectedProducts = original
    ? detailResep.filter(r => r.namaBahan.toLowerCase().trim() === original.nama.toLowerCase().trim())
    : [];

  // Calculate simulated HPP for each affected product
  const simulationResults = affectedProducts.map(r => {
    const product = calculatedProducts.find(p => p.namaProduk === r.namaProduk);
    if (!product) return null;

    // Find this ingredient in the calculation result's bahanList
    const ingInCalc = product.bahanList.find(b => b.namaBahan.toLowerCase().trim() === original?.nama.toLowerCase().trim());
    if (!ingInCalc) return null;

    // Old cost for this ingredient
    const oldIngCost = ingInCalc.totalBiayaBahan;

    // New cost: substitute unit price * takaran (from detail resep)
    const newIngCost = substituteUnitPrice * r.takaran;

    // Calculate new total HPP per porsi
    const costDiff = newIngCost - oldIngCost;
    const oldHppPerPorsi = product.hppPerPorsi;
    const newHppPerPorsi = Math.max(0, oldHppPerPorsi + costDiff);

    const newMargin = product.hargaJualPerPorsi > 0
      ? ((product.hargaJualPerPorsi - newHppPerPorsi) / product.hargaJualPerPorsi) * 100
      : 0;

    const marginChange = newMargin - product.marginPersen;

    return {
      namaProduk: r.namaProduk,
      oldHpp: oldHppPerPorsi,
      newHpp: newHppPerPorsi,
      oldMargin: product.marginPersen,
      newMargin,
      marginChange,
      costDiff,
      takaran: r.takaran,
    };
  }).filter(Boolean);

  const runSimulation = () => {
    // Force re-render by toggling state
    setSubstituteName(substituteName.trim() || 'Pengganti');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Shuffle className="w-6 h-6 text-emerald-600" /> Ingredient Substitution Simulator
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Simulasikan dampak pergantian merek/kenaikan harga bahan baku terhadap HPP & margin semua produk secara instan.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KIRI: Form Input */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-emerald-600" /> Bahan & Substitusi
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Bahan Asli</label>
              <select value={originalBahan} onChange={(e) => setOriginalBahan(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
                <option value="">-- Pilih Bahan --</option>
                {bahanBaku.map(b => (
                  <option key={b.nama} value={b.nama}>{b.nama} ({formatCurrency(b.hargaSatuan)}/{b.satuan})</option>
                ))}
              </select>
            </div>

            {original && (
              <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                <span className="font-bold text-blue-800 block text-[11px]">Harga Asli</span>
                <span className="font-mono font-bold text-blue-900 text-sm">{formatCurrency(original.hargaSatuan)}/{original.satuan}</span>
                {original.markupPercent && (
                  <span className="block text-[10px] text-blue-600 mt-0.5">Markup: {original.markupPercent}%</span>
                )}
              </div>
            )}

            <div className="border-t border-gray-100 pt-3">
              <span className="block text-[10px] uppercase font-bold text-gray-500 mb-2">Bahan Pengganti</span>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama Bahan</label>
                <input type="text" value={substituteName}
                  onChange={(e) => setSubstituteName(e.target.value)}
                  placeholder="Contoh: Butter Corman"
                  className="w-full border border-gray-200 rounded-lg p-2.5" />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Harga Satuan (Rp)</label>
                  <input type="number" min="0" value={substitutePrice}
                    onChange={(e) => setSubstitutePrice(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-lg p-2.5 font-mono font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Satuan</label>
                  <select value={substituteSatuan} onChange={(e) => setSubstituteSatuan(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
                    <option>gr</option><option>kg</option><option>ml</option><option>L</option><option>pcs</option><option>sdm</option>
                  </select>
                </div>
              </div>
            </div>

            <button onClick={runSimulation}
              disabled={!original || !substitutePrice}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer mt-2">
              <Shuffle className="w-3.5 h-3.5 inline mr-1" /> Jalankan Simulasi
            </button>
          </div>

          {simulationResults.length > 0 && (
            <div className="bg-slate-50 p-3 rounded-xl border border-gray-100 text-xs">
              <span className="font-bold text-gray-700 block mb-1">Ringkasan:</span>
              <span className="text-gray-600">{simulationResults.length} produk terdampak</span>
              <div className="mt-1 text-emerald-700 font-bold">
                {substituteUnitPrice > (original?.hargaSatuan || 0)
                  ? `Biaya naik rata-rata ${formatCurrency(
                      simulationResults.reduce((s, r) => s + Math.max(0, r.costDiff), 0) / simulationResults.length
                    )}/produk`
                  : substituteUnitPrice < (original?.hargaSatuan || 0) && substituteUnitPrice > 0
                  ? `Biaya turun rata-rata ${formatCurrency(
                      Math.abs(simulationResults.reduce((s, r) => s + Math.min(0, r.costDiff), 0)) / simulationResults.length
                    )}/produk`
                  : 'Biaya tidak berubah'}
              </div>
            </div>
          )}
        </div>

        {/* KANAN: Hasil Simulasi */}
        <div className="lg:col-span-8 space-y-4">
          {simulationResults.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-xs flex flex-col items-center justify-center text-center">
              <Shuffle className="w-12 h-12 text-gray-200 stroke-1 mb-3" />
              <p className="text-sm text-gray-500 font-semibold">Belum Ada Simulasi</p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Pilih bahan asli, masukkan data bahan pengganti, lalu klik "Jalankan Simulasi" untuk melihat dampaknya.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Shuffle className="w-4 h-4 text-emerald-600" /> Dampak Substitusi
                  </h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-bold font-mono border border-blue-100">
                      {original?.nama} → {substituteName || 'Pengganti'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {simulationResults.map((r) => (
                    <div key={r.namaProduk} className={`p-4 rounded-xl border ${
                      r.marginChange < -2 ? 'bg-red-50 border-red-200' :
                      r.marginChange > 2 ? 'bg-emerald-50 border-emerald-200' :
                      'bg-gray-50 border-gray-150'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-900 text-sm">{r.namaProduk}</span>
                        {r.costDiff !== 0 && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            r.costDiff > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {r.costDiff > 0 ? '+' : ''}{formatCurrency(r.costDiff)}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="bg-white p-2 rounded-lg border border-gray-100">
                          <span className="text-gray-400 block text-[10px] uppercase font-bold">HPP Lama</span>
                          <span className="font-mono font-bold text-gray-800">{formatCurrency(r.oldHpp)}</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-gray-100">
                          <span className="text-gray-400 block text-[10px] uppercase font-bold">HPP Baru</span>
                          <span className={`font-mono font-bold ${r.costDiff > 0 ? 'text-red-700' : r.costDiff < 0 ? 'text-emerald-700' : 'text-gray-800'}`}>
                            {formatCurrency(r.newHpp)}
                          </span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-gray-100">
                          <span className="text-gray-400 block text-[10px] uppercase font-bold">Margin Lama</span>
                          <span className="font-mono font-bold text-gray-800">{r.oldMargin.toFixed(1)}%</span>
                        </div>
                        <div className="bg-white p-2 rounded-lg border border-gray-100">
                          <span className="text-gray-400 block text-[10px] uppercase font-bold">Margin Baru</span>
                          <span className={`font-mono font-bold flex items-center gap-1 ${r.marginChange < 0 ? 'text-red-700' : r.marginChange > 0 ? 'text-emerald-700' : 'text-gray-800'}`}>
                            {r.newMargin.toFixed(1)}%
                            {r.marginChange !== 0 && (
                              r.marginChange > 0
                                ? <TrendingUp className="w-3 h-3 text-emerald-600" />
                                : <TrendingDown className="w-3 h-3 text-red-600" />
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning for critical margin drops */}
              {simulationResults.some(r => r.newMargin < 15 && r.newMargin > 0) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold text-amber-800 block mb-1">Peringatan!</span>
                    <span className="text-amber-700">
                      {simulationResults.filter(r => r.newMargin < 15).map(r => r.namaProduk).join(', ')} memiliki margin di bawah 15% setelah substitusi. Pertimbangkan untuk menyesuaikan harga jual.
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
