import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { BahanBaku, Cabang, SuratOrder, BranchStock, BranchTransaction, WasteLog, OpnameDraft, ProductHpp, CalculationResult, DetailResep } from '../types';
import DataPusatTab from './DataPusatTab';
import WebStoreManagerTab from './WebStoreManagerTab';
import BackupSystemTab from './BackupSystemTab';

interface SistemDashboardProps {
  bahanBaku: BahanBaku[];
  onAddMaterial: (m: BahanBaku) => void;
  onEditMaterial: (oldName: string, m: BahanBaku) => void;
  onDeleteMaterial: (name: string) => void;
  cabangList: Cabang[];
  onAddCabang: (c: Cabang) => void;
  onEditCabang: (id: string, c: Cabang) => void;
  onDeleteCabang: (id: string) => void;
  suratOrders: SuratOrder[];
  onAddSuratOrder: (so: SuratOrder) => void;
  onUpdateSuratOrder: (id: string, so: SuratOrder) => void;
  onReturSuratOrder?: (id: string, returNote: string) => void;
  cabangStok: BranchStock[];
  branchTransactions: BranchTransaction[];
  wasteLogs: WasteLog[];
  opnameDrafts: OpnameDraft[];
  onApproveOpname: (draftId: string) => void;
  onRejectOpname: (draftId: string, note?: string) => void;
  productHpp: ProductHpp[];
  calculatedProducts: CalculationResult[];
  detailResep: DetailResep[];
  onImportProduct?: (product: ProductHpp) => void;
  showConfirm: (opts: { title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: string; onConfirm: () => void; onCancel?: () => void }) => void;
}

export default function SistemDashboard(props: SistemDashboardProps) {
  const [subTab, setSubTab] = useState<'data_pusat' | 'webstore' | 'backup'>('data_pusat');

  const tabs = [
    { key: 'data_pusat' as const, label: '🏢 Data Pusat' },
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

      {subTab === 'data_pusat' && (
        <DataPusatTab
          bahanBaku={props.bahanBaku}
          onAddMaterial={props.onAddMaterial}
          onEditMaterial={props.onEditMaterial}
          onDeleteMaterial={props.onDeleteMaterial}
          cabangList={props.cabangList}
          onAddCabang={props.onAddCabang}
          onEditCabang={props.onEditCabang}
          onDeleteCabang={props.onDeleteCabang}
          suratOrders={props.suratOrders}
          onAddSuratOrder={props.onAddSuratOrder}
          onUpdateSuratOrder={props.onUpdateSuratOrder}
          onReturSuratOrder={props.onReturSuratOrder}
          cabangStok={props.cabangStok}
          branchTransactions={props.branchTransactions}
          wasteLogs={props.wasteLogs}
          opnameDrafts={props.opnameDrafts}
          onApproveOpname={props.onApproveOpname}
          onRejectOpname={props.onRejectOpname}
          showConfirm={props.showConfirm}
        />
      )}
      {subTab === 'webstore' && (
        <WebStoreManagerTab
          productHpp={props.productHpp}
          calculatedProducts={props.calculatedProducts}
          bahanBaku={props.bahanBaku}
          detailResep={props.detailResep}
          cabangList={props.cabangList}
          onImportProduct={props.onImportProduct}
        />
      )}
      {subTab === 'backup' && (
        <BackupSystemTab
          calculatedProducts={props.calculatedProducts}
          bahanBaku={props.bahanBaku}
        />
      )}
    </div>
  );
}
