/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { SalesRecord } from '../types';

interface RecordFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: SalesRecord) => void;
  editRecord?: SalesRecord | null;
  existingGroups: string[];
}

export default function RecordFormModal({
  isOpen,
  onClose,
  onSave,
  editRecord,
  existingGroups
}: RecordFormModalProps) {
  const [date, setDate] = useState('');
  const [product, setProduct] = useState('');
  const [groupName, setGroupName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [ttlSales, setTtlSales] = useState(0);
  const [customerId, setCustomerId] = useState('');
  
  // Track if total is custom overridden
  const [isOverridden, setIsOverridden] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Hydrate form on entry or record changes
  useEffect(() => {
    if (editRecord) {
      setDate(editRecord.date || new Date().toISOString().split('T')[0]);
      setProduct(editRecord.product || '');
      setGroupName(editRecord.group_name || '');
      setQuantity(editRecord.quantity || 1);
      setUnitPrice(editRecord.unitPrice || 0);
      setTtlSales(editRecord.ttl_sales || 0);
      setCustomerId(editRecord.customer_id || 'GUEST');
      setIsOverridden(editRecord.ttl_sales !== (editRecord.quantity * editRecord.unitPrice));
    } else {
      // Setup default today
      setDate(new Date().toISOString().split('T')[0]);
      setProduct('');
      setGroupName('');
      setQuantity(1);
      setUnitPrice(0);
      setTtlSales(0);
      setCustomerId('GUEST');
      setIsOverridden(false);
    }
    setValidationError('');
  }, [editRecord, isOpen]);

  // Handle revenue auto calculation
  useEffect(() => {
    if (!isOverridden) {
      setTtlSales(quantity * unitPrice);
    }
  }, [quantity, unitPrice, isOverridden]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!product.trim()) {
      setValidationError('Product description is required.');
      return;
    }
    if (quantity <= 0) {
      setValidationError('Quantity must be 1 or higher.');
      return;
    }
    if (unitPrice < 0) {
      setValidationError('Unit price cannot be a negative value.');
      return;
    }
    if (ttlSales < 0) {
      setValidationError('Total sales cannot be a negative value.');
      return;
    }

    const payload: SalesRecord = {
      id: editRecord?.id || `manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date,
      product: product.trim(),
      group_name: groupName.trim() || 'General',
      quantity,
      unitPrice,
      ttl_sales: ttlSales,
      customer_id: customerId.trim() || 'GUEST',
      customFields: editRecord?.customFields // carry forward if edit
    };

    onSave(payload);
    onClose();
  };

  return (
    <div id="modal-backdrop" className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div id="modal-container" className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-xl border border-slate-250 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-base font-bold text-slate-800 tracking-tight">
            {editRecord ? 'Modify Sales Position' : 'Create New Sale Record'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-colors pointer-events-auto cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 font-sans">
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Transaction Date */}
            <div>
              <label className="block text-xs font-bold text-slate-705 mb-1">Transaction Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Customer ID */}
            <div>
              <label className="block text-xs font-bold text-slate-705 mb-1">Customer / Client ID (cust_id)</label>
              <input
                type="text"
                placeholder="e.g. CUST-1024 or GUEST"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100/30 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            {/* Group Name / Category */}
            <div>
              <label className="block text-xs font-bold text-slate-705 mb-1">Product Group Name</label>
              <input
                type="text"
                list="group-names-list"
                placeholder="e.g. Software, Hardware"
                value={groupName}
                required
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <datalist id="group-names-list">
                {existingGroups.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
          </div>

          {/* Product Description */}
          <div>
            <label className="block text-xs font-bold text-slate-705 mb-1">Product / Item Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Cloud License Professional Packs"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-slate-50 pt-4 mt-2">
            {/* Quantity */}
            <div>
              <label className="block text-xs font-bold text-slate-705 mb-1">Quantity</label>
              <input
                type="number"
                required
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Unit Price */}
            <div>
              <label className="block text-xs font-bold text-slate-705 mb-1">Unit Price (IDR)</label>
              <input
                type="number"
                required
                min="0"
                step="500"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-100/30 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Total Sales */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-705">Total Sales (IDR)</label>
                <button
                  type="button"
                  onClick={() => setIsOverridden(!isOverridden)}
                  className="text-[9px] px-1.5 py-0.5 rounded border border-slate-200 font-bold bg-slate-50 text-slate-500 hover:text-slate-800 cursor-pointer transition-all"
                  title={isOverridden ? "Switch to automatic calculation" : "Edit total independently"}
                >
                  {isOverridden ? 'Auto' : 'Override'}
                </button>
              </div>
              <input
                type="number"
                required
                min="0"
                step="500"
                disabled={!isOverridden}
                value={ttlSales}
                onChange={(e) => setTtlSales(Math.max(0, parseFloat(e.target.value) || 0))}
                className={`w-full text-xs border rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                  isOverridden ? 'bg-indigo-50/20 border-indigo-200 font-bold' : 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed font-medium'
                }`}
              />
            </div>
          </div>

          {/* Footer controls inside layout */}
          <div className="pt-4 border-t border-slate-150 flex justify-end gap-3 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{editRecord ? 'Save and Commit' : 'Add to Database'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
