import React, { useState, useEffect } from 'react';
import { ShieldCheck, Layers, Flame, AlarmClock, Users, RefreshCw, Calendar, Gauge, Plus, Trash2, CheckCircle } from 'lucide-react';

interface WorkOrder {
  assetName: string;
  opHours: number;
  limitHours: number;
  status: 'Aman' | 'Butuh Pelumasan' | 'Servis Rutin';
  targetDate: string;
}

export default function SmartKitchenTab() {
  // Oven IoT telemetry states
  const [ovenTemp, setOvenTemp] = useState(0);
  const [scaleWeight, setScaleWeight] = useState(0); // grams
  const [freezerTemp, setFreezerTemp] = useState(0);

  // Mixer operative hours log
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  // Baker shift state optimizer
  const [dailyDonutsTarget, setDailyDonutsTarget] = useState(200);

  // New Work Order form state
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetLimit, setNewAssetLimit] = useState('500');
  const [newAssetTargetDate, setNewAssetTargetDate] = useState('');

  const handleAddWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim()) return;
    const newWO: WorkOrder = {
      assetName: newAssetName.trim(),
      opHours: 0, // Baru didaftarkan, belum ada jam operasional
      limitHours: parseInt(newAssetLimit) || 500,
      status: 'Aman',
      targetDate: newAssetTargetDate || new Date().toISOString().substring(0, 10),
    };
    setWorkOrders(prev => [...prev, newWO]);
    setNewAssetName('');
    setNewAssetLimit('500');
    setNewAssetTargetDate('');
  };

  const handleDeleteWorkOrder = (assetName: string) => {
    if (!window.confirm(`Hapus "${assetName}" dari daftar aset?`)) return;
    setWorkOrders(prev => prev.filter(w => w.assetName !== assetName));
  };

  // Auto fluctuating IoT numbers simulation in client
  useEffect(() => {
    const interval = setInterval(() => {
      setOvenTemp(prev => Math.round(prev + (Math.random() - 0.5) * 4));
      setScaleWeight(prev => Math.round(prev + (Math.random() - 0.5) * 1));
      setFreezerTemp(prev => Math.round(prev + (Math.random() - 0.5) * 0.5));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleMaintenanceComplete = (asset: string) => {
    setWorkOrders(prev =>
      prev.map(w => w.assetName === asset ? { ...w, opHours: 0, status: 'Aman' } : w)
    );
    alert(`Rapor perawatan mesin ${asset} diperbarui sukses! Jam operasional di-reset ke 0.`);
  };

  // Roster logic
  const getStaffRecommendation = () => {
    // 1 baker handles 150 donuts daily max
    const calculated = Math.ceil(dailyDonutsTarget / 150);
    return calculated > 1 ? calculated : 1;
  };

  return (
    <div id="smart-kitchen-tab" className="space-y-6">
      
      {/* HEADER SECTION PANEL */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Gauge className="w-6 h-6 text-emerald-600" />
            Otomatisasi IoT Dapur, HRIS Roster & Aset Perawatan (EAM)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Terhubung langsung ke IoT timbangan berat adonan presisi, alarm freezer pengaman kulkas mentega, preventif mixer, dan optimasi shift karyawan.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: IOT TELEMETRY & PREVENTIVE WORK ORDERS */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* IOT TELEMETRY INTEGRATION GRID */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-50">
              <RefreshCw className="w-4 h-4 text-emerald-600" />
              Sensor IoT Real-Time (Internet of Things)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Telemetry 1: Oven temp */}
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
                <Flame className="w-7 h-7 text-orange-600 mx-auto" />
                <span className="text-[10px] uppercase font-bold text-orange-700 block mt-1">Suhu Decks Oven Gas</span>
                <span className="text-2xl font-mono font-extrabold text-orange-850 block">{ovenTemp} °C</span>
                <span className="text-[9px] text-orange-600 font-medium">Suhu baking stabil otomatis</span>
              </div>

              {/* Telemetry 2: Digitial Scale */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
                <Gauge className="w-7 h-7 text-emerald-600 mx-auto" />
                <span className="text-[10px] uppercase font-bold text-emerald-700 block mt-1">Timbangan Pintas IoT</span>
                <span className="text-2xl font-mono font-extrabold text-emerald-850 block">{scaleWeight} gr</span>
                <span className="text-[9px] text-emerald-600 font-medium">Melindungi konsistensi rasa roti</span>
              </div>

              {/* Telemetry 3: Freezer safety */}
              <div className={`rounded-xl p-4 text-center border ${freezerTemp > -12 ? 'bg-red-50 border-red-150 animate-pulse' : 'bg-blue-50 border-blue-105'}`}>
                <AlarmClock className={`w-7 h-7 mx-auto ${freezerTemp > -12 ? 'text-red-650' : 'text-blue-600'}`} />
                <span className={`text-[10px] uppercase font-bold block mt-1 ${freezerTemp > -12 ? 'text-red-700' : 'text-blue-700'}`}>Suhu Chiller Freezer</span>
                <span className="text-2xl font-mono font-extrabold block text-blue-900">{freezerTemp.toFixed(1)} °C</span>
                <span className={`text-[9px] font-medium block ${freezerTemp > -12 ? 'text-red-650 font-bold' : 'text-blue-600'}`}>
                  {freezerTemp > -12 ? '⚠️ ALARM PANAS! FREEZER MATI!' : 'Suhu aman penyimpanan mentega'}
                </span>
              </div>

            </div>
          </div>

          {/* ADD WORK ORDER FORM */}
          <form onSubmit={handleAddWorkOrder} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" /> Daftarkan Aset Baru
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nama Mesin</label>
                <input type="text" required value={newAssetName} onChange={(e) => setNewAssetName(e.target.value)}
                  placeholder="Misal: Mixer Bosch 20L"
                  className="w-full border border-gray-200 rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Batas Servis (jam)</label>
                <input type="number" required min="10" value={newAssetLimit} onChange={(e) => setNewAssetLimit(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 font-mono" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Target Servis</label>
                <input type="date" value={newAssetTargetDate} onChange={(e) => setNewAssetTargetDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2" />
              </div>
              <div className="flex items-end">
                <button type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              </div>
            </div>
          </form>

          {/* PREVENTIVE MAINTENANCE EAM */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
                Perawatan Preventif Mesin Dapur (Work Order EAM)
              </h3>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold">
                Aset Utama Aktif
              </span>
            </div>

            <div className="overflow-x-auto text-xs sm:text-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/20 text-[10px] uppercase font-bold text-gray-500">
                    <th className="px-5 py-3.5">Nama Mesin Aset</th>
                    <th className="px-4 py-3.5 text-center">Operasional Jam Kerja</th>
                    <th className="px-4 py-3.5 text-center">Batas Servis (Siklus)</th>
                    <th className="px-4 py-3.5 text-center">Rencana Jadwal Servis</th>
                    <th className="px-4 py-3.5 text-center">Status Keamanan</th>
                    <th className="px-5 py-3.5 text-center">Tindakan Reset</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {workOrders.map((w, idx) => {
                    const progress = Math.min(100, (w.opHours / w.limitHours) * 100);
                    return (
                      <tr key={idx} className="hover:bg-slate-55 hover:bg-emerald-50/10">
                        <td className="px-5 py-4 font-semibold text-gray-950">{w.assetName}</td>
                        <td className="px-4 py-4 text-center font-mono">
                          {w.opHours} jam
                        </td>
                        <td className="px-4 py-4 text-center font-mono text-gray-450">{w.limitHours} jam</td>
                        <td className="px-4 py-4 text-center font-bold font-sans text-gray-600">{w.targetDate}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            w.status === 'Aman' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            w.status === 'Butuh Pelumasan' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-red-50 text-red-700 border-red-100 animate-pulse'
                          }`}>
                            {w.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {w.status !== 'Aman' ? (
                              <button
                                onClick={() => handleMaintenanceComplete(w.assetName)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-2 py-1 rounded"
                              >
                                Selesai Servis
                              </button>
                            ) : (
                              <span className="text-gray-400 font-semibold text-xs">-</span>
                            )}
                            <button
                              onClick={() => handleDeleteWorkOrder(w.assetName)}
                              className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                              title="Hapus Aset"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: HRIS SHIFT OPTIMIZER ROSTER */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="pb-2 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" />
              Optimasi Shift Dapur & HRIS
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Penjadwalan baker otomatis berdasarkan pesanan target.</p>
          </div>

          <div className="space-y-4">
            
            {/* Target order planner */}
            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1.5">
                Target Produksi Roti/Donat (Donuts/Bread Target)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={dailyDonutsTarget}
                  onChange={(e) => setDailyDonutsTarget(parseInt(e.target.value) || 100)}
                  className="w-full text-xs font-mono font-bold border border-gray-200 rounded-lg p-2.5"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">PCS/HARI</span>
              </div>
            </div>

            {/* Calculations results */}
            <div className="bg-slate-50 border border-gray-150 p-4 rounded-xl space-y-3.5 text-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Estimasi Optimasi Karyawan Shift:</span>
              
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Baker Pengadon Aktif:</span>
                  <span className="font-bold text-gray-800">{getStaffRecommendation()} Baker</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tenaga Labor Cost Harian:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    Rp {(getStaffRecommendation() * 150000).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 mt-2 block italic leading-relaxed">
                  *Rantai labor cost langsung didistribusikan ke draf overhead HPP produk demi akurasi total margin bersih bisnis roti Anda.
                </div>
              </div>
            </div>

            <button
              onClick={() => alert(`Jadwal shift baker untuk target ${dailyDonutsTarget} donat berhasil dipublikasikan!`)}
              className="w-full text-center bg-gray-950 text-white font-bold text-xs py-2.5 rounded-lg border border-black cursor-pointer shadow-xs"
            >
              🔑 Publikasikan Jadwal Roster Baker
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
