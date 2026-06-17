import React, { useState } from 'react';
import { BahanBaku, Cabang, SuratOrder, BranchStock, BranchTransaction, WasteLog, OpnameDraft, ProductHpp, WriteOffLog, CalculationResult } from '../types';
import DataPusatTab from './DataPusatTab';
import MaterialsTab from './MaterialsTab';
import FefoExpiryTab from './FefoExpiryTab';
import WasteControlTab from './WasteControlTab';
import ComplianceSafetyTab from './ComplianceSafetyTab';

interface LogistikDashboardProps {
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
  writeOffLogs: WriteOffLog[];
  opnameDrafts: OpnameDraft[];
  onApproveOpname: (draftId: string) => void;
  onRejectOpname: (draftId: string, note?: string) => void;
  productHpp: ProductHpp[];
  calculatedProducts: CalculationResult[];
  onAddWasteLog?: (log: any) => void;
  onDeleteWasteLog?: (id: string) => void;
  onAddWriteOff?: (log: any) => void;
  onDeleteWriteOff?: (id: string) => void;
  showConfirm: (opts: { title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: string; onConfirm: () => void; onCancel?: () => void }) => void;
}

export default function LogistikDashboard(props: LogistikDashboardProps) {
  const [subTab, setSubTab] = useState<'data' | 'stok' | 'fefo' | 'waste' | 'compliance'>('data');

  const tabs = [
    { key: 'data' as const, label: '🏢 Data Pusat' },
    { key: 'stok' as const, label: '📦 Monitor Stok' },
    { key: 'fefo' as const, label: '📋 FEFO & Expiry' },
    { key: 'waste' as const, label: '🗑️ Waste' },
    { key: 'compliance' as const, label: '🧊 Recall Pangan' },
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

      {subTab === 'data' && (
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
      {subTab === 'stok' && (
        <MaterialsTab
          bahanBaku={props.bahanBaku}
          cabangList={props.cabangList}
          cabangStok={props.cabangStok}
          suratOrders={props.suratOrders}
          onUpdateSuratOrder={props.onUpdateSuratOrder}
        />
      )}
      {subTab === 'fefo' && (
        <FefoExpiryTab
          bahanBaku={props.bahanBaku}
          productHpp={props.productHpp}
          cabangList={props.cabangList}
          suratOrders={props.suratOrders}
          cabangStok={props.cabangStok}
          onAddWasteLog={props.onAddWasteLog}
        />
      )}
      {subTab === 'waste' && (
        <WasteControlTab
          bahanBaku={props.bahanBaku}
          wasteLogs={props.wasteLogs}
          onAddWasteLog={props.onAddWasteLog || (() => {})}
          onDeleteWasteLog={props.onDeleteWasteLog || (() => {})}
          calculatedProducts={props.calculatedProducts}
          writeOffLogs={props.writeOffLogs}
          onAddWriteOff={props.onAddWriteOff || (() => {})}
          onDeleteWriteOff={props.onDeleteWriteOff || (() => {})}
        />
      )}
      {subTab === 'compliance' && (
        <ComplianceSafetyTab
          productHpp={props.productHpp}
          onAddWasteLog={props.onAddWasteLog}
          cabangList={props.cabangList}
          showConfirm={props.showConfirm}
        />
      )}
    </div>
  );
}
