import { BahanBaku, ProductHpp, DetailResep } from '../types';

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
            overhead: parseFloat(row[2]) || 0,
            hargaJual: parseFloat(row[3]) || 0,
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
  const headerHpp = [['Nama Produk', 'Porsi Jual', 'Overhead', 'Harga Jual']];
  const headerResep = [['Nama Produk', 'Nama Bahan', 'Banyaknya / Takaran']];

  await updateSheetValues(accessToken, spreadsheetId, 'Bahan Baku!A1', headerBahan);
  await updateSheetValues(accessToken, spreadsheetId, 'HPP Produk!A1', headerHpp);
  await updateSheetValues(accessToken, spreadsheetId, 'Resep Detail!A1', headerResep);
}

export async function saveProjectDataToSheets(
  accessToken: string,
  spreadsheetId: string,
  data: {
    bahanBaku: BahanBaku[];
    productHpp: ProductHpp[];
    detailResep: DetailResep[];
  }
): Promise<void> {
  const bbRows: any[][] = [['Nama Bahan', 'Satuan', 'Harga Satuan (Markup)', 'Isi Kemasan', 'Harga Satuan (Markup) Per Unit', 'Harga Beli Real', 'Harga Satuan Real Per Unit', 'Markup Percent (%)']];
  data.bahanBaku.forEach((b) => {
    const realPrice = b.hargaBeliReal !== undefined ? b.hargaBeliReal : b.hargaBeli;
    const realSatuan = b.hargaSatuanReal !== undefined ? b.hargaSatuanReal : (realPrice / (b.isiKemasan || 1));
    const markupPct = b.markupPercent !== undefined ? b.markupPercent : 0;
    
    bbRows.push([
      b.nama, 
      b.satuan, 
      b.hargaBeli, 
      b.isiKemasan, 
      b.hargaSatuan, 
      realPrice, 
      realSatuan, 
      markupPct
    ]);
  });

  const hppRows: any[][] = [['Nama Produk', 'Porsi Jual', 'Overhead', 'Harga Jual']];
  data.productHpp.forEach((p) => {
    hppRows.push([p.namaProduk, p.porsiJual, p.overhead, p.hargaJual]);
  });

  const resepRows: any[][] = [['Nama Produk', 'Nama Bahan', 'Banyaknya / Takaran']];
  data.detailResep.forEach((r) => {
    resepRows.push([r.namaProduk, r.namaBahan, r.takaran]);
  });

  await clearSheetValues(accessToken, spreadsheetId, 'Bahan Baku');
  await clearSheetValues(accessToken, spreadsheetId, 'HPP Produk');
  await clearSheetValues(accessToken, spreadsheetId, 'Resep Detail');

  await updateSheetValues(accessToken, spreadsheetId, 'Bahan Baku!A1', bbRows);
  await updateSheetValues(accessToken, spreadsheetId, 'HPP Produk!A1', hppRows);
  await updateSheetValues(accessToken, spreadsheetId, 'Resep Detail!A1', resepRows);
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
  // Check if Revenue Tracker sheet exists, create if not
  const details = await getSpreadsheetDetails(accessToken, spreadsheetId);
  const sheetTitles = details.sheets?.map((s: any) => s.properties?.title as string) || [];

  if (!sheetTitles.includes('Revenue Tracker')) {
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
  }

  // Write header + data
  const rows: any[][] = [['Date', 'Time', 'ID', 'Product', 'Qty', 'Amount', 'Source']];
  // Sort by date descending, newest first
  const sorted = [...transactions].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.time.localeCompare(a.time);
  });
  // Only write last 1000 transactions to sheets (to avoid hitting limits)
  const limited = sorted.slice(0, 1000);
  limited.forEach((tx) => {
    rows.push([tx.date, tx.time, tx.id, tx.product, tx.qty, tx.amount, tx.source]);
  });

  await clearSheetValues(accessToken, spreadsheetId, 'Revenue Tracker');
  await updateSheetValues(accessToken, spreadsheetId, 'Revenue Tracker!A1', rows);
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
