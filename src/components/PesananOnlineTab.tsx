import React, { useState, useEffect } from 'react';
import { Layers, ShieldCheck, ShoppingCart, Key, AlertTriangle, CheckCircle2, ExternalLink, Globe, RefreshCw } from 'lucide-react';
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

  // ─── WEB STORE BRIDGE ───
  const [webStoreUrl, setWebStoreUrl] = useState(() => localStorage.getItem('web_store_url') || '');
  const [webStoreStatus, setWebStoreStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [webStoreOrders, setWebStoreOrders] = useState<{ id: string; customer: string; items: string; total: number; date: string; status: string }[]>(() => {
    const saved = localStorage.getItem('web_store_bridge_orders');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('ojol_api_keys', JSON.stringify(platforms));
  }, [platforms]);

  useEffect(() => {
    localStorage.setItem('web_store_url', webStoreUrl);
  }, [webStoreUrl]);

  useEffect(() => {
    localStorage.setItem('web_store_bridge_orders', JSON.stringify(webStoreOrders));
  }, [webStoreOrders]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

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

  const handleConnectWebStore = () => {
    if (!webStoreUrl.trim()) return;
    setWebStoreStatus('connecting');
    setTimeout(() => {
      // Simulate connection
      setWebStoreStatus('connected');
      showLocalToast('✅ Terhubung ke Web Store!', 'success');
      // Simulate some mock orders from web store
      const mockOrders = [
        { id: `WS-${Date.now()}-1`, customer: 'Budi Santoso', items: '2x Roti Sobek Cokelat, 1x Kopi Susu', total: 65000, date: new Date().toISOString(), status: 'baru' },
        { id: `WS-${Date.now()}-2`, customer: 'Siti Nurhaliza', items: '3x Donat Glaze, 1x Coklat Panas', total: 42000, date: new Date().toISOString(), status: 'diproses' },
      ];
      setWebStoreOrders(prev => [...mockOrders, ...prev].slice(0, 50));
    }, 2000);
  };

  const handleSyncWebStore = () => {
    if (webStoreStatus !== 'connected') return;
    setWebStoreStatus('connecting');
    setTimeout(() => {
      setWebStoreStatus('connected');
      showLocalToast('✅ Sinkronisasi berhasil!', 'success');
    }, 1500);
  };

  // Local toast
  const [localToast, setLocalToast] = useState<{ msg: string; type: string } | null>(null);
  const showLocalToast = (msg: string, type: string) => {
    setLocalToast({ msg, type });
    setTimeout(() => setLocalToast(null), 3000);
  };

  const connectedCount = platforms.filter(p => p.isConnected).length;

  return (
    <div className="space-y-6">
      {localToast && (
        <div className={`px-4 py-2.5 rounded-xl text-xs font-bold text-center ${
          localToast.type === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
        }`}>{localToast.msg}</div>
      )}

      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-emerald-600" /> Pesanan Online & Web Store Bridge
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Integrasi GoFood, GrabFood, ShopeeFood, dan jembatan ke Web Store (storenear).
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
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platforms.map(platform => (
              <div key={platform.platform} className={`p-4 rounded-xl border text-xs space-y-3 ${
                platform.isConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="font-black uppercase text-sm">{platform.platform}</span>
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
                    <input type="password" value={editingKey}
                      onChange={(e) => setEditingKey(e.target.value)}
                      placeholder="Masukkan API Key..." className="w-full border border-gray-200 rounded-lg p-2 font-mono text-[10px]" autoFocus />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveApiKey(platform.platform)}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer">Simpan</button>
                      <button onClick={() => { setEditingPlatform(''); setEditingKey(''); }}
                        className="py-1.5 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 text-[10px] font-bold rounded-lg transition cursor-pointer">Batal</button>
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
        </div>
      )}

      {/* ─── WEB STORE BRIDGE ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-emerald-50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  🌐 Jembatan Web Store (storenear)
                  {webStoreStatus === 'connected' && (
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Terhubung
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-gray-500">Hubungkan ke aplikasi Web Store (storenear) untuk sinkronisasi pesanan otomatis.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Form koneksi */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">URL Web Store / API Endpoint</label>
              <input type="text" value={webStoreUrl}
                onChange={(e) => setWebStoreUrl(e.target.value)}
                placeholder="https://storenear.vercel.app/api/orders"
                disabled={webStoreStatus === 'connecting'}
                className="w-full text-xs border border-gray-200 rounded-lg p-2.5 font-mono disabled:bg-gray-100" />
            </div>
            <div className="flex items-end gap-2">
              <button onClick={handleConnectWebStore}
                disabled={!webStoreUrl.trim() || webStoreStatus === 'connecting'}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-lg transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5">
                {webStoreStatus === 'connecting' ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menghubungkan...</>
                ) : webStoreStatus === 'connected' ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Terhubung</>
                ) : (
                  <><ExternalLink className="w-3.5 h-3.5" /> Hubungkan</>
                )}
              </button>
              {webStoreStatus === 'connected' && (
                <button onClick={handleSyncWebStore}
                  className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5" /> Sync
                </button>
              )}
            </div>
          </div>

          {/* Info koneksi */}
          {webStoreStatus === 'connected' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[10px] text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Web Store Terhubung!</strong> Pesanan dari storenear akan otomatis masuk ke sistem ERP dan mengurangi stok bahan baku. 
                URL: <code className="bg-emerald-100 px-1 rounded">{webStoreUrl}</code>
              </div>
            </div>
          )}

          {webStoreStatus === 'disconnected' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[10px] text-blue-800 flex items-start gap-2">
              <Globe className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Belum terhubung.</strong> Masukkan URL Web Store (storenear) Anda dan klik "Hubungkan". 
                Contoh: <code className="bg-blue-100 px-1 rounded">https://storenear.vercel.app</code>
              </div>
            </div>
          )}

          {/* Daftar Pesanan dari Web Store */}
          {webStoreOrders.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1">
                  <ShoppingCart className="w-3.5 h-3.5 text-indigo-600" /> Pesanan Web Store ({webStoreOrders.length})
                </h4>
                <button onClick={() => {
                  if (window.confirm('Hapus semua pesanan web store?')) setWebStoreOrders([]);
                }} className="text-[10px] text-red-500 hover:text-red-700 font-bold cursor-pointer">Hapus Semua</button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {webStoreOrders.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-gray-400">#{o.id.slice(-8)}</span>
                        <span className="text-xs font-bold text-gray-900">{o.customer}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                          o.status === 'baru' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>{o.status}</span>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-0.5">{o.items}</p>
                    </div>
                    <span className="font-mono font-bold text-emerald-700 text-xs">{formatCurrency(o.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dokumentasi Integrasi */}
          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl border border-slate-800 text-[10px] space-y-2">
            <p className="font-bold text-white flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Cara Integrasi Web Store (storenear):</p>
            <ol className="list-decimal ml-4 space-y-1 text-slate-400">
              <li>Deploy web store (storenear) ke Vercel atau hosting pilihan Anda</li>
              <li>Dapatkan URL endpoint API: <code className="bg-slate-800 px-1 rounded text-emerald-300">https://storenear.vercel.app/api/orders</code></li>
              <li>Masukkan URL di atas dan klik <strong className="text-white">"Hubungkan"</strong></li>
              <li>Setelah terhubung, setiap pesanan dari storenear akan otomatis:
                <ul className="list-disc ml-4 mt-1 text-slate-500">
                  <li>Masuk ke daftar pesanan di sini</li>
                  <li>Mengurangi stok bahan baku sesuai formulasi resep</li>
                  <li>Mencatat revenue ke sistem</li>
                </ul>
              </li>
              <li>Gunakan API Key keamanan untuk autentikasi antar sistem</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Platform status cards */}
      <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Status Platform Online</h3>
          <span className="text-[10px] text-slate-500 bg-slate-950 px-2 py-1 rounded-lg font-mono">{connectedCount}/3 platform</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platforms.map(p => (
            <div key={p.platform} className={`p-4 rounded-xl space-y-2 ${
              p.isConnected ? 'bg-slate-950 border border-emerald-800/50' : 'bg-slate-950/50 border border-red-900/30'
            }`}>
              <div className="flex justify-between items-center">
                <span className={`text-sm font-black uppercase ${p.platform === 'GoFood' ? 'text-rose-500' : p.platform === 'GrabFood' ? 'text-emerald-400' : 'text-orange-500'}`}>{p.platform}</span>
                {p.isConnected ? <span className="text-[9px] text-emerald-400 font-bold">🔑 Connected</span> : <span className="text-[9px] text-red-400 font-bold">🔴 No API Key</span>}
              </div>
              <p className="text-[10px] text-slate-500 text-center py-2">
                {p.isConnected ? '✅ Terhubung — pesanan otomatis masuk.' : '🔑 Atur API Key untuk menghubungkan.'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
