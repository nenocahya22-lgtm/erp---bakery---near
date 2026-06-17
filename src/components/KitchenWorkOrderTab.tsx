import React, { useState } from 'react';
import { ClipboardList, Printer, Scale, ChevronRight, Package, DollarSign, FileText } from 'lucide-react';
import { ProductHpp, DetailResep, CalculationResult, BahanBaku } from '../types';

interface KitchenWorkOrderTabProps {
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
}

export default function KitchenWorkOrderTab({
  productHpp, detailResep, calculatedProducts, bahanBaku
}: KitchenWorkOrderTabProps) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [batchMultiplier, setBatchMultiplier] = useState(1);
  const [orderNotes, setOrderNotes] = useState('');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const product = productHpp.find(p => p.namaProduk === selectedProduct);
  const calcProduct = calculatedProducts.find(p => p.namaProduk === selectedProduct);
  const resep = detailResep.filter(r => r.namaProduk === selectedProduct);
  const scaledResep = resep.map(r => ({
    ...r,
    scaleTakaran: r.takaran * batchMultiplier,
  }));

  const totalBatchCost = scaledResep.reduce((sum, r) => {
    const bahan = bahanBaku.find(b => b.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim());
    const hargaSatuan = bahan?.hargaSatuan || 0;
    return sum + (r.scaleTakaran * hargaSatuan);
  }, 0);

  const totalBatchHpp = totalBatchCost;
  const totalOutput = (product?.porsiJual || 1) * batchMultiplier;
  const costPerUnit = totalOutput > 0 ? totalBatchHpp / totalOutput : 0;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dateStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const ingredientRows = scaledResep.map(r => {
      const bahan = bahanBaku.find(b => b.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim());
      const dalamKg = r.scaleTakaran >= 1000;
      return `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:500;">${r.namaBahan}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">
            ${dalamKg ? (r.scaleTakaran / 1000).toFixed(2) : r.scaleTakaran.toFixed(0)}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">
            ${dalamKg ? 'kg' : (bahan?.satuan || 'gr')}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">
            ${formatCurrency(r.scaleTakaran * (bahan?.hargaSatuan || 0))}
          </td>
        </tr>`;
    }).join('');

    printWindow.document.write(`
      <html><head>
        <title>Work Order - ${selectedProduct}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px; color: #1f2937; }
          h1 { font-size: 22px; margin-bottom: 4px; }
          .meta { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
          .footer { margin-top: 24px; padding-top: 16px; border-top: 2px solid #d1d5db; font-size: 13px; }
          .total-row { background: #f0fdf4; font-weight: bold; }
          .notes { margin-top: 20px; padding: 12px; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 12px; }
          @media print { body { padding: 0; margin: 0; } }
        </style>
      </head><body>
        <h1>🧾 Kitchen Work Order</h1>
        <div class="meta">
          <strong>Produk:</strong> ${selectedProduct} &nbsp;|&nbsp;
          <strong>Batch:</strong> ${batchMultiplier}x &nbsp;|&nbsp;
          <strong>Tanggal:</strong> ${dateStr} &nbsp;|&nbsp;
          <strong>Target Output:</strong> ${totalOutput} porsi
        </div>
        <table>
          <thead>
            <tr><th>Bahan</th><th style="text-align:right;">Jumlah</th><th style="text-align:center;">Satuan</th><th style="text-align:right;">Biaya</th></tr>
          </thead>
          <tbody>
            ${ingredientRows}                      <tr class="total-row">
              <td style="padding:10px 12px;font-weight:bold;">TOTAL BATCH</td>
              <td style="padding:10px 12px;text-align:right;"></td>
              <td style="padding:10px 12px;text-align:center;">${totalOutput} porsi</td>
              <td style="padding:10px 12px;text-align:right;font-family:monospace;font-size:15px;">${formatCurrency(totalBatchHpp)}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <div>Cost per porsi: <strong>${formatCurrency(costPerUnit)}</strong></div>
          <div>Serving price: <strong>${formatCurrency(product?.hargaJual || 0)}</strong></div>
          ${product && product.hargaJual > 0 ? `<div>Est. revenue: <strong>${formatCurrency(product.hargaJual * batchMultiplier)}</strong></div>` : ''}
        </div>
        ${orderNotes ? `<div class="notes"><strong>📝 Catatan:</strong><br>${orderNotes}</div>` : ''}
        <p style="margin-top:40px; text-align:center; color:#9ca3af; font-size:11px;">
          Near Bakery & Co. ERP — Work Order System
        </p>
        <script>window.print();<\/script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-emerald-600" /> Batch Scale & Kitchen Work Order
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Skalakan resep berdasarkan jumlah loyang/batch, dapatkan lembar panduan takaran bahan untuk kru dapur.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KIRI: Kontrol Batch */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-50 pb-2 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-emerald-600" /> Batch Control
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Pilih Produk</label>
              <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
                <option value="">-- Pilih Produk --</option>
                {productHpp.filter(p => p.status !== 'draft').map(p => (
                  <option key={p.namaProduk} value={p.namaProduk}>{p.namaProduk}</option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                    Multiplier Batch: <span className="text-emerald-700 font-mono font-bold">{batchMultiplier}x</span>
                  </label>
                  <input type="range" min="0.5" max="50" step="0.5" value={batchMultiplier}
                    onChange={(e) => setBatchMultiplier(parseFloat(e.target.value))}
                    className="w-full accent-emerald-600" />
                  <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                    <span>0.5x</span><span>10x</span><span>25x</span><span>50x</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Catatan Dapur</label>
                  <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Contoh: Gunakan mixer speed 2, panggang 25 menit..."
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-xs h-20 resize-none" />
                </div>

                <button onClick={handlePrint}
                  disabled={!selectedProduct}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5">
                  <Printer className="w-4 h-4" /> Cetak Work Order
                </button>
              </>
            )}
          </div>

          {selectedProduct && (
            <div className="bg-slate-50 p-3 rounded-xl border border-gray-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Resep Standar:</span>
                <span className="font-bold">{resep.length} bahan</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Output Standar:</span>
                <span className="font-bold">{product?.porsiJual || 0} porsi</span>
              </div>
              <div className="flex justify-between border-t border-gray-200/50 pt-1.5 text-emerald-800 font-bold">
                <span>Output Batch:</span>
                <span className="font-mono">{totalOutput} porsi</span>
              </div>
            </div>
          )}
        </div>

        {/* KANAN: Work Order Sheet */}
        <div className="lg:col-span-8 space-y-4">
          {!selectedProduct ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 shadow-xs flex flex-col items-center justify-center text-center">
              <ClipboardList className="w-12 h-12 text-gray-200 stroke-1 mb-3" />
              <p className="text-sm text-gray-500 font-semibold">Pilih Produk</p>
              <p className="text-xs text-gray-400 mt-1">Pilih produk dan atur multiplier batch untuk melihat work order.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              {/* Header Work Order */}
              <div className="bg-gradient-to-r from-emerald-950 to-slate-950 text-white p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-black tracking-wider uppercase flex items-center gap-2">
                      <FileText className="w-5 h-5 text-emerald-400" /> Work Order #{selectedProduct.slice(0, 3).toUpperCase()}-{Date.now().toString().slice(-4)}
                    </h3>
                    <p className="text-[10px] text-emerald-300/70 mt-0.5 font-mono">
                      {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <button onClick={handlePrint}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold rounded-lg border border-white/20 transition cursor-pointer flex items-center gap-1.5">
                    <Printer className="w-3.5 h-3.5" /> Cetak
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-4 text-[10px]">
                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                    <span className="text-emerald-300/60 block uppercase font-bold">Batch Size</span>
                    <span className="text-lg font-black font-mono text-white">{batchMultiplier}x</span>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                    <span className="text-emerald-300/60 block uppercase font-bold">Target Output</span>
                    <span className="text-lg font-black font-mono text-white">{totalOutput}</span>
                    <span className="text-emerald-300/50 text-[9px]">porsi</span>
                  </div>
                  <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                    <span className="text-emerald-300/60 block uppercase font-bold">Est. Biaya Batch</span>
                    <span className="text-lg font-black font-mono text-white">{formatCurrency(totalBatchHpp)}</span>
                  </div>
                </div>
              </div>

              {/* Tabel Bahan */}
              <div className="p-5">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3">
                  <Package className="w-3.5 h-3.5 inline text-emerald-600 mr-1" /> Takaran Bahan — <span className="text-emerald-600">{batchMultiplier}x Resep</span>
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50">
                        <th className="px-4 py-2.5 rounded-l-lg">Bahan</th>
                        <th className="px-4 py-2.5 text-right">Takaran Standar</th>
                        <th className="px-4 py-2.5 text-right">×{batchMultiplier}</th>
                        <th className="px-4 py-2.5 text-center">Satuan</th>
                        <th className="px-4 py-2.5 text-right rounded-r-lg">Biaya</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {scaledResep.map((r, i) => {
                        const bahan = bahanBaku.find(b => b.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim());
                        const dalamKg = r.scaleTakaran >= 1000;
                        return (
                          <tr key={i} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-semibold text-gray-800">{r.namaBahan}</td>
                            <td className="px-4 py-3 text-right font-mono text-gray-500">{r.takaran} gr</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-gray-900">
                              {dalamKg ? (r.scaleTakaran / 1000).toFixed(2) : r.scaleTakaran.toFixed(0)}
                            </td>
                            <td className="px-4 py-3 text-center font-medium text-gray-500">
                              {dalamKg ? 'kg' : (bahan?.satuan || 'gr')}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-700">
                              {formatCurrency(r.scaleTakaran * (bahan?.hargaSatuan || 0))}
                            </td>
                          </tr>
                        );
                      })}

                    </tbody>
                  </table>
                </div>

                {/* Footer Summary */}
                <div className="mt-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Bahan</span>
                      <span className="font-mono font-black text-gray-900 text-sm">{formatCurrency(totalBatchCost)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">HPP Batch</span>
                      <span className="font-mono font-black text-emerald-800 text-sm">{formatCurrency(totalBatchHpp)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Cost / Porsi</span>
                      <span className="font-mono font-black text-emerald-800 text-sm">{formatCurrency(costPerUnit)}</span>
                    </div>
                  </div>
                </div>

                {orderNotes && (
                  <div className="mt-3 bg-amber-50 p-3 rounded-xl border border-amber-100 text-xs">
                    <span className="font-bold text-amber-800 block mb-1">📝 Catatan Dapur:</span>
                    <span className="text-amber-700 whitespace-pre-wrap">{orderNotes}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
