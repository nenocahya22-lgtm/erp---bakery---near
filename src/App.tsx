/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { googleSignIn } from './lib/firebase';
import {
  extractSpreadsheetId,
  loadProjectDataFromSheets,
  createAndInitializeTemplates,
  saveProjectDataToSheets,
} from './lib/sheets';
import { calculateAllProducts } from './lib/calculations';
import { BahanBaku, ProductHpp, DetailResep, CalculationResult } from './types';

import OwnerLogin from './components/OwnerLogin';
import DashboardTab from './components/DashboardTab';
import MaterialsTab from './components/MaterialsTab';
import RecipesTab from './components/RecipesTab';
import HppTab from './components/HppTab';

// Advanced ERP Modules
import EnterpriseDashboard from './components/EnterpriseDashboard';
import FinanceCashFlowTab from './components/FinanceCashFlowTab';
import WasteControlTab from './components/WasteControlTab';
import RdSandboxTab, { RDExperiment } from './components/RdSandboxTab';
import LogisticsTab from './components/LogisticsTab';
import SmartKitchenTab from './components/SmartKitchenTab';
import ComplianceSafetyTab from './components/ComplianceSafetyTab';

// New focused modules (2026 restructuring)
import PosKasirTab from './components/PosKasirTab';
import PesananOnlineTab from './components/PesananOnlineTab';
import CrmMarketingTab from './components/CrmMarketingTab';
import BomTab from './components/BomTab';
import MpsTab from './components/MpsTab';
import StokGudangTab from './components/StokGudangTab';
import FefoTab from './components/FefoTab';
import SupplierTab from './components/SupplierTab';
import PrediksiTab from './components/PrediksiTab';
import BudgetTab from './components/BudgetTab';

import {
  AlertTriangle,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Layers,
  Sparkles,
  RefreshCw,
  FolderTree,
  TrendingUp,
  Package,
  Cpu,
  ShieldAlert,
  Truck,
  LineChart,
  Users,
  ShoppingCart,
  Coins,
  FlaskConical,
  LogOut,
  Menu,
} from 'lucide-react';

export default function App() {
  // Owner authentication gate
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState(() => localStorage.getItem('owner_authenticated') === 'true');

  const handleOwnerLogin = () => {
    setIsOwnerAuthenticated(true);
  };

  const handleOwnerLogout = () => {
    localStorage.removeItem('owner_authenticated');
    localStorage.removeItem('owner_authenticated_at');
    setIsOwnerAuthenticated(false);
  };

  // Set offline/localStorage mode by default — no Firebase auth needed
  const [user] = useState<{displayName: string; email: string; uid: string}>({
    displayName: 'Owner',
    email: 'owner@bakery.id',
    uid: 'offline-uid'
  });
  const [token, setToken] = useState<string | null>(null);

  // Connection Sheet state
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [spreadsheetTitle, setSpreadsheetTitle] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [sheetTitles, setSheetTitles] = useState<string[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Core records state
  const [bahanBaku, setBahanBaku] = useState<BahanBaku[]>([]);
  const [productHpp, setProductHpp] = useState<ProductHpp[]>([]);
  const [detailResep, setDetailResep] = useState<DetailResep[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);

  // Tabs layout — satu modul satu fitur
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'materials'
    | 'recipes'
    | 'hpp'
    | 'erp_bi'
    | 'erp_cash_flow'
    | 'erp_waste'
    | 'erp_rd'
    | 'erp_bom'
    | 'erp_mps'
    | 'erp_stock'
    | 'erp_fefo'
    | 'erp_supplier'
    | 'erp_log'
    | 'erp_pos'
    | 'erp_online'
    | 'erp_crm'
    | 'erp_prediksi'
    | 'erp_budget'
    | 'erp_iot'
    | 'erp_compliance'
  >('dashboard');

  // --- Lifted States with persistent syncing back to localStorage ---
  const [rdExperiments, setRdExperiments] = useState<RDExperiment[]>(() => {
    const saved = localStorage.getItem('rd_experiments_data');
    return saved ? JSON.parse(saved) : [];
  });

  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>(() => {
    const saved = localStorage.getItem('waste_logs_data');
    return saved ? JSON.parse(saved) : [];
  });

  // State sync effects
  useEffect(() => {
    localStorage.setItem('rd_experiments_data', JSON.stringify(rdExperiments));
  }, [rdExperiments]);

  useEffect(() => {
    localStorage.setItem('waste_logs_data', JSON.stringify(wasteLogs));
  }, [wasteLogs]);

  // Handlers for state updates
  const handleAddRD = (exp: RDExperiment) => {
    setRdExperiments((prev) => [exp, ...prev]);
    showToast(`Proyek Litbang "${exp.projectName}" berhasil didaftarkan!`, 'success');
  };

  const handleDeleteRD = (id: string) => {
    setRdExperiments((prev) => prev.filter((e) => e.id !== id));
    showToast('Proyek Litbang dihapus.', 'info');
  };

  const handleAddWasteLog = (log: WasteLog) => {
    setWasteLogs((prev) => [log, ...prev]);
    showToast(`Input Waste "${log.bahanNama}" berhasil dicatat!`, 'success');
  };

  const handleDeleteWasteLog = (id: string) => {
    setWasteLogs((prev) => prev.filter((w) => w.id !== id));
    showToast('Pencatatan Waste dihapus.', 'info');
  };

  const handleWipeAllData = () => {
    setBahanBaku([]);
    setProductHpp([]);
    setDetailResep([]);
    setRdExperiments([]);
    setWasteLogs([]);
    
    localStorage.removeItem('rd_experiments_data');
    localStorage.removeItem('waste_logs_data');
    localStorage.removeItem('stock_levels_data');
    localStorage.removeItem('toppings_data');
    localStorage.removeItem('pos_orders_data');
    localStorage.removeItem('stock_levels_data');
    
    setHasUnsavedChanges(true);
    showToast('Sistem Near Bakery & Co berhasil diformat steril! Semua data contoh telah dibersihkan.', 'success');
  };

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Notifications toast state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  // Show a nicely styled sliding toast message
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Auto-connect to Google Sheets if a URL is already saved
  useEffect(() => {
    const savedUrl = localStorage.getItem('spreadsheet_url');
    if (savedUrl && token) {
      setSpreadsheetUrl(savedUrl);
      const parsedId = extractSpreadsheetId(savedUrl);
      if (parsedId) {
        setSpreadsheetId(parsedId);
        handleConnect(token, parsedId, false);
      }
    }
  }, [token]);

  // Robust Auto-Save background Sync with Google Sheets every 5 minutes
  const autoSaveDataRef = useRef({ bahanBaku, productHpp, detailResep, hasUnsavedChanges, token, spreadsheetId });
  useEffect(() => {
    autoSaveDataRef.current = { bahanBaku, productHpp, detailResep, hasUnsavedChanges, token, spreadsheetId };
  }, [bahanBaku, productHpp, detailResep, hasUnsavedChanges, token, spreadsheetId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const {
        bahanBaku: currentBahan,
        productHpp: currentHpp,
        detailResep: currentResep,
        hasUnsavedChanges: currentUnsaved,
        token: currentToken,
        spreadsheetId: currentId,
      } = autoSaveDataRef.current;

      if (currentUnsaved && currentToken && currentId) {
        saveProjectDataToSheets(currentToken, currentId, {
          bahanBaku: currentBahan,
          productHpp: currentHpp,
          detailResep: currentResep,
        })
          .then(() => {
            setHasUnsavedChanges(false);
            setLastAutoSaved(new Date());
            showToast('Auto-save berhasil disinkronisasikan ke Google Sheets!', 'success');
          })
          .catch((err) => {
            console.error('Silent auto-save failed:', err);
          });
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Connect to Google Sheets via Google Sign-In + URL
  const initiateGoogleConnect = async () => {
    try {
      // Try to sign in with Google first to get API access
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        
        // Now ask for the spreadsheet URL
        const url = window.prompt('Masukkan URL Google Sheets Anda:\n\nContoh: https://docs.google.com/spreadsheets/d/...');
        if (url) {
          localStorage.setItem('spreadsheet_url', url);
          handleManualConnect(url);
        }
      }
    } catch (err: any) {
      // If Google Sign-In fails, still try with URL only (public sheets)
      const url = window.prompt('Login Google gagal.\n\nMasukkan URL Google Sheets Anda:\n(Catatan: Sheet harus diatur ke "Anyone with the link can view" untuk akses publik)\n\nAtau Anda bisa menggunakan mode offline (semua data disimpan di browser).');
      if (url) {
        localStorage.setItem('spreadsheet_url', url);
        handleManualConnect(url);
      }
    }
  };

  // Core Connector to Google Sheets
  const handleConnect = async (authToken: string, sId: string, showSuccessToast: boolean = true) => {
    setIsConnecting(true);
    try {
      const loaded = await loadProjectDataFromSheets(authToken, sId);
      
      setSheetTitles(loaded.sheetTitles);
      setBahanBaku(loaded.bahanBaku);
      setProductHpp(loaded.productHpp);
      setDetailResep(loaded.detailResep);
      setHasUnsavedChanges(false);

      // Extract sheet title
      const details = await loadProjectDataFromSheets(authToken, sId);
      // Wait, we can set the spreadsheet title from the fetched spreadsheet
      const spreadSheetMeta = await loadProjectDataFromSheets(authToken, sId); // Let's use the load output
      setSpreadsheetTitle('Data Resep & HPP Bisnis');

      // Check if template is needed
      const hasBahan = loaded.sheetTitles.includes('Bahan Baku');
      const hasHpp = loaded.sheetTitles.includes('HPP Produk');
      const hasResep = loaded.sheetTitles.includes('Resep Detail');

      if (!hasBahan || !hasHpp || !hasResep) {
        setShowTemplateModal(true);
      } else if (showSuccessToast) {
        showToast('Spreadsheet terhubung & disinkronisasi!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast('Gagal memuat spreadsheet: ' + (err.message || err), 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualConnect = (url: string) => {
    if (!url) {
      // Clear
      setSpreadsheetId(null);
      setSpreadsheetTitle('');
      setBahanBaku([]);
      setProductHpp([]);
      setDetailResep([]);
      return;
    }

    const parsedId = extractSpreadsheetId(url);
    if (!parsedId) {
      showToast('URL Google Sheets tidak valid. Silakan periksa kembali!', 'error');
      return;
    }

    setSpreadsheetUrl(url);
    setSpreadsheetId(parsedId);
    if (token) {
      handleConnect(token, parsedId, true);
    }
  };

  // Bootstrap template tabs in spreadsheet
  const handleInitializeTemplates = async () => {
    if (!token || !spreadsheetId) return;
    setIsConnecting(true);
    setShowTemplateModal(false);

    try {
      await createAndInitializeTemplates(token, spreadsheetId, sheetTitles);
      showToast('Berhasil menginisialisasi lembar kerja template!', 'success');
      // Reload values
      await handleConnect(token, spreadsheetId, false);
    } catch (err: any) {
      console.error(err);
      showToast('Gagal menginisialisasi template: ' + (err.message || err), 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  // Synchronize internal state back to Google Sheets (MUTATION / WRITE)
  const handleSaveToSheets = async () => {
    if (!token || !spreadsheetId) return;

    // MANDATORY USER CONFIRMATION
    const confirmed = window.confirm(
      'Apakah Anda ingin menyimpan seluruh perubahan kustom Bahan Baku, Resep, dan Margins Anda kembali ke file Google Sheets? Ini akan menimpa data baris yang ada.'
    );
    if (!confirmed) return;

    setIsSaving(true);
    try {
      await saveProjectDataToSheets(token, spreadsheetId, {
        bahanBaku,
        productHpp,
        detailResep,
      });
      setHasUnsavedChanges(false);
      showToast('Sinkronisasi sukses! Data disimpan ke Google Sheets.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Sinkronisasi gagal: ' + (err.message || err), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // State mutators for components
  const handleAddMaterial = (m: BahanBaku) => {
    // Check key duplicate
    const duplicate = bahanBaku.some((b) => b.nama.toLowerCase().trim() === m.nama.toLowerCase().trim());
    if (duplicate) {
      showToast(`Bahan baku "${m.nama}" sudah terdaftar!`, 'error');
      return;
    }
    setBahanBaku((prev) => [...prev, m]);
    setHasUnsavedChanges(true);
    showToast(`Bahan Baku "${m.nama}" ditambahkan!`, 'success');
  };

  const handleEditMaterial = (oldName: string, updated: BahanBaku) => {
    setBahanBaku((prev) =>
      prev.map((b) => (b.nama.toLowerCase().trim() === oldName.toLowerCase().trim() ? updated : b))
    );

    // Cascade name updates to DetailResep where applicable
    setDetailResep((prev) =>
      prev.map((r) =>
        r.namaBahan.toLowerCase().trim() === oldName.toLowerCase().trim()
          ? { ...r, namaBahan: updated.nama }
          : r
      )
    );

    setHasUnsavedChanges(true);
    showToast(`Bahan Baku "${updated.nama}" disesuaikan!`, 'success');
  };

  const handleDeleteMaterial = (name: string) => {
    setBahanBaku((prev) => prev.filter((b) => b.nama.toLowerCase().trim() !== name.toLowerCase().trim()));

    // Cascade remove from recipes too to keep consistency
    setDetailResep((prev) => prev.filter((r) => r.namaBahan.toLowerCase().trim() !== name.toLowerCase().trim()));

    setHasUnsavedChanges(true);
    showToast(`Bahan Baku "${name}" dihapus!`, 'info');
  };

  const handleAddProduct = (p: ProductHpp, ingredients: DetailResep[]) => {
    setProductHpp((prev) => [...prev, p]);
    if (ingredients.length > 0) {
      setDetailResep((prev) => [...prev, ...ingredients]);
    }
    setHasUnsavedChanges(true);
    showToast(`Resep Produk "${p.namaProduk}" diformulasikan!`, 'success');
  };

  const handleUpdateProductIngredients = (
    productName: string,
    updatedDetails: DetailResep[],
    porsiJual: number
  ) => {
    // Update portions size
    setProductHpp((prev) =>
      prev.map((p) =>
        p.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
          ? { ...p, porsiJual }
          : p
      )
    );

    // Evict and replace details for this product
    setDetailResep((prev) => [
      ...prev.filter((r) => r.namaProduk.toLowerCase().trim() !== productName.toLowerCase().trim()),
      ...updatedDetails,
    ]);

    setHasUnsavedChanges(true);
    showToast(`Bahan resep "${productName}" diperbarui!`, 'success');
  };

  const handleDeleteProduct = (productName: string) => {
    setProductHpp((prev) => prev.filter((p) => p.namaProduk.toLowerCase().trim() !== productName.toLowerCase().trim()));
    setDetailResep((prev) => prev.filter((r) => r.namaProduk.toLowerCase().trim() !== productName.toLowerCase().trim()));
    setHasUnsavedChanges(true);
    showToast(`Produk "${productName}" dihapus!`, 'info');
  };

  const handleUpdateProductPricing = (productName: string, overhead: number, hargaJual: number) => {
    setProductHpp((prev) =>
      prev.map((p) =>
        p.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
          ? { ...p, overhead, hargaJual }
          : p
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleCompletePOSSale = (productName: string, soldQty: number, totalRevenue: number) => {
    // 1. Locate the recipe ingredients for this product
    const ingredientsForProduct = detailResep.filter(
      (r) => r.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
    );

    // 2. Locate the yield of this product (how many portions the recipe creates)
    const productInfo = productHpp.find(
      (p) => p.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
    );
    const yieldPortions = productInfo?.porsiJual || 1;

    // 3. Deduct raw materials based on this formulation inside our main bahanBaku state!
    let criticalStockWarning = false;
    setBahanBaku((prevBahan) => {
      return prevBahan.map((b) => {
        const ingredientUsed = ingredientsForProduct.find(
          (ing) => ing.namaBahan.toLowerCase().trim() === b.nama.toLowerCase().trim()
        );

        if (ingredientUsed) {
          // consumedAmount = (takaran / yieldPortions) * soldQty
          const consumedAmount = (ingredientUsed.takaran / yieldPortions) * soldQty;
          const currentUnitStock = b.isiKemasan > 0 ? (b.isiKemasan - consumedAmount) : 0;
          
          if (currentUnitStock < 50) {
            criticalStockWarning = true;
          }
          return {
            ...b,
            isiKemasan: Math.max(0, Number(currentUnitStock.toFixed(2)))
          };
        }
        return b;
      });
    });

    // 4. Also deduct multi-warehouse stock levels inside localStorage 'stock_levels_data' for high visual accuracy in InventoryTab!
    const savedStocks = localStorage.getItem('stock_levels_data');
    if (savedStocks) {
      try {
        const parsed = JSON.parse(savedStocks);
        ingredientsForProduct.forEach((ing) => {
          const keys = Object.keys(parsed);
          const matchedKey = keys.find(k => k.toLowerCase().includes(ing.namaBahan.toLowerCase()) || ing.namaBahan.toLowerCase().includes(k.toLowerCase()));
          if (matchedKey) {
            const spec = parsed[matchedKey];
            if (spec.kitchen >= 1) {
              spec.kitchen = Math.max(0, Number((spec.kitchen - (ing.takaran * soldQty / 1000)).toFixed(2)));
            } else if (spec.mainWh >= 1) {
              spec.mainWh = Math.max(0, Number((spec.mainWh - (ing.takaran * soldQty / 1000)).toFixed(2)));
            }
          }
        });
        localStorage.setItem('stock_levels_data', JSON.stringify(parsed));
      } catch (err) {
        console.error('Failed to deduct warehouse level stocks:', err);
      }
    }

    setHasUnsavedChanges(true);
    showToast(`Transaksi POS Sukses! Menjual ${soldQty} pcs "${productName}". Bahan baku otomatis dipotong.`, 'success');
  };

  // Compute calculated results array of all products
  const calculatedProducts: CalculationResult[] = calculateAllProducts(bahanBaku, productHpp, detailResep);

  // Helpers for waste & rd totals
  const wasteTotalLoss = wasteLogs.reduce((acc, curr) => acc + curr.lossValue, 0);
  const rdTotalCost = rdExperiments.reduce((acc, curr) => acc + curr.components.reduce((sum, c) => sum + (c.takaran * c.unitPrice), 0) + curr.estOverhead, 0);

  // If not authenticated, show login screen
  if (!isOwnerAuthenticated) {
    return <OwnerLogin onLoginSuccess={handleOwnerLogin} />;
  }

  return (
    <div id="application-layout" className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans text-gray-800">
      
      {/* LEFT SIDEBAR AREA — Fixed, no slide animation */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col md:static md:h-screen shrink-0 ${
        isSidebarOpen ? 'block' : 'hidden md:flex'
      }`}>
        {/* LOGO BRAND BAR */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[11px] font-black text-white tracking-wider uppercase mb-0.5">Near Bakery & Co. ERP</h2>
              <p className="text-[9px] text-emerald-400 font-bold tracking-widest uppercase">Owner Console</p>
            </div>
          </div>
          {/* Close button for mobile sidebar */}
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg md:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* LOGGED IN USER PROFILE INDICATOR */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7.5 h-7.5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold font-mono text-emerald-400">
              OW
            </div>
            <div>
              <p className="font-bold text-white text-[11px] truncate max-w-[100px]">Owner Toko</p>
              <p className="text-[9px] text-gray-500 font-mono font-bold">owner@bakery.id</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {/* GOOGLE SHEETS CONNECT BUTTON */}
            <button
              onClick={initiateGoogleConnect}
              title="Hubungkan Google Sheets"
              className="p-1.5 hover:bg-slate-800 text-gray-500 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            </button>

            {/* LOGOUT BUTTON */}
            <button
              onClick={handleOwnerLogout}
              title="Logout / Keluar"
              className="p-1.5 hover:bg-slate-800 text-gray-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer flex items-center"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* SIDEBAR DYNAMIC NAVIGATION MENUS */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-5 select-none scrollbar-thin">
          
          {/* CATEGORY 1: MASTER DATA */}
          <div className="space-y-1">
            <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">Master Data</span>
            <SidebarBtn tab="materials" active={activeTab} icon={<Package className="w-4 h-4" />} label="Bahan Baku" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="recipes" active={activeTab} icon={<FolderTree className="w-4 h-4" />} label="Formulasi Resep" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
          </div>

          {/* CATEGORY 2: PRODUKSI & STOK */}
          <div className="space-y-1">
            <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">Produksi & Stok</span>
            <SidebarBtn tab="erp_bom" active={activeTab} icon={<Layers className="w-4 h-4" />} label="BOM & Yield" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="erp_mps" active={activeTab} icon={<CheckCircle2 className="w-4 h-4" />} label="Jadwal MPS" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="erp_stock" active={activeTab} icon={<Package className="w-4 h-4" />} label="Stok Gudang" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="erp_fefo" active={activeTab} icon={<ShieldAlert className="w-4 h-4" />} label="Batch & FEFO" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="erp_supplier" active={activeTab} icon={<Coins className="w-4 h-4" />} label="Supplier & PO" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
          </div>

          {/* CATEGORY 3: KASIR & MARKETING */}
          <div className="space-y-1">
            <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">Kasir & Marketing</span>
            <SidebarBtn tab="erp_pos" active={activeTab} icon={<ShoppingCart className="w-4 h-4" />} label="POS Kasir" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="erp_online" active={activeTab} icon={<Users className="w-4 h-4" />} label="Pesanan Online" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="erp_crm" active={activeTab} icon={<TrendingUp className="w-4 h-4" />} label="CRM Marketing" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
          </div>

          {/* CATEGORY 4: KEUANGAN */}
          <div className="space-y-1">
            <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">Keuangan</span>
            <SidebarBtn tab="dashboard" active={activeTab} icon={<LineChart className="w-4 h-4" />} label="Ringkasan" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="erp_bi" active={activeTab} icon={<TrendingUp className="w-4 h-4" />} label="Laporan P&L" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="erp_cash_flow" active={activeTab} icon={<Coins className="w-4 h-4" />} label="Arus Kas" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="erp_budget" active={activeTab} icon={<CheckCircle2 className="w-4 h-4" />} label="Anggaran Budget" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="erp_prediksi" active={activeTab} icon={<Cpu className="w-4 h-4" />} label="Prediksi & Inflasi" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="hpp" active={activeTab} icon={<CheckCircle2 className="w-4 h-4" />} label="Simulasi HPP" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="erp_waste" active={activeTab} icon={<X className="w-4 h-4" />} label="Manajemen Waste" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="erp_rd" active={activeTab} icon={<FlaskConical className="w-4 h-4" />} label="Sandbox R&D" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
          </div>

          {/* CATEGORY 5: OPERASIONAL */}
          <div className="space-y-1">
            <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">Operasional</span>
            <SidebarBtn tab="erp_log" active={activeTab} icon={<Truck className="w-4 h-4" />} label="Logistik" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="erp_compliance" active={activeTab} icon={<ShieldAlert className="w-4 h-4" />} label="Recall Pangan" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
            <SidebarBtn tab="erp_iot" active={activeTab} icon={<Cpu className="w-4 h-4" />} label="Smart IoT" onClick={setActiveTab} onClose={() => setIsSidebarOpen(false)} />
          </div>

        </nav>

        {/* GOOGLE SHEETS CONNECTION */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-2 shrink-0">
          {spreadsheetId ? (
            <>
              <a
                href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
                target="_blank"
                rel="noreferrer"
                className="text-center font-mono text-[10px] text-emerald-400 bg-slate-905 border border-slate-800 hover:border-emerald-600/50 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> BUKA SPREADSHEET ↗
              </a>
              <button
                onClick={() => {
                  localStorage.removeItem('spreadsheet_url');
                  setSpreadsheetId(null);
                  setSpreadsheetTitle('');
                  showToast('Koneksi Google Sheets diputuskan.', 'info');
                }}
                className="w-full py-1.5 text-center text-[10px] font-extrabold uppercase bg-slate-800 hover:bg-rose-700 hover:text-white text-slate-400 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Putus Koneksi
              </button>
            </>
          ) : (
            <button
              onClick={initiateGoogleConnect}
              className="w-full py-1.5 text-center text-[10px] font-extrabold uppercase bg-emerald-600/10 hover:bg-emerald-700 hover:text-white text-emerald-400 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-800/30"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> HUBUNGKAN GOOGLE SHEETS
            </button>
          )}
        </div>
      </aside>

      {/* RIGHT SIDEBAR ACTIVE WORKSPACE PANEL AREA */}
      <div id="erp-workspace-area" className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50 relative">
        
        {/* TOP MOBILE TOGGLE & SYSTEM CLOCK CONTROL BAR */}
        <header className="bg-white border-b border-gray-150 h-16 py-3 px-4 sm:px-6 flex justify-between items-center shrink-0 shadow-xs z-30">
          <div className="flex items-center gap-3.5">
            {/* Mobile Sidebar open button */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg md:hidden cursor-pointer flex items-center"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-extrabold text-emerald-750 bg-emerald-50 border border-emerald-100 uppercase tracking-widest px-2.5 py-1 rounded-full font-sans block mb-0.5 truncate max-w-[150px] sm:max-w-none">
                {spreadsheetTitle || 'Bakery ERP Active'}
              </span>
            </div>
          </div>

          {/* SINKRONISASI COOPERATIVE SYNC BUTTONS */}
          <div className="flex items-center gap-3">
            {spreadsheetId && (
              <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] text-emerald-700 font-extrabold bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-xl">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>Auto-save Aktif</span>
                {lastAutoSaved && (
                  <span className="text-gray-400 font-mono font-normal">
                    ({lastAutoSaved.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </span>
            )}

            {hasUnsavedChanges && (
              <span className="hidden leading-none lg:inline-flex items-center gap-1 text-[10px] text-amber-750 font-extrabold bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-xl animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" /> Perubahan Belum Disimpan
              </span>
            )}

            {spreadsheetId ? (
              <button
                onClick={handleSaveToSheets}
                disabled={isSaving}
                className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all uppercase flex items-center gap-1.5 shadow-sm active:scale-[0.98] cursor-pointer ${
                  hasUnsavedChanges 
                    ? 'bg-amber-500 hover:bg-amber-600 text-white animate-bounce-slow' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>SINKRONISASI KE GOOGLE SHEETS</span>
                  </>
                )}
              </button>
            ) : (
              <span className="text-[10px] font-bold text-gray-400 bg-gray-50 border border-dashed border-gray-200 p-2 rounded-xl">
                Offline Sandbox Demo
              </span>
            )}
          </div>
        </header>

        {/* WORKSPACE DETAILED WRAPPER VIEW SCROLLABLE */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
          
          {/* RENDER CURRENT TAB VIEW WITH FULL STRUCTURAL COMPATIBILITY */}
          <div className="pb-16">
            {activeTab === 'dashboard' && (
              <DashboardTab
                calculatedProducts={calculatedProducts}
                bahanBaku={bahanBaku}
                onWipeAllData={handleWipeAllData}
              />
            )}
            {activeTab === 'materials' && (
              <MaterialsTab
                bahanBaku={bahanBaku}
                onAddMaterial={handleAddMaterial}
                onEditMaterial={handleEditMaterial}
                onDeleteMaterial={handleDeleteMaterial}
              />
            )}
            {activeTab === 'recipes' && (
              <RecipesTab
                bahanBaku={bahanBaku}
                productHpp={productHpp}
                detailResep={detailResep}
                onAddProduct={handleAddProduct}
                onUpdateProductIngredients={handleUpdateProductIngredients}
                onDeleteProduct={handleDeleteProduct}
              />
            )}
            {activeTab === 'hpp' && (
              <HppTab
                calculatedProducts={calculatedProducts}
                onUpdateProductPricing={handleUpdateProductPricing}
                onDeleteProduct={handleDeleteProduct}
              />
            )}
            {activeTab === 'erp_bi' && (
              <EnterpriseDashboard calculatedProducts={calculatedProducts} bahanBaku={bahanBaku} />
            )}
            {activeTab === 'erp_cash_flow' && (
              <FinanceCashFlowTab 
                calculatedProducts={calculatedProducts} 
                wasteTotalLoss={wasteLogs.reduce((acc, curr) => acc + curr.lossValue, 0)} 
                rdTotalCost={rdExperiments.reduce((acc, curr) => acc + curr.components.reduce((sum, c) => sum + (c.takaran * c.unitPrice), 0) + curr.estOverhead, 0)} 
              />
            )}
            {activeTab === 'erp_waste' && (
              <WasteControlTab 
                bahanBaku={bahanBaku} 
                wasteLogs={wasteLogs} 
                onAddWasteLog={handleAddWasteLog} 
                onDeleteWasteLog={handleDeleteWasteLog} 
              />
            )}
            {activeTab === 'erp_rd' && (
              <RdSandboxTab 
                bahanBaku={bahanBaku} 
                rdExperiments={rdExperiments} 
                onAddRD={handleAddRD} 
                onDeleteRD={handleDeleteRD} 
              />
            )}
            {activeTab === 'erp_bom' && (
              <BomTab productHpp={productHpp} calculatedProducts={calculatedProducts} />
            )}
            {activeTab === 'erp_mps' && (
              <MpsTab productHpp={productHpp} />
            )}
            {activeTab === 'erp_stock' && (
              <StokGudangTab />
            )}
            {activeTab === 'erp_fefo' && (
              <FefoTab />
            )}
            {activeTab === 'erp_supplier' && (
              <SupplierTab />
            )}
            {activeTab === 'erp_log' && (
              <LogisticsTab />
            )}
            {activeTab === 'erp_pos' && (
              <PosKasirTab
                calculatedProducts={calculatedProducts}
                onCompletePOSSale={handleCompletePOSSale}
              />
            )}
            {activeTab === 'erp_online' && (
              <PesananOnlineTab
                calculatedProducts={calculatedProducts}
                onCompletePOSSale={handleCompletePOSSale}
              />
            )}
            {activeTab === 'erp_crm' && (
              <CrmMarketingTab calculatedProducts={calculatedProducts} />
            )}
            {activeTab === 'erp_prediksi' && (
              <PrediksiTab calculatedProducts={calculatedProducts} />
            )}
            {activeTab === 'erp_budget' && (
              <BudgetTab
                calculatedProducts={calculatedProducts}
                wasteTotalLoss={wasteTotalLoss}
                rdTotalCost={rdTotalCost}
              />
            )}
            {activeTab === 'erp_iot' && (
              <SmartKitchenTab />
            )}
            {activeTab === 'erp_compliance' && (
              <ComplianceSafetyTab />
            )}
          </div>
        </main>

        {/* BOTTOM METADATA DETAILS BAR */}
        <footer className="bg-white border-t border-gray-150 py-3 px-6 text-center text-xs text-gray-400 shrink-0 select-none z-10 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>Sistem ERP Bakery Terintegrasi Google Sheets © 2026.</span>
          <span className="font-mono text-[10px] bg-slate-100 text-gray-500 px-2.5 py-1 rounded">
            Hak Akses: Administrasi Owner Sektor 123
          </span>
        </footer>

      </div>

      {/* BOOTSTRAPPING TEMPLATE WORKBOOK TABS MODAL DIALOG */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 text-center space-y-4">
            <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            
            <h3 className="text-base font-bold text-gray-900 uppercase tracking-wide">Inisialisasi Lembar Kerja Resep</h3>
            
            <p className="text-xs text-gray-500 leading-relaxed">
              Google Sheet kustom yang terhubung belum memiliki worksheet tabel modal <span className="font-semibold font-mono text-gray-700">"Bahan Baku"</span>, <span className="font-semibold font-mono text-gray-700">"HPP Produk"</span>, dan <span className="font-semibold font-mono text-gray-700">"Resep Detail"</span>. 
              <br className="mb-2" />
              Apakah Anda ingin menginisialisasi lembar kerja template kustom baru dengan data sampel bahan otomatis untuk panduan kalkulasi?
            </p>

            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleInitializeTemplates}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
              >
                Atur Lembar Kerja & Sampel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM FEEDBACK ALERTS */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border text-xs max-w-sm flex items-center gap-2.5 transition-all transform duration-300 translate-y-0 ${
              t.type === 'success'
                ? 'bg-emerald-950 text-white border-emerald-800'
                : t.type === 'error'
                ? 'bg-red-950 text-white border-red-800'
                : 'bg-slate-900 text-white border-slate-755'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : t.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            ) : (
              <Layers className="w-4 h-4 text-emerald-300 shrink-0" />
            )}
            <span className="font-medium pr-1 text-left">{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="ml-auto p-0.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}

// ===== SIDEBAR BUTTON COMPONENT =====
function SidebarBtn({ tab, active, icon, label, onClick, onClose }: {
  tab: string; active: string; icon: React.ReactNode; label: string;
  onClick: (t: any) => void; onClose: () => void;
}) {
  const isActive = active === tab;
  return (
    <button
      onClick={() => { onClick(tab); onClose(); }}
      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
        isActive
          ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
      }`}
    >
      <span className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
