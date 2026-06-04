import React, { useState } from 'react';
import { BahanBaku } from '../types';
import { FlaskConical, Plus, Trash2, Sparkles, Sliders, ArrowUpRight } from 'lucide-react';

export interface RDExperiment {
  id: string;
  projectName: string;
  targetOutputPorsi: number;
  estOverhead: number;
  estHargaJual: number;
  components: {
    bahanName: string;
    takaran: number;
    unitPrice: number;
    satuan: string;
  }[];
  dateCreated: string;
}

interface RdSandboxTabProps {
  bahanBaku: BahanBaku[];
  rdExperiments: RDExperiment[];
  onAddRD: (exp: RDExperiment) => void;
  onDeleteRD: (id: string) => void;
}

export default function RdSandboxTab({ bahanBaku, rdExperiments, onAddRD, onDeleteRD }: RdSandboxTabProps) {
  // Format currency helper
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // State draft Formulation
  const [newRDName, setNewRDName] = useState('');
  const [newRDPortion, setNewRDPortion] = useState('10');
  const [newRDOverhead, setNewRDOverhead] = useState('10000');
  const [newRDPrice, setNewRDPrice] = useState('22000');
  const [rdIngredients, setRdIngredients] = useState<{ bahanName: string; takaran: number }[]>([]);

  // Selection single ingredient draft
  const [selectedBahanIdx, setSelectedBahanIdx] = useState('0');
  const [addonTakaran, setAddonTakaran] = useState('100');

  const getIngredientCost = (bahanName: string, takaran: number) => {
    const found = bahanBaku.find(b => b.nama.toLowerCase().trim() === bahanName.toLowerCase().trim());
    return found ? takaran * found.hargaSatuan : takaran * 12; // default fallback cost
  };

  const getBahanSatuan = (bahanName: string) => {
    const found = bahanBaku.find(b => b.nama.toLowerCase().trim() === bahanName.toLowerCase().trim());
    return found ? found.satuan : 'gr';
  };

  const handleAddIngredientDraft = () => {
    if (bahanBaku.length === 0) return;
    const material = bahanBaku[parseInt(selectedBahanIdx)];
    if (!material) return;

    const qty = parseFloat(addonTakaran) || 0;
    if (qty <= 0) return;

    const dup = rdIngredients.find(r => r.bahanName.toLowerCase().trim() === material.nama.toLowerCase().trim());
    if (dup) {
      setRdIngredients(prev => prev.map(item =>
        item.bahanName.toLowerCase().trim() === material.nama.toLowerCase().trim()
          ? { ...item, takaran: item.takaran + qty }
          : item
      ));
    } else {
      setRdIngredients(prev => [...prev, { bahanName: material.nama, takaran: qty }]);
    }
    setAddonTakaran('100');
  };

  const handleCreateRDSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRDName.trim()) return;
    if (rdIngredients.length === 0) {
      alert('Silakan tambahkan minimal satu bahan baku ke dalam racikan R&D!');
      return;
    }

    const outputPorsi = parseFloat(newRDPortion) || 1;
    const overheadCost = parseFloat(newRDOverhead) || 0;
    const testSellPrice = parseFloat(newRDPrice) || 0;

    const formattedComponents = rdIngredients.map(ing => {
      const bDetail = bahanBaku.find(b => b.nama === ing.bahanName);
      return {
        bahanName: ing.bahanName,
        takaran: ing.takaran,
        unitPrice: bDetail ? bDetail.hargaSatuan : 12,
        satuan: bDetail ? bDetail.satuan : 'gr'
      };
    });

    const newExperiment: RDExperiment = {
      id: `rd-${Date.now()}`,
      projectName: newRDName,
      targetOutputPorsi: outputPorsi,
      estOverhead: overheadCost,
      estHargaJual: testSellPrice,
      components: formattedComponents,
      dateCreated: new Date().toISOString().substring(0, 10)
    };

    onAddRD(newExperiment);
    setNewRDName('');
    setNewRDPortion('10');
    setNewRDOverhead('10000');
    setNewRDPrice('22000');
    setRdIngredients([]);
  };

  return (
    <div id="rd-sandbox-tab-container" className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-emerald-600" />
            Litbang (R&D) & Sandbox Formulasi Menu Baru
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Lekas simulasikan resep baru sebelum dirilis resmi. Dapatkan HPP instan, persentase laba kotor, dan kelayakan finansial.
          </p>
        </div>
        <div className="text-right text-xs bg-emerald-50 text-emerald-800 border border-emerald-100 font-bold px-3 py-1.5 rounded-xl font-mono">
          {rdExperiments.length} Proyek Trial Terdaftar
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* FORM Racikan */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="pb-2 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4.5 h-4.5 text-emerald-600" />
              Rancang Produk Percobaan
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Atur takaran, estimasi overhead dan perkiraan target harga jual porsi baru.</p>
          </div>

          <form onSubmit={handleCreateRDSubmit} className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama Produk Percobaan</label>
              <input 
                type="text"
                required
                placeholder="Contoh: Roti Sourdough Charcoal Premium V1"
                value={newRDName}
                onChange={(e) => setNewRDName(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Target Porsi</label>
                <input 
                  type="number"
                  required
                  value={newRDPortion}
                  onChange={(e) => setNewRDPortion(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Est. Overhead</label>
                <input 
                  type="number"
                  required
                  value={newRDOverhead}
                  onChange={(e) => setNewRDOverhead(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Est. Jual /Porsi</label>
                <input 
                  type="number"
                  required
                  value={newRDPrice}
                  onChange={(e) => setNewRDPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Timbanng Bahan */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-gray-150 space-y-3">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Timbang Komposisi Bahan</span>
              
              <div className="flex gap-2">
                <select 
                  value={selectedBahanIdx}
                  onChange={(e) => setSelectedBahanIdx(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                >
                  {bahanBaku.length === 0 ? (
                    <option value="">Database bahan kosong</option>
                  ) : (
                    bahanBaku.map((b, idx) => (
                      <option key={b.nama} value={idx}>{b.nama} ({formatCurrency(b.hargaSatuan)}/{b.satuan})</option>
                    ))
                  )}
                </select>

                <input 
                  type="number" 
                  value={addonTakaran} 
                  onChange={(e) => setAddonTakaran(e.target.value)}
                  className="w-20 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-center" 
                  placeholder="Qty"
                />

                <button
                  type="button"
                  onClick={handleAddIngredientDraft}
                  className="px-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-bold transition-all cursor-pointer flex items-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Added draft lists */}
              {rdIngredients.length > 0 ? (
                <div className="bg-white border border-gray-150 rounded-lg overflow-hidden text-[10px] font-medium text-gray-600 divide-y divide-gray-100">
                  <div className="bg-gray-50/50 p-2 font-bold text-gray-400 flex justify-between">
                    <span>Nama Komponen</span>
                    <span>Takaran & Est Biaya</span>
                  </div>
                  {rdIngredients.map((ing, idx) => {
                    const cost = getIngredientCost(ing.bahanName, ing.takaran);
                    return (
                      <div key={idx} className="p-2 flex justify-between font-sans">
                        <span className="font-semibold text-gray-950">{ing.bahanName}</span>
                        <span className="font-mono text-gray-500">
                          {ing.takaran} {getBahanSatuan(ing.bahanName)} / {formatCurrency(cost)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 italic text-center py-2">Belum ada komposisi adonan diracik.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-605 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs transition-all tracking-wider uppercase cursor-pointer"
            >
              Simpan & Rekon Margin Percobaan
            </button>
          </form>
        </div>

        {/* ACTIVE TRIAL PROJECTS */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="pb-2 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4.5 h-4.5 text-emerald-600" />
              Arsip Litbang & Portofolio Formulasi Eksperimental
            </h3>
          </div>

          {rdExperiments.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-gray-150 rounded-xl bg-gray-50/50">
              <p className="text-xs text-gray-400 font-bold italic">Belum ada portofolio R&D terdaftar saat ini.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1 text-xs">
              {rdExperiments.map((exp) => {
                const totalMatCost = exp.components.reduce((acc, curr) => acc + (curr.takaran * curr.unitPrice), 0);
                const totalHppExp = totalMatCost + exp.estOverhead;
                const hppPerUnit = totalHppExp / exp.targetOutputPorsi;
                const profitPerUnit = exp.estHargaJual - hppPerUnit;
                const marginPercent = exp.estHargaJual > 0 ? (profitPerUnit / exp.estHargaJual) * 100 : 0;

                return (
                  <div key={exp.id} className="bg-slate-50 p-4 rounded-xl border border-gray-150 space-y-3 relative">
                    <button 
                      onClick={() => onDeleteRD(exp.id)}
                      className="absolute top-4 right-4 p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                      title="Hapus Proyek"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div>
                      <h4 className="font-bold text-gray-900 pr-8">{exp.projectName}</h4>
                      <span className="text-[9px] text-gray-400 font-semibold font-mono tracking-wider">LAB REF: {exp.id} | Tanggal: {exp.dateCreated}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center bg-white border border-gray-150 rounded-xl p-3 font-mono font-bold leading-relaxed text-xs">
                      <div>
                        <span className="block text-[8px] text-gray-400 uppercase font-bold tracking-wider">HPP / Unit</span>
                        <span className="text-gray-900">{formatCurrency(hppPerUnit)}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-400 uppercase font-bold tracking-wider font-sans">Harga Jual</span>
                        <span className="text-emerald-700">{formatCurrency(exp.estHargaJual)}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-400 uppercase font-bold tracking-wider">Margin Laba</span>
                        <span className={marginPercent >= 40 ? 'text-emerald-600' : 'text-amber-600'}>{marginPercent.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Bahan Karbon Formulasi:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {exp.components.map((c, i) => (
                          <span key={i} className="text-[9px] bg-white border border-gray-200 text-gray-700 px-2 py-0.5 rounded font-mono font-bold">
                            {c.bahanName}: {c.takaran} {c.satuan}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
