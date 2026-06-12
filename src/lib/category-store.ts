import { safeGetLocalStorage, safeSetLocalStorage } from './safe-json';

const STORAGE_KEY = 'shared_categories_data';

export interface CategoryStore {
  categories: string[];
  categoryIcons: Record<string, string>;
  lastUpdated: string;
}

export const DEFAULT_SHARED_CATEGORIES: CategoryStore = {
  categories: [
    'Roti & Sourdough',
    'Viennoiserie & Croissant',
    'Kue & Tart',
    'Kue Kering & Cookies',
    'Minuman Kopi & Teh',
  ],
  categoryIcons: {
    'Roti & Sourdough': 'wheat',
    'Viennoiserie & Croissant': 'croissant',
    'Kue & Tart': 'cake',
    'Kue Kering & Cookies': 'cookie',
    'Minuman Kopi & Teh': 'coffee',
  },
  lastUpdated: new Date().toISOString(),
};

/** Ambil kategori dari shared store — fallback ke default jika belum ada */
export function getSharedCategories(): CategoryStore {
  const stored = safeGetLocalStorage<CategoryStore | null>(STORAGE_KEY, null);
  if (stored && stored.categories && stored.categories.length > 0) {
    return stored;
  }
  return { ...DEFAULT_SHARED_CATEGORIES, lastUpdated: new Date().toISOString() };
}

/** Simpan kategori ke shared store */
export function setSharedCategories(data: Omit<CategoryStore, 'lastUpdated'>): void {
  safeSetLocalStorage(STORAGE_KEY, {
    ...data,
    lastUpdated: new Date().toISOString(),
  });
}

/** Ambil daftar nama kategori saja (untuk filter, dll) */
export function getSharedCategoryNames(): string[] {
  return getSharedCategories().categories;
}

/** Ambil icons */
export function getSharedCategoryIcons(): Record<string, string> {
  return getSharedCategories().categoryIcons;
}

/** Tambah kategori baru ke shared store */
export function addSharedCategory(name: string, icon: string = 'package'): boolean {
  const store = getSharedCategories();
  if (store.categories.some(c => c.toLowerCase() === name.toLowerCase())) {
    return false; // sudah ada
  }
  store.categories.push(name);
  store.categoryIcons[name] = icon;
  setSharedCategories(store);
  return true;
}

/** Hapus kategori dari shared store */
export function removeSharedCategory(name: string): void {
  const store = getSharedCategories();
  store.categories = store.categories.filter(c => c !== name);
  delete store.categoryIcons[name];
  setSharedCategories(store);
}

/** Ubah nama kategori */
export function renameSharedCategory(oldName: string, newName: string): boolean {
  const store = getSharedCategories();
  if (store.categories.some(c => c.toLowerCase() === newName.toLowerCase() && c !== oldName)) {
    return false; // sudah ada
  }
  const icon = store.categoryIcons[oldName] || 'package';
  store.categories = store.categories.map(c => c === oldName ? newName : c);
  delete store.categoryIcons[oldName];
  store.categoryIcons[newName] = icon;
  setSharedCategories(store);
  return true;
}
