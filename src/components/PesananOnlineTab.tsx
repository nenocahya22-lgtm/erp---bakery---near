import React, { useState, useEffect } from 'react';
import { Layers, ShieldCheck, ShoppingCart, Key, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { CalculationResult } from '../types';

interface PlatformApiKey {
  platform: string;
  label: string;
  key: string;
  isConnected: boolean;
}

interface PesananOnlineTabProps {
  calculatedProducts: CalculationResult[];
  onCompletePOSSale: (productName: string, qty: number, totalRevenue: number, source?: string) => void;
}

const DEFAULT_PLATFORMS: PlatformApiKey[] = [
  { platform: 'GoFood', label: 'GoFood API Key', key: '', isConnected: false },
  { platform: 'GrabFood', label: 'GrabFood API Key', key: '', isConnected: false },
  { platform: 'ShopeeFood', label: 'ShopeeFood API Key', key: '', isConnected: false },
];

export default function PesananOnlineTab({ calculatedProducts, onCompletePOSSale }: PesananOnlineTabProps) {
  const [platforms, setPlatforms] = useState<PlatformApiKey[]>(() => {
    const saved = localStorage.getItem('ojol_api_keys');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all platforms exist
        return DEFAULT_PLATFORMS.map(dp => {
          const existing = parsed.find((p: PlatformApiKey) => p.platform === dp.platform);
          return existing || dp;
        });
      } catch { /* ignore */ }
    }
    return DEFAULT_PLATFORMS;
  });

  const [showApiSettings, setShowApiSettings] = useState(false);
  const [editingKey, setEditingKey] = useState('');
  const [editingPlatform, setEditingPlatform] = useState('');

  useEffect(() => {
    localStorage.setItem('ojol_api_keys', JSON.stringify(platforms));
  }, [platforms]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const handleSimulateDeliveryOrder = (platform: 'GoFood' | 'GrabFood' | 'ShopeeFood') => {
    const plat = platforms.find(p => p.platform === platform);
    if (!plat?.key) {
      alert(`⚠️ API Key ${platform} belum diisi!\n\nSilakan atur API Key di panel "Pengaturan API" terlebih dahulu.\n\nUntuk sekarang, Anda bisa menggunakan mode simulasi.`);
      // Still allow simulation
    }

    const pName = calculatedProducts.length > 0
      ? calculatedProducts[Math.floor(Math.random() * calculatedProducts.length)].namaProduk
      : 'Roti Manis';
    const prodInfo = calculatedProducts.find(p => p.namaProduk === pName);
    const unitPrice = prodInfo ? prodInfo.hargaJualPerPorsi : 19000;
    const qty = Math.floor(Math.random() * 3) + 1;
    const items = `${qty} pcs ${pName}`;
    const txId = `TX-${Math.floor(1000 + Math.random() * 9005)}`;

    if (onCompletePOSSale) onCompletePOSSale(pName, qty, unitPrice * qty, platform);

    // Also queue WhatsApp notification
    try {
      const notifQueue = JSON.parse(localStorage.getItem('wa_notification_queue') || '[]');
      notifQueue.push({
        id: `notif-${Date.now()}`,
        type: 'order_masuk',
        platform: platform,
        message: `🛎️ ORDER ${platform} MASUK!\nNo: ${txId}\nPesanan: ${items}\nTotal: ${formatCurrency(unitPrice * qty)}`,
        time: new Date().toISOString(),
        sent: false,
      });
      localStorage.setItem('wa_notification_queue', JSON.stringify(notifQueue));
    } catch (e) { /* silent */ }

    alert(`🛎️ ${platform} ORDER MASUK!\nNo: ${txId}\nPesanan: ${items}\nTotal: ${formatCurrency(unitPrice * qty)}\nStok bahan baku otomatis terpotong.\n\nNotifikasi sudah masuk ke antrian WhatsApp.`);
  };

  const handleSaveApiKey = (platform: string) => {
    setPlatforms(prev => prev.map(p =>
      p.platform === platform
        ? { ...p, key: editingKey, isConnected: editingKey.length > 0 }
        : p
    ));
    setEditingKey('');
    setEditingPlatform('');
  };

  const handleRevealKey = (platform: PlatformApiKey) => {
    setEditingPlatform(platform.platform);
    setEditingKey(platform.key);
  };

  const connectedCount = platforms.filter(p => p.isConnected).length;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" /> Pesanan Online (O2O Delivery)
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Integrasi GoFood, GrabFood, dan ShopeeFood. Stok otomatis terpotong.
          </p>
        </div>
        <button onClick={() => setShowApiSettings(!showApiSettings)}
          className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
            showApiSettings ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}>
          <Key className="w-3.5 h-3.5" /> API Keys {connectedCount > 0 && `(${connectedCount}/3)`}
        </button>
      </div>

      {/* API SETTINGS PANEL */}
      {showApiSettings && (
        <div className="bg-white p-5 rounded-2xl border-2 border-amber-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-600" /> Pengaturan API Key Platform
            </h3>
            <span className="text-[10px] text-gray-400">Data disimpan di browser Anda</span>
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
            Masukkan API Key dari masing-masing platform. Biarkan kosong jika belum punya — sistem tetap bisa simulasi.
            API Key disimpan aman di localStorage browser Anda.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platforms.map(platform => (
              <div key={platform.platform} className={`p-4 rounded-xl border text-xs space-y-3 ${
                platform.isConnected
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-black uppercase text-sm">
                    {platform.platform}
                  </span>
                  {platform.isConnected ? (
                    <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Terhubung
                    </span>
                  ) : (
                    <span className="text-red-700 bg-red-100 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Belum Diisi
                    </span>
                  )}
                </div>

                {editingPlatform === platform.platform ? (
                  <div className="space-y-2">
                    <input
                      type="password"
                      value={editingKey}
                      onChange={(e) => setEditingKey(e.target.value)}
                      placeholder="Masukkan API Key..."
                      className="w-full border border-gray-200 rounded-lg p-2 font-mono text-[10px]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveApiKey(platform.platform)}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer">
                        Simpan
                      </button>
                      <button onClick={() => { setEditingPlatform(''); setEditingKey(''); }}
                        className="py-1.5 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px] font-bold rounded-lg transition cursor-pointer">
                        Batal
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-1">
                      {platform.isConnected ? 'API Key tersimpan' : 'Belum ada API Key'}
                    </p>
                    <button onClick={() => handleRevealKey(platform)}
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg transition cursor-pointer">
                      {platform.isConnected ? 'Ganti API Key' : 'Isi API Key'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">
              API Key disimpan secara lokal — tidak dikirim ke server manapun.
            </p>
            <button onClick={() => {
              if (window.confirm('Hapus semua API Key yang tersimpan?')) {
                setPlatforms(DEFAULT_PLATFORMS);
                setEditingKey('');
                setEditingPlatform('');
              }
            }}
              className="text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer">
              Hapus Semua API Key
            </button>
          </div>
        </div>
      )}

      {/* PLATFORM CARDS */}
      <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-slate-400">
            Hubungkan menu Near Bakery dengan dashboard mitra online. Setiap order otomatis mengurangi stok bahan baku.
          </p>
          <span className="text-[10px] text-slate-500 bg-slate-950 px-2 py-1 rounded-lg font-mono">
            {connectedCount}/3 platform
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* GoFood */}
          <div className={`p-4 rounded-xl space-y-3 ${
            platforms.find(p => p.platform === 'GoFood')?.isConnected
              ? 'bg-slate-950 border border-rose-800/50'
              : 'bg-slate-950/50 border border-red-900/30'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-rose-500 uppercase">GoFood</span>
              {platforms.find(p => p.platform === 'GoFood')?.isConnected ? (
                <span className="text-[9px] text-emerald-400 font-bold">🔑 Connected</span>
              ) : (
                <span className="text-[9px] text-red-400 font-bold">🔴 No API Key</span>
              )}
            </div>
            <button onClick={() => handleSimulateDeliveryOrder('GoFood')}
              className="w-full py-2 bg-rose-900/40 hover:bg-rose-900/60 text-rose-200 text-xs font-bold uppercase rounded border border-rose-800/50 cursor-pointer transition">
              Simulasi Order GoFood
            </button>
          </div>

          {/* GrabFood */}
          <div className={`p-4 rounded-xl space-y-3 ${
            platforms.find(p => p.platform === 'GrabFood')?.isConnected
              ? 'bg-slate-950 border border-emerald-800/50'
              : 'bg-slate-950/50 border border-red-900/30'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-emerald-400 uppercase">GrabFood</span>
              {platforms.find(p => p.platform === 'GrabFood')?.isConnected ? (
                <span className="text-[9px] text-emerald-400 font-bold">🔑 Connected</span>
              ) : (
                <span className="text-[9px] text-red-400 font-bold">🔴 No API Key</span>
              )}
            </div>
            <button onClick={() => handleSimulateDeliveryOrder('GrabFood')}
              className="w-full py-2 bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-300 text-xs font-bold uppercase rounded border border-emerald-800/50 cursor-pointer transition">
              Simulasi Order GrabFood
            </button>
          </div>

          {/* ShopeeFood */}
          <div className={`p-4 rounded-xl space-y-3 ${
            platforms.find(p => p.platform === 'ShopeeFood')?.isConnected
              ? 'bg-slate-950 border border-orange-800/50'
              : 'bg-slate-950/50 border border-red-900/30'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-orange-500 uppercase">ShopeeFood</span>
              {platforms.find(p => p.platform === 'ShopeeFood')?.isConnected ? (
                <span className="text-[9px] text-emerald-400 font-bold">🔑 Connected</span>
              ) : (
                <span className="text-[9px] text-red-400 font-bold">🔴 No API Key</span>
              )}
            </div>
            <button onClick={() => handleSimulateDeliveryOrder('ShopeeFood')}
              className="w-full py-2 bg-orange-950/40 hover:bg-orange-950/60 text-orange-400 text-xs font-bold uppercase rounded border border-orange-800/50 cursor-pointer transition">
              Simulasi Order ShopeeFood
            </button>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Tiap penjualan ojol otomatis memotong bahan baku di dapur pusat & mencatat revenue.</span>
        </div>
      </div>
    </div>
  );
}
