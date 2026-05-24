/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  User, 
  DollarSign, 
  ShoppingBag, 
  Calendar, 
  TrendingUp, 
  Briefcase, 
  Award, 
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { SalesRecord } from '../types';
import { CASH_BACK_PARTICIPANTS, WHITE_BONUS_PARTICIPANTS } from './programParticipants';
import { 
  AreaChart, 
  Area, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { calculateMonthlyTrends } from '../utils';

interface CustomerSummary {
  customerId: string;
  totalSpend: number;
  ordersCount: number;
  unitsBought: number;
  products: Record<string, { name: string; qty: number; spend: number; group: string }>;
  groups: Record<string, { name: string; spend: number; qty: number }>;
  dates: { date: string; product: string; qty: number; spend: number }[];
}

interface Participant {
  no: string;
  code: string;
  codes: string[];
  originalCodes?: string[];
  name: string;
  target: number;
  monthlySales: {
    Jan: number; Feb: number; Mar: number; Apr: number;
    Mei: number; Jun: number; Jul: number; Agt: number;
    Sep: number; Okt: number; Nov: number; Des: number;
  };
}

interface CustomerSpotlightProps {
  records: SalesRecord[];
  selectedCustId?: string;
  onSelectCustomer?: (id: string) => void;
}



export default function CustomerSpotlight({ records, selectedCustId: propSelectedCustId, onSelectCustomer }: CustomerSpotlightProps) {
  const [internalSelectedCustId, setInternalSelectedCustId] = useState<string>('');
  const selectedCustId = propSelectedCustId !== undefined ? propSelectedCustId : internalSelectedCustId;
  const setSelectedCustId = onSelectCustomer || setInternalSelectedCustId;

  const [searchQuery, setSearchQuery] = useState('');
  const [activePeriod, setActivePeriod] = useState<'I' | 'II' | 'III'>('I');

  // Combine participants with same "no"
  const mergedParticipants = useMemo(() => {
    const groups: Record<string, typeof CASH_BACK_PARTICIPANTS> = {};
    CASH_BACK_PARTICIPANTS.forEach(p => {
      if (!groups[p.no]) {
        groups[p.no] = [];
      }
      groups[p.no].push(p);
    });

    return Object.entries(groups).map(([no, items]) => {
      const emptyMonthlySales = {
        Jan: 0, Feb: 0, Mar: 0, Apr: 0,
        Mei: 0, Jun: 0, Jul: 0, Agt: 0,
        Sep: 0, Okt: 0, Nov: 0, Des: 0
      };

      if (items.length === 1) {
        return {
          ...items[0],
          codes: [items[0].code.toLowerCase()],
          originalCodes: [items[0].code],
          monthlySales: emptyMonthlySales
        };
      }

      const combinedCode = items.map(item => item.code).join(' / ');
      const combinedCodes = items.map(item => item.code.toLowerCase());
      const combinedName = items.map(item => item.name).join(' / ');
      
      // Target combines: if identical, use that target. If different, sum them.
      const allTargetsEqual = items.every(item => item.target === items[0].target);
      const combinedTarget = allTargetsEqual 
        ? items[0].target 
        : items.reduce((acc, item) => acc + item.target, 0);

      return {
        no,
        code: combinedCode,
        codes: combinedCodes,
        originalCodes: items.map(item => item.code),
        name: combinedName,
        target: combinedTarget,
        monthlySales: emptyMonthlySales
      };
    });
  }, []);

  // 1. Calculate general stats for EVERY customer in the database
  const customerSummaryList = useMemo<CustomerSummary[]>(() => {
    const clients: Record<string, CustomerSummary> = {};

    records.forEach(r => {
      const custId = r.customer_id || 'GUEST';
      if (!clients[custId]) {
        clients[custId] = {
          customerId: custId,
          totalSpend: 0,
          ordersCount: 0,
          unitsBought: 0,
          products: {},
          groups: {},
          dates: []
        };
      }

      const client = clients[custId];
      let sale = typeof r.ttl_sales === 'number' && !isNaN(r.ttl_sales) ? r.ttl_sales : 0;
      if (sale === 0 && r.quantity > 0 && r.unitPrice > 0) {
        sale = r.quantity * r.unitPrice;
      }
      const qty = typeof r.quantity === 'number' && !isNaN(r.quantity) ? r.quantity : 1;

      client.totalSpend += sale;
      client.ordersCount += 1;
      client.unitsBought += qty;

      // Product distribution
      const prodName = r.product || 'Unnamed Product';
      if (!client.products[prodName]) {
        client.products[prodName] = { name: prodName, qty: 0, spend: 0, group: r.group_name || 'Uncategorized' };
      }
      client.products[prodName].qty += qty;
      client.products[prodName].spend += sale;

      // Group distribution
      const gName = r.group_name || 'Uncategorized';
      if (!client.groups[gName]) {
        client.groups[gName] = { name: gName, spend: 0, qty: 0 };
      }
      client.groups[gName].spend += sale;
      client.groups[gName].qty += qty;

      // Chronological history
      client.dates.push({
        date: r.date,
        product: prodName,
        qty: qty,
        spend: sale
      });
    });

    // Sort dates descending for each client
    Object.values(clients).forEach(client => {
      client.dates.sort((a, b) => b.date.localeCompare(a.date));
    });

    return Object.values(clients).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [records]);

  // Helper to resolve customer name from CASH_BACK_PARTICIPANTS or records customFields
  const getClientName = useMemo(() => {
    const idToNameMap: Record<string, string> = {};

    CASH_BACK_PARTICIPANTS.forEach(p => {
      idToNameMap[p.code.toLowerCase().trim()] = p.name;
    });

    WHITE_BONUS_PARTICIPANTS.forEach(p => {
      idToNameMap[p.code.toLowerCase().trim()] = p.name;
    });

    records.forEach(r => {
      const cId = (r.customer_id || 'GUEST').trim();
      const cIdLower = cId.toLowerCase();
      
      if (!idToNameMap[cIdLower] || idToNameMap[cIdLower] === 'GUEST') {
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
            if (valStr && valStr.toLowerCase() !== cIdLower) {
              idToNameMap[cIdLower] = valStr;
            }
          }
        }
      }
    });

    return (id: string): string => {
      const cleanId = (id || '').trim().toLowerCase();
      if (!cleanId) return '';
      const direct = idToNameMap[cleanId];
      if (direct) return direct;

      const match = CASH_BACK_PARTICIPANTS.find(p => 
        p.code.toLowerCase().trim() === cleanId || 
        cleanId.includes(p.code.toLowerCase().trim())
      );
      if (match) return match.name;

      const whiteMatch = WHITE_BONUS_PARTICIPANTS.find(p => 
        p.code.toLowerCase().trim() === cleanId || 
        cleanId.includes(p.code.toLowerCase().trim())
      );
      if (whiteMatch) return whiteMatch.name;

      return '';
    };
  }, [records]);

  // Set default selected customer if none selected yet
  const activeCustomer = useMemo(() => {
    if (customerSummaryList.length === 0) return null;
    
    // Attempt searching for selected selection
    const matched = customerSummaryList.find(c => c.customerId.toLowerCase() === selectedCustId.toLowerCase());
    if (matched) return matched;

    // Fallback to top contribution customer
    return customerSummaryList[0];
  }, [customerSummaryList, selectedCustId]);

  const activeCustomerRecords = useMemo(() => {
    if (!activeCustomer) return [];
    const custIdLower = activeCustomer.customerId.toLowerCase().trim();
    return records.filter(r => (r.customer_id || 'GUEST').toLowerCase().trim() === custIdLower);
  }, [records, activeCustomer]);

  const monthlyTrends = useMemo(() => {
    return calculateMonthlyTrends(activeCustomerRecords);
  }, [activeCustomerRecords]);

  // Handle setting active selection
  const handleSelectCustomer = (id: string) => {
    setSelectedCustId(id);
  };

  // Filter clients for list display
  const filteredClients = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return customerSummaryList;
    return customerSummaryList.filter(c => 
      c.customerId.toLowerCase().includes(query) ||
      getClientName(c.customerId).toLowerCase().includes(query) ||
      Object.keys(c.products).some(p => p.toLowerCase().includes(query)) ||
      Object.keys(c.groups).some(g => g.toLowerCase().includes(query))
    );
  }, [customerSummaryList, searchQuery, getClientName]);

  // Helper formatting IDR currency
  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  if (records.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 font-sans shadow-xs">
        <User className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-800">No active customer registry</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed font-semibold">
          Drop or map a spreadsheet with sales columns containing Client/Customer identifiers to unlock detailed profiling!
        </p>
      </div>
    );
  }

  // Calculate favorite category for active profile
  const bestCategory = activeCustomer ? (Object.values(activeCustomer.groups) as Array<{ name: string; spend: number; qty: number }>).sort((a, b) => b.spend - a.spend)[0] : null;

  // Find matching participant or create a fallback
  const activeParticipant = useMemo<Participant | null>(() => {
    if (!activeCustomer) return null;
    const idLower = activeCustomer.customerId.toLowerCase().trim();
    const match = mergedParticipants.find(p => 
      p.codes.includes(idLower) ||
      p.code.toLowerCase().trim() === idLower || 
      idLower.includes(p.code.toLowerCase().trim()) ||
      p.name.toLowerCase().trim() === idLower ||
      idLower.includes(p.name.toLowerCase().trim())
    );
    
    if (match) {
      return match;
    }
    
    // Dynamic generated partner fallback
    const targetVal = Math.round(activeCustomer.totalSpend * 0.45);
    const monthlySales = {
      Jan: 0, Feb: 0, Mar: 0, Apr: 0,
      Mei: 0, Jun: 0, Jul: 0, Agt: 0,
      Sep: 0, Okt: 0, Nov: 0, Des: 0
    };
    
    activeCustomer.dates.forEach(d => {
      const parts = d.date.split('-');
      if (parts.length === 3) {
        const m = parseInt(parts[1], 10);
        if (m === 1) monthlySales.Jan += d.spend;
        else if (m === 2) monthlySales.Feb += d.spend;
        else if (m === 3) monthlySales.Mar += d.spend;
        else if (m === 4) monthlySales.Apr += d.spend;
        else if (m === 5) monthlySales.Mei += d.spend;
        else if (m === 6) monthlySales.Jun += d.spend;
        else if (m === 7) monthlySales.Jul += d.spend;
        else if (m === 8) monthlySales.Agt += d.spend;
        else if (m === 9) monthlySales.Sep += d.spend;
        else if (m === 10) monthlySales.Okt += d.spend;
        else if (m === 11) monthlySales.Nov += d.spend;
        else if (m === 12) monthlySales.Des += d.spend;
      }
    });

    return {
      no: 'N/A',
      code: activeCustomer.customerId,
      codes: [activeCustomer.customerId.toLowerCase()],
      originalCodes: [activeCustomer.customerId],
      name: getClientName(activeCustomer.customerId) || 'Dynamic Registered Partner',
      target: targetVal || 50000000,
      monthlySales
    };
  }, [activeCustomer, mergedParticipants, getClientName]);

  const getPeriodMetrics = (p: 'I' | 'II' | 'III') => {
    if (!activeParticipant) return { months: [], target: 0, totalSales: 0, achPercent: 0, gap: 0 };
    
    const target = activeParticipant.target;
    let months: Array<{ name: string; key: keyof typeof activeParticipant.monthlySales }> = [];
    if (p === 'I') {
      months = [
        { name: 'Januari', key: 'Jan' },
        { name: 'Februari', key: 'Feb' },
        { name: 'Maret', key: 'Mar' },
        { name: 'April', key: 'Apr' }
      ];
    } else if (p === 'II') {
      months = [
        { name: 'Mei', key: 'Mei' },
        { name: 'Juni', key: 'Jun' },
        { name: 'Juli', key: 'Jul' },
        { name: 'Agustus', key: 'Agt' }
      ];
    } else {
      months = [
        { name: 'September', key: 'Sep' },
        { name: 'Oktober', key: 'Okt' },
        { name: 'November', key: 'Nov' },
        { name: 'Desember', key: 'Des' }
      ];
    }

    const liveMonthlySalesObj = {
      Jan: 0, Feb: 0, Mar: 0, Apr: 0,
      Mei: 0, Jun: 0, Jul: 0, Agt: 0,
      Sep: 0, Okt: 0, Nov: 0, Des: 0
    };

    if (activeParticipant.codes) {
      const liveMonthsMap = {
        1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr',
        5: 'Mei', 6: 'Jun', 7: 'Jul', 8: 'Agt',
        9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Des'
      } as Record<number, keyof typeof activeParticipant.monthlySales>;

      activeParticipant.codes.forEach(codeLower => {
        const custSummary = customerSummaryList.find(c => c.customerId.toLowerCase() === codeLower);
        if (custSummary) {
          custSummary.dates.forEach(d => {
            const parts = d.date.split('-');
            if (parts.length === 3) {
              const m = parseInt(parts[1], 10);
              const key = liveMonthsMap[m];
              if (key) {
                liveMonthlySalesObj[key] += d.spend;
              }
            }
          });
        }
      });
    }

    let totalSales = 0;
    const monthBreakdown = months.map(m => {
      const s = liveMonthlySalesObj[m.key] || 0;
      totalSales += s;
      return { name: m.name, value: s };
    });

    const achPercent = target > 0 ? (totalSales / target) * 100 : 0;
    const gap = totalSales - target;

    return {
      months: monthBreakdown,
      target,
      totalSales,
      achPercent,
      gap
    };
  };

  return (
    <div id="customer-analytics-layout" className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-sans">
      
      {/* LEFT COLUMN: Customer Selection Hub */}
      <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col h-[650px]">
        <div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Customer Search</h3>
        </div>

        {/* Search form bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Cust ID/item bought..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50/75 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white text-slate-800 font-mono"
          />
        </div>

        {/* Scrollable list panel */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-1.5 custom-scrollbar">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => {
              const isSelected = activeCustomer?.customerId === client.customerId;
              const clientName = getClientName(client.customerId);
              return (
                <button
                  key={client.customerId}
                  onClick={() => handleSelectCustomer(client.customerId)}
                  className={`w-full p-3 rounded-2xl border text-left flex items-start justify-between gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-700 hover:bg-slate-100/30'
                  }`}
                >
                  <div className="min-w-0 pr-1 flex-1">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`} />
                        <span className="font-mono text-xs font-black truncate" title={client.customerId}>{client.customerId}</span>
                      </div>
                      {clientName && (
                        <p className={`text-[10px] font-bold truncate ${
                          isSelected ? 'text-indigo-100' : 'text-slate-500'
                        }`} title={clientName}>
                          {clientName}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0 self-center">
                    <span className="text-xs font-black block font-mono">
                      {formatCurrency(client.totalSpend)}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs font-semibold">
              No matching clients found.
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 pt-3.5 mt-2 flex items-center justify-between text-[10px] text-slate-400 font-bold font-mono">
          <span>Total Registry Size</span>
          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
            {customerSummaryList.length} Accounts
          </span>
        </div>
      </div>

      {/* RIGHT COLUMN: Active Customer Performance Board */}
      <div className="lg:col-span-8 space-y-6">
        {activeCustomer ? (
          <>
            {/* 1. Header Hero Panel */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="absolute top-0 right-0 bottom-0 w-2.5 bg-indigo-600"></div>
              
              <div className="flex items-center gap-3.5">
                <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl">
                  <User className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">
                      {getClientName(activeCustomer.customerId) || activeCustomer.customerId}
                    </h2>
                    <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      Indexed Account
                    </span>
                  </div>
                  {getClientName(activeCustomer.customerId) && (
                    <span className="font-mono text-xs text-slate-500 font-bold block mt-0.5">
                      Client ID: {activeCustomer.customerId}
                    </span>
                  )}
                </div>
              </div>

              {bestCategory && (
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/30 border border-emerald-100 px-4 py-2.5 rounded-2xl shrink-0 text-left sm:text-right">
                  <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider block font-mono">Core Affinity Category</span>
                  <span className="text-sm font-extrabold text-slate-800 tracking-tight block mt-0.5">{bestCategory.name}</span>
                </div>
              )}
            </div>

            {/* 2. Analytical Metrics row */}
            <div className="grid grid-cols-1 gap-4">
              
              {/* Stat Card 1: Revenue Contribution */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs relative min-w-0 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Sales</span>
                  <span 
                    className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 block font-mono mt-1.5 leading-none break-words" 
                    title={formatCurrency(activeCustomer.totalSpend)}
                  >
                    {formatCurrency(activeCustomer.totalSpend)}
                  </span>
                </div>
                <DollarSign className="w-5 h-5 text-indigo-500 absolute top-4 right-4 opacity-40 pointer-events-none hidden xs:block" />
              </div>

            </div>

            {/* Monthly Performance Chart */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden font-sans">
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                  <h3 className="font-bold text-slate-800 text-sm tracking-tight">Monthly Performance</h3>
                  <span className="text-[10px] text-slate-400 font-semibold font-sans mt-0.5 uppercase tracking-wide">
                    Sales performance timeline for this customer
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-sans font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Sales</span>
                </div>
              </div>

              <div className="h-44 sm:h-52 w-full">
                {monthlyTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart 
                      data={monthlyTrends} 
                      margin={{ top: 10, right: 15, left: 10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorCustomerRevenue" x1="0" y1="0" x2="0" y2="1">
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
                      <Area type="monotone" dataKey="revenue" stroke="#0066b2" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCustomerRevenue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No timeline data recorded for this customer.
                  </div>
                )}
              </div>
            </div>

            {/* 3. Favorite Groups and Top Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Column Group shares */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Favorite Categories</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-semibold font-mono">By Spend</span>
                  </div>
                  
                  <div className="space-y-4">
                    {(Object.values(activeCustomer.groups) as Array<{ name: string; spend: number; qty: number }>).sort((a,b)=> b.spend - a.spend).map(grp => {
                      const percent = activeCustomer.totalSpend > 0 ? parseFloat(((grp.spend / activeCustomer.totalSpend) * 100).toFixed(1)) : 0;
                      return (
                        <div key={grp.name} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                            <span className="truncate pr-2 font-semibold text-slate-800">{grp.name}</span>
                            <span className="font-mono text-slate-500 text-[11px] shrink-0 font-medium">{formatCurrency(grp.spend)} ({percent}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100/80 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Products purchased list */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-teal-500" />
                    <span>Top 10 Products</span>
                  </h4>
                  <span className="text-[10px] text-slate-400 font-semibold font-mono">By Revenue</span>
                </div>

                <div className="space-y-2.5">
                  {(Object.values(activeCustomer.products) as Array<{ name: string; qty: number; spend: number; group: string }>).sort((a, b) => b.spend - a.spend).slice(0, 10).map(prod => (
                    <div key={prod.name} className="flex justify-between items-center gap-3 text-xs border-b border-slate-50 pb-2 hover:bg-slate-50/30 px-1 rounded-lg transition-colors">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-800 block text-xs break-words leading-tight" title={prod.name}>
                          {prod.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {prod.group} • {prod.qty} units
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-700 shrink-0 text-[11px] self-center">
                        {formatCurrency(prod.spend)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>


          </>
        ) : (
          <div className="bg-white border border-slate-205 rounded-3xl p-12 text-center text-slate-400 text-xs">
            Internal evaluation issue. Please reload some datasets.
          </div>
        )}
      </div>

    </div>
  );
}
