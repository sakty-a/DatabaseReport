/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Award, 
  CheckCircle, 
  DollarSign, 
  TrendingUp, 
  User, 
  Calendar 
} from 'lucide-react';
import { SalesRecord } from '../types';
import { CASH_BACK_PARTICIPANTS, WHITE_BONUS_PARTICIPANTS } from './programParticipants';

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

interface CashBackProgramProps {
  records: SalesRecord[];
  selectedCustId: string;
  onSelectCustomer: (id: string) => void;
}



export default function CashBackProgram({ records, selectedCustId, onSelectCustomer }: CashBackProgramProps) {
  const [selectedProgram, setSelectedProgram] = useState<'cashback' | 'whitebonus'>('cashback');
  const [activePeriod, setActivePeriod] = useState<'I' | 'II' | 'III' | 'IV'>('I');
  const [whiteBonusFilter, setWhiteBonusFilter] = useState<'all' | 'under50' | '50_75' | 'upper75'>('all');

  const handleProgramChange = (prog: 'cashback' | 'whitebonus') => {
    setSelectedProgram(prog);
    setWhiteBonusFilter('all');
    if (prog === 'cashback' && activePeriod === 'IV') {
      setActivePeriod('I');
    }
  };

  const availablePeriods = selectedProgram === 'cashback' 
    ? (['I', 'II', 'III'] as const) 
    : (['I', 'II', 'III', 'IV'] as const);

  // Format currency helpers
  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Combine participants with same "no"
  const mergedParticipants = useMemo(() => {
    const list = selectedProgram === 'cashback' ? CASH_BACK_PARTICIPANTS : WHITE_BONUS_PARTICIPANTS;
    const groups: Record<string, typeof list> = {};
    list.forEach(p => {
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
  }, [selectedProgram]);

  // Compile general Customer Summary records
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

      const prodName = r.product || 'Unnamed Product';
      if (!client.products[prodName]) {
        client.products[prodName] = { name: prodName, qty: 0, spend: 0, group: r.group_name || 'Uncategorized' };
      }
      client.products[prodName].qty += qty;
      client.products[prodName].spend += sale;

      const gName = r.group_name || 'Uncategorized';
      if (!client.groups[gName]) {
        client.groups[gName] = { name: gName, spend: 0, qty: 0 };
      }
      client.groups[gName].spend += sale;
      client.groups[gName].qty += qty;

      client.dates.push({
        date: r.date,
        product: prodName,
        qty: qty,
        spend: sale
      });
    });

    return Object.values(clients).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [records]);

  // Find active customer profile
  const activeCustomer = useMemo(() => {
    if (customerSummaryList.length === 0) return null;
    const matched = customerSummaryList.find(c => c.customerId.toLowerCase() === selectedCustId.toLowerCase());
    return matched || customerSummaryList[0];
  }, [customerSummaryList, selectedCustId]);

  // Find matching participant or generate dynamic partner fallback
  const activeParticipant = useMemo<Participant>(() => {
    if (!activeCustomer) {
      return mergedParticipants[0];
    }
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
      name: 'Dynamic Registered Partner',
      target: targetVal || 50000000,
      monthlySales
    };
  }, [activeCustomer, mergedParticipants]);

  const liveMonthsMap = useMemo(() => ({
    1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr',
    5: 'Mei', 6: 'Jun', 7: 'Jul', 8: 'Agt',
    9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Des'
  } as Record<number, 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'Mei' | 'Jun' | 'Jul' | 'Agt' | 'Sep' | 'Okt' | 'Nov' | 'Des'>), []);

  const getParticipantMonthlySales = (participant: Participant) => {
    const salesObj = {
      Jan: 0, Feb: 0, Mar: 0, Apr: 0,
      Mei: 0, Jun: 0, Jul: 0, Agt: 0,
      Sep: 0, Okt: 0, Nov: 0, Des: 0
    };
    if (participant.codes) {
      participant.codes.forEach(codeLower => {
        const custSummary = customerSummaryList.find(c => c.customerId.toLowerCase() === codeLower);
        if (custSummary) {
          custSummary.dates.forEach(d => {
            const parts = d.date.split('-');
            if (parts.length === 3) {
              const m = parseInt(parts[1], 10);
              const key = liveMonthsMap[m];
              if (key) {
                salesObj[key] += d.spend;
              }
            }
          });
        }
      });
    }
    return salesObj;
  };

  // Filtered participants list for display based on achieve rate under White Bonus
  const filteredParticipants = useMemo(() => {
    if (selectedProgram !== 'whitebonus' || whiteBonusFilter === 'all') {
      return mergedParticipants;
    }

    return mergedParticipants.filter(partOption => {
      const salesObj = getParticipantMonthlySales(partOption);
      
      let periodDetails = 0;
      if (activePeriod === 'I') {
        periodDetails = salesObj.Jan + salesObj.Feb + salesObj.Mar;
      } else if (activePeriod === 'II') {
        periodDetails = salesObj.Apr + salesObj.Mei + salesObj.Jun;
      } else if (activePeriod === 'III') {
        periodDetails = salesObj.Jul + salesObj.Agt + salesObj.Sep;
      } else {
        periodDetails = salesObj.Okt + salesObj.Nov + salesObj.Des;
      }

      const achPercent = partOption.target > 0 ? (periodDetails / partOption.target) * 100 : 0;
      
      if (whiteBonusFilter === 'under50') {
        return achPercent < 50;
      }
      if (whiteBonusFilter === '50_75') {
        return achPercent >= 50 && achPercent <= 75;
      }
      if (whiteBonusFilter === 'upper75') {
        return achPercent > 75;
      }
      return true;
    });
  }, [mergedParticipants, selectedProgram, whiteBonusFilter, activePeriod, customerSummaryList, liveMonthsMap]);

  const getPeriodMetrics = (p: 'I' | 'II' | 'III' | 'IV') => {
    if (!activeParticipant) return { months: [], target: 0, totalSales: 0, achPercent: 0, gap: 0 };
    
    const target = activeParticipant.target;
    let months: Array<{ name: string; key: keyof typeof activeParticipant.monthlySales }> = [];
    
    if (selectedProgram === 'cashback') {
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
    } else {
      // White Bonus (4 periods, 3 months each)
      if (p === 'I') {
        months = [
          { name: 'Januari', key: 'Jan' },
          { name: 'Februari', key: 'Feb' },
          { name: 'Maret', key: 'Mar' }
        ];
      } else if (p === 'II') {
        months = [
          { name: 'April', key: 'Apr' },
          { name: 'Mei', key: 'Mei' },
          { name: 'Juni', key: 'Jun' }
        ];
      } else if (p === 'III') {
        months = [
          { name: 'Juli', key: 'Jul' },
          { name: 'Agustus', key: 'Agt' },
          { name: 'September', key: 'Sep' }
        ];
      } else {
        months = [
          { name: 'Oktober', key: 'Okt' },
          { name: 'November', key: 'Nov' },
          { name: 'Desember', key: 'Des' }
        ];
      }
    }

    const liveMonthlySalesObj = getParticipantMonthlySales(activeParticipant);

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

  const pData = getPeriodMetrics(activePeriod);

  return (
    <div className="space-y-6 font-sans">
      
      {/* 4. Cash Back Program 2026 Ledger */}
      <div id="cash-back-program-ledger" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        
        {/* Header and Period Tabs Picker */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Program Switcher Button Group */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl shrink-0 self-start">
              <button
                onClick={() => handleProgramChange('cashback')}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border-none ${
                  selectedProgram === 'cashback'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                Program Cash Back
              </button>
              <button
                onClick={() => handleProgramChange('whitebonus')}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border-none ${
                  selectedProgram === 'whitebonus'
                    ? 'bg-white text-indigo-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></span>
                White Bonus
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse shrink-0 ${selectedProgram === 'cashback' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
                <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  {selectedProgram === 'cashback' ? 'PROGRAM CASH BACK 2026' : 'WHITE BONUS PROGRAM'}
                </h4>
              </div>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5 whitespace-nowrap">
                {selectedProgram === 'cashback' 
                  ? 'Multi-period program tracker • 3 Periods of 4 Months each per year'
                  : 'Multi-period program tracker • 4 Periods of 3 Months each per year'
                }
              </p>
            </div>
          </div>

          {/* Switch Period Pill Slider */}
          <div className="flex bg-slate-100 p-1 rounded-xl self-start">
            {availablePeriods.map(p => (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                className={`px-3.5 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer border-none ${
                  activePeriod === p 
                    ? 'bg-white text-indigo-700 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                Periode {p}
              </button>
            ))}
          </div>
        </div>

        {/* Current Selection Metrics Overview Card */}
        {activeParticipant && (
          <div className="space-y-6">
            
            {/* Header Spotlight Card */}
            <div className="bg-gradient-to-r from-slate-50 to-indigo-50/20 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100/50 rounded-xl text-indigo-700">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 bg-indigo-50 inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-indigo-700 uppercase mb-0.5">
                    Code: {activeParticipant.code}
                  </div>
                  <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">{activeParticipant.name}</h5>
                </div>
              </div>
              
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Spotlight Mode</span>
                <span className="text-xs font-extrabold text-indigo-700">Sync with Customer Profile</span>
              </div>
            </div>

            {/* 4 Metric Cards for Selected Period */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              
              {/* Period Target */}
              <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Target / Period</span>
                  <span className="text-sm font-extrabold text-slate-850 block mt-2 font-mono">
                    {formatCurrency(pData.target)}
                  </span>
                </div>
                <div className="mt-2 text-[9px] text-slate-400 font-semibold leading-none">
                  {selectedProgram === 'cashback' ? '4 months milestone target' : '3 months milestone target'}
                </div>
              </div>

              {/* Period Total Sales */}
              <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Sales Periode {activePeriod}</span>
                  <span className="text-sm font-extrabold text-slate-900 block mt-2 font-mono">
                    {formatCurrency(pData.totalSales)}
                  </span>
                </div>
                <div className="mt-2 text-[9px] text-slate-400 font-semibold leading-none">
                  Months: {selectedProgram === 'cashback' ? (
                    activePeriod === 'I' ? 'Jan - Apr' : activePeriod === 'II' ? 'Mei - Agt' : 'Sep - Des'
                  ) : (
                    activePeriod === 'I' ? 'Jan - Mar' : activePeriod === 'II' ? 'Apr - Jun' : activePeriod === 'III' ? 'Jul - Sep' : 'Okt - Des'
                  )}
                </div>
              </div>

              {/* Period Ach % */}
              <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Achievement</span>
                  <span className={`text-sm font-black block mt-2 font-mono ${pData.achPercent >= 100 ? 'text-emerald-600 font-extrabold' : 'text-slate-800 font-bold'}`}>
                    {pData.achPercent.toFixed(0)}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${pData.achPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(100, pData.achPercent)}%` }}
                  />
                </div>
              </div>

              {/* GAP Balance (TOTAL - TARGET) */}
              <div className={`rounded-2xl p-4 border flex flex-col justify-between shadow-2xs ${
                pData.gap >= 0 
                  ? 'bg-emerald-50/70 border-emerald-150 text-emerald-900' 
                  : 'bg-rose-50/70 border-rose-150 text-rose-900'
              }`}>
                <div>
                  <span className={`text-[10px] uppercase font-black tracking-wider block ${
                    pData.gap >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    GAP (BALANCE)
                  </span>
                  <span className="text-sm font-extrabold block mt-2 font-mono">
                    {pData.gap >= 0 ? `+${formatCurrency(pData.gap)}` : `(${formatCurrency(Math.abs(pData.gap))})`}
                  </span>
                </div>
                <div className="mt-2 text-[9px] font-bold leading-none">
                  {pData.gap >= 0 ? '🟢 Target Met (Cash Back Unlocked)' : '🔴 Target Gap (Not Met)'}
                </div>
              </div>

            </div>

            {/* Month-by-month table logs */}
            <div className="bg-slate-50/50 border border-slate-150 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-150 text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                    <th className="p-3">Month</th>
                    <th className="p-3 text-right font-mono">Product Sales Registered</th>
                    <th className="p-3 text-right font-mono">Share of Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pData.months.map((m, idx) => {
                    const shareFloat = pData.target > 0 ? (m.value / pData.target) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="p-3 font-semibold text-slate-700">{m.name}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-850">
                          {m.value < 0 ? `(${formatCurrency(Math.abs(m.value))})` : formatCurrency(m.value)}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-400 font-semibold">
                          {shareFloat.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Program Participants Grid list (Simulates the right/left hand table comparison!) */}
        <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-2xs">
          <div className="bg-slate-150/40 bg-slate-50 p-3.5 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>
                {selectedProgram === 'cashback' ? 'Cash Back' : 'White Bonus'} Outlets Enrollment Directory ({
                  selectedProgram === 'whitebonus' && whiteBonusFilter !== 'all'
                    ? `Showing ${filteredParticipants.length} of ${mergedParticipants.length} groups`
                    : `${mergedParticipants.length} registered groups`
                })
              </span>
            </span>
            <span className="text-[9px] text-indigo-650 font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg uppercase">
              Select an Outlet to view profile
            </span>
          </div>

          {/* White Bonus Achievement Filter */}
          {selectedProgram === 'whitebonus' && (
            <div className="bg-slate-50/50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-slate-150">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block sm:inline-block pl-1">
                Achievement Filter (Periode {activePeriod}):
              </span>
              <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setWhiteBonusFilter('all')}
                  className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer border-none ${
                    whiteBonusFilter === 'all'
                      ? 'bg-white text-indigo-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700 bg-transparent'
                  }`}
                >
                  All ({mergedParticipants.length})
                </button>
                <button
                  type="button"
                  onClick={() => setWhiteBonusFilter('under50')}
                  className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer border-none ${
                    whiteBonusFilter === 'under50'
                      ? 'bg-rose-100 text-rose-800 shadow-2xs'
                      : 'text-slate-500 hover:text-rose-600 bg-transparent'
                  }`}
                >
                  &lt; 50%
                </button>
                <button
                  type="button"
                  onClick={() => setWhiteBonusFilter('50_75')}
                  className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer border-none ${
                    whiteBonusFilter === '50_75'
                      ? 'bg-amber-100 text-amber-800 shadow-2xs'
                      : 'text-slate-500 hover:text-amber-600 bg-transparent'
                  }`}
                >
                  50% - 75%
                </button>
                <button
                  type="button"
                  onClick={() => setWhiteBonusFilter('upper75')}
                  className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all cursor-pointer border-none ${
                    whiteBonusFilter === 'upper75'
                      ? 'bg-emerald-100 text-emerald-800 shadow-2xs'
                      : 'text-slate-500 hover:text-emerald-600 bg-transparent'
                  }`}
                >
                  &gt; 75%
                </button>
              </div>
            </div>
          )}
          
          <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar text-xs">
            {filteredParticipants.map((partOption, oIdx) => {
              const salesObj = getParticipantMonthlySales(partOption);
              
              let periodDetails = 0;
              if (selectedProgram === 'cashback') {
                if (activePeriod === 'I') {
                  periodDetails = salesObj.Jan + salesObj.Feb + salesObj.Mar + salesObj.Apr;
                } else if (activePeriod === 'II') {
                  periodDetails = salesObj.Mei + salesObj.Jun + salesObj.Jul + salesObj.Agt;
                } else {
                  periodDetails = salesObj.Sep + salesObj.Okt + salesObj.Nov + salesObj.Des;
                }
              } else {
                if (activePeriod === 'I') {
                  periodDetails = salesObj.Jan + salesObj.Feb + salesObj.Mar;
                } else if (activePeriod === 'II') {
                  periodDetails = salesObj.Apr + salesObj.Mei + salesObj.Jun;
                } else if (activePeriod === 'III') {
                  periodDetails = salesObj.Jul + salesObj.Agt + salesObj.Sep;
                } else {
                  periodDetails = salesObj.Okt + salesObj.Nov + salesObj.Des;
                }
              }

              const isWinner = periodDetails >= partOption.target;
              const isActive = activeParticipant && activeParticipant.no === partOption.no;

              return (
                <button
                  key={partOption.no}
                  onClick={() => onSelectCustomer(partOption.originalCodes ? partOption.originalCodes[0] : partOption.code)}
                  className={`w-full p-3 flex flex-col sm:flex-row sm:items-center justify-between text-left transition-all font-sans border-none cursor-pointer ${
                    isActive 
                      ? 'bg-indigo-50/75 hover:bg-indigo-50/90' 
                      : 'bg-white hover:bg-slate-50/60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-mono font-bold">#{partOption.no}</span>
                      <span className="font-mono text-[11px] font-bold text-slate-500 uppercase shrink-0">[{partOption.code}]</span>
                      <span className={`text-xs font-semibold truncate ${isActive ? 'text-indigo-800 font-black' : 'text-slate-800 font-bold'}`}>
                        {partOption.name}
                      </span>
                      {isActive && (
                        <span className="text-[8px] bg-indigo-100 text-indigo-750 px-1.5 py-0.2 rounded font-black font-sans uppercase">
                          Spotlighted
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-medium font-sans">
                      <span>Target: <strong className="text-slate-600 font-mono font-bold">{formatCurrency(partOption.target)}</strong></span>
                      <span>•</span>
                      <span>P{activePeriod} Sales: <strong className={`${isWinner ? 'text-emerald-600 font-bold' : 'text-slate-600'} font-mono`}>{formatCurrency(periodDetails)}</strong></span>
                      <span>•</span>
                      <span>Ach: <strong className={`${isWinner ? 'text-emerald-600' : 'text-slate-600'} font-mono font-bold`}>{((periodDetails / partOption.target) * 100).toFixed(0)}%</strong></span>
                    </div>
                  </div>

                  <div className="mt-2 sm:mt-0 text-right shrink-0">
                    <span className={`inline-block text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                      isWinner
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-slate-50 text-slate-500 border border-slate-100'
                    }`}>
                      {isWinner ? `🏆 Qualified ${selectedProgram === 'cashback' ? 'Cashback' : 'Bonus'}` : 'No Qualification'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Informational Help Footer inside Card */}
        <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-2xl p-3.5 flex items-start gap-2.5">
          <div className="text-indigo-650 shrink-0 font-bold text-xs bg-white rounded-full w-4.5 h-4.5 flex items-center justify-center border border-indigo-205 shadow-2xs">i</div>
          <div className="text-[10px] text-slate-500 leading-normal font-semibold">
            <span className="font-bold text-slate-600 font-sans">Active Cash Back Engine:</span> Target values are configured per-period. If spreadsheets are loaded featuring transactions with matches to the Code or Name columns, months are dynamically compiled in real-time. Unregistered account transactions are intelligently formatted into custom simulated partnership targets.
          </div>
        </div>

      </div>

    </div>
  );
}
