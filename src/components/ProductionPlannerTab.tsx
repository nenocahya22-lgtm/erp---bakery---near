import React, { useState } from 'react';
import { ShoppingCart, ArrowRight, Package } from 'lucide-react';
import { ProductHpp, DetailResep, CalculationResult, SATUAN_OPTIONS } from '../types';

interface ProductionPlannerTabProps {
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  calculatedProducts: CalculationResult[];
  bahanBaku: any[];
}

// Konversi ke satuan beli umum untuk memudahkan tim pengadaan
const PURCHASE_UNITS: Record<string, { label: string; gramEquivalent: number }[]> = {
  'karung': [{ label: 'karung @25kg', gramEquivalent: 25000 }, { label: 'karung @50kg', gramEquivalent: 50000 }],
  'pack': [{ label: 'pack @1kg', gramEquivalent: 1000 }, { label: 'pack @500gr', gramEquivalent: 500 }],
  'krat': [{ label: 'krat @30pcs', gramEquivalent: 30 }],
  'box': [{ label: 'box @10kg', gramEquivalent: 10000 }, { label: 'box @5kg', gramEquivalent: 5000 }],
  'dus': [{ label: 'dus @12pcs', gramEquivalent: 12 }, { label: 'dus @24pcs', gramEquivalent: 24 }],
};
const DEFAULT_PURCHASE_UNITS = [
  { label: 'kg', gramEquivalent: 1000 },
  { label: 'karung @25kg', gramEquivalent: 25000 },
  { label: 'pack @1kg', gramEquivalent: 1000 },
];

interface PurchaseConversion {
  qty: number;
  label: string;
  sisa: number; // sisa gram yang tidak genap
}

function getPurchaseConversions(totalGram: number, bahanSatuan: string): PurchaseConversion[] {
  if (bahanSatuan === 'pcs' || bahanSatuan === 'ekor') {
    return [{ qty: Math.round(totalGram), label: bahanSatuan, sisa: 0 }];
  }
  if (bahanSatuan === 'liter' || bahanSatuan === 'ml') {
    const liter = bahanSatuan === 'ml' ? totalGram / 1000 : totalGram;
    return [{ qty: Math.round(liter * 10) / 10, label: 'liter', sisa: 0 }];
  }

  const candidates = PURCHASE_UNITS[bahanSatuan] || DEFAULT_PURCHASE_UNITS;
  const results: PurchaseConversion[] = [];
  let sisa = Math.round(totalGram);

  for (const unit of candidates.sort((a, b) => b.gramEquivalent - a.gramEquivalent)) {
    if (sisa >= unit.gramEquivalent) {
      const qty = Math.floor(sisa / unit.gramEquivalent);
      results.push({ qty, label: unit.label, sisa: sisa - qty * unit.gramEquivalent });
      sisa = sisa - qty * unit.gramEquivalent;
    }
  }
  if (sisa > 0 && results.length === 0) {
    results.push({ qty: Math.round(sisa * 10) / 10, label: 'gram', sisa: 0 });
  } else if (sisa > 0) {
    results.push({ qty: Math.round(sisa * 10) / 10, label: 'gram', sisa: 0 });
  }
  return results;
}

export default function ProductionPlannerTab({ productHpp, detailResep, calculatedProducts, bahanBaku }: ProductionPlannerTabProps) {
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [targetSatuans, setTargetSatuans] = useState<Record<string, string>>({});

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  // Hitung kebutuhan bahan baku total berdasarkan target produksi
  const calculateNeeds = () => {
    const needs: Record<string, { total: number; satuan: string; hargaTotal: number; perProduk: { nama: string; qty: number }[]; stokTersedia: number; kebutuhanBersih: number }> = {};

    Object.entries(targets).forEach(([prodName, val]) => {
      const prodQty = val as number;
      if (!prodQty || prodQty <= 0) return;
      const resep = detailResep.filter(r => r.namaProduk === prodName);

      resep.forEach(r => {
        const totalQty = r.takaran * prodQty;
        const bahanInfo = bahanBaku.find(b => b.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim());
        const hargaSatuan = bahanInfo?.hargaSatuan || 0;

        if (!needs[r.namaBahan]) {
          needs[r.namaBahan] = { total: 0, satuan: 'gr', hargaTotal: 0, perProduk: [], stokTersedia: 0, kebutuhanBersih: 0 };
        }
        if (bahanInfo?.satuan) needs[r.namaBahan].satuan = bahanInfo.satuan;
        if (!needs[r.namaBahan].stokTersedia) {
          needs[r.namaBahan].stokTersedia = bahanInfo?.isiKemasan || 0;
        }
        needs[r.namaBahan].total += totalQty;
        needs[r.namaBahan].hargaTotal += totalQty * hargaSatuan;
        needs[r.namaBahan].perProduk.push({ nama: prodName, qty: Math.round(totalQty * 10) / 10 });
      });
    });

    // Hitung kebutuhan bersih (setelah dikurangi stok)
    Object.keys(needs).forEach(key => {
      needs[key].kebutuhanBersih = Math.max(0, needs[key].total - needs[key].stokTersedia);
    });

    return needs;
  };

  const needs = calculateNeeds();
  const totalHargaBahan = Object.values(needs).reduce((sum, n) => sum + n.hargaTotal, 0);
  const totalBersihGram = Object.values(needs).reduce((sum, n) => sum + n.kebutuhanBersih, 0);
  const totalHargaBersih = Object.values(needs).reduce((sum, n) => {
    if (n.total <= 0) return sum;
    return sum + (n.kebutuhanBersih / n.total) * n.hargaTotal;
  }, 0);

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
            {productHpp.filter(p => p.status !== 'draft').map(p => (
              <div key={p.namaProduk} className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{p.namaProduk}</span>
                <input type="number" min="0" value={targets[p.namaProduk] || ''}
                  onChange={(e) => setTargets(prev => ({ ...prev, [p.namaProduk]: parseInt(e.target.value) || 0 }))}
                  className="w-20 border border-gray-200 rounded-lg p-2 text-xs font-mono font-bold text-center"
                  placeholder="0" />
                <select value={targetSatuans[p.namaProduk] || 'pcs'}
                onChange={e => setTargetSatuans(prev => ({ ...prev, [p.namaProduk]: e.target.value }))}
                className="text-[10px] border border-gray-200 rounded-lg px-1.5 py-1.5 font-bold bg-white min-w-[55px] text-center">
                {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              </div>
            ))}
            {productHpp.filter(p => p.status !== 'draft').length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Belum ada produk. Buat resep dulu.</p>
            )}
          </div>

          {productHpp.filter(p => p.status !== 'draft').length > 0 && (
            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-xs space-y-1">
              <div className="flex justify-between font-bold text-emerald-800">
                <span>Total Produk Diproduksi:</span>
                <span>{Object.values(targets).reduce((a, b) => (a as number) + (b as number), 0)} pcs</span>
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
                const kekuranganStok = data.stokTersedia < data.total;
                const conversions = getPurchaseConversions(data.total, data.satuan);
                const bersihConversions = getPurchaseConversions(data.kebutuhanBersih, data.satuan);
                return (
                  <div key={bahan} className={`p-4 rounded-xl border ${kekuranganStok ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-150'}`}>
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <span className="font-bold text-gray-900 text-sm">{bahan}</span>
                        <span className="text-xs text-gray-400 ml-2">
                          {dalamKg ? `${(data.total / 1000).toFixed(1)} kg` : `${Math.round(data.total)} ${data.satuan}`}
                        </span>
                        {kekuranganStok && (
                          <span className="text-[9px] text-red-500 ml-2 font-bold">⚠️ Stok kurang</span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-emerald-800 text-xs">{formatCurrency(data.hargaTotal)}</span>
                    </div>

                    {/* Stok & Kebutuhan Bersih */}
                    <div className="mt-1.5 flex items-center gap-2 text-[10px]">
                      <span className="text-gray-500">Stok: <strong>{data.stokTersedia > 0 ? `${Math.round(data.stokTersedia)} ${data.satuan}` : '0'}</strong></span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500">Kebutuhan: <strong>{Math.round(data.total)} {data.satuan}</strong></span>
                      {kekuranganStok && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span className="text-red-600 font-bold">Beli: <strong>{Math.round(data.kebutuhanBersih)} {data.satuan}</strong></span>
                        </>
                      )}
                      {!kekuranganStok && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span className="text-emerald-600 font-bold">Stok cukup ✅</span>
                        </>
                      )}
                    </div>

                    {/* Konversi Satuan Belanja */}
                    {kekuranganStok && bersihConversions.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mr-0.5 self-center">Beli:</span>
                        {bersihConversions.map((conv, ci) => (
                          <span key={ci} className="text-[9px] bg-emerald-100 border border-emerald-200 rounded px-1.5 py-0.5 text-emerald-800 font-bold">
                            {conv.qty} {conv.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Konversi total (informasi) */}
                    {conversions.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        <span className="text-[8px] text-gray-400 uppercase tracking-wider mr-0.5 self-center">≈</span>
                        {conversions.map((conv, ci) => (
                          <span key={ci} className="text-[9px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-500">
                            {conv.qty} {conv.label}
                          </span>
                        ))}
                      </div>
                    )}

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

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-xs space-y-1">
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>Total Kebutuhan Kotor:</span>
                  <span className="font-mono">{formatCurrency(totalHargaBahan)}</span>
                </div>
                <div className="flex justify-between font-bold text-emerald-800">
                  <span>Total Kebutuhan Bersih (setelah stok):</span>
                  <span className="font-mono">{formatCurrency(totalHargaBersih)}</span>
                </div>
                <p className="text-[10px] text-emerald-600 mt-1">
                  ✅ Stok tersedia sudah dikurangi. Angka <strong>"Beli"</strong> = jumlah yang perlu dipesan ke supplier.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
