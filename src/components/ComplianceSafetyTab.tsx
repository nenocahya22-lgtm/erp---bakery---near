import React, { useState } from 'react';
import { ShieldCheck, Printer, Search, RefreshCw, AlertTriangle, Layers, ArrowRight } from 'lucide-react';

interface AllergenInfo {
  materialName: string;
  allergens: string[]; // Wheat, Nuts, Dairy, Eggs, Soy
}

export default function ComplianceSafetyTab() {
  // Allergen tracking lookup
  const [allergensList] = useState<AllergenInfo[]>([]);

  // Mock Recall engine states
  const [contaminatedBatch, setContaminatedBatch] = useState('');
  const [recallOutput, setRecallOutput] = useState<{
    material: string;
    affectedProducts: string[];
    affectedBatches: string[];
    logisticsBranches: string[];
    status: 'Ready' | 'Triggered';
  }>({
    material: '',
    affectedProducts: [],
    affectedBatches: [],
    logisticsBranches: [],
    status: 'Ready',
  });

  const [recallTriggered, setRecallTriggered] = useState(false);
  const [selectedProductLabel, setSelectedProductLabel] = useState('');

  const handleTriggerMockRecall = () => {
    setRecallTriggered(true);
    setTimeout(() => {
      setRecallOutput(prev => ({
        ...prev,
        status: 'Triggered'
      }));
    }, 1500);
  };

  const resetRecall = () => {
    setRecallTriggered(false);
    setRecallOutput(prev => ({
      ...prev,
      status: 'Ready'
    }));
  };

  // Helper detect allergens for selected product labels
  const getProductAllergens = (prod: string) => {
    return [];
  };

  return (
    <div id="compliance-tab-container" className="space-y-6">
      
      {/* HEADER SECTION PANEL */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Keamanan Pangan & Penarikan Massa (Food Safety & Traceability)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Gunakan fungsionalitas pendeteksi Allergen otomatis saat mencetak label roti draf kemasan dan lakukan simulasi pelacakan krisis (Mock Recall).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: MOCK RECALL crisis tracing SIMULATION */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="pb-2 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4.5 h-4.5 text-red-600 animate-pulse" />
              Kris Penarikan Bahan Tercemar (Mock Recall Simulator)
            </h3>
            <span className="text-[10px] bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full font-bold uppercase">
              Emergency Module
            </span>
          </div>

          <p className="text-xs text-gray-500">
            Masukkan kode batch bahan yang terkontaminasi untuk melacak produk dan cabang yang terdampak.
          </p>

          <div className="bg-red-50/50 p-4 border border-red-105 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <div className="flex-1 w-full text-xs">
                <label className="block text-[10px] uppercase font-bold text-red-800 mb-1">Masukan Kode Batch Mentega/Bahan Terkontaminasi</label>
                <input
                  type="text"
                  value={contaminatedBatch}
                  onChange={(e) => setContaminatedBatch(e.target.value)}
                  className="w-full bg-white border border-red-200 text-red-950 font-mono font-bold text-xs p-2 rounded-lg"
                />
              </div>
              <button
                onClick={handleTriggerMockRecall}
                disabled={recallTriggered && recallOutput.status === 'Triggered'}
                className="w-full sm:w-auto bg-red-650 hover:bg-red-750 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
              >
                {recallTriggered && recallOutput.status === 'Ready' ? 'Mentrasir Hub...' : 'Trisir Alur Distribusi ➔'}
              </button>
            </div>

            {/* Simulated trace timeline results */}
            {recallTriggered && (
              <div className="bg-white border border-red-150 p-4 rounded-xl space-y-3.5 text-xs">
                {recallOutput.status === 'Ready' ? (
                  <div className="flex items-center justify-center p-6 gap-2 text-red-800">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Sinkronisasi database gudang dan daftar antrean mutasi cabang...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2 text-xs font-bold text-red-800 bg-red-50 p-2.5 rounded-lg border border-red-100">
                      <span>✓ <strong>HASIL PELACAKAN SELESAI (0.42 Detik):</strong> Ditemukan kontaminasi menyebar di beberapa produk matang dan cabang berikut:</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-[11px] leading-relaxed text-gray-700">
                      <div className="space-y-1.5 p-3 rounded-lg bg-gray-50 border">
                        <span className="text-[9px] uppercase font-bold text-red-700 font-sans block mb-1">Roti Terdampak (Affected Products):</span>
                        {recallOutput.affectedProducts.map((p, i) => (
                          <div key={i} className="flex justify-between font-semibold">
                            <span>- {p}</span>
                            <span className="font-mono text-red-650">{recallOutput.affectedBatches[i]}</span>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1.5 p-3 rounded-lg bg-gray-50 border">
                        <span className="text-[9px] uppercase font-bold text-red-700 block mb-1">Lokasi Dispatch Toko Cabang (Recall Targets):</span>
                        {recallOutput.logisticsBranches.map((b, i) => (
                          <div key={i} className="text-slate-900 font-mono font-bold flex items-center gap-1">
                            <ArrowRight className="w-3 h-3 text-red-600" /> {b}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-red-950 p-3 rounded-lg border border-red-850 text-white leading-relaxed text-center font-bold text-[10px] animate-pulse">
                      🚨 TINDAKAN SYSTEM: KIRIM NOTIFIKASI ALARM KE SYSTEM KASIR POS DI CABANG-CABANG TERKAIT UNTUK LOCK / BLOKIR BARCODE PENJUALAN PRODUK TERDAMPAK SORE INI!
                    </div>

                    <div className="text-center">
                      <button
                        onClick={resetRecall}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline"
                      >
                        Reset Simulator
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ALLERGEN CONTROL & LABEL PRINTER */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="pb-2 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Printer className="w-4 h-4 text-emerald-600" />
              Kontrol Alergen & Cetak Label
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Membuat label nutrisi kemasan dengan sensor zat alergen.</p>
          </div>

          <div className="space-y-4 text-xs font-semibold">
            {/* Selector product to print */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">Pilih Roti Untuk Cetak Label Kemasan</label>
              <select
                value={selectedProductLabel}
                onChange={(e) => setSelectedProductLabel(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2 bg-white text-xs"
              >
                <option value="">-- Pilih Produk --</option>
              </select>
            </div>

            {/* Generated Label Preview Card */}
            <div className="border border-dashed border-gray-300 p-4 rounded-xl bg-gray-50/50 space-y-3 font-sans relative">
              <span className="text-[8px] tracking-widest font-mono font-bold text-gray-400 block border-b border-gray-200 pb-1 text-center">
                LABEL CETAKAN NUTRISI BAKERY ERP
              </span>

              <div className="text-center">
                <span className="font-extrabold text-sm text-gray-950 block">{selectedProductLabel}</span>
                <span className="text-[9px] text-gray-500 font-mono">ID: ERP-LBL-0112</span>
              </div>

              {/* Warnings details */}
              <div className="bg-white border border-gray-150 p-2 text-[10px] rounded space-y-1">
                <span className="text-[9px] uppercase font-bold text-red-600 block">Pemberitahuan Alergen Wajib Cetak:</span>
                <div className="flex flex-wrap gap-1">
                  {getProductAllergens(selectedProductLabel).map((al, idx) => (
                    <span key={idx} className="bg-red-50 text-red-700 border border-red-100 rounded px-1.5 py-0.5 font-bold text-[9px]">
                      {al}
                    </span>
                  ))}
                </div>
              </div>

              {/* Simulated barcode */}
              <div className="h-8 bg-white border border-gray-200 rounded flex items-center justify-center p-1.5">
                <div className="w-full h-full flex gap-1 select-none opacity-80">
                  <div className="w-1 bg-black h-full"></div>
                  <div className="w-2 bg-black h-full"></div>
                  <div className="w-0.5 bg-black h-full"></div>
                  <div className="w-1 bg-black h-full"></div>
                  <div className="w-2.5 bg-black h-full"></div>
                  <div className="w-1 bg-black h-full"></div>
                  <div className="w-0.5 bg-black h-full"></div>
                  <div className="w-1.5 bg-black h-full"></div>
                </div>
              </div>
            </div>

            <button
              onClick={() => alert(`Cetak Label kemasan untuk ${selectedProductLabel} terkirim ke printer bluetooth nirkabel produksi!`)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer text-center"
            >
              Cetak Draf Label Kemasan ➔
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
