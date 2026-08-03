/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SalesRecord {
  id: string;
  date: string; // YYYY-MM-DD as string, fallback to empty
  product: string;
  group_name: string;
  quantity: number;
  unitPrice: number;
  ttl_sales: number;
  customer_id?: string;
  channel?: string;
  customFields?: Record<string, any>;
}

export interface ColumnMapping {
  product: string;
  group_name: string;
  ttl_sales: string;
}

export interface FilterOptions {
  searchQuery: string;
  dateRange: {
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
  };
  groupNames: string[];
  minRevenue: string;
  maxRevenue: string;
}

export interface SalesMetrics {
  ttl_sales: number;
  totalTransactions: number;
  totalUnitsSold: number;
  averageOrderValue: number;
  revenueGrowth: number; // calculated growth index
}

export interface MonthlyTrend {
  month: string; // e.g. "Jan '26" or "2026-01"
  revenue: number;
  units: number;
  transactions: number;
}

export interface GroupSummary {
  name: string;
  revenue: number;
  percentage: number;
  units: number;
}
