import React, { useState, useEffect } from 'react';
import { Gauge, Thermometer, Droplets, Cpu, Wifi, WifiOff, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle2, Plus, Trash2, Users, Calendar } from 'lucide-react';
import { IoTDevice } from '../types';
import { safeGetLocalStorage } from '../lib/safe-json';

interface WorkOrder {
  assetName: string;
  opHours: number;
  limitHours: number;
  status: 'Aman' | 'Butuh Pelumasan' | 'Servis Rutin';
  targetDate: string;
}

export default function SmartKitchenTab() {
  // ─── IOT DEVICES ───
  const [devices, setDevices] = useState<IoTDevice[]>(() =>
    safeGetLocalStorage<IoTDevice[]>('smartkitchen_devices', [])
  );

  // ─── WORK ORDERS (EAM) ───
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(() =>
    safeGetLocalStorage<WorkOrder[]>('smartkitchen_work_orders', [])
  );
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetLimit, setNewAssetLimit] = useState('500');
  const [newAssetTargetDate, setNewAssetTargetDate] = useState('');

  // Persist ke localStorage
  useEffect(() => {
    localStorage.setItem('smartkitchen_devices', JSON.stringify(devices));
  }, [devices]);
  useEffect(() => {
    localStorage.setItem('smartkitchen_work_orders', JSON.stringify(workOrders));
  }, [workOrders]);

  // ─── BAKER SHIFT ───
  const [dailyDonutsTarget, setDailyDonutsTarget] = useState(200);

  // IoT data simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setDevices(prev => prev.map(d => {
        let newValue = d.value;
        const fluctuation = (Math.random() - 0.5) * 4;
        
        if (d.type === 'oven') {
          newValue = Math.round(Math.max(140, Math.min(240, d.value + fluctuation)));
        } else if (d.type === 'freezer') {
          newValue = Math.round((d.value + fluctuation) * 10) / 10;
          newValue = d.value > 0 ? Math.max(0, Math.min(10, newValue)) : Math.max(-25, Math.min(-10, newValue));
        } else if (d.type === 'scale') {
          newValue = Math.round(Math.max(0, d.value + (Math.random() - 0.5) * 2));
        } else if (d.type === 'humidity') {
          newValue = Math.round(Math.max(40, Math.min(95, d.value + fluctuation)));
        } else if (d.type === 'mixer') {
          newValue = Math.round(Math.max(0, d.value + (Math.random() - 0.5) * 10));
        }

        let status: 'online' | 'offline' | 'warning' = d.status;
        if (d.status !== 'offline') {
          if (d.minThreshold !== undefined && newValue < d.minThreshold) status = 'warning';
          else if (d.maxThreshold !== undefined && newValue > d.maxThreshold) status = 'warning';
          else status = 'online';
        }

        return { ...d, value: newValue, status, lastUpdate: new Date().toISOString() };
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleDevice = (id: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, status: d.status === 'offline' ? 'online' : 'offline' } : d));
  };

  // ─── WORK ORDER HANDLERS ───
  const handleAddWorkOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetName.trim()) return;
    const newWO: WorkOrder = {
      assetName: newAssetName.trim(),
      opHours: 0,
      limitHours: parseInt(newAssetLimit) || 500,
      status: 'Aman',
      targetDate: newAssetTargetDate || new Date().toISOString().substring(0, 10),
    };
    setWorkOrders(prev => [...prev, newWO]);
    setNewAssetName('');
    setNewAssetLimit('500');
    setNewAssetTargetDate('');
  };

  const handleDeleteWorkOrder = async (assetName: string) => {
    const confirmed_94 = await new Promise<boolean>((resolve) => {
      showConfirm({
        title: 'Konfirmasi',
        message: `Hapus "${assetName}"?`,
        confirmLabel: 'Ya',
        cancelLabel: 'Batal',
        variant: 'warning',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed_94) return;
    setWorkOrders(prev => prev.filter(w => w.assetName !== assetName));
  };

  const handleMaintenanceComplete = (asset: string) => {
    setWorkOrders(prev => prev.map(w => w.assetName === asset ? { ...w, opHours: 0, status: 'Aman' } : w));
    alert(`✅ Perawatan ${asset} selesai! Jam operasional di-reset ke 0.`);
  };

  const getStaffRecommendation = () => Math.max(1, Math.ceil(dailyDonutsTarget / 150));

  const totalOnline = devices.filter(d => d.status === 'online').length;
  const totalWarning = devices.filter(d => d.status === 'warning').length;
  const totalOffline = devices.filter(d => d.status === 'offline').length;

  const formatTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Cpu className="w-6 h-6 text-emerald-600" /> Smart IoT — Monitoring Dapur & EAM
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Monitoring IoT real-time (suhu oven, freezer, timbangan, mixer, kelembaban) + EAM perawatan aset + optimasi shift baker.
        </p>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
          <span className="text-[9px] uppercase font-bold text-emerald-700 block">Online</span>
          <span className="text-xl font-black text-emerald-800 font-mono">{totalOnline}</span>
        </div>
        <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-center">
          <span className="text-[9px] uppercase font-bold text-amber-700 block">Warning</span>
          <span className="text-xl font-black text-amber-800 font-mono">{totalWarning}</span>
        </div>
        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-center">
          <span className="text-[9px] uppercase font-bold text-gray-600 block">Offline</span>
          <span className="text-xl font-black text-gray-700 font-mono">{totalOffline}</span>
        </div>
        <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-center">
          <span className="text-[9px] uppercase font-bold text-purple-700 block">Aset</span>
          <span className="text-xl font-black text-purple-800 font-mono">{workOrders.length}</span>
        </div>
        <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 text-center">
          <span className="text-[9px] uppercase font-bold text-blue-700 block">Baker</span>
          <span className="text-xl font-black text-blue-800 font-mono">{getStaffRecommendation()}</span>
        </div>
      </div>

      {/* IoT DEVICES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {devices.map(device => (
          <div key={device.id} className={`bg-white p-4 rounded-2xl border shadow-xs transition-all ${
            device.status === 'warning' ? 'border-amber-300 ring-1 ring-amber-200' :
            device.status === 'offline' ? 'border-gray-200 opacity-70' : 'border-gray-100'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-xl ${
                device.type === 'oven' ? 'bg-orange-100 text-orange-700' :
                device.type === 'freezer' ? 'bg-blue-100 text-blue-700' :
                device.type === 'scale' ? 'bg-emerald-100 text-emerald-700' :
                device.type === 'humidity' ? 'bg-cyan-100 text-cyan-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                {device.type === 'oven' || device.type === 'freezer' ? <Thermometer className="w-4 h-4" /> :
                 device.type === 'scale' ? <Gauge className="w-4 h-4" /> :
                 device.type === 'humidity' ? <Droplets className="w-4 h-4" /> : <Cpu className="w-4 h-4" />}
              </div>
              <button onClick={() => handleToggleDevice(device.id)}
                className={`p-1.5 rounded-lg cursor-pointer transition ${
                  device.status === 'online' ? 'text-emerald-600 bg-emerald-50' :
                  device.status === 'offline' ? 'text-gray-400 bg-gray-100' : 'text-amber-600 bg-amber-50'
                }`}>
                {device.status === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              </button>
            </div>
            <p className="text-[10px] font-semibold text-gray-500 truncate">{device.name}</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className={`text-xl font-black font-mono ${device.status === 'warning' ? 'text-amber-700' : 'text-gray-900'}`}>{device.value}</span>
              <span className="text-[10px] text-gray-500">{device.unit}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className={`inline-flex items-center gap-1 text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                device.status === 'online' ? 'bg-emerald-100 text-emerald-800' :
                device.status === 'offline' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-800'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  device.status === 'online' ? 'bg-emerald-500' : device.status === 'offline' ? 'bg-gray-400' : 'bg-amber-500 animate-pulse'
                }`} />
                {device.status}
              </span>
              <span className="text-[8px] text-gray-400">{device.location}</span>
            </div>
            {device.status === 'warning' && device.minThreshold !== undefined && (
              <div className="mt-1 pt-1 border-t border-amber-100 text-[8px] text-amber-700 flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                {device.value < device.minThreshold ? `Min: ${device.minThreshold}${device.unit}` : `Max: ${device.maxThreshold}${device.unit}`}
              </div>
            )}
            <div className="text-[7px] text-gray-400 font-mono mt-1">{formatTime(device.lastUpdate)}</div>
          </div>
        ))}
      </div>

      {/* EAM + HRIS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* EAM Work Orders */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> EAM — Perawatan Aset Dapur
            </h3>

            <form onSubmit={handleAddWorkOrder} className="flex flex-col sm:flex-row gap-3 mb-4 text-xs">
              <input type="text" required placeholder="Nama Mesin" value={newAssetName}
                onChange={(e) => setNewAssetName(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg p-2" />
              <input type="number" required min="10" placeholder="Batas Servis (jam)" value={newAssetLimit}
                onChange={(e) => setNewAssetLimit(e.target.value)}
                className="w-28 border border-gray-200 rounded-lg p-2 font-mono" />
              <input type="date" value={newAssetTargetDate}
                onChange={(e) => setNewAssetTargetDate(e.target.value)}
                className="w-36 border border-gray-200 rounded-lg p-2" />
              <button type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition cursor-pointer">
                <Plus className="w-3.5 h-3.5 inline" /> Tambah Aset
              </button>
            </form>

            {workOrders.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Belum ada aset terdaftar.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <thead>
                    <tr className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50">
                      <th className="px-3 py-2">Aset</th>
                      <th className="px-3 py-2 text-center">Jam Operasi</th>
                      <th className="px-3 py-2 text-center">Batas Servis</th>
                      <th className="px-3 py-2 text-center">Target</th>
                      <th className="px-3 py-2 text-center">Status</th>
                      <th className="px-3 py-2 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {workOrders.map((w, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 font-semibold">{w.assetName}</td>
                        <td className="px-3 py-2.5 text-center font-mono">{w.opHours} jam</td>
                        <td className="px-3 py-2.5 text-center font-mono text-gray-500">{w.limitHours} jam</td>
                        <td className="px-3 py-2.5 text-center text-gray-600">{w.targetDate}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            w.status === 'Aman' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            w.status === 'Butuh Pelumasan' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-red-50 text-red-700 border-red-100 animate-pulse'
                          }`}>{w.status}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex justify-center gap-1">
                            {w.status !== 'Aman' && (
                              <button onClick={() => handleMaintenanceComplete(w.assetName)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold px-2 py-1 rounded cursor-pointer">Selesai</button>
                            )}
                            <button onClick={() => handleDeleteWorkOrder(w.assetName)}
                              className="text-gray-400 hover:text-red-600 p-1 cursor-pointer">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* HRIS Shift Optimizer */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-600" /> Optimasi Shift Baker
          </h3>
          <div>
            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Target Produksi Harian</label>
            <input type="number" value={dailyDonutsTarget}
              onChange={(e) => setDailyDonutsTarget(parseInt(e.target.value) || 100)}
              className="w-full border border-gray-200 rounded-lg p-2.5 font-mono font-bold" />
          </div>
          <div className="bg-slate-50 p-4 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Baker Dibutuhkan:</span>
              <span className="font-bold">{getStaffRecommendation()} orang</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Estimasi Biaya:</span>
              <span className="font-mono font-bold text-emerald-800">Rp {(getStaffRecommendation() * 150000).toLocaleString('id-ID')}</span>
            </div>
          </div>
          <button onClick={() => alert(`Jadwal shift untuk ${dailyDonutsTarget} produk berhasil dipublikasikan!`)}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-lg transition cursor-pointer">
            Publikasikan Jadwal
          </button>
        </div>
      </div>
    </div>
  );
}
