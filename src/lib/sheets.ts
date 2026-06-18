import { BahanBaku, ProductHpp, DetailResep } from '../types';

// ─── RETRY QUEUE — Antrian sinkronisasi gagal dengan exponential backoff ───
interface QueuedSync {
  id: string;
  type: 'save_project' | 'save_revenue';
  token: string;
  spreadsheetId: string;
  data?: { bahanBaku: BahanBaku[]; productHpp: ProductHpp[]; detailResep: DetailResep[] };
  revenueData?: { id: string; time: string; product: string; qty: number; amount: number; source: string; date: string }[];
  retryCount: number;
  nextRetryAt: number; // timestamp
}

let syncQueue: QueuedSync[] = [];
let isProcessingQueue = false;

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 30_000; // 30 detik

function getRetryDelay(attempt: number): number {
  // Exponential backoff: 30s, 60s, 120s, 240s, 480s
  return BASE_DELAY_MS * Math.pow(2, attempt - 1);
}

/** Tambah sync gagal ke antrian retry */
export function enqueueFailedSync(entry: Omit<QueuedSync, 'id' | 'retryCount' | 'nextRetryAt'>): void {
  const existing = syncQueue.find(s => s.type === entry.type && s.spreadsheetId === entry.spreadsheetId);
  if (existing) {
    // Update existing entry dengan data terbaru + reset retry
    existing.data = entry.data;
    existing.revenueData = entry.revenueData;
    existing.retryCount = 0;
    existing.nextRetryAt = Date.now() + getRetryDelay(1);
    return;
  }
  syncQueue.push({
    ...entry,
    id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    retryCount: 0,
    nextRetryAt: Date.now() + getRetryDelay(1),
  });
  processQueue();
}

/** Proses antrian — panggil otomatis setiap kali ada entry baru */
async function processQueue(): Promise<void> {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (syncQueue.length > 0) {
    const now = Date.now();
    const entry = syncQueue[0];

    if (entry.nextRetryAt > now) {
      // Belum waktunya retry — tunggu
      await new Promise(r => setTimeout(r, entry.nextRetryAt - now));
    }

    try {
      if (entry.type === 'save_project' && entry.data) {
        await saveProjectDataToSheets(entry.token, entry.spreadsheetId, entry.data);
      } else if (entry.type === 'save_revenue' && entry.revenueData) {
        await saveRevenueToSheets(entry.token, entry.spreadsheetId, entry.revenueData);
      }
      // Sukses — hapus dari antrian
      syncQueue.shift();
      console.log(`✅ Retry sukses: ${entry.type} ke ${entry.spreadsheetId}`);
    } catch (err) {
      entry.retryCount++;
      if (entry.retryCount >= MAX_RETRIES) {
        console.error(`❌ Retry habis (${MAX_RETRIES}x) untuk ${entry.type}:`, err);
        syncQueue.shift(); // Buang setelah max retry
      } else {
        entry.nextRetryAt = Date.now() + getRetryDelay(entry.retryCount);
        console.warn(`⏳ Retry ${entry.retryCount}/${MAX_RETRIES} untuk ${entry.type} dalam ${getRetryDelay(entry.retryCount)/1000}s`);
        // Pindah ke belakang antrian
        syncQueue.shift();
        syncQueue.push(entry);
      }
    }
  }

  isProcessingQueue = false;
}

export function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export async function getSpreadsheetDetails(accessToken: string, spreadsheetId: string) {
  const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to fetch spreadsheet details: ${response.status}`);
  }

  return response.json();
}

export async function fetchSheetValues(accessToken: string, spreadsheetId: string, range: string): Promise<any[][]> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return [];
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to read sheet values: ${response.status}`);
  }

  const data = await response.json();
  return data.values || [];
}

export async function clearSheetValues(accessToken: string, spreadsheetId: string, sheetName: string): Promise<void> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:clear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to clear sheet ${sheetName}`);
  }
}

export async function updateSheetValues(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<void> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values,
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to update sheet values: ${response.status}`);
  }
}

/**
 * Batch clear multiple sheet ranges in ONE API call (mengurangi race condition).
 * Lebih aman daripada clearSheetValues sequential yang punya window data loss.
 */
export async function batchClearSheetValues(
  accessToken: string,
  spreadsheetId: string,
  ranges: string[]
): Promise<void> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ranges }),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to batch clear sheets: ${response.status}`);
  }
}

/**
 * Batch update multiple sheet ranges in ONE API call (mengurangi race condition).
 */
export async function batchUpdateSheetValues(
  accessToken: string,
  spreadsheetId: string,
  data: { range: string; values: any[][] }[]
): Promise<void> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data,
      }),
    }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed to batch update sheet values: ${response.status}`);
  }
}

export interface SheetsData {
  bahanBaku: BahanBaku[];
  productHpp: ProductHpp[];
  detailResep: DetailResep[];
  sheetTitles: string[];
}

export async function loadProjectDataFromSheets(accessToken: string, spreadsheetId: string): Promise<SheetsData> {
  const details = await getSpreadsheetDetails(accessToken, spreadsheetId);
  const sheetTitles = details.sheets?.map((s: any) => s.properties?.title as string) || [];

  const data: SheetsData = {
    bahanBaku: [],
    productHpp: [],
    detailResep: [],
    sheetTitles,
  };

  // 1. Parse 'Bahan Baku' sheet
  if (sheetTitles.includes('Bahan Baku')) {
    const rows = await fetchSheetValues(accessToken, spreadsheetId, 'Bahan Baku!A1:H1000');
    if (rows.length > 1) {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0]) {
          const hargaBeli = parseFloat(row[2]) || 0;
          const isiKemasan = parseFloat(row[3]) || 1;
          const hargaBeliReal = row[5] !== undefined ? (parseFloat(row[5]) || hargaBeli) : hargaBeli;
          const hargaSatuanReal = row[6] !== undefined ? (parseFloat(row[6]) || (hargaBeliReal / (isiKemasan || 1))) : (hargaBeliReal / (isiKemasan || 1));
          const markupPercent = row[7] !== undefined ? (parseFloat(row[7]) || 0) : 0;
          
          data.bahanBaku.push({
            nama: String(row[0]).trim(),
            satuan: String(row[1] || 'gr').trim(),
            hargaBeli,
            isiKemasan,
            hargaSatuan: parseFloat(row[4]) || (hargaBeli / (isiKemasan || 1)),
            hargaBeliReal,
            hargaSatuanReal,
            markupPercent,
          });
        }
      }
    }
  }

  // 2. Parse 'HPP Produk' sheet
  if (sheetTitles.includes('HPP Produk')) {
    const rows = await fetchSheetValues(accessToken, spreadsheetId, 'HPP Produk!A1:D1000');
    if (rows.length > 1) {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0]) {
          data.productHpp.push({
            namaProduk: String(row[0]).trim(),
            porsiJual: parseFloat(row[1]) || 1,
            hargaJual: parseFloat(row[2]) || 0,
          });
        }
      }
    }
  }

  // 3. Parse 'Resep Detail' sheet
  if (sheetTitles.includes('Resep Detail')) {
    const rows = await fetchSheetValues(accessToken, spreadsheetId, 'Resep Detail!A1:C2000');
    if (rows.length > 1) {
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[0] && row[1]) {
          data.detailResep.push({
            namaProduk: String(row[0]).trim(),
            namaBahan: String(row[1]).trim(),
            takaran: parseFloat(row[2]) || 0,
          });
        }
      }
    }
  }

  return data;
}

export async function createAndInitializeTemplates(
  accessToken: string,
  spreadsheetId: string,
  sheetTitles: string[]
): Promise<void> {
  const sheetsToCreate = [];
  if (!sheetTitles.includes('Bahan Baku')) sheetsToCreate.push('Bahan Baku');
  if (!sheetTitles.includes('HPP Produk')) sheetsToCreate.push('HPP Produk');
  if (!sheetTitles.includes('Resep Detail')) sheetsToCreate.push('Resep Detail');

  if (sheetsToCreate.length > 0) {
    const requests = sheetsToCreate.map((title) => ({
      addSheet: {
        properties: {
          title,
        },
      },
    }));

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to create template sheets in your Google Sheet file.');
    }
  }

  // Hanya buat header kolom — tanpa data sampel
  const headerBahan = [['Nama Bahan', 'Satuan', 'Harga Beli', 'Isi Kemasan', 'Harga Satuan']];
  const headerHpp = [['Nama Produk', 'Porsi Jual', 'Harga Jual']];
  const headerResep = [['Nama Produk', 'Nama Bahan', 'Banyaknya / Takaran']];

  await updateSheetValues(accessToken, spreadsheetId, 'Bahan Baku!A1', headerBahan);
  await updateSheetValues(accessToken, spreadsheetId, 'HPP Produk!A1', headerHpp);
  await updateSheetValues(accessToken, spreadsheetId, 'Resep Detail!A1', headerResep);
}

// ─── DATA HASH CACHE untuk Differential Sync (kurangi API calls) ───
let dataHashCache: Record<string, string> = {};

function computeDataHash(data: any): string {
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

function hasDataChanged(key: string, data: any): boolean {
  const hash = computeDataHash(data);
  if (dataHashCache[key] === hash) return false;
  dataHashCache[key] = hash;
  return true;
}

export function resetDataHashCache(): void {
  dataHashCache = {};
}

// ─── ATOMIC SAVE — Satu API call, zero data loss risk ───
function toCellValue(val: any): any {
  if (val === null || val === undefined) return { userEnteredValue: {} };
  if (typeof val === 'number') return { userEnteredValue: { numberValue: val } };
  return { userEnteredValue: { stringValue: String(val) } };
}

export async function atomicReplaceProjectData(
  accessToken: string,
  spreadsheetId: string,
  data: {
    bahanBaku: BahanBaku[];
    productHpp: ProductHpp[];
    detailResep: DetailResep[];
  }
): Promise<void> {
  const details = await getSpreadsheetDetails(accessToken, spreadsheetId);
  const sheetMap: Record<string, number> = {};
  (details.sheets || []).forEach((s: any) => {
    sheetMap[s.properties.title] = s.properties.sheetId;
  });

  const bbRows: any[][] = [['Nama Bahan', 'Satuan', 'Harga Satuan (Markup)', 'Isi Kemasan', 'Harga Satuan (Markup) Per Unit', 'Harga Beli Real', 'Harga Satuan Real Per Unit', 'Markup Percent (%)']];
  data.bahanBaku.forEach((b) => {
    const realPrice = b.hargaBeliReal !== undefined ? b.hargaBeliReal : b.hargaBeli;
    const realSatuan = b.hargaSatuanReal !== undefined ? b.hargaSatuanReal : (realPrice / (b.isiKemasan || 1));
    const markupPct = b.markupPercent !== undefined ? b.markupPercent : 0;
    bbRows.push([b.nama, b.satuan, b.hargaBeli, b.isiKemasan, b.hargaSatuan, realPrice, realSatuan, markupPct]);
  });

  const hppRows: any[][] = [['Nama Produk', 'Porsi Jual', 'Harga Jual']];
  data.productHpp.forEach((p) => {
    hppRows.push([p.namaProduk, p.porsiJual, p.hargaJual]);
  });

  const resepRows: any[][] = [['Nama Produk', 'Nama Bahan', 'Banyaknya / Takaran']];
  data.detailResep.forEach((r) => {
    resepRows.push([r.namaProduk, r.namaBahan, r.takaran]);
  });

  const sheetDefs = [
    { id: sheetMap['Bahan Baku'], rows: bbRows },
    { id: sheetMap['HPP Produk'], rows: hppRows },
    { id: sheetMap['Resep Detail'], rows: resepRows },
  ];

  const requests: any[] = [];
  for (const s of sheetDefs) {
    if (!s.id) continue;
    requests.push({
      updateCells: {
        range: { sheetId: s.id, startRowIndex: 0, startColumnIndex: 0 },
        rows: s.rows.map(row => ({ values: row.map(c => toCellValue(c)) })),
        fields: "userEnteredValue",
      },
    });
    requests.push({
      repeatCell: {
        range: { sheetId: s.id, startRowIndex: s.rows.length, startColumnIndex: 0, endColumnIndex: 10 },
        cell: { userEnteredValue: {} },
        fields: "userEnteredValue",
      },
    });
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed atomic save: ${response.status}`);
  }
}

// ─── DIFFERENTIAL SAVE — Hanya kirim sheet yang berubah ───
export async function saveProjectDataToSheets(
  accessToken: string,
  spreadsheetId: string,
  data: {
    bahanBaku: BahanBaku[];
    productHpp: ProductHpp[];
    detailResep: DetailResep[];
  }
): Promise<void> {
  const bbHash = computeDataHash(data.bahanBaku);
  const hppHash = computeDataHash(data.productHpp);
  const resepHash = computeDataHash(data.detailResep);

  const bbChanged = dataHashCache['bb'] !== bbHash;
  const hppChanged = dataHashCache['hpp'] !== hppHash;
  const resepChanged = dataHashCache['resep'] !== resepHash;

  if (!bbChanged && !hppChanged && !resepChanged) {
    return; // Tidak ada perubahan — skip
  }

  dataHashCache['bb'] = bbHash;
  dataHashCache['hpp'] = hppHash;
  dataHashCache['resep'] = resepHash;

  // Kirim atomic — 1 API call untuk semua sheet
  await atomicReplaceProjectData(accessToken, spreadsheetId, data);
}

export async function saveRevenueToSheets(
  accessToken: string,
  spreadsheetId: string,
  transactions: {
    id: string;
    time: string;
    product: string;
    qty: number;
    amount: number;
    source: string;
    date: string;
  }[]
): Promise<void> {
  const revHash = computeDataHash(transactions);
  if (dataHashCache['revenue'] === revHash) return;
  dataHashCache['revenue'] = revHash;

  // Check if Revenue Tracker sheet exists, create if not
  const details = await getSpreadsheetDetails(accessToken, spreadsheetId);
  const sheetMap: Record<string, number> = {};
  (details.sheets || []).forEach((s: any) => {
    sheetMap[s.properties.title] = s.properties.sheetId;
  });

  if (!sheetMap['Revenue Tracker']) {
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: 'Revenue Tracker' } } }],
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Failed to create Revenue Tracker sheet');
    }
    sheetMap['Revenue Tracker'] = details.sheets?.length || 1;
  }

  const rows: any[][] = [['Date', 'Time', 'ID', 'Product', 'Qty', 'Amount', 'Source']];
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.time.localeCompare(a.time);
  });
  const limited = sorted.slice(0, 1000);
  limited.forEach((tx) => {
    rows.push([tx.date, tx.time, tx.id, tx.product, tx.qty, tx.amount, tx.source]);
  });

  const sheetId = sheetMap['Revenue Tracker'];
  if (!sheetId) throw new Error('Revenue Tracker sheet ID not found');

  const requests: any[] = [
    {
      updateCells: {
        range: { sheetId, startRowIndex: 0, startColumnIndex: 0 },
        rows: rows.map(row => ({ values: row.map(c => toCellValue(c)) })),
        fields: "userEnteredValue",
      },
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: rows.length, startColumnIndex: 0, endColumnIndex: 10 },
        cell: { userEnteredValue: {} },
        fields: "userEnteredValue",
      },
    },
  ];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Failed atomic revenue save: ${response.status}`);
  }
}

export async function loadRevenueFromSheets(
  accessToken: string,
  spreadsheetId: string
): Promise<{
  transactions: { id: string; time: string; product: string; qty: number; amount: number; source: string; date: string }[];
  dailyTotals: Record<string, { total: number; sources: Record<string, number> }>;
}> {
  const details = await getSpreadsheetDetails(accessToken, spreadsheetId);
  const sheetTitles = details.sheets?.map((s: any) => s.properties?.title as string) || [];

  if (!sheetTitles.includes('Revenue Tracker')) {
    return { transactions: [], dailyTotals: {} };
  }

  const rows = await fetchSheetValues(accessToken, spreadsheetId, 'Revenue Tracker!A1:G2000');
  const transactions: { id: string; time: string; product: string; qty: number; amount: number; source: string; date: string }[] = [];
  const dailyTotals: Record<string, { total: number; sources: Record<string, number> }> = {};

  if (rows.length > 1) {
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0]) {
        const date = String(row[0]).trim();
        const tx = {
          id: String(row[2] || '').trim(),
          time: String(row[1] || '').trim(),
          product: String(row[3] || '').trim(),
          qty: parseFloat(row[4]) || 0,
          amount: parseFloat(row[5]) || 0,
          source: String(row[6] || '').trim(),
          date,
        };
        transactions.push(tx);

        if (!dailyTotals[date]) {
          dailyTotals[date] = { total: 0, sources: {} };
        }
        dailyTotals[date].total += tx.amount;
        if (!dailyTotals[date].sources[tx.source]) {
          dailyTotals[date].sources[tx.source] = 0;
        }
        dailyTotals[date].sources[tx.source] += tx.amount;
      }
    }
  }

  return { transactions, dailyTotals };
}
