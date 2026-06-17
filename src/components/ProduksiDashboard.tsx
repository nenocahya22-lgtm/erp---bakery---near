import React, { useState } from 'react';
import { BahanBaku, ProductHpp, DetailResep, CalculationResult } from '../types';
import RecipesTab from './RecipesTab';
import RdSandboxTab from './RdSandboxTab';
import SmartKitchenTab from './SmartKitchenTab';
import BomTab from './BomTab';
import ProductionCenterTab from './ProductionCenterTab';

interface ProduksiDashboardProps {
  bahanBaku: BahanBaku[];
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  calculatedProducts: CalculationResult[];
  rdExperiments: any[];
  onAddProduct: (p: ProductHpp) => void;
  onUpdateProductIngredients: (productName: string, ingredients: any[]) => void;
  onDeleteProduct: (name: string) => void;
  onAddVariant: (productName: string, variant: any) => void;
  onUpdateVariant: (productName: string, variantIdx: number, variant: any) => void;
  onDeleteVariant: (productName: string, variantIdx: number) => void;
  onAddRD: (exp: any) => void;
  onDeleteRD: (id: string) => void;
  onProductionComplete?: (productName: string, batchQty: number) => void;
}

export default function ProduksiDashboard(props: ProduksiDashboardProps) {
  const [subTab, setSubTab] = useState<'recipes' | 'rd' | 'smartkitchen' | 'bom' | 'production'>('recipes');

  const tabs = [
    { key: 'recipes' as const, label: '📝 Resep + Harga' },
    { key: 'production' as const, label: '🏭 Production Center' },
    { key: 'rd' as const, label: '🔬 Sandbox R&D' },
    { key: 'smartkitchen' as const, label: '🤖 Smart Kitchen' },
    { key: 'bom' as const, label: '🔧 BOM & Yield' },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 p-1.5 rounded-2xl flex gap-1 overflow-x-auto border border-slate-800">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider cursor-pointer transition-all ${
              subTab === t.key
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'recipes' && (
        <RecipesTab
          bahanBaku={props.bahanBaku}
          productHpp={props.productHpp}
          detailResep={props.detailResep}
          calculatedProducts={props.calculatedProducts}
          onAddProduct={props.onAddProduct}
          onUpdateProductIngredients={props.onUpdateProductIngredients}
          onDeleteProduct={props.onDeleteProduct}
          onAddVariant={props.onAddVariant}
          onUpdateVariant={props.onUpdateVariant}
          onDeleteVariant={props.onDeleteVariant}
        />
      )}
      {subTab === 'production' && (
        <ProductionCenterTab
          productHpp={props.productHpp}
          detailResep={props.detailResep}
          calculatedProducts={props.calculatedProducts}
          bahanBaku={props.bahanBaku}
          onProductionComplete={props.onProductionComplete || (() => {})}
        />
      )}
      {subTab === 'rd' && (
        <RdSandboxTab
          bahanBaku={props.bahanBaku}
          rdExperiments={props.rdExperiments}
          onAddRD={props.onAddRD}
          onDeleteRD={props.onDeleteRD}
        />
      )}
      {subTab === 'smartkitchen' && (
        <SmartKitchenTab
          bahanBaku={props.bahanBaku}
          productHpp={props.productHpp}
          detailResep={props.detailResep}
        />
      )}
      {subTab === 'bom' && (
        <BomTab productHpp={props.productHpp} calculatedProducts={props.calculatedProducts} />
      )}
    </div>
  );
}
