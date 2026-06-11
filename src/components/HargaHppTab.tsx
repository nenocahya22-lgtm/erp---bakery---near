import React, { useState, useEffect } from 'react';
import { BahanBaku, DetailResep, CalculationResult, PriceRecord, SATUAN_OPTIONS } from '../types';
import { safeGetLocalStorage } from '../lib/safe-json';
import {
  TrendingUp, TrendingDown, BarChart3, DollarSign, Info, Sparkles, Printer, Plus, Trash2,
  Sliders, Calendar, Sun, CloudRain, Shuffle, Calculator, AlertTriangle, CheckCircle2,
  Percent, HelpCircle, AlertOctagon, ChevronRight, Package
} from 'lucide-react';

interface HargaHppTabProps {
  bahanBaku: BahanBaku[];
  calculatedProducts: CalculationResult[];
  detailResep: DetailResep[];
  onUpdateProductPricing: (productName: string, hargaJual: number) => void;
  onDeleteProduct: (productName: string) => void;
  onEditMaterial?: (oldName: string, updated: BahanBaku) => void;
}

export default function HargaHppTab({ bahanBaku, calculatedProducts, detailResep, onUpdateProductPricing, onDeleteProduct, onEditMaterial }: HargaHppTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'harga' | 'hpp' | 'substitusi'>('hpp');
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-emerald-600" /> Harga & HPP
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Analisis harga bahan, HPP produk, dan penetapan harga jual — dalam satu tab.
            </p>
          </div>
        </div>
      </div>

      {/* SUB-TAB NAV */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setActiveSubTab('harga')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeSubTab === 'harga' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}>
          <BarChart3 className="w-3.5 h-3.5 inline mr-1" /> Harga & Prediksi
        </button>
        <button onClick={() => setActiveSubTab('hpp')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeSubTab === 'hpp' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}>
          <Calculator className="w-3.5 h-3.5 inline mr-1" /> HPP & Margin
        </button>
        <button onClick={() => setActiveSubTab('substitusi')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeSubTab === 'substitusi' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}>
          <Shuffle className="w-3.5 h-3.5 inline mr-1" /> Substitusi Bahan
        </button>
      </div>

      {/* SUB-TAB: HARGA & PREDIKSI */}
      {activeSubTab === 'harga' && <HargaPrediksiSection bahanBaku={bahanBaku} calculatedProducts={calculatedProducts} formatCurrency={formatCurrency} />}

      {/* SUB-TAB: HPP & MARGIN */}
      {activeSubTab === 'hpp' && <HppMarginSection
        calculatedProducts={calculatedProducts}
        onUpdateProductPricing={onUpdateProductPricing}
        onDeleteProduct={onDeleteProduct}
        bahanBaku={bahanBaku}
        formatCurrency={formatCurrency}
      />}

      {/* SUB-TAB: SUBSTITUSI */}
      {activeSubTab === 'substitusi' && <SubstitusiSection
        bahanBaku={bahanBaku}
        detailResep={detailResep}
        calculatedProducts={calculatedProducts}
        formatCurrency={formatCurrency}
        onEditMaterial={onEditMaterial}
      />}
    </div>
  );
}

// ===== SUB-TAB: HARGA & PREDIKSI =====
function HargaPrediksiSection({ bahanBaku, calculatedProducts, formatCurrency }: {
  bahanBaku: BahanBaku[]; calculatedProducts: CalculationResult[]; formatCurrency: (v: number) => string;
}) {
  const [records, setRecords] = useState<PriceRecord[]>(() =>
    safeGetLocalStorage<PriceRecord[]>('harga_prediksi_data', [])
  );
  const [selectedBahan, setSelectedBahan] = useState('');
  const [hargaInput, setHargaInput] = useState('');
  const [note, setNote] = useState('');
  const [commodityInflation, setCommodityInflation] = useState(0);
  const [currentSeason, setCurrentSeason] = useState<'Normal' | 'Rainy' | 'Holiday'>('Normal');

  const saveRecords = (newRecords: PriceRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem('harga_prediksi_data', JSON.stringify(newRecords));
  };

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBahan || !hargaInput) return;
    const newRecord: PriceRecord = {
      id: `pr-${Date.now()}`,
      bahanNama: selectedBahan,
      hargaBeli: parseInt(hargaInput) || 0,
      date: new Date().toISOString().substring(0, 10),
      note: note.trim()
    };
    saveRecords([newRecord, ...records]);
    setHargaInput('');
    setNote('');
  };

  const handleDeleteRecord = (id: string) => {
    saveRecords(records.filter(r => r.id !== id));
  };

  const groupedByBahan = records.reduce((acc: Record<string, PriceRecord[]>, r) => {
    if (!acc[r.bahanNama]) acc[r.bahanNama] = [];
    acc[r.bahanNama].push(r);
    return acc;
  }, {});

  const allPrices = records.map(r => r.hargaBeli);
  const maxPrice = Math.max(...allPrices, 1);
  const minPrice = Math.min(...allPrices, 0);

  const rawPortfolioSum = calculatedProducts.reduce((acc, curr) => acc + curr.hppTotalResep, 0);
  const inflatedSum = rawPortfolioSum * (1 + commodityInflation / 100);
  const inflatedPortfolio = inflatedSum;
  const avgMargin = calculatedProducts.length > 0
    ? calculatedProducts.reduce((acc, curr) => acc + curr.marginPersen, 0) / calculatedProducts.length : 0;
  const inflatedMargin = Math.max(-100, avgMargin - (commodityInflation * 0.4));

  const getForecast = () => {
    switch (currentSeason) {
      case 'Rainy': return { effect: '☔ Musim Hujan → Delivery (+15%)', tip: 'Oven roti manis & donat dipasang lebih tinggi pagi hari.' };
      case 'Holiday': return { effect: '🎄 Liburan → Pre-Order (+45%)', tip: 'Amankan stok bahan baku! Tambah shift baker malam.' };
      default: return { effect: '☀️ Cuaca Normal → Penjualan Stabil', tip: 'Pertahankan produksi MPS reguler.' };
    }
  };

  const forecast = getForecast();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* INPUT HARGA */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">
            <Plus className="w-4 h-4 inline text-emerald-600" /> Catat Harga Baru
          </h3>
          <form onSubmit={handleAddRecord} className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Bahan Baku</label>
              <select required value={selectedBahan} onChange={(e) => setSelectedBahan(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
                <option value="">-- Pilih Bahan --</option>
                {bahanBaku.map(b => (<option key={b.nama} value={b.nama}>{b.nama}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Harga Beli (Rp)</label>
              <input type="number" required value={hargaInput} onChange={(e) => setHargaInput(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 font-mono font-bold" />
            </div>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Catatan (opsional)" className="w-full border border-gray-200 rounded-lg p-2.5" />
            <button type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer">
              Simpan Record Harga
            </button>
          </form>
        </div>

        {/* HISTORY CHART */}
        <div className="lg:col-span-8 space-y-4">
          {Object.keys(groupedByBahan).length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xs text-center">
              <BarChart3 className="w-10 h-10 text-gray-200 mx-auto stroke-1 mb-2" />
              <p className="text-sm text-gray-500 font-semibold">Belum Ada History Harga</p>
              <p className="text-xs text-gray-400 mt-1">Catat harga beli bahan baku untuk melihat grafik tren.</p>
            </div>
          ) : (
            Object.keys(groupedByBahan).slice(0, 3).map(bahan => {
              const prices = groupedByBahan[bahan].slice(0, 12).reverse();
              if (prices.length < 2) return null;
              const range = maxPrice - minPrice || 1;
              return (
                <div key={bahan} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{bahan}</h4>
                    <span className="text-[10px] text-gray-400">{prices.length} record</span>
                  </div>
                  <div className="h-28 bg-slate-50 rounded-xl border border-gray-100 p-3 flex items-end gap-2">
                    {prices.map((p, i) => {
                      const height = ((p.hargaBeli - minPrice) / range) * 100;
                      const isDown = i > 0 && p.hargaBeli < prices[i - 1].hargaBeli;
                      const isUp = i > 0 && p.hargaBeli > prices[i - 1].hargaBeli;
                      return (
                        <div key={p.id} className="flex-1 flex flex-col items-center gap-1">
                          <div className="relative w-full flex justify-center">
                            <div className={`w-full rounded-t ${isDown ? 'bg-red-400' : isUp ? 'bg-emerald-400' : 'bg-blue-400'} transition-all`}
                              style={{ height: `${Math.max(8, height)}%`, minHeight: '8px' }}
                              title={`${p.date}: ${formatCurrency(p.hargaBeli)}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {prices.length >= 2 && (
                    <div className="text-[10px] text-gray-500 flex justify-between">
                      <span>Rendah: {formatCurrency(Math.min(...prices.map(p => p.hargaBeli)))}</span>
                      <span>Tinggi: {formatCurrency(Math.max(...prices.map(p => p.hargaBeli)))}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* TABLE */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Semua Record Harga</h4>
            </div>
            <div className="overflow-y-auto max-h-[200px]">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50/50">
                  <tr><th className="p-2.5">Tanggal</th><th className="p-2.5">Bahan</th><th className="p-2.5 text-right">Harga</th><th className="p-2.5">Catatan</th><th className="p-2.5"></th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {records.slice(0, 30).map(r => (
                    <tr key={r.id}>
                      <td className="p-2.5 font-mono text-gray-400">{r.date}</td>
                      <td className="p-2.5 font-bold">{r.bahanNama}</td>
                      <td className="p-2.5 text-right font-mono font-bold">{formatCurrency(r.hargaBeli)}</td>
                      <td className="p-2.5 text-gray-500">{r.note}</td>
                      <td className="p-2.5">
                        <button onClick={() => handleDeleteRecord(r.id)}
                          className="text-gray-400 hover:text-red-600 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* INFLASI & PREDIKSI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-emerald-600" /> Simulasi Inflasi Bahan Baku
          </h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input type="range" min="0" max="60" step="1" value={commodityInflation}
                onChange={(e) => setCommodityInflation(parseInt(e.target.value))}
                className="w-full accent-emerald-600" />
              <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-1">
                <span>0%</span><span>20%</span><span>40%</span><span>60% (Krisis)</span>
              </div>
            </div>
            <div className="bg-amber-50 text-amber-800 font-bold text-sm p-3 rounded-lg border border-amber-100 font-mono min-w-[80px] text-center">
              +{commodityInflation}%
            </div>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between"><span>HPP Portofolio Awal:</span><span className="font-bold font-mono">{formatCurrency(rawPortfolioSum)}</span></div>
            <div className="flex justify-between text-red-700 font-bold border-t border-dashed pt-2"><span>HPP Setelah Inflasi (+{commodityInflation}%):</span><span className="font-mono">{formatCurrency(inflatedPortfolio)}</span></div>
            <div className="flex justify-between"><span>Margin Rata-rata:</span><span className={`font-mono font-bold ${inflatedMargin < 20 ? 'text-red-600' : 'text-emerald-700'}`}>{inflatedMargin.toFixed(1)}%</span></div>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-emerald-600" /> Prediksi Musiman
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={() => setCurrentSeason('Normal')}
              className={`py-3 text-xs font-bold rounded-xl cursor-pointer transition ${currentSeason === 'Normal' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Sun className="w-4 h-4 mx-auto mb-1" /> Normal
            </button>
            <button onClick={() => setCurrentSeason('Rainy')}
              className={`py-3 text-xs font-bold rounded-xl cursor-pointer transition ${currentSeason === 'Rainy' ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <CloudRain className="w-4 h-4 mx-auto mb-1" /> Hujan
            </button>
            <button onClick={() => setCurrentSeason('Holiday')}
              className={`py-3 text-xs font-bold rounded-xl cursor-pointer transition ${currentSeason === 'Holiday' ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Calendar className="w-4 h-4 mx-auto mb-1" /> Liburan
            </button>
          </div>
          <div className="bg-amber-50 p-4 border border-amber-100 rounded-xl space-y-2">
            <p className="font-bold text-sm text-amber-900">{forecast.effect}</p>
            <p className="text-xs text-amber-800">{forecast.tip}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== SUB-TAB: HPP & MARGIN =====
function HppMarginSection({ calculatedProducts, onUpdateProductPricing, onDeleteProduct, bahanBaku, formatCurrency }: {
  calculatedProducts: CalculationResult[];
  onUpdateProductPricing: (productName: string, hargaJual: number) => void;
  onDeleteProduct: (productName: string) => void;
  bahanBaku: BahanBaku[];
  formatCurrency: (v: number) => string;
}) {
  const [selectedProductName, setSelectedProductName] = useState(calculatedProducts.length > 0 ? calculatedProducts[0].namaProduk : '');
  const [targetMargin, setTargetMargin] = useState(40);
  const [globalTargetMargin, setGlobalTargetMargin] = useState(40);
  const [showBulkPricing, setShowBulkPricing] = useState(false);

  const activeResult = calculatedProducts.find(p => p.namaProduk.toLowerCase().trim() === selectedProductName.toLowerCase().trim());
  const suggestedPricePerPortion = activeResult ? activeResult.hppPerPorsi / (1 - targetMargin / 100) : 0;
  const suggestedPriceTotal = activeResult ? suggestedPricePerPortion * activeResult.porsiJual : 0;

  const handleApplySuggestedPrice = () => {
    if (!activeResult) return;
    if (window.confirm(`Terapkan harga jual ${formatCurrency(suggestedPriceTotal)} untuk "${activeResult.namaProduk}"?`)) {
      onUpdateProductPricing(activeResult.namaProduk, suggestedPriceTotal);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* DYNAMIC PRICING */}
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
                  </div>
                  <button onClick={() => {
                    if (window.confirm(`Terapkan margin ${globalTargetMargin}% ke SEMUA produk (${calculatedProducts.length} produk)?`)) {
                      calculatedProducts.forEach(p => {
                        const recommended = p.hppPerPorsi / (1 - globalTargetMargin / 100);
                        onUpdateProductPricing(p.namaProduk, Math.round(recommended * p.porsiJual));
                      });
                    }
                  }}
                    disabled={calculatedProducts.length === 0}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Terapkan ke Semua
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50">
                      <th className="px-3 py-2.5">Produk</th>
                      <th className="px-3 py-2.5 text-right">HPP/Porsi</th>
                      <th className="px-3 py-2.5 text-right">Harga Jual</th>
                      <th className="px-3 py-2.5 text-right">Margin</th>
                      <th className="px-3 py-2.5 text-right">Rekomendasi</th>
                      <th className="px-3 py-2.5">Dampak</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {calculatedProducts.filter(p => p.hppPerPorsi > 0).map(p => {
                      const recommended = p.hppPerPorsi / (1 - globalTargetMargin / 100);
                      return (
                        <tr key={p.namaProduk} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2.5 font-semibold">{p.namaProduk}</td>
                          <td className="px-3 py-2.5 text-right font-mono">{formatCurrency(p.hppPerPorsi)}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold">{formatCurrency(p.hargaJualPerPorsi)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${getMarginBadgeClass(p.marginPersen)}`}>{p.marginPersen.toFixed(1)}%</span>
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700">{formatCurrency(recommended)}</td>
                          <td className="px-3 py-2.5">
                            {Math.abs(recommended - p.hargaJualPerPorsi) < 50 ? (
                              <span className="text-gray-400 text-[10px]">✓ OK</span>
                            ) : (
                              <span className={`text-[10px] font-bold ${recommended > p.hargaJualPerPorsi ? 'text-emerald-600' : 'text-red-600'}`}>
                                {recommended > p.hargaJualPerPorsi ? '↑ Naik' : '↓ Turun'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HPP TABLE */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-start">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Harga Pokok Penjualan (HPP) & Margin</h3>
            <p className="text-xs text-gray-500 mt-1">Atur harga jual produk, lihat margin keuntungan langsung.</p>
          </div>
          <button onClick={() => {
            const printWin = window.open('', '_blank');
            if (!printWin) return;
            const rows = calculatedProducts.map(p => `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${p.namaProduk}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${p.porsiJual} porsi</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${formatCurrency(p.hppPerPorsi)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-weight:bold;${p.marginPersen < 15 ? 'color:#dc2626;' : p.marginPersen < 30 ? 'color:#d97706;' : 'color:#059669;'}">${p.marginPersen.toFixed(1)}%</td></tr>`).join('');
            printWin.document.write(`
              <html><head><title>Laporan HPP</title>
              <style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:900px;margin:0 auto;padding:40px;color:#1f2937;}h1{font-size:22px;color:#065f46;}table{width:100%;border-collapse:collapse;}th{background:#f3f4f6;padding:10px;font-size:11px;text-transform:uppercase;}td{padding:8px;border-bottom:1px solid #e5e7eb;}</style></head><body>
              <h1>📊 LAPORAN HPP & MARGIN</h1>
              <div style="color:#6b7280;font-size:12px;margin-bottom:20px;">${new Date().toLocaleDateString('id-ID')}</div>
              <table><thead><tr><th>Produk</th><th style="text-align:right;">Yield</th><th style="text-align:right;">HPP/Porsi</th><th style="text-align:right;">Margin</th></tr></thead><tbody>${rows}</tbody></table>
              <script>window.print();<\/script></body></html>
            `);
            printWin.document.close();
          }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
            <Printer className="w-3.5 h-3.5" /> Cetak
          </button>
        </div>
        {calculatedProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Info className="w-12 h-12 text-gray-300 mx-auto stroke-1 mb-3" />
            <p className="text-sm text-gray-500 font-semibold">Resep masih kosong</p>
            <p className="text-xs text-gray-400 mt-1">Silakan tambahkan produk di tab Formulasi Resep.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/30 text-[11px] font-bold text-gray-500 uppercase">
                  <th className="px-5 py-3">Nama Produk</th>
                  <th className="px-4 py-3 text-right">Yield</th>
                  <th className="px-4 py-3 text-right">HPP/Porsi</th>                      <th className="px-4 py-3 text-right">Harga Jual</th>
                  <th className="px-4 py-3 text-right">Laba/Porsi</th>
                  <th className="px-4 py-3 text-center">Margin</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {calculatedProducts.map(p => {
                  const isSelected = p.namaProduk.toLowerCase().trim() === selectedProductName.toLowerCase().trim();
                  return (
                    <tr key={p.namaProduk} onClick={() => setSelectedProductName(p.namaProduk)}
                      className={`cursor-pointer transition-colors hover:bg-emerald-50/10 ${isSelected ? 'bg-emerald-50/30' : ''}`}>
                      <td className="px-5 py-4 font-semibold text-gray-900">{p.namaProduk}</td>
                      <td className="px-4 py-4 text-right font-mono text-gray-500">{p.porsiJual} porsi</td>
                      <td className="px-4 py-4 text-right font-mono text-gray-900 font-semibold">{formatCurrency(p.hppPerPorsi)}</td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-bold text-emerald-800 font-mono">{formatCurrency(p.hargaJual)}</span>
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
                        <button onClick={(e) => { e.stopPropagation(); if (window.confirm(`Hapus produk "${p.namaProduk}"?`)) onDeleteProduct(p.namaProduk); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 transition cursor-pointer">
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

      {/* RIGHT PANEL */}
      <div className="lg:col-span-4 space-y-6">
        {!activeResult ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center flex flex-col justify-center items-center h-44">
            <HelpCircle className="w-8 h-8 text-gray-300 stroke-1 mb-2" />
            <p className="text-xs text-gray-500 font-medium">Klik pada produk untuk simulasi margin</p>
          </div>
        ) : (
          <>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold">Analisis Produk</span>
                <h3 className="text-base font-bold text-gray-900 truncate">{activeResult.namaProduk}</h3>
              </div>
              <div className={`p-3 rounded-xl border flex items-center gap-2 ${
                activeResult.marginPersen < 0 ? 'bg-red-50 border-red-100 text-red-800' :
                activeResult.marginPersen < 20 ? 'bg-amber-50 border-amber-100 text-amber-800' :
                'bg-emerald-50 border-emerald-100 text-emerald-800'
              }`}>
                {activeResult.marginPersen < 0 ? <AlertOctagon className="w-5 h-5 text-red-600 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                <div className="text-xs">
                  <span className="font-bold block text-[11px]">Status Margin:</span>
                  <span>{getMarginStatusText(activeResult.marginPersen)}</span>
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase">Struktur Komponen (per Porsi)</h4>
                <div className="h-6 w-full rounded-lg overflow-hidden flex text-[10px] text-white font-bold font-mono">
                  <div style={{ width: `${Math.max(1, Math.min(100, (activeResult.hppPerPorsi / activeResult.hargaJualPerPorsi) * 100))}%` }}
                    className="bg-emerald-600 h-full flex items-center justify-center truncate px-1">HPP Bahan</div>
                  {activeResult.profitPerPorsi > 0 && (
                    <div style={{ width: `${Math.max(1, Math.min(100, activeResult.marginPersen))}%` }}
                      className="bg-blue-600 h-full flex items-center justify-center truncate px-1">Laba</div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-50 text-[10px]">
                  <div><span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-600 mr-1"></span>HPP Bahan: <span className="block font-bold font-mono">{formatCurrency(activeResult.hppPerPorsi)}</span></div>
                  <div><span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-600 mr-1"></span>Laba: <span className="block font-bold font-mono">{formatCurrency(activeResult.profitPerPorsi)}</span></div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Calculator className="w-4 h-4 text-emerald-600" /> Penentu Harga Jual Ideal
              </h3>
              <div>
                <label className="flex justify-between text-xs font-semibold text-gray-700 uppercase mb-1.5">
                  <span>Target Margin %</span>
                  <span className="text-emerald-700 font-bold font-mono">{targetMargin}%</span>
                </label>
                <input type="range" min="10" max="80" value={targetMargin}
                  onChange={(e) => setTargetMargin(parseInt(e.target.value))}
                  className="w-full accent-emerald-600" />
              </div>
              <div className="p-3.5 bg-gray-50 border border-gray-100 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-gray-500">HPP/Porsi:</span><span className="font-bold font-mono">{formatCurrency(activeResult.hppPerPorsi)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Rekomendasi/Porsi:</span><span className="font-bold font-mono text-emerald-700">{formatCurrency(suggestedPricePerPortion)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Total Harga (1 Resep):</span><span className="font-bold font-mono text-emerald-800 text-sm">{formatCurrency(suggestedPriceTotal)}</span></div>
              </div>
              <button onClick={handleApplySuggestedPrice}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> Terapkan Harga Jual Ideal
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ===== SUB-TAB: SUBSTITUSI =====
function SubstitusiSection({ bahanBaku, detailResep, calculatedProducts, formatCurrency, onEditMaterial }: {
  bahanBaku: BahanBaku[]; detailResep: DetailResep[]; calculatedProducts: CalculationResult[]; formatCurrency: (v: number) => string;
  onEditMaterial?: (oldName: string, updated: BahanBaku) => void;
}) {
  const [subOriginalBahan, setSubOriginalBahan] = useState('');
  const [substituteQty, setSubstituteQty] = useState('');
  const [substitutePrice, setSubstitutePrice] = useState('');
  const [substituteSatuan, setSubstituteSatuan] = useState('gr');

  const subOriginal = bahanBaku.find(b => b.nama === subOriginalBahan);
  const substituteUnitPrice = parseFloat(substitutePrice) || 0;
  const substitutePackQty = parseFloat(substituteQty) || (subOriginal?.isiKemasan || 1000);
  const subAffected = subOriginal ? detailResep.filter(r => r.namaBahan.toLowerCase().trim() === subOriginal.nama.toLowerCase().trim()) : [];

  // Hitung harga satuan baru dari pengganti
  const newSatuanPrice = substituteUnitPrice / substitutePackQty;
  const oldSatuanPrice = subOriginal?.hargaSatuan || 0;

  const subResults = subAffected.map(r => {
    const product = calculatedProducts.find(p => p.namaProduk === r.namaProduk);
    if (!product) return null;
    const ingInCalc = product.bahanList.find(b => b.namaBahan.toLowerCase().trim() === subOriginal?.nama.toLowerCase().trim());
    if (!ingInCalc) return null;
    const oldIngCost = ingInCalc.totalBiayaBahan;
    const newIngCost = newSatuanPrice * r.takaran;
    const costDiff = newIngCost - oldIngCost;
    const newHpp = Math.max(0, product.hppPerPorsi + costDiff);
    const newMargin = product.hargaJualPerPorsi > 0 ? ((product.hargaJualPerPorsi - newHpp) / product.hargaJualPerPorsi) * 100 : 0;
    return { namaProduk: r.namaProduk, oldHpp: product.hppPerPorsi, newHpp, oldMargin: product.marginPersen, newMargin, costDiff, takaran: r.takaran };
  }).filter(Boolean);

  // Sync satuan when selected bahan changes
  useEffect(() => {
    const bahan = bahanBaku.find(b => b.nama === subOriginalBahan);
    if (bahan) setSubstituteSatuan(bahan.satuan);
  }, [subOriginalBahan, bahanBaku]);

  const handleApplySubstitution = () => {
    if (!subOriginal || substituteUnitPrice <= 0) return;
    if (!window.confirm(`Terapkan perubahan harga untuk "${subOriginal.nama}"?\n\nHarga Satuan: ${formatCurrency(oldSatuanPrice)} → ${formatCurrency(newSatuanPrice)}\nKemasan: ${subOriginal.isiKemasan} ${subOriginal.satuan} → ${substitutePackQty} ${substituteSatuan}\n\n${subAffected.length} produk akan terdampak.`)) return;

    if (onEditMaterial) {
      const updated: BahanBaku = {
        ...subOriginal,
        isiKemasan: substitutePackQty,
        hargaBeli: substituteUnitPrice,
        hargaBeliReal: substituteUnitPrice,
        hargaSatuan: newSatuanPrice,
        satuan: substituteSatuan,
      };
      onEditMaterial(subOriginal.nama, updated);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <Shuffle className="w-4 h-4 text-emerald-600" /> Substitusi Bahan — Update Harga Real
        </h3>
        <p className="text-xs text-gray-500">Ubah harga & qty kemasan bahan baku, lihat dampak ke HPP/margin, lalu terapkan perubahan nyata.</p>
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Bahan Asli</label>
            <select value={subOriginalBahan} onChange={(e) => { setSubOriginalBahan(e.target.value); setSubstituteQty(''); setSubstitutePrice(''); }}
              className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
              <option value="">-- Pilih Bahan --</option>
              {bahanBaku.map(b => (<option key={b.nama} value={b.nama}>{b.nama} ({formatCurrency(b.hargaSatuan)}/{b.satuan})</option>))}
            </select>
          </div>
          {subOriginal && (
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
              <span className="font-bold text-blue-800">Saat Ini: {formatCurrency(oldSatuanPrice)}/{subOriginal.satuan}</span>
              <span className="text-blue-600 block text-[10px] mt-0.5">Kemasan: {subOriginal.isiKemasan} {subOriginal.satuan} | Beli: {formatCurrency(subOriginal.hargaBeli)}</span>
              <span className="text-blue-600 block text-[10px]">{subAffected.length} produk terdampak</span>
            </div>
          )}
          <div className="border-t border-gray-100 pt-3">
            <span className="block text-[10px] uppercase font-bold text-gray-500 mb-2">Data Baru</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-400 mb-0.5">Qty Kemasan Baru</label>
                <div className="flex gap-1">
                  <input type="number" value={substituteQty} onChange={(e) => setSubstituteQty(e.target.value)}
                    placeholder={String(subOriginal?.isiKemasan || 1000)}
                    className="flex-1 border border-gray-200 rounded-lg p-2.5 font-mono" />
                  <select value={substituteSatuan} onChange={e => setSubstituteSatuan(e.target.value)}
                    className="w-16 border border-gray-200 rounded-lg p-2.5 text-xs font-bold bg-white text-center">
                    {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-400 mb-0.5">Harga Beli Baru (Rp)</label>
                <input type="number" value={substitutePrice} onChange={(e) => setSubstitutePrice(e.target.value)}
                  placeholder="0" className="w-full border border-gray-200 rounded-lg p-2.5 font-mono" />
              </div>
            </div>
          </div>
          <div className={`p-3 rounded-xl border text-xs ${subResults.length === 0 ? 'bg-gray-50 text-gray-400' : ''}`}>
            {subResults.length === 0 ? (
              <p>Pilih bahan asli dan masukkan qty & harga baru untuk melihat dampak.</p>
            ) : (
              <div className="space-y-2 max-h-[240px] overflow-y-auto">
                {subResults.map((r: any) => (
                  <div key={r.namaProduk} className={`p-3 rounded-xl border text-xs ${r.costDiff > 0 ? 'bg-red-50 border-red-200' : r.costDiff < 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-150'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-900">{r.namaProduk}</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded-full ${r.costDiff > 0 ? 'bg-red-100 text-red-700' : r.costDiff < 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                        {r.costDiff > 0 ? '+' : ''}{formatCurrency(r.costDiff)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div><span className="text-gray-400 block text-[9px]">HPP Lama</span><span className="font-mono font-bold">{formatCurrency(r.oldHpp)}</span></div>
                      <div><span className="text-gray-400 block text-[9px]">HPP Baru</span><span className={`font-mono font-bold ${r.costDiff > 0 ? 'text-red-700' : r.costDiff < 0 ? 'text-emerald-700' : ''}`}>{formatCurrency(r.newHpp)}</span></div>
                      <div><span className="text-gray-400 block text-[9px]">Margin Lama</span><span className="font-mono font-bold">{r.oldMargin.toFixed(1)}%</span></div>
                      <div><span className="text-gray-400 block text-[9px]">Margin Baru</span><span className={`font-mono font-bold ${r.costDiff > 0 ? 'text-red-700' : r.costDiff < 0 ? 'text-emerald-700' : ''}`}>{r.newMargin.toFixed(1)}%</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TOMBOL APPLY */}
          {subResults.length > 0 && substituteUnitPrice > 0 && (
            <button onClick={handleApplySubstitution}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Terapkan Perubahan Harga & Qty
            </button>
          )}
        </div>
      </div>
      <div className="lg:col-span-7 bg-gradient-to-br from-blue-50 to-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center text-center">
        <Shuffle className="w-12 h-12 text-emerald-400 stroke-1 mb-3" />
        <h3 className="text-sm font-bold text-gray-900 mb-1">Substitusi Bahan — Update Real</h3>
        <p className="text-xs text-gray-500 max-w-md">Pilih bahan asli, masukkan qty kemasan baru & harga beli baru. Sistem akan menghitung ulang harga satuan, menampilkan dampak ke semua produk, lalu Anda bisa terapkan perubahan nyata ke database.</p>
        {subOriginal && (
          <div className="mt-4 w-full max-w-md space-y-2">
            <div className="bg-white p-3 rounded-xl border border-gray-100 text-xs">
              <Package className="w-4 h-4 inline text-emerald-600 mr-1" />
              <span className="font-bold">{subOriginal.nama}</span> digunakan di <strong>{subAffected.length} produk</strong>.
            </div>
            {substituteUnitPrice > 0 && (
              <div className={`p-3 rounded-xl border text-xs ${newSatuanPrice < oldSatuanPrice ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex justify-between">
                  <span className="text-gray-600">Harga Satuan Lama:</span>
                  <span className="font-mono font-bold">{formatCurrency(oldSatuanPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Harga Satuan Baru:</span>
                  <span className={`font-mono font-bold ${newSatuanPrice < oldSatuanPrice ? 'text-emerald-700' : 'text-red-700'}`}>{formatCurrency(newSatuanPrice)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                  <span className="text-gray-600">Selisih:</span>
                  <span className={`font-mono font-bold ${newSatuanPrice < oldSatuanPrice ? 'text-emerald-700' : 'text-red-700'}`}>
                    {newSatuanPrice < oldSatuanPrice ? '✅ Lebih Murah' : '❌ Lebih Mahal'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
