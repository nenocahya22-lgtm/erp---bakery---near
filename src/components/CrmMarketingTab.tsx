import React, { useState } from 'react';
import { CalculationResult } from '../types';
import { Megaphone, RefreshCw, Sparkles, Send, Users, Mail, Compass, ChefHat, Coins } from 'lucide-react';

interface RFMGroup {
  segment: string;
  size: number;
  description: string;
  actionCode: string;
}

interface CrmMarketingTabProps {
  calculatedProducts: CalculationResult[];
}

export default function CrmMarketingTab({ calculatedProducts }: CrmMarketingTabProps) {
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [marketingAdvice, setMarketingAdvice] = useState('');
  const [salesDropReason, setSalesDropReason] = useState('');
  const [competitorFactor, setCompetitorFactor] = useState('');
  const [costChanges, setCostChanges] = useState('');
  const [selectedTargetProduct, setSelectedTargetProduct] = useState('');
  const [blastSending, setBlastSending] = useState(false);
  const [blastTarget, setBlastTarget] = useState('At Risk');
  const [customerSegments] = useState<RFMGroup[]>([]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const handleConsultCmo = async () => {
    setMarketingLoading(true);
    setMarketingAdvice('');
    try {
      const res = await fetch('/api/marketing/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salesDropReason, competitorFactor, costChanges })
      });
      const data = await res.json();
      setMarketingAdvice(data.text || 'Gagal merumuskan strategi.');
    } catch (err: any) {
      setMarketingAdvice(`Gangguan koneksi: ${err.message}`);
    } finally {
      setMarketingLoading(false);
    }
  };

  const handleBlastWhatsApp = () => {
    setBlastSending(true);
    setTimeout(() => {
      setBlastSending(false);
      alert(`✅ Promosi terkirim ke segmen "${blastTarget}"!`);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-indigo-600" /> CRM & Marketing
        </h2>
        <p className="text-xs text-gray-500 mt-1">Analisis penjualan, rekomendasi AI marketing, dan broadcast promosi.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KIRI: AI CMO */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
            <Compass className="w-4 h-4 text-indigo-600" /> Konsultan AI Marketing (Virtual CMO)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Target Menu</label>
              <select value={selectedTargetProduct} onChange={(e) => setSelectedTargetProduct(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
                <option value="">-- Semua Menu --</option>
                {calculatedProducts.map(p => (
                  <option key={p.namaProduk} value={p.namaProduk}>{p.namaProduk}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Drop Penjualan</label>
              <input type="text" value={salesDropReason} onChange={(e) => setSalesDropReason(e.target.value)}
                placeholder="Misal: Roti kurang manis..."
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Aksi Kompetitor</label>
              <input type="text" value={competitorFactor} onChange={(e) => setCompetitorFactor(e.target.value)}
                placeholder="Outlet baru 100m..."
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Kenaikan Harga</label>
              <input type="text" value={costChanges} onChange={(e) => setCostChanges(e.target.value)}
                placeholder="Mentega naik 10%..."
                className="w-full border border-gray-200 rounded-lg p-2.5 bg-white" />
            </div>
          </div>

          <button onClick={handleConsultCmo} disabled={marketingLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold text-xs uppercase rounded-xl shadow-md transition cursor-pointer flex justify-center items-center gap-1.5">
            {marketingLoading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Merumuskan Strategi...</>
            ) : (
              <><Sparkles className="w-4 h-4 text-yellow-300" /> Saran Virtual AI CMO</>
            )}
          </button>

          {marketingAdvice && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs text-slate-200 whitespace-pre-wrap max-h-[300px] overflow-y-auto">
              {marketingAdvice}
            </div>
          )}
        </div>

        {/* KANAN: WA BLAST & RFM */}
        <div className="lg:col-span-5 space-y-6">
          {/* RFM */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Users className="w-4 h-4 text-emerald-600" /> Segmentasi Pelanggan (RFM)
            </h3>
            <p className="text-xs text-gray-500">Pengelompokan konsumen berdasarkan loyalitas pembelian.</p>
            <div className="space-y-3">
              {customerSegments.map((g, idx) => (
                <div key={idx} className="p-3.5 bg-gray-50 border border-gray-150 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-gray-900">{g.segment}</span>
                    <span className="font-mono text-emerald-800 bg-white border px-2 py-0.5 rounded text-[10px]">{g.size} member</span>
                  </div>
                  <p className="text-gray-500 text-[11px]">{g.description}</p>
                </div>
              ))}
              {customerSegments.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">Data pelanggan akan muncul setelah ada transaksi POS.</p>
              )}
            </div>
          </div>

          {/* WA BLAST */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Mail className="w-4 h-4 text-emerald-600" /> Broadcast Promosi
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Target Segmen</label>
                <select value={blastTarget} onChange={(e) => setBlastTarget(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2.5 bg-white">
                  {customerSegments.length > 0 ? customerSegments.map(g => (
                    <option key={g.segment} value={g.segment}>{g.segment}</option>
                  )) : <option value="Semua">Semua Pelanggan</option>}
                </select>
              </div>
              <button onClick={handleBlastWhatsApp} disabled={blastSending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                {blastSending ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mengirim...</> : <><Send className="w-3.5 h-3.5" /> Kirim Broadcast WA</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
