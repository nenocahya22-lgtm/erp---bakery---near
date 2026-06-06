/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CATEGORIES } from '../data/presets';
import { useStore } from '../context/StoreContext';
import { Wheat, Croissant, Cake, Cookie, Coffee, Sparkles } from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Roti & Sourdough': <Wheat size={14} />,
  'Viennoiserie & Croissant': <Croissant size={14} />,
  'Kue & Tart': <Cake size={14} />,
  'Kue Kering & Cookies': <Cookie size={14} />,
  'Minuman Kopi & Teh': <Coffee size={14} />
};

export const CategorySlider: React.FC = () => {
  const { activeCategory, setActiveCategory } = useStore();

  return (
    <div className="w-full bg-stone-50/60 border-b border-stone-200/50 py-5">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        
        {/* Fresh, High-Contrast Header */}
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-amber-500 animate-pulse" />
          <span className="text-[11px] uppercase tracking-[0.15em] font-extrabold text-stone-500 font-sans">
            Pilih Kategori Hidangan Segar
          </span>
        </div>
        
        {/* Tap-friendly Category Pills for Everyone */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x touch-pan-x font-sans">
          
          <button
            key="all-categories"
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer snap-start whitespace-nowrap flex items-center gap-1.5 border ${
              activeCategory === null
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-900'
            }`}
          >
            <span>Semua Hidangan</span>
          </button>

          {CATEGORIES.map((cat) => {
            const isSelected = activeCategory === cat;
            const icon = CATEGORY_ICONS[cat];
            
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer snap-start whitespace-nowrap flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                {icon && <span className={isSelected ? 'text-white' : 'text-stone-400'}>{icon}</span>}
                <span>{cat}</span>
              </button>
            );
          })}
          
        </div>
      </div>
    </div>
  );
};
