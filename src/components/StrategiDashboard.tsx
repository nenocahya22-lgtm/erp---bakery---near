import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { CalculationResult, BahanBaku, ProductHpp, DetailResep, Cabang, BranchTransaction } from '../types';
import HargaHppTab from './HargaHppTab';
import AnggaranAlokasiTab from './AnggaranAlokasiTab';
import BepTab from './BepTab';
import DashboardTab from './DashboardTab';

interface StrategiDashboardProps {
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
  productHpp?: ProductHpp[];
  detailResep?: DetailResep[];
  cabangList?: Cabang[];
  branchTransactions?: BranchTransaction[];
  wasteTotalLoss: number;
  rdTotalCost: number;
  onWipeAllData?: () => void;
  onSyncToFirestore?: () => Promise<void>;
  onUpdateProductPricing?: (productName: string, hargaJualPerPorsi: number, hargaJualVarian: Record<string, number>, isActive: boolean) => void;
  onDeleteProduct?: (name: string) => void;
  onEditMaterial?: (oldName: string, m: BahanBaku) => void;
  showConfirm: (opts: { title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: string; onConfirm: () => void; onCancel?: () => void }) => void;
}

export default function StrategiDashboard(props: StrategiDashboardProps) {
  const [subTab, setSubTab] = useState<'ringkasan' | 'hpp' | 'anggaran' | 'bep'>('ringkasan');

  const tabs = [
    { key: 'ringkasan' as const, label: '👋 Ringkasan' },
    { key: 'hpp' as const, label: '📊 Harga & Modal' },
    { key: 'anggaran' as const, label: '💰 Anggaran & Alokasi' },
    { key: 'bep' as const, label: '🧮 BEP & Balance' },
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

      {subTab === 'ringkasan' && (
        <DashboardTab
          calculatedProducts={props.calculatedProducts}
          bahanBaku={props.bahanBaku}
          cabangList={props.cabangList}
          branchTransactions={props.branchTransactions}
          onWipeAllData={props.onWipeAllData}
          onSyncToFirestore={props.onSyncToFirestore}
        />
      )}
      {subTab === 'hpp' && props.productHpp && (
        <HargaHppTab
          bahanBaku={props.bahanBaku}
          calculatedProducts={props.calculatedProducts}
          detailResep={props.detailResep || []}
          onUpdateProductPricing={props.onUpdateProductPricing!}
          onDeleteProduct={props.onDeleteProduct!}
          onEditMaterial={props.onEditMaterial!}
          showConfirm={props.showConfirm}
        />
      )}
      {subTab === 'anggaran' && (
        <AnggaranAlokasiTab
          calculatedProducts={props.calculatedProducts}
          bahanBaku={props.bahanBaku}
          wasteTotalLoss={props.wasteTotalLoss}
          rdTotalCost={props.rdTotalCost}
          showConfirm={props.showConfirm}
        />
      )}
      {subTab === 'bep' && (
        <BepTab
          calculatedProducts={props.calculatedProducts}
          bahanBaku={props.bahanBaku}
          showConfirm={props.showConfirm}
        />
      )}
    </div>
  );
}
