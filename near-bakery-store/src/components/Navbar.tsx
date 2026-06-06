/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShoppingCart, Bell, MessageSquare, LogOut, Search, Store, LogIn, Croissant, User } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    userRole,
    setUserRole,
    cart,
    setView,
    currentView,
    searchQuery,
    setSearchQuery,
    notifications,
    unreadNotificationCount,
    markNotificationsAsRead,
    loginWithGoogle,
    logout,
    triggerToast,
    setLoginModalOpen
  } = useStore();

  const [showNotifications, setShowNotifications] = useState(false);
  const cartItemsCount = cart.reduce((total, item) => total + item.quantity, 0);
  const isAdmin = currentUser?.email === 'nenocahya22@gmail.com' || currentUser?.email === 'seller@webstore.com';

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    if (currentView !== 'home') {
      setView('home');
    }
  };

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      markNotificationsAsRead();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-stone-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-4">
        
        {/* Simple Brand Logo - Clean, Uncluttered */}
        <button 
          id="nav-logo"
          onClick={() => {
            setView('home');
            setSearchQuery('');
          }} 
          className="flex items-center gap-2 select-none focus:outline-hidden text-left group shrink-0"
        >
          <div className="bg-emerald-600 text-white p-2.5 rounded-full shadow-xs group-hover:bg-emerald-700 group-hover:scale-105 transition-all flex items-center justify-center">
            <Croissant size={18} className="stroke-[2]" />
          </div>
          <span className="font-serif tracking-widest text-lg font-black text-stone-900 group-hover:text-emerald-700 transition-colors">
            NEAR BAKERY
          </span>
        </button>

        {/* Search bar - Bright, clean and highly visible */}
        <div className="hidden sm:block flex-1 max-w-md relative">
          <div className="relative">
            <input
              id="search-input"
              type="text"
              placeholder="Cari sourdough segar, croissant renyah, kue..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-4 pr-10 py-2 rounded-full bg-stone-50 border border-stone-200 text-stone-800 placeholder-stone-400 text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
            />
            <Search className="absolute right-3.5 top-2.5 text-stone-400" size={14} />
          </div>
        </div>

        {/* Essential Navigation Controls */}
        <div className="flex items-center gap-3">
          
          {/* Admin Switch (Visible ONLY to actual shop owners) */}
          {currentUser && isAdmin && (
            <button 
              onClick={() => {
                if (userRole === 'pembeli') {
                  setUserRole('penjual');
                  setView('seller');
                } else {
                  setUserRole('pembeli');
                  setView('home');
                }
              }}
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 hover:border-amber-300 px-3 py-1.5 rounded-full transition-colors text-[11px] font-bold tracking-wide"
            >
              <Store size={12} />
              <span>{userRole === 'pembeli' ? 'Baker Admin' : 'Halaman Pembeli'}</span>
            </button>
          )}

          {/* Notifications Panel */}
          <div className="relative">
            <button 
              id="nav-bell"
              onClick={handleBellClick} 
              className="p-2 rounded-full hover:bg-stone-50 border border-stone-200/40 text-stone-600 hover:text-stone-900 transition-all relative focus:outline-hidden"
              title="Notifikasi"
            >
              <Bell size={18} />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[8px] font-bold h-4.5 w-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-3.5 w-80 bg-white text-stone-800 rounded-2xl shadow-xl border border-stone-150 overflow-hidden z-50 animate-fade-in">
                <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 font-sans tracking-wide text-stone-900 text-xs font-bold flex justify-between items-center">
                  <span>Pesan & Layanan ({unreadNotificationCount} Baru)</span>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-stone-400 hover:text-stone-700 text-xs cursor-pointer font-medium"
                  >
                    Tutup
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto font-sans text-xs">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-stone-450 italic">
                      Belum ada pembaruan aktivitas pemanggangan.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`px-4 py-3 border-b border-stone-100 hover:bg-stone-50 cursor-pointer transition-colors ${!notif.read ? 'bg-amber-50/40 font-medium' : ''}`}
                        onClick={() => {
                          if (notif.orderId) {
                            setView('orders');
                          }
                          setShowNotifications(false);
                        }}
                      >
                        <h4 className="font-semibold text-emerald-800">{notif.title}</h4>
                        <p className="text-stone-600 mt-0.5">{notif.body}</p>
                        <span className="text-[9px] text-stone-400 block mt-1 font-mono">
                          {notif.createdAt ? new Date(notif.createdAt.seconds * 1000).toLocaleString('id-ID') : 'Baru saja'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Customer Chat Button */}
          <button 
            id="nav-chat"
            onClick={() => {
              if (!currentUser) {
                triggerToast('Akses Ditolak', 'Silakan masuk akun terlebih dahulu untuk berdiskusi dengan Penjual.');
                return;
              }
              setView(userRole === 'penjual' ? 'seller' : 'home');
              const chatTab = document.getElementById('chat-tab-trigger');
              if (chatTab) chatTab.click();
            }}
            className="p-2 rounded-full hover:bg-stone-50 border border-stone-200/40 text-stone-600 hover:text-stone-900 transition-all"
            title="Chat Barista & Baker"
          >
            <MessageSquare size={18} />
          </button>

          {/* Cart Icon */}
          <button 
            id="nav-cart"
            onClick={() => setView('cart')} 
            className="p-2 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-full transition-all flex items-center gap-1.5 focus:outline-hidden"
          >
            <ShoppingCart size={15} />
            <span className="text-xs font-bold font-sans">Keranjang</span>
            {cartItemsCount > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] font-bold h-4.5 w-4.5 rounded-full flex items-center justify-center shadow-xs">
                {cartItemsCount}
              </span>
            )}
          </button>

          {/* Single clean Google login element */}
          <div className="h-5 w-[1px] bg-stone-200 hidden sm:block" />

          {currentUser ? (
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-stone-700 bg-stone-50 border border-stone-150 rounded-full px-3 py-1 text-xs">
                <User size={12} className="text-stone-400" />
                <span className="font-medium max-w-[80px] truncate">
                  {currentUser.displayName || currentUser.email?.split('@')[0] || 'Guest'}
                </span>
              </div>
              <button 
                onClick={logout} 
                className="p-2 rounded-full hover:bg-red-50 text-stone-400 hover:text-red-500 transition-colors"
                title="Keluar"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setLoginModalOpen(true)} 
              className="hidden sm:flex items-center gap-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-xs transition-colors"
            >
              <LogIn size={13} className="text-emerald-600" />
              <span>Masuk</span>
            </button>
          )}

        </div>
      </div>

      {/* Mobile search bar sub-lane */}
      <div className="sm:hidden px-4 pb-3 pt-0.5 border-t border-stone-100">
        <div className="relative">
          <input
            type="text"
            placeholder="Cari menu ragi, croissant, pastry..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full pl-4 pr-10 py-2 rounded-full bg-stone-50 border border-stone-150 text-stone-800 placeholder-stone-400 text-xs focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-all shadow-inner"
          />
          <Search className="absolute right-3.5 top-2.5 text-stone-450" size={13} />
        </div>
      </div>

    </header>
  );
};
