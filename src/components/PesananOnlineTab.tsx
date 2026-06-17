import React, { useState, useEffect } from 'react';
import { Layers, ShieldCheck, ShoppingCart, AlertTriangle, CheckCircle2, Globe, RefreshCw, Package, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { CalculationResult, BahanBaku, DetailResep, ProductHpp } from '../types';
import { safeGetLocalStorage } from '../lib/safe-json';
import { listenNewOrders, getAllOrders, WebStoreOrder, updateOrderStatus } from '../lib/firestore-bridge';

/** Catat baking log ke localStorage ProductionCenterTab agar tidak dobel entry */
function recordBakingLog(productName: string, batchQty: number) {
  const existing = safeGetLocalStorage<{
    id: string; date: string; productName: string; batchQty: number;
    doughTemp: number; ovenTemp: number; startTime: string; endTime: string;
    notes: string;
  }[]>('production_baking_logs', []);
  const log = {
    id: `bl-online-${Date.now()}`,
    date: new Date().toISOString().substring(0, 10),
    productName,
    batchQty,
    doughTemp: 0,
    ovenTemp: 0,
    startTime: '',
    endTime: '',
    notes: 'Dari pesanan online',
  };
  const updated = [log, ...existing].slice(0, 100);
  localStorage.setItem('production_baking_logs', JSON.stringify(updated));
}

interface PesananOnlineTabProps {
  calculatedProducts: CalculationResult[];
  productHpp?: ProductHpp[];
  detailResep?: DetailResep[];
  bahanBaku?: BahanBaku[];
  onCompletePOSSale: (productName: string, qty: number, totalRevenue: number, source?: string) => void;
  onProductionComplete?: (productName: string, batchQty: number) => void;
}

export default function PesananOnlineTab({
  calculatedProducts, productHpp = [], detailResep = [], bahanBaku = [],
  onCompletePOSSale, onProductionComplete
}: PesananOnlineTabProps) {

  // ─── WEB STORE BRIDGE — Real-time dari Firestore ───
  const [webStoreStatus, setWebStoreStatus] = useState<'disconnected' | 'connecting' | 'connected'>(
    () => safeGetLocalStorage<boolean>('firestore_connected', false) ? 'connected' : 'disconnected'
  );
  const [firestoreOrders, setFirestoreOrders] = useState<WebStoreOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Expand order production panel
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Production batch input per order
  const [prodBatch, setProdBatch] = useState<Record<string, Record<string, number>>>({});

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

  // ─── PRODUCTION & STOCK INTEGRATED FUNCTIONS ───

  /** Hitung kebutuhan bahan baku per order item */
  const calcIngredientsNeeded = (itemName: string, qty: number) => {
    const product = productHpp.find(p => 
      p.namaProduk.toLowerCase().trim() === itemName.toLowerCase().trim()
    );
    const resepItems = detailResep.filter(r =>
      r.namaProduk.toLowerCase().trim() === itemName.toLowerCase().trim()
    );
    if (resepItems.length === 0) return [];

    const porsiJual = product?.porsiJual || 1;
    return resepItems.map(r => {
      const needed = (r.takaran / porsiJual) * qty;
      const bahan = bahanBaku.find(b => 
        b.nama.toLowerCase().trim() === r.namaBahan.toLowerCase().trim()
      );
      const stock = bahan?.isiKemasan || 0;
      const satuan = bahan?.satuan || 'gr';
      return {
        namaBahan: r.namaBahan,
        needed: Math.round(needed * 10) / 10,
        stock,
        satuan,
        sufficient: stock >= needed,
        low: stock > 0 && stock < needed,
        outOfStock: stock <= 0,
      };
    });
  };

  /** Hitung status stok untuk seluruh order */
  const calcOrderStockStatus = (order: WebStoreOrder) => {
    let allSufficient = true;
    let anyLow = false;
    let anyOut = false;
    let totalBahan = 0;
    
    order.items.forEach(item => {
      const ingredients = calcIngredientsNeeded(item.name, item.quantity);
      totalBahan += ingredients.length;
      ingredients.forEach(ing => {
        if (!ing.sufficient) allSufficient = false;
        if (ing.low) anyLow = true;
        if (ing.outOfStock) anyOut = true;
      });
    });

    if (totalBahan === 0) return { status: 'no_recipe', label: 'Belum ada resep', color: 'text-gray-400', bg: 'bg-gray-50' };
    if (anyOut) return { status: 'out_of_stock', label: 'Stok habis!', color: 'text-red-700', bg: 'bg-red-50' };
    if (!allSufficient) return { status: 'low_stock', label: 'Stok tidak cukup', color: 'text-amber-700', bg: 'bg-amber-50' };
    return { status: 'sufficient', label: 'Stok cukup', color: 'text-emerald-700', bg: 'bg-emerald-50' };
  };

  /** Catat produksi untuk satu produk dalam order — stok otomatis dipotong via onProductionComplete */
  const handleProduceItem = (orderId: string, itemName: string, itemQty: number) => {
    const batch = prodBatch[orderId]?.[itemName] || itemQty;
    onProductionComplete?.(itemName, batch);
    recordBakingLog(itemName, batch);
    showLocalToast(`🏭 Produksi ${batch}x "${itemName}" dicatat! Stok bahan baku dipotong.`, 'success');
  };

  /** Catat semua produksi sekaligus untuk satu order */
  const handleProduceAll = (order: WebStoreOrder) => {
    order.items.forEach(item => {
      const batch = prodBatch[order.id]?.[item.name] || item.quantity;
      onProductionComplete?.(item.name, batch);
      recordBakingLog(item.name, batch);
    });
    showLocalToast(`✅ Semua item dalam pesanan #${order.id.slice(-8)} sudah diproduksi! Stok bahan baku dipotong.`, 'success');
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
          <Layers className="w-6 h-6 text-emerald-600" /> Pesanan Online & Workflow Produksi
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Kelola pesanan, produksi, dan stok dalam satu panel — tanpa pindah tab.
        </p>
      </div>

      {/* ─── WEB STORE BRIDGE ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-emerald-50">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  🌐 Workflow Terintegrasi: Pesanan → Produksi → Stok
                  {webStoreStatus === 'connected' && (
                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Terhubung
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-gray-500">
                  Dari konfirmasi pembayaran hingga catat produksi & cek stok — semua di sini.
                  Klik order untuk lihat kebutuhan bahan & stok.
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
                <strong>Firestore Terhubung!</strong> Setelah konfirmasi bayar, klik order untuk:
                <ul className="list-disc ml-4 mt-1 space-y-0.5">
                  <li>Lihat kebutuhan bahan baku per produk</li>
                  <li>Cek ketersediaan stok (🟢 cukup / 🟡 menipis / 🔴 habis)</li>
                  <li>Catat produksi langsung — stok otomatis terpotong</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-[10px] text-blue-800 flex items-start gap-2">
              <Globe className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Belum terhubung ke Firestore.</strong> Konfigurasi Firebase diperlukan untuk menerima pesanan real-time.
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

          {/* Daftar Pesanan + Production Panel */}
          {firestoreOrders.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1">
                  <ShoppingCart className="w-3.5 h-3.5 text-indigo-600" /> Pesanan Web Store ({firestoreOrders.length})
                </h4>
              </div>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {firestoreOrders.map(o => (
                  <div key={o.id} className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                    {/* ORDER HEADER — always visible */}
                    <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100/50 transition"
                      onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)}>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-gray-400 transition-transform duration-200">
                          {expandedOrderId === o.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </span>
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
                        {/* Stock status badge */}
                        {o.status === 'Diproses' && (
                          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${
                            calcOrderStockStatus(o).bg + ' ' + calcOrderStockStatus(o).color
                          }`}>
                            {calcOrderStockStatus(o).label}
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0 ml-3 flex items-center gap-3">
                        <div>
                          <span className="font-mono font-bold text-emerald-700 text-xs block">
                            {formatCurrency(o.totalAmount)}
                          </span>
                          <span className="text-[9px] text-gray-400">
                            {o.items.reduce((s, i) => s + i.quantity, 0)} items
                          </span>
                        </div>
                        {/* Action buttons */}
                        <div className="flex flex-col gap-1">
                          {(o.status === 'Menunggu Pembayaran' || o.status === 'Belum Bayar') && (
                            <button onClick={(e) => { e.stopPropagation(); handleUpdateOrderStatus(o.id, 'Diproses', 'Lunas'); }}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded transition cursor-pointer whitespace-nowrap">
                              Konfirmasi Bayar
                            </button>
                          )}
                          {(o.status === 'Menunggu Pembayaran' || o.status === 'Belum Bayar') && (
                            <button onClick={(e) => { e.stopPropagation(); handleUpdateOrderStatus(o.id, 'Dibatalkan'); }}
                              className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-[9px] font-bold rounded transition cursor-pointer whitespace-nowrap">
                              Batalkan
                            </button>
                          )}
                          {o.status === 'Diproses' && (
                            <button onClick={(e) => { e.stopPropagation(); handleUpdateOrderStatus(o.id, 'Dikirim'); }}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold rounded transition cursor-pointer whitespace-nowrap">
                              Kirim
                            </button>
                          )}
                          {o.status === 'Dikirim' && (
                            <button onClick={(e) => { e.stopPropagation(); handleUpdateOrderStatus(o.id, 'Selesai'); }}
                              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-bold rounded transition cursor-pointer whitespace-nowrap">
                              Selesai
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ─── EXPANDED PRODUCTION & STOCK PANEL ─── */}
                    {expandedOrderId === o.id && o.status === 'Diproses' && (
                      <div className="border-t border-gray-200 bg-white">
                        <div className="p-4 space-y-4">
                          {/* Production items breakdown */}
                          <div className="space-y-3">
                            <h5 className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1.5">
                              <Package className="w-3 h-3 text-emerald-600" /> Kebutuhan Bahan & Stok
                            </h5>
                            
                            {o.items.map((item, idx) => {
                              const ingredients = calcIngredientsNeeded(item.name, item.quantity);
                              const defaultBatch = prodBatch[o.id]?.[item.name] ?? item.quantity;
                              return (
                                <div key={idx} className="border border-gray-100 rounded-xl overflow-hidden">
                                  {/* Item header */}
                                  <div className="bg-gray-50 p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-gray-900">{item.name}</span>
                                      <span className="text-[9px] text-gray-400 font-mono">×{item.quantity}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {/* Stock status */}
                                      {ingredients.length > 0 && (() => {
                                        const allOk = ingredients.every(i => i.sufficient);
                                        const someLow = ingredients.some(i => i.low);
                                        const someOut = ingredients.some(i => i.outOfStock);
                                        return (
                                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                            someOut ? 'bg-red-100 text-red-700' :
                                            !allOk ? 'bg-amber-100 text-amber-700' :
                                            'bg-emerald-100 text-emerald-700'
                                          }`}>
                                            {someOut ? '🔴 Stok habis' : !allOk ? '🟡 Stok menipis' : '🟢 Stok cukup'}
                                          </span>
                                        );
                                      })()}
                                      {/* Batch qty input */}
                                      <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-gray-400 font-mono">Batch:</span>
                                        <input type="number" min="1" value={defaultBatch}
                                          onChange={e => {
                                            const v = parseInt(e.target.value) || item.quantity;
                                            setProdBatch(prev => ({
                                              ...prev,
                                              [o.id]: { ...(prev[o.id] || {}), [item.name]: Math.max(1, v) }
                                            }));
                                          }}
                                          className="w-14 border border-gray-200 rounded-lg p-1 text-[10px] font-mono font-bold text-center"
                                          onClick={e => e.stopPropagation()} />
                                      </div>
                                      {/* Produce button */}
                                      <button onClick={(e) => {
                                        e.stopPropagation();
                                        handleProduceItem(o.id, item.name, defaultBatch);
                                      }}
                                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Produksi
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Ingredients list */}
                                  <div className="divide-y divide-gray-50">
                                    {ingredients.length === 0 ? (
                                      <div className="p-3 text-[10px] text-gray-400 text-center">
                                        ⚠️ Resep untuk "{item.name}" belum ada. Buat resep dulu di tab Formulasi Resep.
                                      </div>
                                    ) : (
                                      ingredients.map((ing, i) => (
                                        <div key={i} className="px-3 py-2 flex items-center justify-between text-[10px]">
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-600">{ing.namaBahan}</span>
                                            <span className="font-mono font-bold">{ing.needed} {ing.satuan}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {/* Stock bar */}
                                            <div className="flex items-center gap-1">
                                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${
                                                  ing.outOfStock ? 'bg-red-400' :
                                                  ing.low ? 'bg-amber-400' : 'bg-emerald-400'
                                                }`} style={{
                                                  width: `${Math.min(100, ing.stock > 0 ? (ing.needed / ing.stock) * 100 : 0)}%`
                                                }} />
                                              </div>
                                              <span className={`font-mono font-bold ${
                                                ing.outOfStock ? 'text-red-600' :
                                                ing.low ? 'text-amber-600' : 'text-emerald-600'
                                              }`}>
                                                {ing.stock} {ing.satuan}
                                              </span>
                                            </div>
                                            <span className={`text-[8px] ${
                                              ing.outOfStock ? 'text-red-500' :
                                              ing.low ? 'text-amber-500' : 'text-emerald-500'
                                            }`}>
                                              {ing.outOfStock ? '🔴' : ing.low ? '🟡' : '🟢'}
                                            </span>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Produce All button & summary */}
                          {o.items.length > 0 && (() => {
                            const stockStatus = calcOrderStockStatus(o);
                            const allHaveRecipes = o.items.every(item => {
                              const resep = detailResep.filter(r =>
                                r.namaProduk.toLowerCase().trim() === item.name.toLowerCase().trim()
                              );
                              return resep.length > 0;
                            });
                            return (
                              <div className={`p-3 rounded-xl border text-xs ${
                                stockStatus.bg} ${stockStatus.color} border-gray-100 flex items-center justify-between`}>
                                <div className="flex items-center gap-2">
                                  <Package className="w-4 h-4" />
                                  <span>
                                    {!allHaveRecipes ? '⚠️ Beberapa produk belum punya resep' :
                                     stockStatus.status === 'sufficient' ? '✅ Semua bahan tersedia, siap produksi!' :
                                     stockStatus.status === 'low_stock' ? '🟡 Stok beberapa bahan menipis — produksi tetap bisa dicatat' :
                                     stockStatus.status === 'out_of_stock' ? '🔴 Ada bahan yang stoknya habis' :
                                     '⚠️ Resep belum lengkap'}
                                  </span>
                                </div>
                                {allHaveRecipes && (
                                  <button onClick={(e) => { e.stopPropagation(); handleProduceAll(o); }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> Produksi Semua
                                  </button>
                                )}
                              </div>
                            );
                          })()}

                          {/* Order details */}
                          <div className="text-[9px] text-gray-400 pt-2 border-t border-gray-50 space-y-1">
                            {o.paymentMethod && <p>💳 Pembayaran: {o.paymentMethod}</p>}
                            {o.userEmail && <p>📧 Email: {o.userEmail}</p>}
                            {o.shippingAddress && (
                              <p>📍 Alamat: {o.shippingAddress.address}, {o.shippingAddress.city}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Empty state for non-Diproses orders when expanded */}
                    {expandedOrderId === o.id && o.status !== 'Diproses' && (
                      <div className="border-t border-gray-200 bg-white p-4 text-center text-[10px] text-gray-400">
                        {o.status === 'Selesai' || o.status === 'Dikirim' ? 
                          '✅ Pesanan sudah selesai diproses.' :
                         o.status === 'Dibatalkan' ?
                          '❌ Pesanan dibatalkan.' :
                          'Konfirmasi pembayaran terlebih dahulu untuk memulai produksi.'}
                      </div>
                    )}
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

          {/* Dokumentasi Workflow */}
          <div className="bg-slate-900 text-slate-200 p-4 rounded-xl border border-slate-800 text-[10px] space-y-2">
            <p className="font-bold text-white flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Workflow Terpadu — 1 Panel untuk Semua:</p>
            <ol className="list-decimal ml-4 space-y-1 text-slate-400">
              <li>Pesanan masuk real-time dari Web Store via Firestore</li>
              <li>Klik <strong className="text-white">Konfirmasi Bayar</strong> → status jadi Diproses</li>
              <li>Klik card pesanan → lihat kebutuhan bahan & <strong className="text-white">stok real-time</strong> 🟢🟡🔴</li>
              <li>Atur jumlah batch, klik <strong className="text-white">Produksi</strong> → stok otomatis terpotong</li>
              <li>Status otomatis berlanjut ke Kirim → Selesai</li>
              <li>Semua tanpa pindah tab! 🔥</li>
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
