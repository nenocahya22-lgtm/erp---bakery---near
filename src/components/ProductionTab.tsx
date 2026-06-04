import React, { useState } from 'react';
import { ProductHpp, CalculationResult } from '../types';
import { Layers, Calendar, ChevronDown, CheckCircle2, Flame, RefreshCw, Sparkles, Sliders, AlertTriangle } from 'lucide-react';

interface ProductionTabProps {
  productHpp: ProductHpp[];
  calculatedProducts: CalculationResult[];
}

interface BOMStage {
  productName: string;
  stageName: string; // Stage 1: Basic Dough, Stage 2: Topping, Stage 3: Assembly
  description: string;
  ingredients: { name: string; quantity: number; unit: string }[];
}

export default function ProductionTab({ productHpp, calculatedProducts }: ProductionTabProps) {
  const [selectedProduct, setSelectedProduct] = useState(
    productHpp.length > 0 ? productHpp[0].namaProduk : ''
  );
  
  // Custom multi-level BOM store
  const [bomStages, setBomStages] = useState<BOMStage[]>([]);
  const [shrinkagePct, setShrinkagePct] = useState<Record<string, number>>({});
  const [wasteTracking, setWasteTracking] = useState<Record<string, number>>({});
  
  // New Stage form states
  const [stageName, setStageName] = useState('Tahap 1: Adonan Dasar');
  const [stageDescription, setStageDescription] = useState('');
  
  // MPS States (Production Scheduling)
  const [scheduleQty, setScheduleQty] = useState<Record<string, number>>({});
  const [preOrders, setPreOrders] = useState<Record<string, number>>({});
  const [displayStock, setDisplayStock] = useState<Record<string, number>>({});

  const activeCalculated = calculatedProducts.find(
    p => p.namaProduk.toLowerCase().trim() === selectedProduct.toLowerCase().trim()
  );

  const activeStages = bomStages.filter(
    b => b.productName.toLowerCase().trim() === selectedProduct.toLowerCase().trim()
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Yield Calculator
  const currentShrinkage = shrinkagePct[selectedProduct] || 0;
  const currentWaste = wasteTracking[selectedProduct] || 0;

  // Calculate simulated baking outcome weights
  const rawWeight = activeCalculated
    ? activeCalculated.bahanList.reduce((acc, curr) => acc + curr.takaran, 0)
    : 0;
  
  const shrinkageLoss = (rawWeight * currentShrinkage) / 100;
  const doughWasteLoss = (rawWeight * currentWaste) / 100;
  const finalBakedYield = Math.max(0, rawWeight - shrinkageLoss - doughWasteLoss);

  // MPS recommendation generator
  const getBakingRecommendation = (prodName: string) => {
    const orders = preOrders[prodName] || 0;
    const est = displayStock[prodName] || 0;
    const buffer = 10; // safety stock buffer
    const target = orders - est + buffer;
    return target > 0 ? target : 0;
  };

  return (
    <div id="production-tab-container" className="space-y-6">
      
      {/* SECTION PANEL HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" />
            Manajemen Resep & Produksi (Advanced BOM)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Pisahkan proses produksi menjadi multi-level BOM stages, monitor penyusutan bahan baku (Yield), dan rencanakan jadwal memanggang otomatis.
          </p>
        </div>
        
        {productHpp.length > 0 && (
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
            <span className="text-xs text-gray-400 font-bold uppercase select-none">Pilih Produk:</span>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="text-xs font-bold text-gray-800 bg-transparent focus:outline-none"
            >
              {productHpp.map(p => (
                <option key={p.namaProduk} value={p.namaProduk}>{p.namaProduk}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: MULTI-LEVEL BOM & YIELD WASTE */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* MULTI_LEVEL CARDS FOR BOM */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-50">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Multi-Level Bill of Materials (BOM)
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold">
                {activeStages.length} Tahap Terdefinisi
              </span>
            </div>

            {activeStages.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">Belum ada tahap manufaktur BOM terdaftar.</p>
            ) : (
              <div className="space-y-4">
                {activeStages.map((stage, idx) => (
                  <div key={idx} className="bg-gray-50/50 p-4 border border-gray-150 rounded-xl relative hover:border-emerald-250 transition-colors">
                    <span className="absolute top-3.5 right-4 font-mono text-[9px] uppercase font-bold tracking-wider text-emerald-600 bg-white border border-emerald-100 px-2 py-0.5 rounded-full">
                      BOM Level {idx + 1}
                    </span>
                    <h4 className="text-xs md:text-sm font-bold text-gray-900">{stage.stageName}</h4>
                    <p className="text-xs text-gray-500 mt-1 italic">{stage.description}</p>
                    
                    <div className="mt-3.5 space-y-1.5 pt-3 border-t border-gray-200/50">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Estimasi Komponen Terpakai:</span>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {stage.ingredients.map((ing, iIdx) => (
                          <div key={iIdx} className="bg-white p-2 rounded-lg border border-gray-100 flex items-center justify-between text-xs font-medium">
                            <span className="text-gray-700 truncate mr-1">{ing.name}</span>
                            <span className="font-mono text-emerald-800 shrink-0 font-bold">{ing.quantity} {ing.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Interactive Stage Adder Option */}
            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-dashed border-gray-200">
              <h4 className="text-xs font-bold text-gray-700 uppercase">Simulasi Alokasi Tahap Produksi Kue</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Nama Tahapan Baru... (misal: Tahap Hias Glaze)"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Deskripsi langkah pengerjaan baker..."
                  value={stageDescription}
                  onChange={(e) => setStageDescription(e.target.value)}
                  className="bg-white border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => {
                  if (stageName.trim()) {
                    setBomStages(prev => [...prev, {
                      productName: selectedProduct,
                      stageName: stageName.trim(),
                      description: stageDescription.trim() || 'Proses pengerjaan kustom tim dapur.',
                      ingredients: []
                    }]);
                    setStageName('');
                    setStageDescription('');
                  }
                }}
                className="w-full text-center bg-gray-950 text-white hover:bg-gray-900 border border-black font-semibold text-xs py-2 rounded-lg transition-transform active:scale-[0.99] cursor-pointer"
              >
                + Tambah Level Alur Penyiapan (BOM Stage)
              </button>
            </div>
          </div>

          {/* YIELD & WASTE CALCULATION ENGINE */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1 pb-2 border-b border-gray-50">
              <Sliders className="w-4 h-4 text-emerald-600" />
              Yield & Waste Management (Penyusutan Baking)
            </h3>
            
            <p className="text-xs text-gray-500">
              Ubah parameter penyusutan berat oven (shrinkage) dan pemborosan adonan cetak (scrap/waste) untuk menghitung berat bersih akhir satu batch resep kue.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-gray-150">
              {/* Sliders panel */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-gray-700">Faktor Penyusutan Oven (Shrinkage)</span>
                    <span className="text-emerald-800 font-mono font-bold">{currentShrinkage}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="45"
                    step="0.5"
                    value={currentShrinkage}
                    onChange={(e) => setShrinkagePct(prev => ({ ...prev, [selectedProduct]: parseFloat(e.target.value) }))}
                    className="w-full accent-emerald-600"
                  />
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Tepung menyerap kelembaban; menguap selama baking (biasa berkisar 10%-20%).
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-red-700">Faktor Adonan Terbuang (Waste Scrap)</span>
                    <span className="text-red-800 font-mono font-bold">{currentWaste}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.1"
                    value={currentWaste}
                    onChange={(e) => setWasteTracking(prev => ({ ...prev, [selectedProduct]: parseFloat(e.target.value) }))}
                    className="w-full accent-red-600"
                  />
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Adonan yang tertinggal di permukaan mangkuk mixer atau cetakan cetak (biasanya 1%-5%).
                  </span>
                </div>
              </div>

              {/* Computations result board */}
              <div className="flex flex-col justify-between bg-white border border-gray-100 p-4 rounded-xl space-y-3">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Kalkulasi Berat Hasil Jadi:</span>
                
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Estimasi Input Bahan Mentah:</span>
                    <span className="font-mono font-bold text-gray-800">{rawWeight ? `${rawWeight.toFixed(0)} gr` : '0 gr'}</span>
                  </div>
                  <div className="flex justify-between text-amber-700">
                    <span>Penyusutan Suhu Air (-{currentShrinkage}%):</span>
                    <span className="font-mono font-bold">-{shrinkageLoss.toFixed(0)} gr</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Kerugian Sisa Scrap (-{currentWaste}%):</span>
                    <span className="font-mono font-bold">-{doughWasteLoss.toFixed(0)} gr</span>
                  </div>
                  <div className="flex justify-between border-t border-dashed border-gray-200 pt-2 text-emerald-800 font-bold">
                    <span>Berat Bersih Kue Matang:</span>
                    <span className="font-mono text-sm">{finalBakedYield ? `${finalBakedYield.toFixed(0)} gr` : '0 gr'}</span>
                  </div>
                </div>

                {finalBakedYield > 0 && activeCalculated && (
                  <div className="bg-emerald-50 text-emerald-800 p-2 border border-emerald-100 rounded-lg text-center text-[10px] font-semibold">
                    💡 Rekomendasi Berat Cetak Adonan Rata-Rata: {(finalBakedYield / activeCalculated.porsiJual).toFixed(1)} gr per porsi roti jadi.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: MPS CALENDAR PRODUCTION SCHEDULE */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="pb-2 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Production Scheduling (MPS)
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Penetapan kuantitas panggangan dapur harian otomatis.</p>
          </div>

          <div className="space-y-4">
            
            {/* Quick alert bar */}
            <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 flex gap-2 text-[11px] text-amber-900">
              <Flame className="w-4 h-4 text-amber-600 shrink-0 select-none" />
              <span>Tim oven butuh membakar target hari ini guna menghindari etalase kosong sore nanti!</span>
            </div>

            {/* List and editable limits */}
            <div className="space-y-3">
              {productHpp.map((p) => {
                const rec = getBakingRecommendation(p.namaProduk);
                return (
                  <div key={p.namaProduk} className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-gray-950 truncate max-w-[150px]" title={p.namaProduk}>
                        {p.namaProduk}
                      </span>
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded font-mono font-bold">
                        Stock: {displayStock[p.namaProduk] || 0} pcs
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px] text-gray-500">
                      <div>
                        <span>Pre-Order:</span>
                        <input
                          type="number"
                          value={preOrders[p.namaProduk] || 0}
                          onChange={(e) => setPreOrders(prev => ({ ...prev, [p.namaProduk]: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-white border border-gray-200 p-1 rounded font-mono font-bold text-gray-800 text-center"
                        />
                      </div>
                      <div>
                        <span>Sisa Toko:</span>
                        <input
                          type="number"
                          value={displayStock[p.namaProduk] || 0}
                          onChange={(e) => setDisplayStock(prev => ({ ...prev, [p.namaProduk]: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-white border border-gray-200 p-1 rounded font-mono font-bold text-gray-800 text-center"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-150 pt-2 text-xs font-semibold">
                      <span className="text-gray-500">Rekomendasi Oven Hari Ini:</span>
                      <span className="text-emerald-700 font-mono font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-150">
                        {rec} porsi
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2">
              <button
                onClick={() => alert('Jadwal produksi dapur berhasil dikonfirmasi dan draf logistik inter-company store requisition diperkirakan sesuai porsi!')}
                className="w-full bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer text-center"
              >
                🔑 Rilis Lembar Kerja Dapur Pagi
              </button>
            </div>
            
          </div>
        </div>
        
      </div>

    </div>
  );
}
