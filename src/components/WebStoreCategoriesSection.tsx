import React from 'react';
import { Plus, Trash2, Wheat } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
  newCategoryName: string;
  setNewCategoryName: (v: any) => void;
  newCategoryIcon: string;
  setNewCategoryIcon: (v: any) => void;
  autoDetectCategoryIcon: () => void;
}

export default function WebStoreCategoriesSection({config, updateConfig, newCategoryName, setNewCategoryName, newCategoryIcon, setNewCategoryIcon, autoDetectCategoryIcon}: Props) {
  return (
    
            <div className={cardClass}>
              <h3 className="text-sm font-black text-gray-800">📂 Kelola Kategori</h3>
              <p className="text-[10px] text-gray-500">
                Tambah, edit, dan hapus kategori produk Web Store. Kategori ini akan muncul di slider Web Store.
                Setiap kategori bisa diberi icon (wheat, croissant, cake, cookie, coffee, atau lainnya).
              </p>
              
              {/* Daftar kategori existing */}
              <div className="space-y-2">
                {(config.categories || []).map((cat, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      <span className="text-lg">
                        {(config.categoryIcons || {})[cat] === 'wheat' ? '🌾' :
                         (config.categoryIcons || {})[cat] === 'croissant' ? '🥐' :
                         (config.categoryIcons || {})[cat] === 'cake' ? '🎂' :
                         (config.categoryIcons || {})[cat] === 'cookie' ? '🍪' :
                         (config.categoryIcons || {})[cat] === 'coffee' ? '☕' : '📦'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-gray-800 flex-1">{cat}</span>
                    <button
                      onClick={async () => {
                        const newCats = (config.categories || []).filter((_, i) => i !== idx);
                        const newIcons = { ...(config.categoryIcons || {}) };
                        delete newIcons[cat];
                        updateConfig({ categories: newCats, categoryIcons: newIcons });
                        // Hapus juga dari shared store agar Formulasi Resep ikut update
                        const shared = getSharedCategories();
                        setSharedCategories({
                          categories: newCats,
                          categoryIcons: newIcons,
                        });
                        
                        // 🔥 LANGSUNG simpan ke Firestore — biar tidak kembali saat reload!
                        // (Pakai config langsung dari closure, bukan localStorage)
                        try {
                          const cabangId = config.cabangId || 'pusat';
                          const updatedConfig = {
                            ...config,
                            categories: newCats,
                            categoryIcons: newIcons,
                          };
                          await saveWebStoreConfig(cabangId, updatedConfig);
                          // Juga sync ke collection categories/{cabangId}
                          await saveCategoriesToFirestore(cabangId, newCats, newIcons);
                        } catch (e) {
                          console.warn('Gagal simpan kategori ke Firestore:', e);
                        }
                      }}
                      className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              {(!config.categories || config.categories.length === 0) && (
                <p className="text-xs text-gray-400 text-center py-4">Belum ada kategori. Tambah kategori di bawah.</p>
              )}
    
              {/* Form tambah kategori — controlled component */}
              <div className="border-t border-gray-100 pt-4 mt-4">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Tambah Kategori Baru</h4>
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className={labelClass}>Nama Kategori</label>
                    <input
                      className={inputClass}
                      placeholder="Roti & Sourdough"
                      value={newCategoryName}
                      onChange={e => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const name = newCategoryName.trim();
                          if (name && !(config.categories || []).includes(name)) {
                            updateConfig({ 
                              categories: [...(config.categories || []), name],
                              categoryIcons: { ...(config.categoryIcons || {}), [name]: newCategoryIcon }
                            });
                            setNewCategoryName('');
                          }
                        }
                      }}
                    />
                  </div>
                  <select
                    className={`${inputClass} w-32`}
                    value={newCategoryIcon}
                    onChange={e => setNewCategoryIcon(e.target.value)}
                  >
                    <option value="wheat">🌾 Roti</option>
                    <option value="croissant">🥐 Croissant</option>
                    <option value="cake">🎂 Kue</option>
                    <option value="cookie">🍪 Cookies</option>
                    <option value="coffee">☕ Kopi</option>
                    <option value="package">📦 Lainnya</option>
                  </select>
                  <button
                    onClick={() => {
                      const name = newCategoryName.trim();
                      if (name && !(config.categories || []).includes(name)) {
                        const newCats = [...(config.categories || []), name];
                        const newIcons = { ...(config.categoryIcons || {}), [name]: newCategoryIcon };
                        updateConfig({ 
                          categories: newCats,
                          categoryIcons: newIcons
                        });
                        // Juga daftarkan ke shared store agar Formulasi Resep ikut update
                        setSharedCategories({ categories: newCats, categoryIcons: newIcons });
                        setNewCategoryName('');
                      }
                    }}
                    className="px-3 py-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Tambah
                  </button>
                </div>
              </div>
    
              {/* Reset ke default */}
              <div className="border-t border-gray-100 pt-3 mt-3">
                <button
                  onClick={() => {
                    const defaults = {
                      categories: ['Roti & Sourdough', 'Viennoiserie & Croissant', 'Kue & Tart', 'Kue Kering & Cookies', 'Minuman Kopi & Teh'],
                      categoryIcons: {
                        'Roti & Sourdough': 'wheat',
                        'Viennoiserie & Croissant': 'croissant',
                        'Kue & Tart': 'cake',
                        'Kue Kering & Cookies': 'cookie',
                        'Minuman Kopi & Teh': 'coffee'
                      }
                    };
                    updateConfig(defaults);
                    // Sync ke shared store agar Formulasi Resep juga ikut reset
                    setSharedCategories(defaults);
                  }}
                  className="px-3 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer"
                >
                  Reset ke Default
                </button>
              </div>
            </div>
  );
}
