/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Database, Plus, Trash2, BarChart3, Download,
  AlertCircle, Sparkles, RefreshCw, CircleHelp, Heart, User, Award, Plane, Store, Cpu
} from 'lucide-react';
import { SpeedInsights } from '@vercel/speed-insights/react';

import { SalesRecord } from './types';
import { generateSampleData, exportToExcel } from './utils';

import FileImport from './components/FileImport';
import DashboardCharts from './components/DashboardCharts';
import CustomerSpotlight from './components/CustomerSpotlight';
import CashBackProgram from './components/CashBackProgram';
import TourProgram from './components/TourProgram';
import RecordFormModal from './components/RecordFormModal';
import AccessGate from './components/AccessGate';
import OutletSPG from './components/OutletSPG';
import CustomCashBackProgram from './components/CustomCashBackProgram';
import ModelingFeature from './components/ModelingFeature';

export default function App() {
  // Main centralized state
  const [records, setRecords] = useState<SalesRecord[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customer' | 'cashback' | 'tour' | 'outletspg' | 'custom_cashback' | 'modeling'>('dashboard');
  const [selectedCustId, setSelectedCustId] = useState<string>('');
  
  // Modal controllers
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalesRecord | null>(null);

  // Status/Notice Banner state
  const [themeNotice, setThemeNotice] = useState<string | null>(null);

  // Access key check state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('sales_report_unlocked') === 'true';
    } catch {
      return false;
    }
  });

  const handleUnlock = () => {
    setIsUnlocked(true);
    try {
      sessionStorage.setItem('sales_report_unlocked', 'true');
    } catch (e) {
      console.error(e);
    }
  };

  // Load database on initialization
  useEffect(() => {
    try {
      localStorage.removeItem('sales_report_db_records');
    } catch (e) {
      console.error('Failed to clear storage cache:', e);
    }
    setRecords([]);
    setIsInitialized(true);
  }, []);

  // Sync to database
  const saveRecordsToDatabase = (nextRecords: SalesRecord[]): boolean => {
    setRecords(nextRecords);
    try {
      localStorage.setItem('sales_report_db_records', JSON.stringify(nextRecords));
      return true;
    } catch (e: any) {
      const isQuota = e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
      if (isQuota) {
        setThemeNotice('quota-exceeded');
        try {
          // Fallback 1: Strip customFields to save massive amounts of space
          const stripped = nextRecords.map(({ customFields, ...rest }) => rest);
          localStorage.setItem('sales_report_db_records', JSON.stringify(stripped));
          console.warn('Persisted database to localStorage by omitting custom fields to fit storage quota.');
          return true;
        } catch (e2) {
          try {
            // Fallback 2: Prune the stored list to the first 1500 records
            const pruned = nextRecords.slice(0, 1500).map(({ customFields, ...rest }) => rest);
            localStorage.setItem('sales_report_db_records', JSON.stringify(pruned));
            console.warn('Persisted database to localStorage by pruning to top 1500 records to fit storage quota.');
            return true;
          } catch (e3) {
            console.warn('LocalStorage quota exceeded. Records are active in session memory only.', e3);
          }
        }
      } else {
        console.warn('Unable to write to localStorage:', e);
      }
      return false;
    }
  };

  // Add or modify a record
  const handleSaveRecord = (record: SalesRecord) => {
    const exists = records.some(r => r.id === record.id);
    let next: SalesRecord[];
    
    if (exists) {
      next = records.map(r => r.id === record.id ? record : r);
    } else {
      next = [record, ...records];
    }
    
    saveRecordsToDatabase(next);
    
    // Auto shift to dashboard view to see changes
    setActiveTab('dashboard');
  };

  // Delete recorded position
  const handleDeleteRecord = (id: string) => {
    const next = records.filter(r => r.id !== id);
    saveRecordsToDatabase(next);
  };

  // Bulk deletion
  const handleBulkDeleteRecords = (ids: string[]) => {
    const next = records.filter(r => !ids.includes(r.id));
    saveRecordsToDatabase(next);
  };

  // Duplicate sales record
  const handleDuplicateRecord = (record: SalesRecord) => {
    const copy: SalesRecord = {
      ...record,
      id: `manual-copy-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      product: `${record.product} (Copy)`
    };
    saveRecordsToDatabase([copy, ...records]);
    setEditingRecord(copy);
    setIsModalOpen(true);
  };

  // Populate Excel sheets back
  const handleExportDatabase = (recordsToExport: SalesRecord[]) => {
    exportToExcel(recordsToExport, 'my_sales_report_database.xlsx');
  };

  // Append newly imported files to current database or replace it
  const handleBatchImport = (newRecords: SalesRecord[]) => {
    const isBrowsingSample = records.some(r => r.id.startsWith('sample-'));
    const nextRecords = isBrowsingSample ? newRecords : [...newRecords, ...records];
    const saved = saveRecordsToDatabase(nextRecords);
    if (saved) {
      setThemeNotice('imported-success');
    }
    setActiveTab('dashboard');
  };

  // Purge/Reset workbook completely
  const handleWipeDatabase = () => {
    saveRecordsToDatabase([]);
    setThemeNotice('purged');
  };

  // Seed sample database manually
  const handleLoadSampleDatabase = () => {
    const sample = generateSampleData();
    saveRecordsToDatabase(sample);
    setThemeNotice('loaded-sample');
  };

  // Gather unique lists for input data-lists triggers
  const dropdownMetaData = useMemo(() => {
    const groupNames = new Set<string>();
    
    records.forEach(r => {
      if (r.group_name) groupNames.add(r.group_name);
    });

    return {
      groupNames: Array.from(groupNames)
    };
  }, [records]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
        <h3 className="text-sm font-semibold text-slate-800">Initializing Database Engine...</h3>
      </div>
    );
  }

  const isBrowsingSample = records.some(r => r.id.startsWith('sample-'));

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-50 selection:text-indigo-900 pb-16">
      
      {/* Upper Navigation Banner info notifications */}
      {themeNotice === 'loaded-sample' && (
        <div className="bg-amber-50 text-amber-900 text-xs px-4 py-3 border-b border-amber-100 flex items-center justify-between font-sans">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Currently browsing standard **Sales Report template data** (60 positions). You can try filter cards or click tab items to inspect. Click <strong>[Reset Database]</strong> below to clean and drop your spreadsheet columns!</span>
          </div>
          <button onClick={() => setThemeNotice(null)} className="text-amber-600 hover:text-amber-800 font-bold shrink-0 ml-4">✕</button>
        </div>
      )}

      {themeNotice === 'imported-success' && (
        <div className="bg-emerald-50 text-emerald-900 text-xs px-4 py-3 border-b border-emerald-100 flex items-center justify-between font-sans">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Successfully indexed, auto-mapped, and bound incoming sales spreadsheet entries completely! Cached locally inside browser namespace.</span>
          </div>
          <button onClick={() => setThemeNotice(null)} className="text-emerald-600 hover:text-emerald-800 font-bold shrink-0 ml-4">✕</button>
        </div>
      )}

      {themeNotice === 'quota-exceeded' && (
        <div className="bg-rose-50 text-rose-950 text-xs px-4 py-3 border-b border-rose-100 flex items-center justify-between font-sans">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span><strong>Data Active in Session:</strong> This spreadsheet has been parsed and is fully analytical, but exceeded your browser's persistent storage limit. Calculations remain active, but do not reload this page!</span>
          </div>
          <button onClick={() => setThemeNotice(null)} className="text-rose-700 hover:text-rose-950 font-bold shrink-0 ml-4">✕</button>
        </div>
      )}

      {themeNotice === 'purged' && (
        <div className="bg-slate-900 text-white text-xs px-4 py-3 border-b border-slate-850 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Ledger flushed cleanly. Zero records. Drop or select a new file to start tracking.</span>
          </div>
          <button onClick={() => setThemeNotice(null)} className="text-slate-400 hover:text-white shrink-0 ml-4 font-bold">✕</button>
        </div>
      )}

      {/* Main Structural Layout Wrapper */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        
        {/* Top Header Section */}
        <div id="application-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-xs">
          <div className="flex items-center gap-3">
            <div id="database-icon-pouch" className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xs">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight font-sans">REPORTKUY</h1>
                {isBrowsingSample && (
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">Workbook Template</span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">ReportKuy automatically turns Excel and CSV files into interactive dashboards, statistics, and AI-powered business reports.</p>
            </div>
          </div>

          {/* Action Trigger Pad */}
          <div className="flex flex-wrap items-center gap-2">
            {records.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleExportDatabase(records)}
                  className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer font-sans"
                  title="Export current database to a formatted Excel workbook file and download it"
                >
                  <Download className="w-4 h-4" />
                  <span>Export to Excel</span>
                </button>
                <button
                  onClick={handleWipeDatabase}
                  className="px-3.5 py-2.5 border border-slate-200 text-rose-600 bg-white hover:bg-rose-50 rounded-2xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  title="Reset database cache to load a separate Excel mapping"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Reset Database</span>
                </button>
              </div>
            ) : (
              <button
                onClick={handleLoadSampleDatabase}
                className="px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-indigo-700 rounded-2xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Load sample catalog data to explore dashboard graphs"
              >
                <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                <span>Reset with Sample Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Excel Importer Interface block */}
        <FileImport onImportComplete={handleBatchImport} currentCount={records.length} />

        {/* Tab Selection Filter Navigation */}
        <div id="tab-navigation-bay" className="flex items-center justify-between bg-white p-2 md:p-2.5 rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="flex gap-1 md:gap-1.5 font-sans overflow-x-auto no-scrollbar w-full py-0.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 md:px-4 py-2 text-xs font-bold flex items-center gap-2 rounded-2xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Dashboard Informasi</span>
            </button>

            <button
              onClick={() => setActiveTab('customer')}
              className={`px-3 md:px-4 py-2 text-xs font-bold flex items-center gap-2 rounded-2xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'customer'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              title="Search and evaluate deep client-level trends, spend rates, and histories"
            >
              <User className="w-3.5 h-3.5" />
              <span>Rangkuman Customer</span>
            </button>

            <button
              onClick={() => setActiveTab('outletspg')}
              className={`px-3 md:px-4 py-2 text-xs font-bold flex items-center gap-2 rounded-2xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'outletspg'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              title="Assess sales and item detailed insights for manually registered SPG Outlets"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Outlet SPG</span>
            </button>

            <button
              onClick={() => setActiveTab('custom_cashback')}
              className={`px-3 md:px-4 py-2 text-xs font-bold flex items-center gap-2 rounded-2xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'custom_cashback'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              title="Track progress and achievements for your custom registered CB and WB outlets"
            >
              <Award className="w-3.5 h-3.5" />
              <span>CB dan WB</span>
            </button>

            <button
              onClick={() => setActiveTab('cashback')}
              className={`px-3 md:px-4 py-2 text-xs font-bold flex items-center gap-2 rounded-2xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'cashback'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              title="Assess target progress and achievements for active cashback and bonus tiers"
            >
              <Award className="w-3.5 h-3.5 text-indigo-400" />
              <span>Program CB dan WB 🔒</span>
            </button>

            <button
              onClick={() => setActiveTab('tour')}
              className={`px-3 md:px-4 py-2 text-xs font-bold flex items-center gap-2 rounded-2xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'tour'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              title="Assess targets and achievements for Tour Belgia & Tour Malaysia (Feb - Nov)"
            >
              <Plane className="w-3.5 h-3.5 text-indigo-400" />
              <span>Tour 2026 🔒</span>
            </button>

            <button
              onClick={() => setActiveTab('modeling')}
              className={`px-3 md:px-4 py-2 text-xs font-bold flex items-center gap-2 rounded-2xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'modeling'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
              title="Analyze forecasting models: Linear Regression & Extrapolation forecasts"
            >
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Modeling 🔒</span>
            </button>
          </div>

          <div className="text-[10px] text-slate-400 font-mono pr-4 hidden lg:block shrink-0">
            Indexed Storage Cache
          </div>
        </div>

        {/* Dynamic Nav View Render */}
        <div id="workspace-primary-viewport" className="transition-all animate-fade-in animate-duration-200">
          {activeTab === 'dashboard' ? (
            <DashboardCharts records={records} />
          ) : activeTab === 'customer' ? (
            <CustomerSpotlight 
              records={records} 
              selectedCustId={selectedCustId} 
              onSelectCustomer={setSelectedCustId} 
            />
          ) : activeTab === 'custom_cashback' ? (
            <CustomCashBackProgram 
              records={records} 
              selectedCustId={selectedCustId} 
              onSelectCustomer={(id) => {
                setSelectedCustId(id);
              }} 
            />
          ) : activeTab === 'cashback' ? (
            !isUnlocked ? (
              <AccessGate title="Program CB dan WB" onSuccess={handleUnlock} />
            ) : (
              <CashBackProgram 
                records={records} 
                selectedCustId={selectedCustId} 
                onSelectCustomer={(id) => {
                  setSelectedCustId(id);
                }} 
              />
            )
          ) : activeTab === 'tour' ? (
            !isUnlocked ? (
              <AccessGate title="Tour 2026" onSuccess={handleUnlock} />
            ) : (
              <TourProgram 
                records={records} 
                selectedCustId={selectedCustId} 
                onSelectCustomer={(id) => {
                  setSelectedCustId(id);
                }} 
              />
            )
          ) : activeTab === 'modeling' ? (
            !isUnlocked ? (
              <AccessGate title="Modeling" onSuccess={handleUnlock} />
            ) : (
              <ModelingFeature records={records} />
            )
          ) : (
            <OutletSPG records={records} />
          )}
        </div>

        {/* Bottom Small Helpful Explanatory Banner */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl text-slate-500 text-xs flex gap-3 shadow-xs">
          <CircleHelp className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
          <div className="space-y-1 font-sans">
            <p className="font-bold text-slate-800 text-sm">Offline-Secure Sandboxing: Di mana data saya disimpan?</p>
            <p className="leading-relaxed">
              Data Anda disimpan langsung di browser dan tidak pernah dikirim ke server atau layanan cloud mana pun. 
              Seluruh catatan penjualan tetap aman di perangkat Anda dan hanya dapat diakses oleh Anda. Kapan saja, data dapat diekspor menjadi folder Excel yang telah diformat melalui tombol 
              <strong>[Export to Excel]</strong>.
            </p>
          </div>
        </div>

        {/* Tiny humble Footer */}
        <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1 pt-4 font-sans font-semibold">
          <span>Sales Database Project by Saktya</span>
          <span>•</span>
          <span className="flex items-center gap-0.5">Securely Hosted in Browser Space <Heart className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" /></span>
        </div>

      </div>

      {/* Manual Creation / Editing Dialog Modal */}
      <RecordFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
        editRecord={editingRecord}
        existingGroups={dropdownMetaData.groupNames}
      />

      {/* Vercel Speed Insights */}
      <SpeedInsights />

    </div>
  );
}
