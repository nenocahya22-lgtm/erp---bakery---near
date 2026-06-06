import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, CheckCircle2, X, Bell,
  MessageSquare, Trash2, Send, Settings
} from 'lucide-react';
import { CalculationResult, BahanBaku } from '../types';

interface AlertItem {
  id: string;
  type: 'margin_danger' | 'margin_warning' | 'margin_high' | 'stock_critical' | 'stock_low' | 'system_error' | 'info';
  message: string;
  timestamp: string;
  dismissed: boolean;
}

interface WaNotification {
  id: string;
  type: string;
  platform: string;
  message: string;
  time: string;
  sent: boolean;
}

interface AlertSystemTabProps {
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
  hasUnsavedChanges: boolean;
  spreadsheetId: string | null;
}

export default function AlertSystemTab({ calculatedProducts, bahanBaku, hasUnsavedChanges, spreadsheetId }: AlertSystemTabProps) {
  const [activeView, setActiveView] = useState<'alerts' | 'wa_queue' | 'settings'>('alerts');
  const [waSettings, setWaSettings] = useState(() => {
    const saved = localStorage.getItem('wa_notification_settings');
    return saved ? JSON.parse(saved) : {
      phoneNumber: '',
      apiKey: '',
      autoSend: false,
      notifyOrderMasuk: true,
      notifyMarginWarning: true,
      notifyStockCritical: true,
    };
  });

  // Generate alerts from current system state
  const [alerts, setAlerts] = useState<AlertItem[]>(() => {
    const saved = localStorage.getItem('system_alerts_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [waNotifications, setWaNotifications] = useState<WaNotification[]>(() => {
    const saved = localStorage.getItem('wa_notification_queue');
    return saved ? JSON.parse(saved) : [];
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('system_alerts_data', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('wa_notification_queue', JSON.stringify(waNotifications));
  }, [waNotifications]);

  useEffect(() => {
    localStorage.setItem('wa_notification_settings', JSON.stringify(waSettings));
  }, [waSettings]);

  // Auto-generate alerts from system state every 10 seconds
  useEffect(() => {
    const checkAlerts = () => {
      const newAlerts: AlertItem[] = [];
      const now = new Date().toISOString();

      // Check margins
      calculatedProducts.forEach(p => {
        if (p.marginPersen < 0) {
          newAlerts.push({
            id: `margin-negative-${p.namaProduk}-${Date.now()}`,
            type: 'margin_danger',
            message: `🔴 MARGIN NEGATIF! "${p.namaProduk}" rugi ${Math.abs(p.marginPersen).toFixed(1)}% — HPP (${p.hppPerPorsi.toFixed(0)}) > Harga Jual (${p.hargaJualPerPorsi.toFixed(0)})`,
            timestamp: now,
            dismissed: false,
          });
        } else if (p.marginPersen < 5 && p.marginPersen >= 0) {
          newAlerts.push({
            id: `margin-low-${p.namaProduk}-${Date.now()}`,
            type: 'margin_danger',
            message: `⚠️ MARGEN KRITIS! "${p.namaProduk}" hanya ${p.marginPersen.toFixed(1)}% — di bawah 5%! Segera evaluasi harga atau biaya produksi.`,
            timestamp: now,
            dismissed: false,
          });
        } else if (p.marginPersen < 15) {
          newAlerts.push({
            id: `margin-warn-${p.namaProduk}-${Date.now()}`,
            type: 'margin_warning',
            message: `📉 Margin "${p.namaProduk}" ${p.marginPersen.toFixed(1)}% — di bawah 15%. Pertimbangkan efisiensi bahan atau naikkan harga.`,
            timestamp: now,
            dismissed: false,
          });
        } else if (p.marginPersen > 90) {
          newAlerts.push({
            id: `margin-high-${p.namaProduk}-${Date.now()}`,
            type: 'margin_high',
            message: `💰 Margin "${p.namaProduk}" ${p.marginPersen.toFixed(1)}% — sangat tinggi! Pastikan harga masih kompetitif.`,
            timestamp: now,
            dismissed: false,
          });
        }
      });

      // Check critical stock
      const criticalStock = bahanBaku.filter(b => b.isiKemasan < 50);
      criticalStock.forEach(b => {
        newAlerts.push({
          id: `stock-critical-${b.nama}-${Date.now()}`,
          type: 'stock_critical',
          message: `📦 STOK KRITIS! "${b.nama}" tersisa ${b.isiKemasan} ${b.satuan} — segera order!`,
          timestamp: now,
          dismissed: false,
        });
      });

      // Check low stock
      const lowStock = bahanBaku.filter(b => b.isiKemasan >= 50 && b.isiKemasan < 200);
      lowStock.forEach(b => {
        newAlerts.push({
          id: `stock-low-${b.nama}-${Date.now()}`,
          type: 'stock_low',
          message: `📦 Stok "${b.nama}" ${b.isiKemasan} ${b.satuan} — menipis, persiapkan pembelian.`,
          timestamp: now,
          dismissed: false,
        });
      });

      // Check system errors
      if (hasUnsavedChanges) {
        newAlerts.push({
          id: `unsaved-${Date.now()}`,
          type: 'system_error',
          message: '💾 Ada perubahan yang belum disimpan ke Google Sheets! Klik tombol Sinkronisasi di header.',
          timestamp: now,
          dismissed: false,
        });
      }

      setAlerts(prev => {
        // Merge new alerts with existing ones, avoid duplicates for the same product
        const existingIds = new Set<string>(prev.filter(a => !a.dismissed).map(a => a.id));
        const uniqueNew = newAlerts.filter(a => {
          // Check if similar alert already exists
          const key = a.id.split('-').slice(0, -1).join('-');
          return !Array.from(existingIds).some(eid => eid.startsWith(key));
        });
        if (uniqueNew.length === 0) return prev;
        return [...uniqueNew, ...prev].slice(0, 50); // Keep max 50
      });
    };

    // Initial check
    checkAlerts();
    // Periodic check every 30 seconds
    const interval = setInterval(checkAlerts, 30000);
    return () => clearInterval(interval);
  }, [calculatedProducts, bahanBaku, hasUnsavedChanges]);

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const markWaSent = (id: string) => {
    setWaNotifications(prev => prev.map(n => n.id === id ? { ...n, sent: true } : n));
  };

  const deleteWaNotification = (id: string) => {
    setWaNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllWa = () => {
    setWaNotifications([]);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const activeAlerts = alerts.filter(a => !a.dismissed);
  const dangerAlerts = activeAlerts.filter(a => a.type === 'margin_danger' || a.type === 'stock_critical');
  const warningAlerts = activeAlerts.filter(a => a.type === 'margin_warning' || a.type === 'stock_low' || a.type === 'margin_high');
  const systemAlerts = activeAlerts.filter(a => a.type === 'system_error');

  const pendingWa = waNotifications.filter(n => !n.sent);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-600" /> Sistem Monitoring & Alert
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Deteksi dini margin berbahaya, stok kritis, error sistem, dan notifikasi WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dangerAlerts.length > 0 && (
            <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-lg animate-pulse">
              {dangerAlerts.length} KRITIS
            </span>
          )}
          {warningAlerts.length > 0 && (
            <span className="px-2 py-1 bg-amber-500 text-white text-[10px] font-bold rounded-lg">
              {warningAlerts.length} Warning
            </span>
          )}
        </div>
      </div>

      {/* TAB NAV */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setActiveView('alerts')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeView === 'alerts' ? 'bg-amber-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}>
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1" /> Alert {activeAlerts.length > 0 && `(${activeAlerts.length})`}
        </button>
        <button onClick={() => setActiveView('wa_queue')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeView === 'wa_queue' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}>
          <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> WA Queue {pendingWa.length > 0 && `(${pendingWa.length})`}
        </button>
        <button onClick={() => setActiveView('settings')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeView === 'settings' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
          }`}>
          <Settings className="w-3.5 h-3.5 inline mr-1" /> Pengaturan
        </button>
      </div>

      {/* TAB: ALERTS */}
      {activeView === 'alerts' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-red-700">🔴 DANGER</span>
              <div className="text-2xl font-black text-red-800 mt-1">{dangerAlerts.length}</div>
              <span className="text-[10px] text-red-600">Margin negatif/kritis & stok habis</span>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-amber-700">🟡 WARNING</span>
              <div className="text-2xl font-black text-amber-800 mt-1">{warningAlerts.length}</div>
              <span className="text-[10px] text-amber-600">Margin rendah/tinggi & stok menipis</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
              <span className="text-[10px] uppercase font-bold text-blue-700">🔵 SYSTEM</span>
              <div className="text-2xl font-black text-blue-800 mt-1">{systemAlerts.length}</div>
              <span className="text-[10px] text-blue-600">Error sistem & perubahan belum disimpan</span>
            </div>
          </div>

          {/* Alert List */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Daftar Alert Aktif
              </h3>
              <button onClick={clearAllAlerts}
                className="text-[10px] text-red-500 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer">
                <Trash2 className="w-3 h-3" /> Hapus Semua
              </button>
            </div>

            {activeAlerts.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-200 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-semibold">✅ Semua Aman</p>
                <p className="text-xs text-gray-400 mt-1">Tidak ada alert aktif. Margin aman, stok terkendali.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {activeAlerts.map(alert => (
                  <div key={alert.id} className={`p-4 flex items-start gap-3 hover:bg-gray-50/50 transition ${
                    alert.type === 'margin_danger' || alert.type === 'stock_critical' ? 'bg-red-50/30' :
                    alert.type === 'system_error' ? 'bg-blue-50/30' : ''
                  }`}>
                    <span className="text-sm mt-0.5 shrink-0">
                      {alert.type === 'margin_danger' ? '🔴' : 
                       alert.type === 'stock_critical' ? '🔴' :
                       alert.type === 'margin_warning' ? '🟡' :
                       alert.type === 'stock_low' ? '🟡' :
                       alert.type === 'margin_high' ? '💰' :
                       alert.type === 'system_error' ? '🔵' : 'ℹ️'}
                    </span>
                    <div className="flex-1 text-xs">
                      <p className="text-gray-800 font-medium">{alert.message}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{formatTime(alert.timestamp)}</p>
                    </div>
                    <button onClick={() => dismissAlert(alert.id)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-700 cursor-pointer shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: WA QUEUE */}
      {activeView === 'wa_queue' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-600" /> Antrian Notifikasi WhatsApp
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400">{waNotifications.length} notif</span>
              <button onClick={clearAllWa}
                className="text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer">
                <Trash2 className="w-3 h-3 inline" /> Hapus Semua
              </button>
            </div>
          </div>

          {/* WA Settings status */}
          {!waSettings.phoneNumber && (
            <div className="mx-4 mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Nomor WhatsApp dan API Key belum diatur. Notifikasi hanya tersimpan di queue.
              <button onClick={() => setActiveView('settings')}
                className="font-bold underline ml-1 cursor-pointer">Atur sekarang →</button></span>
            </div>
          )}

          {waNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-semibold">Tidak Ada Notifikasi</p>
              <p className="text-xs text-gray-400 mt-1">Notifikasi order masuk akan muncul di sini.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
              {waNotifications.slice().reverse().map(n => (
                <div key={n.id} className={`p-4 flex items-start gap-3 hover:bg-gray-50/50 transition ${
                  n.sent ? 'opacity-60' : ''
                }`}>
                  <span className="text-sm mt-0.5 shrink-0">
                    {n.platform === 'GoFood' ? '🟢' : n.platform === 'GrabFood' ? '🟣' : n.platform === 'ShopeeFood' ? '🟠' : '🛎️'}
                  </span>
                  <div className="flex-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{n.platform}</span>
                      {n.sent ? (
                        <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">✅ TERKIRIM</span>
                      ) : (
                        <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-bold">⏳ ANTRIAN</span>
                      )}
                      <span className="text-[10px] text-gray-400">{formatTime(n.time)}</span>
                    </div>
                    <p className="text-gray-600 mt-1 whitespace-pre-wrap">{n.message}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {!n.sent && (
                      <button onClick={() => markWaSent(n.id)}
                        className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg cursor-pointer"
                        title="Tandai terkirim">
                        <Send className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={() => deleteWaNotification(n.id)}
                      className="p-1.5 bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-lg cursor-pointer"
                      title="Hapus">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendingWa.length > 0 && waSettings.phoneNumber && (
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button onClick={() => {
                if (window.confirm(`Kirim ${pendingWa.length} notifikasi ke ${waSettings.phoneNumber}?\n\nFitur ini membutuhkan API Key WhatsApp Gateway yang valid.\n\nUntuk sekarang, notifikasi akan ditandai sebagai terkirim.`)) {
                  pendingWa.forEach(n => markWaSent(n.id));
                }
              }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5">
                <Send className="w-3.5 h-3.5" /> Kirim {pendingWa.length} Notifikasi ke WA ({waSettings.phoneNumber})
              </button>
              <p className="text-[9px] text-gray-400 text-center mt-1.5">
                Integrasi WA Gateway akan aktif setelah Anda set API key WhatsApp di panel Pengaturan.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB: SETTINGS */}
      {activeView === 'settings' && (
        <div className="space-y-4">
          {/* Margin Alert Thresholds */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Batas Alert Sistem</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                <span className="block font-bold text-red-800">🔴 DANGER</span>
                <span className="text-lg font-black text-red-700">Margin &lt; 5%</span>
                <p className="text-[10px] text-red-600 mt-1">Margin di bawah 5% — bahaya!</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="block font-bold text-amber-800">🟡 WARNING</span>
                <span className="text-lg font-black text-amber-700">Margin 5-15%</span>
                <p className="text-[10px] text-amber-600 mt-1">Perlu evaluasi harga/bahan</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <span className="block font-bold text-blue-800">💰 HIGH</span>
                <span className="text-lg font-black text-blue-700">Margin &gt; 90%</span>
                <p className="text-[10px] text-blue-600 mt-1">Cek kompetitor — terlalu tinggi?</p>
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-700">📦 Stok Kritis: &lt; 50 unit</p>
              <p className="font-bold text-slate-700">📦 Stok Menipis: &lt; 200 unit</p>
              <p className="text-slate-500 text-[10px] mt-1">Alert diperbarui otomatis setiap 30 detik.</p>
            </div>
          </div>

          {/* WhatsApp Settings */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-emerald-600" /> Pengaturan Notifikasi WhatsApp
            </h3>
            <p className="text-xs text-gray-500">
              Atur nomor WhatsApp yang akan menerima notifikasi order masuk, margin warning, dan stok kritis.
              Biarkan kosong jika belum ingin menggunakan fitur ini.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Nomor WhatsApp (dengan kode negara)</label>
                <input type="text" value={waSettings.phoneNumber}
                  onChange={(e) => setWaSettings({ ...waSettings, phoneNumber: e.target.value })}
                  placeholder="Contoh: 6281234567890"
                  className="w-full border border-gray-200 rounded-lg p-2.5 font-mono" />
                <p className="text-[9px] text-gray-400 mt-0.5">Format: kode negara + nomor, tanpa + atau spasi</p>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">API Key WhatsApp Gateway</label>
                <input type="password" value={waSettings.apiKey}
                  onChange={(e) => setWaSettings({ ...waSettings, apiKey: e.target.value })}
                  placeholder="Kosongi jika belum punya"
                  className="w-full border border-gray-200 rounded-lg p-2.5 font-mono" />
                <p className="text-[9px] text-gray-400 mt-0.5">API Key dari layanan WhatsApp Gateway Anda</p>
              </div>
            </div>

            {/* Notification Toggles */}
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase font-bold text-gray-500">Notifikasi yang Aktif</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer text-xs">
                  <input type="checkbox" checked={waSettings.notifyOrderMasuk}
                    onChange={(e) => setWaSettings({ ...waSettings, notifyOrderMasuk: e.target.checked })}
                    className="accent-emerald-600 cursor-pointer" />
                  <span>🛎️ Order Masuk</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer text-xs">
                  <input type="checkbox" checked={waSettings.notifyMarginWarning}
                    onChange={(e) => setWaSettings({ ...waSettings, notifyMarginWarning: e.target.checked })}
                    className="accent-amber-600 cursor-pointer" />
                  <span>📉 Margin Warning</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer text-xs">
                  <input type="checkbox" checked={waSettings.notifyStockCritical}
                    onChange={(e) => setWaSettings({ ...waSettings, notifyStockCritical: e.target.checked })}
                    className="accent-red-600 cursor-pointer" />
                  <span>📦 Stok Kritis</span>
                </label>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <p className="text-[10px] text-gray-400">
                {waSettings.phoneNumber
                  ? `✅ Notifikasi akan dikirim ke ${waSettings.phoneNumber}`
                  : '⏸️ Notifikasi WA nonaktif — isi nomor untuk mengaktifkan'}
              </p>
              <button onClick={() => {
                if (window.confirm('Reset semua pengaturan notifikasi?')) {
                  setWaSettings({
                    phoneNumber: '',
                    apiKey: '',
                    autoSend: false,
                    notifyOrderMasuk: true,
                    notifyMarginWarning: true,
                    notifyStockCritical: true,
                  });
                }
              }} className="text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer">
                Reset
              </button>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Status Sistem</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                {spreadsheetId ? (
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                ) : (
                  <span className="w-3 h-3 rounded-full bg-gray-400 shrink-0" />
                )}
                <div>
                  <p className="font-bold text-gray-900">Google Sheets</p>
                  <p className="text-gray-500">{spreadsheetId ? 'Terhubung & auto-sync aktif' : 'Mode offline (local storage)'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                {calculatedProducts.length > 0 ? (
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                ) : (
                  <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                )}
                <div>
                  <p className="font-bold text-gray-900">Kalkulasi HPP</p>
                  <p className="text-gray-500">{calculatedProducts.length} produk aktif</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                {bahanBaku.length > 0 ? (
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                ) : (
                  <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0" />
                )}
                <div>
                  <p className="font-bold text-gray-900">Bahan Baku</p>
                  <p className="text-gray-500">{bahanBaku.length} bahan terdaftar</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                {hasUnsavedChanges ? (
                  <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse shrink-0" />
                ) : (
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                )}
                <div>
                  <p className="font-bold text-gray-900">Data Tersimpan</p>
                  <p className="text-gray-500">{hasUnsavedChanges ? 'Ada perubahan belum disimpan' : 'Semua tersimpan'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
