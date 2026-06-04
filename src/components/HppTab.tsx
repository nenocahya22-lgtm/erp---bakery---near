import React, { useState } from 'react';
import { CalculationResult, ProductHpp } from '../types';
import { Percent, TrendingUp, Info, HelpCircle, AlertOctagon, CheckCircle2, ChevronRight, Calculator, Edit3, Trash2 } from 'lucide-react';

interface HppTabProps {
  calculatedProducts: CalculationResult[];
  onUpdateProductPricing: (productName: string, overhead: number, hargaJual: number) => void;
  onDeleteProduct: (productName: string) => void;
}

export default function HppTab({ calculatedProducts, onUpdateProductPricing, onDeleteProduct }: HppTabProps) {
  const [selectedProductName, setSelectedProductName] = useState<string>(
    calculatedProducts.length > 0 ? calculatedProducts[0].namaProduk : ''
  );

  // Suggested price calculator state for active item
  const [targetMargin, setTargetMargin] = useState<number>(40);

  const activeResult = calculatedProducts.find(
    (p) => p.namaProduk.toLowerCase().trim() === selectedProductName.toLowerCase().trim()
  );

  // Auto calculate suggested price based on HPP per Porsi and Desired Margin
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

  return (
    <div id="hpp-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
