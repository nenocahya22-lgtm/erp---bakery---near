import React, { useState } from 'react';
import { TrendingUp, Plus, Trash2, Sun, CloudRain, Calendar, Sliders, Sparkles, BarChart3, Printer } from 'lucide-react';
import { BahanBaku, PriceRecord, CalculationResult } from '../types';

interface HargaPrediksiTabProps {
  bahanBaku: BahanBaku[];
  calculatedProducts: CalculationResult[];
}

export default function HargaPrediksiTab({ bahanBaku, calculatedProducts }: HargaPrediksiTabProps) {
  // Price History state
  const [records, setRecords] = useState<PriceRecord[]>(() => {
    const saved = localStorage.getItem('harga_prediksi_data');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedBahan, setSelectedBahan] = useState('');
  const [hargaInput, setHargaInput] = useState('');
  const [note, setNote] = useState('');

  // Prediksi state
  const [commodityInflation, setCommodityInflation] = useState(0);
  const [currentSeason, setCurrentSeason] = useState<'Normal' | 'Rainy' | 'Holiday'>('Normal');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

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

  // Price chart grouping
  const groupedByBahan = records.reduce((acc: Record<string, PriceRecord[]>, r) => {
    if (!acc[r.bahanNama]) acc[r.bahanNama] = [];
    acc[r.bahanNama].push(r);
    return acc;
  }, {});

  const allPrices = records.map(r => r.hargaBeli);
  const maxPrice = Math.max(...allPrices, 1);
  const minPrice = Math.min(...allPrices, 0);

  // Inflation simulation
  const rawPortfolioSum = calculatedProducts.reduce((acc, curr) => acc + (curr.hppTotalResep - curr.overhead), 0);
  const inflatedSum = rawPortfolioSum * (1 + commodityInflation / 100);
  const overheadSum = calculatedProducts.reduce((acc, curr) => acc + curr.overhead, 0);
  const inflatedPortfolio = inflatedSum + overheadSum;
  const avgMargin = calculatedProducts.length > 0
    ? calculatedProducts.reduce((acc, curr) => acc + curr.marginPersen, 0) / calculatedProducts.length
    : 0;
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
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-600" /> Analisis Harga & Prediksi
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Catat history harga beli bahan baku + simulasi inflasi & prediksi musiman untuk antisipasi bisnis.
          </p>
        </div>
        <button onClick={() => {
          const printWin = window.open('', '_blank');
          if (!printWin) return;
          const historyRows = records.slice(0, 30).map(r => `
            <tr><td style="padding:8px;border-bottom:1px solid #eee;font-family:monospace;">${r.date}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:500;">${r.bahanNama}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${formatCurrency(r.hargaBeli)}</td></tr>
          `).join('');
          printWin.document.write(`
            <html><head><title>Laporan Harga & Prediksi</title>
            <style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1f2937;}h1{font-size:22px;color:#065f46;}.meta{color:#6b7280;font-size:12px;margin-bottom:20px;}table{width:100%;border-collapse:collapse;margin:10px 0;}th{background:#f3f4f6;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;}td{padding:8px;border-bottom:1px solid #e5e7eb;}.section{margin-top:24px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;}h2{font-size:16px;color:#065f46;}@media print{body{padding:20px;}}</style></head><body>
            <h1>📈 LAPORAN ANALISIS HARGA & PREDIKSI</h1>
            <div class="meta">Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { year:'numeric',month:'long',day:'numeric' })}</div>
            <h2>History Harga Bahan Baku</h2>
            <table><thead><tr><th>Tanggal</th><th>Bahan</th><th style="text-align:right;">Harga</th></tr></thead><tbody>${historyRows || '<tr><td colspan="3" style="text-align:center;color:#9ca3af;padding:20px;">Belum ada data.</td></tr>'}</tbody></table>
            <div class="section">
              <strong>Simulasi Inflasi:</strong> +${commodityInflation}%<br>
              <strong>HPP Portofolio:</strong> ${formatCurrency(rawPortfolioSum + overheadSum)} → ${formatCurrency(inflatedPortfolio)}<br>
              <strong>Margin Rata-rata:</strong> ${avgMargin.toFixed(1)}% → ${inflatedMargin.toFixed(1)}%
            </div>
            <div class="section">
              <strong>Prediksi Musiman:</strong> ${forecast.effect}<br>
              <strong>Tip:</strong> ${forecast.tip}
            </div>
            <p style="margin-top:40px;text-align:center;color:#9ca3af;font-size:11px;">Near Bakery & Co. ERP — Analisis Harga & Prediksi</p>
            <script>window.print();<\/script></body></html>
          `);
          printWin.document.close();
        }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
          <Printer className="w-3.5 h-3.5" /> Cetak
        </button>
      </div>

      {/* SECTION 1: PRICE HISTORY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* INPUT PRICE */}
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
                {bahanBaku.map(b => (
                  <option key={b.nama} value={b.nama}>{b.nama}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Harga Beli (Rp)</label>
              <input type="number" required value={hargaInput} onChange={(e) => setHargaInput(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 font-mono font-bold" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Catatan (opsional)</label>
              <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Misal: Harga pasar minggu ini"
                className="w-full border border-gray-200 rounded-lg p-2.5" />
            </div>
            <button type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer">
              Simpan Record Harga
            </button>
          </form>
        </div>

        {/* HISTORY CHART & TABLE */}
        <div className="lg:col-span-8 space-y-4">
          {Object.keys(groupedByBahan).length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xs text-center">
              <BarChart3 className="w-10 h-10 text-gray-200 mx-auto stroke-1 mb-2" />
              <p className="text-sm text-gray-500 font-semibold">Belum Ada History Harga</p>
              <p className="text-xs text-gray-400 mt-1">Catat harga beli bahan baku untuk melihat grafik tren naik/turun.</p>
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
                            <div
                              className={`w-full rounded-t ${isDown ? 'bg-red-400' : isUp ? 'bg-emerald-400' : 'bg-blue-400'} transition-all`}
                              style={{ height: `${Math.max(8, height)}%`, minHeight: '8px' }}
                              title={`${p.date}: ${formatCurrency(p.hargaBeli)}`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {prices.length >= 2 && (
                    <div className="text-[10px] text-gray-500 flex justify-between">
                      <span>Rendah: {formatCurrency(Math.min(...prices.map(p => p.hargaBeli)))}</span>
                      <span>Tinggi: {formatCurrency(Math.max(...prices.map(p => p.hargaBeli)))}</span>
                      <span>Rata: {formatCurrency(Math.round(prices.reduce((s, p) => s + p.hargaBeli, 0) / prices.length))}</span>
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
                          className="text-gray-400 hover:text-red-600 cursor-pointer">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {records.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Belum ada record harga.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PREDIKSI & INFLASI */}
      <div className="border-t border-gray-150 pt-6 mt-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* INFLASI */}
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
              <div className="flex justify-between"><span>HPP Portofolio Awal:</span><span className="font-bold font-mono">{formatCurrency(rawPortfolioSum + overheadSum)}</span></div>
              <div className="flex justify-between text-red-700 font-bold border-t border-dashed pt-2"><span>HPP Setelah Inflasi (+{commodityInflation}%):</span><span className="font-mono">{formatCurrency(inflatedPortfolio)}</span></div>
              <div className="flex justify-between"><span>Margin Rata-rata:</span><span className={`font-mono font-bold ${inflatedMargin < 20 ? 'text-red-600' : 'text-emerald-700'}`}>{inflatedMargin.toFixed(1)}%</span></div>
            </div>
          </div>

          {/* PREDIKSI MUSIMAN */}
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
    </div>
  );
}
