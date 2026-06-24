import React from 'react';
import { Plus, Trash2, Star, MoveUp, MoveDown } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
  featuredProducts: any[];
  productList: any[];
  cabangList: any[];
}

export default function WebStoreFeaturedSection({config, updateConfig, featuredProducts, productList, cabangList}: Props) {
  return (
    
            <div className={cardClass}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-800">⭐ Produk Unggulan (Landing Page)</h3>
                <button onClick={() => {
                  const newFeatured = [...(config.featuredProducts || [])];
                  const nextOrder = newFeatured.length + 1;
                  newFeatured.push({ productName: '', active: true, order: nextOrder, badgeText: '' });
                  updateConfig({ featuredProducts: newFeatured });
                }} className="px-3 py-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Tambah
                </button>
              </div>
              <p className="text-[10px] text-gray-500">
                Pilih produk unggulan yang tampil di hero landing page Web Store. Bisa diurutkan.
              </p>
    
              <div className="space-y-3">
                {(config.featuredProducts || []).length === 0 && (
                  <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                    <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Belum ada produk unggulan. Klik Tambah untuk menambahkan produk unggulan yang tampil di hero landing page.</p>
                  </div>
                )}
                {(config.featuredProducts || []).sort((a, b) => a.order - b.order).map((fp, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-white rounded-xl border border-amber-200">
                    <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">
                      {fp.order || idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <select
                          className={`${inputClass} flex-1`}
                          value={fp.productName}
                          onChange={e => {
                            const newFeatured = [...(config.featuredProducts || [])];
                            newFeatured[idx] = { ...newFeatured[idx], productName: e.target.value };
                            updateConfig({ featuredProducts: newFeatured });
                          }}
                        >
                          <option value="">— Pilih Produk —</option>
                          {config.products.filter(p => p.active).map(p => (
                            <option key={p.productName} value={p.productName}>{p.productName}</option>
                          ))}
                        </select>
                        <input
                          className={`${inputClass} w-40`}
                          value={fp.badgeText}
                          onChange={e => {
                            const newFeatured = [...(config.featuredProducts || [])];
                            newFeatured[idx] = { ...newFeatured[idx], badgeText: e.target.value };
                            updateConfig({ featuredProducts: newFeatured });
                          }}
                          placeholder="Badge (contoh: BEST SELLER)"
                        />
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={fp.active !== false}
                            onChange={e => {
                              const newFeatured = [...(config.featuredProducts || [])];
                              newFeatured[idx] = { ...newFeatured[idx], active: e.target.checked };
                              updateConfig({ featuredProducts: newFeatured });
                            }}
                            className="w-3.5 h-3.5 rounded accent-amber-600" />
                          <span className="text-[10px] text-gray-500">Aktif</span>
                        </label>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              if (idx === 0) return;
                              const newFeatured = [...(config.featuredProducts || [])];
                              const temp = newFeatured[idx];
                              newFeatured[idx] = { ...newFeatured[idx - 1], order: newFeatured[idx].order };
                              newFeatured[idx - 1] = { ...temp, order: newFeatured[idx - 1].order };
                              updateConfig({ featuredProducts: newFeatured });
                            }}
                            disabled={idx === 0}
                            className="p-1 text-gray-400 hover:text-amber-600 disabled:opacity-30 cursor-pointer"
                          >↑</button>
                          <button
                            onClick={() => {
                              if (idx >= (config.featuredProducts?.length || 0) - 1) return;
                              const newFeatured = [...(config.featuredProducts || [])];
                              const temp = newFeatured[idx];
                              newFeatured[idx] = { ...newFeatured[idx + 1], order: newFeatured[idx].order };
                              newFeatured[idx + 1] = { ...temp, order: newFeatured[idx + 1].order };
                              updateConfig({ featuredProducts: newFeatured });
                            }}
                            disabled={idx >= (config.featuredProducts?.length || 0) - 1}
                            className="p-1 text-gray-400 hover:text-amber-600 disabled:opacity-30 cursor-pointer"
                          >↓</button>
                        </div>
                        <button
                          onClick={() => {
                            const newFeatured = (config.featuredProducts || []).filter((_, i) => i !== idx);
                            updateConfig({ featuredProducts: newFeatured });
                          }}
                          className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
  );
}
