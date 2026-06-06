import React, { useState, useEffect } from 'react';
import { BahanBaku, ProductHpp, DetailResep, ProductTopping } from '../types';
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
import { getSavedRecipeImage, saveRecipeImage, getFoodImageForPrompt } from '../lib/image-generator';

interface RecipesTabProps {
  bahanBaku: BahanBaku[];
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  onAddProduct: (p: ProductHpp, ingredients: DetailResep[]) => void;
  onUpdateProductIngredients: (productName: string, updatedDetails: DetailResep[], porsiJual: number) => void;
  onDeleteProduct: (productName: string) => void;
  onUpdateProductDetails?: (oldName: string, updated: ProductHpp) => void; // Optional if needed, else we can do inline local updates or handle it in App.tsx
}

export default function RecipesTab({
  bahanBaku,
  productHpp,
  detailResep,
  onAddProduct,
  onUpdateProductIngredients,
  onDeleteProduct,
  onUpdateProductDetails,
}: RecipesTabProps) {
  const [selectedProductName, setSelectedProductName] = useState<string>(
    productHpp.length > 0 ? productHpp[0].namaProduk : ''
  );

  // Categories Filter State — Dynamic with add/edit/delete
  const [categoriesList, setCategoriesList] = useState<string[]>(() => {
    const saved = localStorage.getItem('recipe_categories_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      return ['Semua', ...parsed];
    }
    return ['Semua', 'Roti', 'Cake', 'Cookies', 'Coffee', 'Lainnya'];
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [editingCategory, setEditingCategory] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  // Save categories to localStorage
  useEffect(() => {
    const catsForStorage = categoriesList.filter(c => c !== 'Semua');
    localStorage.setItem('recipe_categories_data', JSON.stringify(catsForStorage));
  }, [categoriesList]);

  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (categoriesList.some(c => c.toLowerCase() === name.toLowerCase())) {
      alert(`Kategori "${name}" sudah ada!`);
      return;
    }
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

  const handleDeleteCategory = (cat: string) => {
    if (cat === 'Semua') return;
    if (!window.confirm(`Hapus kategori "${cat}"? Kategori akan dihapus dari daftar filter. Produk dengan kategori ini tetap ada — ubah kategorinya secara manual di panel Edit.`)) return;
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
    setCategoriesList(prev => prev.map(c => c === oldName ? newName : c));
    if (selectedCategory === oldName) setSelectedCategory(newName);
    setEditingCategory('');
  };

  // AI Image States
  const [imagePrompt, setImagePrompt] = useState('');
  const [recipeImage, setRecipeImage] = useState('');
  const [generatingImage, setGeneratingImage] = useState(false);

  // New product formulation state with category
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductPorsi, setNewProductPorsi] = useState('10');
  const [newProductOverhead, setNewProductOverhead] = useState('5000');
  const [newProductHargaJual, setNewProductHargaJual] = useState('45000');
  const [newProductKategori, setNewProductKategori] = useState('Roti');

  // Edit existing product formula state
  const [isEditingProductDetails, setIsEditingProductDetails] = useState(false);
  const [editPorsiJual, setEditPorsiJual] = useState('');
  const [editOverhead, setEditOverhead] = useState('');
  const [editHargaJual, setEditHargaJual] = useState('');
  const [editKategori, setEditKategori] = useState('Roti');

  // Active Ingredient adding in formulation state
  const [activeRecipePorsi, setActiveRecipePorsi] = useState<number>(10);
  const [selectedBahan, setSelectedBahan] = useState('');
  const [takaranBahan, setTakaranBahan] = useState('');

  // Inline ingredient quantity editing state
  const [editingBahanName, setEditingBahanName] = useState<string | null>(null);
  const [editingBahanQty, setEditingBahanQty] = useState<string>('');

  // Topping Addon state persistent
  const [toppings, setToppings] = useState<ProductTopping[]>(() => {
    const saved = localStorage.getItem('toppings_data');
    return saved ? JSON.parse(saved) : [];
  });

  // New topping form state
  const [selectedToppingsBahan, setSelectedToppingsBahan] = useState('');
  const [newToppingName, setNewToppingName] = useState('');
  const [newToppingTakaran, setNewToppingTakaran] = useState('');
  const [newToppingHargaJual, setNewToppingHargaJual] = useState('5000');

  // Sync Toppings back to localStorage
  useEffect(() => {
    localStorage.setItem('toppings_data', JSON.stringify(toppings));
  }, [toppings]);

  // Find active product
  const activeProduct = productHpp.find(
    (p) => p.namaProduk.toLowerCase().trim() === selectedProductName.toLowerCase().trim()
  );

  // Sync states on load and product selection
  useEffect(() => {
    if (activeProduct) {
      setActiveRecipePorsi(activeProduct.porsiJual);
      setEditPorsiJual(activeProduct.porsiJual.toString());
      setEditOverhead(activeProduct.overhead.toString());
      setEditHargaJual(activeProduct.hargaJual.toString());
      setEditKategori(activeProduct.kategori || 'Roti');
    }
    if (selectedProductName) {
      setRecipeImage(getSavedRecipeImage(selectedProductName));
      setImagePrompt(selectedProductName);
    }
  }, [selectedProductName, productHpp, activeProduct]);

  const handleGenerateImage = () => {
    if (!selectedProductName || !imagePrompt.trim()) return;
    setGeneratingImage(true);
    setTimeout(() => {
      const newImg = getFoodImageForPrompt(imagePrompt);
      saveRecipeImage(selectedProductName, newImg);
      setRecipeImage(newImg);
      setGeneratingImage(false);
    }, 1000);
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

  // Topping details of the active product
  const activeToppings = toppings.filter(
    (t) => t.namaProduk.toLowerCase().trim() === selectedProductName.toLowerCase().trim()
  );

  const totalToppingsHpp = activeToppings.reduce((acc, curr) => {
    const raw = bahanMap.get(curr.namaBahan.toLowerCase().trim());
    const cost = raw ? curr.takaran * raw.hargaSatuan : 0;
    return acc + cost;
  }, 0);

  const totalToppingsRevenue = activeToppings.reduce((acc, curr) => acc + curr.hargaJualTopping, 0);

  // Add ingredient to active recipe
  const handleAddIngredientToActive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBahan || !takaranBahan || !activeProduct) return;

    const qty = parseFloat(takaranBahan) || 0;
    if (qty <= 0) return;

    // Check if ingredient already in list
    const isAlreadyPresent = activeDetails.some(
      (d) => d.namaBahan.toLowerCase().trim() === selectedBahan.toLowerCase().trim()
    );

    let updatedDetails;
    if (isAlreadyPresent) {
      updatedDetails = activeDetails.map((d) =>
        d.namaBahan.toLowerCase().trim() === selectedBahan.toLowerCase().trim() ? { ...d, takaran: d.takaran + qty } : d
      );
    } else {
      const newDetail: DetailResep = {
        namaProduk: activeProduct.namaProduk,
        namaBahan: selectedBahan,
        takaran: qty,
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

  // Save product details edit (overhead, margin, category)
  const handleSaveProductDetailsEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct) return;

    const finalPorsi = parseFloat(editPorsiJual) || 1;
    const finalOverhead = parseFloat(editOverhead) || 0;
    const finalHargaJual = parseFloat(editHargaJual) || 0;

    // Update locally or via prop cascade
    activeProduct.porsiJual = finalPorsi;
    activeProduct.overhead = finalOverhead;
    activeProduct.hargaJual = finalHargaJual;
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
  const handleCreateProduct = (e: React.FormEvent) => {
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

    const nextKode = `PRD-${String(productHpp.length + 1).padStart(3, '0')}`;
    const newProduct: ProductHpp = {
      kode: nextKode,
      namaProduk: newProductName.trim(),
      porsiJual: parseFloat(newProductPorsi) || 1,
      overhead: parseFloat(newProductOverhead) || 0,
      hargaJual: parseFloat(newProductHargaJual) || 0,
      kategori: newProductKategori,
    };

    onAddProduct(newProduct, []);
    setSelectedProductName(newProduct.namaProduk);
    setShowAddForm(false);

    // Reset formulation fields
    setNewProductName('');
    setNewProductPorsi('10');
    setNewProductOverhead('5000');
    setNewProductHargaJual('45000');
    setNewProductKategori('Roti');
  };

  // Delete product
  const handleDeleteProductClick = (productName: string) => {
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus produk "${productName}" beserta seluruh resep detailnya?`
    );
    if (confirmDelete) {
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

  // Target margin for auto-suggested pricing (default 40%)
  const [targetMargin, setTargetMargin] = useState(40);

  // Calculate suggested selling price based on HPP + target margin
  const suggestedPrice = activeProduct
    ? Math.round(((totalIngredientsCost + activeProduct.overhead) / activeRecipePorsi) / (1 - targetMargin / 100))
    : 0;

  // Apply suggested price to the active product
  const handleApplySuggestedPrice = () => {
    if (!activeProduct) return;
    const newPrice = suggestedPrice;
    activeProduct.hargaJual = newPrice;
    setEditHargaJual(newPrice.toString());
    // Trigger parent state update via existing mechanism
    onUpdateProductIngredients(activeProduct.namaProduk, activeDetails, activeRecipePorsi);
    showToastLocal(`Harga jual diterapkan: Rp ${newPrice.toLocaleString('id-ID')}`, 'success');
  };

  // Simple local toast notification
  const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);
  const showToastLocal = (message: string, type: 'success' | 'info' = 'info') => {
    setLocalToast({ message, type });
    setTimeout(() => setLocalToast(null), 3000);
  };

  // Topping Add-On Actions
  const handleAddTopping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductName || !selectedToppingsBahan) return;

    const raw = bahanMap.get(selectedToppingsBahan.toLowerCase().trim());
    if (!raw) return;

    const tName = newToppingName.trim() || `Topping ${selectedToppingsBahan}`;
    const tTakaran = parseFloat(newToppingTakaran) || 0;
    if (tTakaran <= 0) return;

    const newTp: ProductTopping = {
      id: Math.random().toString(36).substring(2, 9),
      namaProduk: selectedProductName,
      namaTopping: tName,
      takaran: tTakaran,
      hargaBeli: raw.hargaBeli,
      isiKemasan: raw.isiKemasan,
      satuan: raw.satuan,
      hargaSatuan: raw.hargaSatuan,
      hargaJualTopping: parseFloat(newToppingHargaJual) || 0,
    };

    setToppings((prev) => [...prev, newTp]);
    setSelectedToppingsBahan('');
    setNewToppingName('');
    setNewToppingTakaran('');
    setNewToppingHargaJual('5000');
  };

  const handleDeleteTopping = (id: string) => {
    setToppings((prev) => prev.filter((t) => t.id !== id));
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
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Portion Yield</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProductPorsi}
                    onChange={(e) => setNewProductPorsi(e.target.value)}
                    className="w-full text-xs border border-gray-200 bg-white rounded-lg p-2 font-mono font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Overhead (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="5000"
                    value={newProductOverhead}
                    onChange={(e) => setNewProductOverhead(e.target.value)}
                    className="w-full text-xs border border-gray-200 bg-white rounded-lg p-2 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Harga Jual (Rp) <span className="text-amber-500">*opsional</span></label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 — akan dihitung otomatis nanti"
                    value={newProductHargaJual}
                    onChange={(e) => setNewProductHargaJual(e.target.value)}
                    className="w-full text-xs border border-gray-200 bg-white rounded-lg p-2 font-mono text-center text-gray-500 font-bold"
                  />
                  <p className="text-[9px] text-gray-400 mt-0.5">Kosongkan (0) — sistem akan suggest harga berdasarkan HPP + margin nanti.</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <button
                type="submit"
                className="w-full py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer text-center active:scale-[0.98]"
              >
                {parseFloat(newProductHargaJual) > 0 ? 'Buat & Simpan Resep' : 'Buat Resep — Atur Harga Nanti'}
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
                          <span className="text-[8px] font-extrabold uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md leading-none border border-slate-200/50">
                            {p.kategori || 'Lainnya'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-medium text-gray-400">
                          <span className="font-bold text-emerald-800">{ingredientsCount} Bahan</span>
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
                </div>
                <h3 className="text-lg font-black text-slate-900 font-sans tracking-tight">{activeProduct.namaProduk}</h3>
                <p className="text-xs text-gray-500">
                  Atur porsi resep, edit overhead penjualan, margin, serta bahan baku resep utama.
                </p>
              </div>

              <div className="flex items-center gap-2">
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
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 text-xs">
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
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Overhead Batch (Rp)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editOverhead}
                      onChange={(e) => setEditOverhead(e.target.value)}
                      className="w-full border border-gray-200 bg-white rounded-lg p-2.5 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">Harga Jual Normal (Rp)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editHargaJual}
                      onChange={(e) => setEditHargaJual(e.target.value)}
                      className="w-full border border-gray-200 bg-white rounded-lg p-2.5 font-mono text-emerald-800 font-bold"
                    />
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
              </div>
              
              <div className="md:col-span-9 space-y-2">
                <label className="block text-[10px] uppercase font-bold text-emerald-950 flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Generator Foto Instan AI (Buku Menu)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Contoh: Kue brownies panggang lumer premium cokelat keju mewah"
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2.5 bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500 font-medium"
                  />
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
                  Ketik nama hidangan di atas, lalu klik <strong>Generate</strong> untuk melampirkan foto makanan HD hasil visualisasi AI.
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
                    <table className="w-full border-collapse text-left text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-gray-150 bg-slate-900 text-[10px] font-bold uppercase text-white font-mono">
                          <th className="px-4 py-3">Nama Bahan</th>
                          <th className="px-4 py-3 text-right">Takaran (Qty)</th>
                          <th className="px-4 py-3 text-right">Harga Satuan</th>
                          <th className="px-4 py-3 text-right">Subtotal Biaya</th>
                          <th className="px-4 py-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700 font-sans">
                        {calculatedIngredients.map((ing, idx) => (
                          <tr key={idx} className="hover:bg-emerald-50/15">
                            <td className="px-4 py-3 font-semibold text-gray-905">
                              {ing.namaBahan}
                              {ing.notFound && (
                                <span className="block text-[10px] text-red-500 font-normal mt-0.5">
                                  ⚠️ Bahan tidak terdaftar di Tab Bahan Baku! (Rp 0)
                                </span>
                              )}
                            </td>
                            
                            {/* Inline editable column for ingredient takaran (qty) */}
                            <td className="px-4 py-2 text-right font-mono text-gray-900">
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
                                  <span>{ing.takaran} {ing.satuan}</span>
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

                            <td className="px-4 py-3 text-right font-mono text-gray-500 text-xs">
                              {formatCurrency(ing.unitPrice)} / {ing.satuan}
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-800 font-bold font-mono">
                              {formatCurrency(ing.itemCost)}
                            </td>
                            <td className="px-4 py-2 text-center">
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

                  <div className="w-full sm:w-44 relative">
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      required
                      placeholder="Banyaknya (takaran)"
                      value={takaranBahan}
                      onChange={(e) => setTakaranBahan(e.target.value)}
                      className="w-full text-xs border border-gray-205 rounded-xl p-2.5 bg-white"
                    />
                    {selectedBahan && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-extrabold uppercase font-mono">
                        {bahanBaku.find((b) => b.nama === selectedBahan)?.satuan || ''}
                      </span>
                    )}
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

              {/* TOPPING ADDON MODULE - COMPLETE, EXPANDABLE & CLEAR PERSISTENT MATHS */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-dashed border-indigo-200 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-indigo-600" />
                      Add-on / Toppings Pendukung Menu (Eceran)
                    </h4>
                    <p className="text-[10px] text-gray-500">
                      Tambahkan opsi topping berbayar untuk kustomisasi roti (misal: ekstra keju, coklat choco-chip).
                    </p>
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-150 px-2 py-0.5 rounded">
                    {activeToppings.length} topping terhubung
                  </span>
                </div>

                {activeToppings.length === 0 ? (
                  <div className="text-center p-6 bg-white border border-gray-150 rounded-xl">
                    <p className="text-xs text-gray-400 font-semibold uppercase">Belum Ada Topping Khusus</p>
                    <p className="text-[10px] text-gray-400 mt-1">Anda bisa menambahkan topping opsional yang bisa dipilih konsumen kasir.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                    {activeToppings.map((t) => {
                      const matObj = bahanMap.get(t.namaBahan.toLowerCase().trim());
                      const currentHpp = matObj ? t.takaran * matObj.hargaSatuan : 0;
                      const profit = t.hargaJualTopping - currentHpp;

                      return (
                        <div key={t.id} className="bg-white border border-gray-150 p-3 rounded-xl flex items-center justify-between text-xs font-semibold text-gray-700">
                          <div>
                            <span className="font-bold text-gray-900 block">{t.namaTopping}</span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              Bahan: {t.namaBahan} ({t.takaran} {t.satuan})
                            </span>
                          </div>
                          
                          <div className="text-right flex items-center gap-4">
                            <div>
                              <span className="text-[10px] text-gray-400 block font-normal uppercase">Harga Jual Topping</span>
                              <span className="font-bold text-indigo-700 font-mono">{formatCurrency(t.hargaJualTopping)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 block font-normal uppercase">Estimasi Modal HPP</span>
                              <span className="font-bold text-amber-700 font-mono">{formatCurrency(currentHpp)}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-gray-400 block font-normal uppercase">Laba (Margin)</span>
                              <span className="font-bold text-emerald-700 font-mono">
                                +{formatCurrency(profit)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteTopping(t.id)}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Adding New Topping Form */}
                <form onSubmit={handleAddTopping} className="p-4 bg-white rounded-xl border border-indigo-150/60 grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-xs">
                  <div className="md:col-span-3">
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Pilih Bahan Mentah</label>
                    <select
                      required
                      value={selectedToppingsBahan}
                      onChange={(e) => {
                        setSelectedToppingsBahan(e.target.value);
                        setNewToppingName(`Topping ${e.target.value}`);
                        const raw = bahanMap.get(e.target.value.toLowerCase().trim());
                        if (raw) setNewToppingTakaran('15');
                      }}
                      className="w-full border border-gray-205 rounded-xl p-2.5 bg-white font-medium"
                    >
                      <option value="">-- Pilih Bahan --</option>
                      {bahanBaku.map((b) => (
                        <option key={b.nama} value={b.nama}>
                          {b.nama} ({b.satuan})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Nama Topping Addon</label>
                    <input
                      type="text"
                      required
                      placeholder="Misal: Keju Parut Tebal"
                      value={newToppingName}
                      onChange={(e) => setNewToppingName(e.target.value)}
                      className="w-full border border-gray-205 rounded-xl p-2.5 bg-white font-medium"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Takaran Topping</label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="any"
                      placeholder="15"
                      value={newToppingTakaran}
                      onChange={(e) => setNewToppingTakaran(e.target.value)}
                      className="w-full border border-gray-205 rounded-xl p-2.5 bg-white font-mono font-bold"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">Harga Jual (Rp)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={newToppingHargaJual}
                      onChange={(e) => setNewToppingHargaJual(e.target.value)}
                      className="w-full border border-gray-205 rounded-xl p-2.5 bg-white font-mono font-bold text-indigo-700"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer flex justify-center items-center gap-1 uppercase"
                    >
                      <Plus className="w-3.5 h-3.5" /> Topping
                    </button>
                  </div>
                </form>
              </div>

              {/* INTEGRATED REVENUE BREAKDOWN & HPPS SUMMARY CARD */}
              <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 space-y-3.5 font-sans">
                <h4 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-1.5 font-mono">
                  <Coins className="w-4 h-4 text-emerald-400" /> RESUME MARGIN & ESTIMASI HPP UTAMA
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-bold divide-y sm:divide-y-0 sm:divide-x divide-slate-800 text-center">
                  <div className="space-y-1 py-2 sm:py-0">
                    <span className="text-[10px] uppercase text-slate-400 block font-normal">HPP Resep Adonan</span>
                    <span className="text-sm font-mono text-slate-200">{formatCurrency(totalIngredientsCost / activeRecipePorsi)} / porsi</span>
                  </div>
                  
                  <div className="space-y-1 py-2 sm:py-0 sm:pl-4">
                    <span className="text-[10px] uppercase text-slate-400 block font-normal">Biaya Overhead Unit</span>
                    <span className="text-sm font-mono text-slate-200">{formatCurrency(activeProduct.overhead / activeRecipePorsi)} / porsi</span>
                  </div>

                  <div className="space-y-1 py-2 sm:py-0 sm:pl-4">
                    <span className="text-[10px] uppercase text-slate-400 block font-normal">Total HPP + Overhead</span>
                    <span className="text-base font-mono text-emerald-400">{formatCurrency((totalIngredientsCost + activeProduct.overhead) / activeRecipePorsi)} / porsi</span>
                  </div>
                </div>

                {/* Suggested Pricing Section */}
                <div className="border-t border-slate-800/80 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Current Price & Margin */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Harga Jual Saat Ini</span>
                      <span className={`font-mono font-bold ${activeProduct.hargaJual > 0 ? 'text-white' : 'text-amber-400'}`}>
                        {activeProduct.hargaJual > 0 ? formatCurrency(activeProduct.hargaJual) : 'BELUM DIATUR'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Margin Aktual</span>
                      <span className={`font-mono font-bold ${activeProduct.hargaJual > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {activeProduct.hargaJual > 0
                          ? `${(((activeProduct.hargaJual - ((totalIngredientsCost + activeProduct.overhead) / activeRecipePorsi)) / activeProduct.hargaJual) * 100).toFixed(1)}%`
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Target Margin & Suggested Price */}
                  <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Target Margin</span>
                      <input
                        type="range"
                        min="5"
                        max="80"
                        step="5"
                        value={targetMargin}
                        onChange={(e) => setTargetMargin(parseInt(e.target.value))}
                        className="flex-1 h-1.5 accent-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-mono font-bold text-emerald-400 w-8 text-right">{targetMargin}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Harga Rekomendasi</span>
                      <span className="text-base font-black font-mono text-amber-400">
                        {suggestedPrice > 0 ? formatCurrency(suggestedPrice) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] text-slate-500">
                        HPP {formatCurrency(Math.round((totalIngredientsCost + activeProduct.overhead) / activeRecipePorsi))} + {targetMargin}% margin
                      </span>
                      <button
                        onClick={handleApplySuggestedPrice}
                        disabled={suggestedPrice <= 0 || activeProduct.hargaJual === suggestedPrice}
                        className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition cursor-pointer ${
                          suggestedPrice > 0 && activeProduct.hargaJual !== suggestedPrice
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        }`}
                      >
                        Terapkan Harga
                      </button>
                    </div>
                  </div>
                </div>

                {/* Current margin badge */}
                <div className="border-t border-slate-800/80 pt-2 flex justify-end">
                  <div className="bg-slate-950 p-2 border border-slate-800 rounded-xl leading-none">
                    <span className="text-[10px] block text-slate-500 mb-1 font-semibold uppercase">Margin Bersih</span>
                    <span className="text-base font-black font-mono text-emerald-400">
                      {activeProduct.hargaJual > 0
                        ? `${(((activeProduct.hargaJual - ((totalIngredientsCost + activeProduct.overhead) / activeRecipePorsi)) / activeProduct.hargaJual) * 100).toFixed(1)}%`
                        : '—'}
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

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
