import React, { useState } from 'react';
import { BahanBaku } from '../types';
import { FlaskConical, Plus, Trash2, Sparkles, Sliders, ArrowUpRight, Scale, FolderOpen, Tag, ChevronRight, Edit2, X, Check, AlertTriangle } from 'lucide-react';

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
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  // State draft Formulation
  const [newRDName, setNewRDName] = useState('');
  const [newRDPortion, setNewRDPortion] = useState('10');
  const [newRDOverhead, setNewRDOverhead] = useState('10000');
  const [newRDPrice, setNewRDPrice] = useState('22000');
  const [rdIngredients, setRdIngredients] = useState<{ bahanName: string; takaran: number }[]>([]);
  const [selectedBahanIdx, setSelectedBahanIdx] = useState('0');
  const [addonTakaran, setAddonTakaran] = useState('100');
  const [selectedExp, setSelectedExp] = useState<string>('');

  const getIngredientCost = (bahanName: string, takaran: number) => {
    const found = bahanBaku.find(b => b.nama.toLowerCase().trim() === bahanName.toLowerCase().trim());
    return found ? takaran * found.hargaSatuan : takaran * 12;
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

  const handleRemoveIngredient = (bahanName: string) => {
    setRdIngredients(prev => prev.filter(i => i.bahanName !== bahanName));
  };

  const handleCreateRDSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRDName.trim()) return;
    if (rdIngredients.length === 0) {
      alert('Silakan tambahkan minimal satu bahan baku!');
      return;
    }

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
      targetOutputPorsi: parseFloat(newRDPortion) || 1,
      estOverhead: parseFloat(newRDOverhead) || 0,
      estHargaJual: parseFloat(newRDPrice) || 0,
      components: formattedComponents,
      dateCreated: new Date().toISOString().substring(0, 10)
    };

    onAddRD(newExperiment);
    setNewRDName('');
    setNewRDPortion('10');
    setNewRDOverhead('10000');
    setNewRDPrice('22000');
    setRdIngredients([]);
    setSelectedExp(newExperiment.id);
  };

  const activeExp = rdExperiments.find(e => e.id === selectedExp);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-emerald-600" /> R&D Sandbox — Formulasi & Eksperimen
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Simulasi resep eksperimen baru sebelum rilis resmi. Struktur sama seperti modul Resep — dengan kolom: Nama, Bahan, Takaran, Satuan, Harga Satuan, Subtotal.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Form */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-50 pb-2">
            <Plus className="w-4 h-4 text-emerald-600" /> Racik Eksperimen Baru
          </h3>

          <form onSubmit={handleCreateRDSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama Proyek</label>
              <input type="text" required placeholder="Roti Sourdough V2" value={newRDName}
                onChange={(e) => setNewRDName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-xs" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Target Porsi</label>
                <input type="number" required value={newRDPortion} onChange={(e) => setNewRDPortion(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono font-bold" />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Overhead (Rp)</label>
                <input type="number" required value={newRDOverhead} onChange={(e) => setNewRDOverhead(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono" />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-400 mb-1">Harga Jual</label>
                <input type="number" required value={newRDPrice} onChange={(e) => setNewRDPrice(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 text-xs font-mono" />
              </div>
            </div>

            {/* Table-like ingredients input */}
            <div className="bg-slate-50 rounded-xl border border-gray-150 p-3 space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-500 block">Daftar Bahan (sama seperti modul Resep)</span>
              
              <div className="flex gap-2">
                <select value={selectedBahanIdx} onChange={(e) => setSelectedBahanIdx(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg p-2 text-xs bg-white">
                  {bahanBaku.map((b, idx) => (
                    <option key={b.nama} value={idx}>{b.nama} ({b.satuan})</option>
                  ))}
                </select>
                <input type="number" value={addonTakaran} onChange={(e) => setAddonTakaran(e.target.value)}
                  className="w-20 border border-gray-200 rounded-lg p-2 text-xs font-mono text-center" placeholder="Takaran" />
                <button type="button" onClick={handleAddIngredientDraft}
                  className="px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Ingredients table */}
              {rdIngredients.length > 0 ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <table className="w-full text-left text-[10px]">
                    <thead>
                      <tr className="bg-gray-100 text-gray-500 uppercase font-bold">
                        <th className="p-2">Nama Bahan</th>
                        <th className="p-2 text-right">Takaran</th>
                        <th className="p-2 text-right">Harga Satuan</th>
                        <th className="p-2 text-right">Subtotal</th>
                        <th className="p-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rdIngredients.map((ing, idx) => {
                        const cost = getIngredientCost(ing.bahanName, ing.takaran);
                        const satuan = getBahanSatuan(ing.bahanName);
                        const hargaSatuan = bahanBaku.find(b => b.nama === ing.bahanName)?.hargaSatuan || 0;
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-2 font-semibold text-gray-900">{ing.bahanName}</td>
                            <td className="p-2 text-right font-mono">{ing.takaran} {satuan}</td>
                            <td className="p-2 text-right font-mono text-gray-500">{formatCurrency(hargaSatuan)}/{satuan}</td>
                            <td className="p-2 text-right font-mono font-bold text-emerald-700">{formatCurrency(cost)}</td>
                            <td className="p-2 text-center">
                              <button type="button" onClick={() => handleRemoveIngredient(ing.bahanName)}
                                className="text-gray-400 hover:text-red-600 cursor-pointer">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="bg-emerald-50 font-bold">
                        <td colSpan={3} className="p-2 text-right text-emerald-800">Total Bahan:</td>
                        <td className="p-2 text-right font-mono text-emerald-800">
                          {formatCurrency(rdIngredients.reduce((s, i) => s + getIngredientCost(i.bahanName, i.takaran), 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[10px] text-gray-400 italic text-center py-3">Belum ada bahan — tambahkan dari form di atas.</p>
              )}
            </div>

            <button type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition cursor-pointer">
              <FlaskConical className="w-3.5 h-3.5 inline mr-1" /> Simpan Eksperimen
            </button>
          </form>
        </div>

        {/* RIGHT: Daftar & Detail Eksperimen */}
        <div className="lg:col-span-7 space-y-4">
          {/* Daftar Eksperimen */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-emerald-600" /> Daftar Eksperimen ({rdExperiments.length})
              </h3>
            </div>
            {rdExperiments.length === 0 ? (
              <div className="p-8 text-center">
                <FlaskConical className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-semibold">Belum ada eksperimen</p>
                <p className="text-[10px] text-gray-400 mt-1">Buat eksperimen baru di panel samping.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                {rdExperiments.map(exp => {
                  const totalMatCost = exp.components.reduce((acc, curr) => acc + (curr.takaran * curr.unitPrice), 0);
                  const totalHpp = totalMatCost + exp.estOverhead;
                  const hppPerUnit = totalHpp / exp.targetOutputPorsi;
                  const profitPerUnit = exp.estHargaJual - hppPerUnit;
                  const margin = exp.estHargaJual > 0 ? (profitPerUnit / exp.estHargaJual) * 100 : 0;
                  const isSelected = exp.id === selectedExp;

                  return (
                    <div key={exp.id}
                      onClick={() => setSelectedExp(exp.id)}
                      className={`p-4 cursor-pointer transition ${
                        isSelected ? 'bg-emerald-50/50 border-l-2 border-emerald-500' : 'hover:bg-gray-50 border-l-2 border-transparent'
                      }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{exp.projectName}</span>
                            <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-mono">{exp.id.slice(-6)}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                            <span>{exp.components.length} bahan</span>
                            <span>•</span>
                            <span>HPP: {formatCurrency(hppPerUnit)}/porsi</span>
                            <span>•</span>
                            <span className={margin >= 30 ? 'text-emerald-700 font-bold' : 'text-amber-700'}>{margin.toFixed(1)}% margin</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-gray-900">{formatCurrency(exp.estHargaJual)}</span>
                          <ChevronRight className={`w-4 h-4 text-gray-400 transition ${isSelected ? 'text-emerald-600' : ''}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail Eksperimen Terpilih */}
          {activeExp && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{activeExp.projectName}</h3>
                  <p className="text-[10px] text-gray-500">Dibuat: {activeExp.dateCreated}</p>
                </div>
                <button onClick={() => { if (window.confirm(`Hapus "${activeExp.projectName}"?`)) onDeleteRD(activeExp.id); }}
                  className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* Summary */}
                {(() => {
                  const totalMatCost = activeExp.components.reduce((acc, curr) => acc + (curr.takaran * curr.unitPrice), 0);
                  const totalHpp = totalMatCost + activeExp.estOverhead;
                  const hppPerUnit = totalHpp / activeExp.targetOutputPorsi;
                  const profitPerUnit = activeExp.estHargaJual - hppPerUnit;
                  const margin = activeExp.estHargaJual > 0 ? (profitPerUnit / activeExp.estHargaJual) * 100 : 0;

                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                      <div className="bg-gray-50 p-2.5 rounded-lg text-center">
                        <span className="text-[9px] text-gray-500 block uppercase font-bold">Yield</span>
                        <span className="font-bold font-mono text-gray-900">{activeExp.targetOutputPorsi} porsi</span>
                      </div>
                      <div className="bg-gray-50 p-2.5 rounded-lg text-center">
                        <span className="text-[9px] text-gray-500 block uppercase font-bold">HPP/Porsi</span>
                        <span className="font-bold font-mono text-emerald-700">{formatCurrency(hppPerUnit)}</span>
                      </div>
                      <div className="bg-gray-50 p-2.5 rounded-lg text-center">
                        <span className="text-[9px] text-gray-500 block uppercase font-bold">Harga Jual</span>
                        <span className="font-bold font-mono text-blue-700">{formatCurrency(activeExp.estHargaJual)}</span>
                      </div>
                      <div className="bg-gray-50 p-2.5 rounded-lg text-center">
                        <span className="text-[9px] text-gray-500 block uppercase font-bold">Margin</span>
                        <span className={`font-bold font-mono ${margin >= 30 ? 'text-emerald-700' : 'text-amber-700'}`}>{margin.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Tabel Bahan */}
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Komposisi Bahan</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-100 text-[10px] uppercase font-bold text-gray-500">
                        <th className="px-3 py-2">Nama Bahan</th>
                        <th className="px-3 py-2 text-right">Takaran</th>
                        <th className="px-3 py-2 text-right">Harga Satuan</th>
                        <th className="px-3 py-2 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeExp.components.map((c, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{c.bahanName}</td>
                          <td className="px-3 py-2 text-right font-mono">{c.takaran} {c.satuan}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-500">{formatCurrency(c.unitPrice)}/{c.satuan}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">{formatCurrency(c.takaran * c.unitPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
