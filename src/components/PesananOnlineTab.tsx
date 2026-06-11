import React, { useState, useEffect } from 'react';
import { Layers, ShieldCheck, ShoppingCart, Key, AlertTriangle, CheckCircle2, ExternalLink, Globe, RefreshCw } from 'lucide-react';
import { CalculationResult } from '../types';
import { safeGetLocalStorage } from '../lib/safe-json';
import { listenNewOrders, getAllOrders, WebStoreOrder } from '../lib/firestore-bridge';

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

  // ─── WEB STORE BRIDGE — Real-time dari Firestore ───
  const [webStoreStatus, setWebStoreStatus] = useState<'disconnected' | 'connecting' | 'connected'>(
    () => safeGetLocalStorage<boolean>('firestore_connected', false) ? 'connected' : 'disconnected'
  );
  const [firestoreOrders, setFirestoreOrders] = useState<WebStoreOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Load initial orders & listen for new ones
  useEffect(() => {
    setIsLoadingOrders(true);
    
    // Load existing orders
    getAllOrders()
      .then(orders => {
        setFirestoreOrders(orders);
        setWebStoreStatus('connected');
        localStorage.setItem('firestore_connected', 'true');
        setIsLoadingOrders(false);
      })
      .catch(err => {
        console.warn('Failed to get orders from Firestore:', err);
        setWebStoreStatus('disconnected');
        localStorage.setItem('firestore_connected', 'false');
        setIsLoadingOrders(false);
      });

    // Listen for new orders in real-time
    const unsub = listenNewOrders((order) => {
      setFirestoreOrders(prev => {
        // Avoid duplicates
        if (prev.some(o => o.id === order.id)) return prev;
        return [order, ...prev];
      });
      showLocalToast(`🛒 Pesanan baru dari ${order.userName}!`, 'success');
    }, (err) => {
      console.warn('Order listener error:', err);
      setWebStoreStatus('disconnected');
    });

    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('ojol_api_keys', JSON.stringify(platforms));
  }, [platforms]);

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

  const handleRefreshOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const orders = await getAllOrders();
      setFirestoreOrders(orders);
      setWebStoreStatus('connected');
      showLocalToast('✅ Orders berhasil dimuat!', 'success');
    } catch (err) {
      console.warn('Failed to refresh orders:', err);
      showLocalToast('❌ Gagal memuat orders dari Firestore.', 'error');
    } finally {
      setIsLoadingOrders(false);
    }
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

      {/* ─── WEB STORE BRIDGE — REAL-TIME DARI FIRESTORE ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-emerald-50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  🌐 Pesanan Web Store (Firestore Real-time)
                  {webStoreStatus === 'connected' && (
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Terhubung
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-gray-500">
                  Pesanan dari Web Store (storenear) langsung masuk secara real-time dari Firestore.
                  Stok bahan baku akan otomatis berkurang saat pesanan dikonfirmasi (lunas/diproses).
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Status koneksi */}
          {webStoreStatus === 'connected' ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[10px] text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Firestore Terhubung!</strong> Pesanan dari Web Store muncul secara real-time. 
                Stok bahan baku akan otomatis dipotong saat pembayaran dikonfirmasi (status → Diproses/Lunas).
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[10px] text-blue-800 flex items-start gap-2">
              <Globe className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Belum terhubung ke Firestore.</strong> Configurasi Firebase diperlukan untuk menerima pesanan real-time.
                Pastikan aplikasi Web Store sudah aktif dan terhubung ke Firebase project yang sama.
              </div>
            </div>
          )}

          {/* Tombol refresh */}
          <div className="flex items-center gap-3">
            <button onClick={handleRefreshOrders} disabled={isLoadingOrders}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-xs font-bold rounded-lg transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`} />
              {isLoadingOrders ? 'Memuat...' : 'Refresh Orders'}
            </button>
            <span className="text-[10px] text-gray-400">
              Total {firestoreOrders.length} pesanan{isLoadingOrders ? ' (memuat...)' : ''}
            </span>
          </div>

          {/* Daftar Pesanan dari Firestore */}
          {firestoreOrders.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1">
                  <ShoppingCart className="w-3.5 h-3.5 text-indigo-600" /> Pesanan Web Store ({firestoreOrders.length})
                </h4>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {firestoreOrders.map(o => (
                  <div key={o.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] text-gray-400">#{o.id.slice(-8)}</span>
                        <span className="text-xs font-bold text-gray-900 truncate">{o.userName}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap ${
                          o.status === 'Diproses' || o.status === 'Lunas' ? 'bg-emerald-100 text-emerald-800' :
                          o.status === 'Selesai' ? 'bg-blue-100 text-blue-800' :
                          o.status === 'Dibatalkan' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>{o.status}</span>
                        {o.paymentStatus && (
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                            o.paymentStatus === 'Lunas' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>{o.paymentStatus}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-600 mt-0.5 truncate">
                        {o.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>
                      {o.paymentMethod && (
                        <p className="text-[9px] text-gray-400 mt-0.5">
                          💳 {o.paymentMethod} | {o.userEmail}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <span className="font-mono font-bold text-emerald-700 text-xs block">
                        {formatCurrency(o.totalAmount)}
                      </span>
                      <span className="text-[9px] text-gray-400">
                        {o.items.reduce((s, i) => s + i.quantity, 0)} items
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isLoadingOrders && firestoreOrders.length === 0 && webStoreStatus === 'connected' && (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
              <ShoppingCart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Belum ada pesanan dari Web Store. Pesanan akan muncul secara real-time saat ada pelanggan checkout.</p>
            </div>
          )}

          {isLoadingOrders && (
            <div className="text-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Memuat pesanan dari Firestore...</p>
            </div>
          )}

          {/* Dokumentasi Integrasi */}
          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl border border-slate-800 text-[10px] space-y-2">
            <p className="font-bold text-white flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Cara Kerja Integrasi Web Store (Firestore):</p>
            <ol className="list-decimal ml-4 space-y-1 text-slate-400">
              <li>Web Store dan ERP menggunakan Firebase project yang SAMA</li>
              <li>Setiap checkout di Web Store → order tersimpan di Firestore collection <code className="bg-slate-800 px-1 rounded text-emerald-300">orders</code></li>
              <li>ERP mendengarkan (listen) perubahan collection orders secara real-time</li>
              <li>Saat order baru masuk → muncul notifikasi + tercatat di revenue tracker</li>
              <li>Saat order berubah status jadi <strong className="text-white">Diproses / Lunas</strong> → stok bahan baku OTOMATIS terpotong</li>
              <li>Stok hanya dipotong setelah pembayaran dikonfirmasi — AMAN dari pembatalan</li>
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
