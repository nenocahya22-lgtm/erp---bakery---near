import React, { useState, useEffect } from 'react';
import { ShoppingCart, ChefHat, Printer, X, Coins, RefreshCw } from 'lucide-react';
import { CalculationResult } from '../types';

interface RetailOrder {
  ordId: string;
  source: 'Walk-In POS' | 'WhatsApp Order' | 'GrabFood' | 'GoFood' | 'ShopeeFood' | 'Web Toko';
  customerName: string;
  items: string;
  totalSum: number;
  status: 'Queued' | 'Baking' | 'Completed' | 'Refunded';
  timeAgo: string;
}

interface PosKasirTabProps {
  calculatedProducts: CalculationResult[];
  onCompletePOSSale: (productName: string, qty: number, totalRevenue: number) => void;
}

export default function PosKasirTab({ calculatedProducts, onCompletePOSSale }: PosKasirTabProps) {
  const [activeReceipt, setActiveReceipt] = useState<RetailOrder | null>(null);
  const [newCustName, setNewCustName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [orderQty, setOrderQty] = useState(1);
  const [orderSource, setOrderSource] = useState<RetailOrder['source']>('Walk-In POS');

  const [orders, setOrders] = useState<RetailOrder[]>(() => {
    const saved = localStorage.getItem('pos_orders_data');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('pos_orders_data', JSON.stringify(orders));
  }, [orders]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const handleCreatePOSOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) { alert('Silakan pilih produk terlebih dahulu!'); return; }

    const prodInfo = calculatedProducts.find(p => p.namaProduk === selectedProduct);
    const price = prodInfo ? prodInfo.hargaJualPerPorsi : 19000;
    const totalRevenue = price * orderQty;
    const txId = `TX-${Math.floor(1000 + Math.random() * 9005)}`;

    const newOrder: RetailOrder = {
      ordId: txId,
      source: orderSource,
      customerName: newCustName.trim() || 'Pelanggan POS',
      items: `${orderQty} pcs ${selectedProduct}`,
      totalSum: totalRevenue,
      status: 'Queued',
      timeAgo: 'Baru saja'
    };

    setOrders(prev => [newOrder, ...prev]);
    if (onCompletePOSSale) onCompletePOSSale(selectedProduct, orderQty, totalRevenue);

    setNewCustName('');
    setSelectedProduct('');
    setOrderQty(1);
  };

  const handleUpdateOrderStatus = (ordId: string, newStatus: RetailOrder['status']) => {
    setOrders(prev => prev.map(o => o.ordId === ordId ? { ...o, status: newStatus } : o));
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-emerald-600" />
          POS Kasir Walk-in
        </h2>
        <p className="text-xs text-gray-500 mt-1">Checkout penjualan langsung di toko. Stok bahan baku otomatis terpotong.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* KIRI: FORM KASIR */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
            <ShoppingCart className="w-4 h-4 text-emerald-600" /> Form Transaksi POS
          </h3>

          <form onSubmit={handleCreatePOSOrder} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Nama Customer</label>
                <input type="text" placeholder="Nama pembeli" value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Sumber Transaksi</label>
                <select value={orderSource} onChange={(e) => setOrderSource(e.target.value as RetailOrder['source'])}
                  className="w-full border border-gray-200 rounded-xl p-2.5 bg-white">
                  <option value="Walk-In POS">Walk-In (Kasir Offline)</option>
                  <option value="WhatsApp Order">WhatsApp Order</option>
                  <option value="Web Toko">Web Toko Online</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Pilih Produk</label>
              <select required value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full border border-gray-200 rounded-xl p-2.5 bg-white font-bold">
                <option value="">-- Pilih Produk --</option>
                {calculatedProducts.map(p => (
                  <option key={p.namaProduk} value={p.namaProduk}>
                    {p.namaProduk} - {formatCurrency(p.hargaJualPerPorsi)}
                  </option>
                ))}
              </select>
              {calculatedProducts.length === 0 && (
                <p className="text-[10px] text-amber-600 font-medium mt-1">Belum ada produk aktif.</p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-1/3">
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Qty</label>
                <input type="number" min="1" required value={orderQty}
                  onChange={(e) => setOrderQty(parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-200 rounded-xl p-2 font-mono font-bold text-center" />
              </div>
              <div className="flex-1 text-right bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Total</span>
                <span className="text-base font-black text-emerald-800 font-mono">
                  {formatCurrency((calculatedProducts.find(p => p.namaProduk === selectedProduct)?.hargaJualPerPorsi || 19000) * orderQty)}
                </span>
              </div>
            </div>

            <button type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer shadow-sm active:scale-[0.98] uppercase tracking-wide">
              <ShoppingCart className="w-4 h-4 inline mr-1" /> Transaksi POS
            </button>
          </form>
        </div>

        {/* KANAN: ANTREAN PESANAN */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 text-emerald-600" /> Antrean Dapur
            </h3>
            <span className="font-mono text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded text-[10px] font-bold">
              {orders.length} order
            </span>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {orders.map((o) => (
              <div key={o.ordId} className="p-4 bg-gray-50 border border-gray-150 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-gray-400">#{o.ordId}</span>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded font-mono ${
                      o.source === 'Walk-In POS' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      'bg-purple-50 text-purple-700 border border-purple-200'
                    }`}>{o.source}</span>
                    <span className="text-[10px] text-gray-400">{o.timeAgo}</span>
                  </div>
                  <p className="font-bold text-gray-900">{o.customerName}</p>
                  <p className="text-[11px] text-gray-500">{o.items}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0 border-t md:border-0 pt-2 md:pt-0 w-full md:w-auto justify-between">
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Total</span>
                    <span className="font-black text-gray-900 font-mono text-xs">{formatCurrency(o.totalSum)}</span>
                  </div>
                  <select value={o.status}
                    onChange={(e) => handleUpdateOrderStatus(o.ordId, e.target.value as RetailOrder['status'])}
                    className="border border-gray-200 bg-white p-1.5 rounded-lg text-xs font-semibold cursor-pointer">
                    <option value="Queued">Antre</option>
                    <option value="Baking">Panggang</option>
                    <option value="Completed">Selesai</option>
                    <option value="Refunded">Refund</option>
                  </select>
                  <button onClick={() => setActiveReceipt(o)}
                    className="bg-slate-900 text-white font-bold text-[10px] uppercase px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer">
                    <Printer className="w-3 h-3 inline" /> Cetak
                  </button>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8">Belum ada transaksi POS hari ini.</p>
            )}
          </div>
        </div>
      </div>

      {/* MODAL STRUK */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
              <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-400" /> Struk POS
              </span>
              <button onClick={() => setActiveReceipt(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 bg-amber-50/15 font-mono text-xs text-gray-800 space-y-4 leading-relaxed">
              <div className="text-center space-y-1">
                <h3 className="text-xs font-black uppercase text-gray-950 font-sans tracking-wide">NEAR BAKERY & CO.</h3>
                <p className="text-[9px] text-gray-500">Dapur Pusat Sektor 12, DKI Jakarta</p>
              </div>
              <div className="space-y-1 text-[10px] text-gray-600">
                <p className="flex justify-between">No Trans: <span className="font-bold text-gray-900">{activeReceipt.ordId}</span></p>
                <p className="flex justify-between">Customer: <span className="font-bold text-gray-900">{activeReceipt.customerName}</span></p>
                <p className="flex justify-between">Waktu: <span className="font-bold">{new Date().toLocaleString('id-ID')}</span></p>
              </div>
              <div className="border-b border-dashed border-gray-300"></div>
              <div className="space-y-1.5 font-bold">
                <div className="flex justify-between text-[11px] text-slate-900">
                  <span>{activeReceipt.items}</span>
                  <span className="font-mono">{formatCurrency(activeReceipt.totalSum)}</span>
                </div>
              </div>
              <div className="border-b border-dashed border-gray-300"></div>
              <p className="flex justify-between font-bold text-xs border-t border-dotted border-gray-200 pt-1.5 uppercase">
                TOTAL: <span className="text-emerald-800">{formatCurrency(activeReceipt.totalSum)}</span>
              </p>
              <div className="text-center pt-3 text-[8px] text-gray-400">
                Terima kasih atas kunjungan Anda!
              </div>
            </div>

            <div className="bg-slate-50 p-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button onClick={() => setActiveReceipt(null)}
                className="flex-1 py-2 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition cursor-pointer">
                Tutup
              </button>
              <button onClick={() => window.print()}
                className="flex-1 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer shadow-sm">
                <Printer className="w-4 h-4 inline mr-1" /> Cetak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
