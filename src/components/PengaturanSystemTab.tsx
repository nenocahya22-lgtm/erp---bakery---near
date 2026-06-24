import { useState, useEffect } from 'react';
import {
  Settings, Moon, Sun, Monitor, Globe, Bell, Shield, Database, Palette, Save,
  RefreshCw, Printer, Download, Upload, KeyRound, Store, Wifi, WifiOff,
  CheckCircle2, XCircle, FileSpreadsheet, Eye, EyeOff, Lock, User, Trash2,
  AlertTriangle, Smartphone,
} from 'lucide-react';
import { hashPassword, verifyPassword, isPbkdf2Hash, bytesToHex } from '../lib/password';
import {
  isWebSerialSupported, isPrinterConnected,
  connectPrinter, disconnectPrinter,
} from '../lib/printer-webserial';
import { cetakStrukThermal } from '../lib/printer';
import { getAccessToken, logout as googleLogout } from '../lib/firebase';
import { extractSpreadsheetId } from '../lib/sheets';
import { auth } from '../lib/firebase';

interface PengaturanSystemTabProps {
  showToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  spreadsheetId?: string | null;
  onWipeAllData?: () => void;
}

const DATA_KEYS = [
  'bahan_baku_data', 'product_hpp_data', 'detail_resep_data',
  'cabang_list_data', 'surat_orders_data', 'waste_logs_data',
  'writeoff_logs_data', 'rd_experiments_data', 'toppings_data',
  'cabang_stok_data', 'branch_transactions_data', 'opname_drafts_data',
  'revenue_tracker_data', 'pos_orders_data',
] as const;

export default function PengaturanSystemTab({ showToast, spreadsheetId, onWipeAllData }: PengaturanSystemTabProps) {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() =>
    (localStorage.getItem('app_theme') as 'light' | 'dark' | 'system') || 'system'
  );
  const [language, setLanguage] = useState(() => localStorage.getItem('app_language') || 'id');
  const [notifications, setNotifications] = useState(() => localStorage.getItem('app_notifications') !== 'false');
  const [autoSaveInterval, setAutoSaveInterval] = useState(() => parseInt(localStorage.getItem('app_autosave_interval') || '120'));

  const [printerConnected, setPrinterConnected] = useState(false);
  const [wsSupported, setWsSupported] = useState(false);
  const [printerMode, setPrinterMode] = useState(() => localStorage.getItem('printer_mode') || 'webserial');
  const [printerPort, setPrinterPort] = useState(() => localStorage.getItem('printer_port') || 'COM11');

  const [showChangePass, setShowChangePass] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [dbFirestoreStatus, setDbFirestoreStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [dbSheetsStatus, setDbSheetsStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  const [showConfirmWipe, setShowConfirmWipe] = useState(false);
  const [wipeStep, setWipeStep] = useState(0);

  const [storeName, setStoreName] = useState(() => localStorage.getItem('store_name') || 'Near Bakery & Co.');
  const [storeAddress, setStoreAddress] = useState(() => localStorage.getItem('store_address') || '');
  const [storePhone, setStorePhone] = useState(() => localStorage.getItem('store_phone') || '');
  const [storeFooter, setStoreFooter] = useState(() => localStorage.getItem('store_footer') || 'Terima Kasih — Near Bakery & Co.');

  useEffect(() => {
    setWsSupported(isWebSerialSupported());
    setPrinterConnected(isPrinterConnected());
    const interval = setInterval(() => setPrinterConnected(isPrinterConnected()), 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkFirestore = async () => {
      try {
        if (auth?.currentUser) {
          setDbFirestoreStatus('connected');
        } else {
          setDbFirestoreStatus('disconnected');
        }
      } catch { setDbFirestoreStatus('disconnected'); }
    };
    checkFirestore();
    const interval = setInterval(checkFirestore, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const checkSheets = async () => {
      try {
        const token = await getAccessToken();
        setGoogleToken(token);
        setDbSheetsStatus(token ? 'connected' : 'disconnected');
      } catch { setDbSheetsStatus('disconnected'); }
    };
    checkSheets();
  }, []);

  const handleSaveTheme = (val: 'light' | 'dark' | 'system') => {
    setTheme(val);
    localStorage.setItem('app_theme', val);
    showToast?.('Tema berhasil disimpan', 'success');
  };

  const handleSaveLanguage = (val: string) => {
    setLanguage(val);
    localStorage.setItem('app_language', val);
    showToast?.('Bahasa berhasil disimpan', 'success');
  };

  const handleToggleNotifications = () => {
    const val = !notifications;
    setNotifications(val);
    localStorage.setItem('app_notifications', String(val));
    showToast?.(val ? 'Notifikasi diaktifkan' : 'Notifikasi dimatikan', 'info');
  };

  const handleSaveAutoSave = (val: number) => {
    setAutoSaveInterval(val);
    localStorage.setItem('app_autosave_interval', String(val));
    showToast?.('Interval auto-save diperbarui', 'success');
  };

  const handleClearCache = () => {
    const imgKeys = Object.keys(localStorage).filter(k => k.startsWith('recipe_img_'));
    imgKeys.forEach(k => localStorage.removeItem(k));
    showToast?.(`${imgKeys.length} cache gambar dibersihkan`, 'success');
  };

  // ─── LOCALSTORAGE SIZE CHECK ───
  const [localStorageSize, setLocalStorageSize] = useState<string>('');
  const [localStorageWarnings, setLocalStorageWarnings] = useState<string[]>([]);

  useEffect(() => {
    const checkStorage = () => {
      try {
        let totalBytes = 0;
        const warnings: string[] = [];
        const largeKeys: { key: string; sizeKB: number }[] = [];

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          const value = localStorage.getItem(key) || '';
          const sizeBytes = key.length + value.length;
          totalBytes += sizeBytes;

          if (sizeBytes > 100 * 1024) {
            // Warning untuk data > 100KB
            largeKeys.push({ key, sizeKB: Math.round(sizeBytes / 1024) });
          }
        }

        const totalKB = Math.round(totalBytes / 1024);
        const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
        setLocalStorageSize(`${totalKB} KB (${totalMB} MB)`);

        // Peringatan jika mendekati batas 5MB
        const LIMIT_BYTES = 5 * 1024 * 1024;
        if (totalBytes > LIMIT_BYTES * 0.8) {
          warnings.push(`⚠️ Penyimpanan hampir penuh! ${totalMB} MB dari ~5 MB. Backup & hapus data yang tidak perlu.`);
        }

        largeKeys.forEach(k => {
          warnings.push(`📦 Data besar: "${k.key}" = ${k.sizeKB} KB — pertimbangkan untuk hapus atau backup.`);
        });

        setLocalStorageWarnings(warnings);
      } catch (e) {
        console.warn('Gagal cek ukuran localStorage:', e);
      }
    };

    checkStorage();
  }, []);

  const handleResetTutorial = () => {
    localStorage.removeItem('hide_landing');
    localStorage.removeItem('last_visit_date');
    showToast?.('Onboarding di-reset', 'info');
  };

  const handlePrinterConnect = async () => {
    if (printerConnected) {
      await disconnectPrinter();
      setPrinterConnected(false);
      showToast?.('Printer diputuskan', 'info');
    } else {
      const result = await connectPrinter();
      if (result.success) {
        setPrinterConnected(true);
        showToast?.('✅ Printer terhubung!', 'success');
      } else {
        showToast?.('❌ ' + result.message, 'error');
      }
    }
  };

  const handlePrinterTest = async () => {
    try {
      const res = await fetch('/api/printer/test', { method: 'POST' });
      const data = await res.json();
      showToast?.(data.success ? '✅ Test print berhasil!' : '❌ ' + (data.error || 'Gagal'), data.success ? 'success' : 'error');
    } catch {
      showToast?.('❌ Server printer tidak merespon', 'error');
    }
  };

  const handleSavePrinterMode = (mode: string) => {
    setPrinterMode(mode);
    localStorage.setItem('printer_mode', mode);
    showToast?.('Mode printer disimpan', 'success');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg('');
    if (!oldPass.trim() || !newPass.trim() || !confirmPass.trim()) {
      setPassMsg('Semua field harus diisi!'); return;
    }
    const stored = localStorage.getItem('owner_password_hash');
    if (!stored) { setPassMsg('Tidak ada password terdaftar! Buat password baru di halaman Login Owner.'); return; }
    const valid = await verifyPassword(oldPass.trim(), stored);
    if (!valid) { setPassMsg('Password lama salah!'); return; }
    if (newPass.trim().length < 6) { setPassMsg('Password baru minimal 6 karakter!'); return; }
    if (newPass.trim() !== confirmPass.trim()) { setPassMsg('Konfirmasi tidak cocok!'); return; }
    const hash = await hashPassword(newPass.trim());
    localStorage.setItem('owner_password_hash', hash);
    setPassMsg('✅ Password berhasil diubah!');
    setTimeout(() => { setShowChangePass(false); setOldPass(''); setNewPass(''); setConfirmPass(''); setPassMsg(''); }, 2000);
  };

  const handleExport = () => {
    try {
      const data: Record<string, unknown> = {};
      for (const key of DATA_KEYS) {
        try {
          const raw = localStorage.getItem(key);
          data[key] = raw ? JSON.parse(raw) : [];
        } catch { data[key] = []; }
      }
      data['exported_at'] = new Date().toISOString();
      data['app_version'] = '1.0.0';

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `near-bakery-backup-${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast?.('✅ Data berhasil diexport!', 'success');
    } catch { showToast?.('❌ Gagal export data', 'error'); }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        let imported = 0;
        for (const key of DATA_KEYS) {
          if (key in data && Array.isArray(data[key])) {
            localStorage.setItem(key, JSON.stringify(data[key]));
            imported++;
          }
        }
        showToast?.(`✅ ${imported} koleksi data diimport! Refresh halaman untuk memuat.`, 'success');
        setTimeout(() => window.location.reload(), 2000);
      } catch { showToast?.('❌ File JSON tidak valid', 'error'); }
    };
    input.click();
  };

  const handleWipe = () => {
    if (wipeStep === 0) {
      setShowConfirmWipe(true);
      setWipeStep(1);
    } else if (wipeStep === 1) {
      setWipeStep(2);
    } else {
      for (const key of DATA_KEYS) localStorage.removeItem(key);
      localStorage.removeItem('rd_experiments_data');
      localStorage.removeItem('toppings_data');
      localStorage.removeItem('pos_orders_data');
      localStorage.removeItem('revenue_tracker_data');
      setShowConfirmWipe(false);
      setWipeStep(0);
      showToast?.('✅ Semua data telah dihapus. Halaman akan di-refresh.', 'warning');
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const cancelWipe = () => {
    setShowConfirmWipe(false);
    setWipeStep(0);
  };

  const handleSaveStore = () => {
    localStorage.setItem('store_name', storeName);
    localStorage.setItem('store_address', storeAddress);
    localStorage.setItem('store_phone', storePhone);
    localStorage.setItem('store_footer', storeFooter);
    showToast?.('Pengaturan toko disimpan', 'success');
  };

  const SettingCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">{icon}</span>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">Pengaturan Sistem</h1>
          <p className="text-xs text-gray-500 mt-0.5">Konfigurasi aplikasi, printer, database, dan data</p>
        </div>
        <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">v1.0.0</span>
      </div>

      <div className="grid gap-4">
        {/* ─── TEMA ─── */}
        <SettingCard icon={<Palette className="w-4 h-4" />} title="Tema Aplikasi">
          <div className="flex gap-2">
            {([['light', <Sun className="w-3.5 h-3.5" />, 'Terang'], ['dark', <Moon className="w-3.5 h-3.5" />, 'Gelap'], ['system', <Monitor className="w-3.5 h-3.5" />, 'Sistem']] as const).map(([val, icon, label]) => (
              <button key={val} onClick={() => handleSaveTheme(val)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  theme === val ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {icon}{label}
              </button>
            ))}
          </div>
        </SettingCard>

        {/* ─── BAHASA ─── */}
        <SettingCard icon={<Globe className="w-4 h-4" />} title="Bahasa & Regional">
          <div className="flex gap-2">
            {[['id', 'Indonesia'], ['en', 'English']].map(([val, label]) => (
              <button key={val} onClick={() => handleSaveLanguage(val)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  language === val ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </SettingCard>

        {/* ─── NOTIFIKASI ─── */}
        <SettingCard icon={<Bell className="w-4 h-4" />} title="Notifikasi">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Tampilkan notifikasi pesanan & chat real-time</span>
            <button onClick={handleToggleNotifications}
              className={`relative w-10 h-5 rounded-full transition-all cursor-pointer ${notifications ? 'bg-emerald-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${notifications ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        </SettingCard>

        {/* ─── AUTO-SAVE ─── */}
        <SettingCard icon={<Save className="w-4 h-4" />} title="Auto-Save Google Sheets">
          <div className="space-y-2">
            <label className="text-xs text-gray-600">Interval auto-save</label>
            <select value={autoSaveInterval} onChange={e => handleSaveAutoSave(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none">
              <option value={30}>30 detik</option>
              <option value={60}>1 menit</option>
              <option value={120}>2 menit</option>
              <option value={300}>5 menit</option>
              <option value={600}>10 menit</option>
            </select>
          </div>
        </SettingCard>

        {/* ─── GANTI PASSWORD OWNER ─── */}
        <SettingCard icon={<KeyRound className="w-4 h-4" />} title="Ganti Password Owner">
          {!showChangePass ? (
            <button onClick={() => setShowChangePass(true)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-all cursor-pointer">
              Ubah Password
            </button>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3">
              {passMsg && (
                <div className={`p-3 rounded-xl text-xs font-semibold text-center ${
                  passMsg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>{passMsg}</div>
              )}
              {[
                { label: 'Password Lama', val: oldPass, set: setOldPass, show: showOldPass, toggle: () => setShowOldPass(!showOldPass) },
                { label: 'Password Baru', val: newPass, set: setNewPass, show: showNewPass, toggle: () => setShowNewPass(!showNewPass) },
              ].map((f, i) => (
                <div key={i} className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">{f.label}</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><Lock className="w-3.5 h-3.5" /></span>
                    <input type={f.show ? 'text' : 'password'} required minLength={6} value={f.val}
                      onChange={e => f.set(e.target.value)} placeholder={f.label}
                      className="w-full pl-10 pr-10 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none font-mono" />
                    <button type="button" onClick={f.toggle}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer">
                      {f.show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Konfirmasi Password Baru</label>
                <input type="password" required minLength={6} value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)} placeholder="Ketik ulang password baru"
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none font-mono" />
              </div>
              <div className="flex gap-2">
                <button type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Simpan
                </button>
                <button type="button" onClick={() => { setShowChangePass(false); setPassMsg(''); }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                  Batal
                </button>
              </div>
            </form>
          )}
        </SettingCard>

        {/* ─── PENGATURAN TOKO ─── */}
        <SettingCard icon={<Store className="w-4 h-4" />} title="Pengaturan Toko">
          <div className="space-y-3">
            {[
              { label: 'Nama Toko', val: storeName, set: setStoreName },
              { label: 'Alamat', val: storeAddress, set: setStoreAddress },
              { label: 'Telepon', val: storePhone, set: setStorePhone },
              { label: 'Footer Struk', val: storeFooter, set: setStoreFooter },
            ].map((f, i) => (
              <div key={i} className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">{f.label}</label>
                <input value={f.val} onChange={e => f.set(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none" />
              </div>
            ))}
            <button onClick={handleSaveStore}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> Simpan Pengaturan Toko
            </button>
          </div>
        </SettingCard>

        {/* ─── MANAJEMEN PRINTER ─── */}
        <SettingCard icon={<Printer className="w-4 h-4" />} title="Manajemen Printer Thermal">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                printerConnected ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {printerConnected ? <Smartphone className="w-3.5 h-3.5" /> : <Printer className="w-3.5 h-3.5" />}
                {printerConnected ? 'WebSerial Terhubung' : 'WebSerial Putus'}
              </span>
              {!wsSupported && <span className="text-[10px] text-amber-600">(Browser tidak support WebSerial)</span>}
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Mode Cetak</label>
              <div className="flex gap-2">
                {[
                  ['webserial', <Smartphone className="w-3.5 h-3.5" />, 'WebSerial (Browser)'],
                  ['api', <Settings className="w-3.5 h-3.5" />, 'Server API (Python)'],
                  ['browser', <Printer className="w-3.5 h-3.5" />, 'Browser Print'],
                ].map(([val, icon, label]) => (
                  <button key={val} onClick={() => handleSavePrinterMode(val)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      printerMode === val ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {icon}{label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Port:</label>
              <input value={printerPort} onChange={e => { setPrinterPort(e.target.value); localStorage.setItem('printer_port', e.target.value); }}
                className="w-20 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:border-emerald-400 outline-none font-mono" />
              <span className="text-[10px] text-gray-400">(COM11 / Bluetooth)</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={handlePrinterConnect}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  printerConnected ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}>
                {printerConnected ? <> <XCircle className="w-3.5 h-3.5" /> Putuskan </> : <> <Smartphone className="w-3.5 h-3.5" /> Hubungkan </>}
              </button>
              <button onClick={handlePrinterTest}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                <Printer className="w-3.5 h-3.5" /> Test Print
              </button>
            </div>
          </div>
        </SettingCard>

        {/* ─── STATUS DATABASE ─── */}
        <SettingCard icon={<Database className="w-4 h-4" />} title="Status Koneksi Database">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2.5">
                <Wifi className={`w-4 h-4 ${dbFirestoreStatus === 'connected' ? 'text-emerald-500' : 'text-red-400'}`} />
                <div>
                  <p className="text-xs font-semibold text-gray-700">Firebase Firestore</p>
                  <p className="text-[10px] text-gray-400">Data ERP & Web Store</p>
                </div>
              </div>
              <span className={`flex items-center gap-1 text-[10px] font-semibold ${
                dbFirestoreStatus === 'connected' ? 'text-emerald-600' : dbFirestoreStatus === 'checking' ? 'text-amber-500' : 'text-red-500'
              }`}>
                {dbFirestoreStatus === 'connected' ? <CheckCircle2 className="w-3 h-3" /> : dbFirestoreStatus === 'checking' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                {dbFirestoreStatus === 'connected' ? 'Terhubung' : dbFirestoreStatus === 'checking' ? 'Memeriksa...' : 'Putus'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className={`w-4 h-4 ${dbSheetsStatus === 'connected' ? 'text-emerald-500' : 'text-red-400'}`} />
                <div>
                  <p className="text-xs font-semibold text-gray-700">Google Sheets</p>
                  <p className="text-[10px] text-gray-400">{spreadsheetId ? `ID: ${spreadsheetId.slice(0, 12)}...` : 'Belum terhubung'}</p>
                </div>
              </div>
              <span className={`flex items-center gap-1 text-[10px] font-semibold ${
                dbSheetsStatus === 'connected' ? 'text-emerald-600' : dbSheetsStatus === 'checking' ? 'text-amber-500' : 'text-gray-400'
              }`}>
                {dbSheetsStatus === 'connected' ? <CheckCircle2 className="w-3 h-3" /> : dbSheetsStatus === 'checking' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <WifiOff className="w-3 h-3" />}
                {dbSheetsStatus === 'connected' ? 'Terhubung' : dbSheetsStatus === 'checking' ? 'Memeriksa...' : 'Offline / Manual'}
              </span>
            </div>
          </div>
        </SettingCard>

        {/* ─── EXPORT / IMPORT / RESET ─── */}
        <SettingCard icon={<Download className="w-4 h-4" />} title="Export, Import & Reset Data">
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Backup seluruh data ERP (bahan baku, resep, produk, transaksi, waste) ke file JSON atau restore dari backup sebelumnya.</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleExport}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Export Data (JSON)
              </button>
              <button onClick={handleImport}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Import Data (JSON)
              </button>
              <button onClick={handleWipe}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer">
                <Trash2 className="w-3.5 h-3.5" /> Hapus Semua Data
              </button>
            </div>

            {showConfirmWipe && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="text-xs font-bold">
                    {wipeStep === 1 ? 'APAKAH ANDA YAKIN? Semua data akan dihapus permanen!' : 'KONFIRMASI AKHIR! Tekan "Hapus" sekali lagi untuk mengeksekusi.'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleWipe}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer">
                    {wipeStep === 1 ? 'Ya, Hapus Data' : 'HAPUS SEKARANG!'}
                  </button>
                  <button onClick={cancelWipe}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition-all cursor-pointer">
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </SettingCard>

        {/* ─── INFO SISTEM ─── */}
        <SettingCard icon={<Shield className="w-4 h-4" />} title="Informasi Sistem">
          <div className="text-xs text-gray-500 space-y-1.5">
            <p>Versi: <span className="font-mono text-gray-700">1.0.0</span></p>
            <p>Framework: <span className="font-mono text-gray-700">React 19 + TypeScript</span></p>
            <p>Database: <span className="font-mono text-gray-700">Firebase Firestore + Google Sheets</span></p>
            <p>Browser: <span className="font-mono text-gray-700">{navigator.userAgent.substring(0, 60)}</span></p>
            <p>WebSerial: <span className={`font-mono ${wsSupported ? 'text-emerald-600' : 'text-red-500'}`}>{wsSupported ? 'Didukung' : 'Tidak didukung'}</span></p>
          </div>
        </SettingCard>
      </div>
    </div>
  );
}
