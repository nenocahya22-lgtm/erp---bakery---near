import React, { useState } from 'react';
import { CalculationResult, BahanBaku, Cabang, BranchTransaction } from '../types';
import DashboardTab from './DashboardTab';
import EnterpriseDashboard from './EnterpriseDashboard';
import LaporanKeuanganTab from './LaporanKeuanganTab';

interface KeuanganDashboardProps {
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
  cabangList?: Cabang[];
  branchTransactions?: BranchTransaction[];
  wasteTotalLoss: number;
  rdTotalCost: number;
  onWipeAllData?: () => void;
  onSyncToFirestore?: () => Promise<void>;
}

export default function KeuanganDashboard(props: KeuanganDashboardProps) {
  const [subTab, setSubTab] = useState<'ringkasan' | 'pnl' | 'laporan'>('ringkasan');

  const tabs = [
    { key: 'ringkasan' as const, label: '👋 Ringkasan' },
    { key: 'pnl' as const, label: '📊 P&L Multi-Cabang' },
    { key: 'laporan' as const, label: '📊 Laporan Keuangan' },
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
      {subTab === 'pnl' && (
        <EnterpriseDashboard
          calculatedProducts={props.calculatedProducts}
          bahanBaku={props.bahanBaku}
        />
      )}
      {subTab === 'laporan' && (
        <LaporanKeuanganTab
          calculatedProducts={props.calculatedProducts}
          bahanBaku={props.bahanBaku}
          wasteTotalLoss={props.wasteTotalLoss}
          rdTotalCost={props.rdTotalCost}
        />
      )}
    </div>
  );
}
