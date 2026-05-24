/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, RefreshCw, ChevronRight, HelpCircle } from 'lucide-react';
import { parseSpreadsheet, autoMapColumns, standardizeRow } from '../utils';
import { ColumnMapping, SalesRecord } from '../types';

interface FileImportProps {
  onImportComplete: (records: SalesRecord[]) => void;
  currentCount: number;
}

export default function FileImport({ onImportComplete, currentCount }: FileImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'mapping' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [parsedData, setParsedData] = useState<{ originalRows: any[]; headers: string[]; fileName: string } | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    product: '', group_name: '', ttl_sales: ''
  });

  const parseSingleFile = (file: File): Promise<{ originalRows: any[]; headers: string[]; fileName: string }> => {
    return new Promise((resolve, reject) => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls', 'csv', 'tsv', 'ods'].includes(ext || '')) {
        reject(new Error(`"${file.name}" has an unsupported format. Please upload an Excel (.xlsx, .xls) or CSV/TSV file.`));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const { originalRows, headers } = parseSpreadsheet(buffer);
          resolve({ originalRows, headers, fileName: file.name });
        } catch (err: any) {
          reject(new Error(`Error reading "${file.name}": ${err.message || err}`));
        }
      };
      reader.onerror = () => {
        reject(new Error(`Error parsing "${file.name}".`));
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setStatus('parsing');
    setErrorMsg('');

    try {
      const promises = files.map(file => parseSingleFile(file));
      const results = await Promise.all(promises);

      const allRows = results.flatMap(r => r.originalRows);
      if (allRows.length === 0) {
        setStatus('error');
        setErrorMsg('The uploaded files appear to be empty. No rows found.');
        return;
      }

      // Collect unique union of all headers across files
      const allHeadersMap = new Map<string, boolean>();
      results.forEach(r => {
        r.headers.forEach(h => {
          if (h && h.trim()) {
            allHeadersMap.set(h, true);
          }
        });
      });
      const allHeaders = Array.from(allHeadersMap.keys());

      const detectedMapping = autoMapColumns(allHeaders);
      
      const fileNameLabel = results.length === 1
        ? results[0].fileName
        : `${results.length} files (${results.map(r => r.fileName).slice(0, 3).join(', ')}${results.length > 3 ? '...' : ''})`;

      setParsedData({ originalRows: allRows, headers: allHeaders, fileName: fileNameLabel });
      setColumnMapping(detectedMapping);
      setStatus('mapping');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || `Error parsing files: ${err}`);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const executeImport = () => {
    if (!parsedData) return;
    
    try {
      // Map all original rows into standardized SalesRecord structure
      const standardized = parsedData.originalRows.map((row, idx) => {
        const record = standardizeRow(row, columnMapping);
        // Fallback unique id per sheet index if id isn't set
        if (record.id.startsWith('sample-') || !isNaN(Number(record.id))) {
          record.id = `rec-${Date.now()}-${idx}-${Math.floor(Math.random() * 1050)}`;
        }
        return record;
      });

      onImportComplete(standardized);
      setStatus('success');
      
      // Auto-reset state back to idle after a few seconds
      setTimeout(() => {
        setStatus('idle');
        setParsedData(null);
      }, 4000);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(`Import processing failed: ${err.message || err}`);
    }
  };

  const handleMapChange = (field: keyof ColumnMapping, headerValue: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: headerValue
    }));
  };

  return (
    <div id="file-import-module" className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight font-sans">Import Sales Spreadsheet</h2>
          <p className="text-xs text-slate-500 font-medium">Upload your raw Excel file or CSV. We will map your columns into a searchable relational database.</p>
        </div>
        <div className="text-xs font-semibold font-mono text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl self-start">
          Database Capacity: <span className="font-extrabold text-indigo-600">{currentCount} records</span>
        </div>
      </div>

      {status === 'idle' && (
        <div
          id="dropzone"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={triggerFileInput}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/45 scale-[0.99]'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept=".xlsx,.xls,.csv,.tsv,.ods"
            className="hidden"
            multiple
          />
          <div className="p-4 bg-slate-50 rounded-full text-indigo-600 mb-4 border border-slate-200 shadow-xs">
            <Upload className="w-8 h-8" />
          </div>
          <p className="text-sm font-bold text-slate-900 mb-1">
            Drag and drop your sales report file(s) here, or <span className="text-indigo-600 hover:underline">browse files</span>
          </p>
          <p className="text-xs text-slate-400 font-medium">
            Supports uploading multiple Excel (.xlsx, .xls) or CSV/TSV/ODS sheets at once
          </p>
        </div>
      )}

      {status === 'parsing' && (
        <div className="border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center bg-slate-50/50">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm font-bold text-slate-700">Reading worksheet contents...</p>
          <p className="text-xs text-slate-400 font-semibold mt-1">Parsing headers & data cells</p>
        </div>
      )}

      {status === 'mapping' && parsedData && (
        <div className="border border-indigo-100 bg-indigo-50/10 rounded-2xl p-5 font-sans">
          <div className="flex items-center gap-3 border-b border-indigo-100 pb-4 mb-5">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            <div>
              <p className="text-sm font-bold text-slate-800">{parsedData.fileName}</p>
              <p className="text-xs text-slate-500 font-medium">Found {parsedData.originalRows.length} data rows and {parsedData.headers.length} headers.</p>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
            Column Matching (Auto-Detected)
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {(Object.keys(columnMapping) as Array<keyof ColumnMapping>).map((field) => {
              const fieldLabels: Record<string, { label: string; desc: string }> = {
                product: { label: 'Product Name', desc: 'Item description column' },
                group_name: { label: 'Product Group Name', desc: 'e.g. Software, Hardware, Services' },
                ttl_sales: { label: 'Total Sales', desc: 'Sales amount or total revenue column' }
              };

              const currentField = fieldLabels[field];
              if (!currentField) return null;
              
              return (
                <div key={field} className="bg-white border border-slate-200/80 rounded-2xl p-4 hover:border-slate-300 transition-colors shadow-xs">
                  <label className="block text-xs font-bold text-slate-850 mb-1.5 font-sans">
                    {currentField.label} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping[field]}
                    onChange={(e) => handleMapChange(field, e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Column --</option>
                    {parsedData.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 font-medium block mt-1.5">{currentField.desc}</span>
                </div>
              );
            })}
          </div>

          {/* Table Preview */}
          <div className="bg-white border border-slate-200/60 rounded-lg p-3.5 mb-5">
            <p className="text-xs font-semibold text-slate-700 mb-2 font-sans">Original Row Preview (Top 3)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/40">
                    {parsedData.headers.slice(0, 6).map((h) => (
                      <th key={h} className="p-2 text-[10px] font-mono font-medium text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                    {parsedData.headers.length > 6 && (
                      <th className="p-2 text-[10px] font-mono text-slate-400">+{parsedData.headers.length - 6} more</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.originalRows.slice(0, 3).map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-50 text-xs">
                      {parsedData.headers.slice(0, 6).map((h) => (
                        <td key={h} className="p-2 text-slate-600 truncate max-w-[150px] font-mono">{String(row[h])}</td>
                      ))}
                      {parsedData.headers.length > 6 && (
                        <td className="p-3 text-slate-400 font-mono text-[10px]">...</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setStatus('idle');
                setParsedData(null);
              }}
              className="px-4 py-2 border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={executeImport}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              Populate & Import {parsedData.originalRows.length} Rows <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="border border-emerald-100 bg-emerald-50/30 rounded-xl p-6 flex flex-col items-center justify-center text-center font-sans">
          <div className="p-3 bg-emerald-500 rounded-full text-white mb-3 border border-emerald-400/40 shadow-sm animate-bounce">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-emerald-900">Import Successful!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md font-medium">
            All records parsed, standardized, and saved directly into your browser's private indexed database cache.
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="border border-rose-100 bg-rose-50/40 rounded-xl p-6 flex flex-col items-center justify-center text-center font-sans">
          <div className="p-2 bg-rose-100 rounded-full text-rose-600 mb-3 border border-rose-200 shadow-sm">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-rose-900">Error Encountered</h3>
          <p className="text-xs text-rose-600 mt-1 max-w-md font-medium">{errorMsg}</p>
          <button
            onClick={() => setStatus('idle')}
            className="mt-4 px-4 py-1.5 bg-white border border-rose-200 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-50 shadow-sm transition-colors cursor-pointer"
          >
            Retry Upload
          </button>
        </div>
      )}
    </div>
  );
}
