import React, { useState } from 'react';
import { BahanBaku, Cabang, SuratOrder, BranchStock, BranchTransaction, WasteLog, OpnameDraft } from '../types';
import {
  Building2, Package, BarChart3, Star, Truck, ClipboardCheck, FileText
} from 'lucide-react';
import DataPusatCabangSection from './DataPusatCabangSection';
import DataPusatBahanSection from './DataPusatBahanSection';
import DataPusatStokCabangSection from './DataPusatStokCabangSection';
import DataPusatSupplierSection from './DataPusatSupplierSection';
import DataPusatPengirimanSection from './DataPusatPengirimanSection';
import DataPusatStokOpnameSection from './DataPusatStokOpnameSection';
import DataPusatRekapSection from './DataPusatRekapSection';

interface DataPusatTabProps {
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
  showConfirm: (opts: { title: string; message: string; confirmLabel?: string; cancelLabel?: string; variant?: string; onConfirm: () => void; onCancel: () => void }) => void;
}

export default function DataPusatTab({
  bahanBaku, onAddMaterial, onEditMaterial, onDeleteMaterial,
  cabangList, onAddCabang, onEditCabang, onDeleteCabang,
  suratOrders, onAddSuratOrder, onUpdateSuratOrder, onReturSuratOrder,
  cabangStok, branchTransactions, wasteLogs,
  opnameDrafts, onApproveOpname, onRejectOpname, showConfirm,
}: DataPusatTabProps) {
  const [activeSection, setActiveSection] = useState<'cabang' | 'inventaris' | 'stok_cabang' | 'supplier' | 'pengiriman' | 'stok_opname' | 'rekap'>('cabang');

  const sectionBtn = (key: typeof activeSection, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setActiveSection(key)}
      className={`px-4 py-2 text-xs font-bold uppercase rounded-xl transition cursor-pointer ${
        activeSection === key ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <Building2 className="w-6 h-6 text-emerald-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">🏛️ Data Pusat</h2>
            <p className="text-xs text-gray-500">Kelola cabang, bahan baku, stok pusat, dan surat order ke seluruh outlet.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {sectionBtn('cabang', `Cabang (${cabangList.length})`, <Building2 className="w-3.5 h-3.5 inline" />)}
          {sectionBtn('inventaris', `Data Bahan + Stok Pusat (${bahanBaku.length})`, <Package className="w-3.5 h-3.5 inline" />)}
          {sectionBtn('stok_cabang', 'Stok Per Cabang', <BarChart3 className="w-3.5 h-3.5 inline" />)}
          {sectionBtn('supplier', 'Supplier & PO', <Star className="w-3.5 h-3.5 inline" />)}
          {sectionBtn('pengiriman', `Pengiriman (${suratOrders.length})`, <Truck className="w-3.5 h-3.5 inline" />)}
          {sectionBtn('stok_opname', 'Stok Opname', <ClipboardCheck className="w-3.5 h-3.5 inline" />)}
          {sectionBtn('rekap', '📋 Rekap', <FileText className="w-3.5 h-3.5 inline" />)}
        </div>
      </div>

      {/* ─── SECTIONS ─── */}
      {activeSection === 'cabang' && (
        <DataPusatCabangSection
          cabangList={cabangList}
          onAddCabang={onAddCabang}
          onEditCabang={onEditCabang}
          onDeleteCabang={onDeleteCabang}
        />
      )}

      {activeSection === 'inventaris' && (
        <DataPusatBahanSection
          bahanBaku={bahanBaku}
          onAddMaterial={onAddMaterial}
          onEditMaterial={onEditMaterial}
          onDeleteMaterial={onDeleteMaterial}
          showConfirm={showConfirm}
          cabangList={cabangList}
          suratOrders={suratOrders}
        />
      )}

      {activeSection === 'stok_cabang' && (
        <DataPusatStokCabangSection
          cabangList={cabangList}
          cabangStok={cabangStok}
          branchTransactions={branchTransactions}
          suratOrders={suratOrders}
          bahanBaku={bahanBaku}
          wasteLogs={wasteLogs}
        />
      )}

      {activeSection === 'supplier' && (
        <DataPusatSupplierSection
          bahanBaku={bahanBaku}
          onEditMaterial={onEditMaterial}
          showConfirm={showConfirm}
        />
      )}

      {activeSection === 'pengiriman' && (
        <DataPusatPengirimanSection
          cabangList={cabangList}
          bahanBaku={bahanBaku}
          suratOrders={suratOrders}
          onAddSuratOrder={onAddSuratOrder}
          onUpdateSuratOrder={onUpdateSuratOrder}
          onReturSuratOrder={onReturSuratOrder}
          showConfirm={showConfirm}
        />
      )}

      {activeSection === 'stok_opname' && (
        <DataPusatStokOpnameSection
          cabangList={cabangList}
          cabangStok={cabangStok}
          opnameDrafts={opnameDrafts}
          onApproveOpname={onApproveOpname}
          onRejectOpname={onRejectOpname}
        />
      )}

      {activeSection === 'rekap' && (
        <DataPusatRekapSection
          bahanBaku={bahanBaku}
          cabangList={cabangList}
          cabangStok={cabangStok}
        />
      )}
    </div>
  );
}
