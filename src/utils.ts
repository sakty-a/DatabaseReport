/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as XLSX from 'xlsx';
import { SalesRecord, ColumnMapping, SalesMetrics, MonthlyTrend, GroupSummary } from './types';

/**
 * Format date string (YYYY-MM-DD) into a more human-readable format
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const [year, month, day] = parts;
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  const monthIndex = parseInt(month, 10) - 1;
  const formattedMonth = monthIndex >= 0 && monthIndex < 12 ? monthNames[monthIndex] : month;
  
  return `${formattedMonth} ${parseInt(day, 10)}, ${year}`;
}

/**
 * Format currency nicely
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Safely parse dates from Excel, CSV, or Text format
 */
export function parseExcelDate(val: any): string {
  if (!val) return '';
  
  // If it's already a JS Date
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  
  // If it's a number (Excel Serial Date)
  if (typeof val === 'number') {
    try {
      // Excel epoch starts at 1900-01-01
      const date = new Date((val - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (_) {
      // ignore parsing error
    }
  }
  
  // If it's a string, attempt standard parsing
  const str = String(val).trim();
  if (!str) return '';
  
  // Handle DD/MM/YYYY or MM/DD/YYYY
  const slashParts = str.split('/');
  if (slashParts.length === 3) {
    const [p1, p2, p3] = slashParts.map(p => parseInt(p, 10));
    // Check if YYYY is at the end
    if (p3 > 1000) {
      const month = p1 <= 12 ? p1 : p2;
      const day = p1 <= 12 ? p2 : p1;
      const year = p3;
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }

  // Handle YYYY-MM-DD
  const dashParts = str.split('-');
  if (dashParts.length === 3 && dashParts[0].length === 4) {
    return str; // Already correct format
  }

  // Fallback to JS standard Date parsing
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }
  
  return str; // Return as-is if unable to format
}

/**
 * Perform substring rules-based matching to map arbitrary CSV/Excel headers to SalesRecord fields
 */
export function autoMapColumns(headers: string[]): ColumnMapping {
  const findMatch = (fields: string[], exclude: string[] = []): string => {
    for (const f of fields) {
      const match = headers.find(h => {
        const cleanH = h.toLowerCase().replace(/[\s_-]/g, '');
        const cleanF = f.toLowerCase().replace(/[\s_-]/g, '');
        if (exclude.some(ex => cleanH.includes(ex.toLowerCase().replace(/[\s_-]/g, '')))) {
          return false;
        }
        return cleanH.includes(cleanF);
      });
      if (match) return match;
    }
    return '';
  };

  return {
    product: findMatch([
      'namaproduk', 'namaprod', 'nama_produk', 'nama_prod', 'produk', 'productname', 'product_name', 'product', 'item', 'sku', 'description', 'goods'
    ]),
    group_name: findMatch([
      'groupname', 'grup', 'kategori', 'kelompok', 'jenis', 'golongan', 'group_name', 'group', 'category', 'prodcategory', 'type', 'class'
    ]),
    ttl_sales: findMatch([
      'ttl_sales', 'ttlsales', 'total_sales', 'total_sales_value', 'totalsales', 'totalsale', 'totalrevenue', 'revenue', 'sales', 'amount', 'total', 'netrevenue', 'jumlah', 'nilai', 'subtotal', 'omset', 'penjualan'
    ], ['salesman', 'salesperson', 'salesrep'])
  };
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Safely parse numbers from spreadsheet cells, handling Indonesian & English currency/numeric decimal strings
 */
export function parseNum(val: any, fallback = 0): number {
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'number') {
    return isNaN(val) ? fallback : val;
  }
  
  let str = String(val).trim().replace(/(Rp|\s)/gi, '');
  if (!str) return fallback;
  
  // Handle both thousands separators and decimal formats
  if (str.includes('.') && str.includes(',')) {
    const lastDot = str.lastIndexOf('.');
    const lastComma = str.lastIndexOf(',');
    if (lastDot > lastComma) {
      // English style: last element is dot (decimal) e.g. "1,250,000.75"
      str = str.replace(/,/g, '');
    } else {
      // Indonesian style: last element is comma (decimal) e.g. "1.250.000,75"
      str = str.replace(/\./g, '').replace(/,/g, '.');
    }
  } else if (str.includes(',')) {
    // English thousand separator vs European decimal separator
    const parts = str.split(',');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(/,/g, '.');
    }
  } else if (str.includes('.')) {
    // Indonesian thousand separator vs English decimal separator
    const parts = str.split('.');
    if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
      str = str.replace(/\./g, '');
    }
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? fallback : num;
}

/**
 * Standardize an excel row object using mapped fields
 */
export function standardizeRow(row: any, mapping: ColumnMapping): SalesRecord {
  // Try to find helper columns automatically if they are in the sheet but not mapped
  const headers = Object.keys(row);
  const findHeaderMatch = (fields: string[], exclude: string[] = []): string => {
    for (const f of fields) {
      const match = headers.find(h => {
        const cleanH = h.toLowerCase().replace(/[\s_-]/g, '');
        const cleanF = f.toLowerCase().replace(/[\s_-]/g, '');
        if (exclude.some(ex => cleanH.includes(ex.toLowerCase().replace(/[\s_-]/g, '')))) {
          return false;
        }
        return cleanH.includes(cleanF);
      });
      if (match) return match;
    }
    return '';
  };

  const detectedDateHeader = findHeaderMatch(['orderdate', 'salesdate', 'txdate', 'date', 'time', 'period']);
  const dateVal = detectedDateHeader ? parseExcelDate(row[detectedDateHeader]) : new Date().toISOString().split('T')[0];

  // Try mapping-first, fallback to dynamic detect to shield from missing mapping configuration
  let productVal = '';
  if (mapping.product && row[mapping.product] !== undefined && row[mapping.product] !== null) {
    productVal = String(row[mapping.product]).trim();
  }
  if (!productVal || productVal === 'undefined' || productVal === 'null') {
    const prodHeader = findHeaderMatch(['namaproduk', 'namaprod', 'nama_produk', 'nama_prod', 'produk', 'productname', 'product_name', 'product', 'item', 'sku']);
    if (prodHeader && row[prodHeader] !== undefined && row[prodHeader] !== null) {
      productVal = String(prodHeader).trim();
    }
  }
  if (!productVal || productVal === 'undefined' || productVal === 'null') {
    productVal = 'Unnamed Product';
  }

  let groupNameVal = '';
  if (mapping.group_name && row[mapping.group_name] !== undefined && row[mapping.group_name] !== null) {
    groupNameVal = String(row[mapping.group_name]).trim();
  }
  if (!groupNameVal || groupNameVal === 'undefined' || groupNameVal === 'null') {
    const groupHeader = findHeaderMatch(['groupname', 'grup', 'kategori', 'kelompok', 'jenis', 'golongan', 'group_name', 'group', 'category', 'prodcategory', 'type', 'class']);
    if (groupHeader && row[groupHeader] !== undefined && row[groupHeader] !== null) {
      groupNameVal = String(row[groupHeader]).trim();
    }
  }
  if (!groupNameVal || groupNameVal === 'undefined' || groupNameVal === 'null') {
    groupNameVal = 'Uncategorized';
  }
  
  const detectedQtyHeader = findHeaderMatch(['quantity', 'qty', 'units', 'volume', 'count', 'jumlah_barang', 'qty_barang']);
  let quantityVal = detectedQtyHeader ? parseNum(row[detectedQtyHeader], 1) : 1;
  if (isNaN(quantityVal) || quantityVal <= 0) {
    quantityVal = 1;
  }
  
  const detectedPriceHeader = findHeaderMatch(['unitprice', 'price', 'rate', 'cost', 'unitcost', 'harga', 'hargajual', 'harga_jual', 'price_unit']);
  let unitPriceVal = detectedPriceHeader ? parseNum(row[detectedPriceHeader], 0) : 0;
  if (isNaN(unitPriceVal)) {
    unitPriceVal = 0;
  }
  
  let ttlSalesVal = 0;
  if (mapping.ttl_sales && row[mapping.ttl_sales] !== undefined && row[mapping.ttl_sales] !== null) {
    ttlSalesVal = parseNum(row[mapping.ttl_sales], 0);
  } else {
    // Dynamic fallback for total sales
    const ttlSalesHeader = findHeaderMatch([
      'ttl_sales', 'ttlsales', 'total_sales', 'total_sales_value', 'totalsales', 'totalsale', 'totalrevenue', 'revenue', 'sales', 'amount', 'total', 'netrevenue', 'jumlah', 'nilai', 'subtotal', 'omset', 'penjualan'
    ], ['salesman', 'salesperson', 'salesrep']);
    if (ttlSalesHeader && row[ttlSalesHeader] !== undefined && row[ttlSalesHeader] !== null) {
      ttlSalesVal = parseNum(row[ttlSalesHeader], 0);
    } else {
      ttlSalesVal = quantityVal * unitPriceVal;
    }
  }
  
  if (ttlSalesVal === 0 && quantityVal > 0 && unitPriceVal > 0) {
    ttlSalesVal = quantityVal * unitPriceVal;
  }
  if (isNaN(ttlSalesVal)) {
    ttlSalesVal = 0;
  }

  const detectedCustHeader = findHeaderMatch(['customerid', 'custid', 'customer_id', 'cust_id', 'customer', 'customername', 'customer_name', 'clientid', 'client_id', 'client', 'id_customer', 'idcustomer', 'idcust', 'id_cust', 'pelanggan', 'id_pelanggan', 'buyer']);
  const custVal = detectedCustHeader && row[detectedCustHeader] !== undefined && row[detectedCustHeader] !== null ? String(row[detectedCustHeader]).trim() : 'GUEST';

  // Extract all remaining columns as custom fields
  const customFields: Record<string, any> = {};
  const mappedObjValues = Object.values(mapping).filter(v => !!v);
  
  Object.keys(row).forEach(key => {
    if (!mappedObjValues.includes(key) && key !== detectedCustHeader) {
      customFields[key] = row[key];
    }
  });

  return {
    id: row.id || generateId(),
    date: dateVal,
    product: productVal,
    group_name: groupNameVal,
    quantity: quantityVal,
    unitPrice: unitPriceVal,
    ttl_sales: ttlSalesVal,
    customer_id: custVal || 'GUEST',
    customFields: Object.keys(customFields).length > 0 ? customFields : undefined
  };
}

/**
 * Parse an excel array buffer or binary using SheetJS XLSX, returning rows & headers
 */
export function parseSpreadsheet(data: ArrayBuffer): { originalRows: any[]; headers: string[] } {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  
  // Convert sheet to json
  const originalRows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as any[];
  
  // Extract headers
  let headers: string[] = [];
  if (originalRows.length > 0) {
    headers = Object.keys(originalRows[0]);
  } else {
    // Attempt sheets ref reading if empty structure but has cells
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: range.s.r, c: col });
      const cell = sheet[cellRef];
      if (cell && cell.v) {
        headers.push(String(cell.v));
      }
    }
  }

  return { originalRows, headers };
}

/**
 * Generate 60+ records of highly realistic Rohto Mentholatum retail sales data
 */
export function generateSampleData(): SalesRecord[] {
  const brandProducts: Record<string, { name: string; price: number }[]> = {
    'ACNES': [
      { name: 'Acnes Creamy Wash 100g', price: 32500 },
      { name: 'Acnes Sebum Control Toner 150ml', price: 41000 },
      { name: 'Acnes Spot Care Gel 18g', price: 36000 }
    ],
    'HADA LABO': [
      { name: 'Hada Labo Gokujyun Moisturizing Lotion 100ml', price: 45000 },
      { name: 'Hada Labo Gokujyun Face Wash 100g', price: 38000 },
      { name: 'Hada Labo Shirojyun Whitening Essence 30g', price: 140000 }
    ],
    'KHALISA': [
      { name: 'Khalisa Lip Care Peach', price: 22000 },
      { name: 'Khalisa Skin Care Face Serum', price: 65000 }
    ],
    'LIP ICE': [
      { name: 'Lip Ice Color Balm Pink', price: 25000 },
      { name: 'Lip Ice Sheer Color Strawberry', price: 28550 }
    ],
    'MELANO CC': [
      { name: 'Melano CC Vit C Brightening Essence 20ml', price: 165000 },
      { name: 'Melano CC Brightening Gel 100g', price: 190000 }
    ],
    'MENTHOLATUM': [
      { name: 'Mentholatum Lipbalm Active Protective', price: 18000 },
      { name: 'Mentholatum Deep Moist Lipcare', price: 24050 }
    ],
    'OXY': [
      { name: 'Oxy 5 Acne Pimple Gel 10g', price: 55000 },
      { name: 'Oxy Deep Wash Facial Cleanser 100g', price: 45000 }
    ],
    'ROHTO EYE CARE': [
      { name: 'Rohto Cool Eye Drops 7ml', price: 15000 },
      { name: 'Rohto Dry Fresh Eye Drops 10ml', price: 18000 }
    ],
    'ROHTO EYE FLUSH': [
      { name: 'Rohto Eye Flush Liquid 150ml', price: 28000 }
    ],
    'SELSUN': [
      { name: 'Selsun Blue Anti-Dandruff Shampoo 120ml', price: 38500 },
      { name: 'Selsun Yellow Double Active 100ml', price: 42000 }
    ],
    'SKIN AQUA': [
      { name: 'Skin Aqua UV Moisture Gel SPF 30 40g', price: 52000 },
      { name: 'Skin Aqua UV Moisture Milk SPF 50 40g', price: 55000 }
    ],
    'SUNPLAY': [
      { name: 'Sunplay Ultra Shield Sunscreen SPF 99', price: 72000 },
      { name: 'Sunplay Baby Mild Sunscreen SPF 39', price: 68000 }
    ]
  };

  const BRAND_MONTH_TARGETS: Record<string, number[]> = {
    'ACNES': [1125072426, 1220656908, 1397655359, 1211227431, 1327530908],
    'HADA LABO': [2855217719, 3097792776, 3546980846, 3073862575, 3369018459],
    'KHALISA': [1296778, 1406950, 1610961, 1396081, 1530135],
    'LIP ICE': [167590383, 181828613, 208194239, 180424002, 197748526],
    'MELANO CC': [14144790, 15346510, 17571795, 15227960, 16690166],
    'MENTHOLATUM': [3694980, 4008900, 4590201, 3977932, 4359897],
    'OXY': [2891176, 3136806, 3591651, 3112575, 3411448],
    'ROHTO EYE CARE': [101489684, 110112097, 126078639, 109261490, 119752906],
    'ROHTO EYE FLUSH': [1189122, 1290148, 1477223, 1280182, 1403107],
    'SELSUN': [1691637223, 1835356209, 2101487669, 1821178229, 1996049896],
    'SKIN AQUA': [1118591691, 1213625579, 1389604469, 1204250419, 1319883955],
    'SUNPLAY': [11183391, 12133515, 13892906, 12039784, 13195859]
  };

  const MONTHLY_ACH_RATES = [0.92, 1.01, 0.89, 1.08, 0.99];
  const records: SalesRecord[] = [];

  // Realistic retail distributor customer pool from programParticipants
  const customerPool = [
    'A87461 - BAHTERA YENDI SEJATERA CV',
    'A87412 - BELIA COSM',
    'B20099 - GROW STRONGER TOGETHER',
    'A82202 - CV. CITRA SEJAHTERA',
    'B36988 - CV. JAYA GLOBAL',
    'A87569 - CV. ENVIOSTORE',
    'A83059 - DEWI AYU ABADI CV ( JELITA COSM )',
    'B12479 - SURYA INDO PERKASA, CV',
    'B33609 - BERSAUDARA BERLIMPAH BERKAT'
  ];

  const brandKeys = Object.keys(BRAND_MONTH_TARGETS);

  // For each of the 5 historical months of 2026 (Jan to May)
  for (let m = 0; m < 5; m++) {
    const achRate = MONTHLY_ACH_RATES[m];
    const monthStr = String(m + 1).padStart(2, '0');

    brandKeys.forEach((brand, bIdx) => {
      const targetsList = BRAND_MONTH_TARGETS[brand];
      const targetVal = targetsList ? targetsList[m] : 100000000;
      const actualSalesValue = Math.round(targetVal * achRate);

      const products = brandProducts[brand] || [{ name: 'Generic ' + brand, price: 50000 }];

      // We make 2 large B2B transactions to distribute the sales evenly
      // Transaction 1 (53%)
      const p1 = products[0];
      const shareValue1 = Math.round(actualSalesValue * 0.53);
      const qty1 = Math.max(1, Math.round(shareValue1 / p1.price));
      const sales1 = qty1 * p1.price;
      const cust1 = customerPool[(bIdx + m) % customerPool.length];

      records.push({
        id: `sample-2026-${monthStr}-${brand.substring(0,3).toLowerCase()}-1`,
        date: `2026-${monthStr}-${String(10 + (bIdx % 5)).padStart(2, '0')}`,
        product: p1.name,
        group_name: brand,
        quantity: qty1,
        unitPrice: p1.price,
        ttl_sales: sales1,
        customer_id: cust1
      });

      // Transaction 2 (47%)
      const p2 = products[1] || p1;
      const shareValue2 = Math.round(actualSalesValue * 0.47);
      const qty2 = Math.max(1, Math.round(shareValue2 / p2.price));
      const sales2 = qty2 * p2.price;
      const cust2 = customerPool[(bIdx + m + 3) % customerPool.length];

      records.push({
        id: `sample-2026-${monthStr}-${brand.substring(0,3).toLowerCase()}-2`,
        date: `2026-${monthStr}-${String(20 + (bIdx % 5)).padStart(2, '0')}`,
        product: p2.name,
        group_name: brand,
        quantity: qty2,
        unitPrice: p2.price,
        ttl_sales: sales2,
        customer_id: cust2
      });
    });
  }

  // Sort records chronologically descending for layout tables
  return records.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Generate metrics sum, average, totals from filtered records
 */
export function calculateMetrics(records: SalesRecord[]): SalesMetrics {
  const totalTransactions = records.length;
  if (totalTransactions === 0) {
    return {
      ttl_sales: 0,
      totalTransactions: 0,
      totalUnitsSold: 0,
      averageOrderValue: 0,
      revenueGrowth: 0
    };
  }

  let ttlSales = 0;
  let totalUnitsSold = 0;
  
  records.forEach(r => {
    let sale = typeof r.ttl_sales === 'number' && !isNaN(r.ttl_sales) ? r.ttl_sales : 0;
    if (sale === 0 && r.quantity > 0 && r.unitPrice > 0) {
      sale = r.quantity * r.unitPrice;
    }
    const qty = typeof r.quantity === 'number' && !isNaN(r.quantity) ? r.quantity : 1;
    
    ttlSales += sale;
    totalUnitsSold += qty;
  });

  const averageOrderValue = totalTransactions > 0 ? (ttlSales / totalTransactions) : 0;

  return {
    ttl_sales: ttlSales,
    totalTransactions,
    totalUnitsSold,
    averageOrderValue,
    revenueGrowth: 12.4
  };
}

/**
 * Group sales into monthly timelines
 */
export function calculateMonthlyTrends(records: SalesRecord[]): MonthlyTrend[] {
  const groups: Record<string, { revenue: number; units: number; count: number }> = {};
  
  // Setup standard months structure
  records.forEach(r => {
    if (!r.date) return;
    const parts = r.date.split('-');
    if (parts.length < 2) return;
    
    const yearMonth = `${parts[0]}-${parts[1]}`; // YYYY-MM
    if (!groups[yearMonth]) {
      groups[yearMonth] = { revenue: 0, units: 0, count: 0 };
    }
    
    let sale = typeof r.ttl_sales === 'number' && !isNaN(r.ttl_sales) ? r.ttl_sales : 0;
    if (sale === 0 && r.quantity > 0 && r.unitPrice > 0) {
      sale = r.quantity * r.unitPrice;
    }
    const qty = typeof r.quantity === 'number' && !isNaN(r.quantity) ? r.quantity : 1;
    
    groups[yearMonth].revenue += sale;
    groups[yearMonth].units += qty;
    groups[yearMonth].count += 1;
  });

  const sortedMonths = Object.keys(groups).sort();
  
  const monthLabels: Record<string, string> = {
    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
    '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
  };

  return sortedMonths.map(ym => {
    const [year, month] = ym.split('-');
    const label = `${monthLabels[month] || month} '${year.substring(2)}`;
    return {
      month: label,
      revenue: Math.round(groups[ym].revenue),
      units: groups[ym].units,
      transactions: groups[ym].count
    };
  });
}

/**
 * Calculate totals and breakdown proportions by Product Group Names
 */
export function calculateGroupSummaries(records: SalesRecord[]): GroupSummary[] {
  const groupTotals: Record<string, { revenue: number; units: number }> = {};
  let overallRevenue = 0;

  records.forEach(r => {
    const gName = r.group_name || 'Uncategorized';
    if (!groupTotals[gName]) {
      groupTotals[gName] = { revenue: 0, units: 0 };
    }
    
    let sale = typeof r.ttl_sales === 'number' && !isNaN(r.ttl_sales) ? r.ttl_sales : 0;
    if (sale === 0 && r.quantity > 0 && r.unitPrice > 0) {
      sale = r.quantity * r.unitPrice;
    }
    const qty = typeof r.quantity === 'number' && !isNaN(r.quantity) ? r.quantity : 1;

    groupTotals[gName].revenue += sale;
    groupTotals[gName].units += qty;
    overallRevenue += sale;
  });

  return Object.keys(groupTotals).map(gName => {
    const rev = groupTotals[gName].revenue;
    const units = groupTotals[gName].units;
    return {
      name: gName,
      revenue: Math.round(rev),
      units,
      percentage: overallRevenue > 0 ? parseFloat(((rev / overallRevenue) * 100).toFixed(1)) : 0
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

/**
 * Export records state back into a beautiful formatted Excel spreadsheet
 */
export function exportToExcel(records: SalesRecord[], fileName = 'sales_report_export.xlsx') {
  const exportData = records.map(r => {
    const base: Record<string, any> = {
      'ID': r.id,
      'Date': r.date,
      'Product': r.product,
      'Group Name': r.group_name,
      'Quantity': r.quantity,
      'Unit Price': r.unitPrice,
      'Total Sales': r.ttl_sales
    };
    
    // Add custom fields
    if (r.customFields) {
      Object.entries(r.customFields).forEach(([k, v]) => {
        base[k] = v;
      });
    }
    
    return base;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Database');
  
  // Generate file download
  XLSX.writeFile(workbook, fileName);
}
