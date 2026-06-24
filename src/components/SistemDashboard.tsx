import React, { useState } from 'react';
import { BahanBaku, Cabang, ProductHpp, CalculationResult, DetailResep } from '../types';
import WebStoreManagerTab from './WebStoreManagerTab';
import BackupSystemTab from './BackupSystemTab';

interface SistemDashboardProps {
  productHpp: ProductHpp[];
  calculatedProducts: CalculationResult[];
  bahanBaku: BahanBaku[];
  detailResep: DetailResep[];
  cabangList: Cabang[];
  onImportProduct?: (product: ProductHpp) => void;
}

export default function SistemDashboard({
  productHpp,
  calculatedProducts,
  bahanBaku,
  detailResep,
  cabangList,
  onImportProduct,
}: SistemDashboardProps) {
  const [subTab, setSubTab] = useState<'webstore' | 'backup'>('webstore');

  const tabs = [
    { key: 'webstore' as const, label: '🌐 Web Store' },
    { key: 'backup' as const, label: '💾 Backup & Restore' },
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

      {subTab === 'webstore' && (
        <WebStoreManagerTab
          productHpp={productHpp}
          calculatedProducts={calculatedProducts}
          bahanBaku={bahanBaku}
          detailResep={detailResep}
          cabangList={cabangList}
          onImportProduct={onImportProduct}
        />
      )}
      {subTab === 'backup' && (
        <BackupSystemTab
          calculatedProducts={calculatedProducts}
          bahanBaku={bahanBaku}
          productHpp={productHpp}
          detailResep={detailResep}
        />
      )}
    </div>
  );
}
