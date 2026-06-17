import React, { useState, useEffect } from 'react';
import { BahanBaku, ProductHpp, DetailResep, ProductVariant, CalculationResult, SATUAN_OPTIONS } from '../types';
import {
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Scale,
  FolderOpen,
  Tag,
  Save,
  X,
  Coins,
  Check
} from 'lucide-react';
import { getSavedRecipeImage, saveRecipeImage, deleteRecipeImage, getFoodImageForPrompt, buildAutoPrompt } from '../lib/image-generator';
import { safeGetLocalStorage } from '../lib/safe-json';
import { getSharedCategories, setSharedCategories, addSharedCategory, removeSharedCategory, renameSharedCategory } from '../lib/category-store';

interface RecipesTabProps {
  bahanBaku: BahanBaku[];
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  calculatedProducts: CalculationResult[];
  onAddProduct: (p: ProductHpp, ingredients: DetailResep[]) => void;
  onUpdateProductIngredients: (productName: string, updatedDetails: DetailResep[], porsiJual: number, status?: 'draft' | 'published') => void;
  onDeleteProduct: (productName: string) => void;
  onUpdateProductDetails?: (oldName: string, updated: ProductHpp) => void;
  onAddVariant?: (productName: string, variant: ProductVariant) => void;
  onUpdateVariant?: (productName: string, variantId: string, updates: Partial<ProductVariant>) => void;
  onDeleteVariant?: (productName: string, variantId: string) => void;
}

export default function RecipesTab({
  bahanBaku,
  productHpp,
  detailResep,
  calculatedProducts,
  onAddProduct,
  onUpdateProductIngredients,
  onDeleteProduct,
  onUpdateProductDetails,
  onAddVariant,
  onUpdateVariant,
  onDeleteVariant,
}: RecipesTabProps) {
  const [selectedProductName, setSelectedProductName] = useState<string>(
    productHpp.length > 0 ? productHpp[0].namaProduk : ''
  );

  // Categories Filter State — Dynamic with add/edit/delete
  const [categoriesList, setCategoriesList] = useState<string[]>(() => {
    // Gunakan shared categories dari category-store agar konsisten dengan Web Store
    const shared = getSharedCategories();
    if (shared.categories.length > 0) {
      return ['Semua', ...shared.categories];
    }
    // Fallback: coba dari localStorage lama
    const saved = safeGetLocalStorage<string[]>('recipe_categories_data', null);
    if (saved) {
      return ['Semua', ...saved];
    }
    return ['Semua', 'Roti & Sourdough', 'Viennoiserie & Croissant', 'Kue & Tart', 'Kue Kering & Cookies', 'Minuman Kopi & Teh'];
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  // Save categories ke localStorage & shared store
  useEffect(() => {
    const catsForStorage = categoriesList.filter(c => c !== 'Semua');
    localStorage.setItem('recipe_categories_data', JSON.stringify(catsForStorage));
    // Sync ke shared store agar Web Store juga update
    const existing = getSharedCategories();
    setSharedCategories({
      categories: catsForStorage,
      categoryIcons: existing.categoryIcons,
    });
  }, [categoriesList]);

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categoriesList.some(c => c.toLowerCase() === name.toLowerCase())) {
      alert(`Kategori "${name}" sudah ada!`);
      return;
    }
    // Juga daftarkan ke shared store agar Web Store dapat ikon otomatis
    addSharedCategory(name, 'package');
    setCategoriesList(prev => {
      const withoutSemua = prev.filter(c => c !== 'Semua');
      return ['Semua', ...withoutSemua, name].sort((a, b) => {
        if (a === 'Semua') return -1;
        if (b === 'Semua') return 1;
        return a.localeCompare(b);
      });
    });
    setNewCategoryName('');
  };

  const handleDeleteCategory = async (cat: string) => {
    if (cat === 'Semua') return;
    const productsInCat = productHpp.filter(p => (p.kategori || 'Lainnya') === cat);
    const msg = productsInCat.length > 0
      ? `Hapus kategori "${cat}" beserta ${productsInCat.length} resep di dalamnya?\n\nResep yang akan dihapus:\n${productsInCat.map(p => `- ${p.namaProduk}`).join('\n')}`
      : `Hapus kategori "${cat}"? (tidak ada resep di dalamnya)`;
    const confirmed_110 = await new Promise<boolean>((resolve) => {
      showConfirm({
        title: 'Konfirmasi',
        message: msg,
        confirmLabel: 'Ya',
        cancelLabel: 'Batal',
        variant: 'warning',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed_110) return;
    
    // Hapus semua produk dalam kategori ini
    productsInCat.forEach(p => onDeleteProduct(p.namaProduk));
    
    // Hapus juga dari shared store agar Web Store ikut update
    removeSharedCategory(cat);
    setCategoriesList(prev => prev.filter(c => c !== cat));
    if (selectedCategory === cat) setSelectedCategory('Semua');
  };

  const handleRenameCategory = (oldName: string) => {
    const newName = editingCategory.trim();
    if (!newName || oldName === 'Semua') return;
    if (categoriesList.some(c => c.toLowerCase() === newName.toLowerCase() && c !== oldName)) {
      alert(`Kategori "${newName}" sudah ada!`);
      return;
    }
    // Rename juga di shared store agar Web Store ikut update
    renameSharedCategory(oldName, newName);
    setCategoriesList(prev => prev.map(c => c === oldName ? newName : c));
    if (selectedCategory === oldName) setSelectedCategory(newName);
    setEditingCategory('');
  };

  // AI Image States
  const [imagePrompt, setImagePrompt] = useState('');
  const [recipeImage, setRecipeImage] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);
  const [isPromptManual, setIsPromptManual] = useState(false);

  // New product formulation state with category
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPorsi, setNewProductPorsi] = useState('10');
  const [newProductKategori, setNewProductKategori] = useState('Roti & Sourdough');

  // Edit existing product formula state
  const [isEditingProductDetails, setIsEditingProductDetails] = useState(false);
  const [editPorsiJual, setEditPorsiJual] = useState('');
  const [editHargaJual, setEditHargaJual] = useState('');
  const [editKategori, setEditKategori] = useState('Roti & Sourdough');

  // Active Ingredient adding in formulation state
  const [activeRecipePorsi, setActiveRecipePorsi] = useState<number>(10);
  const [selectedBahan, setSelectedBahan] = useState('');
  const [takaranBahan, setTakaranBahan] = useState('');
  const [takaranSatuan, setTakaranSatuan] = useState('gr');

  // ─── VARIAN STATE ───
  const [showVariantPanel, setShowVariantPanel] = useState(false);
  const [newVariantName, setNewVariantName] = useState('');
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editingVariantIngredients, setEditingVariantIngredients] = useState<{ namaBahan: string; takaran: number }[]>([]);
  const [selectedVariantIngBahan, setSelectedVariantIngBahan] = useState('');
  const [selectedVariantIngTakaran, setSelectedVariantIngTakaran] = useState('');

  // Inline ingredient quantity editing state
  const [editingBahanName, setEditingBahanName] = useState<string | null>(null);
  const [editingBahanQty, setEditingBahanQty] = useState<string>('');

  // Find active product
  const activeProduct = productHpp.find(
    (p) => p.namaProduk.toLowerCase().trim() === selectedProductName.toLowerCase().trim()
  );

  // Sync states on load and product selection
  useEffect(() => {
    if (activeProduct) {
      setActiveRecipePorsi(activeProduct.porsiJual);
      setEditPorsiJual(activeProduct.porsiJual.toString());
      setEditHargaJual(activeProduct.hargaJual.toString());
      setEditKategori(activeProduct.kategori || categoriesList.find(c => c !== 'Semua') || 'Roti & Sourdough');
    }
    if (selectedProductName) {
      setRecipeImage(getSavedRecipeImage(selectedProductName));
      // Auto-generate prompt from product name + kategori (unless user has manually edited)
      if (!isPromptManual) {
        const autoPrompt = buildAutoPrompt(selectedProductName, activeProduct?.kategori);
        setImagePrompt(autoPrompt);
      }
    }
  }, [selectedProductName, productHpp, activeProduct]);

  // Sync satuan when selected bahan changes
  useEffect(() => {
    if (selectedBahan) {
      const bahan = bahanBaku.find(b => b.nama === selectedBahan);
      if (bahan) setTakaranSatuan(bahan.satuan);
    }
  }, [selectedBahan, bahanBaku]);

  const handleGenerateImage = () => {
    if (!selectedProductName) return;
    const promptToUse = imagePrompt.trim() || buildAutoPrompt(selectedProductName, activeProduct?.kategori);
    setGeneratingImage(true);
    setTimeout(() => {
      const newImg = getFoodImageForPrompt(promptToUse);
      saveRecipeImage(selectedProductName, newImg);
      setRecipeImage(newImg);
      setGeneratingImage(false);
    }, 800);
  };

  const handleDeleteImage = async () => {
    if (!selectedProductName) return;
    const confirmed_216 = await new Promise<boolean>((resolve) => {
      showConfirm({
        title: 'Konfirmasi',
        message: 'Hapus foto produk ini? Gambar akan dikembalikan ke default.',
        confirmLabel: 'Ya',
        cancelLabel: 'Batal',
        variant: 'warning',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed_216) return;
    deleteRecipeImage(selectedProductName);
    const autoPrompt = buildAutoPrompt(selectedProductName, activeProduct?.kategori);
    setImagePrompt(autoPrompt);
    setIsPromptManual(false);
    setRecipeImage(getFoodImageForPrompt(autoPrompt));
    showToastLocal('Foto produk dihapus.', 'info');
  };

  // Filter products by category
  const filteredProducts = productHpp.filter((p) => {
    if (selectedCategory === 'Semua') return true;
    const cat = p.kategori || 'Lainnya';
    return cat.toLowerCase().trim() === selectedCategory.toLowerCase().trim();
  });

  // Ingredients for the active product
  const activeDetails = detailResep.filter(
    (r) => r.namaProduk.toLowerCase().trim() === selectedProductName.toLowerCase().trim()
  );

  // Bahan Baku Lookup Map
  const bahanMap = new Map<string, BahanBaku>();
  bahanBaku.forEach((b) => {
    bahanMap.set(b.nama.toLowerCase().trim(), b);
  });

  // Calculate live costs of active recipe
  const calculatedIngredients = activeDetails.map((detail) => {
    const rawMaterial = bahanMap.get(detail.namaBahan.toLowerCase().trim());
    const unitPrice = rawMaterial ? rawMaterial.hargaSatuan : 0;
    const itemCost = detail.takaran * unitPrice;
    return {
      ...detail,
      satuan: rawMaterial ? rawMaterial.satuan : 'gr',
      unitPrice,
      itemCost,
      notFound: !rawMaterial,
    };
  });

  const totalIngredientsCost = calculatedIngredients.reduce((acc, curr) => acc + curr.itemCost, 0);

  // ─── NORMALISASI SATUAN ───
  // Konversi takaran ke satuan dasar (gr untuk massa, ml untuk volume)
  // agar kalkulasi HPP konsisten
  const normalizeTakaran = (qty: number, satuan: string): number => {
    if (satuan === 'kg') return qty * 1000;        // → gr
    if (satuan === 'ons') return qty * 100;         // → gr
    if (satuan === 'liter') return qty * 1000;      // → ml
    if (satuan === 'sdm') return qty * 15;           // → ml (1 sdm ≈ 15 ml)
    if (satuan === 'sdt') return qty * 5;            // → ml (1 sdt ≈ 5 ml)
    if (satuan === 'cup') return qty * 240;          // → ml (1 cup ≈ 240 ml)
    return qty; // gr, ml, pcs, etc — sudah dalam satuan dasar
  };

  // Add ingredient to active recipe
  const handleAddIngredientToActive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBahan || !takaranBahan || !activeProduct) return;

    const qty = parseFloat(takaranBahan) || 0;
    if (qty <= 0) return;

    // 🔧 Normalisasi: konversi kg/liter/ons dll ke satuan dasar (gr/ml)
    const normalizedQty = normalizeTakaran(qty, takaranSatuan);

    // Check if ingredient already in list
    const isAlreadyPresent = activeDetails.some(
      (d) => d.namaBahan.toLowerCase().trim() === selectedBahan.toLowerCase().trim()
    );

    let updatedDetails;
    if (isAlreadyPresent) {
      updatedDetails = activeDetails.map((d) =>
        d.namaBahan.toLowerCase().trim() === selectedBahan.toLowerCase().trim() ? { ...d, takaran: d.takaran + normalizedQty } : d
      );
    } else {
      const newDetail: DetailResep = {
        namaProduk: activeProduct.namaProduk,
        namaBahan: selectedBahan,
        takaran: normalizedQty,
      };
      updatedDetails = [...activeDetails, newDetail];
    }

    onUpdateProductIngredients(activeProduct.namaProduk, updatedDetails, activeRecipePorsi);
    
    // Reset inputs
    setSelectedBahan('');
    setTakaranBahan('');
  };

  // Remove ingredient from active recipe
  const handleRemoveIngredientFromActive = (bahanName: string) => {
    if (!activeProduct) return;
    const updatedDetails = activeDetails.filter(
      (d) => d.namaBahan.toLowerCase().trim() !== bahanName.toLowerCase().trim()
    );
    onUpdateProductIngredients(activeProduct.namaProduk, updatedDetails, activeRecipePorsi);
  };

  // Inline edit ingredient quantity (Qty)
  const handleStartInlineEdit = (name: string, takaran: number) => {
    setEditingBahanName(name);
    setEditingBahanQty(takaran.toString());
  };

  const handleSaveInlineEdit = (name: string) => {
    if (!activeProduct) return;
    const newQty = parseFloat(editingBahanQty) || 0;
    if (newQty <= 0) return;

    const updatedDetails = activeDetails.map((d) =>
      d.namaBahan.toLowerCase().trim() === name.toLowerCase().trim() ? { ...d, takaran: newQty } : d
    );

    onUpdateProductIngredients(activeProduct.namaProduk, updatedDetails, activeRecipePorsi);
    setEditingBahanName(null);
  };

  // Save product details edit (margin, category)
  const handleSaveProductDetailsEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct) return;

    const finalPorsi = parseFloat(editPorsiJual) || 1;

    // Update locally or via prop cascade
    activeProduct.porsiJual = finalPorsi;
    activeProduct.hargaJual = totalIngredientsCost; // auto dari bahan
    activeProduct.kategori = editKategori;

    // Re-trigger global listeners via triggering ingredients handler
    onUpdateProductIngredients(activeProduct.namaProduk, activeDetails, finalPorsi);
    setIsEditingProductDetails(false);
  };

  // Update portion (Porsi Jual) for active product quickly
  const handleUpdatePorsi = (porsi: number) => {
    if (!activeProduct || porsi <= 0) return;
    setActiveRecipePorsi(porsi);
    onUpdateProductIngredients(activeProduct.namaProduk, activeDetails, porsi);
  };

  // Create new product form submit
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    // Check duplication
    const duplicate = productHpp.some(
      (p) => p.namaProduk.toLowerCase().trim() === newProductName.toLowerCase().trim()
    );
    if (duplicate) {
      alert(`Produk dengan nama "${newProductName}" sudah ada!`);
      return;
    }

    // Konfirmasi sebelum menyimpan
    const confirmed_376 = await new Promise<boolean>((resolve) => {
      showConfirm({
        title: 'Konfirmasi',
        message: `Buat resep baru "${newProductName.trim()}"?`,
        confirmLabel: 'Ya',
        cancelLabel: 'Batal',
        variant: 'warning',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed_376) return;

    const nextKode = `PRD-${String(productHpp.length + 1).padStart(3, '0')}`;
    const newProduct: ProductHpp = {
      kode: nextKode,
      namaProduk: newProductName.trim(),
      porsiJual: parseFloat(newProductPorsi) || 1,
      hargaJual: 0,
      kategori: newProductKategori,
      status: 'draft',
    };

    onAddProduct(newProduct, []);
    setSelectedProductName(newProduct.namaProduk);
    setShowAddForm(false);

    // Reset formulation fields
    setNewProductName('');
    setNewProductPorsi('10');
    setNewProductKategori('Roti & Sourdough');
  };

  // Delete product
  const handleDeleteProductClick = async (productName: string) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      showConfirm({
        title: 'Konfirmasi',
        message: `Apakah Anda yakin ingin menghapus produk "${productName}" beserta seluruh resep detailnya?`,
        confirmLabel: 'Ya',
        cancelLabel: 'Batal',
        variant: 'warning',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (confirmed) {
      onDeleteProduct(productName);
      // Select another product or empty
      const remaining = productHpp.filter(
        (p) => p.namaProduk.toLowerCase().trim() !== productName.toLowerCase().trim()
      );
      if (remaining.length > 0) {
        setSelectedProductName(remaining[0].namaProduk);
      } else {
        setSelectedProductName('');
      }
    }
  };

  // Simple local toast notification
  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const showToastLocal = (message: string, type: 'success' | 'info' = 'info') => {
    setLocalToast({ message, type });
    setTimeout(() => setLocalToast(null), 3000);
  };

  // Hitung Total HPP = sum of semua ingredients
  const getTotalHPP = (productName: string) => {
    const product = productHpp.find(p => p.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim());
    if (!product) return 0;
    const details = detailResep.filter(r => r.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim());
    const bahanCost = details.reduce((sum, d) => {
      const bahan = bahanBaku.find(b => b.nama.toLowerCase().trim() === d.namaBahan.toLowerCase().trim());
      return sum + (d.takaran * (bahan?.hargaSatuan || 0));
    }, 0);
    return bahanCost;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(val);
  };

  return (
    <div id="recipes-container" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* LEFT COLUMN: Products Selector & Creator */}
      <div className="lg:col-span-4 space-y-4">
        
        {/* GROUP FILTER TAB CAPSULES — Dynamic with Manager */}
        <div className="space-y-2">
          <div className="bg-slate-900 p-2 rounded-2xl flex gap-1 overflow-x-auto border border-slate-800 scrollbar-none">
            {categoriesList.map((cat) => (
              <div key={cat} className="group relative flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-2xs font-extrabold uppercase tracking-wide cursor-pointer transition-all ${
                    selectedCategory === cat
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
                {showCategoryManager && cat !== 'Semua' && (
                  <div className="flex items-center gap-0.5">
                    {editingCategory === cat ? (
                      <>
                        <input
                          type="text"
                          value={editingCategory}
                          onChange={(e) => setEditingCategory(e.target.value)}
                          className="w-16 p-0.5 text-[9px] border border-emerald-500 rounded bg-white text-black"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCategory(cat); if (e.key === 'Escape') setEditingCategory(''); }}
                        />
                        <button onClick={() => handleRenameCategory(cat)} className="text-emerald-400 hover:text-emerald-300 p-0.5">✓</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditingCategory(cat); }} className="text-slate-500 hover:text-white text-[9px] p-0.5 opacity-0 group-hover:opacity-100 transition">✏️</button>
                        <button onClick={() => handleDeleteCategory(cat)} className="text-slate-500 hover:text-red-400 text-[9px] p-0.5 opacity-0 group-hover:opacity-100 transition">🗑️</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowCategoryManager(!showCategoryManager);
                setEditingCategory('');
              }}
              className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg transition cursor-pointer ${
                showCategoryManager ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {showCategoryManager ? 'Selesai' : '✏️ Kelola Kategori'}
            </button>
            {showCategoryManager && (
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="text"
                  placeholder="Nama kategori baru"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 p-1.5 text-[10px] border border-gray-200 rounded-lg bg-white"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
                />
                <button onClick={handleAddCategory} className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer">
                  + Tambah
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-emerald-600" />
                Resep ({selectedCategory})
              </h3>
              <p className="text-[10px] text-gray-400 font-bold mt-0.5">{filteredProducts.length} Resep Terdaftar</p>
            </div>
            {!showAddForm && (
              <button
                id="btn-new-recipe"
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 text-2xs font-extrabold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Baru
              </button>
            )}
          </div>

          {showAddForm ? (
            <form onSubmit={handleCreateProduct} className="p-4 bg-gray-50 rounded-xl border border-gray-200/60 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-gray-150">
                <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Formulasi Resep Baru
                </h4>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="p-1 hover:bg-gray-200 text-gray-400 rounded-lg cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Nama Menu</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Roti Sobek Cokelat"
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                  className="w-full text-xs font-medium border border-gray-200 bg-white rounded-lg p-2.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Kategori Kelompok</label>
                <select
                  value={newProductKategori}
                  onChange={(e) => setNewProductKategori(e.target.value)}
                  className="w-full text-xs font-medium border border-gray-200 bg-white rounded-lg p-2.5 bg-none focus:outline-none"
                >
                  {categoriesList.filter(c => c !== 'Semua').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>                <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Total HPP (Rp) <span className="text-blue-500 font-normal normal-case">auto dr bahan</span></label>
                <div className="w-full border border-gray-200 bg-gray-100 rounded-lg p-2 font-mono text-emerald-800 font-bold text-center text-xs">
                  Rp 0 (hitung otomatis setelah tambah bahan)
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <button
                type="submit"
                className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer text-center active:scale-[0.98]"
              >
                ✅ Selesai & Simpan Resep
              </button>
              </div>
            </form>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {filteredProducts.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-gray-150 rounded-2xl bg-gray-50/50">
                  <Tag className="w-8 h-8 text-gray-300 mx-auto stroke-1 mb-2" />
                  <p className="text-xs text-gray-400 font-semibold uppercase leading-none">Kosong</p>
                  <p className="text-[10px] text-gray-400 mt-1">Grup kategori resep ini masih bersih.</p>
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const ingredientsCount = detailResep.filter(
                    (d) => d.namaProduk.toLowerCase().trim() === p.namaProduk.toLowerCase().trim()
                  ).length;
                  const isSelected = p.namaProduk.toLowerCase().trim() === selectedProductName.toLowerCase().trim();

                  return (
                    <div
                      key={p.namaProduk}
                      onClick={() => setSelectedProductName(p.namaProduk)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-50/45 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-white border-gray-100 hover:bg-gray-50/70'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono font-bold text-gray-400 mr-1">{p.kode || `PRD-${String(productHpp.indexOf(p) + 1).padStart(3, '0')}`}</span>
                          <span className="text-xs font-bold text-gray-900 truncate leading-tight">{p.namaProduk}</span>
                          {p.status === 'draft' && (
                            <span className="text-[8px] font-extrabold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md leading-none border border-amber-200/50">
                              Draft
                            </span>
                          )}
                          <span className="text-[8px] font-extrabold uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md leading-none border border-slate-200/50">
                            {p.kategori || 'Lainnya'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-medium text-gray-400">
                          <span className="font-bold text-emerald-800">{ingredientsCount} Bahan</span>
                          <span>•</span>
                          <span>HPP: <span className="font-mono text-gray-600 font-semibold">{formatCurrency(getTotalHPP(p.namaProduk))}</span></span>
                          <span>•</span>
                          <span>Yield: <span className="font-mono text-gray-600 font-semibold">{p.porsiJual} porsi</span></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isSelected ? 'translate-x-0.5 text-emerald-600' : ''}`} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Recipe formulation breakdown */}
      <div className="lg:col-span-8">
        {!selectedProductName || !activeProduct ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center h-full flex flex-col items-center justify-center min-h-[300px]">
            <Scale className="w-12 h-12 text-gray-200 stroke-1 mb-3 animate-pulse" />
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Belum Ada Resep Terpilih</p>
            <p className="text-xs text-gray-400 mt-1">Silakan pilih salah satu resep di panel samping atau buat resep baru.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden space-y-6">
            
            {/* Header block with interactive edit toggle */}
            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-150 px-2.5 py-0.5 rounded-md leading-none">
                    Kategori: {activeProduct.kategori || 'Lainnya'}
                  </span>
                  {activeProduct.status === 'draft' && (
                    <span className="text-[10px] uppercase font-black tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-md leading-none">
                      ⏳ Draft
                    </span>
                  )}
                  {activeProduct.status === 'published' && (
                    <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-md leading-none">
                      ✅ Terbit
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900 font-sans tracking-tight">{activeProduct.namaProduk}</h3>
                <p className="text-xs text-gray-500">
                  Atur porsi resep, edit overhead penjualan, margin, serta bahan baku resep utama.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {activeProduct.status === 'draft' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const confirmed_693 = await new Promise<boolean>((resolve) => {
                        showConfirm({
                          title: 'Konfirmasi',
                          message: `Terbitkan resep "${activeProduct.namaProduk}"? Produk akan tersedia di semua modul (produksi, POS, web store).`,
                          confirmLabel: 'Ya',
                          cancelLabel: 'Batal',
                          variant: 'warning',
                          onConfirm: () => resolve(true),
                          onCancel: () => resolve(false),
                        });
                      });
                      if (!confirmed_693) return;
                      onUpdateProductIngredients(activeProduct.namaProduk, activeDetails, activeRecipePorsi, 'published');
                      showToastLocal('✅ Resep diterbitkan!', 'success');
                    }}
                    className="inline-flex items-center gap-1 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs cursor-pointer transition uppercase"
                  >
                    Terbitkan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditingProductDetails(!isEditingProductDetails)}
                  className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide px-3 py-2 rounded-xl transition cursor-pointer ${
                    isEditingProductDetails
                      ? 'bg-slate-800 text-white hover:bg-slate-900'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  {isEditingProductDetails ? 'Tutup Panel Edit' : 'Edit HPP & Margin'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteProductClick(activeProduct.namaProduk)}
                  className="inline-flex items-center gap-1 border border-red-100 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer uppercase"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>
            </div>

            {/* Editing Product Properties Panel */}
            {isEditingProductDetails && (
              <form onSubmit={handleSaveProductDetailsEdit} className="mx-6 p-5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-4">
                <h4 className="text-xs font-black text-slate-900 uppercase flex items-center gap-1.5">
                  <Edit2 className="w-4 h-4 text-emerald-600" /> Edit Detail Formula HPP & Kategori Menu
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Porsi Yield</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={editPorsiJual}
                      onChange={(e) => setEditPorsiJual(e.target.value)}
                      className="w-full border border-gray-200 bg-white rounded-lg p-2.5 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Total HPP (Rp) <span className="text-blue-500 font-normal normal-case">auto dari bahan</span></label>
                    <div className="w-full border border-gray-200 bg-gray-100 rounded-lg p-2.5 font-mono text-emerald-800 font-bold text-center">
                      {formatCurrency(totalIngredientsCost)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Grup Kategori</label>
                    <select
                      value={editKategori}
                      onChange={(e) => setEditKategori(e.target.value)}
                      className="w-full border border-gray-200 bg-white rounded-lg p-2.5"
                    >
                      {categoriesList.filter(c => c !== 'Semua').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> Simpan Update Formula
                  </button>
                </div>
              </form>
            )}

            {/* Food Photo Banner & AI Generation */}
            <div className="mx-6 p-5 border border-dashed border-gray-200 rounded-2xl bg-emerald-50/10 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
              <div className="md:col-span-3 relative group rounded-xl overflow-hidden shadow-2xs border border-gray-150 bg-gray-100 h-28 flex items-center justify-center">
                {recipeImage ? (
                  <img
                    src={recipeImage}
                    alt={activeProduct.namaProduk}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-widest font-mono">No Photo</div>
                )}
                <div className="absolute top-2 left-2 bg-emerald-900/80 text-white text-[8px] font-mono px-2 py-0.5 rounded-full uppercase font-bold">
                  Foto Menu
                </div>
                {/* DELETE IMAGE — X button top-right */}
                {recipeImage && (
                  <button
                    type="button"
                    onClick={handleDeleteImage}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-600/90 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer shadow-lg"
                    title="Hapus Foto"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              
              <div className="md:col-span-9 space-y-2">
                <label className="block text-[10px] uppercase font-bold text-emerald-950 flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Generator Foto Instan AI (Buku Menu)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Prompt otomatis dari nama produk — edit untuk custom"
                    value={imagePrompt}
                    onChange={(e) => {
                      setImagePrompt(e.target.value);
                      setIsPromptManual(true);
                    }}
                    className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      // Reset to auto-prompt
                      const autoPrompt = buildAutoPrompt(selectedProductName, activeProduct?.kategori);
                      setImagePrompt(autoPrompt);
                      setIsPromptManual(false);
                    }}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-[11px] font-bold uppercase px-2.5 py-2 rounded-xl flex items-center gap-1 shadow-xs shrink-0 cursor-pointer transition-colors"
                    title="Reset ke prompt otomatis"
                  >
                    🔄
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={generatingImage}
                    className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-gray-300 text-white text-[11px] font-bold uppercase px-3 py-2 rounded-xl flex items-center gap-1 shadow-xs shrink-0 cursor-pointer transition-colors"
                  >
                    {generatingImage ? (
                      <span className="animate-pulse">Membuat...</span>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 leading-normal">
                  Prompt di-generate otomatis dari nama produk + kategori. Edit manual untuk hasil lebih spesifik, lalu klik <strong>Generate</strong>.
                </p>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-6">
              {/* Portion Control Parameter */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-750 mb-1.5 uppercase font-mono">
                    Batch Yield (Kapasitas Produksi)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      value={activeRecipePorsi}
                      onChange={(e) => handleUpdatePorsi(parseInt(e.target.value) || 1)}
                      className="w-24 border border-gray-250 bg-white rounded-lg p-2 text-sm text-center font-bold font-mono text-emerald-800 shadow-3xs"
                    />
                    <span className="text-xs text-gray-500 font-medium">
                      Porsi per batch masakan / adonan (Yield)
                    </span>
                  </div>
                  {activeRecipePorsi === 1 && activeProduct && detailResep.filter(r => r.namaProduk === activeProduct.namaProduk).length >= 2 && (
                    (() => {
                      const ings = detailResep.filter(r => r.namaProduk === activeProduct.namaProduk);
                      const totalTakaran = ings.reduce((s, r) => s + r.takaran, 0);
                      if (totalTakaran > 300) {
                        const estimatedYield = Math.round(totalTakaran / 100);
                        return (
                          <div className="mt-2 flex items-start gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold p-2 rounded-lg">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                            <span>Porsi Jual = 1, tapi total bahan ~{Math.round(totalTakaran)} unit (cukup untuk ~{estimatedYield} porsi). pastikan angka Yield sudah benar agar stok tidak terpotong berlebihan.</span>
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}
                </div>
                <div className="flex flex-col justify-center items-end text-right md:border-l md:border-gray-150 md:pl-4">
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider text-[10px]">Estimasi HPP Bahan Baku:</span>
                  <span className="text-2xl font-black text-emerald-800 font-mono mt-0.5">
                    {formatCurrency(totalIngredientsCost)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-bold font-mono">
                    {formatCurrency(totalIngredientsCost / activeRecipePorsi)} / porsi
                  </span>
                </div>
              </div>

              {/* Table of ingredient details with Inline Editor */}
              <div>
                <h4 className="text-xs font-bold uppercase text-slate-800 tracking-wider mb-2.5">
                  Bahan Mentah Adonan Utama
                </h4>

                {calculatedIngredients.length === 0 ? (
                  <div className="text-center p-8 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto stroke-1 mb-2 animate-bounce-slow" />
                    <p className="text-xs text-gray-500 font-medium">Detail resep masih kosong.</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Mulai dengan menambahkan bahan dari form di bawah.</p>
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] border-collapse text-left text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-gray-150 bg-slate-900 text-[10px] font-bold uppercase text-white font-mono">
                          <th className="px-2 sm:px-4 py-3 whitespace-nowrap">Nama Bahan</th>
                          <th className="px-2 sm:px-4 py-3 text-right whitespace-nowrap">Takaran</th>
                          <th className="px-2 sm:px-4 py-3 text-center whitespace-nowrap">Satuan</th>
                          <th className="px-2 sm:px-4 py-3 text-right whitespace-nowrap">Harga</th>
                          <th className="px-2 sm:px-4 py-3 text-right whitespace-nowrap">Subtotal</th>
                          <th className="px-2 sm:px-4 py-3 text-center whitespace-nowrap">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700 font-sans">
                        {calculatedIngredients.map((ing, idx) => (
                          <tr key={idx} className="hover:bg-emerald-50/15">
                            <td className="px-2 sm:px-4 py-3 font-semibold text-gray-905">
                              {ing.namaBahan}
                              {ing.notFound && (
                                <span className="block text-[10px] text-red-500 font-normal mt-0.5">
                                  ⚠️ Bahan tidak terdaftar!
                                </span>
                              )}
                            </td>
                            
                            {/* Inline editable column for ingredient takaran (qty) */}
                            <td className="px-2 sm:px-4 py-2 text-right font-mono text-gray-900 whitespace-nowrap">
                              {editingBahanName === ing.namaBahan ? (
                                <div className="inline-flex items-center gap-1.5 justify-end">
                                  <input
                                    type="number"
                                    step="any"
                                    value={editingBahanQty}
                                    onChange={(e) => setEditingBahanQty(e.target.value)}
                                    className="w-16 border border-emerald-500 bg-white p-1 text-xs text-right rounded font-bold"
                                    autoFocus
                                  />
                                  <span className="text-[10px] text-gray-500 font-normal">{ing.satuan}</span>
                                  <button
                                    onClick={() => handleSaveInlineEdit(ing.namaBahan)}
                                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingBahanName(null)}
                                    className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1.5 justify-end group">
                                  <span>{ing.takaran}</span>
                                  <button
                                    onClick={() => handleStartInlineEdit(ing.namaBahan, ing.takaran)}
                                    className="p-1 opacity-60 group-hover:opacity-100 text-blue-600 hover:bg-blue-50 rounded transition cursor-pointer"
                                    title="Edit Takaran Qty"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </td>

                            <td className="px-2 sm:px-4 py-3 text-center font-bold text-gray-600 text-xs whitespace-nowrap">
                              {ing.satuan}
                            </td>
                            <td className="px-2 sm:px-4 py-3 text-right font-mono text-gray-500 text-xs whitespace-nowrap">
                              {formatCurrency(ing.unitPrice)}/{ing.satuan}
                            </td>
                            <td className="px-2 sm:px-4 py-3 text-right text-emerald-800 font-bold font-mono whitespace-nowrap">
                              {formatCurrency(ing.itemCost)}
                            </td>
                            <td className="px-2 sm:px-4 py-2 text-center whitespace-nowrap">
                              <button
                                onClick={() => handleRemoveIngredientFromActive(ing.namaBahan)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Add Ingredient Form in active recipe */}
              <div className="bg-gray-50/60 p-4.5 rounded-xl border border-gray-150 space-y-3">
                <h4 className="text-[11px] uppercase font-bold text-slate-800 tracking-wider">
                  Minyak / Tepung / Mengetik Bahan Baru Ke Adonan
                </h4>
                <form onSubmit={handleAddIngredientToActive} className="flex flex-col sm:flex-row gap-2.5">
                  <div className="flex-1">
                    <select
                      required
                      value={selectedBahan}
                      onChange={(e) => setSelectedBahan(e.target.value)}
                      className="w-full text-xs font-semibold border border-gray-205 rounded-xl p-2.5 bg-white focus:outline-none"
                    >
                      <option value="">-- Pilih Bahan Baku Terbagi --</option>
                      {bahanBaku.map((b) => (
                        <option key={b.nama} value={b.nama}>
                          {b.nama} ({b.satuan}) - {formatCurrency(b.hargaSatuan)}/{b.satuan}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full sm:w-40 flex gap-1">
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      required
                      placeholder="Takaran"
                      value={takaranBahan}
                      onChange={(e) => setTakaranBahan(e.target.value)}
                      className="flex-1 text-xs border border-gray-205 rounded-xl p-2.5 bg-white"
                    />
                    <select value={takaranSatuan} onChange={e => setTakaranSatuan(e.target.value)}
                      className="w-16 text-xs border border-gray-200 rounded-xl p-2.5 font-bold bg-white text-center">
                      {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="sm:w-auto inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition duration-150 cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah
                  </button>
                </form>

                {bahanBaku.length === 0 && (
                  <p className="text-[11px] text-red-500 font-medium">
                    ⚠️ Belum ada Bahan Baku terdaftar di tab Bahan Baku. Silakan tambahkan bahan baku terlebih dahulu.
                  </p>
                )}
              </div>

              {/* ─── VARIAN PANEL — selalu tampil (untuk tambah varian pertama) ─── */}
              <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl border border-purple-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span>📐 Varian Ukuran</span>
                    </h4>
                    {activeProduct.variants && activeProduct.variants.length > 0 && (
                      <span className="text-[9px] font-mono bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">
                        {activeProduct.variants.filter(v => v.active !== false).length} aktif
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowVariantPanel(!showVariantPanel)}
                    className="text-[10px] font-bold text-purple-700 bg-white border border-purple-200 px-3 py-1 rounded-lg hover:bg-purple-100 cursor-pointer transition"
                  >
                    {showVariantPanel ? 'Tutup' : '+ Varian Baru'}
                  </button>
                </div>

                {(!activeProduct.variants || activeProduct.variants.length === 0) && !showVariantPanel && (
                  <p className="text-[10px] text-gray-400 py-2 text-center">
                    Belum ada varian ukuran. Klik "+ Varian Baru" untuk menambahkan varian (misal: 20×20, 20×10).
                  </p>
                )}

                {/* Daftar varian existing */}
                {activeProduct.variants && activeProduct.variants.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeProduct.variants.map(v => (
                      <div key={v.id} className={`p-3 rounded-xl border ${v.active !== false ? 'bg-white border-purple-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-800">{v.name}</span>
                            {v.active === false && (
                              <span className="text-[9px] text-gray-400 font-bold uppercase">Nonaktif</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                onUpdateVariant?.(activeProduct.namaProduk, v.id, { active: v.active !== false ? false : true });
                              }}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer ${v.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}
                            >
                              {v.active !== false ? 'Aktif' : 'Nonaktif'}
                            </button>
                            <button
                              onClick={() => {
                                setEditingVariantId(v.id);
                                setEditingVariantIngredients(v.ingredients || []);
                              }}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDeleteVariant?.(activeProduct.namaProduk, v.id)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-gray-500">Porsi: {v.porsi}</span>
                          <span className="font-bold font-mono text-purple-700">
                            {v.hargaJual > 0 ? formatCurrency(v.hargaJual) : 'Harga belum diatur'}
                          </span>
                        </div>
                        {v.ingredients && v.ingredients.length > 0 && (
                          <p className="text-[9px] text-gray-400 mt-1 truncate">
                            {v.ingredients.length} bahan override
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Form tambah varian */}
                {showVariantPanel && (
                  <div className="bg-white p-4 rounded-xl border border-purple-200 space-y-3">
                    <h5 className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Tambah Varian Baru</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 block mb-0.5">Nama Varian</label>
                        <input
                          type="text"
                          placeholder="Ukuran 20×20"
                          value={newVariantName}
                          onChange={e => setNewVariantName(e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg p-2"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 block mb-0.5">Porsi <span className="text-blue-500 font-normal normal-case">otomatis dr resep</span></label>
                        <div className="w-full border border-gray-200 bg-purple-50 rounded-lg p-2 font-mono text-purple-800 font-bold text-sm text-center">
                          {activeRecipePorsi} porsi
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 block mb-0.5">Harga Jual <span className="text-blue-500 font-normal normal-case">otomatis dr HPP</span></label>
                        <div className="w-full border border-gray-200 bg-purple-50 rounded-lg p-2 font-mono text-purple-800 font-bold text-sm text-center">
                          {formatCurrency(totalIngredientsCost / activeRecipePorsi)} / porsi
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          const name = newVariantName.trim();
                          if (!name) return;
                          const hppPerPorsi = totalIngredientsCost / activeRecipePorsi;
                          onAddVariant?.(activeProduct.namaProduk, {
                            id: `var-${Date.now()}`,
                            name,
                            porsi: activeRecipePorsi,
                            hargaJual: hppPerPorsi,
                            active: true,
                          });
                          setNewVariantName('');
                          setShowVariantPanel(false);
                        }}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                      >
                        + Tambah Varian
                      </button>
                    </div>
                  </div>
                )}

                {/* Panel edit varian — atur ingredients override */}
                {editingVariantId && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                        Edit Bahan Varian (override resep dasar)
                      </h5>
                      <button
                        onClick={() => setEditingVariantId(null)}
                        className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[9px] text-amber-700">
                      Kosongkan jika takaran sama dengan resep dasar. Isi hanya untuk bahan yang berbeda.
                    </p>
                    
                    {/* Daftar ingredients override */}
                    <div className="space-y-1.5">
                      {editingVariantIngredients.map((ing, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-700 flex-1">{ing.namaBahan}</span>
                          <input
                            type="number"
                            step="any"
                            value={ing.takaran}
                            onChange={e => {
                              const updated = [...editingVariantIngredients];
                              updated[idx] = { ...updated[idx], takaran: parseFloat(e.target.value) || 0 };
                              setEditingVariantIngredients(updated);
                            }}
                            className="w-20 text-xs border border-gray-200 rounded-lg p-1.5 font-mono text-right"
                          />
                          <span className="text-[9px] text-gray-400 w-8">gr</span>
                          <button
                            onClick={() => {
                              setEditingVariantIngredients(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1 text-red-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Tambah bahan override */}
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedVariantIngBahan}
                        onChange={e => setSelectedVariantIngBahan(e.target.value)}
                        className="flex-1 text-xs border border-gray-200 rounded-lg p-2"
                      >
                        <option value="">Pilih bahan...</option>
                        {bahanBaku.map(b => (
                          <option key={b.nama} value={b.nama}>{b.nama}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="any"
                        placeholder="Takaran (gr)"
                        value={selectedVariantIngTakaran}
                        onChange={e => setSelectedVariantIngTakaran(e.target.value)}
                        className="w-24 text-xs border border-gray-200 rounded-lg p-2 font-mono"
                      />
                      <button
                        onClick={() => {
                          const nama = selectedVariantIngBahan.trim();
                          const takaran = parseFloat(selectedVariantIngTakaran) || 0;
                          if (!nama || takaran <= 0) return;
                          setEditingVariantIngredients(prev => [
                            ...prev.filter(i => i.namaBahan !== nama),
                            { namaBahan: nama, takaran },
                          ]);
                          setSelectedVariantIngBahan('');
                          setSelectedVariantIngTakaran('');
                        }}
                        className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-amber-200">
                      <button
                        onClick={() => {
                          onUpdateVariant?.(activeProduct.namaProduk, editingVariantId, {
                            ingredients: editingVariantIngredients,
                          });
                          setEditingVariantId(null);
                        }}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg transition cursor-pointer"
                      >
                        <Save className="w-3 h-3 inline mr-1" />
                        Simpan Bahan Varian
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-indigo-200">
                <div className="flex items-center gap-3 text-xs">
                  <Coins className="w-5 h-5 text-indigo-600 shrink-0" />
                  <p className="text-gray-600">
                    <strong>Add-on / Topping</strong> sekarang dikelola di tab terpisah untuk menghindari <strong>double counting</strong> di POS. 
                    Buka <strong>🧩 Add-on & Topping</strong> di sidebar untuk mengelola topping secara terpusat.
                  </p>
                </div>
              </div>

              {/* INTEGRATED REVENUE BREAKDOWN & HPPS SUMMARY CARD */}
              <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 space-y-3.5 font-sans">
                <h4 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5 font-mono">
                  <Coins className="w-4 h-4 text-emerald-400" /> RESUME MARGIN & ESTIMASI HPP UTAMA
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold divide-y sm:divide-y-0 sm:divide-x divide-slate-800 text-center">
                  <div className="space-y-1 py-2 sm:py-0">
                    <span className="text-[10px] uppercase text-slate-400 block font-normal">HPP Resep (Bahan Saja)</span>
                    <span className="text-sm font-mono text-slate-200">{formatCurrency(totalIngredientsCost / activeRecipePorsi)} / porsi</span>
                  </div>
                  
                  <div className="space-y-1 py-2 sm:py-0 sm:pl-4">
                    <span className="text-[10px] uppercase text-slate-400 block font-normal">Biaya Operasional</span>
                    <span className="text-sm font-mono text-slate-200">Via OPEX (Arus Kas)</span>
                  </div>

                  <div className="space-y-1 py-2 sm:py-0 sm:pl-4">
                    <span className="text-[10px] uppercase text-slate-400 block font-normal">Total HPP (Bahan Saja)</span>
                    <span className="text-base font-mono text-emerald-400">{formatCurrency(totalIngredientsCost / activeRecipePorsi)} / porsi</span>
                  </div>
                </div>

                {/* Suggested Pricing Section — dari CalculatedProducts */}
                {(() => {
                  const calc = calculatedProducts.find(
                    c => c.namaProduk.toLowerCase().trim() === selectedProductName.toLowerCase().trim()
                  );
                  if (!calc) {
                    return (
                      <div className="border-t border-slate-800/80 pt-3">
                        <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            💡 Atur <strong>target margin & harga jual</strong> di modul <strong>📈 Harga & HPP → HPP & Margin</strong>.
                            Simpan resep terlebih dahulu agar kalkulasi HPP muncul di sini.
                          </p>
                        </div>
                      </div>
                    );
                  }
                  const marginRp = calc.hargaJual - calc.hppPerPorsi;
                  const marginPct = calc.hppPerPorsi > 0 ? (marginRp / calc.hargaJual) * 100 : 0;
                  return (
                    <div className="border-t border-slate-800/80 pt-3 space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[9px] uppercase text-slate-500 block font-semibold">HPP / porsi</span>
                          <span className="text-sm font-black font-mono text-emerald-400">{formatCurrency(calc.hppPerPorsi)}</span>
                        </div>
                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[9px] uppercase text-slate-500 block font-semibold">Harga Jual</span>
                          <span className={`text-sm font-black font-mono ${calc.hargaJual > 0 ? 'text-white' : 'text-amber-400'}`}>
                            {calc.hargaJual > 0 ? formatCurrency(calc.hargaJual) : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[9px] uppercase text-slate-500 block font-semibold">Laba / porsi</span>
                          <span className={`text-sm font-black font-mono ${marginRp > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {calc.hargaJual > 0 ? formatCurrency(marginRp) : '—'}
                          </span>
                        </div>
                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[9px] uppercase text-slate-500 block font-semibold">Margin</span>
                          <span className={`text-sm font-black font-mono ${marginPct >= 20 ? 'text-emerald-400' : marginPct > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                            {calc.hargaJual > 0 ? `${marginPct.toFixed(1)}%` : '—'}
                          </span>
                        </div>
                      </div>
                      {calc.biayaOverhead !== undefined && (calc.biayaOverhead > 0 || calc.biayaTenagaKerja || calc.biayaKemasan || calc.biayaUtilitas) && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                          {calc.biayaOverhead > 0 && (
                            <div className="flex justify-between text-slate-400">
                              <span>Overhead</span>
                              <span className="font-mono text-slate-300">{formatCurrency(calc.biayaOverhead)}</span>
                            </div>
                          )}
                          {calc.biayaTenagaKerja > 0 && (
                            <div className="flex justify-between text-slate-400">
                              <span>Tenaga Kerja</span>
                              <span className="font-mono text-slate-300">{formatCurrency(calc.biayaTenagaKerja)}</span>
                            </div>
                          )}
                          {calc.biayaKemasan > 0 && (
                            <div className="flex justify-between text-slate-400">
                              <span>Kemasan</span>
                              <span className="font-mono text-slate-300">{formatCurrency(calc.biayaKemasan)}</span>
                            </div>
                          )}
                          {calc.biayaUtilitas > 0 && (
                            <div className="flex justify-between text-slate-400">
                              <span>Utilitas</span>
                              <span className="font-mono text-slate-300">{formatCurrency(calc.biayaUtilitas)}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {calc.variants && calc.variants.length > 0 && (
                        <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800/60">
                          <span className="text-[9px] uppercase text-slate-500 block font-semibold mb-1">Varian</span>
                          <div className="space-y-0.5">
                            {calc.variants.map(v => (
                              <div key={v.id} className="flex justify-between text-[10px]">
                                <span className="text-slate-400">{v.name}</span>
                                <span className="font-mono text-slate-300">
                                  {formatCurrency(v.hppPerPorsi)} / porsi → jual {formatCurrency(v.hargaJual)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Current margin badge — konsisten */}
                <div className="border-t border-slate-800/80 pt-2 flex justify-end">
                  <div className="bg-slate-950 p-2 border border-slate-800 rounded-xl leading-none">
                    <span className="text-[10px] block text-slate-500 mb-1 font-semibold uppercase">Margin Bersih</span>
                    <span className="text-base font-black font-mono text-emerald-400">
                      {(() => {
                        const c = calculatedProducts.find(
                          p => p.namaProduk.toLowerCase().trim() === selectedProductName.toLowerCase().trim()
                        );
                        if (c && c.hppPerPorsi > 0 && c.hargaJual > 0) {
                          return `${(((c.hargaJual - c.hppPerPorsi) / c.hargaJual) * 100).toFixed(1)}%`;
                        }
                        return '—';
                      })()}
                    </span>
                  </div>
                </div>

                {/* Local Toast for price updates */}
                {localToast && (
                  <div className={`text-[10px] font-bold px-3 py-2 rounded-lg text-center ${
                    localToast.type === 'success' ? 'bg-emerald-800/60 text-emerald-200' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {localToast.message}
                  </div>
                )}
              </div>

              {/* ─── TOMBOL SELESAI ─── */}
              <div className="px-6 pb-6">
                <button
                  type="button"
                  onClick={() => {
                    // Pastikan porsi terakhir tersimpan
                    handleUpdatePorsi(activeRecipePorsi);
                    showToastLocal('✅ Resep berhasil disimpan!', 'success');
                    // Kembali ke pemilihan kategori (tutup panel editing)
                    setIsEditingProductDetails(false);
                    setShowVariantPanel(false);
                  }}
                  className="w-full py-3.5 text-sm font-black bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl shadow-md cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  ✅ Selesai — Simpan Resep
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
