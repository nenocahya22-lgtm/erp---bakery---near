import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useConfirmModal } from './hooks/useConfirmModal';
import { ConfirmModal, type ConfirmState } from './components/ConfirmModal';
import OwnerLogin from './components/OwnerLogin';
import BranchLogin from './components/BranchLogin';
import SmartKitchenTab from './components/SmartKitchenTab';
import WasteControlTab from './components/WasteControlTab';
import PesananOnlineTab from './components/PesananOnlineTab';
import ProductionCenterTab from './components/ProductionCenterTab';
import BranchDashboard from './components/BranchDashboard';
import LandingPage from './components/LandingPage';

// Lazy-loaded wrappers
const KeuanganDashboard = lazy(() => import('./components/KeuanganDashboard'));
const InventarisTab = lazy(() => import('./components/InventarisTab'));
const LogistikDashboard = lazy(() => import('./components/LogistikDashboard'));
const ProduksiDashboard = lazy(() => import('./components/ProduksiDashboard'));
const PenjualanDashboard = lazy(() => import('./components/PenjualanDashboard'));
const StrategiDashboard = lazy(() => import('./components/StrategiDashboard'));
const SistemDashboard = lazy(() => import('./components/SistemDashboard'));

import {
  AlertTriangle, CheckCircle2, X, FileSpreadsheet, Globe, Layers, Sparkles,
  RefreshCw, FolderTree, TrendingUp, Package, Cpu, ShieldAlert, LineChart,
  Users, ShoppingCart, Coins, FlaskConical, LogOut, Menu, ClipboardList,
  Percent, BarChart3, Thermometer, PanelRightClose, PanelRightOpen, PieChart,
  Cloud, Building2, MessageSquare, Settings,
} from 'lucide-react';

import { useAuth } from './hooks/useAuth';
import { useERPData } from './hooks/useERPData';
import { useFirestoreSync } from './hooks/useFirestoreSync';

// Library imports
import {
  listenNewOrders,
  listenOrderStatusChanges,
  listenNotifications,
  listenNewChats,
  syncProductsToFirestore,
  getFirestoreCategories,
} from './lib/firestore-bridge';
import {
  extractSpreadsheetId,
  loadProjectDataFromSheets,
  saveProjectDataToSheets,
  createAndInitializeTemplates,
  saveRevenueToSheets,
  enqueueFailedSync,
  resetDataHashCache,
} from './lib/sheets';
import { calculateAllProducts } from './lib/calculations';
import { saveAllToFirestore } from './lib/erp-firestore-sync';
import { safeGetLocalStorage } from './lib/safe-json';
import { googleSignIn } from './lib/firebase';
import type { IoTDevice } from './types';

export default function App() {
  // ─── LANDING PAGE ───
  const [showLanding, setShowLanding] = useState(() => {
    return localStorage.getItem('hide_landing') !== 'true';
  });

  const handleEnterERP = () => {
    setShowLanding(false);
  };

  const handleEnterWebstore = () => {
    const webstoreUrl = import.meta.env.VITE_WEBSTORE_URL as string | undefined;
    if (webstoreUrl && webstoreUrl.trim()) {
      window.open(webstoreUrl.trim(), '_blank');
    } else {
      const savedUrl = localStorage.getItem('webstore_url');
      if (savedUrl) {
        window.open(savedUrl, '_blank');
      } else {
        const url = window.prompt(
          '🌐 Masukkan URL Web Store Anda\n\nContoh: https://near-bakery-store.vercel.app\n\n(URL akan disimpan di localStorage)',
          ''
        );
        if (url && url.trim()) {
          localStorage.setItem('webstore_url', url.trim());
          window.open(url.trim(), '_blank');
        } else {
          showToast('⚠️ URL Web Store belum dikonfigurasi. Atur di .env VITE_WEBSTORE_URL atau masukkan URL.', 'warning');
        }
      }
    }
  };

  // ─── HOOKS ───
  const {
    isOwnerAuthenticated,
    branchAuth,
    showBranchLogin,
    showOwnerLogin,
    setShowBranchLogin,
    setShowOwnerLogin,
    handleOwnerLogin,
    handleOwnerLogout,
    handleBranchLogin,
    handleBranchLogout,
  } = useAuth();

  const { confirmState, setConfirmState, showConfirm } = useConfirmModal();

  const {
    bahanBaku, setBahanBaku,
    productHpp, setProductHpp,
    detailResep, setDetailResep,
    cabangList, setCabangList,
    suratOrders, setSuratOrders,
    wasteLogs, setWasteLogs,
    writeOffLogs, setWriteOffLogs,
    rdExperiments, setRdExperiments,
    toppings, setToppings,
    cabangStok, setCabangStok,
    branchTransactions, setBranchTransactions,
    opnameDrafts, setOpnameDrafts,
    hasUnsavedChanges, setHasUnsavedChanges,
    spreadsheetId, setSpreadsheetId,
    spreadsheetTitle, setSpreadsheetTitle,
    lastAutoSaved, setLastAutoSaved,
    toasts, setToasts, showToast,
    calculatedProducts,
    wasteTotalLoss, rdTotalCost,
    bahanBakuRef, productHppRef, detailResepRef, calculatedProductsRef,
    autoDeductedProductsRef,
    updateBranchStock, addBranchTransaction,
    handleAddMaterial, handleEditMaterial, handleDeleteMaterial,
    handleAddProduct, handleUpdateProductIngredients, handleDeleteProduct, handleUpdateProductPricing,
    handleAddVariant, handleUpdateVariant, handleDeleteVariant,
    handleAddCabang, handleEditCabang, handleDeleteCabang,
    handleAddSuratOrder, handleUpdateSuratOrder, handleReturSuratOrder,
    handleAddWasteLog, handleDeleteWasteLog, handleAddWriteOff, handleDeleteWriteOff,
    handleAddRD, handleDeleteRD,
    handleAddTopping, handleDeleteTopping,
    handleCompletePOSSale,
    handleProductionComplete, handleBranchProductionComplete,
    handleSyncStokOpname,
    handleAddOpnameDraft, handleApproveOpname, handleRejectOpname,
  } = useERPData(showConfirm);

  useFirestoreSync({
    isOwnerAuthenticated,
    branchAuth,
    data: { bahanBaku, productHpp, detailResep, cabangList, suratOrders, wasteLogs, writeOffLogs, rdExperiments, toppings, cabangStok, branchTransactions },
    setters: { setBahanBaku, setProductHpp, setDetailResep, setCabangList, setSuratOrders, setWasteLogs, setWriteOffLogs, setRdExperiments, setToppings, setCabangStok, setBranchTransactions },
    showToast,
  });

  // Set offline/localStorage mode by default
  const [user] = useState<{displayName: string; email: string; uid: string}>({
    displayName: 'Owner',
    email: 'owner@bakery.id',
    uid: 'offline-uid'
  });
  const [token, setToken] = useState<string | null>(null);

  // Connection Sheet state
  const [spreadsheetUrl, setSpreadsheetUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [sheetTitles, setSheetTitles] = useState<string[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Tabs layout — 5 merged dashboard groups
  const [activeTab, setActiveTab] = useState<
    | 'keuangan'
    | 'logistik'
    | 'produksi'
    | 'penjualan'
    | 'strategi'
    | 'sistem'
  >('keuangan');

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // ─── SYNC KE FIRESTORE (dari Dashboard) ───
  const handleSyncToFirestore = async () => {
    const cabangId = 'pusat';
    try {
      showToast('⏳ Sinkronisasi produk & kategori ke Web Store...', 'info');
      const publishedProducts = productHpp.filter(p => p.status !== 'draft');
      const count = await syncProductsToFirestore(
        calculatedProducts, publishedProducts, detailResep, bahanBaku, cabangId
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
    localStorage.removeItem('bahan_baku_data');
    localStorage.removeItem('product_hpp_data');
    localStorage.removeItem('detail_resep_data');

    saveAllToFirestore({
      bahanBaku: [], productHpp: [], detailResep: [],
      cabangList: [], suratOrders: [],
      wasteLogs: [], writeOffLogs: [], rdExperiments: [],
      toppings: [], cabangStok: [], branchTransactions: [],
    }).catch(() => {});

    setHasUnsavedChanges(true);
    showToast('Sistem Near Bakery & Co berhasil diformat steril! Semua data contoh telah dibersihkan.', 'success');
  };

  // Auto-connect to Google Sheets
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

  // Robust Auto-Save background Sync with Google Sheets — every 2 menit (diff sync cegah API overuse)
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
    }, 2 * 60 * 1000); // 2 menit — lebih sering tapi diff sync cegah API overuse

    return () => clearInterval(interval);
  }, []);

  // Connect to Google Sheets
  const initiateGoogleConnect = async () => {
    const choice = await new Promise<boolean>((resolve) => {
      showConfirm({
        title: 'Hubungkan Google Sheets',
        message: 'Pilih metode:\n\n• OK = Login dengan Google (akses penuh baca/tulis)\n• BATAL = Input URL manual (sheet harus publik)',
        confirmLabel: 'Login Google',
        cancelLabel: 'Input URL Manual',
        variant: 'info',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

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

  const tryManualConnect = () => {
    const url = window.prompt(
      'Masukkan URL Google Sheets Anda:\n\n' +
      'Pastikan sheet diatur ke "Anyone with the link can view"\n' +
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

  const handleInitializeTemplates = async () => {
    if (!token || !spreadsheetId) return;
    setIsConnecting(true);
    setShowTemplateModal(false);

    try {
      await createAndInitializeTemplates(token, spreadsheetId, sheetTitles);
      showToast('Berhasil menginisialisasi lembar kerja template!', 'success');
      await handleConnect(token, spreadsheetId, false);
    } catch (err: any) {
      console.error(err);
      showToast('Gagal menginisialisasi template: ' + (err.message || err), 'error');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveToSheets = async () => {
    if (!token || !spreadsheetId) return;
    const confirmed = await new Promise((resolve) => {
      showConfirm({
        title: 'Simpan ke Google Sheets',
        message: 'Apakah Anda ingin menyimpan seluruh perubahan kustom Bahan Baku, Resep, dan Margins Anda kembali ke file Google Sheets? Ini akan menimpa data baris yang ada.',
        confirmLabel: 'Simpan',
        cancelLabel: 'Batal',
        variant: 'warning',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
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

  // ─── PROCESSED ORDER IDS ───
  const processedOrderIdsRef = useRef<Set<string>>(() => {
    const saved = safeGetLocalStorage<string[]>('processed_order_ids', []);
    return new Set(saved);
  });

  const markOrderProcessed = (orderId: string) => {
    processedOrderIdsRef.current.add(orderId);
    localStorage.setItem('processed_order_ids', JSON.stringify([...processedOrderIdsRef.current]));
  };

  // ─── CHAT NOTIFICATION TRACKING ───
  const chatLastMsgRef = useRef<Map<string, string>>(new Map());

  // ─── FIRESTORE LISTENER — Notifikasi Order & Chat dari Web Store ───
  useEffect(() => {
    const unsubOrders = listenNewOrders((order) => {
      const totalStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(order.totalAmount);
      showToast(`🛒 Pesanan Baru dari Web Store! ${order.userName} — ${totalStr} (${order.status})`, 'success');

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
    }, (err) => console.warn('Order listener error:', err));

    const unsubStatus = listenOrderStatusChanges((order, previousStatus) => {
      if (processedOrderIdsRef.current.has(order.id)) {
        console.log(`Order ${order.id.slice(-8)} sudah diproses, skip.`);
        return;
      }
      markOrderProcessed(order.id);

      showToast(`🔔 Pembayaran dikonfirmasi untuk pesanan ${order.id.slice(-8)}! Status: ${previousStatus} → ${order.status}.`, 'success');

      const currentCalc = calculatedProductsRef.current;

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

      if (currentCalc.length > 0) {
        setTimeout(() => {
          const published = productHppRef.current.filter(pr => pr.status !== 'draft');
          const updatedCalc = calculateAllProducts(bahanBakuRef.current, published, detailResepRef.current);
          syncProductsToFirestore(updatedCalc, published, detailResepRef.current, bahanBakuRef.current, 'pusat').catch(console.warn);
        }, 2000);
      }
    }, (err) => console.warn('Status change listener error:', err));

    const unsubNotif = listenNotifications((notif) => {
      showToast(`📢 ${notif.title}: ${notif.body}`, 'info');
    }, (err) => console.warn('Notification listener error:', err));

    const chatMsgTracker = chatLastMsgRef.current;

    const unsubChats = listenNewChats((chat) => {
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

      if (!chat.unreadBySeller || !chat.lastMessage) return;

      const prevLastMsg = chatMsgTracker.get(chat.id);
      const currentMsg = chat.lastMessage;

      if (prevLastMsg !== undefined && prevLastMsg !== currentMsg) {
        chatMsgTracker.set(chat.id, currentMsg);
        const msgDisplay = currentMsg.length > 50 ? currentMsg.substring(0, 50) + '...' : currentMsg;
        showToast(`💬 Chat dari ${chat.buyerName}: "${msgDisplay}"`, 'info');
      } else if (prevLastMsg === undefined) {
        chatMsgTracker.set(chat.id, currentMsg);
      }
    }, (err) => console.warn('Chat listener error:', err));

    return () => {
      unsubOrders();
      unsubStatus();
      unsubNotif();
      unsubChats();
    };
  }, []);

  // ─── FIRESTORE CATEGORY PULL ───
  useEffect(() => {
    getFirestoreCategories('pusat').then(catData => {
      if (catData && catData.categories.length > 0) {
        localStorage.setItem('firestore_categories', JSON.stringify(catData.categories));
        localStorage.setItem('firestore_category_icons', JSON.stringify(catData.categoryIcons));
      }  }).catch(() => { });
  }, []);

  // ─── GLOBAL TOAST LISTENER — event-based alert() replacement ───
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ message: string; type: 'success' | 'error' | 'info' | 'warning' }>).detail;
      showToast(detail.message, detail.type);
    };
    window.addEventListener('app:toast', handler);
    return () => window.removeEventListener('app:toast', handler);
  }, []);

  // ─── GLOBAL IoT SIMULATION ───
  const [iotDevices, setIotDevices] = useState<IoTDevice[]>([]);

  useEffect(() => {
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

  // ─── LANDING PAGE ───
  // Hitung data real dari ERP untuk ditampilkan di landing page
  const landingData = React.useMemo(() => {
    const publishedProducts = productHpp.filter(p => p.status !== 'draft');
    const realProductCount = publishedProducts.length || calculatedProducts.length || productHpp.length || 0;
    const realBranchCount = cabangList.filter(c => c.isActive).length || cabangList.length || 0;
    const realLowStockCount = bahanBaku.filter(b => b.isiKemasan < 100).length || 0;

    // Revenue & orders dari localStorage
    let realTransactionCount = 0;
    let realRevenueToday = 0;
    let realTodayOrders = 0;
    try {
      const raw = localStorage.getItem('revenue_tracker_data');
      if (raw) {
        const data = JSON.parse(raw);
        realTransactionCount = data.transactions?.length || 0;
        const today = new Date().toISOString().substring(0, 10);
        realRevenueToday = data.dailyTotals?.[today]?.total || 0;
      }
    } catch {}
    try {
      const raw = localStorage.getItem('pos_orders_data');
      if (raw) {
        const orders = JSON.parse(raw);
        const today = new Date().toISOString().substring(0, 10);
        realTodayOrders = orders.filter((o: any) => o.date === today).length || 0;
      }
    } catch {}

    return {
      productCount: realProductCount || undefined,
      branchCount: realBranchCount || undefined,
      transactionCount: realTransactionCount || undefined,
      revenueToday: realRevenueToday || undefined,
      lowStockCount: realLowStockCount || undefined,
      todayOrders: realTodayOrders || undefined,
    };
  }, [productHpp, calculatedProducts, cabangList, bahanBaku]);

  if (showLanding) {
    return (
      <LandingPage
        onEnterERP={handleEnterERP}
        onEnterWebstore={handleEnterWebstore}
        productCount={landingData.productCount}
        branchCount={landingData.branchCount}
        transactionCount={landingData.transactionCount}
        revenueToday={landingData.revenueToday}
        lowStockCount={landingData.lowStockCount}
        todayOrders={landingData.todayOrders}
      />
    );
  }

  // ─── AUTH GATE ───
  if (!isOwnerAuthenticated && !branchAuth) {
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
          onAddOpnameDraft={handleAddOpnameDraft}
          onProductionComplete={handleBranchProductionComplete}
          onLogout={handleBranchLogout}
        />
      );
    }
  }

  return (
    <div id="application-layout" className="h-screen bg-slate-100 font-sans text-gray-800 flex overflow-hidden">

      {/* MOBILE OVERLAY BACKDROP */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* FLOATING SIDEBAR TOGGLE */}
      {!isSidebarOpen && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-50 w-10 h-10 bg-slate-900 hover:bg-emerald-700 text-white rounded-xl shadow-lg border border-slate-700 flex items-center justify-center transition-all cursor-pointer hover:scale-105"
          title="Buka Sidebar"
        >
          <PanelRightOpen className="w-5 h-5" />
        </button>
      )}

      {/* MOBILE SIDEBAR */}
      <aside className={`md:hidden fixed top-0 left-0 z-40 h-full w-72 bg-slate-800 text-slate-300 border-r border-slate-700 flex flex-col shadow-lg transition-all duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <SidebarContent isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} activeTab={activeTab} setActiveTab={setActiveTab} spreadsheetId={spreadsheetId} setSpreadsheetId={setSpreadsheetId} setSpreadsheetTitle={setSpreadsheetTitle} showToast={showToast} initiateGoogleConnect={initiateGoogleConnect} handleOwnerLogout={handleOwnerLogout} confirmState={confirmState} setConfirmState={setConfirmState} />
      </aside>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-shrink-0 bg-slate-800 text-slate-300 border-r border-slate-700 flex-col shadow-lg transition-all duration-300 ease-in-out overflow-hidden h-full"
        style={{ width: isSidebarOpen ? 288 : 0 }}>
        <div style={{ width: 288 }} className="flex flex-col h-full">
          <SidebarContent isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} activeTab={activeTab} setActiveTab={setActiveTab} spreadsheetId={spreadsheetId} setSpreadsheetId={setSpreadsheetId} setSpreadsheetTitle={setSpreadsheetTitle} showToast={showToast} initiateGoogleConnect={initiateGoogleConnect} handleOwnerLogout={handleOwnerLogout} confirmState={confirmState} setConfirmState={setConfirmState} />
        </div>
      </aside>

      {/* MAIN WORKSPACE */}
      <div id="erp-workspace-area" className="flex-1 min-w-0 flex flex-col bg-slate-50">

        {/* TOP BAR */}
        <header className="bg-white border-b border-gray-150 h-16 py-3 px-4 sm:px-6 flex justify-between items-center shrink-0 shadow-xs z-30">
          <div className="flex items-center gap-3.5">
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
                    <span>Sinkronisasi ke Google Sheets</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
          <div className="pb-16">
            <Suspense fallback={<div className="flex items-center justify-center py-20"><RefreshCw className="w-8 h-8 animate-spin text-emerald-500" /></div>}>
            {activeTab === 'penjualan' && (
              <PenjualanDashboard
                calculatedProducts={calculatedProducts}
                bahanBaku={bahanBaku}
                productHpp={productHpp}
                detailResep={detailResep}
                toppings={toppings}
                onCompletePOSSale={handleCompletePOSSale}
                onProductionComplete={handleProductionComplete}
                wasteLogs={wasteLogs}
                cabangList={cabangList}
                suratOrders={suratOrders}
              />
            )}
            {activeTab === 'produksi' && (
              <ProduksiDashboard
                bahanBaku={bahanBaku}
                productHpp={productHpp}
                detailResep={detailResep}
                calculatedProducts={calculatedProducts}
                rdExperiments={rdExperiments}
                onAddProduct={handleAddProduct}
                onUpdateProductIngredients={handleUpdateProductIngredients}
                onDeleteProduct={handleDeleteProduct}
                onAddVariant={handleAddVariant}
                onUpdateVariant={handleUpdateVariant}
                onDeleteVariant={handleDeleteVariant}
                onAddRD={handleAddRD}
                onDeleteRD={handleDeleteRD}
                onProductionComplete={handleProductionComplete}
                showConfirm={showConfirm}
                toppings={toppings}
                onAddTopping={handleAddTopping}
                onDeleteTopping={handleDeleteTopping}
                showToast={showToast}
              />
            )}
            {activeTab === 'logistik' && (
              <LogistikDashboard
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
                onReturSuratOrder={handleReturSuratOrder}
                cabangStok={cabangStok}
                branchTransactions={branchTransactions}
                wasteLogs={wasteLogs}
                writeOffLogs={writeOffLogs}
                opnameDrafts={opnameDrafts}
                onApproveOpname={handleApproveOpname}
                onRejectOpname={handleRejectOpname}
                productHpp={productHpp}
                calculatedProducts={calculatedProducts}
                onAddWasteLog={handleAddWasteLog}
                onDeleteWasteLog={handleDeleteWasteLog}
                onAddWriteOff={handleAddWriteOff}
                onDeleteWriteOff={handleDeleteWriteOff}
                showConfirm={showConfirm}
              />
            )}
            {activeTab === 'strategi' && (
              <StrategiDashboard
                calculatedProducts={calculatedProducts}
                bahanBaku={bahanBaku}
                productHpp={productHpp}
                detailResep={detailResep}
                cabangList={cabangList}
                branchTransactions={branchTransactions}
                wasteTotalLoss={wasteTotalLoss}
                rdTotalCost={rdTotalCost}
                onWipeAllData={handleWipeAllData}
                onSyncToFirestore={handleSyncToFirestore}
                onUpdateProductPricing={handleUpdateProductPricing}
                onDeleteProduct={handleDeleteProduct}
                onEditMaterial={handleEditMaterial}
                showConfirm={showConfirm}
              />
            )}
            {activeTab === 'sistem' && (
              <SistemDashboard
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
                onReturSuratOrder={handleReturSuratOrder}
                cabangStok={cabangStok}
                branchTransactions={branchTransactions}
                wasteLogs={wasteLogs}
                opnameDrafts={opnameDrafts}
                onApproveOpname={handleApproveOpname}
                onRejectOpname={handleRejectOpname}
                productHpp={productHpp}
                calculatedProducts={calculatedProducts}
                detailResep={detailResep}
                showConfirm={showConfirm}
                onImportProduct={(product) => handleAddProduct(product, [])}
              />
            )}
            {activeTab === 'keuangan' && (
              <KeuanganDashboard
                calculatedProducts={calculatedProducts}
                bahanBaku={bahanBaku}
                cabangList={cabangList}
                branchTransactions={branchTransactions}
                wasteTotalLoss={wasteTotalLoss}
                rdTotalCost={rdTotalCost}
                onWipeAllData={handleWipeAllData}
                onSyncToFirestore={handleSyncToFirestore}
                showConfirm={showConfirm}
              />
            )}

          </Suspense>
          </div>
        </main>

        {/* FOOTER */}
        <footer className="bg-white border-t border-gray-150 py-3 px-6 text-center text-xs text-gray-400 shrink-0 select-none z-10 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>Sistem ERP Bakery Terintegrasi Google Sheets © 2026.</span>
          <span className="font-mono text-[10px] bg-slate-100 text-gray-500 px-2.5 py-1 rounded">
            Hak Akses: Administrasi Owner Sektor 123
          </span>
        </footer>

      </div>

      {/* TEMPLATE MODAL */}
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

      {/* TOAST SYSTEM */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border text-xs max-w-sm flex items-center gap-2.5 transition-all transform duration-300 translate-y-0 ${
              t.type === 'success'
                ? 'bg-emerald-950 text-white border-emerald-800'
                : t.type === 'error'
                ? 'bg-red-950 text-white border-red-800'
                : t.type === 'warning'
                ? 'bg-amber-950 text-white border-amber-700'
                : 'bg-slate-900 text-white border-slate-755'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : t.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            ) : t.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
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
function SidebarContent({ isSidebarOpen, setIsSidebarOpen, activeTab, setActiveTab, spreadsheetId, setSpreadsheetId, setSpreadsheetTitle, showToast, initiateGoogleConnect, handleOwnerLogout, confirmState, setConfirmState }: {
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
  confirmState: ConfirmState;
  setConfirmState: React.Dispatch<React.SetStateAction<ConfirmState>>;
}) {
  const sidebarBtn = (tabKey: string, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => { setActiveTab(tabKey); setIsSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
        activeTab === tabKey
          ? 'bg-emerald-600 text-white shadow-sm'
          : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
      }`}
    >
      <span className={`w-4 h-4 shrink-0 ${activeTab === tabKey ? 'text-white' : 'text-emerald-400'}`}>{icon}</span>
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[11px] font-bold text-white tracking-wider uppercase">Near Bakery & Co.</h2>
            <p className="text-[8px] text-emerald-400 font-semibold tracking-widest uppercase">ERP System</p>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(false)}
          className="p-1 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg cursor-pointer" title="Tutup Sidebar">
          <PanelRightClose className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3 bg-slate-800/30 border-b border-slate-700 text-xs flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[10px] font-bold font-mono text-emerald-400">OW</div>
          <div>
            <p className="font-semibold text-white text-[11px] truncate max-w-[100px]">Owner Toko</p>
            <p className="text-[8px] text-gray-500 font-mono">owner@bakery.id</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={initiateGoogleConnect} title="Hubungkan Google Sheets"
            className="p-1.5 hover:bg-slate-700 text-gray-500 hover:text-white rounded-lg transition-colors cursor-pointer flex items-center">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          </button>
          <button onClick={handleOwnerLogout} title="Logout"
            className="p-1.5 hover:bg-slate-700 text-gray-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer flex items-center">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-4 select-none scrollbar-thin">
        <div className="space-y-1">
          <span className="px-3 text-[8px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Penjualan</span>
          {sidebarBtn('penjualan', <ShoppingCart className="w-4 h-4" />, 'Kasir · Online · CRM · Chat')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[8px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Produksi</span>
          {sidebarBtn('produksi', <ClipboardList className="w-4 h-4" />, 'Resep · R&D · Kitchen')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[8px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Inventaris</span>
          {sidebarBtn('logistik', <Package className="w-4 h-4" />, 'Data Pusat · Stok · Expiry · Waste')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[8px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Strategi</span>
          {sidebarBtn('strategi', <BarChart3 className="w-4 h-4" />, 'Ringkasan · Modal · Anggaran')}
        </div>
        <div className="space-y-1">
          <span className="px-3 text-[8px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Sistem</span>
          {sidebarBtn('sistem', <Settings className="w-4 h-4" />, 'Data Pusat · Web Store · Backup')}
          {sidebarBtn('keuangan', <LineChart className="w-4 h-4" />, 'Dashboard Keuangan')}
        </div>
      </nav>

      <div className="p-3 border-t border-slate-700 bg-slate-800/30 flex flex-col gap-2 shrink-0">
        {spreadsheetId ? (
          <>
            <a href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`} target="_blank" rel="noreferrer"
              className="text-center text-[10px] text-emerald-400 bg-slate-800 border border-slate-700 hover:border-emerald-600/50 py-1.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
              <FileSpreadsheet className="w-3 h-3" /> Buka Spreadsheet ↗
            </a>
            <button onClick={() => {
              localStorage.removeItem('spreadsheet_url');
              setSpreadsheetId(null);
              setSpreadsheetTitle('');
              showToast('Koneksi Google Sheets diputuskan.', 'info');
            }}
              className="w-full py-1.5 text-center text-[10px] font-bold uppercase bg-slate-700 hover:bg-rose-700 hover:text-white text-slate-400 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5">
              <LogOut className="w-3 h-3" /> Putus Koneksi
            </button>
          </>
        ) : (
          <button onClick={initiateGoogleConnect}
            className="w-full py-1.5 text-center text-[10px] font-bold uppercase bg-emerald-600/10 hover:bg-emerald-700 hover:text-white text-emerald-400 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-emerald-800/30">
            <FileSpreadsheet className="w-3 h-3" /> Hubungkan Google Sheets
          </button>
        )}
<ConfirmModal state={confirmState} setState={setConfirmState} />
      </div>
    </>
  );
}
