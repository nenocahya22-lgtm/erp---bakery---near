# 📊 Audit Performa — Near Bakery & Co. ERP

## Ringkasan

| Metrik | Status | Detail |
|---|---|---|
| **Bundle Splitting** | ✅ Baik | manualChunks untuk react, lucide, jspdf |
| **Lazy Loading** | ✅ Sangat Baik | Semua 5 dashboard (Keuangan, Logistik, Produksi, Penjualan, Strategi, Sistem) lazy-loaded |
| **Loading Skeleton** | ✅ Baik | TabSuspense dengan animasi pulse |
| **CSS Minifikasi** | ✅ Aktif | cssMinify: true, tailwind di-purge otomatis |
| **Sourcemaps** | ✅ Nonaktif (production) | sourcemap: false |
| **Minifier** | ⚠️ Bisa ditingkatkan | esbuild → bisa diganti terser untuk kompresi lebih agresif |
| **Chunk Warning** | ✅ 500KB | chunkSizeWarningLimit: 500 |
| **Memoization** | ✅ Baik | useMemo, useCallback, useRef sudah digunakan |

---

## Status Saat Ini

### ✅ Sudah Dioptimasi

1. **Code Splitting per Dashboard**
   - `KeuanganDashboard`, `LogistikDashboard`, `ProduksiDashboard`, `PenjualanDashboard`, `StrategiDashboard`, `SistemDashboard`
   - Semua lazy-loaded via `retryLazy()` dengan auto-retry mechanism
   - Loading skeleton animated di TabSuspense

2. **Vendor Chunking (vite.config.ts)**
   ```
   manualChunks: {
     'vendor-react': ['react', 'react-dom'],
     'vendor-lucide': ['lucide-react'],
     'vendor-pdf': ['jspdf'],
   }
   ```

3. **Optimasi Build**
   - `minify: 'esbuild'` — cepat, kompresi cukup baik
   - `cssMinify: true`
   - `sourcemap: false` — tidak ada sourcemap di production

4. **Performance Patterns di Kode**
   - `React.useMemo()` untuk branch filters, cart totals, landing data
   - `useRef()` untuk stale-closure-safe access (bahanBakuRef, productHppRef, dll)
   - Debounced localStorage writes (500ms debounce di useERPData)
   - Potongan array >500 item otomatis di-trim

---

## Rekomendasi Optimasi

### 1. 🔴 Split Firebase menjadi Chunk Terpisah
**File:** `vite.config.ts`

```javascript
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-lucide': ['lucide-react'],
  'vendor-pdf': ['jspdf'],
  'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage'],
  'vendor-charts': ['recharts'],
}
```

**Dampak:** Firebase ~150-200KB gzip akan dipisah dari main bundle. User tidak perlu download ulang Firebase jika hanya mengupdate komponen ERP.

### 2. 🟡 Image Optimization untuk Recipe Images
**File:** Banyak komponen (PosKasirTab, ProduksiDashboard, dll)

- Recipe images disimpan sebagai base64 di localStorage → sangat boros (bisa >10MB)
- **Rekomendasi:** Konversi ke blob URL dengan `URL.createObjectURL()` atau upload ke Firebase Storage
- Alternatif: Kompresi gambar sebelum disimpan (canvas resize ke max 300px)

### 3. 🟡 React.memo untuk Pure Components
Beberapa komponen yang jarang berubah cocok untuk `React.memo()`:
- `PengaturanSystemTab` — hanya berubah saat user interaksi
- `WebStore*Section` components — hanya render ulang saat props berubah
- `ConfirmModal` — modal statis

### 4. 🟢 Virtual Scroll untuk Data List Besar
**File:** `LogistikDashboard.tsx`, `DataPusatBahanSection.tsx`

Data bahan baku dan produk bisa mencapai 100+ item. Virtual scrolling (react-window atau react-virtuoso) akan meningkatkan performa render.

### 5. 🟢 Pindahkan localStorage ke IndexedDB untuk Data >1MB
**File:** `useERPData.ts`

Data ERP (bahan baku, resep, produk) bisa total >5MB. localStorage limit 5-10MB per domain.
- **Rekomendasi:** Gunakan IndexedDB (via idb wrapper) untuk data besar
- localStorage tetap dipakai untuk konfigurasi kecil (theme, language, dll)

### 6. 🟢 Preload Tab yang Sering Diakses
**File:** `App.tsx`

Jika tab "Keuangan" adalah default, preload chunk-nya saat idle:
```javascript
const preloadTabs = ['keuangan', 'penjualan'];
useEffect(() => {
  // Prefetch chunks saat browser idle
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = '/assets/KeuanganDashboard-xxxx.js';
  document.head.appendChild(link);
}, []);
```

### 7. ⚪ Periodic Chunk Cleanup
**File:** `PengaturanSystemTab.tsx` (sudah ada periodic cleanup tiap 30 menit)

Tambahkan cleanup untuk cache gambar recipe yang sudah tidak terpakai (produk yang sudah dihapus).

---

## Estimasi Dampak

| Optimasi | Estimasi Perbaikan | Prioritas |
|---|---|---|
| Firebase chunk split | ~150-200KB lebih kecil di main bundle | 🔴 Tinggi |
| Image optimization | 5-10MB lebih hemat localStorage | 🟡 Sedang |
| React.memo | 10-30% lebih sedikit re-render | 🟡 Sedang |
| Virtual scroll | Smooth scrolling untuk 100+ item | 🟢 Rendah |
| IndexedDB migration | Bisa simpan data >10MB | 🟢 Rendah |
| Preload tab | 200-500ms faster tab switch | 🟢 Rendah |

---

## Bundle Size Estimasi Saat Ini

| Chunk | Estimasi Size | Notes |
|---|---|---|
| `vendor-react` | ~150 KB (gzip ~45 KB) | React 19 + React DOM |
| `vendor-lucide` | ~100 KB (gzip ~30 KB) | Banyak icon di-import |
| `vendor-pdf` | ~70 KB (gzip ~20 KB) | jsPDF |
| Main App.tsx | ~50 KB (gzip ~15 KB) | Layout, sidebar, hooks |
| Dashboard chunks | ~30-50 KB each | Per dashboard tab |
| **Total First Load** | **~400 KB (gzip ~130 KB)** | Tanpa Firebase chunk split |

Dengan Firebase chunk terpisah: **Main bundle turun ke ~250 KB (gzip ~80 KB)**
