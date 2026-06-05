import React, { useState } from 'react';
import { BahanBaku, ProductHpp, DetailResep, CalculationResult } from '../types';
import { Percent, TrendingUp, Info, HelpCircle, AlertOctagon, CheckCircle2, ChevronRight, Calculator, Edit3, Trash2, DollarSign, Sparkles, ArrowRight, Shuffle, TrendingDown, Package, AlertTriangle } from 'lucide-react';

interface HppTabProps {
  calculatedProducts: CalculationResult[];
  onUpdateProductPricing: (productName: string, overhead: number, hargaJual: number) => void;
  onDeleteProduct: (productName: string) => void;
  bahanBaku?: BahanBaku[];
  productHpp?: ProductHpp[];
  detailResep?: DetailResep[];
}

export default function HppTab({ calculatedProducts, onUpdateProductPricing, onDeleteProduct, bahanBaku, detailResep }: HppTabProps) {
  const [selectedProductName, setSelectedProductName] = useState<string>(
    calculatedProducts.length > 0 ? calculatedProducts[0].namaProduk : ''
  );

  // Per-product pricing state
  const [targetMargin, setTargetMargin] = useState<number>(40);

  // Bulk Dynamic Pricing state
  const [globalTargetMargin, setGlobalTargetMargin] = useState<number>(40);
  const [showBulkPricing, setShowBulkPricing] = useState(false);

  const activeResult = calculatedProducts.find(
    (p) => p.namaProduk.toLowerCase().trim() === selectedProductName.toLowerCase().trim()
  );

  const suggestedPricePerPortion = activeResult
    ? activeResult.hppPerPorsi / (1 - targetMargin / 100)
    : 0;

  const suggestedPriceTotal = activeResult
    ? suggestedPricePerPortion * activeResult.porsiJual
    : 0;

  const handleApplySuggestedPrice = () => {
    if (!activeResult) return;
    const confirmApply = window.confirm(
      `Terapkan Harga Jual yang disarankan (${formatCurrency(suggestedPriceTotal)}) untuk produk "${activeResult.namaProduk}"?`
    );
    if (confirmApply) {
      onUpdateProductPricing(activeResult.namaProduk, activeResult.overhead, suggestedPriceTotal);
    }
  };

  const getMarginBadgeClass = (margin: number) => {
    if (margin < 0) return 'bg-red-50 text-red-700 border-red-100';
    if (margin < 20) return 'bg-amber-50 text-amber-700 border-amber-100';
    if (margin < 50) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    return 'bg-blue-50 text-blue-700 border-blue-100';
  };

  const getMarginStatusText = (margin: number) => {
    if (margin < 0) return 'Rugi (Negatif)';
    if (margin < 20) return 'Margin Tipis';
    if (margin < 50) return 'Sehat (Menguntungkan)';
    return 'Sangat Menguntungkan';
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(val);
  };

  // ===== SUBSTITUTION SIMULATOR STATE =====
  const [showSubstitution, setShowSubstitution] = useState(false);
  const [subOriginalBahan, setSubOriginalBahan] = useState('');
  const [substituteName, setSubstituteName] = useState('');
  const [substitutePrice, setSubstitutePrice] = useState('');

  const subOriginal = bahanBaku?.find(b => b.nama === subOriginalBahan);
  const substituteUnitPrice = parseFloat(substitutePrice) || 0;

  // Find all products that use this ingredient
  const subAffected = subOriginal && detailResep
    ? detailResep.filter(r => r.namaBahan.toLowerCase().trim() === subOriginal.nama.toLowerCase().trim())
    : [];

  // Calculate simulated HPP for each affected product
  const subResults = subAffected.map(r => {
    const product = calculatedProducts.find(p => p.namaProduk === r.namaProduk);
    if (!product) return null;
    const ingInCalc = product.bahanList.find(b => b.namaBahan.toLowerCase().trim() === subOriginal?.nama.toLowerCase().trim());
    if (!ingInCalc) return null;
    const oldIngCost = ingInCalc.totalBiayaBahan;
    const newIngCost = substituteUnitPrice * r.takaran;
    const costDiff = newIngCost - oldIngCost;
    const oldHppPerPorsi = product.hppPerPorsi;
    const newHppPerPorsi = Math.max(0, oldHppPerPorsi + costDiff);
    const newMargin = product.hargaJualPerPorsi > 0
      ? ((product.hargaJualPerPorsi - newHppPerPorsi) / product.hargaJualPerPorsi) * 100
      : 0;
    return {
      namaProduk: r.namaProduk,
      oldHpp: oldHppPerPorsi,
      newHpp: newHppPerPorsi,
      oldMargin: product.marginPersen,
      newMargin,
      costDiff,
      takaran: r.takaran,
    };
  }).filter(Boolean);

  return (
    // HPP Tab with Dynamic Pricing & Substitution
    <div id="hpp-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6">

      {/* DYNAMIC PRICING & PROFIT TARGET RECOMMENDER */}
      <div className="lg:col-span-12">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <button onClick={() => setShowBulkPricing(!showBulkPricing)}
            className="w-full flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shadow-md">
                <DollarSign className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Dynamic Pricing & Profit Target</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Set target margin global, sistem rekomendasikan harga jual semua produk</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showBulkPricing ? 'rotate-90' : ''}`} />
          </button>

          {showBulkPricing && (
            <div className="mt-5 pt-4 border-t border-gray-100 space-y-4">
              <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-4 rounded-xl border border-emerald-100">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                  <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-gray-700 uppercase flex justify-between mb-2">
                      <span>Target Laba Kotor Global</span>
                      <span className="text-emerald-700 font-mono text-sm font-black">{globalTargetMargin}%</span>
                    </label>
                    <input type="range" min="10" max="80" value={globalTargetMargin}
                      onChange={(e) => setGlobalTargetMargin(parseInt(e.target.value))}
                      className="w-full accent-emerald-600" />
                    <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                      <span>10% Tipis</span><span>30% Wajar</span><span>50% Tinggi</span><span>80% Premium</span>
                    </div>
                  </div>
                  <button onClick={() => {
                    const confirmed = window.confirm(
                      `Terapkan harga rekomendasi margin ${globalTargetMargin}% ke SEMUA produk (${calculatedProducts.length} produk)?`
                    );
                    if (confirmed) {
                      calculatedProducts.forEach(p => {
                        const recommendedPricePerPorsi = p.hppPerPorsi / (1 - globalTargetMargin / 100);
                        const recommendedTotal = recommendedPricePerPorsi * p.porsiJual;
                        onUpdateProductPricing(p.namaProduk, p.overhead, Math.round(recommendedTotal));
                      });
                    }
                  }}
                    disabled={calculatedProducts.length === 0}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer whitespace-nowrap flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Terapkan ke Semua
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50">
                      <th className="px-3 py-2.5 rounded-l-lg">Produk</th>
                      <th className="px-3 py-2.5 text-right">HPP/Porsi</th>
                      <th className="px-3 py-2.5 text-right">Harga Jual Skrg</th>
                      <th className="px-3 py-2.5 text-right">Margin Skrg</th>
                      <th className="px-3 py-2.5 text-right">Rekom. Harga</th>
                      <th className="px-3 py-2.5 text-right">Margin Target</th>
                      <th className="px-3 py-2.5 rounded-r-lg">Dampak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {calculatedProducts.filter(p => p.hppPerPorsi > 0).map(p => {
                      const recommendedPerPorsi = p.hppPerPorsi / (1 - globalTargetMargin / 100);
                      const priceDiff = recommendedPerPorsi - p.hargaJualPerPorsi;
                      return (
                        <tr key={p.namaProduk} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2.5 font-semibold text-gray-800">{p.namaProduk}</td>
                          <td className="px-3 py-2.5 text-right font-mono text-gray-700">{formatCurrency(p.hppPerPorsi)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold">{formatCurrency(p.hargaJualPerPorsi)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                              p.marginPersen < 15 ? 'bg-red-100 text-red-700' : p.marginPersen < 30 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {p.marginPersen.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">{formatCurrency(recommendedPerPorsi)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">{globalTargetMargin}%</td>
                          <td className="px-3 py-2.5">
                            {Math.abs(priceDiff) < 50 ? (
                              <span className="text-gray-400 text-[10px]">✓ OK</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                {priceDiff > 0 ? (
                                  <>
                                    <span className="text-emerald-600 font-bold text-[10px]">Naik {formatCurrency(priceDiff)}</span>
                                    <ArrowRight className="w-2.5 h-2.5 text-emerald-600" />
                                  </>
                                ) : (
                                  <>
                                    <span className="text-red-600 font-bold text-[10px]">Turun {formatCurrency(Math.abs(priceDiff))}</span>
                                    <ArrowRight className="w-2.5 h-2.5 text-red-600" />
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {calculatedProducts.filter(p => p.hppPerPorsi > 0).length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-400">Tidak ada produk dengan HPP valid.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-[10px] text-gray-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Harga rekomendasi dihitung dari HPP / (1 - target margin). Klik "Terapkan ke Semua" untuk update harga jual semua produk sekaligus.
              </p>
            </div>
          )}
        </div>

        {/* SUBSTITUTION SIMULATOR PANEL */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs mt-4">
          <button onClick={() => setShowSubstitution(!showSubstitution)}
            className="w-full flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-md">
                <Shuffle className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Substitusi Bahan Baku</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">Simulasi dampak pergantian bahan terhadap HPP & margin</p>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${showSubstitution ? 'rotate-90' : ''}`} />
          </button>

          {showSubstitution && (
            <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* KIRI: Form */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Bahan Asli</label>
                  <select value={subOriginalBahan} onChange={(e) => setSubOriginalBahan(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
                    <option value="">-- Pilih Bahan --</option>
                    {(bahanBaku || []).map(b => (
                      <option key={b.nama} value={b.nama}>{b.nama} ({formatCurrency(b.hargaSatuan)}/{b.satuan})</option>
                    ))}
                  </select>
                </div>
                {subOriginal && (
                  <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                    <span className="font-bold text-blue-800 block text-[11px]">Harga Asli: {formatCurrency(subOriginal.hargaSatuan)}/{subOriginal.satuan}</span>
                  </div>
                )}
                <div className="border-t border-gray-100 pt-3">
                  <span className="block text-[10px] uppercase font-bold text-gray-500 mb-2">Bahan Pengganti</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama</label>
                      <input type="text" value={substituteName}
                        onChange={(e) => setSubstituteName(e.target.value)}
                        placeholder="Nama bahan pengganti"
                        className="w-full border border-gray-200 rounded-lg p-2.5" />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Harga Satuan (Rp)</label>
                      <input type="number" min="0" value={substitutePrice}
                        onChange={(e) => setSubstitutePrice(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg p-2.5 font-mono font-bold" />
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowSubstitution(true)}
                  disabled={!subOriginalBahan || !substitutePrice}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer">
                  <Shuffle className="w-3.5 h-3.5 inline mr-1" /> Jalankan Simulasi
                </button>
              </div>

              {/* KANAN: Hasil */}
              <div className="space-y-2">
                {subResults.length === 0 ? (
                  <div className="bg-gray-50 p-6 rounded-xl text-center text-xs text-gray-400">
                    <Shuffle className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                    Pilih bahan asli, masukkan data pengganti untuk melihat dampak.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {subResults.map(r => (
                      <div key={r.namaProduk} className={`p-3 rounded-xl border text-xs ${
                        r.costDiff > 0 ? 'bg-red-50 border-red-200' : r.costDiff < 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-150'
                      }`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-bold text-gray-900">{r.namaProduk}</span>
                          <span className={`font-bold px-1.5 py-0.5 rounded-full ${r.costDiff > 0 ? 'bg-red-100 text-red-700' : r.costDiff < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                            {r.costDiff > 0 ? '+' : ''}{formatCurrency(r.costDiff)}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          <div><span className="text-gray-400 block text-[9px]">HPP Lama</span><span className="font-mono font-bold">{formatCurrency(r.oldHpp)}</span></div>
                          <div><span className="text-gray-400 block text-[9px]">HPP Baru</span><span className={`font-mono font-bold ${r.costDiff > 0 ? 'text-red-700' : r.costDiff < 0 ? 'text-emerald-700' : ''}`}>{formatCurrency(r.newHpp)}</span></div>
                          <div><span className="text-gray-400 block text-[9px]">Margin Lama</span><span className="font-mono font-bold">{r.oldMargin.toFixed(1)}%</span></div>
                          <div><span className="text-gray-400 block text-[9px]">Margin Baru</span><span className={`font-mono font-bold flex items-center gap-0.5 ${r.costDiff > 0 ? 'text-red-700' : r.costDiff < 0 ? 'text-emerald-700' : ''}`}>{r.newMargin.toFixed(1)}%{r.costDiff !== 0 && (r.costDiff > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />)}</span></div>
                        </div>
                      </div>
                    ))}
                    {subResults.some(r => r.newMargin < 15) && (
                      <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-start gap-2 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span className="text-amber-800">Peringatan: Beberapa produk memiliki margin di bawah 15% setelah substitusi!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LEFT PANEL: Live Table of all Product COGS/HPP and Pricing */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-900">Harga Pokok Penjualan (HPP) & Margin Keuntungan</h2>
          <p className="text-xs text-gray-500 mt-1">
            Simulasi biaya overhead, harga jual, laba bersih, dan margin keuntungan langsung. Ubah nilai untuk mensimulasikan harga baru.
          </p>
        </div>

        {calculatedProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Info className="w-12 h-12 text-gray-300 mx-auto stroke-1 mb-3" />
            <p className="text-sm text-gray-500 font-medium font-semibold">Resep masih kosong</p>
            <p className="text-xs text-gray-400 mt-1">Silakan tambahkan produk di tab Resep Produk terlebih dahulu.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/30 text-[11px] font-bold text-gray-500 uppercase">
                  <th className="px-5 py-3">Nama Produk</th>
                  <th className="px-4 py-3 text-right">Yield</th>
                  <th className="px-4 py-3 text-right">HPP / Porsi</th>
                  <th className="px-4 py-3 text-right">Biaya Ops (Overhead)</th>
                  <th className="px-4 py-3 text-right">Harga Jual / Porsi</th>
                  <th className="px-4 py-3 text-right">Laba / Porsi</th>
                  <th className="px-4 py-3 text-center">Margin %</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {calculatedProducts.map((p) => {
                  const isSelected = p.namaProduk.toLowerCase().trim() === selectedProductName.toLowerCase().trim();
                  return (
                    <tr
                      key={p.namaProduk}
                      onClick={() => setSelectedProductName(p.namaProduk)}
                      className={`cursor-pointer transition-colors hover:bg-emerald-50/10 ${
                        isSelected ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="px-5 py-4 font-semibold text-gray-900 flex items-center gap-1">
                        {p.namaProduk}
                        {isSelected && <ChevronRight className="w-3.5 h-3.5 text-emerald-600" />}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-medium text-gray-500">
                        {p.porsiJual} porsi
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-gray-900 font-semibold">
                        {formatCurrency(p.hppPerPorsi)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-gray-500 text-xs">
                        <div className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                          <Edit3 className="w-3 h-3 text-gray-400" />
                          <input
                            type="number"
                            value={p.overhead}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const ops = parseFloat(e.target.value) || 0;
                              onUpdateProductPricing(p.namaProduk, ops, p.hargaJual);
                            }}
                            className="w-16 bg-transparent text-right font-bold focus:outline-none focus:ring-0 text-gray-700 font-mono"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-gray-900 font-semibold">
                        <div className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                          <Edit3 className="w-3 h-3 text-gray-400" />
                          <input
                            type="number"
                            value={p.hargaJual}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const sm = parseFloat(e.target.value) || 0;
                              onUpdateProductPricing(p.namaProduk, p.overhead, sm);
                            }}
                            className="w-20 bg-transparent text-right font-bold focus:outline-none focus:ring-0 text-emerald-800 font-mono"
                          />
                        </div>
                      </td>
                      <td className={`px-4 py-4 text-right font-mono font-semibold ${p.profitPerPorsi >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatCurrency(p.profitPerPorsi)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${getMarginBadgeClass(p.marginPersen)}`}>
                          {p.marginPersen.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Apakah Anda yakin ingin menghapus produk "${p.namaProduk}"? Tindakan ini menghapus formula resep secara permanen.`)) {
                              onDeleteProduct(p.namaProduk);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-105 transition cursor-pointer inline-flex"
                          title="Hapus Produk"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Margin Simulator, Suggester, and Cost distribution */}
      <div className="lg:col-span-4 space-y-6">
        {!activeResult ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center flex flex-col justify-center items-center h-44">
            <HelpCircle className="w-8 h-8 text-gray-300 stroke-1 mb-2" />
            <p className="text-xs text-gray-500 font-medium">Klik pada produk untuk simulasi margin</p>
          </div>
        ) : (
          <>
            {/* Visual Margin Breakdown Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Analisis Produk</span>
                <h3 className="text-base font-bold text-gray-900 truncate">{activeResult.namaProduk}</h3>
              </div>

              {/* Status Banner */}
              <div className={`p-3 rounded-xl border flex items-center gap-2 ${
                activeResult.marginPersen < 0
                  ? 'bg-red-50 border-red-100 text-red-800'
                  : activeResult.marginPersen < 20
                  ? 'bg-amber-50 border-amber-100 text-amber-800'
                  : 'bg-emerald-50 border-emerald-100 text-emerald-800'
              }`}>
                {activeResult.marginPersen < 0 ? (
                  <AlertOctagon className="w-5 h-5 text-red-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <div className="text-xs">
                  <span className="font-bold block text-[11px] uppercase tracking-wide">Status Margin:</span>
                  <span>{getMarginStatusText(activeResult.marginPersen)}</span>
                </div>
              </div>

              {/* Graphic cost breakdown representation */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase">Struktur Komponen (per Porsi)</h4>
                
                {/* Horizontal bar split components */}
                <div className="h-6 w-full rounded-lg overflow-hidden flex text-[10px] text-white font-bold font-mono">
                  {/* Ingredient bar component */}
                  <div
                    style={{ width: `${Math.max(1, Math.min(100, ((activeResult.hppPerPorsi - activeResult.overhead/activeResult.porsiJual) / activeResult.hargaJualPerPorsi) * 100))}%` }}
                    className="bg-emerald-600 h-full flex items-center justify-center truncate px-1"
                    title="Bahan Baku"
                  >
                    Bahan
                  </div>
                  {/* Overhead component */}
                  <div
                    style={{ width: `${Math.max(1, Math.min(100, ((activeResult.overhead/activeResult.porsiJual) / activeResult.hargaJualPerPorsi) * 100))}%` }}
                    className="bg-amber-500 h-full flex items-center justify-center truncate px-1"
                    title="Overhead"
                  >
                    Ops
                  </div>
                  {/* Net profit component */}
                  {activeResult.profitPerPorsi > 0 && (
                    <div
                      style={{ width: `${Math.max(1, Math.min(100, activeResult.marginPersen))}%` }}
                      className="bg-blue-600 h-full flex items-center justify-center truncate px-1 animate-pulse-slow"
                      title="Profit"
                    >
                      Laba
                    </div>
                  )}
                </div>

                {/* Captions */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50 text-[10px]">
                  <div>
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-600 mr-1 align-middle"></span>
                    <span className="text-gray-500">Bahan Baku:</span>
                    <span className="block font-bold text-gray-900 font-mono">
                      {formatCurrency(activeResult.hppPerPorsi - activeResult.overhead/activeResult.porsiJual)}
                    </span>
                  </div>
                  <div>
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500 mr-1 align-middle"></span>
                    <span className="text-gray-500">Overhead:</span>
                    <span className="block font-bold text-gray-900 font-mono">
                      {formatCurrency(activeResult.overhead / activeResult.porsiJual)}
                    </span>
                  </div>
                  <div>
                    <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-600 mr-1 align-middle"></span>
                    <span className="text-gray-500">Profit Bersih:</span>
                    <span className="block font-bold text-gray-900 font-mono">
                      {formatCurrency(activeResult.profitPerPorsi)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Advisor & Target Margin Tool */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Calculator className="w-4 h-4 text-emerald-600" />
                Penentu Harga Jual Ideal
              </h3>
              <p className="text-xs text-gray-500">
                Gunakan alat ini untuk mensimulasikan harga jual ideal berdasarkan ketetapan target margin laba yang Anda inginkan.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase flex justify-between">
                    <span>Target Margin Laba %</span>
                    <span className="text-emerald-700 font-bold font-mono">{targetMargin}%</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(parseInt(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-semibold px-0.5 mt-1">
                    <span>10% (Rendah)</span>
                    <span>40% (Sedang)</span>
                    <span>80% (Tinggi)</span>
                  </div>
                </div>

                {/* Calculation breakdown */}
                <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Biaya HPP Modal per Porsi:</span>
                    <span className="font-bold font-mono text-gray-900">{formatCurrency(activeResult.hppPerPorsi)}</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-gray-200/80 pt-1.5">
                    <span className="text-gray-500">Harga Jual Sasaran / Porsi:</span>
                    <span className="font-bold font-mono text-emerald-700">{formatCurrency(suggestedPricePerPortion)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Harga Jual (1 Resep):</span>
                    <span className="font-bold font-mono text-emerald-800 text-sm">{formatCurrency(suggestedPriceTotal)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleApplySuggestedPrice}
                  className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <TrendingUp className="w-4 h-4" />
                  Terapkan Harga Jual Ideal
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
