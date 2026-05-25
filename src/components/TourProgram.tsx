/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Award, 
  CheckCircle, 
  Compass, 
  MapPin, 
  Plane, 
  TrendingUp, 
  User, 
  Calendar 
} from 'lucide-react';
import { SalesRecord } from '../types';
import { TOUR_BELGIA_PARTICIPANTS, TOUR_MALAYSIA_PARTICIPANTS } from './programParticipants';

interface CustomerSummary {
  customerId: string;
  totalSpend: number;
  ordersCount: number;
  unitsBought: number;
  products: Record<string, { name: string; qty: number; spend: number; group: string }>;
  groups: Record<string, { name: string; spend: number; qty: number }>;
  dates: { date: string; product: string; qty: number; spend: number }[];
}

interface TourParticipant {
  no: string;
  code: string;
  name: string;
  target: number;
  monthlySales: Record<string, number>;
}

interface TourProgramProps {
  records: SalesRecord[];
  selectedCustId: string;
  onSelectCustomer: (id: string) => void;
}

export default function TourProgram({ records, selectedCustId, onSelectCustomer }: TourProgramProps) {
  const [selectedDestination, setSelectedDestination] = useState<'belgia' | 'malaysia'>('belgia');

  // Format currency helper
  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Define months in program scope: 10 months (February to November)
  const TOUR_MONTHS = useMemo(() => [
    { name: 'Februari', key: 'Feb', num: 2 },
    { name: 'Maret', key: 'Mar', num: 3 },
    { name: 'April', key: 'Apr', num: 4 },
    { name: 'Mei', key: 'Mei', num: 5 },
    { name: 'Juni', key: 'Jun', num: 6 },
    { name: 'Juli', key: 'Jul', num: 7 },
    { name: 'Agustus', key: 'Agt', num: 8 },
    { name: 'September', key: 'Sep', num: 9 },
    { name: 'Oktober', key: 'Okt', num: 10 },
    { name: 'November', key: 'Nov', num: 11 }
  ], []);

  const liveMonthsMap = useMemo(() => ({
    2: 'Feb', 3: 'Mar', 4: 'Apr', 5: 'Mei', 
    6: 'Jun', 7: 'Jul', 8: 'Agt', 9: 'Sep', 
    10: 'Okt', 11: 'Nov'
  } as Record<number, string>), []);

  // Compile customer aggregated data from database
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

  // Load active database participants dynamically
  const participantsList = useMemo(() => {
    const rawList = selectedDestination === 'belgia' ? TOUR_BELGIA_PARTICIPANTS : TOUR_MALAYSIA_PARTICIPANTS;
    
    return rawList.map(p => {
      const emptyMonthlySales = {
        Feb: 0, Mar: 0, Apr: 0, Mei: 0, 
        Jun: 0, Jul: 0, Agt: 0, Sep: 0, 
        Okt: 0, Nov: 0
      } as Record<string, number>;

      // Get all customer IDs that should contribute to this participant's sales
      const targetCodes = [p.code.toLowerCase().trim()];
      if (selectedDestination === 'belgia' && p.code.toUpperCase() === 'B20099') {
        targetCodes.push('a82202', 'b36988');
      } else if (selectedDestination === 'malaysia' && p.code.toUpperCase() === 'A80927') {
        targetCodes.push('a82134');
      }

      // Fill in monthly values using records matched to applicable codes
      const matchedSummaries = customerSummaryList.filter(c => 
        targetCodes.includes(c.customerId.toLowerCase().trim())
      );

      matchedSummaries.forEach(custSummary => {
        custSummary.dates.forEach(d => {
          const parts = d.date.split('-');
          if (parts.length === 3) {
            const m = parseInt(parts[1], 10);
            const key = liveMonthsMap[m];
            if (key) {
              emptyMonthlySales[key] += d.spend;
            }
          }
        });
      });

      return {
        ...p,
        monthlySales: emptyMonthlySales
      };
    });
  }, [selectedDestination, customerSummaryList, liveMonthsMap]);

  // Find active customer in the list or fallback to the first participant
  const activeTourParticipant = useMemo<TourParticipant | null>(() => {
    if (participantsList.length === 0) return null;
    const idLower = selectedCustId.toLowerCase().trim();
    
    // First try direct match
    let matched = participantsList.find(p => p.code.toLowerCase().trim() === idLower);
    
    // If no direct match, look up via alias/merged IDs
    if (!matched) {
      matched = participantsList.find(p => {
        if (selectedDestination === 'belgia' && p.code.toUpperCase() === 'B20099') {
          if (idLower === 'a82202') return true;
        }
        if (selectedDestination === 'malaysia' && p.code.toUpperCase() === 'A80927') {
          if (idLower === 'a82134') return true;
        }
        return false;
      });
    }

    return matched || participantsList[0];
  }, [participantsList, selectedCustId, selectedDestination]);

  // Aggregate metrics for selected tour participant
  const selectedMetrics = useMemo(() => {
    if (!activeTourParticipant) {
      return { totalSales: 0, achPercent: 0, gap: 0 };
    }
    const totalSales = Object.keys(activeTourParticipant.monthlySales).reduce(
      (sum, key) => sum + (activeTourParticipant.monthlySales[key] || 0),
      0
    );
    const target = activeTourParticipant.target;
    const achPercent = target > 0 ? (totalSales / target) * 100 : 0;
    const gap = totalSales - target;

    return {
      totalSales,
      achPercent,
      gap
    };
  }, [activeTourParticipant]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* Tour Program Dashboard Card */}
      <div id="tour-program-root-card" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        
        {/* Header containing program navigation controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            
            {/* Dest Selection buttons group */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl shrink-0 self-start">
              <button
                onClick={() => setSelectedDestination('belgia')}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border-none ${
                  selectedDestination === 'belgia'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                <Plane className="w-3.5 h-3.5" />
                TOUR BELGIA 2026
              </button>
              <button
                onClick={() => setSelectedDestination('malaysia')}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border-none ${
                  selectedDestination === 'malaysia'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                TOUR MALAYSIA 2024
              </button>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0"></span>
                <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  {selectedDestination === 'belgia' ? 'TOUR BELGIA 2026 PROGRAM' : 'TOUR MALAYSIA 2026 PROGRAM'}
                </h4>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-indigo-600 font-extrabold uppercase bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl block">
            📅 Active Program: Feb 2026 - Nov 2026
          </div>
        </div>

        {/* Detailed insights for currently spotlighted participant */}
        {activeTourParticipant && (
          <div className="space-y-6">
            
            {/* Participant Identification Bar */}
            <div className="bg-gradient-to-r from-slate-50 to-indigo-50/20 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100/50 rounded-xl text-indigo-700">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 bg-indigo-50 inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-indigo-700 uppercase mb-0.5">
                    CODE: {activeTourParticipant.code}
                  </div>
                  <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">{activeTourParticipant.name}</h5>
                </div>
              </div>
              
              <div className="text-left sm:text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Spotlight Mode</span>
                <span className="text-xs font-extrabold text-indigo-700">Sync with Customer Profile</span>
              </div>
            </div>

            {/* Program Performance Dashboard metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              
              {/* Target threshold indicator */}
              <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Program Target</span>
                  <span className="text-sm font-extrabold text-slate-850 block mt-2 font-mono">
                    {formatCurrency(activeTourParticipant.target)}
                  </span>
                </div>
                <div className="mt-2 text-[9px] text-slate-400 font-semibold leading-none">
                  Accumulated Feb-Nov target quota
                </div>
              </div>

              {/* Total Accumulated Sales in Period */}
              <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Accumulated Sales</span>
                  <span className="text-sm font-extrabold text-slate-900 block mt-2 font-mono">
                    {formatCurrency(selectedMetrics.totalSales)}
                  </span>
                </div>
                <div className="mt-2 text-[9px] text-slate-400 font-semibold leading-none">
                  Total registration: 10 Months
                </div>
              </div>

              {/* Completion Rate Percentage */}
              <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between shadow-2xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">Incentive Status</span>
                  <span className={`text-sm font-black block mt-2 font-mono ${selectedMetrics.achPercent >= 100 ? 'text-emerald-600 font-extrabold' : 'text-slate-800 font-bold'}`}>
                    {selectedMetrics.achPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${selectedMetrics.achPercent >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                    style={{ width: `${Math.min(100, selectedMetrics.achPercent)}%` }}
                  />
                </div>
              </div>

              {/* Target gap remaining */}
              <div className={`rounded-2xl p-4 border flex flex-col justify-between shadow-2xs ${
                selectedMetrics.gap >= 0 
                  ? 'bg-emerald-50/70 border-emerald-150 text-emerald-900' 
                  : 'bg-rose-50/70 border-rose-150 text-rose-900'
              }`}>
                <div>
                  <span className={`text-[10px] uppercase font-black tracking-wider block ${
                    selectedMetrics.gap >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    GAP / UNDER TARGET
                  </span>
                  <span className="text-sm font-extrabold block mt-2 font-mono">
                    {selectedMetrics.gap >= 0 ? `+${formatCurrency(selectedMetrics.gap)}` : `(${formatCurrency(Math.abs(selectedMetrics.gap))})`}
                  </span>
                </div>
                <div className="mt-2 text-[9px] font-bold leading-none">
                  {selectedMetrics.gap >= 0 ? '🟢 Tour Quota Unlocked!' : '🔴 Qty Remaining for Tour'}
                </div>
              </div>

            </div>

            {/* Month-by-month timeline log */}
            <div className="bg-slate-50/50 border border-slate-150 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-150 text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                    <th className="p-3">Month (Feb - Nov)</th>
                    <th className="p-3 text-right font-mono">Registered Revenue</th>
                    <th className="p-3 text-right font-mono">Share of Target Quota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {TOUR_MONTHS.map((m, idx) => {
                    const monthVal = activeTourParticipant.monthlySales[m.key] || 0;
                    const shareFloat = activeTourParticipant.target > 0 ? (monthVal / activeTourParticipant.target) * 100 : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="p-3 font-semibold text-slate-700">{m.name}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-850">
                          {formatCurrency(monthVal)}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-400 font-semibold">
                          {shareFloat.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* List of all Tour Participants */}
        <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-2xs">
          <div className="bg-slate-50 p-3.5 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>
                {selectedDestination === 'belgia' ? 'TOUR BELGIA 2026' : 'TOUR MALAYSIA 2026'} Outlets Directory ({participantsList.length} groups)
              </span>
            </span>
            <span className="text-[9px] text-indigo-650 font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg uppercase">
              Select an outlet to view details
            </span>
          </div>

          <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar text-xs">
            {participantsList.map((partOption) => {
              const totalSales = Object.keys(partOption.monthlySales).reduce(
                (sum, key) => sum + (partOption.monthlySales[key] || 0),
                0
              );
              const isWinner = totalSales >= partOption.target;
              const isActive = activeTourParticipant && activeTourParticipant.code.toLowerCase() === partOption.code.toLowerCase();

              return (
                <button
                  key={partOption.code}
                  onClick={() => onSelectCustomer(partOption.code)}
                  className={`w-full p-3 flex flex-col sm:flex-row sm:items-center justify-between text-left transition-all border-none cursor-pointer ${
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
                        <span className="text-[8px] bg-indigo-100 text-indigo-750 px-1.5 py-0.2 rounded font-black uppercase">
                          Spotlighted
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      <span>Target: <strong className="text-slate-600 font-mono font-bold">{formatCurrency(partOption.target)}</strong></span>
                      <span>•</span>
                      <span>Accum. Sales: <strong className={`${isWinner ? 'text-emerald-600 font-bold' : 'text-slate-600'} font-mono`}>{formatCurrency(totalSales)}</strong></span>
                      <span>•</span>
                      <span>Ach: <strong className={`${isWinner ? 'text-emerald-600 font-bold' : 'text-slate-600'} font-mono`}>{((totalSales / partOption.target) * 100).toFixed(1)}%</strong></span>
                    </div>
                  </div>

                  <div className="mt-2 sm:mt-0 text-right shrink-0">
                    <span className={`inline-block text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                      isWinner
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-slate-50 text-slate-500 border border-slate-100'
                    }`}>
                      {isWinner ? 'Qualified Tour' : 'Not Qualified'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Informational Help Footer */}
        <div className="bg-indigo-50/40 border border-indigo-100/60 rounded-2xl p-3.5 flex items-start gap-2.5">
          <div className="text-indigo-650 shrink-0 font-bold text-xs bg-white rounded-full w-4.5 h-4.5 flex items-center justify-center border border-indigo-200 shadow-2xs">i</div>
          <div className="text-[10px] text-slate-500 leading-normal font-semibold">
            <span className="font-bold text-slate-600 font-sans">Tour Incentive Calculations:</span> Quota figures and achievements are aggregated dynamically based on loaded transaction databases matching the outlet codes shown above, filtering exclusively for the months of February through November 2026.
          </div>
        </div>

      </div>

    </div>
  );
}
