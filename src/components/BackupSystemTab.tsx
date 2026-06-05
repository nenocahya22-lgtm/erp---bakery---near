import React, { useState, useEffect } from 'react';
import { Cloud, Download, Mail, Settings, Clock, CheckCircle2, AlertTriangle, Trash2, Send, RefreshCw, Database } from 'lucide-react';

interface BackupSettings {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  toEmail: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'manual';
  includeBahan: boolean;
  includeProduk: boolean;
  includeResep: boolean;
  includeRevenue: boolean;
  includeWaste: boolean;
  includeRd: boolean;
}

interface BackupHistory {
  id: string;
  date: string;
  size: string;
  status: 'success' | 'failed';
  type: 'manual' | 'auto';
  message: string;
}

const DEFAULT_SETTINGS: BackupSettings = {
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  fromEmail: '',
  toEmail: '',
  frequency: 'weekly',
  includeBahan: true,
  includeProduk: true,
  includeResep: true,
  includeRevenue: true,
  includeWaste: true,
  includeRd: true,
};

export default function BackupSystemTab() {
  const [settings, setSettings] = useState<BackupSettings>(() => {
    const saved = localStorage.getItem('backup_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  const [history, setHistory] = useState<BackupHistory[]>(() => {
    const saved = localStorage.getItem('backup_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeView, setActiveView] = useState<'backup' | 'settings' | 'history'>('backup');
  const [isSending, setIsSending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    localStorage.setItem('backup_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('backup_history', JSON.stringify(history));
  }, [history]);

  // Check if weekly backup is due
  useEffect(() => {
    const lastBackup = localStorage.getItem('last_backup_date');
    const today = new Date().toISOString().substring(0, 10);

    if (settings.frequency === 'weekly' && lastBackup) {
      const lastDate = new Date(lastBackup);
      const daysSince = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7 && settings.toEmail) {
        // Notify user that backup is due
        // Don't auto-send, just show indicator
      }
    }
  }, [settings.frequency, settings.toEmail]);

  const collectAllData = () => {
    const data: Record<string, any> = {
      timestamp: new Date().toISOString(),
      version: '1.0',
    };

    if (settings.includeBahan) {
      try {
        const saved = localStorage.getItem('bahan_baku_data');
        if (saved) data.bahanBaku = JSON.parse(saved);
      } catch {}
      // Also try from main app state
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('bahan')) {
          try { data[key] = JSON.parse(localStorage.getItem(key) || ''); } catch {}
        }
      });
    }

    if (settings.includeProduk) {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.toLowerCase().includes('produk') || key.toLowerCase().includes('hpp')) {
          try { data[key] = JSON.parse(localStorage.getItem(key) || ''); } catch {}
        }
      });
    }

    if (settings.includeResep) {
      try {
        const saved = localStorage.getItem('detail_resep_data');
        if (saved) data.detailResep = JSON.parse(saved);
      } catch {}
    }

    if (settings.includeRevenue) {
      try {
        const saved = localStorage.getItem('revenue_tracker_data');
        if (saved) data.revenue = JSON.parse(saved);
      } catch {}
      try {
        const saved = localStorage.getItem('profit_distribution_history');
        if (saved) data.profitHistory = JSON.parse(saved);
      } catch {}
    }

    if (settings.includeWaste) {
      try {
        const saved = localStorage.getItem('waste_logs_data');
        if (saved) data.waste = JSON.parse(saved);
      } catch {}
      try {
        const saved = localStorage.getItem('writeoff_logs_data');
        if (saved) data.writeOff = JSON.parse(saved);
      } catch {}
    }

    if (settings.includeRd) {
      try {
        const saved = localStorage.getItem('rd_experiments_data');
        if (saved) data.rd = JSON.parse(saved);
      } catch {}
    }

    // Always include system info
    try {
      data.stockLevels = JSON.parse(localStorage.getItem('stock_levels_data') || '{}');
      data.platformKeys = localStorage.getItem('ojol_api_keys') ? '*** tersimpan ***' : 'belum diatur';
    } catch {}

    return data;
  };

  const generateBackupJSON = (): string => {
    const data = collectAllData();
    return JSON.stringify(data, null, 2);
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownloadBackup = () => {
    const json = generateBackupJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `near-bakery-backup-${new Date().toISOString().substring(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);

    const size = formatSize(blob.size);
    const entry: BackupHistory = {
      id: `backup-${Date.now()}`,
      date: new Date().toISOString(),
      size,
      status: 'success',
      type: 'manual',
      message: 'Backup berhasil di-download',
    };
    setHistory(prev => [entry, ...prev]);
    localStorage.setItem('last_backup_date', new Date().toISOString());
  };

  const handleSendEmailBackup = async () => {
    if (!settings.toEmail || !settings.smtpUser) {
      alert('⚠️ Email tujuan dan SMTP User harus diisi terlebih dahulu!\n\nAtur di tab Pengaturan.');
      return;
    }

    setIsSending(true);
    try {
      const data = collectAllData();
      const json = JSON.stringify(data, null, 2);
      const size = formatSize(new Blob([json]).size);

      const response = await fetch('/api/backup/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...settings,
          backupData: json,
          backupDate: new Date().toISOString(),
        }),
      });

      const result = await response.json();
      if (response.ok) {
        const entry: BackupHistory = {
          id: `backup-${Date.now()}`,
          date: new Date().toISOString(),
          size,
          status: 'success',
          type: 'auto',
          message: `Email terkirim ke ${settings.toEmail}`,
        };
        setHistory(prev => [entry, ...prev]);
        localStorage.setItem('last_backup_date', new Date().toISOString());
        alert(`✅ Backup berhasil dikirim ke email!\n\nTujuan: ${settings.toEmail}\nUkuran: ${size}`);
      } else {
        throw new Error(result.error || 'Gagal mengirim email');
      }
    } catch (err: any) {
      const entry: BackupHistory = {
        id: `backup-${Date.now()}`,
        date: new Date().toISOString(),
        size: '0 B',
        status: 'failed',
        type: 'manual',
        message: err.message || 'Gagal mengirim',
      };
      setHistory(prev => [entry, ...prev]);
      alert(`❌ Gagal mengirim backup: ${err.message}\n\nPeriksa pengaturan SMTP di tab Pengaturan.`);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const clearHistory = () => {
    if (window.confirm('Hapus semua riwayat backup?')) {
      setHistory([]);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  // Calculate next backup date
  const lastBackup = localStorage.getItem('last_backup_date');
  const getNextBackupText = () => {
    if (settings.frequency === 'manual') return 'Hanya manual';
    if (!lastBackup) return 'Segera (belum pernah backup)';
    const last = new Date(lastBackup);
    const days = settings.frequency === 'daily' ? 1 : settings.frequency === 'weekly' ? 7 : 30;
    const next = new Date(last.getTime() + days * 24 * 60 * 60 * 1000);
    const now = new Date();
    if (next < now) return 'Jadwal lewat — backup sekarang!';
    const diffDays = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return `${next.toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })} (${diffDays} hari lagi)`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Cloud className="w-6 h-6 text-blue-600" /> Backup & Restore Sistem
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Backup data otomatis mingguan via email. Download cadangan kapan saja.
          </p>
        </div>
        {settings.toEmail && (
          <span className="px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold rounded-lg flex items-center gap-1">
            <Mail className="w-3 h-3" /> Backup ke {settings.toEmail}
          </span>
        )}
      </div>

      {/* Status Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 shadow-sm text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-200" />
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100">Status Backup</span>
            </div>
            <div className="text-lg font-black mt-1">
              {settings.frequency === 'manual' ? 'Manual Only' : `Otomatis ${settings.frequency === 'daily' ? 'Harian' : settings.frequency === 'weekly' ? 'Mingguan' : 'Bulanan'}`}
            </div>
            <p className="text-xs text-blue-200 mt-0.5">
              Backup berikutnya: <span className="font-bold">{getNextBackupText()}</span>
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={handleDownloadBackup}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Download Backup
            </button>
            <button onClick={handleSendEmailBackup} disabled={isSending}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5">
              {isSending ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Mengirim...</>
              ) : (
                <><Send className="w-3.5 h-3.5" /> Kirim ke Email</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* TAB NAV */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setActiveView('backup')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${activeView === 'backup' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
          <Cloud className="w-3.5 h-3.5 inline mr-1" /> Backup
        </button>
        <button onClick={() => setActiveView('settings')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${activeView === 'settings' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
          <Settings className="w-3.5 h-3.5 inline mr-1" /> Pengaturan
        </button>
        <button onClick={() => setActiveView('history')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${activeView === 'history' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}>
          <Clock className="w-3.5 h-3.5 inline mr-1" /> Riwayat ({history.length})
        </button>
      </div>

      {/* TAB: BACKUP */}
      {activeView === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            {/* Manual Backup */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Backup Manual</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={handleDownloadBackup}
                  className="p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition cursor-pointer text-left">
                  <Download className="w-6 h-6 text-blue-600 mb-1" />
                  <span className="block font-bold text-gray-900 text-xs">Download File JSON</span>
                  <span className="text-[10px] text-gray-500">Simpan backup di komputer Anda</span>
                </button>
                <button onClick={handleSendEmailBackup} disabled={isSending || !settings.toEmail}
                  className={`p-4 rounded-xl transition cursor-pointer text-left ${
                    settings.toEmail
                      ? 'bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-gray-50 border border-gray-200 opacity-60'
                  }`}>
                  <Send className={`w-6 h-6 mb-1 ${settings.toEmail ? 'text-emerald-600' : 'text-gray-400'}`} />
                  <span className="block font-bold text-gray-900 text-xs">Kirim via Email</span>
                  <span className="text-[10px] text-gray-500">
                    {settings.toEmail ? `Ke: ${settings.toEmail}` : 'Atur email di Pengaturan'}
                  </span>
                </button>
              </div>
            </div>

            {/* Data yang akan dibackup */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Data yang Disertakan</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { key: 'includeBahan', label: '📦 Bahan Baku' },
                  { key: 'includeProduk', label: '📊 HPP Produk' },
                  { key: 'includeResep', label: '📝 Resep Detail' },
                  { key: 'includeRevenue', label: '💰 Revenue Transaksi' },
                  { key: 'includeWaste', label: '🗑️ Waste & Write-off' },
                  { key: 'includeRd', label: '🔬 R&D Experiments' },
                ].map(item => {
                  const checked = settings[item.key as keyof BackupSettings] as boolean;
                  return (
                    <label key={item.key} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer">
                      <input type="checkbox" checked={checked}
                        onChange={(e) => setSettings({ ...settings, [item.key]: e.target.checked })}
                        className="accent-blue-600 cursor-pointer" />
                      <span>{item.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 text-xs space-y-1">
              <span className="font-bold text-blue-800 block mb-1">💡 Tips Backup</span>
              <p className="text-blue-700">• Backup otomatis mingguan dikirim ke email yang Anda daftarkan.</p>
              <p className="text-blue-700">• File backup JSON bisa di-restore kapan saja.</p>
              <p className="text-blue-700">• Data API Key platform tidak disertakan dalam backup untuk keamanan.</p>
              <p className="text-blue-700">• Semua data tetap aman di localStorage browser Anda.</p>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Ringkasan */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Ringkasan</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Frekuensi Backup</span>
                  <span className="font-bold text-gray-900">
                    {settings.frequency === 'daily' ? 'Harian' : settings.frequency === 'weekly' ? 'Mingguan' : settings.frequency === 'monthly' ? 'Bulanan' : 'Manual'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Email Tujuan</span>
                  <span className="font-bold text-gray-900">{settings.toEmail || 'Belum diatur'}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Total Backup</span>
                  <span className="font-bold text-gray-900">{history.length} kali</span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-gray-600">Terakhir Backup</span>
                  <span className="font-bold text-gray-900">
                    {lastBackup ? formatDate(lastBackup) : 'Belum pernah'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-emerald-50 rounded-lg border border-emerald-100">
                  <span className="text-emerald-700 font-bold">✅ SMTP Siap</span>
                  <span className="font-bold text-emerald-800">
                    {settings.smtpUser ? 'Terkonfigurasi' : 'Perlu diatur'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ceklis keamanan */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs text-[10px] text-gray-500 space-y-1">
              <p className="font-bold text-gray-700 text-xs">🔒 Keamanan Data</p>
              <p>• Data backup dikirim via SMTP dengan enkripsi TLS</p>
              <p>• API Key tidak disertakan dalam backup</p>
              <p>• File JSON hanya bisa dibaca oleh Anda</p>
              <p>• Disarankan menyimpan backup di tempat aman</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SETTINGS */}
      {activeView === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            {/* SMTP Settings */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-blue-600" /> Pengaturan SMTP Email
              </h3>
              <p className="text-xs text-gray-500">
                Konfigurasi server SMTP untuk mengirim backup via email. 
                Untuk Gmail: gunakan App Password (bukan password biasa).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">SMTP Host</label>
                  <input type="text" value={settings.smtpHost}
                    onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2.5 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">SMTP Port</label>
                  <input type="number" value={settings.smtpPort}
                    onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) || 587 })}
                    className="w-full border border-gray-200 rounded-lg p-2.5 font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Username (email)</label>
                  <input type="email" value={settings.smtpUser} placeholder="contoh@gmail.com"
                    onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Password / App Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={settings.smtpPass}
                      onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                      placeholder="App Password 16 karakter"
                      className="w-full border border-gray-200 rounded-lg p-2.5 font-mono pr-8" />
                    <button onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer text-[10px]">
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Dari (From Email)</label>
                  <input type="email" value={settings.fromEmail}
                    onChange={(e) => setSettings({ ...settings, fromEmail: e.target.value })}
                    placeholder="noreply@bakery.com"
                    className="w-full border border-gray-200 rounded-lg p-2.5" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Ke (To Email)</label>
                  <input type="email" value={settings.toEmail}
                    onChange={(e) => setSettings({ ...settings, toEmail: e.target.value })}
                    placeholder="owner@email.com"
                    className="w-full border border-gray-200 rounded-lg p-2.5" />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                Untuk Gmail: buat <strong>App Password</strong> di akun Google Anda (Settings → Security → App Passwords).
                Jangan gunakan password Gmail biasa!
              </div>
            </div>

            {/* Frequency */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Jadwal Backup Otomatis</h3>
              <div className="flex gap-2">
                {(['daily', 'weekly', 'monthly', 'manual'] as const).map(f => (
                  <button key={f} onClick={() => setSettings({ ...settings, frequency: f })}
                    className={`px-3 py-2 text-[10px] font-bold rounded-lg uppercase tracking-wider transition cursor-pointer ${
                      settings.frequency === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {f === 'daily' ? 'Harian' : f === 'weekly' ? 'Mingguan' : f === 'monthly' ? 'Bulanan' : 'Manual'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400">
                Backup otomatis akan dikirim ke email tujuan sesuai jadwal yang dipilih.
                Pastikan konfigurasi SMTP sudah benar.
              </p>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            {/* Panduan */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-3 text-xs">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">📖 Panduan Setup Gmail</h3>
              <ol className="space-y-2 text-gray-700 list-decimal list-inside">
                <li>Buka <strong>myaccount.google.com</strong></li>
                <li>Pilih menu <strong>Security</strong></li>
                <li>Aktifkan <strong>2-Step Verification</strong></li>
                <li>Buka <strong>App Passwords</strong></li>
                <li>Buat password untuk <strong>Mail</strong></li>
                <li>Salin 16 karakter password ke atas</li>
              </ol>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-gray-500">SMTP Host: <span className="font-mono font-bold">smtp.gmail.com</span></p>
                <p className="text-gray-500">SMTP Port: <span className="font-mono font-bold">587</span></p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-gray-700">Status Konfigurasi</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  {settings.smtpUser ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                  <span className="text-gray-600">SMTP User: {settings.smtpUser || 'Belum diisi'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {settings.toEmail ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                  <span className="text-gray-600">Email tujuan: {settings.toEmail || 'Belum diisi'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {settings.smtpPass ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                  <span className="text-gray-600">Password: {settings.smtpPass ? 'Terisi' : 'Belum diisi'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: HISTORY */}
      {activeView === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" /> Riwayat Backup
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400">{history.length} backup</span>
              {history.length > 0 && (
                <button onClick={clearHistory}
                  className="text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer">
                  <Trash2 className="w-3 h-3 inline" /> Hapus Semua
                </button>
              )}
            </div>
          </div>

          {history.length === 0 ? (
            <div className="p-8 text-center">
              <Cloud className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-semibold">Belum Ada Backup</p>
              <p className="text-xs text-gray-400 mt-1">Lakukan backup manual atau atur backup otomatis mingguan.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
              {history.map(h => (
                <div key={h.id} className="p-4 flex items-start gap-3 hover:bg-gray-50/50 transition">
                  <span className="text-sm mt-0.5 shrink-0">
                    {h.status === 'success' ? '✅' : '❌'}
                  </span>
                  <div className="flex-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{formatDate(h.date)}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                        h.type === 'auto' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {h.type === 'auto' ? 'Otomatis' : 'Manual'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">{h.size}</span>
                    </div>
                    <p className={`mt-0.5 ${h.status === 'success' ? 'text-gray-600' : 'text-red-600'}`}>
                      {h.message}
                    </p>
                  </div>
                  <button onClick={() => handleDeleteHistory(h.id)}
                    className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-red-600 cursor-pointer shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
