/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShoppingCart, Star, Eye, Plus } from 'lucide-react';
import { Product } from '../types';
import { useStore } from '../context/StoreContext';
import { formatRupiah } from '../utils';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, setView, setSelectedProductId } = useStore();

  const handleCardClick = () => {
    setSelectedProductId(product.id);
    setView('product-detail');
  };

  const firstCategoryWord = product.category ? product.category.split(' ')[0] : 'Menu';

  return (
    <div 
      className="group bg-white rounded-2xl border border-stone-200/80 overflow-hidden hover:shadow-md hover:border-emerald-300 transition-all duration-300 flex flex-col cursor-pointer relative"
      onClick={handleCardClick}
    >
      {/* Category Tag overlay */}
      <span className="absolute top-3 left-3 z-10 bg-white/95 text-emerald-800 text-[9px] tracking-wider font-extrabold uppercase px-2.5 py-1 rounded-full shadow-xs border border-emerald-100">
        {firstCategoryWord}
      </span>

      {/* Image Container with hover zoom */}
      <div className="w-full aspect-square overflow-hidden bg-stone-50 relative">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="bg-emerald-600 text-white px-3.5 py-2 rounded-full text-xs font-semibold uppercase flex items-center gap-1.5 shadow-md">
            <Eye size={13} />
            <span>Lihat Menu</span>
          </div>
        </div>
      </div>

      {/* Text Info footer */}
      <div className="p-4 flex flex-col flex-1 bg-white">
        <h4 className="text-xs md:text-sm font-semibold text-stone-900 group-hover:text-emerald-700 transition-colors line-clamp-2 h-10 mb-1.5 leading-snug">
          {product.name}
        </h4>
        
        {/* Rating and count */}
        <div className="flex items-center gap-1 mb-3">
          <Star size={12} fill="#f59e0b" stroke="none" />
          <span className="text-xs font-bold text-stone-700 font-sans">
            {product.rating ? product.rating.toFixed(1) : '5.0'}
          </span>
          <span className="text-[10px] text-stone-400 border-l border-stone-200 pl-1.5 ml-1.5">
            {product.reviewCount || 0} Ulasan
          </span>
        </div>

        {/* Price and Add button section */}
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-stone-100">
          <div className="text-left">
            <span className="text-stone-900 font-bold text-sm md:text-base block">
              {formatRupiah(product.price)}
            </span>
            <span className="text-[10px] text-stone-400">
              Stok: <span className={product.stock > 0 ? 'text-emerald-600 font-semibold' : 'text-red-500 font-semibold'}>{product.stock > 0 ? `${product.stock} pcs` : 'Habis'}</span>
            </span>
          </div>

          <button 
            id={`add-to-cart-${product.id}`}
            onClick={(e) => {
              e.stopPropagation();
              if (product.stock > 0) {
                addToCart(product);
              }
            }}
            disabled={product.stock <= 0}
            className={`h-8 w-8 rounded-full transition-all duration-200 flex items-center justify-center shadow-xs ${
              product.stock > 0 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 active:scale-95' 
                : 'bg-stone-100 text-stone-300 cursor-not-allowed'
            }`}
            title="Tambah Ke Keranjang"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};
