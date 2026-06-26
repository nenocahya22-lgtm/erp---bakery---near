import React from 'react';
import { Database, RefreshCw, Download, Upload, ArrowLeft, ShoppingBag, FileJson, CheckCircle2, Plus } from 'lucide-react';
import { WebStoreConfig } from '../types';
import { cardClass, inputClass, labelClass } from '../lib/webstore-constants';


interface Props {
  config: WebStoreConfig;
  updateConfig: (updates: Partial<WebStoreConfig>) => void;
  fetchFirestoreProducts: () => void;
  fetchFirestoreCategories: () => void;
  handleImportCategory: (cat: string) => void;
  cabangList: any[];
  handleExport: () => void;
  handleImport: () => void;
  newCategoryName: string;
  setNewCategoryName: (v: any) => void;
  newCategoryIcon: string;
  setNewCategoryIcon: (v: any) => void;
  isFetchingWebProducts?: boolean;
  isFetchingCategories?: boolean;
  firestoreProducts?: any[];
  firestoreCategories?: { categories: string[]; categoryIcons: Record<string, string> } | null;
  productHpp?: any[];
  onImportProduct?: (product: any) => void;
  showToast?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function WebStoreWebdataSection({
  config, updateConfig, fetchFirestoreProducts, fetchFirestoreCategories,
  handleImportCategory, cabangList, handleExport, handleImport,
  newCategoryName, setNewCategoryName, newCategoryIcon, setNewCategoryIcon,
  isFetchingWebProducts, isFetchingCategories, firestoreProducts,
  productHpp, onImportProduct, showToast,
}: Props) {

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-indigo-600" />
            📡 Data Web Store (Firestore)
          </h3>
          <p className="text-[10px] text-gray-500 mt-1">
            Semua produk & kategori yang ada di Firestore — baik dari ERP maupun dari Web Store. 
            Dari sini Anda bisa melihat dan mengimpor produk/kategori yang belum terdaftar di ERP.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { fetchFirestoreProducts(); fetchFirestoreCategories(); }} disabled={isFetchingWebProducts || isFetchingCategories}
            className="px-3 py-2 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingWebProducts || isFetchingCategories ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {isFetchingWebProducts ? (
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400 mx-auto mb-2" />
          <p className="text-xs text-gray-400">Memuat data dari Firestore...</p>
        </div>
      ) : !firestoreProducts || firestoreProducts.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-xs text-gray-400">Belum ada produk di Firestore. Sync produk dari ERP terlebih dahulu.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {firestoreProducts.map((fp: any) => {
            const existsInErp = (productHpp || []).some(
              (p: any) => p.namaProduk && (p.namaProduk || '').toLowerCase().trim() === (fp.name || '').toLowerCase().trim()
            );
            return (
              <div key={fp.docId} className={`flex items-center gap-3 p-3 rounded-xl border ${
                existsInErp ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
              }`}>
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  existsInErp ? 'bg-emerald-500' : 'bg-amber-500'
                }`} />
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {fp.imageUrl ? (
                    <img src={fp.imageUrl} alt={fp.name} className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag className="w-4 h-4 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-800 truncate">{fp.name}</span>
                    <span className="text-[9px] text-gray-400 font-mono bg-slate-200 px-1.5 py-0.5 rounded">{fp.category}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] font-bold text-emerald-700">
                      Rp {fp.price.toLocaleString('id-ID')}
                    </span>
                    {fp.hpp && fp.hpp > 0 && (
                      <span className="text-[9px] text-gray-400">Modal: Rp {fp.hpp.toLocaleString('id-ID')}</span>
                    )}
                    {fp.discountPercent && fp.discountPercent > 0 && (
                      <span className="text-[9px] text-amber-600 font-bold">-{fp.discountPercent}%</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {existsInErp ? (
                    <span className="px-2 py-1 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded-lg">
                      ✅ Di ERP
                    </span>
                  ) : (
                    <>
                      <span className="px-2 py-1 text-[9px] font-bold bg-amber-100 text-amber-800 rounded-lg">
                        🟡 Web Store Only
                      </span>
                      <button
                        onClick={() => {
                          if (onImportProduct) {
                            onImportProduct({
                              namaProduk: fp.name,
                              porsiJual: 1,
                              hargaJual: fp.price,
                              kategori: fp.category || 'Lainnya',
                            });
                            if (fp.imageUrl) {
                              try {
                                const savedKey = `recipe_img_${fp.name.toLowerCase().trim()}`;
                                localStorage.setItem(savedKey, fp.imageUrl);
                              } catch (_) {}
                            }
                            if (showToast) showToast(`✅ "${fp.name}" berhasil diimpor ke ERP! Atur resep di Formulasi Resep.`, 'success');
                          }
                        }}
                        className="px-2.5 py-1.5 text-[9px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer"
                      >
                        + Import ke ERP
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-gray-100 pt-3 mt-3 flex items-center justify-between text-[10px] text-gray-500">
        <span>Total di Firestore: <strong>{(firestoreProducts || []).length}</strong> produk</span>
        <span>Di ERP: <strong>{(firestoreProducts || []).filter((fp: any) => (productHpp || []).some((p: any) => p.namaProduk && (p.namaProduk || '').toLowerCase().trim() === (fp.name || '').toLowerCase().trim())).length}</strong></span>
        <span>Web Store Only: <strong>{(firestoreProducts || []).filter((fp: any) => !(productHpp || []).some((p: any) => p.namaProduk && (p.namaProduk || '').toLowerCase().trim() === (fp.name || '').toLowerCase().trim())).length}</strong></span>
      </div>

      <div className="border-t border-gray-100 pt-4 mt-4 space-y-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1.5">
            <FileJson className="w-3.5 h-3.5" />
            Kategori dari Firestore
          </h4>
          <div className="flex gap-2">
            <button onClick={fetchFirestoreCategories} disabled={isFetchingCategories}
              className="px-2 py-1 text-[9px] font-bold bg-slate-100 hover:bg-slate-200 rounded-lg transition-all cursor-pointer flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 ${isFetchingCategories ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button onClick={() => {
              if (!firestoreCategories || !firestoreCategories.categories.length) {
                if (showToast) showToast("Tidak ada kategori di Firestore untuk diimpor.", "info");
                return;
              }
              const existingCats = new Set(config.categories || []);
              const newCats = firestoreCategories.categories.filter((c: string) => !existingCats.has(c));
              if (newCats.length === 0) {
                if (showToast) showToast("Semua kategori sudah terdaftar di ERP.", "info");
                return;
              }
              newCats.forEach((cat: string) => handleImportCategory(cat));
              if (showToast) showToast("✅ " + newCats.length + " kategori berhasil diimpor dari Firestore!", "success");
            }}
              className="px-2 py-1 text-[9px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-all cursor-pointer flex items-center gap-1">
              <Plus className="w-3 h-3" />
              Import ke ERP
            </button>
          </div>
        </div>

        {isFetchingCategories ? (
          <div className="text-center py-4">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-400 mx-auto" />
          </div>
        ) : firestoreCategories && firestoreCategories.categories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {firestoreCategories.categories.map((cat: string, idx: number) => {
              const existsInLocal = (config.categories || []).includes(cat);
              return (
                <div key={idx}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border ${
                    existsInLocal
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}
                >
                  <span className="text-xs">
                    {(firestoreCategories.categoryIcons || {})[cat] === 'wheat' ? '🌾' :
                     (firestoreCategories.categoryIcons || {})[cat] === 'croissant' ? '🥐' :
                     (firestoreCategories.categoryIcons || {})[cat] === 'cake' ? '🎂' :
                     (firestoreCategories.categoryIcons || {})[cat] === 'cookie' ? '🍪' :
                     (firestoreCategories.categoryIcons || {})[cat] === 'coffee' ? '☕' : '📦'}
                  </span>
                  <span>{cat}</span>
                  {existsInLocal ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <span className="text-[8px] text-amber-500 font-bold">🆕</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[10px] text-gray-400 text-center py-3">
            Belum ada kategori di Firestore. Sync produk dari ERP untuk membuat kategori.
          </p>
        )}
        <div className="text-[9px] text-gray-400 mt-2">
          {firestoreCategories ? `${firestoreCategories.categories.length} kategori ditemukan` : 'Belum dimuat'}
        </div>
      </div>
    </div>
  );
}
