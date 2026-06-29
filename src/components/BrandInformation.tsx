import React, { useState, useMemo } from 'react';
import { SalesRecord } from '../types';
import { formatCurrency } from '../utils';
import { 
  Tag, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Coins,
  Package,
  ArrowUpDown,
  Sparkles,
  Layers,
  TrendingUp,
  Flame
} from 'lucide-react';

interface BrandInformationProps {
  records: SalesRecord[];
}

type SortField = 'customOrder' | 'brandName' | 'skuCount' | 'totalSales';
type SortOrder = 'asc' | 'desc';

// Custom sorting weights based on the user-provided list
function getBrandSortIndex(brandName: string): number {
  const name = brandName.toLowerCase().trim();
  
  if (name === 'eye care') return 0;
  if (name === 'eye wash') return 1;
  if (name === 'acnes') return 2;
  if (name === 'lip ice') return 3;
  if (name === 'khalisa') return 4;
  if (name === 'selsun') return 5;
  if (name === 'hada labo') return 6;
  if (name === 'skin aqua dan sunplay') return 7;
  if (name === 'melano cc') return 8;
  if (name === 'other') return 9;
  
  return 99; // Default fallback for other brand names
}

// Helper to determine precise Hada Labo sub-brand
function getHadaLaboSubBrand(productName: string): string {
  const prod = productName.toUpperCase();
  if (prod.includes('ALFA') || prod.includes('ALPHA') || prod.includes('ALPH') || prod.includes('ALF')) {
    return 'HL GOKUJYUN ALFA';
  }
  if (prod.includes('GOKUJYUN') || prod.includes('GOKU')) {
    return 'HL GOKUJYUN';
  }
  if (prod.includes('SHIROJYUN') || prod.includes('SHIRO')) {
    return 'HL SHIROJYUN';
  }
  if (prod.includes('3D') || prod.includes('3 D')) {
    return 'HL 3D Gel';
  }
  if (prod.includes('TAMAGOHADA') || prod.includes('TAMAGO') || prod.includes('PEELING') || prod.includes('TAMA')) {
    return 'HL TAMAGOHADA';
  }
  return 'HL GOKUJYUN'; // Default fallback
}

// Classifier function to map records to the exact 10 brand categories and their sub-brands
function classifyRecord(groupName: string, productName: string): { catName: string; subBrandName: string } {
  const grp = (groupName || '').trim().toUpperCase();
  const prod = (productName || '').trim().toUpperCase();
  const combined = `${grp} ${prod}`;

  // 1. Eye care
  if (
    grp.includes('EYE CARE') || 
    prod.includes('COOL') || 
    prod.includes('C CUBE') || 
    prod.includes('C-CUBE') || 
    prod.includes('DRY FRESH') || 
    prod.includes('V-EXTRA') || 
    prod.includes('EYE DROPS') || 
    prod.includes('ROHTO Z') ||
    prod.includes('ROHTO COOL') ||
    prod.includes('C CUB') ||
    prod.includes('RDF') ||
    prod.includes('RVX')
  ) {
    // Avoid mixing Eye Flush into Eye Care drops
    if (prod.includes('FLUSH') || prod.includes('EYE FLUSH') || grp.includes('EYE FLUSH') || grp.includes('EYE WASH')) {
      return { catName: 'Eye wash', subBrandName: 'Rohto Eye Flush' };
    }
    
    if (prod.includes('COOL')) {
      return { catName: 'Eye care', subBrandName: 'Rohto Cool' };
    }
    if (prod.includes('C CUBE') || prod.includes('C-CUBE') || prod.includes('C CUB')) {
      return { catName: 'Eye care', subBrandName: 'C Cube' };
    }
    if (prod.includes('DRY') || prod.includes('RDF')) {
      return { catName: 'Eye care', subBrandName: 'RDF' };
    }
    if (prod.includes('V-EXTRA') || prod.includes('V EXTRA') || prod.includes('RVX')) {
      return { catName: 'Eye care', subBrandName: 'RVX' };
    }
    if (prod.includes('ROHTO Z') || prod.includes('Z!') || prod.includes('ROHTO Z!')) {
      return { catName: 'Eye care', subBrandName: 'Rohto Z' };
    }
    return { catName: 'Eye care', subBrandName: 'OMR' }; // Default fallback for eye care drops
  }

  // 2. Eye wash
  if (grp.includes('EYE FLUSH') || grp.includes('EYE WASH') || prod.includes('FLUSH') || prod.includes('EYE FLUSH')) {
    return { catName: 'Eye wash', subBrandName: 'Rohto Eye Flush' };
  }

  // 3. Acnes
  if (grp.includes('ACNES') || prod.includes('ACNES')) {
    if (prod.includes('DERMA')) {
      return { catName: 'Acnes', subBrandName: 'Acnes Derma' };
    }
    if (prod.includes('ANC') || prod.includes('NATURAL CARE')) {
      return { catName: 'Acnes', subBrandName: 'ANC' };
    }
    return { catName: 'Acnes', subBrandName: 'Acnes series' };
  }

  // 4. Lip Ice
  if (
    grp.includes('LIP ICE') || grp.includes('LIPICE') || 
    prod.includes('LIP ICE') || prod.includes('LIPICE') || 
    prod.includes('LOL') || prod.includes('LIP ON LIP') || prod.includes('LIP ON')
  ) {
    if (prod.includes('LOL') || prod.includes('LIP ON LIP') || prod.includes('LIP ON')) {
      return { catName: 'Lip Ice', subBrandName: 'LoL' };
    }
    return { catName: 'Lip Ice', subBrandName: 'Lip Ice' };
  }

  // 5. Khalisa
  if (grp.includes('KHALISA') || prod.includes('KHALISA')) {
    if (prod.includes('LIP') || prod.includes('BALM')) {
      return { catName: 'Khalisa', subBrandName: 'Khalisa Lip Care' };
    }
    return { catName: 'Khalisa', subBrandName: 'Khalisa Skin Care' };
  }

  // 6. Selsun
  if (grp.includes('SELSUN') || prod.includes('SELSUN')) {
    return { catName: 'Selsun', subBrandName: 'Selsun' };
  }

  // 7. Hada labo
  if (
    grp.includes('HADA LABO') || grp.includes('HADALABO') || 
    prod.includes('HADA LABO') || prod.includes('HADALABO') ||
    prod.includes('GOKUJYUN') || prod.includes('SHIROJYUN') ||
    prod.includes('TAMAGOHADA') || prod.includes('3D') || prod.includes('3 D')
  ) {
    return { catName: 'Hada labo', subBrandName: getHadaLaboSubBrand(productName) };
  }

  // 8. Skin Aqua dan Sunplay
  if (
    grp.includes('SKIN AQUA') || grp.includes('SKINAQUA') || grp.includes('SUNPLAY') || 
    prod.includes('SKIN AQUA') || prod.includes('SKINAQUA') || prod.includes('SUNPLAY') ||
    prod.includes('AQUA UV')
  ) {
    if (prod.includes('SUNPLAY')) {
      return { catName: 'Skin Aqua dan Sunplay', subBrandName: 'Sunplay' };
    }
    return { catName: 'Skin Aqua dan Sunplay', subBrandName: 'Skin Aqua' };
  }

  // 9. Melano CC
  if (grp.includes('MELANO') || prod.includes('MELANO')) {
    return { catName: 'Melano CC', subBrandName: 'Melano CC' };
  }

  // 10. Other specific checks
  if (grp.includes('OXY') || prod.includes('OXY')) {
    return { catName: 'Other', subBrandName: 'Oxy' };
  }
  if (grp.includes('MENTHOLATUM') || prod.includes('MENTHOLATUM')) {
    return { catName: 'Other', subBrandName: 'Mentholatum' };
  }
  if (prod.includes('BEAUTY MASK') || prod.includes('MASK') || grp.includes('BEAUTY MASK')) {
    return { catName: 'Other', subBrandName: 'Beauty Mask' };
  }

  // Fallbacks based on substring matching across fields
  if (
    combined.includes('HADA') || combined.includes('GOKU') || 
    combined.includes('SHIRO') || combined.includes('TAMA') || 
    combined.includes('3D') || combined.includes('3 D')
  ) {
    return { catName: 'Hada labo', subBrandName: getHadaLaboSubBrand(productName) };
  }
  if (combined.includes('AQUA') || combined.includes('SUNPLAY')) {
    return { catName: 'Skin Aqua dan Sunplay', subBrandName: 'Skin Aqua' };
  }
  if (combined.includes('ACNE')) {
    return { catName: 'Acnes', subBrandName: 'Acnes series' };
  }
  if (combined.includes('LIP')) {
    return { catName: 'Lip Ice', subBrandName: 'Lip Ice' };
  }
  if (combined.includes('SELSUN')) {
    return { catName: 'Selsun', subBrandName: 'Selsun' };
  }
  if (combined.includes('KHALISA')) {
    if (combined.includes('LIP') || combined.includes('BALM')) {
      return { catName: 'Khalisa', subBrandName: 'Khalisa Lip Care' };
    }
    return { catName: 'Khalisa', subBrandName: 'Khalisa Skin Care' };
  }
  if (combined.includes('MELANO')) {
    return { catName: 'Melano CC', subBrandName: 'Melano CC' };
  }
  if (combined.includes('FLUSH')) {
    return { catName: 'Eye wash', subBrandName: 'Rohto Eye Flush' };
  }
  if (combined.includes('EYE') || combined.includes('COOL') || combined.includes('CUBE')) {
    return { catName: 'Eye care', subBrandName: 'OMR' };
  }

  // Absolute fallback for completely unrecognized items
  return { catName: 'Other', subBrandName: 'Other' };
}

interface SkuItem {
  skuName: string;
  totalSales: number;
}

interface SubBrandGroup {
  subBrandName: string;
  totalSales: number;
  skus: SkuItem[];
}

interface BrandCategory {
  brandName: string;
  totalSales: number;
  skuCount: number;
  subBrands: SubBrandGroup[];
}

export default function BrandInformation({ records }: BrandInformationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});
  const [expandedSubBrands, setExpandedSubBrands] = useState<Record<string, boolean>>({});
  const [sortField, setSortField] = useState<SortField>('customOrder');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Compute brand category and sub-brand nested aggregation
  const aggregatedData = useMemo<BrandCategory[]>(() => {
    const categoryMap: Record<string, Record<string, Record<string, number>>> = {};

    records.forEach(r => {
      const { catName, subBrandName } = classifyRecord(r.group_name, r.product);
      const skuName = (r.product || 'Unknown SKU').trim();
      const sales = r.ttl_sales || 0;

      if (!categoryMap[catName]) {
        categoryMap[catName] = {};
      }
      if (!categoryMap[catName][subBrandName]) {
        categoryMap[catName][subBrandName] = {};
      }
      if (!categoryMap[catName][subBrandName][skuName]) {
        categoryMap[catName][subBrandName][skuName] = 0;
      }
      categoryMap[catName][subBrandName][skuName] += sales;
    });

    return Object.entries(categoryMap).map(([brandName, subMap]) => {
      let catTotalSales = 0;
      const skuNamesSet = new Set<string>();

      const subBrands = Object.entries(subMap).map(([subBrandName, skuMap]) => {
        let subTotalSales = 0;
        const skus = Object.entries(skuMap).map(([skuName, totalSales]) => {
          catTotalSales += totalSales;
          subTotalSales += totalSales;
          skuNamesSet.add(skuName);
          return { skuName, totalSales };
        });

        return {
          subBrandName,
          totalSales: subTotalSales,
          skus: skus.sort((a, b) => b.totalSales - a.totalSales)
        };
      });

      return {
        brandName,
        totalSales: catTotalSales,
        skuCount: skuNamesSet.size,
        subBrands: subBrands.sort((a, b) => b.totalSales - a.totalSales)
      };
    });
  }, [records]);

  // Overall calculations for metrics card
  const metrics = useMemo(() => {
    const grandTotalSales = records.reduce((sum, r) => sum + (r.ttl_sales || 0), 0);

    // Find top brand
    let topBrandName = '-';
    let topBrandSales = 0;
    aggregatedData.forEach(b => {
      if (b.totalSales > topBrandSales) {
        topBrandSales = b.totalSales;
        topBrandName = b.brandName;
      }
    });

    // Find top SKU across all records
    const skusMap: Record<string, number> = {};
    records.forEach(r => {
      const skuName = (r.product || '').trim();
      const sales = r.ttl_sales || 0;
      if (skuName) {
        skusMap[skuName] = (skusMap[skuName] || 0) + sales;
      }
    });

    let topSkuName = '-';
    let topSkuSales = 0;
    Object.entries(skusMap).forEach(([skuName, sales]) => {
      if (sales > topSkuSales) {
        topSkuSales = sales;
        topSkuName = skuName;
      }
    });

    const topBrandPct = grandTotalSales > 0 ? (topBrandSales / grandTotalSales) * 100 : 0;
    const topSkuPct = grandTotalSales > 0 ? (topSkuSales / grandTotalSales) * 100 : 0;

    return {
      grandTotalSales,
      topBrandName,
      topBrandSales,
      topBrandPct,
      topSkuName,
      topSkuSales,
      topSkuPct
    };
  }, [aggregatedData, records]);

  // Filter and sort the brand data
  const processedData = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase().trim();

    if (!lowerQuery) {
      return [...aggregatedData].sort((a, b) => {
        let comparison = 0;
        if (sortField === 'customOrder') {
          comparison = getBrandSortIndex(a.brandName) - getBrandSortIndex(b.brandName);
          if (comparison === 0) {
            comparison = a.brandName.localeCompare(b.brandName);
          }
        } else if (sortField === 'brandName') {
          comparison = a.brandName.localeCompare(b.brandName);
        } else if (sortField === 'skuCount') {
          comparison = a.skuCount - b.skuCount;
        } else if (sortField === 'totalSales') {
          comparison = a.totalSales - b.totalSales;
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    const filtered = aggregatedData.map(brand => {
      const brandMatches = brand.brandName.toLowerCase().includes(lowerQuery);
      
      const filteredSubBrands = brand.subBrands.map(sub => {
        const subMatches = sub.subBrandName.toLowerCase().includes(lowerQuery);
        const filteredSKUs = sub.skus.filter(sku => 
          sku.skuName.toLowerCase().includes(lowerQuery)
        );

        if (subMatches || filteredSKUs.length > 0) {
          return {
            ...sub,
            skus: subMatches ? sub.skus : filteredSKUs
          };
        }
        return null;
      }).filter((s): s is NonNullable<typeof s> => s !== null);

      if (brandMatches || filteredSubBrands.length > 0) {
        const uniqueSkus = new Set<string>();
        filteredSubBrands.forEach(s => s.skus.forEach(sku => uniqueSkus.add(sku.skuName)));

        return {
          ...brand,
          subBrands: brandMatches ? brand.subBrands : filteredSubBrands,
          skuCount: brandMatches ? brand.skuCount : uniqueSkus.size
        };
      }
      return null;
    }).filter((b): b is NonNullable<typeof b> => b !== null);

    return filtered.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'customOrder') {
        comparison = getBrandSortIndex(a.brandName) - getBrandSortIndex(b.brandName);
        if (comparison === 0) {
          comparison = a.brandName.localeCompare(b.brandName);
        }
      } else if (sortField === 'brandName') {
        comparison = a.brandName.localeCompare(b.brandName);
      } else if (sortField === 'skuCount') {
        comparison = a.skuCount - b.skuCount;
      } else if (sortField === 'totalSales') {
        comparison = a.totalSales - b.totalSales;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [aggregatedData, searchQuery, sortField, sortOrder]);

  const toggleExpand = (brandName: string) => {
    setExpandedBrands(prev => ({
      ...prev,
      [brandName]: !prev[brandName]
    }));
  };

  const toggleSubExpand = (subKey: string) => {
    setExpandedSubBrands(prev => ({
      ...prev,
      [subKey]: !prev[subKey]
    }));
  };

  const expandAll = () => {
    const nextState: Record<string, boolean> = {};
    const nextSubState: Record<string, boolean> = {};
    processedData.forEach(b => {
      nextState[b.brandName] = true;
      b.subBrands.forEach(s => {
        nextSubState[`${b.brandName}-${s.subBrandName}`] = true;
      });
    });
    setExpandedBrands(nextState);
    setExpandedSubBrands(nextSubState);
  };

  const collapseAll = () => {
    setExpandedBrands({});
    setExpandedSubBrands({});
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'customOrder' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Sales aggregate */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-2xl">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Penjualan Brand</p>
            <p className="text-xl font-bold font-sans text-slate-800 mt-1">
              {formatCurrency(metrics.grandTotalSales)}
            </p>
          </div>
        </div>

        {/* Top Brand Contributor */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Brand Terlaris</p>
            <p className="text-sm font-extrabold text-slate-800 break-words mt-1" title={metrics.topBrandName}>
              {metrics.topBrandName}
            </p>
            <p className="text-xs text-indigo-650 font-mono mt-0.5">
              {formatCurrency(metrics.topBrandSales)} <span className="text-[10px] text-slate-400 font-sans">({metrics.topBrandPct.toFixed(1)}%)</span>
            </p>
          </div>
        </div>

        {/* Top SKU Contributor */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl">
            <Flame className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">SKU Produk Terlaris</p>
            <p className="text-sm font-extrabold text-slate-800 break-words mt-1" title={metrics.topSkuName}>
              {metrics.topSkuName}
            </p>
            <p className="text-xs text-rose-650 font-mono mt-0.5">
              {formatCurrency(metrics.topSkuSales)} <span className="text-[10px] text-slate-400 font-sans">({metrics.topSkuPct.toFixed(1)}%)</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-xs overflow-hidden">
        {/* Header & Title */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Brand Information</h2>
              <p className="text-xs text-slate-400">Distribusi omset total per kategori brand, sub-brand, dan produk SKU</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={expandAll}
              className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-100 rounded-xl transition-all"
            >
              Expand All
            </button>
            <button 
              onClick={collapseAll}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-xl transition-all"
            >
              Collapse All
            </button>
          </div>
        </div>

        {/* Action Controls & Search */}
        <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Cari Brand, Sub-brand, atau SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
            />
          </div>

          <div className="text-[11px] text-slate-400 font-mono ml-auto">
            Menampilkan <span className="font-bold text-slate-600">{processedData.length}</span> Kategori Brand
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 uppercase text-[10px] tracking-wider font-bold border-b border-slate-100">
                <th className="w-12 p-4 text-center">Detail</th>
                <th 
                  onClick={() => handleSort('brandName')}
                  className="p-4 text-left cursor-pointer hover:text-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    Nama Kategori Brand (CAT)
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('skuCount')}
                  className="p-4 text-center cursor-pointer hover:text-slate-700 transition-colors w-32"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    Jumlah SKU
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('totalSales')}
                  className="p-4 text-right cursor-pointer hover:text-slate-700 transition-colors w-44"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Total Sales (Omset)
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <Tag className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-slate-700 text-sm">Tidak Ada Kategori Brand Ditemukan</p>
                      <p className="text-xs text-slate-400">Coba kata kunci pencarian lain atau pastikan data transaksi telah diunggah.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                processedData.map((brand) => {
                  const isExpanded = !!expandedBrands[brand.brandName];
                  return (
                    <React.Fragment key={brand.brandName}>
                      {/* Brand Category Row */}
                      <tr 
                        className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-slate-50/30' : ''
                        }`}
                        onClick={() => toggleExpand(brand.brandName)}
                      >
                        <td className="p-4 text-center">
                          <button 
                            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(brand.brandName);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          <span className="font-extrabold text-slate-800 text-xs sm:text-sm block">
                            {brand.brandName}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 font-mono text-[11px] font-bold rounded-lg">
                            {brand.skuCount} SKU
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <span className="font-mono font-extrabold text-slate-900 text-xs sm:text-sm">
                            {formatCurrency(brand.totalSales)}
                          </span>
                        </td>
                      </tr>

                      {/* Nested Expanded Sub-Brands & SKUs Table */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={4} className="p-0 bg-slate-50/40">
                            <div className="px-6 py-4 border-l-4 border-indigo-500 bg-slate-50/80 animate-fade-in animate-duration-150 space-y-4">
                              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                                Daftar Sub-Brand & Produk - {brand.brandName}
                              </div>

                              <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-500 border-b border-slate-200 text-[10px] uppercase font-bold tracking-wider">
                                      <th className="w-10 p-2.5 text-center">Detail</th>
                                      <th className="p-2.5 text-left pl-4">Sub-Brand</th>
                                      <th className="p-2.5 text-center w-32">Banyak SKU</th>
                                      <th className="p-2.5 text-right pr-6 w-44">Sub-Brand Sales</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {brand.subBrands.length === 0 ? (
                                      <tr>
                                        <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                                          Tidak ada sub-brand terdeteksi
                                        </td>
                                      </tr>
                                    ) : (
                                      brand.subBrands.map((sub) => {
                                        const subKey = `${brand.brandName}-${sub.subBrandName}`;
                                        const isSubExpanded = !!expandedSubBrands[subKey];
                                        return (
                                          <React.Fragment key={sub.subBrandName}>
                                            {/* Sub-Brand Row */}
                                            <tr 
                                              className={`hover:bg-indigo-50/20 transition-colors cursor-pointer ${
                                                isSubExpanded ? 'bg-indigo-50/10' : ''
                                              }`}
                                              onClick={() => toggleSubExpand(subKey)}
                                            >
                                              <td className="p-2.5 text-center">
                                                <button 
                                                  className="p-1 rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSubExpand(subKey);
                                                  }}
                                                >
                                                  {isSubExpanded ? (
                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                  ) : (
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                  )}
                                                </button>
                                              </td>
                                              <td className="p-2.5 pl-4 font-bold text-slate-700">
                                                {sub.subBrandName}
                                              </td>
                                              <td className="p-2.5 text-center">
                                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 font-mono text-[10px] rounded">
                                                  {sub.skus.length} SKU
                                                </span>
                                              </td>
                                              <td className="p-2.5 pr-6 text-right font-mono font-bold text-indigo-600">
                                                {formatCurrency(sub.totalSales)}
                                              </td>
                                            </tr>

                                            {/* Nested Physical SKUs inside Sub Brand */}
                                            {isSubExpanded && (
                                              <tr>
                                                <td colSpan={4} className="p-0 bg-slate-50/50">
                                                  <div className="pl-12 pr-6 py-2 bg-slate-50/30">
                                                    <table className="w-full text-[11px] divide-y divide-slate-100 border border-slate-150 bg-white rounded-xl overflow-hidden shadow-2xs">
                                                      <thead>
                                                        <tr className="bg-slate-100 text-slate-400 text-[9px] uppercase font-bold tracking-wider">
                                                          <th className="p-2 pl-4 text-left">Nama SKU Fisik / Varian Produk</th>
                                                          <th className="p-2 pr-4 text-right w-44">Omset Penjualan</th>
                                                        </tr>
                                                      </thead>
                                                      <tbody className="divide-y divide-slate-100">
                                                        {sub.skus.map((sku) => (
                                                          <tr key={sku.skuName} className="hover:bg-slate-50 transition-colors">
                                                            <td className="p-2 pl-4 text-slate-500 font-medium">
                                                              {sku.skuName}
                                                            </td>
                                                            <td className="p-2 pr-4 text-right font-mono font-semibold text-slate-700">
                                                              {formatCurrency(sku.totalSales)}
                                                            </td>
                                                          </tr>
                                                        ))}
                                                      </tbody>
                                                    </table>
                                                  </div>
                                                </td>
                                              </tr>
                                            )}
                                          </React.Fragment>
                                        );
                                      })
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
