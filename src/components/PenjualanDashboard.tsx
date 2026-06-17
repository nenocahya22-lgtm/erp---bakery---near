import React, { useState } from 'react';
import { CalculationResult, BahanBaku, ProductHpp, DetailResep, WasteLog, Cabang, SuratOrder } from '../types';
import PosKasirTab from './PosKasirTab';
import PesananOnlineTab from './PesananOnlineTab';
import CrmMarketingTab from './CrmMarketingTab';
import ChatTab from './ChatTab';
import ToppingsTab from './ToppingsTab';

interface PenjualanDashboardProps {
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  toppings?: { id: string; namaProduk: string; namaTopping: string; takaran: number; hargaJualTopping: number }[];
  wasteLogs: WasteLog[];
  cabangList: Cabang[];
  suratOrders: SuratOrder[];
  onAddTopping?: (topping: any) => void;
  onDeleteTopping?: (id: string) => void;
  onCompletePOSSale: (productName: string, qty: number, totalRevenue: number, source?: string) => void;
  onProductionComplete?: (productName: string, batchQty: number) => void;
}

export default function PenjualanDashboard(props: PenjualanDashboardProps) {
  const [subTab, setSubTab] = useState<'pos' | 'online' | 'crm' | 'chat' | 'toppings'>('pos');

  const tabs = [
    { key: 'pos' as const, label: '🛒 POS Kasir' },
    { key: 'online' as const, label: '📱 Pesanan Online' },
    { key: 'crm' as const, label: '📈 CRM Marketing' },
    { key: 'chat' as const, label: '💬 Chat Pembeli' },
    { key: 'toppings' as const, label: '🧩 Add-on & Topping' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 p-1.5 rounded-2xl flex gap-1 overflow-x-auto border border-slate-800">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all ${
              subTab === t.key
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'pos' && (
        <PosKasirTab
          calculatedProducts={props.calculatedProducts}
          onCompletePOSSale={props.onCompletePOSSale}
          toppings={props.toppings}
          detailResep={props.detailResep}
        />
      )}
      {subTab === 'online' && (
        <PesananOnlineTab
          calculatedProducts={props.calculatedProducts}
          productHpp={props.productHpp}
          detailResep={props.detailResep}
          bahanBaku={props.bahanBaku}
          onCompletePOSSale={props.onCompletePOSSale}
          onProductionComplete={props.onProductionComplete}
        />
      )}
      {subTab === 'crm' && (
        <CrmMarketingTab
          calculatedProducts={props.calculatedProducts}
          bahanBaku={props.bahanBaku}
          productHpp={props.productHpp}
          detailResep={props.detailResep}
          wasteLogs={props.wasteLogs}
          cabangList={props.cabangList}
          suratOrders={props.suratOrders}
        />
      )}
      {subTab === 'chat' && (
        <ChatTab />
      )}
      {subTab === 'toppings' && (
        <ToppingsTab
          toppings={props.toppings || []}
          productHpp={props.productHpp}
          bahanBaku={props.bahanBaku}
          onAddTopping={props.onAddTopping || (() => {})}
          onDeleteTopping={props.onDeleteTopping || (() => {})}
        />
      )}
    </div>
  );
}
