/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { CategorySlider } from './components/CategorySlider';
import { ProductCard } from './components/ProductCard';
import { ProductDetail } from './components/ProductDetail';
import { Cart } from './components/Cart';
import { Checkout } from './components/Checkout';
import { OrderTracking } from './components/OrderTracking';
import { LiveChat } from './components/LiveChat';
import { SellerDashboard } from './components/SellerDashboard';
import { LoginModal } from './components/LoginModal';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Product } from './types';
import { 
  Home as HomeIcon, 
  ShoppingCart, 
  ClipboardCheck, 
  Store, 
  MessageCircle, 
  ShoppingBag, 
  HelpCircle, 
  ArrowRight,
  TrendingUp,
  RotateCcw
} from 'lucide-react';

function AppContent() {
  const {
    currentView,
    setView,
    userRole,
    setUserRole,
    searchQuery,
    activeCategory,
    currentUser,
    loginWithGoogle,
    toast,
    triggerToast,
    setLoginModalOpen
  } = useStore();

  const isAdmin = currentUser?.email === 'nenocahya22@gmail.com' || currentUser?.email === 'seller@webstore.com';

  const [products, setProducts] = useState<Product[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  // Listen to Products database in real-time to render home catalog grid
  useEffect(() => {
    const productsCol = collection(db, 'products');
    const unsubscribe = onSnapshot(productsCol, (snapshot) => {
      const list: Product[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          name: data.name,
          description: data.description,
          price: data.price,
          stock: data.stock,
          imageUrl: data.imageUrl,
          category: data.category,
          rating: data.rating,
          reviewCount: data.reviewCount,
          createdAt: data.createdAt
        });
      });
      setProducts(list);
      setDbLoading(false);
    }, (error) => {
      console.error('Error fetching homes products:', error);
      setDbLoading(false);
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => unsubscribe();
  }, []);

  // Soft-filtering logic for Home view
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory ? p.category === activeCategory : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans text-stone-800 flex flex-col justify-between">
      {/* Top Banner, Utilities of the Nav */}
      <Navbar />

      {/* Primary app viewport container */}
      <main className="flex-1 w-full max-w-7xl mx-auto py-1">
        
        {/* VIEW: SELLER / ADMIN DASHBOARD */}
        {currentView === 'seller' ? (
          <SellerDashboard />
        ) : (
          /* BUYER PORTAL VIEWS */
          <div className="animate-fade-in duration-300">
            {currentView === 'home' && (
              <>
                {/* Visual Category picker header */}
                <CategorySlider />
                
                <div className="px-4 md:px-6 py-8 font-sans">
                  {/* Clean & Fresh Welcoming Banner */}
                  <div className="bg-gradient-to-br from-amber-50/70 via-amber-50/50 to-emerald-50/35 border border-amber-200/60 rounded-2xl p-8 md:p-12 text-stone-900 mb-8 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8 shadow-xs">
                    {/* Minimal decorative elegant details */}
                    <div className="absolute right-0 top-0 bottom-0 w-32 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.08] pointer-events-none" />
                    
                    <div className="max-w-2xl relative z-10 space-y-4 text-left">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-amber-800 font-sans text-xs tracking-wider uppercase font-bold">Dapur Ragi Near Bakery</span>
                      </div>
                      <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 leading-tight">
                        Roti & Pastry Hangat <br />
                        Dipanggang Segar <span className="text-emerald-700 italic font-medium font-serif">Setiap Hari</span>
                      </h1>
                      <p className="text-xs md:text-sm text-stone-600 leading-relaxed max-w-lg font-sans font-light">
                        Nikmati keaslian cita rasa Sourdough alami, croissant mentega renyah, dan aneka kue premium yang dibuat dengan sepenuh hati oleh baker berpengalaman.
                      </p>
                      
                      {!currentUser ? (
                        <div className="pt-2">
                          <button
                            onClick={() => setLoginModalOpen(true)}
                            className="bg-emerald-650 bg-emerald-600 hover:bg-emerald-750 text-white font-sans font-bold text-xs tracking-wider px-6 py-3 rounded-full transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
                          >
                            <span>Daftar & Pesan Sekarang</span>
                            <ArrowRight size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-4 items-center pt-2">
                          <span className="text-[10px] tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-250 px-3 py-1.5 rounded-full font-bold">Dapur Aktif</span>
                          <span className="text-xs text-stone-500 italic font-serif">Kue Segar Diproses Langsung Saat Keluar dari Oven</span>
                        </div>
                      )}
                    </div>

                    {/* Right art: Cozy Fresh Stamp */}
                    <div className="hidden lg:flex flex-col items-center justify-center p-5 border-2 border-dashed border-amber-300/65 rounded-full aspect-square w-32 h-32 bg-white/80 text-center relative shrink-0 shadow-xs">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-[9px] font-sans tracking-widest text-amber-800 uppercase font-black">100% ALAMI</span>
                        <span className="font-serif italic text-base text-stone-900 my-0.5">Ragi Alami</span>
                        <span className="text-[8px] font-sans text-stone-400 font-bold">TANPA PENGAWET</span>
                      </div>
                    </div>
                  </div>

                  {/* Products Grid list section */}
                  <div className="mb-6 flex items-center justify-between border-b border-stone-100 pb-4">
                    <h3 className="font-serif text-lg font-medium text-stone-900 tracking-wide">
                      <span>{activeCategory ? `${activeCategory}` : 'Pilihan Hari Ini'}</span>
                    </h3>
                    <span className="text-[11px] uppercase tracking-wider text-stone-400 font-medium font-mono">{filteredProducts.length} Sajian</span>
                  </div>

                  {dbLoading ? (
                    <div className="py-20 text-center flex flex-col items-center">
                      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-stone-900"></div>
                      <p className="text-xs text-stone-400 mt-2">Sedang menyinkronkan menu roti...</p>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-20 bg-white border border-stone-200/60 max-w-2xl mx-auto p-6">
                      <ShoppingBag className="mx-auto text-stone-200 mb-3" size={48} />
                      <h4 className="text-sm font-serif font-bold text-stone-850">Belum Ada Menu Tersedia</h4>
                      <p className="text-xs text-stone-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                        {isAdmin ? (
                          <span>Database Anda saat ini kosong atau kata kunci tidak sesuai. Masuk ke panel penjual untuk memuat menu hidangan contoh instan secara otomatis.</span>
                        ) : (
                          <span>Artisan Baker kami sedang menyiapkan hidangan segar berkualitas terbaik. Pantau terus halaman kami untuk pembaruan menu roti hangat segar langsung dari oven!</span>
                        )}
                      </p>
                      {isAdmin && (
                        <div className="mt-5 flex gap-2 justify-center">
                          <button
                            onClick={() => {
                              setUserRole('penjual');
                              setView('seller');
                            }}
                            className="bg-stone-900 hover:bg-black text-white font-bold text-xs px-5 py-3 uppercase tracking-wider cursor-pointer"
                          >
                            Masuk Panel Penjual (Baker Admin)
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 md:gap-6">
                      {filteredProducts.map((prod) => (
                        <ProductCard key={prod.id} product={prod} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {currentView === 'product-detail' && <ProductDetail />}
            {currentView === 'cart' && <Cart />}
            {currentView === 'checkout' && <Checkout />}
            {currentView === 'orders' && <OrderTracking />}
          </div>
        )}
      </main>

      {/* Floating customer-side LiveChat Bubble */}
      <LiveChat />

      {/* Bottom responsive layout navigation bar for mobile hp screens */}
      <footer className="md:hidden sticky bottom-0 z-30 w-full bg-white border-t border-gray-150 shadow-2xl py-1 px-4 flex justify-around items-center">
        <button
          onClick={() => {
            setUserRole('pembeli');
            setView('home');
          }}
          className={`flex flex-col items-center gap-0.5 p-1.5 focus:outline-hidden ${
            currentView === 'home' && userRole === 'pembeli' ? 'text-amber-800 font-extrabold' : 'text-gray-400'
          }`}
        >
          <HomeIcon size={19} />
          <span className="text-[9px] tracking-tight">Beranda</span>
        </button>

        <button
          onClick={() => {
            if (!currentUser) {
              triggerToast('Kunci', 'Masuk akun dahulu untuk melacak pesanan.');
              return;
            }
            setView('orders');
          }}
          className={`flex flex-col items-center gap-0.5 p-1.5 focus:outline-hidden ${
            currentView === 'orders' ? 'text-amber-800 font-extrabold' : 'text-gray-400'
          }`}
        >
          <ClipboardCheck size={19} />
          <span className="text-[9px] tracking-tight">Pesanan saya</span>
        </button>

        <button
          onClick={() => {
            if (!currentUser) {
              triggerToast('Akses Kunci', 'Masuk akun dahulu untuk berkirim pesan dengan Penjual.');
              return;
            }
            // Trigger clicking the floating chat box trigger
            const chatBall = document.getElementById('chat-floating-balloon');
            if (chatBall) {
              chatBall.click();
            } else {
              const bttn = document.getElementById('chat-tab-trigger');
              if (bttn) bttn.click();
            }
          }}
          className="flex flex-col items-center gap-0.5 p-1.5 text-gray-400 focus:outline-hidden"
        >
          <MessageCircle size={19} />
          <span className="text-[9px] tracking-tight font-medium">Chat</span>
        </button>

        {isAdmin && (
          <button
            onClick={() => {
              setUserRole('penjual');
              setView('seller');
            }}
            className={`flex flex-col items-center gap-0.5 p-1.5 focus:outline-hidden ${
              currentView === 'seller' ? 'text-amber-800 font-extrabold' : 'text-gray-400'
            }`}
          >
            <Store size={19} />
            <span className="text-[9px] tracking-tight">Toko Admin</span>
          </button>
        )}
      </footer>

      {/* Global Login Modal Auth portal */}
      <LoginModal />

      {/* Global Toast Notifier wrapper */}
      {toast && toast.show && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 border border-neutral-800 text-white shadow-2xl rounded-lg px-4.5 py-3 flex items-center justify-between gap-5 text-xs max-w-sm w-[90%] md:w-auto animate-fade-in">
          <div>
            <strong className="text-amber-400 uppercase tracking-wider text-[9px] block font-black mb-0.5">Notifikasi Sistem</strong>
            <p className="font-bold">{toast.title}</p>
            <p className="text-[11px] text-gray-300 mt-0.5 leading-tight">{toast.message}</p>
          </div>
          <button 
            onClick={() => triggerToast('', '')} 
            className="text-xs text-amber-400 hover:text-white font-extrabold bg-white/10 px-2 py-1 rounded"
          >
            OK
          </button>
        </div>
      )}

      {/* Simple desktop desktop-friendly banner info */}
      <div className="hidden lg:block bg-gray-100 border-t border-gray-150 py-3 text-center text-[10px] text-gray-400">
        © 2026 Near Bakery & Co. Olahan Ragi Segar Alami & Pâtisserie Premium Langsung dari Oven Anda.
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
