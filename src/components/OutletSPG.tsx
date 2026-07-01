/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Search, 
  ShoppingBag, 
  Calendar, 
  TrendingUp, 
  Database,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  ChevronRight,
  ListCollapse,
  Store,
  BarChart2,
  CheckCircle2,
  PlusCircle
} from 'lucide-react';
import { SalesRecord } from '../types';
import { formatCurrency } from '../utils';
import { CASH_BACK_PARTICIPANTS, WHITE_BONUS_PARTICIPANTS } from './programParticipants';
import { classifyRecord } from './BrandInformation';

function getBrandColor(brandName: string): string {
  const name = brandName.toLowerCase().trim();
  
  if (name.includes('acnes')) return 'bg-emerald-500';
  if (name.includes('hada labo') || name.includes('hadalabo')) return 'bg-sky-400';
  if (name.includes('khalisa')) return 'bg-pink-400';
  if (name.includes('lip ice') || name.includes('lipice') || name.includes('lip on lip')) return 'bg-rose-500';
  if (name.includes('melano')) return 'bg-amber-500';
  if (name.includes('selsun')) return 'bg-teal-600';
  if (name.includes('eye care')) return 'bg-indigo-600';
  if (name.includes('eye wash') || name.includes('eye flush')) return 'bg-cyan-500';
  if (name.includes('skin aqua dan sunplay')) return 'bg-violet-500';
  if (name.includes('skin aqua')) return 'bg-blue-500';
  if (name.includes('sunplay')) return 'bg-orange-500';
  if (name.includes('oxy')) return 'bg-red-600';
  if (name.includes('mentholatum')) return 'bg-green-700';
  
  const colors = [
    'bg-indigo-500', 
    'bg-violet-500', 
    'bg-fuchsia-500', 
    'bg-purple-500', 
    'bg-pink-500', 
    'bg-rose-500', 
    'bg-amber-500', 
    'bg-emerald-500', 
    'bg-teal-500', 
    'bg-cyan-500', 
    'bg-sky-500', 
    'bg-blue-500'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  BarChart,
  Bar,
  Cell
} from 'recharts';

interface SPGOutlet {
  id: string;
  custValue: string; // The customer code or customer name matched in the excel sheet
  aliasName: string; // Nickname/Label given by the user
  addedAt: string;
  targetAmount?: number;
}

interface OutletSPGProps {
  records: SalesRecord[];
}

export default function OutletSPG({ records }: OutletSPGProps) {
  // Local persistent state for SPG Outlets
  const [outlets, setOutlets] = useState<SPGOutlet[]>(() => {
    try {
      const saved = localStorage.getItem('sales_report_spg_outlets');
      if (saved) {
        const parsed: SPGOutlet[] = JSON.parse(saved);
        return parsed.map(o => ({
          ...o,
          aliasName: o.aliasName && o.aliasName.startsWith('SPG - ') 
            ? o.aliasName.substring(6) 
            : o.aliasName
        }));
      }
    } catch (e) {
      console.error('Failed to parse SPG outlets:', e);
    }
    return [];
  });

  const [selectedOutletId, setSelectedOutletId] = useState<string>('');
  const [newCustValue, setNewCustValue] = useState<string>('');
  const [newAlias, setNewAlias] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [availSearchQuery, setAvailSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grouped' | 'transactions'>('grouped');
  const [manualError, setManualError] = useState<string>('');
  const [targetInputValue, setTargetInputValue] = useState<string>('');

  // Save SPG Outlets to localStorage
  const saveOutlets = (updated: SPGOutlet[]) => {
    setOutlets(updated);
    try {
      localStorage.setItem('sales_report_spg_outlets', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Find all unique customer IDs and names currently present in the spreadsheet
  const uniqueCustomersInLedger = useMemo(() => {
    const clientsMap: Record<string, { id: string; name?: string; count: number; spend: number }> = {};
    records.forEach(r => {
      const id = r.customer_id?.trim() || 'GUEST';
      const spend = r.ttl_sales || 0;
      if (!clientsMap[id]) {
        clientsMap[id] = { id, count: 0, spend: 0 };
      }
      clientsMap[id].count += 1;
      clientsMap[id].spend += spend;
    });
    return Object.values(clientsMap).sort((a, b) => b.spend - a.spend);
  }, [records]);

  // Helper to resolve customer name from CASH_BACK_PARTICIPANTS, WHITE_BONUS_PARTICIPANTS or records customFields
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

  // Filter list of available customers to search & select
  const filteredAvailableLedgerCustomers = useMemo(() => {
    const q = availSearchQuery.toLowerCase().trim();
    if (!q) {
      // By default, just show the top 10 ledger customers by spend/volume so it's not empty
      return uniqueCustomersInLedger.slice(0, 10);
    }
    return uniqueCustomersInLedger.filter(u => 
      u.id.toLowerCase().includes(q) || 
      getClientName(u.id).toLowerCase().includes(q)
    );
  }, [uniqueCustomersInLedger, availSearchQuery, getClientName]);

  // Pre-seed some default active outlets if the program is completely brand new and files are loaded
  useEffect(() => {
    if (outlets.length === 0 && uniqueCustomersInLedger.length > 0) {
      const sampleSeeds: SPGOutlet[] = uniqueCustomersInLedger.slice(0, 3).map((cust, idx) => ({
        id: `spg-seed-${idx}-${Date.now()}`,
        custValue: cust.id,
        aliasName: getClientName(cust.id) || cust.id,
        addedAt: new Date().toISOString()
      }));
      saveOutlets(sampleSeeds);
      if (sampleSeeds.length > 0) {
        setSelectedOutletId(sampleSeeds[0].id);
      }
    }
  }, [uniqueCustomersInLedger]);

  // Set default selected outlet if none selected
  useEffect(() => {
    if (outlets.length > 0 && !selectedOutletId) {
      setSelectedOutletId(outlets[0].id);
    }
  }, [outlets, selectedOutletId]);

  // Add a new custom SPG outlet
  const handleAddOutlet = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVal = newCustValue.trim();
    if (!cleanVal) return;

    // Check if copy duplicate already exists
    const duplicate = outlets.some(o => o.custValue.toLowerCase() === cleanVal.toLowerCase());
    if (duplicate) {
      alert('This Cust ID is already registered in your SPG Outlets list!');
      return;
    }

    const created: SPGOutlet = {
      id: `spg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      custValue: cleanVal,
      aliasName: newAlias.trim() || getClientName(cleanVal) || cleanVal,
      addedAt: new Date().toISOString()
    };

    const nextList = [...outlets, created];
    saveOutlets(nextList);
    setSelectedOutletId(created.id);
    
    // Clear inputs
    setNewCustValue('');
    setNewAlias('');
  };

  // Remove a custom registered SPG Outlet
  const handleDeleteOutlet = (id: string, name: string) => {
    const filtered = outlets.filter(o => o.id !== id);
    saveOutlets(filtered);
    if (selectedOutletId === id) {
      setSelectedOutletId(filtered.length > 0 ? filtered[0].id : '');
    }
  };

  const selectedOutlet = useMemo(() => {
    return outlets.find(o => o.id === selectedOutletId) || null;
  }, [outlets, selectedOutletId]);

  // Sync internal target input value on outlet switch
  useEffect(() => {
    if (selectedOutlet) {
      setTargetInputValue(selectedOutlet.targetAmount ? String(selectedOutlet.targetAmount) : '');
    } else {
      setTargetInputValue('');
    }
  }, [selectedOutletId, selectedOutlet]);

  const handleSaveTarget = () => {
    if (!selectedOutletId) return;
    if (targetInputValue.trim() === '') {
      const updated = outlets.map(o => {
        if (o.id === selectedOutletId) {
          const { targetAmount, ...rest } = o;
          return rest;
        }
        return o;
      });
      saveOutlets(updated);
      return;
    }
    const numericVal = parseFloat(targetInputValue.replace(/[^0-9.-]+/g, ''));
    if (isNaN(numericVal) || numericVal < 0) {
      alert('Target nominal harus berupa angka!');
      return;
    }
    const updated = outlets.map(o => {
      if (o.id === selectedOutletId) {
        return {
          ...o,
          targetAmount: numericVal
        };
      }
      return o;
    });
    saveOutlets(updated);
  };

  // Query records that match the selected outlet dynamically
  const matchedRecordsOfSelected = useMemo(() => {
    if (!selectedOutlet) return [];
    const filterTerm = selectedOutlet.custValue.toLowerCase().trim();
    return records.filter(r => {
      const cid = (r.customer_id || '').toLowerCase().trim();
      const product = (r.product || '').toLowerCase().trim();
      return cid === filterTerm || cid.includes(filterTerm);
    });
  }, [selectedOutlet, records]);

  // Compile general analytical metrics
  const selectedOutletMetrics = useMemo(() => {
    let totalSales = 0;
    let totalUnits = 0;
    let transactions = matchedRecordsOfSelected.length;
    const uniqueProducts = new Set<string>();

    matchedRecordsOfSelected.forEach(r => {
      totalSales += r.ttl_sales || 0;
      totalUnits += r.quantity || 0;
      if (r.product) uniqueProducts.add(r.product.trim());
    });

    const averageBasket = transactions > 0 ? totalSales / transactions : 0;

    return {
      totalSales,
      totalUnits,
      transactions,
      uniqueProductsCount: uniqueProducts.size,
      averageBasket
    };
  }, [matchedRecordsOfSelected]);

  const progressPercentage = useMemo(() => {
    if (!selectedOutlet || !selectedOutlet.targetAmount || selectedOutlet.targetAmount <= 0) {
      return 0;
    }
    return (selectedOutletMetrics.totalSales / selectedOutlet.targetAmount) * 100;
  }, [selectedOutlet, selectedOutletMetrics]);

  // 1. Grouped Purchases Breakdown: What product items does this outlet purchase?
  const groupedProductsInfo = useMemo(() => {
    const productsMap: Record<string, {
      name: string;
      group: string;
      totalQty: number;
      totalSales: number;
      lastDate: string;
      unitPrice: number;
    }> = {};

    matchedRecordsOfSelected.forEach(r => {
      const name = r.product?.trim() || 'Unnamed Product';
      const groupName = r.group_name?.trim() || 'Uncategorized';
      const qty = r.quantity || 0;
      const sales = r.ttl_sales || 0;

      if (!productsMap[name]) {
        productsMap[name] = {
          name,
          group: groupName,
          totalQty: 0,
          totalSales: 0,
          lastDate: r.date,
          unitPrice: r.unitPrice || 0
        };
      }

      const p = productsMap[name];
      p.totalQty += qty;
      p.totalSales += sales;
      if (r.date && r.date > p.lastDate) {
        p.lastDate = r.date;
      }
    });

    return Object.values(productsMap).sort((a, b) => b.totalSales - a.totalSales);
  }, [matchedRecordsOfSelected]);

  // 2. Monthly dynamic trends for charting
  const monthlyTrendsForOutlet = useMemo(() => {
    const months = [
      { name: 'Jan', revenue: 0, qty: 0, transactions: 0 },
      { name: 'Feb', revenue: 0, qty: 0, transactions: 0 },
      { name: 'Mar', revenue: 0, qty: 0, transactions: 0 },
      { name: 'Apr', revenue: 0, qty: 0, transactions: 0 },
      { name: 'Mei', revenue: 0, qty: 0, transactions: 0 },
      { name: 'Jun', revenue: 0, qty: 0, transactions: 0 },
      { name: 'Jul', revenue: 0, qty: 0, transactions: 0 },
      { name: 'Agt', revenue: 0, qty: 0, transactions: 0 },
      { name: 'Sep', revenue: 0, qty: 0, transactions: 0 },
      { name: 'Okt', revenue: 0, qty: 0, transactions: 0 },
      { name: 'Nov', revenue: 0, qty: 0, transactions: 0 },
      { name: 'Des', revenue: 0, qty: 0, transactions: 0 },
    ];

    matchedRecordsOfSelected.forEach(r => {
      if (!r.date) return;
      const parts = r.date.split('-');
      if (parts.length >= 2) {
        const monthNum = parseInt(parts[1], 10); // 1 to 12
        const mIdx = monthNum - 1;
        if (mIdx >= 0 && mIdx < 12) {
          months[mIdx].revenue += r.ttl_sales || 0;
          months[mIdx].qty += r.quantity || 0;
          months[mIdx].transactions += 1;
        }
      }
    });

    return months;
  }, [matchedRecordsOfSelected]);

  // 3. Category distribution (analytics breakdown 2)
  const categorySummaryForOutlet = useMemo(() => {
    const catsMap: Record<string, { name: string; revenue: number; qty: number; itemsCount: number }> = {};
    
    matchedRecordsOfSelected.forEach(r => {
      const { catName } = classifyRecord(r.group_name || '', r.product || '');
      const gName = catName;
      if (!catsMap[gName]) {
        catsMap[gName] = { name: gName, revenue: 0, qty: 0, itemsCount: 0 };
      }
      catsMap[gName].revenue += r.ttl_sales || 0;
      catsMap[gName].qty += r.quantity || 0;
      catsMap[gName].itemsCount += 1;
    });

    const list = Object.values(catsMap).sort((a, b) => b.revenue - a.revenue);
    const totalRev = list.reduce((acc, c) => acc + c.revenue, 0);

    return list.map(c => ({
      ...c,
      share: totalRev > 0 ? (c.revenue / totalRev) * 100 : 0
    }));
  }, [matchedRecordsOfSelected]);

  // Filter list of outlets based on client input search
  const filteredSPGOutlets = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return outlets;
    return outlets.filter(o => 
      o.aliasName.toLowerCase().includes(query) || 
      o.custValue.toLowerCase().includes(query)
    );
  }, [outlets, searchQuery]);

  return (
    <div id="outlet-spg-workspace" className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      
      {/* LEFT COLUMN: Registered Outlets Directory & Action Center */}
      <div id="spg-directory-panel" className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
        
        {/* Module title with cute badge */}
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-violet-600 animate-pulse shrink-0 font-sans"></span>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">OUTLET SPG DIRECTORY</h3>
          </div>
          <p className="text-[10px] text-slate-450 mt-0.5 font-normal">Link dynamic retail counters to analyze personalized ledger sales histories</p>
        </div>

        {/* Create / Link new outlet section with a beautiful, very compact search table */}
        <div className="space-y-2 bg-slate-50/50 border border-slate-100 p-3 rounded-xl text-left">
          <span className="text-[9px] font-extrabold text-indigo-700 uppercase tracking-widest block">Add Connection</span>
          
          {/* Search Input for Ledger Customers - Compact */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ledger database customers..."
              value={availSearchQuery}
              onChange={(e) => setAvailSearchQuery(e.target.value)}
              className="w-full text-[10px] pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 text-slate-800 font-mono"
            />
          </div>

          {/* List / Table of Available Ledger Customers - Compact row spacing and fonts */}
          {uniqueCustomersInLedger.length > 0 ? (
            <div className="border border-slate-150 rounded-lg overflow-hidden bg-white text-[10px] max-h-[110px] overflow-y-auto custom-scrollbar shadow-2xs">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[9px] text-slate-400 uppercase tracking-wider font-extrabold sticky top-0">
                    <th className="p-1.5 pl-2.5">Cust ID</th>
                    <th className="p-1.5">Nama</th>
                    <th className="p-1.5 text-center pr-2.5">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                  {filteredAvailableLedgerCustomers.map((u) => {
                    const nameVal = getClientName(u.id) || 'General Cust';
                    const isAlreadyLinked = outlets.some(o => o.custValue.toLowerCase() === u.id.toLowerCase());
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-1 px-2.5 font-mono font-bold text-slate-800 text-[9.5px]">{u.id}</td>
                        <td className="p-1 truncate max-w-[120px] font-medium text-[9.5px]" title={nameVal}>{nameVal}</td>
                        <td className="p-1 text-center pr-2.5">
                          {isAlreadyLinked ? (
                            <span className="text-[8px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-1 py-0.5 rounded-sm font-bold inline-flex items-center select-none">
                              Linked
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                const created: SPGOutlet = {
                                  id: `spg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                                  custValue: u.id,
                                  aliasName: nameVal !== 'General Cust' ? nameVal : u.id,
                                  addedAt: new Date().toISOString()
                                };
                                const nextList = [...outlets, created];
                                saveOutlets(nextList);
                                setSelectedOutletId(created.id);
                              }}
                              className="px-1.5 py-0.5 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 text-indigo-600 rounded-sm font-bold cursor-pointer border-none flex items-center justify-center gap-0.5 mx-auto transition-colors text-[9px]"
                            >
                              <PlusCircle className="w-2.5 h-2.5 shrink-0" /> Link
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[9px] text-slate-400 italic">No ledger accounts parsed.</p>
          )}

          {/* Optional manual linking override block - Ultra compact */}
          <div className="pt-1.5 border-t border-slate-100">
            <div className="flex gap-1.5 items-center">
              <input
                type="text"
                placeholder="Or custom Cust ID manually..."
                value={newCustValue}
                onChange={(e) => {
                  setNewCustValue(e.target.value);
                  if (manualError) setManualError('');
                }}
                className="flex-1 px-2.5 py-1.5 border border-slate-200 bg-white text-[10px] text-slate-800 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 font-mono"
              />
              <button
                type="button"
                disabled={!newCustValue.trim()}
                onClick={() => {
                  const val = newCustValue.trim();
                  if (!val) return;
                  const duplicate = outlets.some(o => o.custValue.toLowerCase() === val.toLowerCase());
                  if (duplicate) {
                    setManualError('This ID is already linked!');
                    return;
                  }
                  const nameResolved = getClientName(val) || val;
                  const created: SPGOutlet = {
                    id: `spg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    custValue: val,
                    aliasName: nameResolved,
                    addedAt: new Date().toISOString()
                  };
                  const nextList = [...outlets, created];
                  saveOutlets(nextList);
                  setSelectedOutletId(created.id);
                  setNewCustValue('');
                  setManualError('');
                }}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-[10px] font-extrabold rounded-lg transition-all shrink-0 cursor-pointer"
              >
                Add
              </button>
            </div>
            {manualError && (
              <p className="text-[9px] text-rose-600 font-bold mt-1 pl-0.5">
                {manualError}
              </p>
            )}
          </div>
        </div>

        {/* Directory filter and list */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Cust ID / label..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-[10px] pl-8 pr-3 py-1.5 bg-slate-50/75 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white text-slate-800 font-mono"
            />
          </div>

          {/* Scroller list - compact spacing and padding */}
          <div className="max-h-[290px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredSPGOutlets.length > 0 ? (
              filteredSPGOutlets.map((outlet) => {
                const isSelected = outlet.id === selectedOutletId;
                
                // Calculate quick metric for the badge
                const curSalesSum = records
                  .filter(r => (r.customer_id || '').toLowerCase().trim() === outlet.custValue.toLowerCase().trim())
                  .reduce((acc, cur) => acc + (cur.ttl_sales || 0), 0);

                return (
                  <div
                    key={outlet.id}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2.5 transition-all relative ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-700 hover:bg-slate-100/20'
                    }`}
                  >
                    {/* Select Outlet Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedOutletId(outlet.id)}
                      className="flex-1 text-left cursor-pointer min-w-0 bg-transparent border-none p-0 flex items-center gap-2 text-inherit font-sans"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <Store className={`w-3 h-3 shrink-0 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`} />
                            <span className="font-mono text-xs font-bold tracking-tight truncate" title={outlet.custValue}>{outlet.custValue}</span>
                          </div>
                          {outlet.aliasName && (
                            <p className={`text-[9px] font-medium truncate ${
                              isSelected ? 'text-indigo-155' : 'text-slate-500'
                            }`} title={outlet.aliasName}>
                              {outlet.aliasName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 self-center">
                        <span className="text-[11px] font-extrabold font-mono pr-1 block">
                          {formatCurrency(curSalesSum)}
                        </span>
                      </div>
                    </button>
                    
                    {/* Always visible separate delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOutlet(outlet.id, outlet.aliasName);
                      }}
                      className={`p-1 rounded-md border-none cursor-pointer transition-colors shrink-0 ${
                        isSelected 
                          ? 'text-indigo-200 hover:text-rose-250 hover:bg-indigo-500' 
                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title="De-register outlet"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 px-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Info className="w-4 h-4 text-slate-400 mx-auto mb-1.5" />
                <p className="text-[10px] text-slate-500 font-bold">No outlets linked.</p>
                <p className="text-[8.5px] text-slate-400 mt-0.5">Use the search box above to instantly add new ones.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Performance Canvas & Detailed Analytics */}
      <div id="spg-analytics-workspace" className="lg:col-span-8 space-y-6">
        
        {selectedOutlet ? (
          <div className="space-y-6">
            
            {/* 1. Header Overview Banner */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs relative overflow-hidden flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div className="absolute top-0 left-0 bottom-0 w-2.5 bg-indigo-650"></div>
              
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
                  <Store className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg font-black text-slate-900 tracking-tight">
                      {selectedOutlet.aliasName}
                    </h2>
                    <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-150 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider font-sans">
                      SPG Tracker Live
                    </span>
                  </div>
                  <span className="font-mono text-xs text-slate-500 font-bold block mt-1">
                    Matched Spreadsheet Code Reference: <span className="text-indigo-600 font-semibold">{selectedOutlet.custValue}</span>
                  </span>
                </div>
              </div>

              {matchedRecordsOfSelected.length > 0 && (
                <div className="bg-emerald-50 text-emerald-800 border-emerald-100 px-3.5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 max-w-fit">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>Dynamically Synchronized ({matchedRecordsOfSelected.length} transactions)</span>
                </div>
              )}
            </div>

            {/* 2. Micro Stats Performance Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Total Sales Box */}
              <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-3xs text-left flex flex-col justify-between h-full">
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Sales</span>
                  <span className="text-sm md:text-base font-black text-slate-900 tracking-tight font-mono block mt-1.5">
                    {formatCurrency(selectedOutletMetrics.totalSales)}
                  </span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 font-bold">
                  <span>Client Ledger Accumulation</span>
                  <span className="text-slate-400 font-mono">{matchedRecordsOfSelected.length} txs</span>
                </div>
              </div>

              {/* Target Tracker (SPG) Box */}
              <div className="bg-white border border-slate-200 p-4.5 rounded-2xl shadow-3xs text-left flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Target Tracker (SPG)</span>
                    {selectedOutlet?.targetAmount && selectedOutlet.targetAmount > 0 ? (
                      <span className={`text-[8.5px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${progressPercentage >= 100 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
                        {progressPercentage >= 100 ? 'Achieved!' : `${progressPercentage.toFixed(0)}%`}
                      </span>
                    ) : (
                      <span className="text-[8.5px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-slate-50 text-slate-400 border border-slate-100">
                        Pending
                      </span>
                    )}
                  </div>
                  
                  {/* Progress bar info */}
                  {selectedOutlet?.targetAmount && selectedOutlet.targetAmount > 0 ? (
                    <div className="mt-1.5 space-y-1.5">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm md:text-base font-black text-slate-900 tracking-tight font-mono">
                          {formatCurrency(selectedOutlet.targetAmount)}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-slate-450">
                          {formatCurrency(selectedOutletMetrics.totalSales)} reached
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${progressPercentage >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                          style={{ width: `${Math.min(100, progressPercentage)}%` }}
                        ></div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1.5">
                      <span className="text-sm md:text-base font-black text-slate-300 tracking-tight font-mono block">
                        Rp —
                      </span>
                    </div>
                  )}
                </div>

                {/* Target setup input box */}
                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <div className="flex gap-1.5">
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1.5 bottom-1.5 text-[9px] font-black text-slate-400 flex items-center">Rp</span>
                      <input
                        type="text"
                        placeholder="Input target (ex: 20000000)"
                        value={targetInputValue}
                        onChange={(e) => setTargetInputValue(e.target.value)}
                        className="w-full pl-6 pr-1.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveTarget}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9.5px] font-bold rounded-md cursor-pointer border-none shadow-3xs transition-all tracking-tight shrink-0"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>

            </div>

            {/* 3. CHART GRID: Monthly Trend Area & Category Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Month trend chart */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 text-left">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-500" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">SALES REVENUE TIMELINE</h4>
                </div>
                
                {selectedOutletMetrics.totalSales > 0 ? (
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyTrendsForOutlet} margin={{ top: 10, right: 5, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="spgAreaBlue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={9} tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`} tickLine={false} />
                        <Tooltip 
                          formatter={(v: number) => [formatCurrency(v), 'Sales']}
                          contentStyle={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px', fontFamily: 'monospace' }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#spgAreaBlue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-56 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-center p-4">
                    <Calendar className="w-8 h-8 text-slate-300 mb-2" />
                    <span className="text-[11px] text-slate-500 font-semibold">Timeline not available</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Please import invoices matching ID "{selectedOutlet.custValue}"</span>
                  </div>
                )}
              </div>

              {/* Categorization Breakdown */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4 text-left">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">CATEGORY AFFINITY DISTRIBUTION</h4>
                </div>
                
                {categorySummaryForOutlet.length > 0 ? (
                  <div className="space-y-3.5 max-h-[224px] overflow-y-auto pr-1">
                    {categorySummaryForOutlet.map((cat) => {
                      const colClass = getBrandColor(cat.name);
                      return (
                        <div key={cat.name} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                            <span className="truncate pr-4 flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${colClass}`}></span>
                              {cat.name}
                            </span>
                            <span className="font-mono text-slate-550 font-bold shrink-0 text-[10.5px]">
                              {formatCurrency(cat.revenue)} ({cat.share.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${colClass}`} style={{ width: `${cat.share}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-56 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-center p-4">
                    <Database className="w-8 h-8 text-slate-300 mb-2" />
                    <span className="text-[11px] text-slate-500 font-semibold">No categories resolved</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">Transactions matching the client must feature Category or Group names.</span>
                  </div>
                )}
              </div>

            </div>

            {/* 4. MAIN DETAILS TAB / TABLE FOR DETAILED ITEMS (What the item that outlet buy) */}
            <div id="spg-purchase-ledger" className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 text-left">
                  <h4 className="text-xs font-black text-slate-1500 uppercase tracking-tight">
                    BREAKDOWNS ITEM
                  </h4>
                </div>
              </div>

              {matchedRecordsOfSelected.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
                  <ShoppingBag className="w-8 h-8 text-slate-355 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-700">No Purchase Actions catalogued</h4>
                  <p className="text-[10px] text-slate-500 max-w-sm mx-auto mt-1 font-semibold">
                    We could not find any sales records in the current database matching Cust ID <strong className="text-indigo-650 font-mono font-bold leading-none">{selectedOutlet.custValue}</strong>. Clear filters or load a different workbook spreadsheet featuring matches.
                  </p>
                </div>
              ) : (
                /* Grouped product items table */
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider text-[9px]">
                        <th className="py-2 px-3">Product Name</th>
                        <th className="py-2 px-3">Category Group</th>
                        <th className="py-2 px-3 text-right">Total Sell In</th>
                        <th className="py-2 px-3 text-right">Last Purchase</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-slate-700 text-[11px]">
                      {groupedProductsInfo.slice(0, 30).map((p) => (
                        <tr key={p.name} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-1.5 px-3 font-semibold text-slate-900 max-w-xs truncate" title={p.name}>{p.name}</td>
                          <td className="py-1.5 px-3">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-[9px] font-bold text-slate-600 rounded">
                              {p.group}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold font-mono text-indigo-700">{formatCurrency(p.totalSales)}</td>
                          <td className="py-1.5 px-3 text-right text-slate-500 font-mono text-[10px]">{p.lastDate || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </div>
        ) : (
          /* General fallback block if no outlet selected */
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
            <Database className="w-12 h-12 text-slate-350 mx-auto mb-4 animate-bounce" />
            <h3 className="text-base font-extrabold text-slate-800">SPG Performance Desk</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
              No registered corporate outlets could be resolved in this browser context. You must link an existing customer record using the selection console on the left or enter a custom ID reference to begin calculation.
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
