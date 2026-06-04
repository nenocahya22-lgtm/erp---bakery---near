import React, { useState } from 'react';
import { BahanBaku, WasteLog } from '../types';
import { Trash2, Plus, ShieldAlert, Sparkles, Sliders, Calendar, ArrowUpRight } from 'lucide-react';

interface WasteControlTabProps {
  bahanBaku: BahanBaku[];
  wasteLogs: WasteLog[];
  onAddWasteLog: (log: WasteLog) => void;
  onDeleteWasteLog: (id: string) => void;
}

export default function WasteControlTab({ bahanBaku, wasteLogs, onAddWasteLog, onDeleteWasteLog }: WasteControlTabProps) {
  // Numeric formatted helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Form states for Logging Material Waste
  const [selectedBahanIdx, setSelectedBahanIdx] = useState('0');
  const [wasteQty, setWasteQty] = useState('500');
  const [wasteLocation, setWasteLocation] = useState<'Gudang Utama' | 'Dapur Pusat' | 'Storefront / Kasir'>('Dapur Pusat');
  const [wasteReason, setWasteReason] = useState('');

  const handleLogWasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bahanBaku.length === 0) return;
    const mat = bahanBaku[parseInt(selectedBahanIdx)];
    if (!mat) return;

    const qty = parseFloat(wasteQty) || 0;
    if (qty <= 0) return;

    // Rigid math foundation calculation based on unit cost of material
    const lossValue = Math.round(qty * mat.hargaSatuan);

    const newLog: WasteLog = {
      id: `w-${Date.now()}`,
      bahanNama: mat.nama,
      qtyWasted: qty,
      satuan: mat.satuan,
      lossValue: lossValue,
      location: wasteLocation,
      reason: wasteReason.trim() || 'Wastage standar operasional dapur',
      dateLogged: new Date().toISOString().substring(0, 10)
    };

    onAddWasteLog(newLog);
    setWasteQty('500');
    setWasteReason('');
  };

  const totalWasteLossVal = wasteLogs.reduce((acc, curr) => acc + curr.lossValue, 0);

  return (
    <div id="waste-control-tab-container" className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Trash2 className="w-6 h-6 text-rose-500" />
            Sistem Kontrol Bahan Rusak & Kerugian Waste
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Catat pemborosan adonan over-proofing, tepung tumpah, susu basi, atau roti gagal bakar untuk memicu koreksi pembukuan laba berkala.
          </p>
        </div>
        <div className="text-right text-xs bg-rose-50 text-rose-800 border border-rose-100 font-extrabold px-3 py-1.5 rounded-xl font-mono">
          Kerugian Terakumulasi: {formatCurrency(totalWasteLossVal)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* INPUT FORM PANEL */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="pb-2 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4.5 h-4.5 text-rose-600" />
              Catat Kerusakan Baru
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Timbang sisa produksi atau bahan rusak untuk mendokumentasikan log insiden.</p>
          </div>

          <form onSubmit={handleLogWasteSubmit} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Pilih Bahan Baku Terbuang</label>
              <select 
                value={selectedBahanIdx}
                onChange={(e) => setSelectedBahanIdx(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs"
              >
                {bahanBaku.length === 0 ? (
                  <option value="">Database bahan baku kosong</option>
                ) : (
                  bahanBaku.map((b, idx) => (
                    <option key={b.nama} value={idx}>{b.nama} ({b.satuan})</option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Kuantitas Terbuang (Volume)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    required
                    value={wasteQty}
                    onChange={(e) => setWasteQty(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 text-[10px]">
                    {bahanBaku[parseInt(selectedBahanIdx)]?.satuan || 'gr'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Lokasi Insiden</label>
                <select 
                  value={wasteLocation}
                  onChange={(e) => setWasteLocation(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-250 rounded-lg text-xs"
                >
                  <option value="Gudang Utama">Gudang Utama</option>
                  <option value="Dapur Pusat">Dapur Pusat</option>
                  <option value="Storefront / Kasir">Storefront / Kasir</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Alasan Detail Kerusakan</label>
              <input 
                type="text" 
                placeholder="Contoh: Ragi mati akibat disimpan dekat uap panas"
                required
                value={wasteReason}
                onChange={(e) => setWasteReason(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl text-xs transition-all uppercase cursor-pointer"
            >
              Simpan Pencatatan Waste
            </button>
          </form>
        </div>

        {/* RECENT HISTORIC LOGS LIST */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="border-b border-gray-50 pb-2 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4.5 h-4.5 text-rose-600 animate-pulse" />
              Laporan Kasus Log Limbah & Susutan Terbuka
            </h3>
            <span className="text-[10px] bg-red-100 text-red-850 px-2.5 py-0.5 rounded-full font-bold">
              {wasteLogs.length} Kasus Log
            </span>
          </div>

          {wasteLogs.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-gray-150 rounded-xl bg-gray-50/50">
              <p className="text-xs text-gray-400 font-bold italic">Belum ada insiden waste terdaftar untuk periode ini.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {wasteLogs.map((log) => (
                <div key={log.id} className="bg-rose-50/20 p-3.5 rounded-xl border border-rose-100 flex items-start gap-3 relative">
                  <button 
                    onClick={() => onDeleteWasteLog(log.id)}
                    className="absolute top-3.5 right-3.5 p-1 hover:bg-rose-100 text-gray-400 hover:text-rose-650 rounded-lg transition-colors cursor-pointer"
                    title="Hapus Entry"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="p-1.5 bg-red-50 text-red-700 border border-red-100 rounded text-[9px] font-black uppercase font-mono">
                    WASTE
                  </div>

                  <div className="space-y-1 pr-6 flex-1 text-xs">
                    <div className="flex justify-between font-bold text-gray-900">
                      <span>{log.bahanNama}</span>
                      <span className="font-mono text-red-650 font-black">-{formatCurrency(log.lossValue)}</span>
                    </div>
                    <p className="text-gray-500 text-[11px] leading-relaxed italic">"{log.reason}"</p>
                    <div className="flex justify-between text-[9px] text-gray-400 font-semibold font-mono">
                      <span>Lokasi: {log.location}</span>
                      <span>{log.dateLogged} ({log.qtyWasted.toLocaleString('id-ID')} {log.satuan})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-3.5 bg-slate-50 rounded-lg border border-gray-150 text-[11px] text-gray-500 leading-relaxed">
            <span className="font-bold text-gray-800">Uji Audit Manajemen:</span> Setiap 1 gr penyusutan diakumulasikan langsung memangkas nominal arus kas bersih pada menu Arus Kas & Kategori Anggaran secara beruntun.
          </div>
        </div>

      </div>

    </div>
  );
}
