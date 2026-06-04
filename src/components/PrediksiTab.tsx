import React, { useState } from 'react';
import { Sparkles, Sun, CloudRain, Calendar, Sliders } from 'lucide-react';
import { CalculationResult } from '../types';

interface PrediksiTabProps {
  calculatedProducts: CalculationResult[];
}

export default function PrediksiTab({ calculatedProducts }: PrediksiTabProps) {
  const [commodityInflation, setCommodityInflation] = useState(0);
  const [currentSeason, setCurrentSeason] = useState<'Normal' | 'Rainy' | 'Holiday'>('Normal');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

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
      case 'Holiday': return { effect: '🎄 Liburan → Pre-Order (+45%)', tip: 'Amankan stok Mentega 200 kg! Tambah shift baker malam.' };
      default: return { effect: '☀️ Cuaca Normal → Penjualan Stabil', tip: 'Pertahankan produksi MPS reguler.' };
    }
  };

  const forecast = getForecast();

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-emerald-600" /> Prediksi BI & Simulasi Inflasi
        </h2>
        <p className="text-xs text-gray-500 mt-1">Simulasi kenaikan harga bahan baku dan prediksi musiman untuk antisipasi bisnis.</p>
      </div>

      {/* INFLASI */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
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

      {/* FORECAST */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-emerald-600" /> Prediksi Musiman AI
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
  );
}
