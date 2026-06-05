import React, { useState } from 'react';
import { Calendar, Flame, Printer, RefreshCw, Plus, X, ShoppingCart, AlertTriangle } from 'lucide-react';
import { ProductHpp, DetailResep, BahanBaku } from '../types';

interface MpsTabProps {
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  bahanBaku: BahanBaku[];
}

export default function MpsTab({ productHpp, detailResep, bahanBaku }: MpsTabProps) {
  const [preOrders, setPreOrders] = useState<Record<string, number>>({});
  const [displayStock, setDisplayStock] = useState<Record<string, number>>({});
  const [showModal, setShowModal] = useState(false);
  const [modalProduct, setModalProduct] = useState('');
  const [modalPreOrder, setModalPreOrder] = useState('0');
  const [modalStock, setModalStock] = useState('0');
  const [modalQty, setModalQty] = useState('0');

  const getBakingRecommendation = (prodName: string) => {
    const orders = preOrders[prodName] || 0;
    const stock = displayStock[prodName] || 0;
    const target = orders - stock + 10;
    return target > 0 ? target : 0;
  };

  const openModal = (prodName: string) => {
    setModalProduct(prodName);
    setModalPreOrder(String(preOrders[prodName] || 0));
    setModalStock(String(displayStock[prodName] || 0));
    setModalQty('0');
    setShowModal(true);
  };

  const handleModalSubmit = () => {
    const po = parseInt(modalPreOrder) || 0;
    const st = parseInt(modalStock) || 0;
    setPreOrders(pv => ({ ...pv, [modalProduct]: po }));
    setDisplayStock(pv => ({ ...pv, [modalProduct]: st }));
    setShowModal(false);
  };

  const handleAutoCalculate = () => {
    const qty = parseInt(modalQty) || 0;
    if (qty <= 0) return;
    setModalPreOrder(String(qty));
    setModalStock('0');
  };

  // Hitung kebutuhan bahan baku dari target produksi
  const calculateMaterialNeeds = (prodName: string, targetQty: number) => {
    const resep = detailResep.filter(r => r.namaProduk === prodName);
    const needs: Record<string, number> = {};
    resep.forEach(r => {
      if (!needs[r.namaBahan]) needs[r.namaBahan] = 0;
      const prodInfo = productHpp.find(p => p.namaProduk === prodName);
      const yieldPorsi = prodInfo?.porsiJual || 1;
      needs[r.namaBahan] += (r.takaran / yieldPorsi) * targetQty;
    });
    return needs;
  };

  const getRecipeDetail = (prodName: string) => {
    return detailResep.filter(r => r.namaProduk === prodName);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-emerald-600" /> Jadwal Produksi (MPS)
          </h2>
          <p className="text-xs text-gray-500 mt-1">Rencanakan jumlah panggangan harian berdasarkan pre-order dan stok tersisa.</p>
        </div>
        <button onClick={() => {
          const printWin = window.open('', '_blank');
          if (!printWin) return;
          const rows = productHpp.map(p => {
            const rec = getBakingRecommendation(p.namaProduk);
            return `<tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:500;">${p.kode || ''} ${p.namaProduk}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${preOrders[p.namaProduk] || 0}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${displayStock[p.namaProduk] || 0}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;font-weight:bold;color:#059669;">${rec} porsi</td></tr>`;
          }).join('');
          printWin.document.write(`
            <html><head><title>Jadwal MPS</title>
            <style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:700px;margin:0 auto;padding:40px;color:#1f2937;}h1{font-size:22px;color:#065f46;}.meta{color:#6b7280;font-size:12px;margin-bottom:20px;}table{width:100%;border-collapse:collapse;}th{background:#f3f4f6;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;}td{padding:8px;border-bottom:1px solid #e5e7eb;}@media print{body{padding:20px;}}</style></head><body>
            <h1>📅 JADWAL PRODUKSI (MPS)</h1>
            <div class="meta">Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { year:'numeric',month:'long',day:'numeric' })}</div>
            <table><thead><tr><th>Produk</th><th style="text-align:right;">Pre-Order</th><th style="text-align:right;">Stok</th><th style="text-align:right;">Rekom. Oven</th></tr></thead><tbody>${rows}</tbody></table>
            <p style="margin-top:40px;text-align:center;color:#9ca3af;font-size:11px;">Near Bakery & Co. ERP — Jadwal MPS</p>
            <script>window.print();<\/script></body></html>
          `);
          printWin.document.close();
        }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0">
          <Printer className="w-3.5 h-3.5" /> Cetak
        </button>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex items-center gap-2 bg-amber-50 p-3 rounded-xl border border-amber-100 text-xs text-amber-900">
          <Flame className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Tim oven perlu membakar target hari ini agar etalase tidak kosong!</span>
        </div>

        <div className="space-y-4">
          {productHpp.map((p) => {
            const rec = getBakingRecommendation(p.namaProduk);
            const resep = getRecipeDetail(p.namaProduk);
            return (
              <div key={p.namaProduk} className="p-4 bg-gray-50 border border-gray-150 rounded-xl space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-mono font-bold text-gray-400">{p.kode || ''}</span>
                    <span className="text-sm font-bold text-gray-900 ml-1">{p.namaProduk}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-mono font-bold">
                      Stok: {displayStock[p.namaProduk] || 0} pcs
                    </span>
                    <button onClick={() => openModal(p.namaProduk)}
                      className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Atur
                    </button>
                  </div>
                </div>

                {/* Recipe preview */}
                {resep.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {resep.map((r, i) => {
                      const bahanInfo = bahanBaku.find(b => b.nama === r.namaBahan);
                      return (
                        <span key={i} className="text-[9px] bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-500">
                          {r.namaBahan}: {r.takaran}{bahanInfo?.satuan || 'gr'}
                        </span>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-between border-t border-gray-150 pt-2 text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Pre-Order: <strong className="font-mono text-gray-800">{preOrders[p.namaProduk] || 0}</strong></span>
                    <span className="text-gray-300">|</span>
                    <span className="text-gray-500">Stok: <strong className="font-mono text-gray-800">{displayStock[p.namaProduk] || 0}</strong></span>
                    <span className="text-gray-300">|</span>
                    <span className="text-emerald-700 font-mono font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-150">
                      Rekom: {rec} porsi
                    </span>
                  </div>
                  <button onClick={() => {
                    setPreOrders(pv => ({ ...pv, [p.namaProduk]: 0 }));
                    setDisplayStock(pv => ({ ...pv, [p.namaProduk]: 0 }));
                  }} className="text-gray-400 hover:text-red-600 p-1 cursor-pointer text-[10px] flex items-center gap-1" title="Reset">
                    <RefreshCw className="w-3 h-3" /> Reset
                  </button>
                </div>
              </div>
            );
          })}
          {productHpp.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-8">Belum ada produk. Buat resep dulu di tab Formulasi Resep.</p>
          )}
        </div>

        <button onClick={() => alert('Jadwal produksi dapur berhasil dikonfirmasi! Work order telah dibuat.')}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer">
          Rilis Lembar Kerja Dapur
        </button>
      </div>

      {/* MODAL POPUP seperti form bahan baku */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4.5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" /> Atur Produksi: {modalProduct}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 rounded-lg p-1 hover:bg-gray-100 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Detail resep */}
              {getRecipeDetail(modalProduct).length > 0 && (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <span className="text-[10px] uppercase font-bold text-gray-500 mb-1.5 block">Komposisi Resep</span>
                  <div className="space-y-1">
                    {getRecipeDetail(modalProduct).map((r, i) => {
                      const bahanInfo = bahanBaku.find(b => b.nama === r.namaBahan);
                      const kebutuhan = calculateMaterialNeeds(modalProduct, parseInt(modalPreOrder) || 0);
                      const totalBahan = kebutuhan[r.namaBahan] || 0;
                      return (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-gray-600">{r.namaBahan}</span>
                          <span className="font-mono font-bold text-gray-800">
                            {r.takaran}{bahanInfo?.satuan || 'gr'}/batch
                            {totalBahan > 0 && (
                              <span className="text-emerald-600 ml-2">×{modalPreOrder} = {(totalBahan).toFixed(0)}{bahanInfo?.satuan || 'gr'}</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Auto-calculate by qty */}
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <label className="block text-[10px] uppercase font-bold text-emerald-800 mb-1.5">Produksi Cepat — Masukkan jumlah yang ingin dibuat</label>
                <div className="flex gap-2">
                  <input type="number" min="1" value={modalQty} onChange={(e) => setModalQty(e.target.value)}
                    placeholder="Jumlah porsi"
                    className="flex-1 border border-emerald-200 rounded-lg p-2.5 text-sm font-mono font-bold bg-white" />
                  <button onClick={handleAutoCalculate}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
                    <ShoppingCart className="w-4 h-4" /> Atur Otomatis
                  </button>
                </div>
                <p className="text-[10px] text-emerald-700 mt-1">Klik "Atur Otomatis" untuk set Pre-Order & Stok berdasarkan jumlah produksi.</p>
              </div>

              {/* Manual input */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">Pre-Order</label>
                  <input type="number" min="0" value={modalPreOrder} onChange={(e) => setModalPreOrder(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 font-mono font-bold text-center" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">Stok Toko</label>
                  <input type="number" min="0" value={modalStock} onChange={(e) => setModalStock(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 font-mono font-bold text-center" />
                </div>
              </div>

              {/* Auto-calc result */}
              {(() => {
                const po = parseInt(modalPreOrder) || 0;
                const st = parseInt(modalStock) || 0;
                const rekom = po - st + 10;
                return (
                  <div className={`p-3 rounded-xl border text-xs ${rekom > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-700">Rekomendasi Oven:</span>
                      <span className={`font-mono font-black text-lg ${rekom > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {rekom > 0 ? rekom : 0} porsi
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Pre-Order ({po}) - Stok ({st}) + Safety Buffer (10)</p>
                  </div>
                );
              })()}

              {/* Kebutuhan bahan baku total */}
              {(() => {
                const po = parseInt(modalPreOrder) || 0;
                if (po <= 0) return null;
                const needs = calculateMaterialNeeds(modalProduct, po);
                const totalBiaya = Object.entries(needs).reduce((sum, [bahan, qty]) => {
                  const info = bahanBaku.find(b => b.nama === bahan);
                  return sum + (qty * (info?.hargaSatuan || 0));
                }, 0);
                return (
                  <div className="bg-slate-900 text-white p-3 rounded-xl text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Kebutuhan Bahan Baku ({po} porsi)</span>
                    {Object.entries(needs).map(([bahan, qty]) => {
                      const info = bahanBaku.find(b => b.nama === bahan);
                      const dalamKg = qty >= 1000;
                      return (
                        <div key={bahan} className="flex justify-between">
                          <span className="text-gray-300">{bahan}</span>
                          <span className="font-mono font-bold text-white">
                            {dalamKg ? `${(qty/1000).toFixed(1)} kg` : `${qty.toFixed(0)} ${info?.satuan || 'gr'}`}
                          </span>
                        </div>
                      );
                    })}
                    <div className="border-t border-slate-700 pt-1 flex justify-between font-bold">
                      <span className="text-emerald-400">Total Biaya Bahan:</span>
                      <span className="font-mono">{formatCurrency(totalBiaya)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition cursor-pointer">
                  Batal
                </button>
                <button onClick={handleModalSubmit}
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm transition cursor-pointer font-bold">
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
