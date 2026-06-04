import React, { useState } from 'react';
import { Layers, ShieldCheck, ShoppingCart } from 'lucide-react';
import { CalculationResult } from '../types';

interface PesananOnlineTabProps {
  calculatedProducts: CalculationResult[];
  onCompletePOSSale: (productName: string, qty: number, totalRevenue: number) => void;
}

export default function PesananOnlineTab({ calculatedProducts, onCompletePOSSale }: PesananOnlineTabProps) {
  const [goFoodEnabled, setGoFoodEnabled] = useState(true);
  const [grabFoodEnabled, setGrabFoodEnabled] = useState(true);
  const [shopeeFoodEnabled, setShopeeFoodEnabled] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

  const handleSimulateDeliveryOrder = (platform: 'GoFood' | 'GrabFood' | 'ShopeeFood') => {
    const pName = calculatedProducts.length > 0
      ? calculatedProducts[Math.floor(Math.random() * calculatedProducts.length)].namaProduk
      : 'Roti Manis';
    const prodInfo = calculatedProducts.find(p => p.namaProduk === pName);
    const unitPrice = prodInfo ? prodInfo.hargaJualPerPorsi : 19000;
    const qty = Math.floor(Math.random() * 3) + 1;
    const items = `${qty} pcs ${pName}`;
    const txId = `TX-${Math.floor(1000 + Math.random() * 9005)}`;

    if (onCompletePOSSale) onCompletePOSSale(pName, qty, unitPrice * qty);

    alert(`🛎️ ${platform} ORDER MASUK!\nNo: ${txId}\nPesanan: ${items}\nStok bahan baku otomatis terpotong.`);
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Layers className="w-6 h-6 text-emerald-600" /> Pesanan Online (O2O Delivery)
        </h2>
        <p className="text-xs text-gray-500 mt-1">Simulasi integrasi GoFood, GrabFood, dan ShopeeFood. Stok otomatis terpotong.</p>
      </div>

      <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 shadow-xs space-y-5">
        <p className="text-[11px] text-slate-400">
          Hubungkan menu Near Bakery dengan dashboard mitra online. Setiap order simulasi otomatis mengurangi stok bahan baku.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* GoFood */}
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-rose-500 uppercase">GoFood</span>
              <input type="checkbox" checked={goFoodEnabled}
                onChange={(e) => setGoFoodEnabled(e.target.checked)}
                className="accent-emerald-500 cursor-pointer h-4 w-4" />
            </div>
            <button onClick={() => handleSimulateDeliveryOrder('GoFood')} disabled={!goFoodEnabled}
              className="w-full py-2 bg-rose-900/40 hover:bg-rose-900/60 disabled:bg-slate-900 disabled:text-slate-600 text-rose-200 text-xs font-bold uppercase rounded border border-rose-800/50 cursor-pointer transition">
              Simulasi Order GoFood
            </button>
          </div>

          {/* GrabFood */}
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-emerald-400 uppercase">GrabFood</span>
              <input type="checkbox" checked={grabFoodEnabled}
                onChange={(e) => setGrabFoodEnabled(e.target.checked)}
                className="accent-emerald-500 cursor-pointer h-4 w-4" />
            </div>
            <button onClick={() => handleSimulateDeliveryOrder('GrabFood')} disabled={!grabFoodEnabled}
              className="w-full py-2 bg-emerald-950/40 hover:bg-emerald-950/60 disabled:bg-slate-900 disabled:text-slate-600 text-emerald-300 text-xs font-bold uppercase rounded border border-emerald-800/50 cursor-pointer transition">
              Simulasi Order GrabFood
            </button>
          </div>

          {/* ShopeeFood */}
          <div className="bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-orange-500 uppercase">ShopeeFood</span>
              <input type="checkbox" checked={shopeeFoodEnabled}
                onChange={(e) => setShopeeFoodEnabled(e.target.checked)}
                className="accent-emerald-500 cursor-pointer h-4 w-4" />
            </div>
            <button onClick={() => handleSimulateDeliveryOrder('ShopeeFood')} disabled={!shopeeFoodEnabled}
              className="w-full py-2 bg-orange-950/40 hover:bg-orange-950/60 disabled:bg-slate-900 disabled:text-slate-600 text-orange-400 text-xs font-bold uppercase rounded border border-orange-800/50 cursor-pointer transition">
              Simulasi Order ShopeeFood
            </button>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Tiap penjualan ojol otomatis memotong bahan baku di dapur pusat.</span>
        </div>
      </div>
    </div>
  );
}
