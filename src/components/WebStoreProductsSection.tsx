import React from 'react';
import { Plus, Trash2, Copy, Image, Star, Eye, EyeOff, ShoppingBag, RefreshCw } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';
import { db, hashProductName, saveWebStoreConfig } from '../lib/firestore-bridge';
import { deleteDoc, doc } from 'firebase/firestore';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
  updateProduct: (index: number, updates: Partial<any>) => void;
  products: any[];
  setProducts: (v: any) => void;
  handleDuplicateProduct: () => void;
  handleUploadProductImage: () => void;
  filteredProducts: any[];
  searchQuery: string;
  handleSyncProducts?: () => void;
  isSyncing?: boolean;
  calculatedProducts?: any[];
  setConfig?: (config: any) => void;
  showToast?: (msg: string, type: string) => void;
}

export default function WebStoreProductsSection({config, updateConfig, updateProduct, products, setProducts, handleDuplicateProduct, handleUploadProductImage, filteredProducts, searchQuery}: Props) {
  return (
    
            <div className={cardClass}>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-800">📦 Produk & Teks Grid</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-normal text-gray-500">{config.products.filter(p => p.active).length} dari {config.products.length} aktif</span>
                  <button onClick={handleSyncProducts} disabled={isSyncing}
                    className="px-3 py-1.5 text-[10px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-all cursor-pointer flex items-center gap-1">
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Sync...' : 'Sync ke Firestore'}
                  </button>
                </div>
              </div>
              
              {/* Product Grid Text Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 mb-4">
                <div>
                  <label className={labelClass}>Judul Grid Produk</label>
                  <input className={inputClass} value={config.productGridTitle} onChange={e => updateConfig({ productGridTitle: e.target.value })} placeholder="Pilihan Hari Ini" />
                </div>
                <div>
                  <label className={labelClass}>Empty State Title (Admin)</label>
                  <input className={inputClass} value={config.emptyStateTitle} onChange={e => updateConfig({ emptyStateTitle: e.target.value })} placeholder="Belum Ada Menu Tersedia" />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Empty State Description</label>
                  <textarea className={`${inputClass} h-16 resize-none`} value={config.emptyStateDescription} onChange={e => updateConfig({ emptyStateDescription: e.target.value })} placeholder="Database Anda saat ini kosong..." />
                </div>
              </div>
    
              {/* Made-to-Order Mode */}
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-amber-900">🛵 Mode Made-to-Order</h4>
                    <p className="text-[10px] text-amber-700">Sembunyikan stok, tampilkan sebagai katalog pre-order</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={config.madeToOrder} onChange={e => updateConfig({ madeToOrder: e.target.checked })} className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
                {config.madeToOrder && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-amber-800 block mb-0.5">Label Pre-Order</label>
                      <input className="text-xs p-2 border border-amber-300 rounded-lg w-full bg-white" value={config.preOrderLabel} onChange={e => updateConfig({ preOrderLabel: e.target.value })} placeholder="Pre-Order — Produksi Setiap Hari" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-amber-800 block mb-0.5">Badge Produk</label>
                      <input className="text-xs p-2 border border-amber-300 rounded-lg w-full bg-white" value={config.preOrderBadge} onChange={e => updateConfig({ preOrderBadge: e.target.value })} placeholder="MADE-TO-ORDER" />
                    </div>
                  </div>
                )}
              </div>
    
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {config.products.map((p, idx) => (
                  <div key={p.productName} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white border border-gray-200 shrink-0 mt-1">
                      {p.displayImage ? (
                        <img src={p.displayImage} alt={p.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><Image className="w-5 h-5" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={p.active} onChange={e => updateProduct(idx, { active: e.target.checked })} className="w-3.5 h-3.5 rounded accent-emerald-600" />
                        <span className="text-xs font-bold text-gray-800 truncate">{p.productName}</span>
                        <span className="text-[9px] text-gray-400 font-mono bg-slate-200 px-1.5 py-0.5 rounded">{p.kategori}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {(() => {
                          const cp = (calculatedProducts || []).find(c => c.namaProduk === p.productName);
                          if (cp) return <><span className="text-[9px] text-gray-400">Modal: {formatCurrency(cp.hppPerPorsi)}</span><span className="text-[10px] font-bold text-emerald-700">Jual: {formatCurrency(cp.hargaJualPerPorsi)}</span></>;
                          return <span className="text-[9px] text-gray-400 italic">Harga belum diatur</span>;
                        })()}
                      </div>
                      {/* ─── VARIAN CHIPS ─── */}
                      {p.variants && p.variants.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {p.variants.map(v => (
                            <div key={v.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                              v.active !== false
                                ? 'bg-purple-50 border-purple-200 text-purple-700'
                                : 'bg-gray-100 border-gray-200 text-gray-400'
                            }`}>
                              <span>{v.name}</span>
                              <span className="font-mono">{formatCurrency(v.price || 0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2 mt-1.5">
                        <input className="flex-1 px-2.5 py-1.5 text-[10px] border border-gray-200 rounded-lg outline-none focus:border-emerald-400"
                          value={p.description} onChange={e => updateProduct(idx, { description: e.target.value })} placeholder="Deskripsi produk..." />
                        <input type="number" min="0" max="100"
                          className="w-16 px-2 py-1.5 text-[10px] font-bold border border-amber-200 rounded-lg outline-none focus:border-amber-400 bg-amber-50 text-amber-800"
                          value={p.discountPercent || 0}
                          onChange={e => updateProduct(idx, { discountPercent: Math.min(100, Math.max(0, Number(e.target.value))) })}
                          placeholder="0%" title="Diskon %" />
                        <label className="px-2.5 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer shrink-0">
                          <Image className="w-3 h-3 inline mr-1" />Gambar
                          <input type="file" accept="image/*" className="hidden" onChange={e => handleUploadProductImage(idx, e)} />
                        </label>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Hapus produk "${p.productName}" dari Web Store?`)) {
                              const cabangId = config.cabangId || 'pusat';
                              
                              // 1. 🔥 Hapus dari Firestore products collection dulu
                              try {
                                const productId = hashProductName(p.productName);
                                await deleteDoc(doc(db, 'products', productId));
                              } catch (e) {
                                console.warn('Gagal hapus produk dari Firestore:', e);
                              }
                              
                              // 2. Buat config terbaru (langsung dari state, tanpa setTimeout)
                              const updatedProducts = config.products.filter((_, i) => i !== idx);
                              const updatedConfig = { ...config, products: updatedProducts };
                              
                              // 3. Update local state
                              setConfig({ ...updatedConfig });
                              
                              // 4. Simpan konfigurasi terbaru ke Firestore — biar tidak kembali saat reload!
                              try {
                                await saveWebStoreConfig(cabangId, updatedConfig);
                              } catch (e) {
                                console.warn('Gagal simpan config ke Firestore:', e);
                              }
                              
                              showToast(`"${p.productName}" dihapus dari Web Store & Firestore.`, 'info');
                            }
                          }}
                          className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 cursor-pointer shrink-0 self-end"
                          title="Hapus produk dari Web Store"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {config.products.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  <ShoppingBag className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Belum ada produk di Web Store. Tambahkan produk di tab Formulasi Resep, lalu sync ke Firestore.</p>
                </div>
              )}
            </div>
  );
}
