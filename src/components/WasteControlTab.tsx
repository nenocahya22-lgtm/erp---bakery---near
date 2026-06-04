import React, { useState } from 'react';
import { Trash2, Plus, AlertTriangle, ShoppingCart } from 'lucide-react';
import { CalculationResult, WriteOffLog } from '../types';

interface WasteControlTabProps {
  bahanBaku: any[];
  wasteLogs: any[];
  onAddWasteLog: (log: any) => void;
  onDeleteWasteLog: (id: string) => void;
  calculatedProducts: CalculationResult[];
  onAddWriteOff: (log: WriteOffLog) => void;
  onDeleteWriteOff: (id: string) => void;
  writeOffLogs: WriteOffLog[];
}

export default function WasteControlTab({
  bahanBaku, wasteLogs, onAddWasteLog, onDeleteWasteLog,
  calculatedProducts, onAddWriteOff, onDeleteWriteOff, writeOffLogs
}: WasteControlTabProps) {
  const [selectedBahanIdx, setSelectedBahanIdx] = useState('0');
  const [wasteQty, setWasteQty] = useState('500');
  const [wasteLocation, setWasteLocation] = useState<'Gudang Utama' | 'Dapur Pusat' | 'Storefront / Kasir'>('Dapur Pusat');
  const [wasteReason, setWasteReason] = useState('');

  // Write-off states
  const [woProduct, setWoProduct] = useState('');
  const [woQty, setWoQty] = useState('1');
  const [woReason, setWoReason] = useState('');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const handleLogWasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bahanBaku.length === 0) return;
    const mat = bahanBaku[parseInt(selectedBahanIdx)];
    if (!mat) return;
    const qty = parseFloat(wasteQty) || 0;
    if (qty <= 0) return;
    const lossValue = Math.round(qty * mat.hargaSatuan);
    onAddWasteLog({
      id: `w-${Date.now()}`,
      bahanNama: mat.nama,
      qtyWasted: qty,
      satuan: mat.satuan,
      lossValue,
      location: wasteLocation,
      reason: wasteReason.trim() || 'Wastage standar',
      dateLogged: new Date().toISOString().substring(0, 10)
    });
    setWasteQty('500'); setWasteReason('');
  };

  const handleAddWriteOff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!woProduct) return;
    const qty = parseInt(woQty) || 1;
    const prod = calculatedProducts.find(p => p.namaProduk === woProduct);
    const lossValue = prod ? Math.round(prod.hppPerPorsi * qty * 0.8) : qty * 5000;
    onAddWriteOff({
      id: `wo-${Date.now()}`,
      namaProduk: woProduct,
      qtyUnsold: qty,
      lossValue,
      reason: woReason.trim() || 'Tidak terjual hari ini',
      dateLogged: new Date().toISOString().substring(0, 10)
    });
    setWoProduct(''); setWoQty('1'); setWoReason('');
  };

  const totalWasteLoss = wasteLogs.reduce((acc: number, curr: any) => acc + curr.lossValue, 0);
  const totalWriteOffLoss = writeOffLogs.reduce((acc, curr) => acc + curr.lossValue, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-rose-500" /> Manajemen Waste & Write-off
          </h2>
          <p className="text-xs text-gray-500 mt-1">Catat bahan rusak, adonan gagal, dan roti tidak terjual untuk hitung laba bersih riil.</p>
        </div>
        <div className="text-right text-xs bg-rose-50 text-rose-800 border border-rose-100 font-extrabold px-3 py-1.5 rounded-xl font-mono">
          Total Kerugian: {formatCurrency(totalWasteLoss + totalWriteOffLoss)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KIRI: Waste Bahan Baku */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <Trash2 className="w-4 h-4 text-rose-600" /> Catat Bahan Baku Rusak
          </h3>
          <form onSubmit={handleLogWasteSubmit} className="space-y-3 text-xs">
            <select value={selectedBahanIdx} onChange={(e) => setSelectedBahanIdx(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
              {bahanBaku.map((b: any, idx: number) => (
                <option key={b.nama} value={idx}>{b.nama} ({b.satuan})</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" required value={wasteQty} onChange={(e) => setWasteQty(e.target.value)}
                className="border border-gray-200 rounded-lg p-2 font-mono" placeholder="Qty" />
              <select value={wasteLocation} onChange={(e) => setWasteLocation(e.target.value as any)}
                className="border border-gray-200 rounded-lg p-2">
                <option>Dapur Pusat</option><option>Gudang Utama</option><option>Storefront / Kasir</option>
              </select>
            </div>
            <input type="text" placeholder="Alasan kerusakan" required value={wasteReason}
              onChange={(e) => setWasteReason(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2" />
            <button type="submit"
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer">
              Simpan Waste
            </button>
          </form>

          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {wasteLogs.map((log: any) => (
              <div key={log.id} className="bg-rose-50 p-3 rounded-lg border border-rose-100 flex justify-between text-xs">
                <div><span className="font-bold">{log.bahanNama}</span> — {log.reason}</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-red-600 font-bold">-{formatCurrency(log.lossValue)}</span>
                  <button onClick={() => onDeleteWasteLog(log.id)} className="text-gray-400 hover:text-red-600 cursor-pointer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KANAN: Write-off Produk Jadi */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <ShoppingCart className="w-4 h-4 text-amber-600" /> Catat Produk Tidak Terjual
          </h3>
          <p className="text-xs text-gray-500">Roti/kue yang tidak laku di etalase hari ini. Penting untuk hitung laba bersih riil.</p>

          <form onSubmit={handleAddWriteOff} className="space-y-3 text-xs">
            <select required value={woProduct} onChange={(e) => setWoProduct(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
              <option value="">-- Pilih Produk --</option>
              {calculatedProducts.map(p => (
                <option key={p.namaProduk} value={p.namaProduk}>{p.namaProduk}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" required min="1" value={woQty} onChange={(e) => setWoQty(e.target.value)}
                className="border border-gray-200 rounded-lg p-2 font-mono" placeholder="Jumlah tidak laku" />
              <div className="flex items-center bg-amber-50 rounded-lg px-3 text-[10px] font-bold text-amber-800">
                Estimasi rugi: {formatCurrency(
                  (calculatedProducts.find(p => p.namaProduk === woProduct)?.hppPerPorsi || 5000) * (parseInt(woQty) || 1) * 0.8
                )}
              </div>
            </div>
            <input type="text" placeholder="Alasan (misal: stok terlalu banyak)" value={woReason}
              onChange={(e) => setWoReason(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2" />
            <button type="submit"
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer">
              Catat Write-off
            </button>
          </form>

          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {writeOffLogs.map((log) => (
              <div key={log.id} className="bg-amber-50 p-3 rounded-lg border border-amber-100 flex justify-between text-xs">
                <div><span className="font-bold">{log.namaProduk}</span> — {log.qtyUnsold} pcs — {log.reason}</div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-amber-700 font-bold">-{formatCurrency(log.lossValue)}</span>
                  <button onClick={() => onDeleteWriteOff(log.id)} className="text-gray-400 hover:text-red-600 cursor-pointer">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            {writeOffLogs.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Belum ada write-off hari ini.</p>
            )}
          </div>

          <div className="bg-slate-50 p-3 rounded-lg text-xs">
            <span className="font-bold">Total Write-off: {formatCurrency(totalWriteOffLoss)}</span>
            <span className="text-gray-500 ml-3">| Waste Bahan: {formatCurrency(totalWasteLoss)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
