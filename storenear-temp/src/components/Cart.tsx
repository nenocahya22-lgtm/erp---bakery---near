/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trash2, ArrowLeft, ShoppingBag, Plus, Minus, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatRupiah } from '../utils';

export const Cart: React.FC = () => {
  const { cart, updateCartQty, removeFromCart, setView, clearCart } = useStore();

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (cart.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20 text-center flex flex-col items-center justify-center font-sans animate-fade-in">
        <div className="p-5 bg-stone-50 border border-stone-200/65 text-stone-700 mb-4 rounded-none">
          <ShoppingBag size={28} />
        </div>
        <h3 className="text-sm font-serif font-bold text-stone-900 mb-1.5 uppercase tracking-wide">Piring Belanja Masih Kosong</h3>
        <p className="text-xs text-stone-500 mb-6 max-w-sm leading-relaxed">
          Yuk isi dengan menu lezat kesukaanmu untuk memulai transaksi ragi hangat Near Bakery & Co.!
        </p>
        <button
          onClick={() => setView('home')}
          className="bg-stone-900 hover:bg-black text-white font-sans font-medium px-6 py-3.5 rounded-none text-xs tracking-[0.15em] uppercase transition-colors cursor-pointer"
        >
          Lihat Koleksi Roti
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 pb-20 font-sans animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <button 
          onClick={() => setView('home')} 
          className="flex items-center gap-2 text-xs font-bold text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-[0.15em] focus:outline-hidden align-self-start cursor-pointer"
        >
          <ArrowLeft size={12} />
          <span>Kembali Ke Produk</span>
        </button>
        <div className="flex justify-between items-center w-full md:w-auto pb-2 md:pb-0">
          <h2 className="text-sm uppercase tracking-wider font-sans font-bold text-stone-900">Keranjang Belanja ({totalQty} Sajian)</h2>
          <button 
            onClick={clearCart}
            className="md:ml-5 text-xs font-bold tracking-wider uppercase text-red-500 hover:text-red-700 cursor-pointer"
          >
            Kosongkan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Item grid */}
        <div className="lg:col-span-8 space-y-4">
          {cart.map((item) => (
            <div 
              key={item.product.id}
              className="bg-white border border-stone-200/50 rounded-none p-4.5 flex gap-4 hover:border-stone-300 transition-colors relative"
            >
              {/* Product thumbnail */}
              <div className="w-20 h-20 bg-stone-100 border border-stone-100 rounded-none overflow-hidden shrink-0">
                <img 
                  src={item.product.imageUrl} 
                  alt={item.product.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Product description and controls */}
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-xs font-serif font-bold text-stone-900 truncate pr-4">
                      {item.product.name}
                    </h4>
                    <button 
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-stone-400 hover:text-red-500 transition-colors shrink-0 cursor-pointer"
                      title="Keluarkan"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <span className="text-[9px] text-stone-400 tracking-wider uppercase mt-1 block">
                    {item.product.category}
                  </span>
                </div>

                <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                  <span className="text-stone-900 font-serif font-bold text-sm">
                    {formatRupiah(item.product.price)}
                  </span>
                  
                  {/* Quantity adjustor */}
                  <div className="flex items-center gap-1 border border-stone-200 rounded-none bg-white p-0.5 scale-90 origin-right">
                    <button 
                      onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                      className="p-1 bg-white text-stone-400 hover:text-stone-900 rounded-none cursor-pointer"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="w-8 text-center text-xs font-mono font-bold text-stone-800">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                      className="p-1 bg-white text-stone-400 hover:text-stone-900 rounded-none cursor-pointer"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right side: Summary and pricing details */}
        <div className="lg:col-span-4 bg-white border border-stone-200/50 rounded-none p-6">
          <h3 className="text-xs uppercase font-bold text-stone-950 tracking-[0.15em] mb-4 border-b border-stone-100 pb-2.5 font-sans">Ringkasan Saji</h3>
          
          <div className="space-y-3.5 pb-4 border-b border-stone-100 text-xs font-sans text-stone-500">
            <div className="flex justify-between">
              <span>Subtotal ({totalQty} Sajian)</span>
              <span className="font-semibold text-stone-900">{formatRupiah(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Layanan Kurir</span>
              <span className="text-[#A68A77] font-bold uppercase tracking-wider text-[9px]">Bebas Ongkir</span>
            </div>
            <div className="flex justify-between">
              <span>Biaya Pengemasan</span>
              <span className="font-semibold text-stone-400">-</span>
            </div>
          </div>

          <div className="flex justify-between py-4 text-sm font-bold text-stone-900 font-serif">
            <span>Total Pembayaran</span>
            <span className="text-stone-900 text-base font-bold">{formatRupiah(subtotal)}</span>
          </div>

          <button
            onClick={() => setView('checkout')}
            className="w-full bg-stone-900 hover:bg-black text-white font-sans font-medium py-3.5 px-4 rounded-none text-xs tracking-[0.15em] uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Lanjut Ke Pembayaran</span>
            <ArrowRight size={12} />
          </button>
          
          <div className="mt-4 text-center">
            <span className="text-[9px] text-stone-400 block tracking-wide">
              🛡️ Enkripsi transaksi aman bakeri Near Bakery & Co
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
