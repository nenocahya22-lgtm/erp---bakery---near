import React, { useState } from 'react';
import { BahanBaku, Cabang, SuratOrder, BranchStock, BranchTransaction, WasteLog, OpnameDraft } from '../types';
import DataPusatTab from './DataPusatTab';
import MaterialsTab from './MaterialsTab';

interface InventarisTabProps {
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
}

export default function InventarisTab(props: InventarisTabProps) {
  const [subTab, setSubTab] = useState<'pusat' | 'stok'>('pusat');

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 p-1.5 rounded-2xl flex gap-1 overflow-x-auto border border-slate-800">
        <button
          onClick={() => setSubTab('pusat')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all ${
            subTab === 'pusat'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          🏛️ Data Pusat
        </button>
        <button
          onClick={() => setSubTab('stok')}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all ${
            subTab === 'stok'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          📦 Monitor Stok Cabang
        </button>
      </div>

      {subTab === 'pusat' && (
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
    </div>
  );
}
