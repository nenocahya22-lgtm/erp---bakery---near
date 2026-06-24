import React from 'react';
import { Type, FileText } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
}

export default function WebStoreTextsSection({config, updateConfig}: Props) {
  return (
    
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-800">📝 Teks & Label Web Store</h3>
              <p className="text-[10px] text-gray-500">Sesuaikan semua teks yang muncul di halaman Web Store.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Judul Grid Produk</label>
                  <input className={inputClass} value={config.productGridTitle} onChange={e => updateConfig({ productGridTitle: e.target.value })} placeholder="Pilihan Hari Ini" />
                </div>
                <div>
                  <label className={labelClass}>Banyak Produk Label</label>
                  <div className="px-3 py-2 text-xs text-gray-500 bg-slate-50 rounded-xl border border-gray-200">
                    <strong>{config.products.filter(p => p.active).length}</strong> Sajian <span className="text-[9px] text-gray-400">(otomatis)</span>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Empty State Title</label>
                  <input className={inputClass} value={config.emptyStateTitle} onChange={e => updateConfig({ emptyStateTitle: e.target.value })} placeholder="Belum Ada Menu Tersedia" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Empty State Description</label>
                  <textarea className={`${inputClass} h-16 resize-none`} value={config.emptyStateDescription} onChange={e => updateConfig({ emptyStateDescription: e.target.value })} placeholder="Database Anda saat ini kosong..." />
                </div>
              </div>
            </div>
  );
}
