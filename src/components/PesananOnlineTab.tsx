import React, { useState, useEffect } from 'react';
import { Layers, ShieldCheck, ShoppingCart, AlertTriangle, CheckCircle2, Globe, RefreshCw } from 'lucide-react';
import { CalculationResult } from '../types';
import { safeGetLocalStorage } from '../lib/safe-json';
import { listenNewOrders, getAllOrders, WebStoreOrder, updateOrderStatus } from '../lib/firestore-bridge';

interface PesananOnlineTabProps {
  calculatedProducts: CalculationResult[];
  onCompletePOSSale: (productName: string, qty: number, totalRevenue: number, source?: string) => void;
}

export default function PesananOnlineTab({ calculatedProducts, onCompletePOSSale }: PesananOnlineTabProps) {

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

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string, paymentStatus?: string) => {
    try {
      await updateOrderStatus(orderId, newStatus, paymentStatus);
      setFirestoreOrders(prev => prev.map(o =>
        o.id === orderId
          ? { ...o, status: newStatus as any, ...(paymentStatus ? { paymentStatus: paymentStatus as any } : {}) }
          : o
      ));
      showLocalToast('Status berhasil diubah ke ' + newStatus + '!', 'success');
    } catch (err) {
      console.error('Failed to update order status:', err);
      showLocalToast('Gagal mengupdate status pesanan di Firestore.', 'error');
    }
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
          <Layers className="w-6 h-6 text-emerald-600" /> Pesanan Online & Web Store Bridge
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Integrasi pesanan dari Web Store (storenear) secara real-time via Firestore.
        </p>
      </div>

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
                  Stok bahan baku otomatis terpotong saat pesanan dikonfirmasi (lunas/diproses).
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
                Gunakan tombol aksi di bawah untuk mengonfirmasi pembayaran.
                Stok bahan baku OTOMATIS terpotong saat status → Diproses/Lunas).
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
                    <div className="flex flex-col gap-1 ml-2">
                      {(o.status === 'Menunggu Pembayaran' || o.status === 'Belum Bayar') && (
                        <button onClick={() => handleUpdateOrderStatus(o.id, 'Diproses', 'Lunas')}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded transition cursor-pointer whitespace-nowrap">
                          Konfirmasi Bayar
                        </button>
                      )}
                      {(o.status === 'Menunggu Pembayaran' || o.status === 'Belum Bayar') && (
                        <button onClick={() => handleUpdateOrderStatus(o.id, 'Dibatalkan')}
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-[9px] font-bold rounded transition cursor-pointer whitespace-nowrap">
                          Batalkan
                        </button>
                      )}
                      {o.status === 'Diproses' && (
                        <button onClick={() => handleUpdateOrderStatus(o.id, 'Dikirim')}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold rounded transition cursor-pointer whitespace-nowrap">
                          Kirim
                        </button>
                      )}
                      {o.status === 'Dikirim' && (
                        <button onClick={() => handleUpdateOrderStatus(o.id, 'Selesai')}
                          className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold rounded transition cursor-pointer whitespace-nowrap">
                          Selesai
                        </button>
                      )}
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
              <li>Saat Owner konfirmasi status menjadi <strong className="text-white">Diproses / Lunas</strong> → stok bahan baku OTOMATIS terpotong</li>
              <li>Stok hanya dipotong setelah Owner konfirmasi — AMAN dari pembatalan</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Platform status */}
      <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider">Status Platform Online</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['GoFood', 'GrabFood', 'ShopeeFood'].map(p => (
            <div key={p} className="p-4 rounded-xl bg-slate-950/50 border border-amber-800/30">
              <span className={`text-sm font-black uppercase ${p === 'GoFood' ? 'text-rose-500' : p === 'GrabFood' ? 'text-emerald-400' : 'text-orange-500'}`}>{p}</span>
              <p className="text-[10px] text-slate-500 text-center py-2">Integrasi langsung belum tersedia. Pesanan dari platform ini dapat dicatat manual via POS Kasir sebagai "WhatsApp Order".</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
