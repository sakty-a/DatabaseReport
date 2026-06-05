/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Award, 
  CheckCircle, 
  DollarSign, 
  TrendingUp, 
  User, 
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  ShoppingBag,
  PlusCircle,
  HelpCircle,
  Search
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

interface CustomParticipant {
  id: string;
  code: string;
  name: string;
  target: number;
  programType: 'cashback' | 'whitebonus';
}

interface ParticipantComputed {
  id: string;
  code: string;
  codes: string[];
  originalCodes?: string[];
  name: string;
  target: number;
  programType: 'cashback' | 'whitebonus';
  monthlySales: {
    Jan: number; Feb: number; Mar: number; Apr: number;
    Mei: number; Jun: number; Jul: number; Agt: number;
    Sep: number; Okt: number; Nov: number; Des: number;
  };
}

interface CustomCashBackProgramProps {
  records: SalesRecord[];
  selectedCustId: string;
  onSelectCustomer: (id: string) => void;
}

const DEFAULT_PARTICIPANTS: CustomParticipant[] = [
  { id: '1', code: 'A80982', name: 'DEMO OUTLET KUSTOM A', target: 50000000, programType: 'cashback' },
  { id: '2', code: 'A87412', name: 'DEMO OUTLET KUSTOM B', target: 75000000, programType: 'cashback' },
  { id: '3', code: 'A82347', name: 'DEMO OUTLET KUSTOM C', target: 15000000, programType: 'whitebonus' }
];

export default function CustomCashBackProgram({ records, selectedCustId, onSelectCustomer }: CustomCashBackProgramProps) {
  const [selectedProgram, setSelectedProgram] = useState<'cashback' | 'whitebonus'>('cashback');
  const [activePeriod, setActivePeriod] = useState<'I' | 'II' | 'III' | 'IV'>('I');
  const [filterType, setFilterType] = useState<'all' | 'under50' | '50_75' | 'upper75'>('all');

  // Load custom participants from localStorage
  const [participants, setParticipants] = useState<CustomParticipant[]>(() => {
    try {
      const stored = localStorage.getItem('custom_cb_wb_participants');
      return stored ? JSON.parse(stored) : DEFAULT_PARTICIPANTS;
    } catch {
      return DEFAULT_PARTICIPANTS;
    }
  });

  // Save to localStorage whenever list changes
  useEffect(() => {
    try {
      localStorage.setItem('custom_cb_wb_participants', JSON.stringify(participants));
    } catch (e) {
      console.error('Failed to save custom participants:', e);
    }
  }, [participants]);

  // Form states for adding/editing outlets
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editTargetId, setEditTargetId] = useState<string | null>(null);

  const [inputCode, setInputCode] = useState('');
  const [inputName, setInputName] = useState('');
  const [inputTarget, setInputTarget] = useState('');
  const [formError, setFormError] = useState('');
  const [availSearchQuery, setAvailSearchQuery] = useState('');

  // Handle program tab changes
  const handleProgramChange = (prog: 'cashback' | 'whitebonus') => {
    setSelectedProgram(prog);
    setFilterType('all');
    if (prog === 'cashback' && activePeriod === 'IV') {
      setActivePeriod('I');
    }
  };

  const availablePeriods = selectedProgram === 'cashback' 
    ? (['I', 'II', 'III'] as const) 
    : (['I', 'II', 'III', 'IV'] as const);

  // Helper formatting currency
  const formatCurrency = (val: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Find all unique customer IDs and names currently present in the spreadsheet
  const uniqueCustomersInLedger = useMemo(() => {
    const clientsMap: Record<string, { id: string; count: number; spend: number }> = {};
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

  // Compile general customer analytical indexes from the sales database
  const customerSummaryList = useMemo<CustomerSummary[]>(() => {
    const clients: Record<string, CustomerSummary> = {};

    records.forEach(r => {
      const custId = (r.customer_id || 'GUEST').toUpperCase().trim();
      if (!clients[custId]) {
        clients[custId] = {
          customerId: r.customer_id || 'GUEST',
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

  // Extract unique customer IDs from current sales spreadsheet to support automated typing/autocomplete select triggers
  const availableCustomerIds = useMemo(() => {
    const ids = new Set<string>();
    records.forEach(r => {
      if (r.customer_id) ids.add(r.customer_id.toUpperCase().trim());
    });
    return Array.from(ids).sort();
  }, [records]);

  // Resolve matching participant monthly sales
  const liveMonthsMap = useMemo(() => ({
    1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr',
    5: 'Mei', 6: 'Jun', 7: 'Jul', 8: 'Agt',
    9: 'Sep', 10: 'Okt', 11: 'Nov', 12: 'Des'
  } as Record<number, 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'Mei' | 'Jun' | 'Jul' | 'Agt' | 'Sep' | 'Okt' | 'Nov' | 'Des'>), []);

  const getParticipantMonthlySales = (participantCode: string) => {
    const salesObj = {
      Jan: 0, Feb: 0, Mar: 0, Apr: 0,
      Mei: 0, Jun: 0, Jul: 0, Agt: 0,
      Sep: 0, Okt: 0, Nov: 0, Des: 0
    };
    
    const keyLower = participantCode.toLowerCase().trim();
    const custSummary = customerSummaryList.find(c => c.customerId.toLowerCase().trim() === keyLower);
    
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
    return salesObj;
  };

  // Compile participants filtered by active program (cashback/whitebonus)
  const programParticipants = useMemo<ParticipantComputed[]>(() => {
    return participants
      .filter(p => p.programType === selectedProgram)
      .map(p => {
        return {
          ...p,
          codes: [p.code.toLowerCase().trim()],
          originalCodes: [p.code],
          monthlySales: getParticipantMonthlySales(p.code)
        };
      });
  }, [participants, selectedProgram, customerSummaryList]);

  // Handle Spotlight Active Customer details card
  const activeParticipant = useMemo<ParticipantComputed | null>(() => {
    if (programParticipants.length === 0) return null;
    if (selectedCustId) {
      const match = programParticipants.find(p => p.codes.includes(selectedCustId.toLowerCase().trim()));
      if (match) return match;
    }
    return programParticipants[0] || null;
  }, [programParticipants, selectedCustId]);

  // Filter list by display achievement filter
  const filteredParticipants = useMemo(() => {
    if (filterType === 'all') return programParticipants;

    return programParticipants.filter(p => {
      const salesObj = p.monthlySales;
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

      const achPercent = p.target > 0 ? (periodDetails / p.target) * 100 : 0;
      if (filterType === 'under50') return achPercent < 50;
      if (filterType === '50_75') return achPercent >= 50 && achPercent <= 75;
      if (filterType === 'upper75') return achPercent > 75;
      return true;
    });
  }, [programParticipants, selectedProgram, activePeriod, filterType]);

  // Aggregate metrics for active spotlight partner
  const pData = useMemo(() => {
    if (!activeParticipant) return { months: [], target: 0, totalSales: 0, achPercent: 0, gap: 0 };
    
    const target = activeParticipant.target;
    let months: { name: string; key: keyof typeof activeParticipant.monthlySales }[] = [];

    if (selectedProgram === 'cashback') {
      if (activePeriod === 'I') {
        months = [
          { name: 'Januari', key: 'Jan' },
          { name: 'Februari', key: 'Feb' },
          { name: 'Maret', key: 'Mar' },
          { name: 'April', key: 'Apr' }
        ];
      } else if (activePeriod === 'II') {
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
      if (activePeriod === 'I') {
        months = [
          { name: 'Januari', key: 'Jan' },
          { name: 'Februari', key: 'Feb' },
          { name: 'Maret', key: 'Mar' }
        ];
      } else if (activePeriod === 'II') {
        months = [
          { name: 'April', key: 'Apr' },
          { name: 'Mei', key: 'Mei' },
          { name: 'Juni', key: 'Jun' }
        ];
      } else if (activePeriod === 'III') {
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

    let totalSales = 0;
    const monthBreakdown = months.map(m => {
      const s = activeParticipant.monthlySales[m.key] || 0;
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
  }, [activeParticipant, selectedProgram, activePeriod]);

  // Form handlers
  const resetForm = () => {
    setInputCode('');
    setInputName('');
    setInputTarget('');
    setEditTargetId(null);
    setFormError('');
    setAvailSearchQuery('');
    setFormMode('add');
    setIsFormOpen(false);
  };

  const handleCreateOrUpdateOutlet = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!inputCode.trim() || !inputName.trim() || !inputTarget.trim()) {
      return;
    }

    const prsTgt = parseFloat(inputTarget.replace(/[^0-9.-]+/g, ''));
    if (isNaN(prsTgt) || prsTgt <= 0) {
      setFormError('Target nominal harus berupa angka positif!');
      return;
    }

    if (formMode === 'add') {
      const newOutlet: CustomParticipant = {
        id: `custom-p-${Date.now()}`,
        code: inputCode.toUpperCase().trim(),
        name: inputName.trim(),
        target: prsTgt,
        programType: selectedProgram
      };
      setParticipants(prev => [...prev, newOutlet]);
      onSelectCustomer(newOutlet.code);
    } else {
      setParticipants(prev => 
        prev.map(p => p.id === editTargetId 
          ? { ...p, code: inputCode.toUpperCase().trim(), name: inputName.trim(), target: prsTgt } 
          : p
        )
      );
      if (editTargetId) {
        onSelectCustomer(inputCode.toUpperCase().trim());
      }
    }

    resetForm();
  };

  const handleDeleteOutlet = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const itemToDelete = participants.find(p => p.id === id);
    setParticipants(prev => prev.filter(p => p.id !== id));
    if (itemToDelete && selectedCustId.toUpperCase() === itemToDelete.code.toUpperCase()) {
      onSelectCustomer('');
    }
  };

  const handleEditOutletInit = (item: CustomParticipant, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormMode('edit');
    setEditTargetId(item.id);
    setInputCode(item.code);
    setInputName(item.name);
    setInputTarget(item.target.toString());
    setIsFormOpen(true);
  };

  // Populate data fields automatically on selection
  const handleCodeChangeAndSync = (codeVal: string) => {
    setInputCode(codeVal);
    const resolvedName = getClientName(codeVal);
    if (resolvedName) {
      setInputName(resolvedName);
    } else {
      const codeUpper = codeVal.toUpperCase().trim();
      const matched = customerSummaryList.find(c => c.customerId.toUpperCase().trim() === codeUpper);
      if (matched) {
        setInputName(matched.customerId);
      }
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Custom CB / WB Ledger Control Block */}
      <div id="custom-cash-back-ledger" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
        
        {/* Header containing interactive controller sliders */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            
            {/* Program selection block */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl shrink-0 self-start">
              <button
                type="button"
                onClick={() => handleProgramChange('cashback')}
                className={`px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer flex items-center gap-1.5 border-none ${
                  selectedProgram === 'cashback'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 bg-transparent'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                Cash Back
              </button>
              <button
                type="button"
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
                <h4 className="text-base font-black text-slate-1000 uppercase tracking-tight">
                  {selectedProgram === 'cashback' ? 'CASHBACK 2026' : 'WHITE BONUS 2026'}
                </h4>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
            {/* New Outlet Creation Trigger Button */}
            <button
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold shadow-sm flex items-center gap-1 transition-all border-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Outlet Baru</span>
            </button>

            {/* Slider pill selector for active periods */}
            <div className="flex bg-slate-150/65 bg-slate-100 p-1 rounded-xl">
              {availablePeriods.map(p => (
                <button
                  key={p}
                  onClick={() => setActivePeriod(p)}
                  className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer border-none ${
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
        </div>

        {/* Dynamic form block for writing/editing custom entries */}
        {isFormOpen && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 animate-fade-in animate-duration-150 text-left">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h5 className="text-xs font-black text-slate-850 uppercase tracking-tight flex items-center gap-1.5">
                <PlusCircle className="w-4 h-4 text-indigo-600" />
                <span>{formMode === 'add' ? 'Tambah Outlet CB/WB Baru' : 'Edit Outlet CB/WB'}</span>
              </h5>
              <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-[11px] font-semibold animate-shake">
                ⚠️ {formError}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Optional live search from database list helper (only for addition) */}
              {formMode === 'add' && (
                <div className="lg:col-span-5 space-y-3 bg-white p-4 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider block">
                      Search Database Customer
                    </span>
                    <span className="text-[9px] text-slate-400 font-semibold bg-slate-50 px-1.5 py-0.5 rounded font-mono">
                      {uniqueCustomersInLedger.length} Total
                    </span>
                  </div>

                  {/* Search bar helper */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari ID/Nama customer..."
                      value={availSearchQuery}
                      onChange={(e) => setAvailSearchQuery(e.target.value)}
                      className="w-full text-[10px] pl-8 pr-3 py-1.5 bg-white border border-slate-250 rounded-lg focus:outline-hidden focus:border-indigo-600 text-slate-800 font-mono font-black"
                    />
                  </div>

                  {/* Customer Search results list of ledger customers */}
                  <div className="border border-slate-150 rounded-lg overflow-hidden bg-white text-[10px] max-h-[140px] overflow-y-auto custom-scrollbar shadow-3xs">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-[9px] text-slate-400 uppercase tracking-tight font-extrabold sticky top-0">
                          <th className="p-1.5 pl-2.5">Cust ID</th>
                          <th className="p-1.5">Nama Customer</th>
                          <th className="p-1.5 text-center pr-2.5">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                        {filteredAvailableLedgerCustomers.length > 0 ? (
                          filteredAvailableLedgerCustomers.map((u) => {
                            const nameVal = getClientName(u.id) || 'General Cust';
                            const isSelect = inputCode.toUpperCase().trim() === u.id.toUpperCase().trim();
                            return (
                              <tr 
                                key={u.id} 
                                onClick={() => {
                                  setInputCode(u.id);
                                  setInputName(nameVal !== 'General Cust' ? nameVal : u.id);
                                }}
                                className={`hover:bg-indigo-50/40 transition-colors cursor-pointer ${isSelect ? 'bg-indigo-50/70 font-semibold' : ''}`}
                              >
                                <td className="p-1.5 px-2.5 font-mono font-bold text-slate-800 text-[9.5px]">
                                  {u.id}
                                </td>
                                <td className="p-1.5 truncate max-w-[120px] font-medium text-[9.5px]" title={nameVal}>
                                  {nameVal}
                                </td>
                                <td className="p-1.5 text-center pr-2.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setInputCode(u.id);
                                      setInputName(nameVal !== 'General Cust' ? nameVal : u.id);
                                    }}
                                    className={`text-[8.5px] px-1.5 py-0.5 rounded font-extrabold border-none cursor-pointer tracking-tight ${
                                      isSelect 
                                        ? 'bg-indigo-600 text-white shadow-3xs' 
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {isSelect ? 'Selected' : 'Select'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={3} className="p-3 text-center text-slate-400 text-[10px] font-semibold">
                              No customer found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Main inputs section */}
              <form 
                onSubmit={handleCreateOrUpdateOutlet} 
                className={`${formMode === 'add' ? 'lg:col-span-7' : 'lg:col-span-12'} grid grid-cols-1 md:grid-cols-2 gap-4`}
              >
                {/* Kode Customer input */}
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-[10px] uppercase font-black tracking-wide text-slate-500 block">Kode Customer (Cust ID)</label>
                  <input
                    type="text"
                    required
                    value={inputCode}
                    onChange={(e) => handleCodeChangeAndSync(e.target.value)}
                    placeholder="Contoh: A80982"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-850 focus:outline-hidden focus:border-indigo-500 font-mono uppercase"
                  />
                </div>

                {/* Nama Customer / Toko input */}
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-[10px] uppercase font-black tracking-wide text-slate-500 block">Nama Outlet</label>
                  <input
                    type="text"
                    required
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="Nama toko / outlet kustom..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-850 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>

                {/* Target Nominal Milestone value */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] uppercase font-black tracking-wide text-slate-500 block">
                    Target Nominal (Milestone Rp)
                  </label>
                  <div className="flex gap-2.5">
                    <input
                      type="text"
                      required
                      value={inputTarget}
                      onChange={(e) => setInputTarget(e.target.value)}
                      placeholder="Contoh: 100000000 (tanpa Rp/titik)"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-850 focus:outline-hidden focus:border-indigo-500 font-mono"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black flex items-center justify-center gap-1.5 border-none shrink-0 cursor-pointer shadow-xs transition-all"
                    >
                      <Save className="w-4 h-4" />
                      <span>{formMode === 'add' ? 'Tambahkan' : 'Simpan'}</span>
                    </button>
                  </div>
                  {formMode === 'add' && (
                    <span className="text-[9.5px] text-slate-400 font-semibold leading-relaxed mt-1 block">
                      💡 Tip: click customer on the left table to automatically populate Cust ID and Outlet Name instantly!
                    </span>
                  )}
                </div>
              </form>

            </div>
          </div>
        )}

        {/* Showcase targeted stats for selected custom outlets */}
        {activeParticipant ? (
          <div className="space-y-6">
            
            {/* Active customer spot header banner */}
            <div className="bg-gradient-to-r from-slate-50 to-indigo-50/25 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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

            {/* Performance metrics dashboard details */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              
              {/* Milestone Target */}
              <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
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

              {/* Accumulated period sales */}
              <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
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

              {/* Completion indicator */}
              <div className="bg-slate-50/70 border border-slate-150 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
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

              {/* Margin GAP */}
              <div className={`rounded-2xl p-4 border flex flex-col justify-between shadow-xs ${
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
                  {pData.gap >= 0 ? 'Target Met (Cash Back Unlocked)' : 'Target Gap (Not Met)'}
                </div>
              </div>

            </div>

            {/* Monthly detailed timeline breakdown */}
            <div className="bg-slate-50/50 border border-slate-150 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-150 text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                    <th className="p-3">Month</th>
                    <th className="p-3 text-right font-mono">Sales</th>
                    <th className="p-3 text-right font-mono font-bold">Share of Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
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
        ) : (
          <div className="text-center py-16 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-xs font-bold text-slate-750">Belum Ada Outlet Kustom Terdaftar</h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1 font-semibold leading-relaxed">
              Klik tombol <strong>[Tambah Outlet Baru]</strong> di atas untuk mendaftarkan kode outlet kustom Anda sendiri dan melacak performa target milestone dari program ini!
            </p>
          </div>
        )}

        {/* Directory details mapping */}
        {programParticipants.length > 0 && (
          <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-2xs">
            
            {/* Upper control title */}
            <div className="bg-slate-50 p-3.5 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>
                  Daftar Outlet {selectedProgram === 'cashback' ? 'Cash Back' : 'White Bonus'} ({filteredParticipants.length} terdaftar)
                </span>
              </span>

              {/* Achievement filters */}
              <div className="flex bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all cursor-pointer border-none ${
                    filterType === 'all'
                      ? 'bg-white text-indigo-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700 bg-transparent'
                  }`}
                >
                  Semua ({programParticipants.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('under50')}
                  className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all cursor-pointer border-none ${
                    filterType === 'under50'
                      ? 'bg-rose-100 text-rose-800 shadow-2xs'
                      : 'text-slate-500 hover:text-rose-650 bg-transparent'
                  }`}
                >
                  &lt; 50%
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('50_75')}
                  className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all cursor-pointer border-none ${
                    filterType === '50_75'
                      ? 'bg-amber-100 text-amber-800 shadow-2xs'
                      : 'text-slate-500 hover:text-amber-600 bg-transparent'
                  }`}
                >
                  50% - 75%
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('upper75')}
                  className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all cursor-pointer border-none ${
                    filterType === 'upper75'
                      ? 'bg-emerald-100 text-emerald-800 shadow-2xs'
                      : 'text-slate-500 hover:text-emerald-650 bg-transparent'
                  }`}
                >
                  &gt; 75%
                </button>
              </div>
            </div>

            {/* List entries */}
            <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar bg-white">
              {filteredParticipants.map((partOption, oIdx) => {
                const salesObj = partOption.monthlySales;
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
                const isActive = activeParticipant && activeParticipant.id === partOption.id;

                return (
                  <div
                    key={partOption.id}
                    onClick={() => onSelectCustomer(partOption.code)}
                    className={`w-full p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left transition-all border-none cursor-pointer group ${
                      isActive 
                        ? 'bg-indigo-50/75 hover:bg-indigo-50' 
                        : 'bg-white hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-mono font-bold">#{oIdx + 1}</span>
                        <span className="font-mono text-[11px] font-bold text-slate-500 uppercase shrink-0">[{partOption.code}]</span>
                        <span className={`text-xs font-semibold truncate ${isActive ? 'text-indigo-800 font-bold' : 'text-slate-800 font-bold'}`}>
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

                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isWinner
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-slate-50 text-slate-500 border border-slate-100'
                      }`}>
                        {isWinner ? `🏆 Qualified ${selectedProgram === 'cashback' ? 'Cashback' : 'Bonus'}` : 'No Qualification'}
                      </span>

                      {/* Edit Outlet triggers */}
                      <button
                        onClick={(e) => handleEditOutletInit(partOption, e)}
                        className="p-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded transition-colors border-none cursor-pointer"
                        title="Edit data outlet ini"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>

                      {/* Delete Outlet action */}
                      <button
                        onClick={(e) => handleDeleteOutlet(partOption.id, e)}
                        className="p-1 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 hover:text-rose-700 rounded transition-colors border-none cursor-pointer"
                        title="Hapus outlet ini dari daftar"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Informational Help card */}
        <div className="bg-indigo-50/40 border border-indigo-100/65 rounded-2xl p-4 flex items-start gap-2.5">
          <HelpCircle className="w-4.5 h-4.5 text-indigo-650 mt-0.5 shrink-0" />
          <div className="text-[10px] text-slate-500 leading-relaxed font-semibold">
            <span className="font-bold text-slate-600 font-sans">Sistem Enrolment CB/WB Kustom:</span> Daftarkan kode outlet Anda sendiri (misal: kode yang ada di transaksi spreadsheet Anda) beserta nominal target milestonenya. Sistem akan secara otomatis mengumpulkan total net sales per bulannya secara real-time dan mengevaluasi status kualifikasi program per periode secara instan!
          </div>
        </div>

      </div>

    </div>
  );
}
