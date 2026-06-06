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
  saveRevenueToSheets,
  loadRevenueFromSheets,
} from './lib/sheets';
import { calculateAllProducts } from './lib/calculations';
import { BahanBaku, ProductHpp, DetailResep, CalculationResult, WriteOffLog, WasteLog, Cabang, SuratOrder, BranchStock, BranchTransaction } from './types';

import OwnerLogin from './components/OwnerLogin';
import DashboardTab from './components/DashboardTab';
import MaterialsTab from './components/MaterialsTab';
import RecipesTab from './components/RecipesTab';
import HargaHppTab from './components/HargaHppTab';

// Advanced ERP Modules
import EnterpriseDashboard from './components/EnterpriseDashboard';
import FinanceCashFlowTab from './components/FinanceCashFlowTab';
import WasteControlTab from './components/WasteControlTab';
import RdSandboxTab, { RDExperiment } from './components/RdSandboxTab';
import SmartKitchenTab from './components/SmartKitchenTab';
import ComplianceSafetyTab from './components/ComplianceSafetyTab';

// New focused modules (2026 restructuring)
import PosKasirTab from './components/PosKasirTab';
import PesananOnlineTab from './components/PesananOnlineTab';
import CrmMarketingTab from './components/CrmMarketingTab';
import BomTab from './components/BomTab';
import MpsTab from './components/MpsTab';
import FefoExpiryTab from './components/FefoExpiryTab';

import BudgetTab from './components/BudgetTab';
import ProductionPlannerTab from './components/ProductionPlannerTab';
import KitchenWorkOrderTab from './components/KitchenWorkOrderTab';
import BakerPercentageTab from './components/BakerPercentageTab';
import BepTab from './components/BepTab';
import DoughTemperatureTab from './components/DoughTemperatureTab';
import ImageGeneratorTab from './components/ImageGeneratorTab';
import ProfitDistribusiTab from './components/ProfitDistribusiTab';
import AlertSystemTab from './components/AlertSystemTab';
import BackupSystemTab from './components/BackupSystemTab';

// Production Center
import ProductionCenterTab from './components/ProductionCenterTab';

// Multi-Cabang System
import DataPusatTab from './components/DataPusatTab';
import BranchLogin from './components/BranchLogin';
import BranchDashboard from './components/BranchDashboard';

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
  LineChart,
  Users,
  ShoppingCart,
  Coins,
  FlaskConical,
  LogOut,
  Menu,
  ClipboardList,
  Percent,
  BarChart3,
  Thermometer,
  PanelRightClose,
  PanelRightOpen,
  Image,
  PieChart,
  Bell,
  Cloud,
  Building2,
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

  // ─── MULTI-CABANG STATE ───
  const [cabangList, setCabangList] = useState<Cabang[]>(() => {
    const saved = localStorage.getItem('cabang_list_data');
    return saved ? JSON.parse(saved) : [];
  });
  const [suratOrders, setSuratOrders] = useState<SuratOrder[]>(() => {
    const saved = localStorage.getItem('surat_orders_data');
    return saved ? JSON.parse(saved) : [];
  });
  const [branchAuth, setBranchAuth] = useState<{ id: string; nama: string } | null>(() => {
    const saved = localStorage.getItem('branch_authenticated');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => { localStorage.setItem('cabang_list_data', JSON.stringify(cabangList)); }, [cabangList]);
  // ─── BRANCH STOCK & TRANSACTION TRACKING ───
  const [cabangStok, setCabangStok] = useState<BranchStock[]>(() => {
    const saved = localStorage.getItem('cabang_stok_data');
    return saved ? JSON.parse(saved) : [];
  });
  const [branchTransactions, setBranchTransactions] = useState<BranchTransaction[]>(() => {
    const saved = localStorage.getItem('branch_transactions_data');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem('surat_orders_data', JSON.stringify(suratOrders)); }, [suratOrders]);
  useEffect(() => { localStorage.setItem('cabang_stok_data', JSON.stringify(cabangStok)); }, [cabangStok]);
  useEffect(() => { localStorage.setItem('branch_transactions_data', JSON.stringify(branchTransactions)); }, [branchTransactions]);

  // Helper: update branch stock teoritis
  const updateBranchStock = (cabangId: string, bahanNama: string, qtyChange: number, satuan: string) => {
    setCabangStok(prev => {
      const existing = prev.find(s => s.cabangId === cabangId && s.bahanNama === bahanNama);
      if (existing) {
        return prev.map(s =>
          s.cabangId === cabangId && s.bahanNama === bahanNama
            ? { ...s, stokTeoritis: Math.max(0, s.stokTeoritis + qtyChange), lastUpdated: new Date().toISOString() }
            : s
        );
      }
      return [...prev, {
        cabangId,
        bahanNama,
        stokTeoritis: Math.max(0, qtyChange),
        stokFisik: 0,
        satuan,
        lastUpdated: new Date().toISOString(),
      }];
    });
  };

  const addBranchTransaction = (tx: Omit<BranchTransaction, 'id'>) => {
    setBranchTransactions(prev => [{
      ...tx,
      id: `btx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    }, ...prev]);
  };

  useEffect(() => { localStorage.setItem('surat_orders_data', JSON.stringify(suratOrders)); }, [suratOrders]);

  // Tabs layout — satu modul satu fitur
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'data_pusat'
    | 'materials'
    | 'recipes'
    | 'hpp'
    | 'erp_bi'
    | 'erp_cash_flow'
    | 'erp_waste'
    | 'erp_rd'
    | 'erp_bom'
    | 'erp_mps'
    | 'erp_fefo_expiry'
    | 'erp_pos'
    | 'erp_online'
    | 'erp_crm'
    | 'erp_budget'
    | 'erp_iot'
    | 'erp_compliance'
    | 'erp_production_planner'
    | 'erp_work_order'
    | 'erp_baker_pct'
    | 'erp_bep'
    | 'erp_dough_temp'
    | 'erp_image_gen'
    | 'erp_profit_distribusi'
    | 'erp_alert_system'
    | 'erp_backup'
    | 'erp_production_center'
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

  const [writeOffLogs, setWriteOffLogs] = useState<WriteOffLog[]>(() => {
    const saved = localStorage.getItem('writeoff_logs_data');
    return saved ? JSON.parse(saved) : [];
  });

  // State sync effects
  useEffect(() => {
    localStorage.setItem('rd_experiments_data', JSON.stringify(rdExperiments));
  }, [rdExperiments]);

  useEffect(() => {
    localStorage.setItem('waste_logs_data', JSON.stringify(wasteLogs));
  }, [wasteLogs]);

  useEffect(() => {
    localStorage.setItem('writeoff_logs_data', JSON.stringify(writeOffLogs));
  }, [writeOffLogs]);

  // Handlers for state updates
  const handleAddRD = (exp: RDExperiment) => {
    setRdExperiments((prev) => [exp, ...prev]);
    showToast(`Proyek Litbang "${exp.projectName}" berhasil didaftarkan!`, 'success');
  };

  const handleDeleteRD = (id: string) => {
    setRdExperiments((prev) => prev.filter((e) => e.id !== id));
    showToast('Proyek Litbang dihapus.', 'info');
  };

  const handleAddWasteLog = (log: WasteLog, cabangId?: string) => {
    setWasteLogs((prev) => [log, ...prev]);
    // If from branch, deduct branch stock
    if (cabangId) {
      updateBranchStock(cabangId, log.bahanNama, -log.qtyWasted, log.satuan);
      addBranchTransaction({
        cabangId,
        tipe: 'waste',
        bahanNama: log.bahanNama,
        qty: log.qtyWasted,
        satuan: log.satuan,
        tanggal: new Date().toISOString(),
        refId: log.id,
      });
    }
    showToast(`Input Waste "${log.bahanNama}" berhasil dicatat!`, 'success');
  };

  const handleDeleteWasteLog = (id: string) => {
    setWasteLogs((prev) => prev.filter((w) => w.id !== id));
    showToast('Pencatatan Waste dihapus.', 'info');
  };

  const handleAddWriteOff = (log: WriteOffLog) => {
    setWriteOffLogs((prev) => [log, ...prev]);
    showToast(`Write-off "${log.namaProduk}" dicatat!`, 'success');
  };

  const handleDeleteWriteOff = (id: string) => {
    setWriteOffLogs((prev) => prev.filter((w) => w.id !== id));
    showToast('Write-off dihapus.', 'info');
  };

  const handleWipeAllData = () => {
    setBahanBaku([]);
    setProductHpp([]);
    setDetailResep([]);
    setRdExperiments([]);
    setWasteLogs([]);
    setWriteOffLogs([]);
    
    localStorage.removeItem('rd_experiments_data');
    localStorage.removeItem('waste_logs_data');
    localStorage.removeItem('writeoff_logs_data');
    localStorage.removeItem('stock_levels_data');
    localStorage.removeItem('toppings_data');
    localStorage.removeItem('pos_orders_data');
    localStorage.removeItem('stock_levels_data');
    
    setHasUnsavedChanges(true);
    showToast('Sistem Near Bakery & Co berhasil diformat steril! Semua data contoh telah dibersihkan.', 'success');
  };

  // Mobile sidebar state — closable on desktop too
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
        Promise.all([
          saveProjectDataToSheets(currentToken, currentId, {
            bahanBaku: currentBahan,
            productHpp: currentHpp,
            detailResep: currentResep,
          }),
          // Also sync revenue data if available
          (() => {
            try {
              const revenueData = localStorage.getItem('revenue_tracker_data');
              if (revenueData) {
                const parsed = JSON.parse(revenueData);
                return saveRevenueToSheets(currentToken, currentId, parsed.transactions || []);
              }
            } catch (e) { /* silent */ }
            return Promise.resolve();
          })(),
        ])
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

  // Connect to Google Sheets — improved with better UX & feedback
  const initiateGoogleConnect = async () => {
    const choice = window.confirm(
      'HUBUNGKAN GOOGLE SHEETS\n\n' +
      'Pilih metode:\n\n' +
      '• OK = Login dengan Google (akses penuh baca/tulis)\n' +
      '• BATAL = Input URL manual (sheet harus publik)'
    );

    if (choice) {
      try {
        showToast('⏳ Mencoba login ke Google...', 'info');
        const result = await googleSignIn();
        if (result && result.accessToken) {
          setToken(result.accessToken);
          showToast('✅ Login Google berhasil!', 'success');

          const url = window.prompt(
            'Masukkan URL Google Sheets Anda:\n\nContoh: https://docs.google.com/spreadsheets/d/1ABCxyz.../edit',
            localStorage.getItem('spreadsheet_url') || ''
          );
          if (url) {
            localStorage.setItem('spreadsheet_url', url);
            handleManualConnect(url);
          }
        } else {
          showToast('Login gagal — coba input manual.', 'error');
          tryManualConnect();
        }
      } catch (err: any) {
        console.error(err);
        showToast('Login gagal: ' + (err.message || 'Gagal terhubung ke Google'), 'error');
        tryManualConnect();
      }
    } else {
      tryManualConnect();
    }
  };

  // Manual URL input fallback with clear feedback
  const tryManualConnect = () => {
    const url = window.prompt(
      'Masukkan URL Google Sheets Anda:\n\n' +
      'Pastikan sheet diatur ke \"Anyone with the link can view\"\n' +
      'untuk akses baca.\n\n' +
      'Atau kosongkan untuk tetap mode offline (data lokal).',
      localStorage.getItem('spreadsheet_url') || ''
    );
    if (url) {
      localStorage.setItem('spreadsheet_url', url);
      showToast('⏳ Mencoba koneksi manual...', 'info');
      handleManualConnect(url);
    } else {
      showToast('✅ Mode offline — semua data aman di localStorage.', 'info');
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

  const handleCompletePOSSale = (productName: string, soldQty: number, totalRevenue: number, source?: string, cabangId?: string) => {
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

    // 5. Record revenue to revenue tracker (for profit distribution)
    try {
      const saved = localStorage.getItem('revenue_tracker_data');
      const tracker = saved ? JSON.parse(saved) : { transactions: [], dailyTotals: {} };
      const today = new Date().toISOString().substring(0, 10);
      const txEntry = {
        id: `rev-${Date.now()}`,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        product: productName,
        qty: soldQty,
        amount: totalRevenue,
        source: source || 'Walk-In POS',
        date: today,
      };
      tracker.transactions.push(txEntry);
      // Keep last 500 transactions max
      if (tracker.transactions.length > 500) {
        tracker.transactions = tracker.transactions.slice(-500);
      }
      // Update daily totals
      if (!tracker.dailyTotals[today]) {
        tracker.dailyTotals[today] = { total: 0, sources: {} };
      }
      tracker.dailyTotals[today].total += totalRevenue;
      const src = txEntry.source;
      if (!tracker.dailyTotals[today].sources[src]) {
        tracker.dailyTotals[today].sources[src] = 0;
      }
      tracker.dailyTotals[today].sources[src] += totalRevenue;
      localStorage.setItem('revenue_tracker_data', JSON.stringify(tracker));
    } catch (err) {
      console.error('Failed to record revenue:', err);
    }

    // 6. If from a branch, deduct branch stock
    if (cabangId && source?.startsWith('POS Cabang')) {
      const ingredientsForProduct = detailResep.filter(
        (r) => r.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
      );
      const productInfo = productHpp.find(
        (p) => p.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
      );
      const yieldPortions = productInfo?.porsiJual || 1;

      ingredientsForProduct.forEach(ing => {
        const consumedAmount = (ing.takaran / yieldPortions) * soldQty;
        const bahan = bahanBaku.find(b => b.nama.toLowerCase().trim() === ing.namaBahan.toLowerCase().trim());
        updateBranchStock(cabangId, ing.namaBahan, -consumedAmount, bahan?.satuan || 'gr');
        addBranchTransaction({
          cabangId,
          tipe: 'pos_jual',
          bahanNama: ing.namaBahan,
          qty: consumedAmount,
          satuan: bahan?.satuan || 'gr',
          tanggal: new Date().toISOString(),
          refId: `pos-${Date.now()}`,
        });
      });
    }

    setHasUnsavedChanges(true);
    const revStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalRevenue);
    showToast(`Transaksi Sukses! Menjual ${soldQty} pcs "${productName}" (${revStr}). Bahan baku otomatis dipotong.`, 'success');
  };

  // ─── MULTI-CABANG HANDLERS ───
  const handleAddCabang = (c: Cabang) => {
    const dup = cabangList.some(cb => cb.username === c.username);
    if (dup) { showToast(`Username "${c.username}" sudah dipakai!`, 'error'); return; }
    setCabangList(prev => [...prev, c]);
    showToast(`Cabang "${c.nama}" berhasil didaftarkan!`, 'success');
  };

  const handleEditCabang = (id: string, c: Cabang) => {
    setCabangList(prev => prev.map(cb => cb.id === id ? c : cb));
    showToast(`Cabang "${c.nama}" diupdate!`, 'success');
  };

  const handleDeleteCabang = (id: string) => {
    setCabangList(prev => prev.filter(c => c.id !== id));
    showToast('Cabang dihapus.', 'info');
  };

  const handleAddSuratOrder = (so: SuratOrder) => {
    setSuratOrders(prev => [so, ...prev]);

    if (so.status === 'dikirim') {
      // Owner langsung kirim barang → kurangi stok pusat (bahanBaku)
      setBahanBaku(prev => prev.map(b => {
        const item = so.items.find(i => i.bahanNama === b.nama);
        if (item) {
          return { ...b, isiKemasan: Math.max(0, b.isiKemasan - item.qty) };
        }
        return b;
      }));
    }

    // Record branch transaction for sent goods
    so.items.forEach(item => {
      const bahan = bahanBaku.find(b => b.nama === item.bahanNama);
      addBranchTransaction({
        cabangId: so.cabangId,
        tipe: so.status === 'dikirim' ? 'so_kirim' : 'so_minta',
        bahanNama: item.bahanNama,
        qty: item.qty,
        satuan: bahan?.satuan || 'pcs',
        tanggal: new Date().toISOString(),
        refId: so.id,
      });
    });
    const msg = so.status === 'minta' ? `Permintaan dari "${so.cabangNama}" masuk!` : `Surat Order ke "${so.cabangNama}" dikirim!`;
    showToast(msg, 'success');
  };

  const handleUpdateSuratOrder = (id: string, so: SuratOrder) => {
    const prevStatus = suratOrders.find(s => s.id === id)?.status;
    setSuratOrders(prev => prev.map(s => s.id === id ? so : s));

    if (so.status === 'dikirim' && prevStatus === 'minta') {
      // Owner setujui permintaan cabang → kurangi stok pusat
      setBahanBaku(prev => prev.map(b => {
        const item = so.items.find(i => i.bahanNama === b.nama);
        if (item) {
          return { ...b, isiKemasan: Math.max(0, b.isiKemasan - item.qty) };
        }
        return b;
      }));
      showToast(`Permintaan "${so.cabangNama}" disetujui! Stok pusat berkurang.`, 'success');
    }

    if (so.status === 'diterima') {
      // Cabang terima barang → tambah stok cabang
      const original = suratOrders.find(s => s.id === id);
      const items = original?.items || so.items;
      items.forEach(item => {
        const bahan = bahanBaku.find(b => b.nama === item.bahanNama);
        updateBranchStock(so.cabangId, item.bahanNama, item.qty, bahan?.satuan || 'pcs');
        addBranchTransaction({
          cabangId: so.cabangId,
          tipe: 'so_terima',
          bahanNama: item.bahanNama,
          qty: item.qty,
          satuan: bahan?.satuan || 'pcs',
          tanggal: new Date().toISOString(),
          refId: so.id,
        });
      });
      showToast(`Surat Order ke "${so.cabangNama}" diterima! Stok cabang bertambah.`, 'success');
    }
  };

  // ─── SYNC STOCK OPNAME FROM BRANCH ───
  const handleSyncStokOpname = (cabangId: string, bahanNama: string, stokFisik: number, satuan: string) => {
    setCabangStok(prev => {
      const existing = prev.find(s => s.cabangId === cabangId && s.bahanNama === bahanNama);
      if (existing) {
        return prev.map(s =>
          s.cabangId === cabangId && s.bahanNama === bahanNama
            ? { ...s, stokFisik, lastUpdated: new Date().toISOString() }
            : s
        );
      }
      return [...prev, {
        cabangId,
        bahanNama,
        stokTeoritis: 0,
        stokFisik,
        satuan,
        lastUpdated: new Date().toISOString(),
      }];
    });
  };

  // ─── BRANCH AUTH HANDLERS ───
  const handleBranchLogin = (cabang: Cabang) => {
    setBranchAuth({ id: cabang.id, nama: cabang.nama });
  };

  const handleBranchLogout = () => {
    localStorage.removeItem('branch_authenticated');
    localStorage.removeItem('branch_authenticated_at');
    setBranchAuth(null);
  };

  // Compute calculated results array of all products
  const calculatedProducts: CalculationResult[] = calculateAllProducts(bahanBaku, productHpp, detailResep);

  // Helpers for waste & rd totals
  const wasteTotalLoss = wasteLogs.reduce((acc, curr) => acc + curr.lossValue, 0);
  const rdTotalCost = rdExperiments.reduce((acc, curr) => acc + curr.components.reduce((sum, c) => sum + (c.takaran * c.unitPrice), 0) + curr.estOverhead, 0);

  // Show welcome notifications on first login
  useEffect(() => {
    if (isOwnerAuthenticated) {
      const today = new Date().toISOString().substring(0, 10);
      const lastVisit = localStorage.getItem('last_visit_date');

      if (lastVisit !== today) {
        localStorage.setItem('last_visit_date', today);

        // Show welcome notification after a short delay
        setTimeout(() => {
          showToast('👋 Selamat datang di Near Bakery & Co. ERP! Kelola bahan baku, resep, dan produksi roti Anda.', 'info');
        }, 500);

        setTimeout(() => {
          const lowStock = bahanBaku.filter(b => b.isiKemasan < 100).length;
          if (lowStock > 0) {
            showToast(`⚠️ ${lowStock} bahan baku dengan stok rendah — cek tab Bahan Baku.`, 'info');
          }
        }, 2000);

        setTimeout(() => {
          const totalWaste = wasteLogs.reduce((s, w) => s + w.lossValue, 0);
          if (totalWaste > 0) {
            showToast(`📊 Total waste tercatat: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalWaste)} — cek Manajemen Waste.`, 'info');
          }
        }, 3500);

        setTimeout(() => {
          const todayName = new Date().toLocaleDateString('id-ID', { weekday: 'long' });
          showToast(`📅 Hari ${todayName} — Jangan lupa cek Jadwal MPS & Work Order untuk produksi hari ini!`, 'info');
        }, 5000);
      }
    }
  }, [isOwnerAuthenticated]);

  // ─── AUTH GATE ───
  const [showBranchLogin, setShowBranchLogin] = useState(false);
  const [showOwnerLogin, setShowOwnerLogin] = useState(false);

  if (!isOwnerAuthenticated && !branchAuth) {
    // Show login selection screen
    if (!showBranchLogin && !showOwnerLogin && cabangList.length > 0) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl p-8 space-y-6">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mx-auto shadow-xl">
                <Layers className="w-8 h-8 stroke-2" />
              </div>
              <h1 className="text-xl font-black text-white tracking-tight uppercase">Near Bakery & Co. ERP</h1>
              <p className="text-[11px] text-emerald-400 font-bold tracking-widest">PILIH METODE LOGIN</p>
            </div>
            <button onClick={() => setShowBranchLogin(true)}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all shadow-md cursor-pointer">
              🏪 Login sebagai Staff Cabang
            </button>
            <button onClick={() => setShowOwnerLogin(true)}
              className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all cursor-pointer">
              🔐 Login sebagai Owner
            </button>
            <p className="text-[10px] text-gray-600 text-center mt-4">
              Owner login menggunakan password. Staff cabang menggunakan username & password dari Data Pusat.
            </p>
          </div>
        </div>
      );
    }

    if (showOwnerLogin) {
      return <OwnerLogin onLoginSuccess={handleOwnerLogin} />;
    }
    
    if (showBranchLogin) {
      return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
          <BranchLogin cabangList={cabangList} onLoginSuccess={handleBranchLogin} onBackToOwner={() => setShowBranchLogin(false)} />
        </div>
      );
    }
    
    return <OwnerLogin onLoginSuccess={handleOwnerLogin} />;
  }

  // If branch authenticated, show BranchDashboard
  if (branchAuth && !isOwnerAuthenticated) {
    const currentCabang = cabangList.find(c => c.id === branchAuth.id);
    if (currentCabang) {
      return (
        <BranchDashboard
          cabang={currentCabang}
          bahanBaku={bahanBaku}
          suratOrders={suratOrders}
          productHpp={productHpp}
          detailResep={detailResep}
          calculatedProducts={calculatedProducts}
          wasteLogs={wasteLogs}
          cabangStok={cabangStok.filter(s => s.cabangId === currentCabang.id)}
          branchTransactions={branchTransactions.filter(t => t.cabangId === currentCabang.id)}
          onAddWasteLog={handleAddWasteLog}
          onDeleteWasteLog={handleDeleteWasteLog}
          onAddSuratOrder={handleAddSuratOrder}
          onUpdateSuratOrder={handleUpdateSuratOrder}
          onCompletePOSSale={handleCompletePOSSale}
          onSyncStokOpname={handleSyncStokOpname}
          onLogout={handleBranchLogout}
        />
      );
    }
  }

  return (
    <div id="application-layout" className="h-screen bg-slate-100 font-sans text-gray-800 flex overflow-hidden">
      
      {/* MOBILE OVERLAY BACKDROP — when sidebar is open on mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* FLOATING SIDEBAR TOGGLE — when sidebar is closed, shown on all sizes */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 w-10 h-10 bg-slate-900 hover:bg-emerald-700 text-white rounded-xl shadow-lg border border-slate-700 flex items-center justify-center transition-all cursor-pointer hover:scale-105"
          title="Buka Sidebar"
        >
          <PanelRightOpen className="w-5 h-5" />
        </button>
      )}

      {/* ─── MOBILE SIDEBAR (overlay, translate-based) ─── */}
      <aside className={`md:hidden fixed top-0 left-0 z-40 h-full w-72 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col shadow-2xl transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* SIDEBAR CONTENT — will be rendered inside here */}
        <SidebarContent isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} activeTab={activeTab} setActiveTab={setActiveTab} spreadsheetId={spreadsheetId} setSpreadsheetId={setSpreadsheetId} setSpreadsheetTitle={setSpreadsheetTitle} showToast={showToast} initiateGoogleConnect={initiateGoogleConnect} handleOwnerLogout={handleOwnerLogout} />
      </aside>

      {/* ─── DESKTOP SIDEBAR (push layout, width-based) ─── */}
      <aside className="hidden md:flex flex-shrink-0 bg-slate-900 text-slate-300 border-r border-slate-800 flex-col shadow-2xl transition-all duration-300 ease-in-out overflow-hidden h-full"
        style={{ width: isSidebarOpen ? 288 : 0 }}>
        <div style={{ width: 288 }} className="flex flex-col h-full">
          <SidebarContent isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} activeTab={activeTab} setActiveTab={setActiveTab} spreadsheetId={spreadsheetId} setSpreadsheetId={setSpreadsheetId} setSpreadsheetTitle={setSpreadsheetTitle} showToast={showToast} initiateGoogleConnect={initiateGoogleConnect} handleOwnerLogout={handleOwnerLogout} />
        </div>
      </aside>

      {/* MAIN WORKSPACE — flex-1, adjusts width as sidebar opens/closes */}
      <div id="erp-workspace-area" className="flex-1 min-w-0 flex flex-col bg-slate-50">
        
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
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 p-2 rounded-xl flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Mode Offline — Data Local Storage</span>
              </span>
            )}
          </div>
        </header>

        {/* WORKSPACE DETAILED WRAPPER VIEW SCROLLABLE */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
          
          {/* RENDER CURRENT TAB VIEW WITH FULL STRUCTURAL COMPATIBILITY */}
          <div className="pb-16">
            {activeTab === 'data_pusat' && (
              <DataPusatTab
                bahanBaku={bahanBaku}
                onAddMaterial={handleAddMaterial}
                onEditMaterial={handleEditMaterial}
                onDeleteMaterial={handleDeleteMaterial}
                cabangList={cabangList}
                onAddCabang={handleAddCabang}
                onEditCabang={handleEditCabang}
                onDeleteCabang={handleDeleteCabang}
                suratOrders={suratOrders}
                onAddSuratOrder={handleAddSuratOrder}
                onUpdateSuratOrder={handleUpdateSuratOrder}
                cabangStok={cabangStok}
                branchTransactions={branchTransactions}
                wasteLogs={wasteLogs}
              />
            )}
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
                cabangList={cabangList}
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
              <HargaHppTab
                bahanBaku={bahanBaku}
                calculatedProducts={calculatedProducts}
                detailResep={detailResep}
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
                calculatedProducts={calculatedProducts}
                writeOffLogs={writeOffLogs}
                onAddWriteOff={handleAddWriteOff}
                onDeleteWriteOff={handleDeleteWriteOff}
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
            {activeTab === 'erp_production_center' && (
              <ProductionCenterTab
                productHpp={productHpp}
                detailResep={detailResep}
                calculatedProducts={calculatedProducts}
                bahanBaku={bahanBaku}
              />
            )}
            {activeTab === 'erp_mps' && (
              <MpsTab productHpp={productHpp} detailResep={detailResep} bahanBaku={bahanBaku} />
            )}
            {activeTab === 'erp_fefo_expiry' && (
              <FefoExpiryTab bahanBaku={bahanBaku} productHpp={productHpp} onAddWasteLog={handleAddWasteLog} />
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
              <ComplianceSafetyTab productHpp={productHpp} />
            )}
            {activeTab === 'erp_production_planner' && (
              <ProductionPlannerTab
                productHpp={productHpp}
                detailResep={detailResep}
                calculatedProducts={calculatedProducts}
                bahanBaku={bahanBaku}
              />
            )}
            {activeTab === 'erp_work_order' && (
              <KitchenWorkOrderTab
                productHpp={productHpp}
                detailResep={detailResep}
                calculatedProducts={calculatedProducts}
                bahanBaku={bahanBaku}
              />
            )}
            {activeTab === 'erp_baker_pct' && (
              <BakerPercentageTab
                bahanBaku={bahanBaku}
                detailResep={detailResep}
              />
            )}
            {activeTab === 'erp_bep' && (
              <BepTab calculatedProducts={calculatedProducts} />
            )}
            {activeTab === 'erp_dough_temp' && (
              <DoughTemperatureTab />
            )}
            {activeTab === 'erp_image_gen' && (
              <ImageGeneratorTab />
            )}
            {activeTab === 'erp_profit_distribusi' && (
              <ProfitDistribusiTab />
            )}
            {activeTab === 'erp_alert_system' && (
              <AlertSystemTab
                calculatedProducts={calculatedProducts}
                bahanBaku={bahanBaku}
                hasUnsavedChanges={hasUnsavedChanges}
                spreadsheetId={spreadsheetId}
              />
            )}
            {activeTab === 'erp_backup' && (
              <BackupSystemTab
                bahanBaku={bahanBaku}
                productHpp={productHpp}
                detailResep={detailResep}
                calculatedProducts={calculatedProducts}
              />
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

// ===== SIDEBAR CONTENT COMPONENT =====
function SidebarContent({ isSidebarOpen, setIsSidebarOpen, activeTab, setActiveTab, spreadsheetId, setSpreadsheetId, setSpreadsheetTitle, showToast, initiateGoogleConnect, handleOwnerLogout }: {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (v: boolean) => void;
  activeTab: string;
  setActiveTab: (t: any) => void;
  spreadsheetId: string | null;
  setSpreadsheetId: (v: string | null) => void;
  setSpreadsheetTitle: (v: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  initiateGoogleConnect: () => void;
  handleOwnerLogout: () => void;
}) {
  const sidebarBtn = (tabKey: string, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => { setActiveTab(tabKey); setIsSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
        activeTab === tabKey
          ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
      }`}
    >
      <span className={`w-4 h-4 shrink-0 ${activeTab === tabKey ? 'text-white' : 'text-emerald-400'}`}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <>
      {/* LOGO BRAND BAR */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black shadow-md">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-[11px] font-black text-white tracking-wider uppercase mb-0.5">Near Bakery & Co. ERP</h2>
            <p className="text-[9px] text-emerald-400 font-bold tracking-widest uppercase">Owner Console</p>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(false)}
          className="p-1 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer" title="Tutup Sidebar">
          <PanelRightClose className="w-5 h-5" />
        </button>
      </div>

      {/* PROFILE */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800 text-xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7.5 h-7.5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold font-mono text-emerald-400">OW</div>
          <div>
            <p className="font-bold text-white text-[11px] truncate max-w-[100px]">Owner Toko</p>
            <p className="text-[9px] text-gray-500 font-mono font-bold">owner@bakery.id</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={initiateGoogleConnect} title="Hubungkan Google Sheets"
            className="p-1.5 hover:bg-slate-800 text-gray-500 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          </button>
          <button onClick={handleOwnerLogout} title="Logout"
            className="p-1.5 hover:bg-slate-800 text-gray-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer flex items-center">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-5 select-none scrollbar-thin">
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">① Master Data</span>
          {sidebarBtn('data_pusat', <Building2 className="w-4 h-4" />, '🏛️ Data Pusat')}
          {sidebarBtn('materials', <Package className="w-4 h-4" />, '📦 Bahan Baku')}
          {sidebarBtn('recipes', <FolderTree className="w-4 h-4" />, '📝 Formulasi Resep')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">② Inventory & Produksi</span>
          {sidebarBtn('erp_fefo_expiry', <ShieldAlert className="w-4 h-4" />, '📋 FEFO & Expiry')}
          {sidebarBtn('erp_bom', <Layers className="w-4 h-4" />, '🔧 BOM & Yield')}
          {sidebarBtn('erp_production_center', <ClipboardList className="w-4 h-4" />, '🏭 Prod. Center')}
          {sidebarBtn('erp_baker_pct', <Percent className="w-4 h-4" />, "🍞 Baker's %")}
          {sidebarBtn('erp_dough_temp', <Thermometer className="w-4 h-4" />, '🌡️ Suhu Adonan')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">③ Kasir & Penjualan</span>
          {sidebarBtn('erp_pos', <ShoppingCart className="w-4 h-4" />, '🛒 POS Kasir')}
          {sidebarBtn('erp_online', <Users className="w-4 h-4" />, '📱 Pesanan Online')}
          {sidebarBtn('erp_crm', <TrendingUp className="w-4 h-4" />, '📈 CRM Marketing')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">④ Keuangan</span>
          {sidebarBtn('dashboard', <LineChart className="w-4 h-4" />, '👋 Ringkasan')}
          {sidebarBtn('erp_bi', <TrendingUp className="w-4 h-4" />, '📊 Laporan P&L')}
          {sidebarBtn('erp_cash_flow', <Coins className="w-4 h-4" />, '💵 Arus Kas')}
          {sidebarBtn('erp_profit_distribusi', <PieChart className="w-4 h-4" />, '🎯 Alokasi Laba')}
          {sidebarBtn('erp_bep', <BarChart3 className="w-4 h-4" />, '🧮 BEP & Balance')}
          {sidebarBtn('erp_budget', <CheckCircle2 className="w-4 h-4" />, '💰 Anggaran Budget')}
          {sidebarBtn('hpp', <TrendingUp className="w-4 h-4" />, '📈 Harga & HPP')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">⑤ Operasional & Waste</span>
          {sidebarBtn('erp_waste', <X className="w-4 h-4" />, '🗑️ Manajemen Waste')}
          {sidebarBtn('erp_rd', <FlaskConical className="w-4 h-4" />, '🔬 Sandbox R&D')}
          {sidebarBtn('erp_compliance', <ShieldAlert className="w-4 h-4" />, '🧊 Recall Pangan')}
          {sidebarBtn('erp_iot', <Cpu className="w-4 h-4" />, '🤖 Smart IoT')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">⑥ Tools</span>
          {sidebarBtn('erp_image_gen', <Image className="w-4 h-4" />, '🎨 Image Gen')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">⑦ Monitoring</span>
          {sidebarBtn('erp_alert_system', <Bell className="w-4 h-4" />, '🔔 Monitoring & Alert')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">⑧ Backup</span>
          {sidebarBtn('erp_backup', <Cloud className="w-4 h-4" />, '💾 Backup & Restore')}
        </div>
      </nav>

      {/* GSHEETS CONNECTION */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-2 shrink-0">
        {spreadsheetId ? (
          <>
            <a href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`} target="_blank" rel="noreferrer"
              className="text-center font-mono text-[10px] text-emerald-400 bg-slate-905 border border-slate-800 hover:border-emerald-600/50 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <FileSpreadsheet className="w-3.5 h-3.5" /> BUKA SPREADSHEET ↗
            </a>
            <button onClick={() => {
              localStorage.removeItem('spreadsheet_url');
              setSpreadsheetId(null);
              setSpreadsheetTitle('');
              showToast('Koneksi Google Sheets diputuskan.', 'info');
            }}
              className="w-full py-1.5 text-center text-[10px] font-extrabold uppercase bg-slate-800 hover:bg-rose-700 hover:text-white text-slate-400 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> Putus Koneksi
            </button>
          </>
        ) : (
          <button onClick={initiateGoogleConnect}
            className="w-full py-1.5 text-center text-[10px] font-extrabold uppercase bg-emerald-600/10 hover:bg-emerald-700 hover:text-white text-emerald-400 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-800/30">
            <FileSpreadsheet className="w-3.5 h-3.5" /> HUBUNGKAN GOOGLE SHEETS
          </button>
        )}
      </div>
    </>
  );
}

