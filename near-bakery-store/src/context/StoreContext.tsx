/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  signInWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  setDoc,
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { Product, CartItem, Order, Notification, ChatRoom } from '../types';

interface StoreContextType {
  currentUser: any;
  userRole: 'pembeli' | 'penjual';
  setUserRole: (role: 'pembeli' | 'penjual') => void;
  isLoading: boolean;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, quantity: number) => void;
  clearCart: () => void;
  currentView: 'home' | 'product-detail' | 'cart' | 'checkout' | 'orders' | 'seller';
  setView: (view: 'home' | 'product-detail' | 'cart' | 'checkout' | 'orders' | 'seller') => void;
  selectedProductId: string | null;
  setSelectedProductId: (id: string | null) => void;
  activeCategory: string | null;
  setActiveCategory: (category: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  notifications: Notification[];
  unreadNotificationCount: number;
  markNotificationsAsRead: () => void;
  loginWithGoogle: () => Promise<void>;
  loginDemoUser: (role: 'buyer' | 'seller') => Promise<void>;
  logout: () => Promise<void>;
  triggerToast: (title: string, message: string) => void;
  toast: { title: string; message: string; show: boolean } | null;
  isLoginModalOpen: boolean;
  setLoginModalOpen: (open: boolean) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'pembeli' | 'penjual'>('pembeli');
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentView, setView] = useState<'home' | 'product-detail' | 'cart' | 'checkout' | 'orders' | 'seller'>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [toast, setToast] = useState<{ title: string; message: string; show: boolean } | null>(null);
  const [isLoginModalOpen, setLoginModalOpen] = useState(false);

  // Trigger custom in-app notifications/toasts
  const triggerToast = (title: string, message: string) => {
    setToast({ title, message, show: true });
    setTimeout(() => {
      setToast(prev => prev ? { ...prev, show: false } : null);
    }, 5000);
  };

  // Google Login helper
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      triggerToast('Login Berhasil', `Selamat datang kembali, ${result.user.displayName}!`);
      setLoginModalOpen(false);
    } catch (error: any) {
      console.error('Google Login Error:', error);
      if (error && (error.code === 'auth/popup-closed-by-user' || error.message?.includes('popup-closed-by-user'))) {
        triggerToast('Login Tertunda', 'Popup sign-in ditutup/diblokir. Silakan coba buka di tab baru,aktifkan popup, atau pakai Akun Demo kami!');
        setLoginModalOpen(true);
      } else {
        triggerToast('Gagal Login', 'Terjadi kesalahan saat masuk menggunakan akun Google Anda.');
      }
    }
  };

  // Sandbox demo mode login to jump roles easily
  const loginDemoUser = async (role: 'buyer' | 'seller') => {
    try {
      setIsLoading(true);
      // We will perform anonymous login for sandbox convenience
      const result = await signInAnonymously(auth);
      
      // Setup demo merchant profile or normal buyer profile
      if (role === 'seller') {
        // Create merchant collection record so firestore rules match "isMerchant()"
        const pathForMerchant = `merchants/${result.user.uid}`;
        try {
          await setDoc(doc(db, 'merchants', result.user.uid), {
            id: result.user.uid,
            name: 'Demo Penjual Toko',
            email: 'seller@webstore.com',
            createdAt: serverTimestamp()
          });
        } catch (e) {
          handleFirestoreError(e, OperationType.WRITE, pathForMerchant);
        }
        setUserRole('penjual');
        setView('seller');
        triggerToast('Demo Seller Aktif', 'Masuk sebagai Penjual (Akses Admin Lengkap).');
      } else {
        setUserRole('pembeli');
        setView('home');
        triggerToast('Demo Buyer Aktif', 'Masuk sebagai Pembeli.');
      }
    } catch (error) {
      console.error('Demo Login Error:', error);
      triggerToast('Gagal Demo Login', 'Gagal memuat akun uji coba.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCart([]);
      setView('home');
      setUserRole('pembeli');
      triggerToast('Keluar Akun', 'Anda telah berhasil keluar dari akun.');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Listen to Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        // If logged in user email matches admin, upgrade to merchant role automatically
        if (user.email === 'nenocahya22@gmail.com' || user.email === 'seller@webstore.com') {
          setUserRole('penjual');
          setView('seller');
        } else {
          setUserRole('pembeli');
        }
      } else {
        setUserRole('pembeli');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load cart from localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('webstore_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    }
  }, []);

  // Sync cart to localStorage
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem('webstore_cart', JSON.stringify(newCart));
  };

  const addToCart = (product: Product, quantity = 1) => {
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    let newCart = [...cart];

    if (existingIndex > -1) {
      const currentQty = newCart[existingIndex].quantity;
      if (currentQty + quantity > product.stock) {
        triggerToast('Stok Terbatas', `Maaf, stok bersih produk ini hanya tersisa ${product.stock} pcs.`);
        return;
      }
      newCart[existingIndex].quantity += quantity;
    } else {
      if (quantity > product.stock) {
        triggerToast('Stok Terbatas', `Maaf, stok produk yang tersedia hanya ${product.stock} pcs.`);
        return;
      }
      newCart.push({ product, quantity });
    }

    saveCart(newCart);
    triggerToast('Produk Ditambahkan', `${product.name} telah masuk keranjang.`);
  };

  const removeFromCart = (productId: string) => {
    const newCart = cart.filter(item => item.product.id !== productId);
    saveCart(newCart);
    triggerToast('Item Dihapus', 'Produk dikeluarkan dari keranjang belanja.');
  };

  const updateCartQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    const item = cart.find(i => i.product.id === productId);
    if (item && quantity > item.product.stock) {
      triggerToast('Stok Terbatas', `Stok tersedia hanya ${item.product.stock} pcs.`);
      return;
    }
    const newCart = cart.map(item => 
      item.product.id === productId ? { ...item, quantity } : item
    );
    saveCart(newCart);
  };

  const clearCart = () => {
    saveCart([]);
  };

  // Listen to User Notifications in Real-time from Firestore
  useEffect(() => {
    if (!currentUser) {
      setNotifications([]);
      return;
    }

    const pathForNotifications = 'notifications';
    const notificationsQuery = query(
      collection(db, pathForNotifications),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const list: Notification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          userId: data.userId,
          title: data.title,
          body: data.body,
          read: data.read,
          orderId: data.orderId,
          createdAt: data.createdAt
        });
      });
      setNotifications(list);

      // Trigger a toast for any new unread notification
      const latestNotification = list[0];
      if (latestNotification && !latestNotification.read) {
        // Double check if it is less than 3 seconds old to avoid toast spam on hook setup
        const isRecent = latestNotification.createdAt ? 
          (Date.now() - (latestNotification.createdAt.toMillis ? latestNotification.createdAt.toMillis() : Date.now())) < 5000 : true;
        if (isRecent) {
          triggerToast(latestNotification.title, latestNotification.body);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, pathForNotifications);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const markNotificationsAsRead = () => {
    notifications.forEach(async (notif) => {
      if (!notif.read) {
        try {
          await setDoc(doc(db, 'notifications', notif.id), { ...notif, read: true });
        } catch (e) {
          console.error(e);
        }
      }
    });
  };

  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  return (
    <StoreContext.Provider value={{
      currentUser,
      userRole,
      setUserRole,
      isLoading,
      cart,
      addToCart,
      removeFromCart,
      updateCartQty,
      clearCart,
      currentView,
      setView,
      selectedProductId,
      setSelectedProductId,
      activeCategory,
      setActiveCategory,
      searchQuery,
      setSearchQuery,
      notifications,
      unreadNotificationCount,
      markNotificationsAsRead,
      loginWithGoogle,
      loginDemoUser,
      logout,
      triggerToast,
      toast,
      isLoginModalOpen,
      setLoginModalOpen
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
