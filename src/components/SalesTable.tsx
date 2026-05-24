/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  Search, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight,
  Trash2, Edit, Copy, Download, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import { SalesRecord } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface SalesTableProps {
  records: SalesRecord[];
  onEdit: (record: SalesRecord) => void;
  onDelete: (id: string) => void;
  onBulkDelete: (ids: string[]) => void;
  onDuplicate: (record: SalesRecord) => void;
  onExport: (records: SalesRecord[]) => void;
}

export default function SalesTable({
  records,
  onEdit,
  onDelete,
  onBulkDelete,
  onDuplicate,
  onExport
}: SalesTableProps) {
  // Query state
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced Filter state
  const [selectedGroupName, setSelectedGroupName] = useState<string>('');
  const [minRevenue, setMinRevenue] = useState<string>('');
  const [maxRevenue, setMaxRevenue] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Sorting
  const [sortField, setSortField] = useState<keyof SalesRecord | ''>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Selections
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Dynamic values for filter lists
  const filterDropdownLists = useMemo(() => {
    const groupNames = new Set<string>();
    
    records.forEach(r => {
      if (r.group_name) groupNames.add(r.group_name);
    });

    return {
      groupNames: Array.from(groupNames).sort()
    };
  }, [records]);

  // Handle Sort Toggle
  const triggerSort = (field: keyof SalesRecord) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc'); // default to desc (e.g., date, revenue)
    }
    setCurrentPage(1);
  };

  // Clear all filters
  const resetFilters = () => {
    setSelectedGroupName('');
    setMinRevenue('');
    setMaxRevenue('');
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setCurrentPage(1);
  };

  // Filter application pipeline
  const filteredRecords = useMemo(() => {
    return records.filter(rec => {
      // 1. Full text search matching
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesProduct = rec.product.toLowerCase().includes(query);
        const matchesGroup = rec.group_name.toLowerCase().includes(query);
        const matchesId = rec.id.toLowerCase().includes(query);
        
        if (!matchesProduct && !matchesGroup && !matchesId) {
          return false;
        }
      }

      // 2. Select conditions
      if (selectedGroupName && rec.group_name !== selectedGroupName) return false;

      // 3. Money bounds
      if (minRevenue) {
        const minVal = parseFloat(minRevenue);
        if (!isNaN(minVal) && rec.ttl_sales < minVal) return false;
      }
      if (maxRevenue) {
        const maxVal = parseFloat(maxRevenue);
        if (!isNaN(maxVal) && rec.ttl_sales > maxVal) return false;
      }

      // 4. Time bounds
      if (startDate && rec.date < startDate) return false;
      if (endDate && rec.date > endDate) return false;

      return true;
    });
  }, [records, searchQuery, selectedGroupName, minRevenue, maxRevenue, startDate, endDate]);

  // Sort pipeline
  const sortedRecords = useMemo(() => {
    if (!sortField) return filteredRecords;

    return [...filteredRecords].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle undefined/nulls
      if (valA === undefined) valA = '';
      if (valB === undefined) valB = '';

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        // Assume number sorting
        return sortDirection === 'asc'
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      }
    });
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination calculation
  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage) || 1;
  const pageStartIdx = (currentPage - 1) * itemsPerPage;
  const paginatedRecords = useMemo(() => {
    return sortedRecords.slice(pageStartIdx, pageStartIdx + itemsPerPage);
  }, [sortedRecords, pageStartIdx, itemsPerPage]);

  // Adjust pagination if page out of bounds
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }

  // Row selection helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allPageIds = paginatedRecords.map(r => r.id);
      setSelectedIds(prev => {
        const next = new Set(prev);
        allPageIds.forEach(id => next.add(id));
        return next;
      });
    } else {
      const allPageIds = paginatedRecords.map(r => r.id);
      setSelectedIds(prev => {
        const next = new Set(prev);
        allPageIds.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const isAllSelected = paginatedRecords.length > 0 && paginatedRecords.every(r => selectedIds.has(r.id));
  const selectedCount = selectedIds.size;

  const triggerBulkDelete = () => {
    if (confirm(`Are you sure you want to delete the ${selectedCount} selected records?`)) {
      onBulkDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const triggerBulkExport = () => {
    const selectedRecords = records.filter(r => selectedIds.has(r.id));
    onExport(selectedRecords.length > 0 ? selectedRecords : sortedRecords);
  };

  return (
    <div id="sales-database-grid-module" className="bg-white border border-slate-200 rounded-3xl shadow-xs overflow-hidden flex flex-col font-sans">
      
      {/* Search and Filters Bar */}
      <div className="p-4 border-b border-slate-50 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search Input */}
        <div className="relative w-full md:max-w-xs shrink-0">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search items, groups, IDs..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full text-xs bg-slate-50 border border-slate-200/85 rounded-xl pl-9 pr-3 py-2.5 text-slate-700 hover:bg-slate-100/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full justify-end">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl text-xs font-bold transition-all duration-200 pointer-events-auto cursor-pointer ${
              showFilters || selectedGroupName || minRevenue || maxRevenue || startDate || endDate
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Faceted Filters</span>
            {(selectedGroupName || minRevenue || maxRevenue || startDate || endDate) && (
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
            )}
          </button>

          {/* Export Action */}
          <button
            onClick={() => onExport(sortedRecords)}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed shadow-xs pointer-events-auto cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* Advanced Filter Drawer Pane */}
      {(showFilters || selectedGroupName || minRevenue || maxRevenue || startDate || endDate) && (
        <div id="filter-drawer" className="p-4 border-b border-slate-100 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs animate-fade-in font-sans">
          {/* Group Name dropdown */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Product Group</label>
            <select
              value={selectedGroupName}
              onChange={(e) => {
                setSelectedGroupName(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-600"
            >
              <option value="">All Groups</option>
              {filterDropdownLists.groupNames.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          {/* Date Bounds */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Order Date Range</label>
            <div className="flex gap-1.5 items-center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-slate-400 font-mono text-[10px]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Price Boundaries */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Min Sales (IDR)</label>
            <input
              type="number"
              placeholder="0"
              value={minRevenue}
              onChange={(e) => {
                setMinRevenue(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Max Sales (IDR)</label>
            <input
              type="number"
              placeholder="e.g. 50000000"
              value={maxRevenue}
              onChange={(e) => {
                setMaxRevenue(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="lg:col-span-4 flex items-end gap-3 justify-end pt-1 font-sans">
            <button
              onClick={resetFilters}
              className="px-4 py-2 border border-slate-250 bg-white hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk action sticky indicator */}
      {selectedCount > 0 && (
        <div className="bg-indigo-50/90 border-b border-indigo-100 px-4 py-3 text-xs flex items-center justify-between transition-all font-sans">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
              {selectedCount}
            </span>
            <span className="text-slate-700 font-bold">{selectedCount} rows selected.</span>
          </div>
          <div className="flex gap-2.5">
            <button
              onClick={triggerBulkExport}
              className="px-3 py-1 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-lg font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              title="Export selected rows to Excel spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Selection</span>
            </button>
            <button
              onClick={triggerBulkDelete}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Delete ({selectedCount})</span>
            </button>
          </div>
        </div>
      )}

      {/* Core Table Grid Display */}
      <div className="overflow-x-auto font-sans">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="p-3.5 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
              </th>
              
              <th onClick={() => triggerSort('date')} className="p-3.5 cursor-pointer hover:bg-slate-100/50 transition-colors w-32">
                <div className="flex items-center gap-1">
                  <span>Order Date</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th onClick={() => triggerSort('customer_id')} className="p-3.5 cursor-pointer hover:bg-slate-100/50 transition-colors w-28 font-mono text-[10px]">
                <div className="flex items-center gap-1">
                  <span>Cust ID</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th onClick={() => triggerSort('product')} className="p-3.5 cursor-pointer hover:bg-slate-100/50 transition-colors">
                <div className="flex items-center gap-1">
                  <span>Product Name</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th onClick={() => triggerSort('group_name')} className="p-3.5 cursor-pointer hover:bg-slate-100/50 transition-colors w-40">
                <div className="flex items-center gap-1">
                  <span>Group Name</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th onClick={() => triggerSort('quantity')} className="p-3.5 cursor-pointer hover:bg-slate-100/50 text-right transition-colors w-24 font-mono">
                <div className="flex items-center gap-1 justify-end">
                  <span>Qty</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th onClick={() => triggerSort('unitPrice')} className="p-3.5 cursor-pointer hover:bg-slate-100/50 text-right transition-colors w-32 font-mono">
                <div className="flex items-center gap-1 justify-end">
                   <span>Unit Cost</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th onClick={() => triggerSort('ttl_sales')} className="p-3.5 cursor-pointer hover:bg-slate-100/50 text-right transition-colors w-36 font-mono">
                <div className="flex items-center gap-1 justify-end">
                  <span>Total Sales</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>

              <th className="p-3.5 w-24 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {paginatedRecords.length > 0 ? (
              paginatedRecords.map((r) => {
                const isSelected = selectedIds.has(r.id);
                const isHighRevenue = r.ttl_sales >= 10000000;

                return (
                  <tr
                    key={r.id}
                    className={`text-xs hover:bg-slate-50/60 transition-colors ${
                      isSelected ? 'bg-indigo-50/25 font-medium' : ''
                    }`}
                  >
                    {/* Checkbox Selector */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectRow(r.id, e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                      />
                    </td>

                    {/* Order Date */}
                    <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                      {formatDate(r.date)}
                    </td>

                    {/* Customer ID */}
                    <td className="p-3.5 font-mono text-xs font-bold text-slate-600 max-w-[120px] truncate" title={r.customer_id || 'GUEST'}>
                      {r.customer_id || 'GUEST'}
                    </td>

                    {/* Product Name */}
                    <td className="p-3.5 font-semibold text-slate-800">
                      <div className="truncate max-w-[280px]" title={r.product}>
                        {r.product}
                      </div>
                      {r.customFields && (
                        <span className="text-[9px] text-indigo-500 bg-indigo-50 px-1 py-0.2 rounded font-semibold ml-0 inline-block mt-0.5" title={JSON.stringify(r.customFields)}>
                          +{Object.keys(r.customFields).length} extra properties
                        </span>
                      )}
                    </td>

                    {/* Group Name */}
                    <td className="p-3.5">
                      <span className="inline-block px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-150 text-slate-700">
                        {r.group_name}
                      </span>
                    </td>

                    {/* Quantity */}
                    <td className="p-3.5 text-right font-mono font-medium text-slate-600">
                      {r.quantity.toLocaleString()}
                    </td>

                    {/* Unit Price */}
                    <td className="p-3.5 text-right font-mono text-slate-600">
                      {formatCurrency(r.unitPrice)}
                    </td>

                    {/* Total Sales (ttl_sales) */}
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      <span className={isHighRevenue ? 'text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded-xl font-black' : ''}>
                        {formatCurrency(r.ttl_sales)}
                      </span>
                    </td>

                    {/* Row Item Controls */}
                    <td className="p-3 text-center border-l border-slate-50">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onEdit(r)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                          title="Edit Sales Record"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDuplicate(r)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                          title="Clone Record"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this entry?')) {
                              onDelete(r.id);
                            }
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="p-10 text-center text-slate-400 bg-slate-50/10 font-sans">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto font-sans">
                    <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-800">No Matching Records Found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                      Adjust your queries, check spellings, or reset your filters to locate matches.
                    </p>
                    {(selectedGroupName || minRevenue || maxRevenue || startDate || searchQuery) && (
                      <button
                        onClick={resetFilters}
                        className="mt-4 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Clear Active Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Controls */}
      <div className="p-4 bg-slate-50/40 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-sans">
        <div className="flex items-center gap-2">
          <span>Show</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(parseInt(e.target.value, 10));
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-600 focus:outline-none"
          >
            <option value="10">10 rows</option>
            <option value="25">25 rows</option>
            <option value="50">50 rows</option>
            <option value="100">100 rows</option>
          </select>
          <span>
            of <span className="font-semibold text-slate-700">{sortedRecords.length} records</span>
            {searchQuery && ` (filtered from ${records.length} total)`}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-bold">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed cursor-pointer"
            title="First Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          <span className="px-3 py-1 bg-white border border-slate-250 rounded-lg text-slate-700 font-bold font-mono">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 border border-slate-200 rounded-lg bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
