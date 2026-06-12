/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { googleSignIn } from './lib/firebase';import { extractSpreadsheetId,
  loadProjectDataFromSheets,
  createAndInitializeTemplates,
  saveProjectDataToSheets,
  saveRevenueToSheets,
  loadRevenueFromSheets,
  enqueueFailedSync,
} from './lib/sheets';
import { calculateAllProducts } from './lib/calculations';
import { safeGetLocalStorage } from './lib/safe-json';
import { listenNewOrders, listenNotifications, syncProductsToFirestore, listenNewChats, listenOrderStatusChanges, getFirestoreCategories } from './lib/firestore-bridge';
import { BahanBaku, ProductHpp, DetailResep, CalculationResult, WriteOffLog, WasteLog, Cabang, SuratOrder, BranchStock, BranchTransaction, ProductTopping, IoTDevice } from './types';

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
import FefoExpiryTab from './components/FefoExpiryTab';

import AnggaranAlokasiTab from './components/AnggaranAlokasiTab';
import ProductionPlannerTab from './components/ProductionPlannerTab';
import KitchenWorkOrderTab from './components/KitchenWorkOrderTab';
import BakerPercentageTab from './components/BakerPercentageTab';
import BepTab from './components/BepTab';
import DoughTemperatureTab from './components/DoughTemperatureTab';
import BackupSystemTab from './components/BackupSystemTab';
import PembukuanTab from './components/PembukuanTab';
import WebStoreManagerTab from './components/WebStoreManagerTab';
import ToppingsTab from './components/ToppingsTab';

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
  Globe,
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
  PieChart,
  Cloud,
  Building2,
} from 'lucide-react';

export default function App() {
  // Owner authentication gate
  // ─── OWNER AUTH — VERIFIKASI GANDA (localStorage + sessionStorage) ───
  // Session storage di-clear saat browser ditutup, mencegah akses ilegal dari sesi lama
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState(() => {
    const localAuth = localStorage.getItem('owner_authenticated') === 'true';
    const sessionAuth = sessionStorage.getItem('owner_authenticated') === 'true';
    const sessionToken = localStorage.getItem('owner_session_token');
    
    // Verifikasi: localStorage + sessionStorage + token harus valid
    if (localAuth && sessionAuth && sessionToken) {
      return true;
    }
    
    // Jika hanya localStorage yang ada (session hilang karena browser direstart)
    if (localAuth && !sessionAuth) {
      // Hapus auth — minta login ulang
      localStorage.removeItem('owner_authenticated');
      localStorage.removeItem('owner_authenticated_at');
      localStorage.removeItem('owner_session_token');
    }
    
    return false;
  });

  const handleOwnerLogin = () => {
    setIsOwnerAuthenticated(true);
  };

  const handleOwnerLogout = () => {
    localStorage.removeItem('owner_authenticated');
    localStorage.removeItem('owner_authenticated_at');
    localStorage.removeItem('owner_session_token');
    sessionStorage.removeItem('owner_authenticated');
    sessionStorage.removeItem('owner_authenticated_at');
    sessionStorage.removeItem('owner_session_id');
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

  // Core records state — persisted to localStorage for offline mode
  // Menggunakan safeGetLocalStorage untuk mencegah crash jika localStorage corrupted
  const [bahanBaku, setBahanBaku] = useState<BahanBaku[]>(() =>
    safeGetLocalStorage<BahanBaku[]>('bahan_baku_data', [])
  );
  const [productHpp, setProductHpp] = useState<ProductHpp[]>(() =>
    safeGetLocalStorage<ProductHpp[]>('product_hpp_data', [])
  );
  const [detailResep, setDetailResep] = useState<DetailResep[]>(() =>
    safeGetLocalStorage<DetailResep[]>('detail_resep_data', [])
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);

  // ─── TOPPINGS GLOBAL STATE ───
  const [toppings, setToppings] = useState<ProductTopping[]>(() =>
    safeGetLocalStorage<ProductTopping[]>('toppings_data', [])
  );

  // ─── DEBOUNCED LOCALSTORAGE SAVE (500ms) — mencegah jank dari JSON.stringify sinkron ───
  // Semua state array besar (>100 item) di-debounce agar tidak lag saat mengetik di form
  // Menggunakan setTimeout + clearTimeout pattern untuk batch perubahan cepat jadi 1 write
  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('toppings_data', JSON.stringify(toppings)), 500);
    return () => clearTimeout(timer);
  }, [toppings]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('bahan_baku_data', JSON.stringify(bahanBaku)), 500);
    return () => clearTimeout(timer);
  }, [bahanBaku]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('product_hpp_data', JSON.stringify(productHpp)), 500);
    return () => clearTimeout(timer);
  }, [productHpp]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('detail_resep_data', JSON.stringify(detailResep)), 500);
    return () => clearTimeout(timer);
  }, [detailResep]);

  const handleAddTopping = (t: ProductTopping) => {
    setToppings(prev => [...prev, t]);
  };

  const handleDeleteTopping = (id: string) => {
    setToppings(prev => prev.filter(t => t.id !== id));
  };

  // ─── MULTI-CABANG STATE ───
  const [cabangList, setCabangList] = useState<Cabang[]>(() =>
    safeGetLocalStorage<Cabang[]>('cabang_list_data', [])
  );
  const [suratOrders, setSuratOrders] = useState<SuratOrder[]>(() =>
    safeGetLocalStorage<SuratOrder[]>('surat_orders_data', [])
  );
  const [branchAuth, setBranchAuth] = useState<{ id: string; nama: string } | null>(() =>
    safeGetLocalStorage<{ id: string; nama: string } | null>('branch_authenticated', null)
  );

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('cabang_list_data', JSON.stringify(cabangList)), 500);
    return () => clearTimeout(timer);
  }, [cabangList]);
  // ─── BRANCH STOCK & TRANSACTION TRACKING ───
  const [cabangStok, setCabangStok] = useState<BranchStock[]>(() =>
    safeGetLocalStorage<BranchStock[]>('cabang_stok_data', [])
  );
  const [branchTransactions, setBranchTransactions] = useState<BranchTransaction[]>(() =>
    safeGetLocalStorage<BranchTransaction[]>('branch_transactions_data', [])
  );

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('surat_orders_data', JSON.stringify(suratOrders)), 500);
    return () => clearTimeout(timer);
  }, [suratOrders]);
  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('cabang_stok_data', JSON.stringify(cabangStok)), 500);
    return () => clearTimeout(timer);
  }, [cabangStok]);
  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('branch_transactions_data', JSON.stringify(branchTransactions)), 500);
    return () => clearTimeout(timer);
  }, [branchTransactions]);

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
    | 'erp_fefo_expiry'
    | 'erp_pos'
    | 'erp_online'
    | 'erp_crm'
    | 'erp_anggaran_alokasi'
    | 'erp_iot'
    | 'erp_compliance'
    | 'erp_production_planner'
    | 'erp_work_order'
    | 'erp_baker_pct'
    | 'erp_bep'
    | 'erp_dough_temp'
    | 'erp_backup'
    | 'erp_production_center'
    | 'erp_rekap_bahan'
    | 'erp_pembukuan'
    | 'erp_toppings'
    | 'erp_webstore'
  >('dashboard');

  // --- Lifted States with persistent syncing back to localStorage ---
  const [rdExperiments, setRdExperiments] = useState<RDExperiment[]>(() =>
    safeGetLocalStorage<RDExperiment[]>('rd_experiments_data', [])
  );

  const [wasteLogs, setWasteLogs] = useState<WasteLog[]>(() =>
    safeGetLocalStorage<WasteLog[]>('waste_logs_data', [])
  );

  const [writeOffLogs, setWriteOffLogs] = useState<WriteOffLog[]>(() =>
    safeGetLocalStorage<WriteOffLog[]>('writeoff_logs_data', [])
  );

  // State sync effects — debounced 500ms
  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('rd_experiments_data', JSON.stringify(rdExperiments)), 500);
    return () => clearTimeout(timer);
  }, [rdExperiments]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('waste_logs_data', JSON.stringify(wasteLogs)), 500);
    return () => clearTimeout(timer);
  }, [wasteLogs]);

  useEffect(() => {
    const timer = setTimeout(() => localStorage.setItem('writeoff_logs_data', JSON.stringify(writeOffLogs)), 500);
    return () => clearTimeout(timer);
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

  // ─── SYNC KE FIRESTORE (dari Dashboard) ───
  const handleSyncToFirestore = async () => {
    const cabangId = 'pusat';
    try {
      showToast('⏳ Sinkronisasi produk & kategori ke Web Store...', 'info');
      const count = await syncProductsToFirestore(
        calculatedProducts, productHpp, detailResep, bahanBaku, cabangId
      );
      showToast(`✅ ${count} produk + kategori berhasil disinkronisasi! Web Store akan update.`, 'success');
    } catch (err: any) {
      showToast('❌ Gagal sync: ' + (err.message || 'Unknown'), 'error');
    }
  };

  const handleWipeAllData = () => {
    setBahanBaku([]);
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
    localStorage.removeItem('bahan_baku_data');
    localStorage.removeItem('product_hpp_data');
    localStorage.removeItem('detail_resep_data');
    
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
            console.error('Silent auto-save failed, masuk retry queue:', err);
            if (currentToken && currentId) {
              enqueueFailedSync({
                type: 'save_project',
                token: currentToken,
                spreadsheetId: currentId,
                data: { bahanBaku: currentBahan, productHpp: currentHpp, detailResep: currentResep },
              });
              // Also queue revenue if available
              try {
                const revenueData = localStorage.getItem('revenue_tracker_data');
                if (revenueData) {
                  const parsed = JSON.parse(revenueData);
                  if (parsed.transactions?.length > 0) {
                    enqueueFailedSync({
                      type: 'save_revenue',
                      token: currentToken,
                      spreadsheetId: currentId,
                      revenueData: parsed.transactions,
                    });
                  }
                }
              } catch (e) { /* silent */ }
            }
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
    // Validasi isiKemasan > 0 (mencegah Infinity di hargaSatuan)
    if (m.isiKemasan <= 0) {
      showToast('Isi kemasan harus lebih dari 0!', 'error');
      return;
    }
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
    // Validasi isiKemasan > 0
    if (updated.isiKemasan <= 0) {
      showToast('Isi kemasan harus lebih dari 0!', 'error');
      return;
    }
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

  const handleUpdateProductPricing = (productName: string, hargaJual: number) => {
    setProductHpp((prev) =>
      prev.map((p) =>
        p.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
          ? { ...p, hargaJual }
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

    // 3. Deduct raw materials based on this formulation inside our main bahanBaku state! (Only if it's not a branch sale)
    let criticalStockWarning = false;
    if (!cabangId) {
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

      // 4. Deduct warehouse stock levels AFTER state update via setTimeout (mencegah race condition localStorage)
      setTimeout(() => {
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
      }, 100);
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

  // ─── PRODUCTION CENTER — Potong stok bahan baku saat baking log disimpan ───
  const handleProductionComplete = (productName: string, batchQty: number) => {
    const ingredientsForProduct = detailResep.filter(
      (r) => r.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
    );
    if (ingredientsForProduct.length === 0) {
      showToast(`⚠️ Produk "${productName}" belum punya resep, stok tidak dipotong.`, 'info');
      return;
    }
    const productInfo = productHpp.find(
      (p) => p.namaProduk.toLowerCase().trim() === productName.toLowerCase().trim()
    );
    const yieldPortions = productInfo?.porsiJual || 1;

    setBahanBaku((prev) =>
      prev.map((b) => {
        const ingredientUsed = ingredientsForProduct.find(
          (ing) => ing.namaBahan.toLowerCase().trim() === b.nama.toLowerCase().trim()
        );
        if (ingredientUsed) {
          const consumedAmount = (ingredientUsed.takaran / yieldPortions) * batchQty;
          const currentUnitStock = b.isiKemasan - consumedAmount;
          if (currentUnitStock < 50 && b.isiKemasan >= 50) {
            showToast(`⚠️ Stok ${b.nama} menipis (sisa ~${Math.round(currentUnitStock)} ${b.satuan}) — segera order!`, 'info');
          }
          return { ...b, isiKemasan: Math.max(0, Number(currentUnitStock.toFixed(2))) };
        }
        return b;
      })
    );
    setHasUnsavedChanges(true);
    showToast(`🏭 Produksi ${batchQty}x "${productName}" dicatat! Stok bahan baku otomatis dipotong.`, 'success');
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

  // Cache untuk mencegah double-processing order (Web Store auto-deduct)
  const processedOrderIdsRef = useRef<Set<string>>(new Set());

  const handleUpdateSuratOrder = (id: string, so: SuratOrder) => {
    const prevStatus = suratOrders.find(s => s.id === id)?.status;
    setSuratOrders(prev => prev.map(s => s.id === id ? so : s));

    // Guard: cegah double Terima (Bug #6 - Phantom Stock)
    if (so.status === 'diterima' && prevStatus === 'diterima') {
      showToast('⚠️ Surat Order ini sudah diterima sebelumnya!', 'info');
      return;
    }

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

    if (so.status === 'diterima' && prevStatus !== 'diterima') {
      // Cabang terima barang → tambah stok cabang (pakai qtyTerima jika ada)
      const original = suratOrders.find(s => s.id === id);
      const items = original?.items || so.items;
      items.forEach(item => {
        const actualQty = item.qtyTerima ?? item.qty; // Pakai qtyTerima jika cabang mengisi
        const bahan = bahanBaku.find(b => b.nama === item.bahanNama);
        updateBranchStock(so.cabangId, item.bahanNama, actualQty, bahan?.satuan || 'pcs');
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

  // Ref untuk state yang dibutuhkan di Firestore listener (mencegah stale closure serta re-subscribe tiap state berubah)
  const bahanBakuRef = useRef(bahanBaku);
  const productHppRef = useRef(productHpp);
  const detailResepRef = useRef(detailResep);
  const calculatedProductsRef = useRef(calculatedProducts);
  useEffect(() => { bahanBakuRef.current = bahanBaku; }, [bahanBaku]);
  useEffect(() => { productHppRef.current = productHpp; }, [productHpp]);
  useEffect(() => { detailResepRef.current = detailResep; }, [detailResep]);
  useEffect(() => { calculatedProductsRef.current = calculatedProducts; }, [calculatedProducts]);

  // Helpers for waste & rd totals
  const wasteTotalLoss = wasteLogs.reduce((acc, curr) => acc + curr.lossValue, 0);
  const rdTotalCost = rdExperiments.reduce((acc, curr) => acc + curr.components.reduce((sum, c) => sum + (c.takaran * c.unitPrice), 0) + curr.estOverhead, 0);

  // ─── FIRESTORE LISTENER — Notifikasi & Auto-Deduct Stok dari Web Store ───
  useEffect(() => {
    // Listen for new orders from web store
    const unsubOrders = listenNewOrders((order) => {
      // Show notification toast
      const totalStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.totalAmount);
      showToast(`🛒 Pesanan Baru dari Web Store! ${order.userName} — ${totalStr} (${order.status})`, 'success');

      // 🔥 Catat order ke pos_orders_data (biar muncul di Ringkasan Dashboard)
      try {
        const savedOrders = localStorage.getItem('pos_orders_data');
        const posOrders = savedOrders ? JSON.parse(savedOrders) : [];
        posOrders.push({
          ordId: `ws-${order.id}`,
          source: 'Web Store',
          customerName: order.userName,
          items: order.items.map((i: any) => i.name).join(', '),
          totalSum: order.totalAmount,
          status: order.status || 'Menunggu Pembayaran',
          timeAgo: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          date: new Date().toISOString().substring(0, 10),
          catatan: '',
        });
        localStorage.setItem('pos_orders_data', JSON.stringify(posOrders));
      } catch (e) { console.warn('Failed to save pos_orders_data:', e); }

      // 🔥 Catat revenue ke revenue_tracker_data (biar muncul di Ringkasan Dashboard)
      try {
        const saved = localStorage.getItem('revenue_tracker_data');
        const tracker = saved ? JSON.parse(saved) : { transactions: [], dailyTotals: {} };
        const today = new Date().toISOString().substring(0, 10);
        const txEntry = {
          id: `ws-rev-${Date.now()}`,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          product: order.items.map((i: any) => i.name).join(', '),
          qty: order.items.reduce((s: number, i: any) => s + i.quantity, 0),
          amount: order.totalAmount,
          source: 'Web Store',
          date: today,
        };
        tracker.transactions.push(txEntry);
        if (tracker.transactions.length > 500) tracker.transactions = tracker.transactions.slice(-500);
        if (!tracker.dailyTotals[today]) tracker.dailyTotals[today] = { total: 0, sources: {} };
        tracker.dailyTotals[today].total += order.totalAmount;
        if (!tracker.dailyTotals[today].sources['Web Store']) tracker.dailyTotals[today].sources['Web Store'] = 0;
        tracker.dailyTotals[today].sources['Web Store'] += order.totalAmount;
        localStorage.setItem('revenue_tracker_data', JSON.stringify(tracker));
      } catch (e) { console.warn('Failed to save revenue_tracker_data:', e); }
      // ⚠️ Stok TIDAK langsung dipotong saat order masuk — tunggu sampai pembayaran dikonfirmasi
      // Lihat listener listenOrderStatusChanges di bawah untuk auto-deduct stok
    }, (err) => console.warn('Order listener error:', err));

    // ─── LISTENER: Auto-deduct stok hanya saat status order berubah jadi Diproses/Lunas ───
    // Gunakan refs untuk menghindari stale closure
    const unsubStatus = listenOrderStatusChanges((order, previousStatus) => {
      // Guard: cegah double deduction untuk order yang sudah diproses
      if (processedOrderIdsRef.current.has(order.id)) {
        console.log(`Order ${order.id.slice(-8)} sudah diproses, skip.`);
        return;
      }
      processedOrderIdsRef.current.add(order.id);

      showToast(`🔔 Pembayaran dikonfirmasi untuk pesanan ${order.id.slice(-8)}! Status: ${previousStatus} → ${order.status}. Memotong stok bahan baku...`, 'success');

      // Pakai refs agar selalu dapat data terbaru tanpa re-subscribe
      const currentBahan = bahanBakuRef.current;
      const currentResep = detailResepRef.current;
      const currentHpp = productHppRef.current;
      const currentCalc = calculatedProductsRef.current;

      // Deduct bahan baku stok berdasarkan resep (pakai functional update + .map() — tanpa JSON.parse deep clone)
      setBahanBaku((prevBahan) => {
        // Build lookup: bahan → total consumed dari semua items dalam order
        const deductionMap = new Map<string, { consumed: number; nama: string; satuan: string }>();
        order.items.forEach((item) => {
          const ingredientsForProduct = currentResep.filter(
            (r) => r.namaProduk.toLowerCase().trim() === item.name.toLowerCase().trim()
          );
          const productInfo = currentHpp.find(
            (p) => p.namaProduk.toLowerCase().trim() === item.name.toLowerCase().trim()
          );
          const yieldPortions = productInfo?.porsiJual || 1;
          ingredientsForProduct.forEach((ing) => {
            const consumedAmount = (ing.takaran / yieldPortions) * item.quantity;
            const key = ing.namaBahan.toLowerCase().trim();
            const existing = deductionMap.get(key);
            deductionMap.set(key, {
              consumed: (existing?.consumed || 0) + consumedAmount,
              nama: ing.namaBahan,
              satuan: existing?.satuan || 'gr',
            });
          });
        });
        // Selective map — hanya create objek baru untuk item yang berubah
        return prevBahan.map((b) => {
          const ded = deductionMap.get(b.nama.toLowerCase().trim());
          if (ded) {
            const oldStock = b.isiKemasan;
            const newStock = oldStock - ded.consumed;
            if (newStock < 50 && oldStock >= 50) {
              showToast(`⚠️ Stok ${b.nama} menipis (sisa ${Math.round(newStock)} ${b.satuan}) — segera order!`, 'info');
            }
            return { ...b, isiKemasan: Math.max(0, Number(newStock.toFixed(2))) };
          }
          return b;
        });
      });

      // Update status order di pos_orders_data (baca fresh)
      try {
        const savedOrders = localStorage.getItem('pos_orders_data');
        if (savedOrders) {
          const posOrders = JSON.parse(savedOrders);
          const updated = posOrders.map((p: any) => 
            p.ordId === `ws-${order.id}` ? { ...p, status: order.status } : p
          );
          localStorage.setItem('pos_orders_data', JSON.stringify(updated));
        }
      } catch (e) { /* silent */ }

      // Sync produk ke Firestore dengan data stok terbaru (delay biar state settled)
      if (currentCalc.length > 0) {
        setTimeout(() => {
          const updatedCalc = calculateAllProducts(bahanBakuRef.current, currentHpp, currentResep);
          syncProductsToFirestore(updatedCalc, currentHpp, currentResep, bahanBakuRef.current, 'pusat').catch(console.warn);
        }, 2000);
      }
    }, (err) => console.warn('Status change listener error:', err));

    // Listen for ERP notifications
    const unsubNotif = listenNotifications((notif) => {
      showToast(`📢 ${notif.title}: ${notif.body}`, 'info');
    }, (err) => console.warn('Notification listener error:', err));

    // Listen for new chat messages from Web Store
    const unsubChats = listenNewChats((chat) => {
      if (chat.unreadBySeller && chat.lastMessage) {
        showToast(`💬 Chat dari ${chat.buyerName}: "${chat.lastMessage.length > 50 ? chat.lastMessage.substring(0, 50) + '...' : chat.lastMessage}"`, 'info');
        // Also record to local storage so dashboard can show count
        try {
          const saved = localStorage.getItem('unread_chats_data');
          const chats = saved ? JSON.parse(saved) : [];
          const existing = chats.findIndex((c: any) => c.id === chat.id);
          if (existing >= 0) {
            chats[existing] = { ...chats[existing], ...chat, lastSeen: Date.now() };
          } else {
            chats.push({ ...chat, lastSeen: Date.now() });
          }
          localStorage.setItem('unread_chats_data', JSON.stringify(chats));
        } catch (e) { /* silent */ }
      }
    }, (err) => console.warn('Chat listener error:', err));

    return () => {
      unsubOrders();
      unsubStatus();
      unsubNotif();
      unsubChats();
    };
  }, [bahanBaku, productHpp, detailResep, calculatedProducts]);

  // ─── FIRESTORE CATEGORY PULL — Ambil kategori dari Firestore sebagai source of truth ───
  // Saat startup, ERP menarik daftar kategori dari Firestore (web store / WebStoreManager)
  // dan menyimpannya ke localStorage agar WebStoreManagerTab bisa mengaksesnya.
  useEffect(() => {
    getFirestoreCategories('pusat').then(catData => {
      if (catData && catData.categories.length > 0) {
        localStorage.setItem('firestore_categories', JSON.stringify(catData.categories));
        localStorage.setItem('firestore_category_icons', JSON.stringify(catData.categoryIcons));
      }
    }).catch(() => {/* silent — offline mode */});
  }, []);

  // ─── GLOBAL IoT SIMULATION — Berjalan terus (tidak hanya saat tab Smart IoT aktif) ───
  // Data suhu chiller/freezer disimulasikan dan disimpan ke localStorage agar ComplianceSafetyTab
  // bisa membaca dan memicu recall otomatis jika suhu melebihi batas aman.
  const [iotDevices, setIotDevices] = useState<IoTDevice[]>([]);
  
  useEffect(() => {
    // Inisialisasi baseline sensor (read from localStorage if exists)
    const saved = safeGetLocalStorage<IoTDevice[]>('iot_device_data', []);
    if (saved.length > 0) {
      setIotDevices(saved);
      return;
    }
    const initialDevices: IoTDevice[] = [
      { id: 'chiller-1', name: 'Chiller Utama (Adonan)', type: 'freezer', value: 4, unit: '°C', status: 'online', lastUpdate: new Date().toISOString(), location: 'Dapur Pusat', minThreshold: 0, maxThreshold: 8 } as IoTDevice,
      { id: 'chiller-2', name: 'Chiller Pastry & Krim', type: 'freezer', value: 3, unit: '°C', status: 'online', lastUpdate: new Date().toISOString(), location: 'Dapur Pusat', minThreshold: 0, maxThreshold: 8 } as IoTDevice,
      { id: 'freezer-1', name: 'Freezer Bahan Baku', type: 'freezer', value: -18, unit: '°C', status: 'online', lastUpdate: new Date().toISOString(), location: 'Gudang', minThreshold: -25, maxThreshold: -10 } as IoTDevice,
      { id: 'oven-1', name: 'Oven Deck', type: 'oven', value: 180, unit: '°C', status: 'online', lastUpdate: new Date().toISOString(), location: 'Dapur Produksi', minThreshold: 140, maxThreshold: 240 } as IoTDevice,
      { id: 'humidity-1', name: 'Hygrometer Ruang Proofing', type: 'humidity', value: 75, unit: '%', status: 'online', lastUpdate: new Date().toISOString(), location: 'Ruang Proofing', minThreshold: 40, maxThreshold: 85 } as IoTDevice,
    ];
    setIotDevices(initialDevices);
    localStorage.setItem('iot_device_data', JSON.stringify(initialDevices));
  }, []);

  useEffect(() => {
    if (iotDevices.length === 0) return;
    const interval = setInterval(() => {
      setIotDevices(prev => prev.map(d => {
        let newValue = d.value;
        const fluctuation = (Math.random() - 0.5) * 4;
        if (d.type === 'freezer') {
          // Chiller: 0-10°C, Freezer: -25 to -10°C
          newValue = Math.round((d.value + fluctuation) * 10) / 10;
          newValue = d.value > 0 ? Math.max(0, Math.min(12, newValue)) : Math.max(-25, Math.min(-8, newValue));
        } else if (d.type === 'oven') {
          newValue = Math.round(Math.max(140, Math.min(240, d.value + fluctuation)));
        } else if (d.type === 'humidity') {
          newValue = Math.round(Math.max(40, Math.min(95, d.value + fluctuation)));
        }
        let status: 'online' | 'offline' | 'warning' = 'online';
        if (d.status !== 'offline') {
          if (d.minThreshold !== undefined && newValue < d.minThreshold) status = 'warning';
          else if (d.maxThreshold !== undefined && newValue > d.maxThreshold) status = 'warning';
          else status = 'online';
        }
        return { ...d, value: newValue, status, lastUpdate: new Date().toISOString() };
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, [iotDevices.length > 0]);

  // Sync IoT data ke localStorage untuk ComplianceSafetyTab
  useEffect(() => {
    if (iotDevices.length > 0) {
      localStorage.setItem('iot_device_data', JSON.stringify(iotDevices));
    }
  }, [iotDevices]);

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
          showToast(`📅 Hari ${todayName} — Jangan lupa cek Work Order untuk produksi hari ini!`, 'info');
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
            {activeTab === 'materials' && (
              <MaterialsTab
                bahanBaku={bahanBaku}
                cabangList={cabangList}
                cabangStok={cabangStok}
                suratOrders={suratOrders}
                onUpdateSuratOrder={handleUpdateSuratOrder}
              />
            )}
            {activeTab === 'dashboard' && (
              <DashboardTab
                calculatedProducts={calculatedProducts}
                bahanBaku={bahanBaku}
                cabangList={cabangList}
                branchTransactions={branchTransactions}
                onWipeAllData={handleWipeAllData}
                onSyncToFirestore={handleSyncToFirestore}
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
                onEditMaterial={handleEditMaterial}
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
                onProductionComplete={handleProductionComplete}
              />
            )}
            {activeTab === 'erp_fefo_expiry' && (
              <FefoExpiryTab bahanBaku={bahanBaku} productHpp={productHpp} detailResep={detailResep} onAddWasteLog={handleAddWasteLog} cabangList={cabangList} suratOrders={suratOrders} cabangStok={cabangStok} />
            )}
            {activeTab === 'erp_pos' && (
              <PosKasirTab
                calculatedProducts={calculatedProducts}
                onCompletePOSSale={handleCompletePOSSale}
                toppings={toppings}
                detailResep={detailResep}
              />
            )}
            {activeTab === 'erp_online' && (
              <PesananOnlineTab
                calculatedProducts={calculatedProducts}
                onCompletePOSSale={handleCompletePOSSale}
              />
            )}
            {activeTab === 'erp_crm' && (
              <CrmMarketingTab 
                calculatedProducts={calculatedProducts}
                bahanBaku={bahanBaku}
                productHpp={productHpp}
                detailResep={detailResep}
                wasteLogs={wasteLogs}
                cabangList={cabangList}
                suratOrders={suratOrders}
              />
            )}
            {activeTab === 'erp_anggaran_alokasi' && (
              <AnggaranAlokasiTab
                calculatedProducts={calculatedProducts}
                bahanBaku={bahanBaku}
                wasteTotalLoss={wasteTotalLoss}
                rdTotalCost={rdTotalCost}
              />
            )}
            {activeTab === 'erp_iot' && (
              <SmartKitchenTab />
            )}
            {activeTab === 'erp_compliance' && (
              <ComplianceSafetyTab productHpp={productHpp} onAddWasteLog={handleAddWasteLog} cabangList={cabangList} />
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

            {activeTab === 'erp_backup' && (
              <BackupSystemTab
                bahanBaku={bahanBaku}
                productHpp={productHpp}
                detailResep={detailResep}
                calculatedProducts={calculatedProducts}
              />
            )}
            {activeTab === 'erp_toppings' && (
              <ToppingsTab
                toppings={toppings}
                productHpp={productHpp}
                bahanBaku={bahanBaku}
                onAddTopping={handleAddTopping}
                onDeleteTopping={handleDeleteTopping}
              />
            )}
            {activeTab === 'erp_webstore' && (
              <WebStoreManagerTab
                productHpp={productHpp}
                calculatedProducts={calculatedProducts}
                bahanBaku={bahanBaku}
                detailResep={detailResep}
                cabangList={cabangList}
                onImportProduct={(product) => {
                  // Cek duplikasi
                  const exists = productHpp.some(
                    p => p.namaProduk.toLowerCase().trim() === product.namaProduk.toLowerCase().trim()
                  );
                  if (exists) {
                    showToast(`Produk "${product.namaProduk}" sudah ada di ERP!`, 'error');
                    return;
                  }
                  setProductHpp(prev => [...prev, product]);
                  setHasUnsavedChanges(true);
                  showToast(`✅ "${product.namaProduk}" berhasil diimpor dari Web Store! Atur resep di tab Formulasi Resep.`, 'success');
                }}
              />
            )}
            {activeTab === 'erp_pembukuan' && (
              <PembukuanTab
                calculatedProducts={calculatedProducts}
                bahanBaku={bahanBaku}
                wasteTotalLoss={wasteTotalLoss}
                rdTotalCost={rdTotalCost}
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

      {/* NAVIGATION — Urutan dari Ringkasan sampai Backup */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-5 select-none scrollbar-thin">
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">① Ringkasan & Dashboard</span>
          {sidebarBtn('dashboard', <LineChart className="w-4 h-4" />, '👋 Ringkasan')}
          {sidebarBtn('erp_bi', <TrendingUp className="w-4 h-4" />, '📊 Laporan P&L')}
          {sidebarBtn('erp_pembukuan', <Layers className="w-4 h-4" />, '📒 Pembukuan')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">② Master Data</span>
          {sidebarBtn('data_pusat', <Building2 className="w-4 h-4" />, '🏛️ Data Pusat')}
          {sidebarBtn('materials', <Package className="w-4 h-4" />, '📦 Monitor Stok')}
          {sidebarBtn('recipes', <FolderTree className="w-4 h-4" />, '📝 Formulasi Resep')}
          {sidebarBtn('erp_toppings', <Coins className="w-4 h-4" />, '🧩 Add-on & Topping')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">③ Inventory & Produksi</span>
          {sidebarBtn('erp_fefo_expiry', <ShieldAlert className="w-4 h-4" />, '📋 FEFO & Expiry')}
          {sidebarBtn('erp_bom', <Layers className="w-4 h-4" />, '🔧 BOM & Yield')}
          {sidebarBtn('erp_production_center', <ClipboardList className="w-4 h-4" />, '🏭 Prod. Center')}
          {/* Rekap Bahan sudah merge ke Data Pusat → sub-section Rekap */}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">④ Kasir & Penjualan</span>
          {sidebarBtn('erp_pos', <ShoppingCart className="w-4 h-4" />, '🛒 POS Kasir')}
          {sidebarBtn('erp_online', <Users className="w-4 h-4" />, '📱 Pesanan Online')}
          {sidebarBtn('erp_crm', <TrendingUp className="w-4 h-4" />, '📈 CRM Marketing')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">⑤ Keuangan</span>
          {sidebarBtn('erp_cash_flow', <Coins className="w-4 h-4" />, '💵 Arus Kas')}
          {sidebarBtn('erp_anggaran_alokasi', <PieChart className="w-4 h-4" />, '💰 Anggaran & Alokasi')}
          {sidebarBtn('erp_bep', <BarChart3 className="w-4 h-4" />, '🧮 BEP & Balance')}
          {sidebarBtn('hpp', <TrendingUp className="w-4 h-4" />, '📈 Harga & HPP')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">⑥ Operasional & Tools</span>
          {sidebarBtn('erp_waste', <X className="w-4 h-4" />, '🗑️ Manajemen Waste')}
          {sidebarBtn('erp_rd', <FlaskConical className="w-4 h-4" />, '🔬 Sandbox R&D')}
          {sidebarBtn('erp_compliance', <ShieldAlert className="w-4 h-4" />, '🧊 Recall Pangan')}
          {sidebarBtn('erp_iot', <Cpu className="w-4 h-4" />, '🤖 Smart IoT')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[9px] font-black text-gray-500 uppercase tracking-widest block mb-2 font-mono">⑦ Backup</span>
          {sidebarBtn('erp_webstore', <Globe className="w-4 h-4" />, '🌐 Web Store')}
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
