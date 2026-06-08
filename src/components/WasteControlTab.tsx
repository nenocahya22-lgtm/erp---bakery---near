import React, { useState, useRef } from 'react';
import { Trash2, Plus, AlertTriangle, ShoppingCart, Camera, Printer, X } from 'lucide-react';
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
  const [wastePhoto, setWastePhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Write-off states
  const [woProduct, setWoProduct] = useState('');
  const [woQty, setWoQty] = useState('1');
  const [woReason, setWoReason] = useState('');
  const [woPhoto, setWoPhoto] = useState<string | null>(null);
  const woFileInputRef = useRef<HTMLInputElement>(null);

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
      dateLogged: new Date().toISOString().substring(0, 10),
      photo: wastePhoto
    });
    setWasteQty('500'); setWasteReason(''); setWastePhoto(null);
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
    setWoProduct(''); setWoQty('1'); setWoReason(''); setWoPhoto(null);
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
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const printWin = window.open('', '_blank');
            if (!printWin) return;
            const wasteRows = wasteLogs.map((log: any) => `
              <tr><td style="padding:8px;border-bottom:1px solid #eee;">${log.dateLogged}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:500;">${log.bahanNama}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${log.qtyWasted} ${log.satuan}</td><td style="padding:8px;border-bottom:1px solid #eee;">${log.reason}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;color:#dc2626;">${formatCurrency(log.lossValue)}</td></tr>`).join('');
            const woRows = writeOffLogs.map(log => `
              <tr><td style="padding:8px;border-bottom:1px solid #eee;">${log.dateLogged}</td><td style="padding:8px;border-bottom:1px solid #eee;font-weight:500;">${log.namaProduk}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${log.qtyUnsold} pcs</td><td style="padding:8px;border-bottom:1px solid #eee;">${log.reason}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;color:#d97706;">${formatCurrency(log.lossValue)}</td></tr>`).join('');
            printWin.document.write(`
              <html><head><title>Laporan Waste</title>
              <style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1f2937;}h1{font-size:22px;color:#be123c;margin-bottom:4px;}.meta{color:#6b7280;font-size:12px;margin-bottom:24px;}table{width:100%;border-collapse:collapse;margin:10px 0;}th{background:#f3f4f6;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;}td{padding:8px;border-bottom:1px solid #e5e7eb;font-size:12px;}.total{background:#fef2f2;padding:12px;border-radius:8px;font-weight:bold;margin-top:16px;}h2{font-size:16px;margin-top:30px;color:#065f46;}@media print{body{padding:20px;}}</style></head><body>
              <h1>🗑️ LAPORAN WASTE & WRITE-OFF</h1>
              <div class="meta">Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { year:'numeric',month:'long',day:'numeric' })}</div>
              <h2>Waste Bahan Baku</h2>
              <table><thead><tr><th>Tanggal</th><th>Bahan</th><th style="text-align:right;">Qty</th><th>Alasan</th><th style="text-align:right;">Nilai</th></tr></thead><tbody>${wasteRows || '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:20px;">Belum ada data waste.</td></tr>'}</tbody></table>
              <h2 style="color:#d97706;">Write-off Produk Jadi</h2>
              <table><thead><tr><th>Tanggal</th><th>Produk</th><th style="text-align:right;">Qty</th><th>Alasan</th><th style="text-align:right;">Nilai</th></tr></thead><tbody>${woRows || '<tr><td colspan="5" style="text-align:center;color:#9ca3af;padding:20px;">Belum ada data write-off.</td></tr>'}</tbody></table>
              <div class="total">Total Kerugian: ${formatCurrency(totalWasteLoss + totalWriteOffLoss)}</div>
              <p style="margin-top:40px;text-align:center;color:#9ca3af;font-size:11px;">Near Bakery & Co. ERP — Laporan Waste & Write-off</p>
              <script>window.print();<\/script></body></html>
            `);
            printWin.document.close();
          }} className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
            <Printer className="w-3.5 h-3.5" /> Cetak
          </button>
          <div className="text-right text-xs bg-rose-50 text-rose-800 border border-rose-100 font-extrabold px-3 py-1.5 rounded-xl font-mono">
            Total Kerugian: {formatCurrency(totalWasteLoss + totalWriteOffLoss)}
          </div>
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
              <div className="flex items-center gap-1">
                <input type="number" required value={wasteQty} onChange={(e) => setWasteQty(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg p-2 font-mono" placeholder="Qty" />
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-2 rounded-lg min-w-[40px] text-center">
                  {bahanBaku[parseInt(selectedBahanIdx)]?.satuan || 'gr'}
                </span>
              </div>
              <select value={wasteLocation} onChange={(e) => setWasteLocation(e.target.value as any)}
                className="border border-gray-200 rounded-lg p-2">
                <option>Dapur Pusat</option><option>Gudang Utama</option><option>Storefront / Kasir</option>
              </select>
            </div>
            {/* Upload Foto Waste */}
            <div className="flex items-center gap-2">
              <input type="file" accept="image/*" capture="environment" ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setWastePhoto(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer">
                <Camera className="w-4 h-4" /> {wastePhoto ? 'Ganti Foto' : '📸 Foto Kerusakan'}
              </button>
              {wastePhoto && (
                <div className="relative group">
                  <img src={wastePhoto} alt="Waste"
                    onClick={() => setPreviewPhoto(wastePhoto)}
                    className="w-10 h-10 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-80 transition" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    onClick={() => setPreviewPhoto(wastePhoto)}>
                    <span className="text-[9px] font-bold bg-black/50 text-white px-1.5 py-0.5 rounded">🔍</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setWastePhoto(null); }} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] font-bold cursor-pointer hover:bg-red-600">×</button>
                </div>
              )}
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
            {/* Upload Foto Write-off */}
            <div className="flex items-center gap-2">
              <input type="file" accept="image/*" capture="environment" ref={woFileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setWoPhoto(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden" />
              <button type="button" onClick={() => woFileInputRef.current?.click()}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition cursor-pointer">
                <Camera className="w-4 h-4" /> {woPhoto ? 'Ganti Foto' : '📸 Foto Produk'}
              </button>
              {woPhoto && (
                <div className="relative group">
                  <img src={woPhoto} alt="Write off"
                    onClick={() => setPreviewPhoto(woPhoto)}
                    className="w-10 h-10 rounded-lg object-cover border border-gray-200 cursor-pointer hover:opacity-80 transition" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    onClick={() => setPreviewPhoto(woPhoto)}>
                    <span className="text-[9px] font-bold bg-black/50 text-white px-1.5 py-0.5 rounded">🔍</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setWoPhoto(null); }} className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[8px] font-bold cursor-pointer hover:bg-red-600">×</button>
                </div>
              )}
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

      {/* ─── FOTO PREVIEW MODAL ─── */}
      {previewPhoto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setPreviewPhoto(null)}>
          <div className="relative max-w-2xl w-full max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img src={previewPhoto} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl border border-white/10 object-contain" />
            <button onClick={() => setPreviewPhoto(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-gray-900/90 hover:bg-gray-900 text-white rounded-full flex items-center justify-center shadow-lg transition cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
