import React, { useState } from 'react';
import { TrendingUp, Plus, Trash2 } from 'lucide-react';
import { PriceRecord } from '../types';

interface PriceHistoryTabProps {
  bahanBaku: any[];
}

export default function PriceHistoryTab({ bahanBaku }: PriceHistoryTabProps) {
  const [records, setRecords] = useState<PriceRecord[]>(() => {
    const saved = localStorage.getItem('price_history_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedBahan, setSelectedBahan] = useState('');
  const [hargaInput, setHargaInput] = useState('');
  const [note, setNote] = useState('');

  const saveRecords = (newRecords: PriceRecord[]) => {
    setRecords(newRecords);
    localStorage.setItem('price_history_data', JSON.stringify(newRecords));
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

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

  // Group records by bahan for charting
  const groupedByBahan = records.reduce((acc: Record<string, PriceRecord[]>, r) => {
    if (!acc[r.bahanNama]) acc[r.bahanNama] = [];
    acc[r.bahanNama].push(r);
    return acc;
  }, {});

  // Find min/max for chart scaling
  const allPrices = records.map(r => r.hargaBeli);
  const maxPrice = Math.max(...allPrices, 1);
  const minPrice = Math.min(...allPrices, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-emerald-600" /> History Harga Bahan Baku
        </h2>
        <p className="text-xs text-gray-500 mt-1">Pantau fluktuasi harga tepung, mentega, telur dari bulan ke bulan untuk negosiasi supplier.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* INPUT */}
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
                {bahanBaku.map((b: any) => (
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

        {/* CHART & HISTORY */}
        <div className="lg:col-span-8 space-y-6">
          {/* Grafik Sederhana */}
          {Object.keys(groupedByBahan).map(bahan => {
            const prices = groupedByBahan[bahan].slice(0, 12).reverse();
            if (prices.length < 2) return null;
            const range = maxPrice - minPrice || 1;

            return (
              <div key={bahan} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{bahan}</h4>
                <div className="h-32 bg-slate-50 rounded-xl border border-gray-100 p-3 flex items-end gap-2">
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
                        {prices.length <= 6 && (
                          <span className="text-[7px] text-gray-400 font-mono truncate w-full text-center">
                            {p.date.slice(5)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {prices.length >= 2 && (
                  <div className="text-[10px] text-gray-500 flex justify-between">
                    <span>Rendah: {formatCurrency(Math.min(...prices.map(p => p.hargaBeli)))}</span>
                    <span>Tinggi: {formatCurrency(Math.max(...prices.map(p => p.hargaBeli)))}</span>
                    <span>Rata-rata: {formatCurrency(Math.round(prices.reduce((s, p) => s + p.hargaBeli, 0) / prices.length))}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Tabel Record */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Semua Record</h4>
            </div>
            <div className="overflow-y-auto max-h-[250px]">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50/50">
                  <tr><th className="p-2.5">Tanggal</th><th className="p-2.5">Bahan</th><th className="p-2.5 text-right">Harga</th><th className="p-2.5">Catatan</th><th className="p-2.5"></th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {records.slice(0, 50).map(r => (
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
              {records.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Belum ada record harga. Catat harga pertama!</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
