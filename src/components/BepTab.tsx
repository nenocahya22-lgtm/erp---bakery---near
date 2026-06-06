import React, { useState } from 'react';
import { BarChart3, Info, TrendingDown, CheckCircle2 } from 'lucide-react';
import { CalculationResult, WasteLog } from '../types';

interface BepTabProps {
  calculatedProducts: CalculationResult[];
}

export default function BepTab({ calculatedProducts }: BepTabProps) {
  const [monthlyOverhead, setMonthlyOverhead] = useState(0);
  const [gajiKaryawan, setGajiKaryawan] = useState(0);
  const [sewaRuko, setSewaRuko] = useState(0);
  const [listrikGas, setListrikGas] = useState(0);

  const totalFixedCosts = [monthlyOverhead, gajiKaryawan, sewaRuko, listrikGas].reduce((a, b) => a + b, 0);

  // Data REAL dari calculatedProducts
  const validProducts = calculatedProducts.filter(p => p.hppPerPorsi > 0 && p.hargaJualPerPorsi > 0);
  const avgMarginPct = validProducts.length > 0
    ? validProducts.reduce((s, p) => s + p.marginPersen, 0) / validProducts.length
    : 0;
  const avgRevenuePerUnit = validProducts.length > 0
    ? validProducts.reduce((s, p) => s + p.hargaJualPerPorsi, 0) / validProducts.length
    : 0;
  const avgHppPerUnit = validProducts.length > 0
    ? validProducts.reduce((s, p) => s + p.hppPerPorsi, 0) / validProducts.length
    : 0;
  const avgProfitPerUnit = avgRevenuePerUnit - avgHppPerUnit;

  const bepUnits = avgProfitPerUnit > 0 ? Math.ceil(totalFixedCosts / avgProfitPerUnit) : 0;
  const bepRevenue = bepUnits * avgRevenuePerUnit;
  const dailyTarget = Math.ceil(bepUnits / 25);
  const dailyRevenue = dailyTarget * avgRevenuePerUnit;

  const volumeScenarios = [50, 100, 200, 300, 500].map(vol => ({
    volume: vol,
    revenue: vol * avgRevenuePerUnit,
    cost: totalFixedCosts + (vol * avgHppPerUnit),
    profit: (vol * avgProfitPerUnit) - totalFixedCosts,
  }));

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-600" /> Break-Even Point & Balance Keuangan
        </h2>
        <p className="text-xs text-gray-500 mt-1">Hitung BEP dari data HPP real — isi biaya tetap bulanan Anda (mulai dari Rp 0, tanpa dummy).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KIRI: Input Biaya Tetap */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2">Biaya Tetap Bulanan (Fixed Costs)</h3>
          
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Sewa Ruko/Tempat</label>
              <input type="number" value={sewaRuko} onChange={(e) => setSewaRuko(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-lg p-2.5 font-mono font-bold" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Gaji Karyawan</label>
              <input type="number" value={gajiKaryawan} onChange={(e) => setGajiKaryawan(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-lg p-2.5 font-mono font-bold" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Listrik & Gas</label>
              <input type="number" value={listrikGas} onChange={(e) => setListrikGas(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-lg p-2.5 font-mono font-bold" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Biaya Ops Lainnya</label>
              <input type="number" value={monthlyOverhead} onChange={(e) => setMonthlyOverhead(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-200 rounded-lg p-2.5 font-mono font-bold" />
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
              <div className="flex justify-between font-bold text-gray-900">
                <span>Total Fixed Cost/Bulan</span>
                <span className="font-mono text-red-700">{formatCurrency(totalFixedCosts)}</span>
              </div>
            </div>

            {/* Data dari HPP real */}
            <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs space-y-1">
              <span className="font-bold text-blue-800 block">📊 Data HPP Real — {validProducts.length} produk</span>
              {validProducts.length > 0 ? (
                <>
                  <div className="flex justify-between"><span className="text-blue-600">Rata-rata Harga Jual:</span><span className="font-mono font-bold">{formatCurrency(avgRevenuePerUnit)}</span></div>
                  <div className="flex justify-between"><span className="text-blue-600">Rata-rata HPP:</span><span className="font-mono font-bold">{formatCurrency(avgHppPerUnit)}</span></div>
                  <div className="flex justify-between"><span className="text-blue-600">Laba per Porsi:</span><span className={`font-mono font-bold ${avgProfitPerUnit > 0 ? 'text-emerald-700' : 'text-red-600'}`}>{formatCurrency(avgProfitPerUnit)}</span></div>
                  <div className="flex justify-between"><span className="text-blue-600">Rata-rata Margin:</span><span className="font-mono font-bold">{avgMarginPct.toFixed(1)}%</span></div>
                </>
              ) : (
                <p className="text-blue-600">Belum ada produk dengan HPP valid. Tambah resep dulu.</p>
              )}
            </div>
          </div>
        </div>

        {/* KANAN: Hasil BEP */}
        <div className="lg:col-span-8 space-y-4">
          {totalFixedCosts === 0 ? (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 text-center">
              <Info className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-amber-800">Isi Biaya Tetap Dulu</p>
              <p className="text-xs text-amber-700 mt-1">Masukkan biaya tetap bulanan Anda di kolom kiri untuk melihat perhitungan BEP real.</p>
            </div>
          ) : validProducts.length === 0 ? (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 text-center">
              <Info className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-amber-800">Belum Ada Data HPP</p>
              <p className="text-xs text-amber-700 mt-1">Tambah resep produk dan atur harga jual untuk melihat perhitungan BEP.</p>
            </div>
          ) : (
            <>
              {/* BEP Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400">BEP (Unit)</span>
                  <span className="block font-mono font-black text-2xl text-emerald-700">{bepUnits.toLocaleString()}</span>
                  <span className="text-[9px] text-gray-400">porsi/bulan</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400">BEP (Revenue)</span>
                  <span className="block font-mono font-black text-lg text-blue-700">{formatCurrency(bepRevenue)}</span>
                  <span className="text-[9px] text-gray-400">/bulan</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Target Harian</span>
                  <span className="block font-mono font-black text-2xl text-amber-700">{dailyTarget}</span>
                  <span className="text-[9px] text-gray-400">porsi/hari (25 hari)</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Revenue Harian</span>
                  <span className="block font-mono font-black text-lg text-amber-700">{formatCurrency(dailyRevenue)}</span>
                  <span className="text-[9px] text-gray-400">target minimal</span>
                </div>
              </div>

              {/* Scenario Table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                <div className="p-4 bg-gray-50 border-b border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Skenario Volume Produksi</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50/50">
                        <th className="px-4 py-3">Volume (porsi/bulan)</th>
                        <th className="px-4 py-3 text-right">Revenue</th>
                        <th className="px-4 py-3 text-right">Total Biaya</th>
                        <th className="px-4 py-3 text-right">Laba/Rugi</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {volumeScenarios.map((s, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-semibold">{s.volume.toLocaleString()} pcs</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrency(s.revenue)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatCurrency(s.cost)}</td>
                          <td className={`px-4 py-3 text-right font-mono font-bold ${s.profit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            {s.profit >= 0 ? '+' : ''}{formatCurrency(s.profit)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {s.volume >= bepUnits ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-bold text-[9px]"><CheckCircle2 className="w-2.5 h-2.5 inline" /> Untung</span>
                            ) : (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold text-[9px]"><TrendingDown className="w-2.5 h-2.5 inline" /> Rugi</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs text-emerald-800">
                <span className="font-bold block mb-1">💡 Bagaimana membaca BEP?</span>
                <span>BEP adalah titik di mana total pendapatan = total biaya. Jika Anda menjual <strong>{bepUnits.toLocaleString()} porsi/bulan</strong> (≈{dailyTarget} porsi/hari), bisnis Anda impas — tidak rugi, tidak untung. Di atas angka itu = profit.</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
