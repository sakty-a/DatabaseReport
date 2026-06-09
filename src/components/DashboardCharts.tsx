/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { TrendingUp, Users, Award, Sparkles } from 'lucide-react';
import { SalesRecord } from '../types';
import {
  calculateMetrics,
  calculateMonthlyTrends,
  calculateGroupSummaries,
  formatCurrency
} from '../utils';
import { CASH_BACK_PARTICIPANTS, WHITE_BONUS_PARTICIPANTS } from './programParticipants';

interface DashboardChartsProps {
  records: SalesRecord[];
}

export default function DashboardCharts({ records }: DashboardChartsProps) {
  // Memoize all analytical aggregates
  const stats = useMemo(() => calculateMetrics(records), [records]);
  const monthlyTrends = useMemo(() => calculateMonthlyTrends(records), [records]);
  const groupSummaries = useMemo(() => calculateGroupSummaries(records), [records]);

  // State to track active pie index on hover
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  // State to track active product group for listing on pie click
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  // State to track active month for top products details
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const [showAllOutlets, setShowAllOutlets] = useState(false);

  // Combine participants & parsed rows for custom customer name (cust_nm) resolution
  const customerNameMap = useMemo(() => {
    const map = new Map<string, string>();
    CASH_BACK_PARTICIPANTS.forEach(p => {
      map.set(p.code.toUpperCase().trim(), p.name.trim());
    });
    WHITE_BONUS_PARTICIPANTS.forEach(p => {
      map.set(p.code.toUpperCase().trim(), p.name.trim());
    });

    records.forEach(r => {
      const cId = (r.customer_id || 'GUEST').trim();
      const cIdUpper = cId.toUpperCase();
      
      if (!map.has(cIdUpper) || map.get(cIdUpper) === 'GUEST') {
        if (r.customFields) {
          // Prioritize exact/prefix check for 'cust_nm' / 'custnm'
          let nameKey = Object.keys(r.customFields).find(k => {
            const kl = k.toLowerCase().replace(/_/g, '').replace(/[\s-]/g, '');
            return kl === 'custnm' || kl === 'nama' || kl === 'name' || kl === 'clientname' || kl === 'customername';
          });
          
          if (!nameKey) {
            nameKey = Object.keys(r.customFields).find(k => {
              const kl = k.toLowerCase().replace(/_/g, '').replace(/[\s-]/g, '');
              return (kl.includes('name') || kl.includes('nama') || kl.includes('customer') || kl.includes('client') || kl.includes('pelanggan') || kl.includes('buyer') || kl.includes('custnm')) && 
                     !kl.includes('id') && !kl.includes('code');
            });
          }

          if (nameKey && r.customFields[nameKey]) {
            const valStr = String(r.customFields[nameKey]).trim();
            if (valStr && valStr.toLowerCase() !== cId.toLowerCase()) {
              map.set(cIdUpper, valStr);
            }
          }
        }
      }
    });
    return map;
  }, [records]);

  // Memoize Pareto analysis aggregates
  const paretoData = useMemo(() => {
    const customerMap: Record<string, { customerId: string; totalSales: number; count: number }> = {};
    let totalSalesAll = 0;

    records.forEach(r => {
      const custId = (r.customer_id || 'GUEST').trim();
      let sale = typeof r.ttl_sales === 'number' && !isNaN(r.ttl_sales) ? r.ttl_sales : 0;
      if (sale === 0 && r.quantity > 0 && r.unitPrice > 0) {
        sale = r.quantity * r.unitPrice;
      }
      if (!customerMap[custId]) {
        customerMap[custId] = { customerId: custId, totalSales: 0, count: 0 };
      }
      customerMap[custId].totalSales += sale;
      customerMap[custId].count += 1;
      totalSalesAll += sale;
    });

    const sortedCustomers = Object.values(customerMap).sort((a, b) => b.totalSales - a.totalSales);

    let cumulativeSum = 0;
    const list = sortedCustomers.map((cust) => {
      const currentSales = cust.totalSales;
      cumulativeSum += currentSales;
      const pct = totalSalesAll > 0 ? (currentSales / totalSalesAll) * 100 : 0;
      const cumPct = totalSalesAll > 0 ? (cumulativeSum / totalSalesAll) * 100 : 0;
      
      const isPareto = ((cumulativeSum - currentSales) / totalSalesAll) * 100 < 80;

      // Dynamically resolve customer name (cust_nm) or fall back to code/ID
      const resolvedName = customerNameMap.get(cust.customerId.toUpperCase()) || cust.customerId;

      return {
        ...cust,
        name: resolvedName,
        percentage: pct,
        cumulativePercentage: cumPct,
        isPareto
      };
    });

    const paretoOutlets = list.filter(o => o.isPareto);
    const paretoRevenue = paretoOutlets.reduce((sum, o) => sum + o.totalSales, 0);

    return {
      totalSalesAll,
      list,
      paretoCount: paretoOutlets.length,
      totalCount: list.length,
      paretoRevenue,
      paretoPercentage: totalSalesAll > 0 ? (paretoRevenue / totalSalesAll) * 100 : 0
    };
  }, [records, customerNameMap]);

  const selectedMonthTopProducts = useMemo(() => {
    if (!selectedMonth) return [];
    
    const products: Record<string, { name: string; group_name: string; revenue: number; units: number }> = {};
    
    const monthLabels: Record<string, string> = {
      '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
      '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
    };

    records.forEach(r => {
      if (!r.date) return;
      const parts = r.date.split('-');
      if (parts.length < 2) return;
      
      const year = parts[0];
      const month = parts[1];
      const label = `${monthLabels[month] || month} '${year.substring(2)}`;
      
      if (label === selectedMonth) {
        const prod = r.product || 'Unnamed Product';
        const group = r.group_name || 'Uncategorized';
        
        let sale = typeof r.ttl_sales === 'number' && !isNaN(r.ttl_sales) ? r.ttl_sales : 0;
        if (sale === 0 && r.quantity > 0 && r.unitPrice > 0) {
          sale = r.quantity * r.unitPrice;
        }
        
        if (!products[prod]) {
          products[prod] = { name: prod, group_name: group, revenue: 0, units: 0 };
        }
        products[prod].revenue += sale;
        products[prod].units += r.quantity || 0;
      }
    });

    return Object.values(products)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);
  }, [records, selectedMonth]);

  // Aggregate top products dynamically
  const topProducts = useMemo(() => {
    const products: Record<string, { name: string; group_name: string; revenue: number; transactions: number }> = {};
    records.forEach(r => {
      const prod = r.product || 'Unnamed Product';
      const cat = r.group_name || 'Uncategorized';
      if (!products[prod]) {
        products[prod] = { name: prod, group_name: cat, revenue: 0, transactions: 0 };
      }
      
      let sale = typeof r.ttl_sales === 'number' && !isNaN(r.ttl_sales) ? r.ttl_sales : 0;
      if (sale === 0 && r.quantity > 0 && r.unitPrice > 0) {
        sale = r.quantity * r.unitPrice;
      }
      
      products[prod].revenue += sale;
      products[prod].transactions += 1;
    });
    return Object.values(products).sort((a, b) => b.revenue - a.revenue);
  }, [records]);

  // Memoize top products grouped by category/group to show them in the legend
  const groupTopProducts = useMemo(() => {
    const productsByGroup: Record<string, Array<{ name: string; revenue: number }>> = {};
    
    records.forEach(r => {
      const g = r.group_name || 'Uncategorized';
      const prod = r.product || 'Unnamed Product';
      
      let sale = typeof r.ttl_sales === 'number' && !isNaN(r.ttl_sales) ? r.ttl_sales : 0;
      if (sale === 0 && r.quantity > 0 && r.unitPrice > 0) {
        sale = r.quantity * r.unitPrice;
      }
      
      if (!productsByGroup[g]) {
        productsByGroup[g] = [];
      }
      
      const existing = productsByGroup[g].find(p => p.name === prod);
      if (existing) {
        existing.revenue += sale;
      } else {
        productsByGroup[g].push({ name: prod, revenue: sale });
      }
    });

    const result: Record<string, string[]> = {};
    Object.keys(productsByGroup).forEach(g => {
      result[g] = productsByGroup[g]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 2)
        .map(p => p.name);
    });
    return result;
  }, [records]);

  // Aggregate all details for selected group to show when pie slice is clicked
  const groupDetailedProducts = useMemo(() => {
    if (!selectedGroup) return [];
    const products: Record<string, { name: string; revenue: number; units: number }> = {};
    records.forEach(r => {
      const g = r.group_name || 'Uncategorized';
      if (g === selectedGroup) {
        const prod = r.product || 'Unnamed Product';
        let sale = typeof r.ttl_sales === 'number' && !isNaN(r.ttl_sales) ? r.ttl_sales : 0;
        if (sale === 0 && r.quantity > 0 && r.unitPrice > 0) {
          sale = r.quantity * r.unitPrice;
        }
        if (!products[prod]) {
          products[prod] = { name: prod, revenue: 0, units: 0 };
        }
        products[prod].revenue += sale;
        products[prod].units += r.quantity || 0;
      }
    });
    return Object.values(products).sort((a, b) => b.revenue - a.revenue);
  }, [records, selectedGroup]);

  // Premium flat color palettes
  const CHART_COLORS = ['#0066b2', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];

  // Find top group to populate the vibrant spotlight card dynamically
  const topGroupSummary = groupSummaries[0];
  const topGroupName = topGroupSummary?.name || 'All Products';
  const topGroupPercent = topGroupSummary?.percentage || 100;

  // Memoize top 5 SKUs for the top performing group
  const topGroupSKUs = useMemo(() => {
    if (!topGroupName) return [];
    
    const products: Record<string, { name: string; revenue: number; units: number }> = {};
    records.forEach(r => {
      const g = r.group_name || 'Uncategorized';
      if (g === topGroupName) {
        const prod = r.product || 'Unnamed Product';
        let sale = typeof r.ttl_sales === 'number' && !isNaN(r.ttl_sales) ? r.ttl_sales : 0;
        if (sale === 0 && r.quantity > 0 && r.unitPrice > 0) {
          sale = r.quantity * r.unitPrice;
        }
        if (!products[prod]) {
          products[prod] = { name: prod, revenue: 0, units: 0 };
        }
        products[prod].revenue += sale;
        products[prod].units += r.quantity || 0;
      }
    });
    
    return Object.values(products)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [records, topGroupName]);

  // Empty state guard
  if (records.length === 0) {
    return (
      <div id="analytics-empty-state" className="border border-slate-200 rounded-3xl bg-white p-16 text-center shadow-xs">
        <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-base font-bold text-slate-800 tracking-tight">No Analytics Available</h3>
        <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">
          Add or import sales data records to unlock the automated reporting suite, visual graphs, and leaderboard metrics.
        </p>
      </div>
    );
  }

  return (
    <div id="analytics-grid-workspace" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
      
      {/* 1. Bento Stat: Total Sales revenue */}
      <div id="bento-revenue" className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all duration-250 font-sans">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Total Sales</span>
        <div className="flex items-end justify-between mt-4">
          <span className="text-3xl font-extrabold tracking-tighter text-slate-900 font-sans">
            {formatCurrency(stats.ttl_sales)}
          </span>
          <span className="text-emerald-500 text-xs bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-bold pb-1 flex items-center gap-1 shrink-0">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            +{stats.revenueGrowth}%
          </span>
        </div>
      </div>

      {/* 2. Bento Stat: Transaction Volume */}
      <div id="bento-transactions" className="lg:col-span-6 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all duration-250 font-sans">
        <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Transactions</span>
        <div className="flex items-end justify-between mt-4">
          <span className="text-3xl font-extrabold tracking-tighter text-slate-900 font-sans">
            {stats.totalTransactions.toLocaleString()}
          </span>
          <span className="text-slate-400 text-[11px] font-semibold border border-slate-100 px-2 py-0.5 rounded-full bg-slate-50 shrink-0">
            Deals Closed
          </span>
        </div>
      </div>

      {/* 4. Bento Chart: Monthly Trend Area Chart */}
      <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-slate-300 transition-all duration-250 font-sans">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">Monthly Performance</h3>
            <span className="text-[10px] text-slate-400 font-semibold font-sans mt-0.5 uppercase tracking-wide flex flex-wrap items-center gap-1">
              Sales performance analysis {!selectedMonth && (
                <>
                  • <span className="text-indigo-600 font-extrabold underline decoration-dotted animate-pulse cursor-pointer">Click any month on chart to view top products</span>
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-sans font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Sales</span>
          </div>
        </div>
        <div className="h-44 sm:h-52 w-full">
          {monthlyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={monthlyTrends} 
                margin={{ top: 10, right: 15, left: 10, bottom: 0 }}
                onClick={(state) => {
                  if (state && state.activeLabel) {
                    setSelectedMonth(state.activeLabel);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0066b2" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0066b2" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={85}
                  tickFormatter={(val) => `Rp ${val >= 1000000 ? `${(val / 1000000).toFixed(1)}M` : `${val.toLocaleString('id-ID')}`}`}
                />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val), 'Sales']}
                  contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#0066b2" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">Unable to generate monthly dates aggregation.</div>
          )}
        </div>

        {/* Selected Month Detail Widget (Top 3 Products of the month) */}
        {selectedMonth && (
          <div className="mt-4 p-4 bg-indigo-50/50 border border-indigo-150 rounded-2xl transition-all animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></span>
                <h4 className="text-xs font-black text-indigo-900 uppercase tracking-tight">
                  Top 3 Products in {selectedMonth}
                </h4>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMonth(null);
                }}
                className="text-[10px] font-black text-slate-400 hover:text-indigo-600 cursor-pointer uppercase bg-transparent border-none py-1 px-1.5 transition-all"
              >
                Clear Selection ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {selectedMonthTopProducts.length > 0 ? (
                selectedMonthTopProducts.map((p, idx) => (
                  <div key={p.name} className="bg-white border border-slate-150 p-3 rounded-xl flex flex-col justify-between shadow-2xs hover:border-slate-350 transition-all">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded-md shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold truncate text-right flex-1" title={p.group_name}>
                          {p.group_name}
                        </span>
                      </div>
                      <p className="text-xs font-black text-slate-800 line-clamp-2 leading-snug mt-1" title={p.name}>
                        {p.name}
                      </p>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                      <span className="text-[9px] text-slate-400 font-extrabold">{p.units.toLocaleString()}</span>
                      <span className="text-xs font-black text-slate-900 font-mono">{formatCurrency(p.revenue)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-4 text-xs text-slate-400 font-semibold">
                  No records captured for this month.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. Bento Stat: Spotlight Card */}
      <div id="bento-conversion-accent" className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all duration-250 font-sans relative overflow-hidden">
        {/* Sleek edge highlights instead of noisy blurs */}
        <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-indigo-600"></div>
        
        <div className="pl-2 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <span className="text-indigo-600 text-[10px] font-extrabold uppercase tracking-widest block font-mono">Spotlight</span>
            <span className="text-emerald-700 text-[10px] bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full font-bold">
              Active Leader
            </span>
          </div>
          
          <h4 className="text-xs font-semibold text-slate-400 mt-5 uppercase tracking-wider">Top Performing Group</h4>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mt-1.5 overflow-hidden">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight break-words uppercase whitespace-normal" title={topGroupName}>
              {topGroupName}
            </span>
            <span className="text-xs font-black text-slate-800 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg shrink-0 w-fit">
              {topGroupPercent}% Share
            </span>
          </div>

          {/* Top 5 Products (SKUs) List directly under Top Performing Group */}
          <div className="mt-4 border-t border-slate-100 pt-4 flex-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2 font-mono">Top 5 Products (SKUs)</span>
            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
              {topGroupSKUs.map((sku, index) => (
                <div key={sku.name} className="flex justify-between items-start gap-2 bg-slate-50/50 p-2.5 border border-slate-100 rounded-2xl">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black text-slate-800 leading-snug break-words whitespace-normal uppercase">
                      {sku.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-slate-900 font-mono block">
                      {formatCurrency(sku.revenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="mt-4 border-t border-slate-100 pt-4 pl-2">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Sales</span>
            <span className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight font-mono block mt-1">
              {formatCurrency(stats.ttl_sales)}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Product Group share Pie Chart */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-slate-300 transition-all duration-250 font-sans flex flex-col justify-between min-h-[465px]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            {selectedGroup ? `${selectedGroup} Details` : 'Group Name Contribution'}
          </h3>
          {selectedGroup && (
            <button
              onClick={() => setSelectedGroup(null)}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider"
            >
              ← Back to Chart
            </button>
          )}
        </div>
        <div className="flex flex-col justify-center items-center w-full flex-1 min-h-0">
          {groupSummaries.length > 0 ? (
            selectedGroup ? (
              <div className="w-full flex flex-col justify-between flex-1 min-h-[340px]">
                <div className="text-left w-full mb-3 flex-1 flex flex-col min-h-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 shrink-0">
                    All Products in Group ({groupDetailedProducts.length})
                  </span>
                  <div className="space-y-2 flex-1 min-h-0 max-h-[250px] overflow-y-auto pr-1">
                    {groupDetailedProducts.map((p, pIdx) => (
                      <div 
                        key={p.name} 
                        className="flex justify-between items-start p-2 rounded-xl border border-slate-50 bg-slate-50/30 hover:bg-indigo-50/10 transition-all duration-150"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-slate-800 break-words leading-tight">
                            {p.name}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{p.units.toLocaleString()} units sold</p>
                        </div>
                        <span className="font-mono font-bold text-slate-700 shrink-0 text-[10px] pt-0.5">
                          {formatCurrency(p.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedGroup(null)}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-extrabold transition-all text-center uppercase tracking-wider shrink-0 mt-2"
                >
                  Return to Share Distribution
                </button>
              </div>
            ) : (
              <>
                <div className="relative h-52 w-full flex items-center justify-center shrink-0">
                  {/* Interactive Donut Center Stat Display */}
                  <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center max-w-[125px] px-1 z-10">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      {activePieIndex !== null ? 'Contribution' : 'Top Group'}
                    </span>
                    <span className="text-sm font-black text-slate-800 tracking-tight truncate max-w-[120px] mt-1.5 leading-tight" title={
                      activePieIndex !== null 
                        ? groupSummaries[activePieIndex]?.name 
                        : groupSummaries[0]?.name
                    }>
                      {activePieIndex !== null 
                        ? groupSummaries[activePieIndex]?.name 
                        : groupSummaries[0]?.name
                      }
                    </span>
                    <span className="text-base font-black text-indigo-600 mt-1.5 leading-none">
                      {activePieIndex !== null 
                        ? `${groupSummaries[activePieIndex]?.percentage}%` 
                        : `${groupSummaries[0]?.percentage}%`
                      }
                    </span>
                  </div>

                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={groupSummaries}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={0}
                        dataKey="revenue"
                        stroke="none"
                        onMouseEnter={(_, index) => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(null)}
                      >
                        {groupSummaries.map((entry, index) => {
                          const isHovered = activePieIndex === index;
                          const isAnyHovered = activePieIndex !== null;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={CHART_COLORS[index % CHART_COLORS.length]} 
                              stroke="none"
                              opacity={isAnyHovered ? (isHovered ? 1 : 0.35) : 0.95}
                              onClick={() => setSelectedGroup(entry.name)}
                              style={{
                                transition: 'all 200ms ease-in-out',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => [formatCurrency(val), 'Volume']}
                        contentStyle={{ background: '#1e293b', borderRadius: '10px', border: 'none', fontSize: '10px', color: '#fff', padding: '6px 10px' }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ display: 'none' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Interactive Legend List */}
                <div className="mt-3 grid grid-cols-1 gap-y-1.5 w-full text-[10px] font-sans border-t border-slate-100 pt-3 flex-1 min-h-[110px] max-h-[120px] overflow-y-auto pr-1">
                  {groupSummaries.slice(0, 4).map((cat, idx) => {
                    const items = groupTopProducts[cat.name] || [];
                    const isHovered = activePieIndex === idx;
                    return (
                      <div 
                        key={cat.name} 
                        className={`flex flex-col gap-0.5 min-w-0 p-1 rounded-xl transition-all duration-150 cursor-pointer ${
                          isHovered 
                            ? 'bg-slate-50 border-l-2 border-indigo-500 pl-2 shadow-xxs scale-[1.01]' 
                            : 'hover:bg-slate-50/50 hover:pl-1.5 pl-1 border-l-2 border-transparent'
                        }`}
                        onMouseEnter={() => setActivePieIndex(idx)}
                        onMouseLeave={() => setActivePieIndex(null)}
                        onClick={() => setSelectedGroup(cat.name)}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }} />
                          <span className="text-slate-700 font-semibold truncate text-xs" title={cat.name}>{cat.name}</span>
                          <span className="font-mono font-bold text-slate-800 ml-auto shrink-0">{cat.percentage}%</span>
                        </div>
                        {items.length > 0 && (
                          <p className="pl-3.5 text-[9px] text-slate-400 font-medium truncate italic" title={items.join(', ')}>
                            Products: {items.join(', ')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )
          ) : (
            <p className="text-xs text-slate-400">No Group Data Found.</p>
          )}
        </div>
      </div>

      {/* 7. Bento Product Leaderboard */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-slate-300 transition-all duration-250 font-sans flex flex-col justify-between min-h-[465px]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0 col-span-1">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Top-Selling Products</h3>
          <span className="text-[10px] text-slate-400 font-semibold font-mono">Top 10</span>
        </div>
        <div className="space-y-2.5 flex-1 min-h-[340px] max-h-[360px] overflow-y-auto pr-1">
          {topProducts.slice(0, 10).map((item, idx) => {
            return (
              <div key={item.name} className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/40 hover:bg-slate-50/90 transition-all duration-150">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-xs w-6 text-center text-slate-500 font-bold bg-slate-100 py-0.5 rounded shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 whitespace-normal break-words" title={item.name}>{item.name}</p>
                    <p className="text-[9px] text-slate-400 font-sans">{item.group_name}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2 font-mono">
                  <p className="text-xs font-black text-slate-900">{formatCurrency(item.revenue)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 8. Bento Bar: group split progress */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-slate-300 transition-all duration-250 font-sans flex flex-col justify-between min-h-[465px]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Group Splits</h3>
          <span className="text-[10px] text-slate-400 font-semibold font-mono">Top Groups</span>
        </div>
        <div className="space-y-2.5 font-sans flex-1 min-h-[240px] max-h-[250px] overflow-y-auto pr-1 mb-3">
          {groupSummaries.slice(0, 10).map((cat, idx) => {
            const pct = cat.percentage;
            const barColors = ['bg-indigo-600', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500', 'bg-blue-500', 'bg-violet-500', 'bg-rose-500'];
            const barBgColor = barColors[idx % barColors.length];

            return (
              <div key={cat.name} className="hover:bg-slate-50/50 py-1.5 px-2 rounded-xl transition-all">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="uppercase tracking-wider text-slate-500 text-[10px] truncate max-w-[80%]" title={cat.name}>{cat.name}</span>
                  <span className="text-slate-800 font-mono text-[10px]">{pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${barBgColor}`} style={{ width: `${pct}%` }}></div>
                </div>
              </div>
            );
          })}

          {groupSummaries.length === 0 && (
            <p className="text-xs text-slate-400">No Group Data Found.</p>
          )}
        </div>

        <div className="mt-auto shrink-0 p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 text-[11px] leading-relaxed text-indigo-700 font-medium font-sans">
          <strong>Secure Studio:</strong> Data remains client-side. Convert spreadsheets instantly here.
        </div>
      </div>

      {/* 9. Elite McKinsey Pareto Outlet Analysis block */}
      <div className="lg:col-span-12 bg-white border border-slate-200 rounded-3xl p-6 shadow-xs hover:border-slate-350 transition-all duration-250 font-sans space-y-6">
        <div id="pareto-header-block" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-650 text-amber-600" />
              <h3 className="font-extrabold text-slate-950 text-base tracking-tight uppercase">
                Kanal Distribusi Pareto (Strategic 80/20 Analysis)
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
              Mengevaluasi kontributor kritis (Pareto Outlets) yang mengontrol <strong className="text-amber-700 font-extrabold text-xs">80% dari total revenue</strong> portofolio.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="bg-amber-50 border border-amber-200/50 rounded-2xl px-3.5 py-1.5 text-right shrink-0">
              <span className="text-[9px] text-amber-800 font-black uppercase tracking-wider block font-mono">Pareto Core Contribution</span>
              <span className="text-sm font-black text-slate-900 font-mono block mt-0.5">
                {paretoData.paretoPercentage.toFixed(1)}% ({formatCurrency(paretoData.paretoRevenue)})
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/50 rounded-2xl px-3.5 py-1.5 text-right shrink-0">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block font-mono font-sans">Core Outlets</span>
              <span className="text-sm font-black text-slate-900 font-mono block mt-0.5">
                {paretoData.paretoCount} / {paretoData.totalCount} ({paretoData.totalCount > 0 ? ((paretoData.paretoCount / paretoData.totalCount) * 100).toFixed(1) : 0}%)
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Warning Alert on severe client concentration risk */}

        <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-3xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse table-fixed min-w-[750px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-extrabold uppercase text-[9px] tracking-wider">
                  <th className="py-2.5 px-3" style={{ width: '60px' }}>Rank</th>
                  <th className="py-2.5 px-3" style={{ width: '110px' }}>ID Outlet</th>
                  <th className="py-2.5 px-3" style={{ width: '280px' }}>Nama Toko / Outlet</th>
                  <th className="py-2.5 px-3 text-right" style={{ width: '130px' }}>Total Net Sales</th>
                  <th className="py-2.5 px-3 text-center" style={{ width: '90px' }}>Share %</th>
                  <th className="py-2.5 px-3 text-center" style={{ width: '110px' }}>Kumulatif %</th>
                  <th className="py-2.5 px-3 text-center" style={{ width: '130px' }}>Status Klasifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paretoData.list.slice(0, showAllOutlets ? undefined : 6).map((item, idx) => {
                  return (
                    <tr key={item.customerId} className={`hover:bg-slate-50/60 transition-all font-semibold ${item.isPareto ? 'bg-amber-50/15' : ''}`}>
                      <td className="py-2.5 px-3">
                        <span className={`font-mono text-xs w-6 text-center block rounded font-bold ${item.isPareto ? 'bg-amber-150 text-amber-800' : 'bg-slate-100 text-slate-500'}`}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-505 font-mono">
                        {item.customerId}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 truncate" title={item.name}>
                        <div className="flex items-center gap-1.5">
                          {item.isPareto && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse"></span>}
                          <span className="truncate">{item.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-[11px] text-slate-950 font-bold">
                        {formatCurrency(item.totalSales)}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-900 font-mono">
                        {item.percentage.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                        {item.cumulativePercentage.toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-black uppercase text-center tracking-wide inline-block leading-none ${
                          item.isPareto 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {item.isPareto ? '🔥 PARETO CRITICAL' : 'LONG TAIL'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {paretoData.list.length > 6 && (
            <div className="p-3 bg-slate-50 border-t border-slate-150 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-bold italic">
                *Menampilkan {showAllOutlets ? paretoData.list.length : 6} dari total {paretoData.list.length} outlet terdaftar.
              </span>
              <button
                onClick={() => setShowAllOutlets(!showAllOutlets)}
                className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-extrabold text-[10px] text-indigo-700 uppercase transition-all shadow-3xs cursor-pointer"
              >
                {showAllOutlets ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Seluruh Outlet'}
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
