import React from 'react';
import { Plus, Trash2, Edit3, Image, Percent, Megaphone } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
  showPromoModal: boolean;
  setShowPromoModal: (v: any) => void;
  handleAddPromo: () => void;
  handleEditPromo: () => void;
  handleSavePromo: () => void;
  handleDeletePromo: () => void;
  handleUploadPromoImage: () => void;
}

export default function WebStorePromosSection({config, updateConfig, showPromoModal, setShowPromoModal, handleAddPromo, handleEditPromo, handleSavePromo, handleDeletePromo, handleUploadPromoImage}: Props) {
  return (
    
            <div className={cardClass}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-800">📢 Promosi</h3>
                <button onClick={handleAddPromo} className="px-3 py-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Tambah Promo
                </button>
              </div>
              {config.promos.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Belum ada promo. Klik "Tambah Promo" untuk membuat promo.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {config.promos.map(promo => (
                    <div key={promo.id} className={`p-4 rounded-xl border ${promo.active ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'} relative`}>
                      <div className="flex items-start gap-3">
                        {promo.image ? (
                          <img src={promo.image} alt={promo.title} className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center text-gray-400"><Megaphone className="w-5 h-5" /></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-gray-800">{promo.title}</h4>
                          <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{promo.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 justify-end">
                        <button onClick={() => updateConfig({ promos: config.promos.map(p => p.id === promo.id ? { ...p, active: !p.active } : p) })}
                          className={`px-2 py-1 text-[9px] font-bold rounded-lg cursor-pointer ${promo.active ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-200 text-slate-500'}`}>
                          {promo.active ? 'Aktif' : 'Nonaktif'}
                        </button>
                        <button onClick={() => handleEditPromo(promo)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 cursor-pointer"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={() => handleDeletePromo(promo.id)} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
  );
}
