import React, { useState } from 'react';
import { Layers, Sparkles, Sliders, Printer, Trash2 } from 'lucide-react';
import { ProductHpp, CalculationResult } from '../types';

interface BOMStage {
  productName: string;
  stageName: string;
  description: string;
  ingredients: { name: string; quantity: number; unit: string }[];
}

interface BomTabProps {
  productHpp: ProductHpp[];
  calculatedProducts: CalculationResult[];
}

export default function BomTab({ productHpp, calculatedProducts }: BomTabProps) {
  const publishedProducts = productHpp.filter(p => p.status !== 'draft');
  const [selectedProduct, setSelectedProduct] = useState(publishedProducts.length > 0 ? publishedProducts[0].namaProduk : '');
  const [bomStages, setBomStages] = useState<BOMStage[]>([]);
  const [stageName, setStageName] = useState('');
  const [stageDescription, setStageDescription] = useState('');
  const [shrinkagePct, setShrinkagePct] = useState<Record<string, number>>({});
  const [wasteTracking, setWasteTracking] = useState<Record<string, number>>({});

  const activeStages = bomStages.filter(b => b.productName.toLowerCase().trim() === selectedProduct.toLowerCase().trim());
  const activeCalculated = calculatedProducts.find(p => p.namaProduk.toLowerCase().trim() === selectedProduct.toLowerCase().trim());

  const currentShrinkage = shrinkagePct[selectedProduct] || 0;
  const currentWaste = wasteTracking[selectedProduct] || 0;
  const rawWeight = activeCalculated ? activeCalculated.bahanList.reduce((acc, curr) => acc + curr.takaran, 0) : 0;
  const shrinkageLoss = (rawWeight * currentShrinkage) / 100;
  const doughWasteLoss = (rawWeight * currentWaste) / 100;
  const finalBakedYield = Math.max(0, rawWeight - shrinkageLoss - doughWasteLoss);

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" /> BOM Produksi & Yield
          </h2>
          <p className="text-xs text-gray-500 mt-1">Multi-level Bill of Materials dan kalkulasi penyusutan baking.</p>
        </div>
        <div className="flex items-center gap-2">
          {publishedProducts.length > 0 && (
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
              <span className="text-xs text-gray-400 font-bold">Produk:</span>
              <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}
                className="text-xs font-bold text-gray-800 bg-transparent focus:outline-none">
                {publishedProducts.map(p => <option key={p.namaProduk} value={p.namaProduk}>{p.namaProduk}</option>)}
              </select>
            </div>
          )}
          <button onClick={() => {
            if (!selectedProduct) return;
            const printWin = window.open('', '_blank');
            if (!printWin) return;
            const stageHtml = activeStages.map((stage, idx) => `
              <div style="margin-bottom:16px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;">
                <h3 style="font-size:14px;margin:0 0 4px;color:#065f46;">Level ${idx+1}: ${stage.stageName}</h3>
                <p style="color:#6b7280;font-size:12px;margin:0 0 8px;">${stage.description}</p>
                <table style="width:100%;border-collapse:collapse;">
                  <thead><tr><th style="background:#f3f4f6;padding:8px;text-align:left;font-size:11px;">Komponen</th><th style="background:#f3f4f6;padding:8px;text-align:right;font-size:11px;">Qty</th></tr></thead>
                  <tbody>${stage.ingredients.map(ing => `<tr><td style="padding:6px;border-bottom:1px solid #eee;">${ing.name}</td><td style="padding:6px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${ing.quantity} ${ing.unit}</td></tr>`).join('')}</tbody>
                </table></div>
            `).join('');
            printWin.document.write(`
              <html><head><title>BOM - ${selectedProduct}</title>
              <style>body{font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1f2937;}h1{font-size:22px;color:#065f46;}h2{font-size:16px;margin-top:20px;color:#374151;}.meta{color:#6b7280;font-size:12px;margin-bottom:20px;}.yield{background:#f0fdf4;padding:12px;border-radius:8px;margin-top:16px;font-size:13px;}@media print{body{padding:20px;}}</style></head><body>
              <h1>🏭 BOM PRODUKSI</h1>
              <div class="meta">Produk: <strong>${selectedProduct}</strong> | Tanggal: ${new Date().toLocaleDateString('id-ID', { year:'numeric',month:'long',day:'numeric' })}</div>
              ${stageHtml || '<p style="color:#9ca3af;">Belum ada tahap BOM.</p>'}
              <div class="yield">
                <strong>Yield Kalkulasi:</strong><br>
                Input Mentah: ${rawWeight.toFixed(0)} gr | Shrinkage: ${currentShrinkage}% | Scrap: ${currentWaste}%<br>
                <strong>Hasil Jadi: ${finalBakedYield.toFixed(0)} gr</strong>
              </div>
              <p style="margin-top:40px;text-align:center;color:#9ca3af;font-size:11px;">Near Bakery & Co. ERP — BOM & Yield</p>
              <script>window.print();<\/script></body></html>
            `);
            printWin.document.close();
          }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
            <Printer className="w-3.5 h-3.5" /> Cetak BOM
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <Sparkles className="w-4 h-4 text-emerald-600" /> Multi-Level BOM
          </h3>

          {activeStages.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Belum ada tahap BOM. Tambah level produksi di bawah.</p>
          ) : (
            <div className="space-y-4">
              {activeStages.map((stage, idx) => (
                <div key={idx} className="bg-gray-50/50 p-4 border border-gray-150 rounded-xl">
                  <span className="font-mono text-[9px] uppercase font-bold text-emerald-600 bg-white border border-emerald-100 px-2 py-0.5 rounded-full float-right">
                    Level {idx + 1}
                  </span>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-900">{stage.stageName}</h4>
                    <button onClick={async () => {
                      const confirmed_107 = await new Promise<boolean>((resolve) => {
                        showConfirm({
                          title: 'Konfirmasi',
                          message: `Hapus tahap "${stage.stageName}"?`,
                          confirmLabel: 'Ya',
                          cancelLabel: 'Batal',
                          variant: 'warning',
                          onConfirm: () => resolve(true),
                          onCancel: () => resolve(false),
                        });
                      });
                      if (confirmed_107) {

                        setBomStages(prev => prev.filter((_, i) => i !== idx));
                      }
                    }}
                      className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                      title="Hapus Tahap">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 italic">{stage.description}</p>
                  <div className="mt-3 pt-3 border-t border-gray-200/50">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">Komponen:</span>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {stage.ingredients.map((ing, iIdx) => (
                        <div key={iIdx} className="bg-white p-2 rounded-lg border border-gray-100 flex justify-between text-xs font-medium">
                          <span className="text-gray-700 truncate mr-1">{ing.name}</span>
                          <span className="font-mono text-emerald-800 font-bold">{ing.quantity} {ing.unit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-dashed border-gray-200">
            <h4 className="text-xs font-bold text-gray-700 uppercase">Tambah Tahap BOM</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input type="text" placeholder="Nama tahap (misal: Adonan Dasar)" value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg p-2 text-xs" />
              <input type="text" placeholder="Deskripsi" value={stageDescription}
                onChange={(e) => setStageDescription(e.target.value)}
                className="bg-white border border-gray-200 rounded-lg p-2 text-xs" />
            </div>
            <button onClick={() => {
              if (stageName.trim()) {
                setBomStages(prev => [...prev, {
                  productName: selectedProduct, stageName: stageName.trim(),
                  description: stageDescription.trim() || 'Proses produksi.',
                  ingredients: []
                }]);
                setStageName(''); setStageDescription('');
              }
            }}
              className="w-full bg-gray-950 text-white font-bold text-xs py-2 rounded-lg hover:bg-gray-900 transition cursor-pointer">
              + Tambah Level BOM
            </button>
          </div>
        </div>

        {/* YIELD CALCULATOR */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <Sliders className="w-4 h-4 text-emerald-600" /> Yield Kalkulator
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-gray-700">Shrinkage Oven</span>
                <span className="font-mono font-bold">{currentShrinkage}%</span>
              </div>
              <input type="range" min="0" max="45" step="0.5" value={currentShrinkage}
                onChange={(e) => setShrinkagePct(prev => ({ ...prev, [selectedProduct]: parseFloat(e.target.value) }))}
                className="w-full accent-emerald-600" />
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-red-700">Waste Scrap</span>
                <span className="font-mono font-bold text-red-700">{currentWaste}%</span>
              </div>
              <input type="range" min="0" max="15" step="0.1" value={currentWaste}
                onChange={(e) => setWasteTracking(prev => ({ ...prev, [selectedProduct]: parseFloat(e.target.value) }))}
                className="w-full accent-red-600" />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-gray-100 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Input Mentah:</span><span className="font-bold font-mono">{rawWeight.toFixed(0)} gr</span></div>
              <div className="flex justify-between text-amber-700"><span>Shrinkage (-{currentShrinkage}%):</span><span className="font-mono">-{shrinkageLoss.toFixed(0)} gr</span></div>
              <div className="flex justify-between text-red-600"><span>Scrap (-{currentWaste}%):</span><span className="font-mono">-{doughWasteLoss.toFixed(0)} gr</span></div>
              <div className="flex justify-between border-t border-dashed pt-2 text-emerald-800 font-bold">
                <span>Berat Hasil Jadi:</span>
                <span className="font-mono text-sm">{finalBakedYield.toFixed(0)} gr</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
