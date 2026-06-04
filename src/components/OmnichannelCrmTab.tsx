import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Users,
  Layers,
  ShieldCheck,
  Mail,
  RefreshCw,
  Send,
  Check,
  Printer,
  X,
  Sparkles,
  Coins,
  Plus,
  Compass,
  AlertCircle,
  ToggleLeft,
  Smartphone,
  CheckCircle,
  Megaphone,
  ChefHat
} from 'lucide-react';
import { BahanBaku, DetailResep, CalculationResult } from '../types';

interface RetailOrder {
  ordId: string;
  source: 'Walk-In POS' | 'WhatsApp Order' | 'GrabFood' | 'GoFood' | 'ShopeeFood' | 'Web Toko';
  customerName: string;
  items: string;
  totalSum: number;
  status: 'Queued' | 'Baking' | 'Completed' | 'Refunded';
  timeAgo: string;
}

interface RFMGroup {
  segment: string;
  size: number;
  description: string;
  actionCode: string;
}

interface OmnichannelCrmTabProps {
  bahanBaku: BahanBaku[];
  detailResep: DetailResep[];
  calculatedProducts: CalculationResult[];
  onCompletePOSSale: (productName: string, qty: number, totalRevenue: number) => void;
}

export default function OmnichannelCrmTab({
  bahanBaku = [],
  detailResep = [],
  calculatedProducts = [],
  onCompletePOSSale,
}: OmnichannelCrmTabProps) {
  const [activeReceipt, setActiveReceipt] = useState<RetailOrder | null>(null);
  
  // POS Form Input States
  const [newCustName, setNewCustName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [orderQty, setOrderQty] = useState(1);
  const [orderSource, setOrderSource] = useState<RetailOrder['source']>('Walk-In POS');

  // Integrasi GoFood, GrabFood, ShopeeFood Config States (Simulasi API)
  const [goFoodEnabled, setGoFoodEnabled] = useState(true);
  const [grabFoodEnabled, setGrabFoodEnabled] = useState(true);
  const [shopeeFoodEnabled, setShopeeFoodEnabled] = useState(false);
  
  const [goFoodMerchantId, setGoFoodMerchantId] = useState('');
  const [grabFoodStoreId, setGrabFoodStoreId] = useState('');
  const [shopeeFoodPartnerId, setShopeeFoodPartnerId] = useState('');

  // Live POS coming queue
  const [orders, setOrders] = useState<RetailOrder[]>(() => {
    const saved = localStorage.getItem('pos_orders_data');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('pos_orders_data', JSON.stringify(orders));
  }, [orders]);

  // Customer RFM segmentation data
  const [customerSegments] = useState<RFMGroup[]>([]);

  // Quick WhatsApp blast simulator
  const [blastSending, setBlastSending] = useState(false);
  const [blastTarget, setBlastTarget] = useState('At Risk / Terancam Hilang (Chun)');

  // AI Marketing CMO States
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [marketingAdvice, setMarketingAdvice] = useState<string>('');
  const [salesDropReason, setSalesDropReason] = useState('');
  const [competitorFactor, setCompetitorFactor] = useState('');
  const [costChanges, setCostChanges] = useState('');
  const [selectedTargetProduct, setSelectedTargetProduct] = useState('');

  // Retrieve saved budget weights
  const getBudgetSplits = (totalRevenue: number) => {
    const wPct = parseFloat(localStorage.getItem('budget_waste_pct') || '3.5');
    const rPct = parseFloat(localStorage.getItem('budget_rd_pct') || '5.0');
    const oPct = parseFloat(localStorage.getItem('budget_ops_pct') || '15.0');
    const sPct = parseFloat(localStorage.getItem('budget_sdm_pct') || '25.0');
    const profitPct = 100 - (wPct + rPct + oPct + sPct);

    return {
      waste: Math.round(totalRevenue * (wPct / 100)),
      rd: Math.round(totalRevenue * (rPct / 100)),
      ops: Math.round(totalRevenue * (oPct / 100)),
      sdm: Math.round(totalRevenue * (sPct / 100)),
      profit: Math.round(totalRevenue * (profitPct / 100)),
      wPct, rPct, oPct, sPct, profitPct
    };
  };

  const handleCreatePOSOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      alert('Silakan pilih produk terlebih dahulu!');
      return;
    }

    const prodInfo = calculatedProducts.find(p => p.namaProduk === selectedProduct);
    const price = prodInfo ? prodInfo.hargaJualPerPorsi : 19000;
    const totalRevenue = price * orderQty;
    const itemsDescription = `${orderQty} pcs ${selectedProduct}`;
    const txId = `TX-${Math.floor(1000 + Math.random() * 9005)}`;

    const newOrder: RetailOrder = {
      ordId: txId,
      source: orderSource,
      customerName: newCustName.trim() || 'Pelanggan POS',
      items: itemsDescription,
      totalSum: totalRevenue,
      status: 'Queued',
      timeAgo: 'Baru saja'
    };

    setOrders(prev => [newOrder, ...prev]);
    
    // Deduct stock real-time immediately as requested by owner
    if (onCompletePOSSale) {
      onCompletePOSSale(selectedProduct, orderQty, totalRevenue);
    }

    // Reset Form
    setNewCustName('');
    setSelectedProduct('');
    setOrderQty(1);
  };

  // Simulasikan Masuk order via GrabOnline / GoOnline / ShopeeOnline
  const handleSimulateDeliveryOrder = (platform: 'GoFood' | 'GrabFood' | 'ShopeeFood') => {
    // Pick first calculated product if any, otherwise fallback to "Roti Manis"
    const pName = calculatedProducts.length > 0 
      ? calculatedProducts[Math.floor(Math.random() * calculatedProducts.length)].namaProduk 
      : 'Roti Manis Coklat';
    
    const prodInfo = calculatedProducts.find(p => p.namaProduk === pName);
    const unitPrice = prodInfo ? prodInfo.hargaJualPerPorsi : 19000;
    const qty = Math.floor(Math.random() * 3) + 1;
    const itemsDescription = `${qty} pcs ${pName}`;
    const txId = `TX-${Math.floor(1000 + Math.random() * 9005)}`;

    const rName = 'Pelanggan ' + platform;

    const deliveryOrder: RetailOrder = {
      ordId: txId,
      source: platform,
      customerName: rName,
      items: itemsDescription,
      totalSum: unitPrice * qty,
      status: 'Queued',
      timeAgo: 'Baru saja'
    };

    setOrders(prev => [deliveryOrder, ...prev]);

    // Fast deductive audit logic immediately
    if (onCompletePOSSale) {
      onCompletePOSSale(pName, qty, unitPrice * qty);
    }

    // Direct play buzzer alerts visually
    alert(`🛎️ ${platform} ORDER BARU MASUK!\nNo Trans: ${txId}\nNama: ${rName}\nPesanan: ${itemsDescription}\nStok bahan baku otomatis terpotong di dapur pusat.`);
  };

  const handleUpdateOrderStatus = (ordId: string, newStatus: RetailOrder['status']) => {
    setOrders(prev =>
      prev.map(o => o.ordId === ordId ? { ...o, status: newStatus } : o)
    );
  };

  const handleBlastWhatsApp = () => {
    setBlastSending(true);
    setTimeout(() => {
      setBlastSending(false);
      alert(`✅ Berhasil mengirim promosi digital ke- ${customerSegments.find(s => s.segment === blastTarget)?.size} nomor pelanggan segmen "${blastTarget}"!`);
    }, 1500);
  };

  // AI Marketing consultation handler
  const handleConsultCmo = async () => {
    setMarketingLoading(true);
    setMarketingAdvice('');
    try {
      const selectedProductHppObj = calculatedProducts.find(p => p.namaProduk === selectedTargetProduct);
      const metrics = selectedProductHppObj ? {
        namaProduk: selectedProductHppObj.namaProduk,
        hppPerPorsi: selectedProductHppObj.hppPerPorsi,
        overhead: selectedProductHppObj.overhead,
        hargaJual: selectedProductHppObj.hargaJual,
        marginPersen: selectedProductHppObj.marginPersen
      } : {
        info: "Menganalisis margin seluruh menu umum"
      };

      const res = await fetch('/api/marketing/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productMetrics: metrics,
          salesDropReason,
          competitorFactor,
          costChanges
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMarketingAdvice(data.text || 'Gagal merancang draf strategi pemasaran.');
      } else {
        setMarketingAdvice(`Gagal mengontak virtual CMO: ${data.error || 'Server error'}`);
      }
    } catch (err: any) {
      console.error(err);
      setMarketingAdvice(`Terjadi gangguan koneksi internet: ${err.message || err}`);
    } finally {
      setMarketingLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div id="omnichannel-tab-wrapper" className="space-y-6">
      
      {/* 1. TOP CARDS: POS Cashier checkout & O2O delivery simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT CARD (6 units): POS WALK-IN CASHIER CHECKOUT */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2.5">
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            Kasir Mandiri Walk-in POS
          </h3>

          <form onSubmit={handleCreatePOSOrder} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Nama Customer</label>
                <input
                  type="text"
                  placeholder="Contoh: Ibu Ranti"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full border border-gray-205 rounded-xl p-2.5 bg-white font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Saluran Transaksi</label>
                <select
                  value={orderSource}
                  onChange={(e) => setOrderSource(e.target.value as RetailOrder['source'])}
                  className="w-full border border-gray-205 rounded-xl p-2.5 bg-white"
                >
                  <option value="Walk-In POS">Walk-In POS (Kasir Offline)</option>
                  <option value="WhatsApp Order">WhatsApp Order</option>
                  <option value="Web Toko">Web Toko Online</option>
                  <option value="GoFood">GoFood Delivery</option>
                  <option value="GrabFood">GrabFood Delivery</option>
                  <option value="ShopeeFood">ShopeeFood Delivery</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Pilih Produk Roti / Kue</label>
              <select
                required
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full border border-gray-205 rounded-xl p-2.5 bg-white font-bold"
              >
                <option value="">-- Pilih Produk Menu ERP --</option>
                {calculatedProducts.map(p => (
                  <option key={p.namaProduk} value={p.namaProduk}>
                    {p.namaProduk} - {formatCurrency(p.hargaJualPerPorsi)} (HPP: {formatCurrency(p.hppPerPorsi)})
                  </option>
                ))}
              </select>
              {calculatedProducts.length === 0 && (
                <p className="text-[10px] text-amber-600 font-medium mt-1">⚠️ Belum ada produk aktif yang terhitung HPP nya di menu resep.</p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="w-1/3">
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Jumlah (Qty Porsi)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={orderQty}
                  onChange={(e) => setOrderQty(parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-205 rounded-xl p-2 font-mono font-bold text-center"
                />
              </div>

              <div className="flex-1 text-right bg-emerald-500/5 p-2 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-gray-400 block uppercase font-bold">Total Pembayaran Kasir</span>
                <span className="text-base font-black text-emerald-800 font-mono">
                  {formatCurrency((calculatedProducts.find(p => p.namaProduk === selectedProduct)?.hargaJualPerPorsi || 19000) * orderQty)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition cursor-pointer shadow-sm active:scale-[0.98] uppercase tracking-wide"
            >
              <ShoppingCart className="w-4 h-4" /> Masukkan & Cetak Transaksi POS
            </button>
          </form>
        </div>

        {/* RIGHT CARD (6 units): O2O INDENT MARKET CONNECTIONS GRAB/GO/SHOPEE */}
        <div className="lg:col-span-6 bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2.5 font-mono">
            <Layers className="w-4 h-4 text-emerald-400 animate-pulse" />
            Integrasi Omnichannel Delivery (GoFood/Grab/Shopee)
          </h3>

          <p className="text-[11px] text-slate-400 leading-normal">
            Hubungkan menu dan sediaan bahan baku Near Bakery and Co dengan dashboard GoFood Merchant, GrabFood, & ShopeeFood secara otomatis.
          </p>

          <div className="grid grid-cols-3 gap-2.5 text-xs">
            {/* GoFood Panel */}
            <div className="bg-slate-950 p-2.5 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-rose-500 font-mono uppercase">GoFood O2O</span>
                <input 
                  type="checkbox" 
                  checked={goFoodEnabled} 
                  onChange={(e) => setGoFoodEnabled(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 accent-emerald-500 cursor-pointer h-3.5 w-3.5" 
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">ID Merchant</label>
                <input 
                  type="text" 
                  value={goFoodMerchantId} 
                  onChange={(e) => setGoFoodMerchantId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded text-[9px] p-1 font-mono text-slate-200 outline-none" 
                  disabled={!goFoodEnabled} 
                />
              </div>
              <button
                onClick={() => handleSimulateDeliveryOrder('GoFood')}
                disabled={!goFoodEnabled}
                className="w-full py-1 bg-rose-900/40 hover:bg-rose-900/60 disabled:bg-slate-900 disabled:text-slate-600 text-rose-200 text-[9px] font-mono font-bold uppercase rounded border border-rose-800/50 cursor-pointer transition"
              >
                Simulasi Order
              </button>
            </div>

            {/* GrabFood Panel */}
            <div className="bg-slate-950 p-2.5 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-emerald-400 font-mono uppercase">GrabFood</span>
                <input 
                  type="checkbox" 
                  checked={grabFoodEnabled} 
                  onChange={(e) => setGrabFoodEnabled(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 accent-emerald-500 cursor-pointer h-3.5 w-3.5" 
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">ID Store</label>
                <input 
                  type="text" 
                  value={grabFoodStoreId} 
                  onChange={(e) => setGrabFoodStoreId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded text-[9px] p-1 font-mono text-slate-200 outline-none" 
                  disabled={!grabFoodEnabled} 
                />
              </div>
              <button
                onClick={() => handleSimulateDeliveryOrder('GrabFood')}
                disabled={!grabFoodEnabled}
                className="w-full py-1 bg-emerald-950/40 hover:bg-emerald-950/60 disabled:bg-slate-900 disabled:text-slate-600 text-emerald-300 text-[9px] font-mono font-bold uppercase rounded border border-emerald-800/50 cursor-pointer transition"
              >
                Simulasi Order
              </button>
            </div>

            {/* ShopeeFood Panel */}
            <div className="bg-slate-950 p-2.5 border border-slate-800 rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-orange-500 font-mono uppercase">ShopeeFood</span>
                <input 
                  type="checkbox" 
                  checked={shopeeFoodEnabled} 
                  onChange={(e) => setShopeeFoodEnabled(e.target.checked)}
                  className="rounded border-slate-800 bg-slate-900 accent-emerald-500 cursor-pointer h-3.5 w-3.5" 
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">ID Partner</label>
                <input 
                  type="text" 
                  value={shopeeFoodPartnerId} 
                  onChange={(e) => setShopeeFoodPartnerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded text-[9px] p-1 font-mono text-slate-200 outline-none" 
                  disabled={!shopeeFoodEnabled} 
                />
              </div>
              <button
                onClick={() => handleSimulateDeliveryOrder('ShopeeFood')}
                disabled={!shopeeFoodEnabled}
                className="w-full py-1 bg-orange-950/40 hover:bg-orange-950/60 disabled:bg-slate-900 disabled:text-slate-600 text-orange-400 text-[9px] font-mono font-bold uppercase rounded border border-orange-800/50 cursor-pointer transition"
              >
                Simulasi Order
              </button>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 text-[10px] leading-relaxed text-slate-400 mt-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Sistem sinkronisasi live O2O di atas terintegrasi dengan persediaan stok di kitchen & gudang. Tiap penjualan ojol sukses otomatis memotong bahan baku pendukung.</span>
          </div>
        </div>

      </div>

      {/* 2. DEDICATED MODULE: VIRTUAL AI MARKETING CMO OFFICE WORKSPACE */}
      <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-3 gap-2">
          <div className="space-y-1">
            <h3 className="text-sm font-black text-gray-950 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Megaphone className="w-5 h-5 text-indigo-600 animate-bounce-slow" />
              Divisi Virtual AI Marketing CMO (Pengganti Tim Marketing)
            </h3>
            <p className="text-xs text-gray-550 leading-normal max-w-xl">
              Rancang keputusan taktis marketing Anda seketika. Deteksi alasan drop penjualan, buat draf promosi, campaign sosial media gratis, dan strategi HPP baru tanpa merekrut tim marketing eksternal yang mahal!
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-55 border border-emerald-150 px-2.5 py-1 rounded-full uppercase leading-none">
            Gemini CMO Executive Active
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* Virtual Advisor Inputs */}
          <div className="lg:col-span-4 bg-slate-50 p-4.5 rounded-2xl border border-gray-200/60 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase border-b border-gray-200 pb-1.5 flex items-center gap-1 font-mono">
              <Compass className="w-4 h-4 text-indigo-600" /> Profiler Drop Penjualan:
            </h4>

            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Target Menu Analisis</label>
              <select
                value={selectedTargetProduct}
                onChange={(e) => setSelectedTargetProduct(e.target.value)}
                className="w-full border border-gray-200 bg-white rounded-lg p-2.5 font-semibold focus:outline-none"
              >
                <option value="">-- Semua Menu (Pemeriksaan Umum) --</option>
                {calculatedProducts.map(p => (
                  <option key={p.namaProduk} value={p.namaProduk}>{p.namaProduk}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Gejala Utama Penurunan Penjualan</label>
              <textarea
                rows={2}
                value={salesDropReason}
                onChange={(e) => setSalesDropReason(e.target.value)}
                className="w-full border border-gray-205 rounded-xl p-2.5 bg-white text-xs resize-none"
                placeholder="Misal: Customer merasa terigu roti terlalu kasar..."
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Aksi Agresif Kompetitor Terdekat</label>
              <input
                type="text"
                value={competitorFactor}
                onChange={(e) => setCompetitorFactor(e.target.value)}
                className="w-full border border-gray-205 rounded-xl p-2.5 bg-white text-xs"
                placeholder="Misal: Ada outlet baru buka 100 meter dari sini..."
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Kenaikan Biaya Bahan Baku Toko</label>
              <input
                type="text"
                value={costChanges}
                onChange={(e) => setCostChanges(e.target.value)}
                className="w-full border border-gray-205 rounded-xl p-2.5 bg-white text-xs font-medium text-amber-700"
                placeholder="Misal: Mentega naik 10% & telur naik 15%..."
              />
            </div>

            <button
              onClick={handleConsultCmo}
              disabled={marketingLoading}
              className="w-full py-3 bg-indigo-650 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-gray-300 text-white font-bold text-xs uppercase rounded-xl shadow-md transition cursor-pointer flex justify-center items-center gap-1.5"
            >
              {marketingLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Menciptakan Strategi...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  Saran Virtual AI CMO
                </>
              )}
            </button>
          </div>

          {/* AI Output Workspace Render Panel */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 min-h-[350px] flex flex-col justify-between font-sans shadow-inner text-slate-350">
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px] pr-1.5 scrollbar-thin">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-indigo-400 border border-indigo-900 px-2 py-0.5 rounded bg-indigo-950/40">
                Papan Konsultasi Strategis CMO
              </span>
              
              {marketingLoading ? (
                <div className="py-20 text-center space-y-4">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-xs text-indigo-300 font-bold tracking-widest uppercase animate-pulse-slow">AI Marketing Team sedang merumuskan kalkulasi margin, draf copy, dan promo...</p>
                </div>
              ) : marketingAdvice ? (
                <div className="prose text-xs text-slate-100 whitespace-pre-wrap font-sans leading-relaxed space-y-3">
                  <p className="font-semibold text-slate-200">Hasil Rekomendasi Virtual AI Marketing Expert:</p>
                  <p>{marketingAdvice}</p>
                </div>
              ) : (
                <div className="py-20 text-center space-y-2">
                  <Megaphone className="w-10 h-10 text-slate-700 mx-auto stroke-1" />
                  <h5 className="font-bold text-slate-500 uppercase">Hub Virtual CMO Siap Digunakan</h5>
                  <p className="text-[11px] text-slate-600 max-w-sm mx-auto leading-normal">
                    Pilih target menu atau biarkan kosong, lengkapi profil penurunan penjualan di sisi kiri, lalu klik <strong>Saran Virtual AI CMO</strong> untuk mengaktifkan marketing internal virtual Anda.
                  </p>
                </div>
              )}
            </div>

            <p className="text-[9px] text-slate-600 font-mono mt-4 pt-4 border-t border-slate-850">
              Disclaimer: Seluruh respons strategis dirumuskan oleh kecerdasan buatan Gemini berdasarkan kalkulasi HPP dan target margin resep Anda secara real-time.
            </p>
          </div>

        </div>
      </div>

      {/* 3. ORIGINAL VIEW: ACTIVE ORDERS QUEUE & CRM RFM SENDER */}
      <div id="omnichannel-lower-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ACTIVE SINKRONISASI ORDERS QUEUE */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-2.5">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <ChefHat className="w-4 h-4 text-emerald-600" />
                Daftar & Antrean Live Pemanggangan (Dapur)
              </h3>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">Pantau adonan baker dan level penanganan sediaan</p>
            </div>
            <span className="font-mono text-emerald-800 bg-emerald-50 border border-emerald-150 px-2.5 py-0.5 rounded text-[10px] font-bold">
              {orders.length} order live
            </span>
          </div>

          <div className="space-y-3.5">
            {orders.map((o) => {
              const splits = getBudgetSplits(o.totalSum);
              
              return (
                <div
                  key={o.ordId}
                  className="p-4 bg-gray-50 border border-gray-150 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs hover:bg-gray-100/50 transition-colors"
                >
                  <div className="space-y-1 truncate pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-gray-400">#{o.ordId}</span>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded font-mono ${
                        o.source === 'Walk-In POS' ? 'bg-blue-50 text-blue-700 border border-blue-150' :
                        o.source === 'GoFood' ? 'bg-red-50 text-red-700 border border-red-150' :
                        o.source === 'GrabFood' ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' :
                        o.source === 'ShopeeFood' ? 'bg-orange-50 text-orange-700 border border-orange-150' :
                        'bg-purple-50 text-purple-700 border border-purple-150'
                      }`}>
                        {o.source}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium">{o.timeAgo}</span>
                    </div>

                    <p className="font-bold text-gray-950 font-sans truncate">{o.customerName}</p>
                    <p className="text-[11px] text-slate-650 font-semibold font-sans">{o.items}</p>
                    
                    {/* Tiny split allocations overview */}
                    <p className="text-[9px] text-gray-400 font-mono flex flex-wrap gap-1 pt-1 border-t border-gray-200 mt-1">
                      <span>Waste: <span className="font-bold text-amber-700">{formatCurrency(splits.waste)}</span></span>
                      <span>•</span>
                      <span>R&D: <span className="font-bold text-emerald-700">{formatCurrency(splits.rd)}</span></span>
                      <span>•</span>
                      <span>OPEX: <span className="font-bold text-blue-700">{formatCurrency(splits.ops)}</span></span>
                      <span>•</span>
                      <span>SDM: <span className="font-bold text-indigo-700">{formatCurrency(splits.sdm)}</span></span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0 border-t md:border-0 pt-2 md:pt-0">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Total Akhir</span>
                      <span className="font-black text-gray-950 font-mono text-xs">{formatCurrency(o.totalSum)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={o.status}
                        onChange={(e) => handleUpdateOrderStatus(o.ordId, e.target.value as RetailOrder['status'])}
                        className="border border-gray-200 bg-white p-1 rounded-lg text-xs font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="Queued">Antre</option>
                        <option value="Baking">Panggang</option>
                        <option value="Completed">Selesai (Completed)</option>
                        <option value="Refunded">Selesai/Refund</option>
                      </select>

                      <button
                        onClick={() => setActiveReceipt(o)}
                        className="inline-flex items-center gap-1 bg-slate-900 text-white font-bold text-[10px] uppercase px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
                      >
                        <Printer className="w-3 h-3" />
                        Preview Cetak
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: CRM LOYALTY RFM GROUPS */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* RFM GROUP METRIC CARDS */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-gray-100">
              <Users className="w-4 h-4 text-emerald-600" />
              Saran AI RFM CRM
            </h3>

            <p className="text-xs text-gray-500">
              Pengelompokan konsumen berdasarkan Recency, Frequency, Monetary (RFM) guna menggerakkan retensi pembeli roti yang loyal.
            </p>

            <div className="space-y-4 pt-1">
              {customerSegments.map((g, idx) => (
                <div key={idx} className="p-3.5 bg-gray-50 border border-gray-150 rounded-xl space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-xs font-bold leading-none">
                    <span className="text-gray-950 font-sans">{g.segment}</span>
                    <span className="font-mono text-emerald-800 bg-white border border-emerald-150 px-2 py-0.5 rounded text-[10px] font-bold">
                      {g.size} member
                    </span>
                  </div>
                  <p className="text-gray-500 text-[11px] font-medium leading-relaxed">{g.description}</p>
                  
                  <div className="bg-white border border-gray-200 p-2 rounded text-[10px] text-emerald-700 font-bold flex justify-between items-center">
                    <span>Langkah: <span className="font-semibold text-gray-600">{g.actionCode}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DYNAMIC WHATSAPP CAMPAIGN SENDER */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-emerald-600" />
              Pemasaran Voucher Toko Otomatis
            </h3>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Pilih Segment Sasaran</label>
                <select
                  value={blastTarget}
                  onChange={(e) => setBlastTarget(e.target.value)}
                  className="w-full border border-gray-205 rounded-lg p-2.5 bg-white text-xs"
                >
                  {customerSegments.map(g => (
                    <option key={g.segment} value={g.segment}>{g.segment}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Templat Pesan Kupon Retensi</label>
                <textarea
                  readOnly
                  rows={2}
                  value="Hi [Pelanggan]! Kami rindu aroma mentega hangat di etalase Anda. Yuk tukarkan voucher roti cokelat gratis dengan meng-klik kupon digital berikut..."
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg p-2 font-medium text-gray-500 resize-none leading-relaxed"
                />
              </div>

              <button
                onClick={handleBlastWhatsApp}
                disabled={blastSending}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
              >
                {blastSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Memproses Blast...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Kirim Blast Pemberitahuan WA
                  </>
                )}
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* RETAIL STRUK PRINTABLE NOTA MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-gray-100 shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Title bar */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 animate-fade-in">
              <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-400" /> POS Kasir Receipt Viewer
              </span>
              <button 
                onClick={() => setActiveReceipt(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Slip Body Content Area */}
            <div id="order-printout-canvas" className="p-6 bg-amber-50/15 overflow-y-auto font-mono text-xs text-gray-850 space-y-4 leading-relaxed">
              
              {/* Receipt Header branding */}
              <div className="text-center space-y-1">
                <h3 className="text-xs font-black uppercase text-gray-950 font-sans tracking-wide">NEAR BAKERY & CO. ERP</h3>
                <p className="text-[9px] text-gray-550 leading-none">Dapur Pusat & Sektor Retail Utama Sektor 123</p>
                <p className="text-[8px] text-gray-400">Gedung Administrasi Sektor 12, DKI Jakarta</p>
                <p className="text-[9px] text-gray-500 font-bold border-b border-dashed border-gray-300 pb-2.5">Telp: (021) 8550-XXXX | WA: 0812-XXXX</p>
              </div>

              {/* Receipt metadata */}
              <div className="space-y-1 text-[10px] text-gray-600">
                <p className="flex justify-between">No Trans: <span className="font-bold text-gray-900">{activeReceipt.ordId}</span></p>
                <p className="flex justify-between">Kasir Op: <span className="font-bold">ADMIN OWNER (STAFF)</span></p>
                <p className="flex justify-between">Pelanggan: <span className="font-bold uppercase text-gray-900">{activeReceipt.customerName}</span></p>
                <p className="flex justify-between">Saluran POS: <span className="font-bold text-emerald-800">{activeReceipt.source}</span></p>
                <p className="flex justify-between">Waktu Log: <span className="font-bold">{new Date().toLocaleString('id-ID')}</span></p>
              </div>

              {/* Divider lines */}
              <div className="border-b border-dashed border-gray-300"></div>

              {/* Items listing breakdown */}
              <div className="space-y-2.5">
                <div className="text-[9px] font-bold text-gray-400 flex justify-between uppercase">
                  <span>Deskripsi Item</span>
                  <span>Total Harga</span>
                </div>
                
                {/* Parse listed items or map */}
                <div className="space-y-1.5 font-bold">
                  <div className="flex justify-between text-[11px] text-slate-900">
                    <span className="font-sans pr-4 leading-normal">{activeReceipt.items}</span>
                    <span className="font-mono self-end shrink-0">{formatCurrency(activeReceipt.totalSum - Math.round(activeReceipt.totalSum * 0.1))}</span>
                  </div>
                </div>
              </div>

              {/* Divider lines */}
              <div className="border-b border-dashed border-gray-300 pt-1"></div>

              {/* Subtotal mathematics */}
              <div className="space-y-1 text-[10px] text-gray-650 font-semibold">
                <p className="flex justify-between">Subtotal DPP: <span>{formatCurrency(activeReceipt.totalSum - Math.round(activeReceipt.totalSum * 0.1))}</span></p>
                <p className="flex justify-between">PPN (11% terhitung): <span>{formatCurrency(Math.round(activeReceipt.totalSum * 0.1))}</span></p>
                <p className="flex justify-between font-bold text-xs text-gray-950 border-t border-dotted border-gray-200 pt-1.5 uppercase font-mono">
                  TOTAL AKHIR: <span className="text-emerald-800">{formatCurrency(activeReceipt.totalSum)}</span>
                </p>
              </div>

              {/* Real-time split percentages and amounts requested by Owner */}
              <div className="border-t border-dashed border-gray-300 pt-2.5 space-y-1 font-mono text-[9px] text-slate-700 bg-slate-50 p-2 rounded-lg">
                <p className="font-sans font-bold text-gray-900 border-b border-gray-200 pb-1 mb-1 text-[10px] uppercase flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" /> Alokasi Pendapatan ERP:
                </p>
                {(() => {
                  const splits = getBudgetSplits(activeReceipt.totalSum);
                  return (
                    <>
                      <p className="flex justify-between">1. Alokasi Waste ({splits.wPct}%): <span className="font-bold text-amber-705">{formatCurrency(splits.waste)}</span></p>
                      <p className="flex justify-between">2. Alokasi R&D ({splits.rPct}%): <span className="font-bold text-emerald-705">{formatCurrency(splits.rd)}</span></p>
                      <p className="flex justify-between">3. Alokasi OPEX ({splits.oPct}%): <span className="font-bold text-blue-705">{formatCurrency(splits.ops)}</span></p>
                      <p className="flex justify-between">4. Alokasi Gaji ({splits.sPct}%): <span className="font-bold text-purple-705">{formatCurrency(splits.sdm)}</span></p>
                      <p className="flex justify-between font-bold border-t border-dotted border-gray-250 pt-1 text-gray-950 text-[10px]">
                        LABA BERSIH ({splits.profitPct.toFixed(1)}%): <span className="text-emerald-800">{formatCurrency(splits.profit)}</span>
                      </p>
                    </>
                  );
                })()}
              </div>

              {/* Footer notice barcode emulator */}
              <div className="text-center pt-5 space-y-2 select-none">
                <p className="text-[8px] text-gray-400 leading-normal">
                  Terima kasih atas kunjungan Anda di Near Bakery & Co.!
                  <br />
                  Nota ini merupakan bukti transaksi POS resmi Sektor 123.
                </p>
                
                {/* Visual barcode mockup inside thermal receipt */}
                <div className="w-40 h-8 mx-auto bg-slate-100 border border-slate-200 flex flex-col justify-center gap-0.5 py-1 px-3">
                  <div className="h-full bg-slate-900 border-l border-r border-slate-900"></div>
                  <span className="text-[7px] font-mono font-bold text-slate-500 uppercase tracking-widest">{activeReceipt.ordId}</span>
                </div>
              </div>

            </div>

            {/* Actions panel */}
            <div className="bg-slate-50 p-4 border-t border-gray-100 flex gap-3 shrink-0">
              <button
                onClick={() => setActiveReceipt(null)}
                className="flex-1 py-2 text-center text-xs font-semibold text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:bg-gray-100 rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2 text-center text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex justify-center items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Printer className="w-4 h-4" /> CETAK NOTA / PRINT
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
