import React from 'react';
import { Plus, Trash2, Edit3, CreditCard, Wallet, Building2, Banknote, Smartphone, ShoppingBag } from 'lucide-react';
import { WebStoreConfig, createDefaultPaymentMethods } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
  showPaymentModal: boolean;
  setShowPaymentModal: (v: any) => void;
  handleAddPayment: () => void;
  handleEditPayment: () => void;
  handleSavePayment: () => void;
  handleDeletePayment: () => void;
}

export default function WebStorePaymentSection({config, updateConfig, showPaymentModal, setShowPaymentModal, handleAddPayment, handleEditPayment, handleSavePayment, handleDeletePayment}: Props) {
  return (
    
            <div className={cardClass}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-800">💳 Metode Pembayaran</h3>
                <button onClick={handleAddPayment} className="px-3 py-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Tambah Metode
                </button>
              </div>
              <p className="text-[10px] text-gray-500">
                Metode pembayaran ini akan tampil di halaman checkout web store. Kelola semuanya dari sini.
              </p>
              {(!config.paymentMethods || config.paymentMethods.length === 0) ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Belum ada metode pembayaran. Klik "Tambah Metode" atau reset ke default.</p>
                  <button onClick={() => updateConfig({ paymentMethods: createDefaultPaymentMethods() })}
                    className="mt-3 px-4 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">
                    Reset ke Default
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {config.paymentMethods.sort((a, b) => a.order - b.order).map(pm => (
                    <div key={pm.id} className={`p-4 rounded-xl border ${pm.active ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'} flex items-start gap-3`}>
                      <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0">
                        {pm.type === 'transfer_bank' ? <Banknote className="w-5 h-5 text-blue-600" /> :
                         pm.type === 'ewallet' ? <Wallet className="w-5 h-5 text-green-600" /> :
                         <ShoppingBag className="w-5 h-5 text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${pm.active ? 'text-gray-800' : 'text-gray-400'}`}>{pm.name}</span>
                          <span className="text-[9px] text-gray-400 font-mono uppercase">{pm.type.replace('_', ' ')}</span>
                        </div>
                        {pm.type === 'transfer_bank' && pm.bankName && (
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            {pm.bankName} — {pm.accountNumber} a.n. {pm.accountName}
                          </p>
                        )}
                        {pm.type === 'ewallet' && pm.phoneNumber && (
                          <p className="text-[10px] text-gray-600 mt-0.5">No. HP: {pm.phoneNumber}</p>
                        )}
                        <p className="text-[9px] text-gray-400 mt-0.5">{pm.label}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => updateConfig({
                          paymentMethods: (config.paymentMethods || []).map(p => p.id === pm.id ? { ...p, active: !p.active } : p)
                        })}
                          className={`px-2 py-1 text-[9px] font-bold rounded-lg cursor-pointer ${pm.active ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                          {pm.active ? 'Aktif' : 'Nonaktif'}
                        </button>
                        <button onClick={() => handleEditPayment(pm)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 cursor-pointer"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={() => handleDeletePayment(pm.id)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
  );
}
