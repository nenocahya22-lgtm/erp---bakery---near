import React, { useState } from 'react';
import { CalculationResult, BahanBaku, ProductHpp, DetailResep, WasteLog, Cabang, SuratOrder } from '../types';
import PosKasirTab from './PosKasirTab';
import PesananOnlineTab from './PesananOnlineTab';
import CrmMarketingTab from './CrmMarketingTab';
import ChatTab from './ChatTab';

interface PenjualanDashboardProps {
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  wasteLogs: WasteLog[];
  cabangList: Cabang[];
  suratOrders: SuratOrder[];
  onCompletePOSSale: (productName: string, qty: number, totalRevenue: number, source?: string) => void;
  onProductionComplete?: (productName: string, batchQty: number) => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  toppings?: any[];
}

export default function PenjualanDashboard(props: PenjualanDashboardProps) {
  const [subTab, setSubTab] = useState<'pos' | 'online' | 'crm' | 'chat'>('pos');

  const tabs = [
    { key: 'pos' as const, label: '🛒 POS Kasir' },
    { key: 'online' as const, label: '📱 Pesanan Online' },
    { key: 'crm' as const, label: '📈 CRM Marketing' },
    { key: 'chat' as const, label: '💬 Chat Pembeli' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 p-1.5 rounded-2xl flex gap-1 overflow-x-auto border border-slate-800">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider cursor-pointer transition-all ${
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
          showToast={props.showToast}
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
          showToast={props.showToast}
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
          showToast={props.showToast}
        />
      )}
      {subTab === 'chat' && (
        <ChatTab />
      )}
    </div>
  );
}
