import React, { useState, useEffect } from 'react';
import { ShieldCheck, Printer, Search, RefreshCw, AlertTriangle, Layers, ArrowRight, Package, Trash2, X, CheckCircle2, Thermometer, Droplets, Cpu } from 'lucide-react';
import { ProductHpp, IoTDevice } from '../types';
import { safeGetLocalStorage } from '../lib/safe-json';

interface ComplianceSafetyTabProps {
  productHpp: ProductHpp[];
  onAddWasteLog?: (log: { id: string; bahanNama: string; qtyWasted: number; satuan: string; lossValue: number; location: string; reason: string; dateLogged: string }) => void;
  cabangList?: { id: string; nama: string }[];
  showConfirm: (opts: { title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: string; onConfirm: () => void; onCancel: () => void }) => void;
}

interface BatchItem {
  id: string;
  bahanNama: string;
  batchCode: string;
  expiredDate: string;
  qty: number;
  satuan: string;
  location: string; // Cabang / Pusat
  status: 'aman' | 'expired' | 'hampir_expired' | 'recall_temp';
}

export default function ComplianceSafetyTab({ productHpp, onAddWasteLog, cabangList = [], showConfirm }: ComplianceSafetyTabProps) {
  // ─── BATCH & EXPIRED TRACKING ───
  const [batchItems, setBatchItems] = useState<BatchItem[]>(() =>
    safeGetLocalStorage<BatchItem[]>('compliance_batch_items', [])
  );

  useEffect(() => {
    localStorage.setItem('compliance_batch_items', JSON.stringify(batchItems));
  }, [batchItems]);

  const [newBahan, setNewBahan] = useState('');
  const [newBatch, setNewBatch] = useState('');
  const [newExpired, setNewExpired] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newSatuan, setNewSatuan] = useState('kg');
  const [newLocation, setNewLocation] = useState('Pusat');
  const [showAddBatch, setShowAddBatch] = useState(false);

  // Auto-check expired every 30 seconds
  const [expiredItems, setExpiredItems] = useState<BatchItem[]>([]);
  const [autoWasteLog, setAutoWasteLog] = useState<{ batchId: string; bahanNama: string; qty: number; satuan: string; date: string }[]>(() =>
    safeGetLocalStorage<{ batchId: string; bahanNama: string; qty: number; satuan: string; date: string }[]>('compliance_auto_waste_log', [])
  );

  useEffect(() => {
    localStorage.setItem('compliance_auto_waste_log', JSON.stringify(autoWasteLog));
  }, [autoWasteLog]);

  // Check expired items
  useEffect(() => {
    const checkExpired = () => {
      const now = new Date();
      const expired: BatchItem[] = [];
      
      batchItems.forEach(item => {
        const expDate = new Date(item.expiredDate);
        const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) {
          // Already expired
          expired.push({ ...item, status: 'expired' });
        } else if (diffDays <= 7) {
          // Hampir expired (7 days)
          expired.push({ ...item, status: 'hampir_expired' });
        }
      });
      
      setExpiredItems(expired);
    };

    checkExpired();
    const interval = setInterval(checkExpired, 30000);
    return () => clearInterval(interval);
  }, [batchItems]);

  // Auto waste expired items — sync with global waste system
  const handleAutoWasteExpired = async () => {
    const expired = batchItems.filter(item => {
      const expDate = new Date(item.expiredDate);
      const now = new Date();
      return expDate <= now;
    });

    if (expired.length === 0) {
      alert('✅ Tidak ada bahan yang sudah expired.');
      return;
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      showConfirm({
        title: 'Konfirmasi',
        message: `Auto-waste ${expired.length} bahan yang sudah expired?\n\nBahan akan otomatis masuk ke log waste dengan keterangan "Expired - Recall Pangan".`,
        confirmLabel: 'Ya',
        cancelLabel: 'Batal',
        variant: 'warning',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) return;

    // Add to auto waste log
    const newWasteEntries = expired.map(item => ({
      batchId: item.id,
      bahanNama: item.bahanNama,
      qty: item.qty,
      satuan: item.satuan,
      date: new Date().toISOString(),
    }));

    setAutoWasteLog(prev => [...newWasteEntries, ...prev].slice(0, 100));

    // Sync to global waste system via onAddWasteLog
    if (onAddWasteLog) {
      expired.forEach(item => {
        const lossValue = item.qty * 1000; // Estimate loss value
        onAddWasteLog({
          id: `waste-recall-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          bahanNama: item.bahanNama,
          qtyWasted: item.qty,
          satuan: item.satuan,
          lossValue,
          location: item.location === 'Pusat' ? 'Gudang Utama' : `Cabang ${item.location}`,
          reason: `Expired - Recall Pangan (Batch: ${item.batchCode})`,
          dateLogged: new Date().toISOString(),
        });
      });
    }

    // Remove expired items from batch list
    setBatchItems(prev => prev.filter(item => {
      const expDate = new Date(item.expiredDate);
      const now = new Date();
      return expDate > now;
    }));

    showLocalToast(`${expired.length} bahan expired otomatis dipindah ke Waste Log (global).`, 'success');
  };

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBahan || !newBatch || !newExpired || !newQty) return;

    const newItem: BatchItem = {
      id: `batch-${Date.now()}`,
      bahanNama: newBahan.trim(),
      batchCode: newBatch.trim(),
      expiredDate: newExpired,
      qty: parseFloat(newQty) || 0,
      satuan: newSatuan,
      location: newLocation,
      status: 'aman',
    };

    setBatchItems(prev => [newItem, ...prev]);
    setNewBahan('');
    setNewBatch('');
    setNewExpired('');
    setNewQty('');
    setShowAddBatch(false);
    showLocalToast(`Batch ${newItem.batchCode} untuk ${newItem.bahanNama} terdaftar!`, 'success');
  };

  const handleDeleteBatch = async (id: string) => {
    const confirmed_158 = await new Promise<boolean>((resolve) => {
      showConfirm({
        title: 'Konfirmasi',
        message: 'Hapus batch ini?',
        confirmLabel: 'Ya',
        cancelLabel: 'Batal',
        variant: 'warning',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed_158) return;
    setBatchItems(prev => prev.filter(b => b.id !== id));
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  const getDaysLeft = (dateStr: string) => {
    const expDate = new Date(dateStr);
    const now = new Date();
    return Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  // Local toast
  const [localToast, setLocalToast] = useState<{ msg: string; type: string } | null>(null);
  const showLocalToast = (msg: string, type: string) => {
    setLocalToast({ msg, type });
    setTimeout(() => setLocalToast(null), 3000);
  };

  // ─── IoT TEMPERATURE MONITOR — Baca dari global IoT simulation di App.tsx ───
  const [iotDevices, setIotDevices] = useState<IoTDevice[]>([]);
  const [tempViolations, setTempViolations] = useState<IoTDevice[]>([]);
  const [recallTempLog, setRecallTempLog] = useState<{ id: string; deviceName: string; temp: number; threshold: number; time: string; resolved: boolean }[]>(() =>
    safeGetLocalStorage<{ id: string; deviceName: string; temp: number; threshold: number; time: string; resolved: boolean }[]>('compliance_recall_temp_log', [])
  );

  useEffect(() => {
    localStorage.setItem('compliance_recall_temp_log', JSON.stringify(recallTempLog));
  }, [recallTempLog]);

  // Poll IoT data setiap 5 detik
  useEffect(() => {
    const pollIoT = () => {
      const saved = safeGetLocalStorage<IoTDevice[]>('iot_device_data', []);
      if (saved.length > 0) {
        setIotDevices(saved);
        // Cari chiller/freezer yang overheat
        const violations = saved.filter(d => 
          d.type === 'freezer' && 
          d.status === 'warning'
        );
        setTempViolations(violations);
        
        // Catat violation baru (hanya jika belum tercatat dalam 5 menit terakhir)
        violations.forEach(v => {
          const existing = recallTempLog.find(
            l => l.deviceName === v.name && !l.resolved &&
            (Date.now() - new Date(l.time).getTime()) < 5 * 60 * 1000
          );
          if (!existing) {
            setRecallTempLog(prev => [{
              id: `temp-incident-${Date.now()}`,
              deviceName: v.name,
              temp: v.value,
              threshold: v.maxThreshold || 8,
              time: new Date().toISOString(),
              resolved: false,
            }, ...prev].slice(0, 50));
            
            // 🔄 AUTO-FLAG batch di lokasi chiller bermasalah (otomatis, tanpa klik)
            const chillerLocations = [...new Set(violations.map(v => v.location))];
            setBatchItems(prev => prev.map(b => 
              chillerLocations.some(l => b.location.includes(l)) && b.status === 'aman'
                ? { ...b, status: 'recall_temp' as const }
                : b
            ));
          }
        });
      }
    };
    pollIoT();
    const interval = setInterval(pollIoT, 5000);
    return () => clearInterval(interval);
  }, []);

  const hasActiveViolation = tempViolations.length > 0;

  const expiredCount = batchItems.filter(b => getDaysLeft(b.expiredDate) <= 0).length;
  const almostExpiredCount = batchItems.filter(b => {
    const days = getDaysLeft(b.expiredDate);
    return days > 0 && days <= 7;
  }).length;
  const recallTempCount = batchItems.filter(b => b.status === 'recall_temp').length;
  const totalWasteLoss = autoWasteLog.reduce((sum, w) => sum + (w.qty * 1000), 0); // Estimate loss value

  return (
    <div className="space-y-6">
      {localToast && (
        <div className={`px-4 py-2.5 rounded-xl text-xs font-bold text-center ${
          localToast.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
        }`}>{localToast.msg}</div>
      )}

      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" /> Recall Pangan & Tracking Expired
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Tracking batch expired, auto-waste bahan kadaluarsa, dan simulasi recall untuk keamanan pangan.
        </p>
      </div>

      {/* STAT CARDS — with IoT Temperature Recall */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
          <span className="text-[9px] uppercase font-bold text-gray-500 block">Total Batch</span>
          <span className="text-xl font-black text-gray-800 font-mono mt-1 block">{batchItems.length}</span>
        </div>
        <div className="bg-red-50 p-4 rounded-xl border border-red-100">
          <span className="text-[9px] uppercase font-bold text-red-700 block">⚠️ Expired</span>
          <span className="text-xl font-black text-red-700 font-mono mt-1 block animate-pulse">{expiredCount}</span>
        </div>
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
          <span className="text-[9px] uppercase font-bold text-amber-700 block">🟡 Hampir</span>
          <span className="text-xl font-black text-amber-700 font-mono mt-1 block">{almostExpiredCount}</span>
        </div>
        <div className={hasActiveViolation ? 'bg-rose-600 p-4 rounded-xl border border-rose-700 animate-pulse' : 'bg-white p-4 rounded-xl border border-gray-100 shadow-xs'}>
          <span className={`text-[9px] uppercase font-bold block ${hasActiveViolation ? 'text-white' : 'text-gray-500'}`}>
            <Thermometer className="w-3 h-3 inline mr-0.5" />{hasActiveViolation ? '⚠️ SUHU!' : 'Chiller'}
          </span>
          <span className={`text-xl font-black font-mono mt-1 block ${hasActiveViolation ? 'text-white' : 'text-gray-800'}`}>
            {iotDevices.filter(d => d.type === 'freezer').length > 0
              ? `${Math.min(...iotDevices.filter(d => d.type === 'freezer').map(d => d.value))}°`
              : '—'}
          </span>
        </div>
        <div className={`p-4 rounded-xl border ${recallTempCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-blue-50 border-blue-100'}`}>
          <span className={`text-[9px] uppercase font-bold block ${recallTempCount > 0 ? 'text-rose-700' : 'text-blue-700'}`}>
            {recallTempCount > 0 ? '🔴 Recall Suhu' : 'Waste Log'}
          </span>
          <span className={`text-xl font-black font-mono mt-1 block ${recallTempCount > 0 ? 'text-rose-700' : 'text-blue-800'}`}>
            {recallTempCount > 0 ? recallTempCount : autoWasteLog.length}
          </span>
        </div>
      </div>

      {/* ─── IoT TEMPERATURE MONITOR — Integrasi SmartKitchen → ComplianceSafety ─── */}
      {iotDevices.length > 0 && (
        <div className={`rounded-2xl border overflow-hidden transition-all ${
          hasActiveViolation ? 'bg-rose-50 border-rose-300 shadow-lg shadow-rose-200/50' : 'bg-white border-gray-100 shadow-xs'
        }`}>
          <div className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${hasActiveViolation ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                <Thermometer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  🧊 IoT Temperature Monitor
                  {hasActiveViolation && <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] rounded-full font-bold animate-pulse">ALERT</span>}
                </h3>
                <p className="text-[10px] text-gray-500">
                  {hasActiveViolation 
                    ? '🚨 Suhu chiller melebihi batas aman! Batch di lokasi terdampak perlu di-review.'
                    : 'Suhu chiller dalam batas aman. Monitoring otomatis dari sensor IoT.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {iotDevices.filter(d => d.type === 'freezer').map(d => (
                <div key={d.id} className={`px-2.5 py-1.5 rounded-lg border text-center min-w-[70px] ${
                  d.status === 'warning' ? 'bg-rose-100 border-rose-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <span className="text-[7px] uppercase font-bold text-gray-500 block">{d.name.split('(')[0].trim()}</span>
                  <span className={`text-sm font-black font-mono ${d.status === 'warning' ? 'text-rose-700' : d.value < 0 ? 'text-blue-700' : 'text-emerald-700'}`}>
                    {d.value}°
                  </span>
                  <span className="text-[7px] text-gray-400 block">Max: {d.maxThreshold}°</span>
                </div>
              ))}
            </div>
          </div>

          {hasActiveViolation && (
            <div className="px-4 pb-4 space-y-2">
              <div className="bg-rose-100 border border-rose-200 rounded-xl p-3 text-xs">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-800">🚨 Insiden Suhu Terdeteksi!</p>
                    <p className="text-rose-700 mt-1">
                      {tempViolations.map(v => (
                        <span key={v.id} className="block">
                          <strong>{v.name}</strong>: {v.value}{v.unit} (batas aman: {'>'}{v.maxThreshold}{v.unit}) — {v.location}
                        </span>
                      ))}
                    </p>
                    <p className="text-rose-600 mt-1 text-[10px]">
                      Batch di lokasi ini berpotensi terkontaminasi. Klik tombol di bawah untuk menandai batch untuk review recall.
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  // Flag semua batch di lokasi chiller sebagai recall_temp
                  const chillerLocations = [...new Set(tempViolations.map(v => v.location))];
                  setBatchItems(prev => prev.map(b => 
                    chillerLocations.some(l => b.location.includes(l)) && b.status !== 'expired' && b.status !== 'recall_temp'
                      ? { ...b, status: 'recall_temp' as const }
                      : b
                  ));
                  showLocalToast(`✅ Batch di lokasi chiller bermasalah ditandai untuk review recall!`, 'success');
                }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Tandai Batch untuk Review Recall
                </button>
                <button onClick={() => {
                  // Resolve all active temp violations
                  setRecallTempLog(prev => prev.map(l => !l.resolved ? { ...l, resolved: true } : l));
                  showLocalToast('✅ Insiden suhu ditandai sebagai selesai. Batch tetap perlu di-review manual.', 'info');
                }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition cursor-pointer">
                  Tandai Selesai
                </button>
              </div>
            </div>
          )}

          {/* Temperature Incident Log */}
          {recallTempLog.filter(l => !l.resolved).length > 0 && (
            <div className="border-t border-rose-200 p-3 bg-rose-50/50">
              <h4 className="text-[10px] uppercase font-bold text-rose-700 mb-2">📋 Log Insiden Suhu (Belum Selesai)</h4>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {recallTempLog.filter(l => !l.resolved).map(entry => (
                  <div key={entry.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-rose-100 text-[10px]">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-3 h-3 text-rose-600" />
                      <span className="font-semibold text-gray-800">{entry.deviceName}</span>
                      <span className="font-mono font-bold text-rose-700">{entry.temp}°C</span>
                      <span className="text-gray-400">{`(>${entry.threshold}°C)`}</span>
                    </div>
                    <span className="text-gray-400">{new Date(entry.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── BATCH TRACKING ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-600" /> Daftar Batch & Expired Date
            </h3>
            <p className="text-[10px] text-gray-500">Daftarkan batch bahan baku dengan tanggal expired untuk tracking otomatis.</p>
          </div>
          <div className="flex items-center gap-2">
            {expiredCount > 0 && (
              <button onClick={handleAutoWasteExpired}
                className="inline-flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold px-2.5 py-1.5 rounded-lg transition cursor-pointer">
                <AlertTriangle className="w-3 h-3" /> Auto-Waste {expiredCount} Expired
              </button>
            )}
            <button onClick={() => setShowAddBatch(!showAddBatch)}
              className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-2 rounded-xl transition cursor-pointer">
              + Daftarkan Batch
            </button>
          </div>
        </div>

        {/* Add Batch Form */}
        {showAddBatch && (
          <form onSubmit={handleAddBatch} className="p-4 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Nama Bahan</label>
                <input type="text" required value={newBahan} onChange={e => setNewBahan(e.target.value)}
                  placeholder="Tepung Terigu" className="w-full border border-gray-200 rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Kode Batch</label>
                <input type="text" required value={newBatch} onChange={e => setNewBatch(e.target.value)}
                  placeholder="BATCH-001" className="w-full border border-gray-200 rounded-lg p-2 font-mono" />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Expired Date</label>
                <input type="date" required value={newExpired} onChange={e => setNewExpired(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2" />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Qty</label>
                <input type="number" required min="0.1" step="0.1" value={newQty} onChange={e => setNewQty(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2 font-mono" />
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Satuan</label>
                <select value={newSatuan} onChange={e => setNewSatuan(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2">
                  <option value="kg">kg</option><option value="gr">gr</option>
                  <option value="liter">liter</option><option value="pcs">pcs</option>
                </select>
              </div>
              <div>
                <label className="block text-[9px] uppercase font-bold text-gray-500 mb-1">Lokasi</label>
                <select value={newLocation} onChange={e => setNewLocation(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg p-2">
                  <option value="Pusat">Dapur Pusat</option>
                  <option value="Cabang">Cabang</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button type="button" onClick={() => setShowAddBatch(false)}
                className="px-3 py-1.5 text-[10px] font-medium text-gray-500 hover:bg-gray-200 rounded-lg cursor-pointer">Batal</button>
              <button type="submit"
                className="px-3 py-1.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer">Simpan Batch</button>
            </div>
          </form>
        )}

        {/* Batch List */}
        {batchItems.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-10 h-10 text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-gray-500 font-semibold">Belum ada batch terdaftar</p>
            <p className="text-[10px] text-gray-400 mt-1">Daftarkan batch bahan baku untuk tracking expired dan recall.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse table-fixed">
              <thead>
                <tr className="border-b bg-gray-50 text-[10px] font-bold text-gray-500 uppercase">
                  <th className="px-4 py-3">Bahan</th>
                  <th className="px-4 py-3">Kode Batch</th>
                  <th className="px-4 py-3">Expired</th>
                  <th className="px-4 py-3 text-right">Hari Tersisa</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3">Lokasi</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {batchItems.map(item => {
                  const daysLeft = getDaysLeft(item.expiredDate);
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 ${
                      daysLeft <= 0 ? 'bg-red-50/50' : daysLeft <= 7 ? 'bg-amber-50/30' : ''
                    }`}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{item.bahanNama}</td>
                      <td className="px-4 py-3 font-mono text-gray-700">{item.batchCode}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">{formatDate(item.expiredDate)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold ${
                        daysLeft <= 0 ? 'text-red-700' : daysLeft <= 7 ? 'text-amber-700' : 'text-emerald-700'
                      }`}>{daysLeft <= 0 ? 'EXPIRED' : `${daysLeft} hari`}</td>
                      <td className="px-4 py-3 text-right font-mono">{item.qty} {item.satuan}</td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{item.location}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.status === 'recall_temp' ? (
                          <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 justify-center animate-pulse">
                            <Thermometer className="w-2.5 h-2.5" /> Recall Suhu
                          </span>
                        ) : daysLeft <= 0 ? (
                          <span className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 justify-center">
                            <AlertTriangle className="w-2.5 h-2.5" /> Expired
                          </span>
                        ) : daysLeft <= 7 ? (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">🟡 Hampir</span>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">✅ Aman</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleDeleteBatch(item.id)}
                          className="text-gray-400 hover:text-red-600 p-1 cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Info Auto-Waste */}
        <div className="p-3 bg-blue-50 border-t border-blue-100 text-[10px] text-blue-800">
          <strong>🤖 Auto-Waste System:</strong> Bahan yang sudah expired akan terdeteksi otomatis. Klik <strong>"Auto-Waste"</strong> untuk memindahkan bahan expired ke Waste Log. 
          Bahan yang sudah di-waste akan otomatis masuk ke Manajemen Waste dengan keterangan "Expired - Recall Pangan".
        </div>
      </div>

      {/* ─── AUTO WASTE LOG ─── */}
      {autoWasteLog.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Auto Waste Log (Expired → Waste)
            </h3>
          </div>
          <div className="divide-y divide-gray-100 max-h-[200px] overflow-y-auto">
            {autoWasteLog.map((entry, idx) => (
              <div key={entry.batchId + idx} className="p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-red-500">🗑️</span>
                  <div>
                    <span className="font-semibold text-gray-900">{entry.bahanNama}</span>
                    <span className="text-gray-400 ml-2">{entry.qty} {entry.satuan} — {new Date(entry.date).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
                <span className="text-[10px] text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full font-bold">Expired → Waste</span>
              </div>
            ))}
          </div>
          <div className="p-3 text-[10px] text-gray-500">
            Total: {autoWasteLog.length} entries — Data ini sudah masuk ke Manajemen Waste.
          </div>
        </div>
      )}

      {/* ─── RECALL SIMULATION ─── */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-red-600" /> Simulasi Recall — Penarikan Produk
        </h3>
        <p className="text-xs text-gray-500">Jika ada bahan terkontaminasi atau suhu chiller melebihi batas, sistem akan menandai batch untuk recall.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Skema Recall */}
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs space-y-2">
            <p className="font-bold text-red-800">🚨 Expired Recall:</p>
            <ol className="list-decimal ml-4 space-y-1 text-red-700">
              <li><strong>Deteksi:</strong> Bahan expired terdeteksi otomatis</li>
              <li><strong>Tracking:</strong> Sistem lacak batch di semua cabang</li>
              <li><strong>Recall:</strong> Batch ditarik dan masuk ke Waste Log</li>
              <li><strong>Laporan:</strong> Laporan recall untuk kepatuhan BPOM</li>
            </ol>
          </div>
          {/* Temperature Recall */}
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-xs space-y-2">
            <p className="font-bold text-rose-800 flex items-center gap-1.5">
              <Thermometer className="w-4 h-4" /> 🌡️ Temperature Recall:
            </p>
            <ol className="list-decimal ml-4 space-y-1 text-rose-700">
              <li><strong>Deteksi:</strong> Sensor IoT detect chiller overheat</li>
              <li><strong>Flag:</strong> Batch di lokasi ditandai "Recall Suhu"</li>
              <li><strong>Review:</strong> Operator review batch terdampak</li>
              <li><strong>Waste:</strong> Batch terkontaminasi masuk Waste Log</li>
            </ol>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {recallTempCount > 0 && (
            <button onClick={async () => {
              const flagged = batchItems.filter(b => b.status === 'recall_temp');
              if (flagged.length === 0) { alert('✅ Tidak ada batch recall suhu.'); return; }
              const confirmed_620 = await new Promise<boolean>((resolve) => {
                showConfirm({
                  title: 'Konfirmasi',
                  message: `Recall ${flagged.length} batch yang ditandai Recall Suhu?\n\nBatch akan dihapus dan masuk ke Auto Waste Log.`,
                  confirmLabel: 'Ya',
                  cancelLabel: 'Batal',
                  variant: 'warning',
                  onConfirm: () => resolve(true),
                  onCancel: () => resolve(false),
                });
              });
              if (!confirmed_620) return;
              const newWasteEntries = flagged.map(item => ({
                batchId: item.id,
                bahanNama: item.bahanNama,
                qty: item.qty,
                satuan: item.satuan,
                date: new Date().toISOString(),
              }));
              setAutoWasteLog(prev => [...newWasteEntries, ...prev].slice(0, 100));
              setBatchItems(prev => prev.filter(b => b.status !== 'recall_temp'));
              showLocalToast(`${flagged.length} batch recall suhu diproses!`, 'success');
            }}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5" /> Recall {recallTempCount} Batch Suhu
            </button>
          )}
          <button onClick={async () => {
            const expired = batchItems.filter(b => getDaysLeft(b.expiredDate) <= 0);
            if (expired.length === 0) {
              alert('✅ Tidak ada batch expired yang perlu di-recall.');
              return;
            }
            const confirmed_642 = await new Promise<boolean>((resolve) => {
              showConfirm({
                title: 'Konfirmasi',
                message: `Recall ${expired.length} batch expired?\n\nSemua batch expired akan ditandai untuk recall dan masuk ke Waste Log.`,
                confirmLabel: 'Ya',
                cancelLabel: 'Batal',
                variant: 'warning',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
              });
            });
            if (confirmed_642) {

              const newWasteEntries = expired.map(item => ({
                batchId: item.id,
                bahanNama: item.bahanNama,
                qty: item.qty,
                satuan: item.satuan,
                date: new Date().toISOString(),
              }));
              setAutoWasteLog(prev => [...newWasteEntries, ...prev].slice(0, 100));
              setBatchItems(prev => prev.filter(b => getDaysLeft(b.expiredDate) > 0));
              showLocalToast(`Batch expired berhasil di-recall!`, 'success');
            }
          }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition cursor-pointer">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> Recall Batch Expired
          </button>
          <button onClick={async () => {
            const confirmed_659 = await new Promise<boolean>((resolve) => {
              showConfirm({
                title: 'Konfirmasi',
                message: 'Hapus semua Auto Waste Log?',
                confirmLabel: 'Ya',
                cancelLabel: 'Batal',
                variant: 'warning',
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false),
              });
            });
            if (confirmed_659) {

              setAutoWasteLog([]);
              showLocalToast('Waste log dihapus.', 'info');
            }
          }}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition cursor-pointer">
            Hapus Waste Log
          </button>
        </div>
      </div>
    </div>
  );
}
