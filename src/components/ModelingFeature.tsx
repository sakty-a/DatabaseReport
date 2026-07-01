/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, Area, ReferenceLine
} from 'recharts';
import {
  TrendingUp, TrendingDown, HelpCircle, AlertTriangle, Cpu, CheckCircle2,
  Sliders, Calendar, ArrowRight, Sparkles, BarChart2, Info, ChevronRight, ChevronLeft,
  Layers, Award, ShieldAlert, DollarSign, Lightbulb, BookOpen, Store, FileDown
} from 'lucide-react';
import { SalesRecord, MonthlyTrend } from '../types';
import { calculateMonthlyTrends, formatCurrency } from '../utils';
import { CASH_BACK_PARTICIPANTS, WHITE_BONUS_PARTICIPANTS, TOUR_BELGIA_PARTICIPANTS, TOUR_MALAYSIA_PARTICIPANTS } from './programParticipants';
import { classifyRecord } from './BrandInformation';

interface ModelingFeatureProps {
  records: SalesRecord[];
}

type ExtrapolateType = 'mom_delta' | 'cagr' | 'simple_avg';

// Helper to check if a month is the end of a 4-month cashback cycle (April, August, December)
const isClosingMonthOfCBPorgram = (monthLabel: string): boolean => {
  const clean = monthLabel.trim().toLowerCase();
  return clean.includes('apr') || clean.includes('aug') || clean.includes('agt') || clean.includes('dec') || clean.includes('des');
};

// High-fidelity preloaded 2026 targets per month per brand (from user-provided targets sheets)
export const DEFAULT_2026_BRAND_TARGETS: Record<string, Record<string, number>> = {
  'ALL': {
    "Jan '26": 8480732543,
    "Feb '26": 8980154540,
    "Mar '26": 10709154012,
    "Apr '26": 9025003057,
    "May '26": 10155753759,
    "Jun '26": 10425969430,
    "Jul '26": 12463529360,
    "Aug '26": 13829826074,
    "Sep '26": 11207003821,
    "Oct '26": 10784844498,
    "Nov '26": 11546523799,
    "Dec '26": 11400962934
  },
  'ACNES': {
    "Jan '26": 1134539513,
    "Feb '26": 1229418957,
    "Mar '26": 1410602013,
    "Apr '26": 1220701559,
    "May '26": 1339718141,
    "Jun '26": 1327047913,
    "Jul '26": 1745803572,
    "Aug '26": 1663637889,
    "Sep '26": 1567968129,
    "Oct '26": 1532045622,
    "Nov '26": 1596832702,
    "Dec '26": 1437499393
  },
  'HADA LABO': {
    "Jan '26": 2855230898,
    "Feb '26": 3097804972,
    "Mar '26": 3546998868,
    "Apr '26": 3073875763,
    "May '26": 3369035424,
    "Jun '26": 3330545728,
    "Jul '26": 4404175589,
    "Aug '26": 4161557420,
    "Sep '26": 3955309930,
    "Oct '26": 3867685831,
    "Nov '26": 4025712421,
    "Dec '26": 3605809966
  },
  'KHALISA': {
    "Jan '26": 1296778,
    "Feb '26": 1406950,
    "Mar '26": 1610961,
    "Apr '26": 1396081,
    "May '26": 1530135,
    "Jun '26": 1512652,
    "Jul '26": 2000274,
    "Aug '26": 1890073,
    "Sep '26": 1796409,
    "Oct '26": 1756613,
    "Nov '26": 1828384,
    "Dec '26": 1637670
  },
  'LIP ICE': {
    "Jan '26": 167590383,
    "Feb '26": 181828613,
    "Mar '26": 208194239,
    "Apr '26": 180424002,
    "May '26": 197748526,
    "Jun '26": 195489124,
    "Jul '26": 258507450,
    "Aug '26": 244265591,
    "Sep '26": 232160828,
    "Oct '26": 227017742,
    "Nov '26": 236293094,
    "Dec '26": 211645922
  },
  'MELANO CC': {
    "Jan '26": 14144790,
    "Feb '26": 15346510,
    "Mar '26": 17571795,
    "Apr '26": 15227960,
    "May '26": 16690166,
    "Jun '26": 16499471,
    "Jul '26": 21818278,
    "Aug '26": 20616251,
    "Sep '26": 19594598,
    "Oct '26": 19160516,
    "Nov '26": 19943365,
    "Dec '26": 17863120
  },
  'MENTHOLATUM': {
    "Jan '26": 3694980,
    "Feb '26": 4008900,
    "Mar '26": 4590201,
    "Apr '26": 3977932,
    "May '26": 4359897,
    "Jun '26": 4310083,
    "Jul '26": 5699491,
    "Aug '26": 5385491,
    "Sep '26": 5118609,
    "Oct '26": 5005216,
    "Nov '26": 5209716,
    "Dec '26": 4666303
  },
  'OXY': {
    "Jan '26": 2891176,
    "Feb '26": 3136806,
    "Mar '26": 3591651,
    "Apr '26": 3112575,
    "May '26": 3411448,
    "Jun '26": 3372470,
    "Jul '26": 4459627,
    "Aug '26": 4213934,
    "Sep '26": 4005110,
    "Oct '26": 3916384,
    "Nov '26": 4076397,
    "Dec '26": 3651198
  },
  'ROHTO EYE CARE': {
    "Jan '26": 1185150271,
    "Feb '26": 1113069642,
    "Mar '26": 1608031716,
    "Apr '26": 1193727921,
    "May '26": 1514777997,
    "Jun '26": 1799306437,
    "Jul '26": 1345181899,
    "Aug '26": 2875343492,
    "Sep '26": 1218116799,
    "Oct '26": 1055930712,
    "Nov '26": 1349948521,
    "Dec '26": 2036559456
  },
  'ROHTO EYE FLUSH': {
    "Jan '26": 68781700,
    "Feb '26": 63848930,
    "Mar '26": 93913018,
    "Apr '26": 68923023,
    "May '26": 88416229,
    "Jun '26": 106233406,
    "Jul '26": 75974468,
    "Aug '26": 171854138,
    "Sep '26": 68900777,
    "Oct '26": 58898646,
    "Nov '26": 76953260,
    "Dec '26": 120536251
  },
  'SELSUN': {
    "Jan '26": 1917636972,
    "Feb '26": 2044525164,
    "Mar '26": 2410552174,
    "Apr '26": 2047346038,
    "May '26": 2286985382,
    "Jun '26": 2323803617,
    "Jul '26": 2857235473,
    "Aug '26": 3034397033,
    "Sep '26": 2568269571,
    "Oct '26": 2483035181,
    "Nov '26": 2636806083,
    "Dec '26": 2534327495
  },
  'SKIN AQUA': {
    "Jan '26": 1118591691,
    "Feb '26": 1213625579,
    "Mar '26": 1389604469,
    "Apr '26": 1204250419,
    "May '26": 1319883955,
    "Jun '26": 1304803444,
    "Jul '26": 1725422905,
    "Aug '26": 1630364795,
    "Sep '26": 1549570853,
    "Oct '26": 1515243027,
    "Nov '26": 1577151899,
    "Dec '26": 1412642924
  },
  'SUNPLAY': {
    "Jan '26": 11183391,
    "Feb '26": 12133515,
    "Mar '26": 13892906,
    "Apr '26": 12039784,
    "May '26": 13195859,
    "Jun '26": 13045088,
    "Jul '26": 17250332,
    "Aug '26": 16299966,
    "Sep '26": 15492209,
    "Oct '26": 15149008,
    "Nov '26": 15767957,
    "Dec '26": 14123239
  }
};

// Historical 2025 targets and sales data at the consolidatory top-level (to adjust forecasting & simulation)
export const HISTORICAL_2025_ALL_DATA = [
  { month: "Jan '25", target: 7843825312, sales: 7212970531 },
  { month: "Feb '25", target: 7222193391, sales: 7309728975 },
  { month: "Mar '25", target: 8821393356, sales: 7820010990 },
  { month: "Apr '25", target: 7841238538, sales: 8470750566 },
  { month: "May '25", target: 8253935303, sales: 8138971024 },
  { month: "Jun '25", target: 8666632069, sales: 8205440331 },
  { month: "Jul '25", target: 9079328834, sales: 8592590000 },
  { month: "Aug '25", target: 9130915929, sales: 7531854903 },
  { month: "Sep '25", target: 9543612695, sales: 10023275463 },
  { month: "Oct '25", target: 8976154642, sales: 7837958254 },
  { month: "Nov '25", target: 9182503025, sales: 8203839660 },
  { month: "Dec '25", target: 9007757979, sales: 6783208395 },
];

// Helper to generate comprehensive brand-specific takeaways for ReportKuy Consult standard
const getExecutiveTakeawayForBrand = (brand: string): { title: string; strategy: string } => {
  const cleanBrand = brand.trim().toUpperCase();
  switch (cleanBrand) {
    case 'ALL':
      return {
        title: "Optimasi Konsolidasi Portofolio Rohto",
        strategy: "Secara agregat, pola lonjakan volume penjualan pada bulan-bulan penutupan (April, Agustus, Desember) didominasi oleh pergerakan outlet yang gencar melakukan penimbunan inventori (closing push) murni untuk memenuhi target penutupan program cashback serta mengamankan perolehan insentif white bonus mereka. Sales force harus fokus menyelaraskan kelayakan stok di sub-distributor luar Jawa 3 minggu sebelum tutup buku guna mengantisipasi kegagalan serah terima fisik produk."
      };
    case 'SKIN AQUA':
      return {
        title: "Akselerasi Kuadran 'Stars' Skin Aqua",
        strategy: "Skin Aqua berpijak sebagai motor pertumbuhan dinamis dengan CAGR paling impresif. Perilaku outlet memperlihatkan urgensi luar biasa dalam mengunci limit target cashback serta mengamankan insentif white bonus kosmetik protektif ini. Rekomendasi taktis: Naikkan plafon batas kredit (credit limit) outlet ritel terverifikasi sebesar 20% sejak awal Bulan ke-4 siklus agar penyerapan stok massal tidak terganjal kendala finansial."
      };
    case 'ACNES':
      return {
        title: "Defense Strategy & Loyalitas Gerai Acnes",
        strategy: "Kategori legendaris Acnes bertindak sebagai stabilisator arus kas (Cash Cow). Saluran ritel memperlihatkan keterndungan konsisten pada target cashback volume-based dan stimulus white bonus berhadiah display kit. Sales force disarankan meluncurkan promo silang (cross-bundling) Acnes bersama sub-brand dengan kontribusi kecil guna mengatrol penjualan kategori minor secara instan."
      };
    case 'HADA LABO':
      return {
        title: "Pemberdayaan Margin Premium Hada Labo",
        strategy: "Hada Labo memegang peran krusial dalam pertumbuhan margin kontribusi premium. Lonjakan akhir siklus didominasi oleh ritel kosmetik modern yang menyelaraskan posisi stok untuk menyeggel target cashback yang menantang. Tingkatkan dorongan jaminan sell-out melalui program white bonus inovatif berhadiah mini-sample eksklusif guna mengamankan perputaran produk di tingkat konsumen akhir."
      };
    case 'SELSUN':
      return {
        title: "Dominasi Ceruk & Presisi Suplai Selsun",
        strategy: "Selsun memiliki karakter permintaan yang inelastic namun sangat sensitif terhadap kekosongan stok di Bulan ke-4 CBP. Dikarenakan tidak adanya skema tier berjenjang yang rumit, melainkan murni fokus menutup target cashback dan mengejar white bonus shampoo anti-dandruff ini, jadwalkan pengiriman prioritas rute logistik dari pabrik 2 minggu sebelum periode tutup guna meredam potensi lost-sales massal."
      };
    case 'ROHTO EYE CARE':
      return {
        title: "Optimasi Penetrasi Rohto Eye Care",
        strategy: "Kategori obat tetes mata Rohto berada pada tingkat maturitas tinggi dengan pangsa pasar mutlak. Outlet dan apotek modern berfokus secara ketat pada pemenuhan target cashback kuartalan. Pasang skema white bonus berupa display dispenser material di area strategis dekat kasir (point of sale) di Bulan ke-3 untuk merangsang sirkulasi sell-out lebih awal."
      };
    case 'MELANO CC':
      return {
        title: "Kapitalisasi Pertumbuhan Melano CC",
        strategy: "Melano CC berada pada kuadran Question Mark dengan pertumbuhan menjanjikan namun kontribusi volume masih minor. Insentif target cashback dan white bonus perlu diajukan secara fleksibel dengan nominal yang bersahabat bagi outlet ritel menengah guna memperluas 'brand trial' dan menumbuhkan jejaring kemitraan baru."
      };
    case 'OXY':
      return {
        title: "Re-Aktivasi Pangsa Pasar Maskulin OXY",
        strategy: "Kategori perawatan pria OXY memerlukan revitalisasi channel distribusi. Outlet cenderung pasif dan hanya berbelanja untuk mengamankan target cashback minimal. Tawarkan insentif white bonus instan (seperti bonus stok produk fast-moving lainnya) 30 hari sebelum periode tutup siklus berakhir guna menyulut keaktifan repeat order retail."
      };
    default:
      return {
        title: `Strategi Taktis Portofolio ${brand}`,
        strategy: `Analisis pergerakan volume bulanan brand ${brand} menunjukkan fluktuasi akhir periode yang kencang. Ritel sangat berfokus mengamankan target cashback kumulatif serta mengejar insentif white bonus yang ditawarkan produsen. Penyesuaian distribusi logistik preventif 14 hari sebelum tutup program wajib dijalankan untuk menampung lonjakan pesanan ritel.`
      };
  }
};

export default function ModelingFeature({ records }: ModelingFeatureProps) {
  // Brand specific selection
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [targetViewFormat, setTargetViewFormat] = useState<'full' | 'millions'>('millions');

  const formatTargetVal = (val: number) => {
    if (targetViewFormat === 'millions') {
      const millionVal = val / 1000000;
      const formattedNum = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }).format(millionVal);
      return `Rp ${formattedNum} Jt`;
    }
    return formatCurrency(val);
  };

  // Projection options
  const [monthsToProject, setMonthsToProject] = useState<number>(3);
  const [extrapolateMethod, setExtrapolateMethod] = useState<ExtrapolateType>('mom_delta');
  const [manualAdjustment, setManualAdjustment] = useState<number>(0); // manual optimism multiplier -50% to +50%
  const [applyCBProgramSurge, setApplyCBProgramSurge] = useState<boolean>(true);
  const [activeTabName, setActiveTabName] = useState<'forecasting' | 'sku_outlets' | 'consulting_deck'>('forecasting');
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);

  // SKU & Outlets mapping states
  const [skuSearchQuery, setSkuSearchQuery] = useState<string>('');
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  const [skuCurrentPage, setSkuCurrentPage] = useState<number>(1);

  // Reset page and expanded SKU when active brand changes
  useEffect(() => {
    setSkuCurrentPage(1);
    setExpandedSku(null);
  }, [selectedBrand]);

  // Load saved monthly targets from localStorage
  const [monthlyTargets, setMonthlyTargets] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('reportkuy_modeling_targets_v2');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [editingTargetMonth, setEditingTargetMonth] = useState<string | null>(null);
  const [tempTargetVal, setTempTargetVal] = useState<string>('');

  // Load and merge all outlet names/usernames (Custom SPG Aliases + Program Participants + Records Metadata)
  const outletNamesMap = useMemo(() => {
    const map: Record<string, string> = {};

    // 1. Load standard participants and tour lists
    CASH_BACK_PARTICIPANTS.forEach(p => {
      if (p.code) map[p.code.trim().toUpperCase()] = p.name;
    });
    WHITE_BONUS_PARTICIPANTS.forEach(p => {
      if (p.code) map[p.code.trim().toUpperCase()] = p.name;
    });
    TOUR_BELGIA_PARTICIPANTS.forEach(p => {
      if (p.code) map[p.code.trim().toUpperCase()] = p.name;
    });
    TOUR_MALAYSIA_PARTICIPANTS.forEach(p => {
      if (p.code) map[p.code.trim().toUpperCase()] = p.name;
    });

    // 2. Scan records customFields for any custom name fields dynamically imported
    records.forEach(r => {
      const cId = (r.customer_id || '').trim().toUpperCase();
      if (!cId) return;

      if (!map[cId] || map[cId] === 'GUEST') {
        if (r.customFields) {
          // Prioritize exact/prefix check for 'cust_nm' / 'custnm'
          let nameKey = Object.keys(r.customFields).find(k => {
            const kl = k.toLowerCase().replace(/_/g, '').replace(/[\s-]/g, '');
            return [
              'custnm', 'nama', 'name', 'clientname', 'customername', 'namaoutlet', 
              'namatoko', 'outletname', 'outlet', 'toko', 'storename', 'storeusername', 
              'username', 'namapelanggan', 'store', 'namastore'
            ].includes(kl);
          });
          
          if (!nameKey) {
            nameKey = Object.keys(r.customFields).find(k => {
              const kl = k.toLowerCase().replace(/_/g, '').replace(/[\s-]/g, '');
              return (kl.includes('name') || kl.includes('nama') || kl.includes('customer') || 
                      kl.includes('client') || kl.includes('pelanggan') || kl.includes('buyer') || 
                      kl.includes('outlet') || kl.includes('toko') || kl.includes('store') ||
                      kl.includes('custnm')) && 
                     !kl.includes('id') && !kl.includes('code');
            });
          }

          if (nameKey && r.customFields[nameKey]) {
            const valStr = String(r.customFields[nameKey]).trim();
            if (valStr && valStr.toUpperCase() !== cId) {
              map[cId] = valStr;
            }
          }
        }
      }
    });

    // 3. Load custom user SPG aliases from localStorage to override/supplement
    try {
      const saved = localStorage.getItem('sales_report_spg_outlets');
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          list.forEach((o: any) => {
            if (o.custValue) {
              map[o.custValue.trim().toUpperCase()] = o.aliasName;
            }
            if (o.id) {
              map[o.id.trim().toUpperCase()] = o.aliasName;
            }
          });
        }
      }
    } catch (e) {
      console.error('Error reading custom aliases:', e);
    }

    return map;
  }, [records]);

  const handleSaveTarget = (month: string, val: string) => {
    const numeric = parseFloat(val.replace(/[^0-9.-]+/g, ''));
    const finalVal = isNaN(numeric) || numeric < 0 ? 0 : Math.round(numeric);
    
    const targetKey = `${selectedBrand}_${month}`;
    const updated = {
      ...monthlyTargets,
      [targetKey]: finalVal
    };
    setMonthlyTargets(updated);
    localStorage.setItem('reportkuy_modeling_targets_v2', JSON.stringify(updated));
    setEditingTargetMonth(null);
  };

  // Filter records by brand if selected using unified classification matching to guarantee parity with BrandInformation
  const filteredRecords = useMemo(() => {
    if (selectedBrand === 'ALL') return records;
    return records.filter(r => {
      const { catName, subBrandName } = classifyRecord(r.group_name || '', r.product || '');
      const targetBrand = selectedBrand.trim().toUpperCase();
      
      if (targetBrand === 'ACNES') return catName.toUpperCase() === 'ACNES';
      if (targetBrand === 'HADA LABO') return catName.toUpperCase() === 'HADA LABO';
      if (targetBrand === 'KHALISA') return catName.toUpperCase() === 'KHALISA';
      if (targetBrand === 'LIP ICE') return catName.toUpperCase() === 'LIP ICE';
      if (targetBrand === 'MELANO CC') return catName.toUpperCase() === 'MELANO CC';
      if (targetBrand === 'SELSUN') return catName.toUpperCase() === 'SELSUN';
      if (targetBrand === 'ROHTO EYE CARE') return catName.toUpperCase() === 'EYE CARE';
      if (targetBrand === 'ROHTO EYE FLUSH') return catName.toUpperCase() === 'EYE WASH';
      if (targetBrand === 'SKIN AQUA') return catName.toUpperCase() === 'SKIN AQUA DAN SUNPLAY' && subBrandName.toUpperCase() === 'SKIN AQUA';
      if (targetBrand === 'SUNPLAY') return catName.toUpperCase() === 'SKIN AQUA DAN SUNPLAY' && subBrandName.toUpperCase() === 'SUNPLAY';
      if (targetBrand === 'OXY') return subBrandName.toUpperCase() === 'OXY';
      if (targetBrand === 'MENTHOLATUM') return subBrandName.toUpperCase() === 'MENTHOLATUM';
      
      return r.group_name?.trim().toUpperCase() === targetBrand;
    });
  }, [records, selectedBrand]);

  const skuOutletList = useMemo(() => {
    if (!filteredRecords || filteredRecords.length === 0) return [];

    const grouped: Record<string, { 
      product: string; 
      brand: string; 
      totalQty: number; 
      totalRevenue: number;
      outletsMap: Record<string, { qty: number; revenue: number }> 
    }> = {};

    filteredRecords.forEach(r => {
      const prodName = r.product?.trim() || 'Unknown SKU';
      if (!grouped[prodName]) {
        const { catName, subBrandName } = classifyRecord(r.group_name || '', r.product || '');
        const displayBrand = (catName === 'Other' || catName === 'Skin Aqua dan Sunplay') ? subBrandName : catName;
        grouped[prodName] = {
          product: prodName,
          brand: displayBrand.toUpperCase(),
          totalQty: 0,
          totalRevenue: 0,
          outletsMap: {}
        };
      }
      const qty = r.quantity || 0;
      const rev = r.ttl_sales || 0;
      
      grouped[prodName].totalQty += qty;
      grouped[prodName].totalRevenue += rev;

      const outletId = (r.customer_id || 'UMUM/GUEST').trim();
      if (!grouped[prodName].outletsMap[outletId]) {
        grouped[prodName].outletsMap[outletId] = { qty: 0, revenue: 0 };
      }
      grouped[prodName].outletsMap[outletId].qty += qty;
      grouped[prodName].outletsMap[outletId].revenue += rev;
    });

    return Object.values(grouped).map(item => {
      // transform outlets map to sorted array
      const outletsArray = Object.entries(item.outletsMap).map(([id, stats]) => {
        const percentage = item.totalQty > 0 ? (stats.qty / item.totalQty) * 100 : 0;
        let resolvedName = outletNamesMap[id.toUpperCase()] || '';
        if (!resolvedName) {
          const upperId = id.toUpperCase();
          if (upperId === 'GUEST' || upperId === 'UMUM/GUEST' || upperId === 'UMUM' || upperId.includes('GUEST')) {
            resolvedName = 'Pelanggan Umum';
          } else {
            resolvedName = `Toko ${id}`;
          }
        }
        return {
          outletId: id,
          outletName: resolvedName,
          quantitySold: stats.qty,
          revenue: stats.revenue,
          percentage
        };
      }).sort((a, b) => b.quantitySold - a.quantitySold);

      // Best performing outlet
      const topOutlet = outletsArray[0] || { outletId: 'N/A', outletName: '', quantitySold: 0, percentage: 0 };

      return {
        product: item.product,
        brand: item.brand,
        totalSold: item.totalQty,
        totalRevenue: item.totalRevenue,
        outlets: outletsArray,
        topOutlet,
        outletsCount: outletsArray.length
      };
    }).sort((a, b) => b.totalSold - a.totalSold);
  }, [filteredRecords, outletNamesMap]);

  // Compute aggregated overview statistics for the SKU & Outlets list
  const skuOutletMetrics = useMemo(() => {
    if (skuOutletList.length === 0) {
      return { totalVolume: 0, totalRevenue: 0, topSellsSku: 'N/A', avgOutlets: 0 };
    }
    const totalVolume = skuOutletList.reduce((sum, item) => sum + item.totalSold, 0);
    const totalRevenue = skuOutletList.reduce((sum, item) => sum + item.totalRevenue, 0);
    const topSellsSku = skuOutletList[0]?.product || 'N/A';
    const totalOutletsSum = skuOutletList.reduce((sum, item) => sum + item.outletsCount, 0);
    const avgOutlets = parseFloat((totalOutletsSum / skuOutletList.length).toFixed(1));

    return {
      totalVolume,
      totalRevenue,
      topSellsSku,
      avgOutlets
    };
  }, [skuOutletList]);

  // Filtered list of SKUs based on search query
  const filteredSkus = useMemo(() => {
    return skuOutletList.filter(sku => {
      if (!skuSearchQuery.trim()) return true;
      return sku.product.toLowerCase().includes(skuSearchQuery.toLowerCase());
    });
  }, [skuOutletList, skuSearchQuery]);

  const ITEMS_PER_PAGE = 8;

  // Paginated list of SKUs
  const paginatedSkus = useMemo(() => {
    const start = (skuCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredSkus.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSkus, skuCurrentPage]);

  const totalSkuPages = Math.ceil(filteredSkus.length / ITEMS_PER_PAGE);

  // Prepare monthly historical aggregated data with a robust 17-month scope (including entire 2025 history)
  const historicalTrends = useMemo(() => {
    // calculateMonthlyTrends returns MonthlyTrend[] (sorted chronologically) for current 2026 sales
    const trends2026 = calculateMonthlyTrends(filteredRecords);

    // Calculate brand contribution structure ratio to scale the 2025 history dynamically
    const brandRatioVal = selectedBrand === 'ALL' ? 1.0 : (() => {
      const brandTotal = Object.values(DEFAULT_2026_BRAND_TARGETS[selectedBrand] || {}).reduce((a: number, b: number) => a + b, 0);
      const allTotal = Object.values(DEFAULT_2026_BRAND_TARGETS['ALL'] || {}).reduce((a: number, b: number) => a + b, 0);
      return allTotal > 0 ? (brandTotal / allTotal) : 0.15;
    })();

    // Construct high-fidelity raw historical trends from MBS 2025 scaled by brand contribution
    const trends2025: MonthlyTrend[] = HISTORICAL_2025_ALL_DATA.map((d) => {
      const estimatedRevenue = Math.round(d.sales * brandRatioVal);
      const estimatedUnits = Math.round((d.sales / 50000) * brandRatioVal); // assume 50k IDR avg unit price
      const estimatedTransactions = Math.max(1, Math.round(15 * brandRatioVal));

      return {
        month: d.month,
        revenue: estimatedRevenue,
        units: estimatedUnits,
        transactions: estimatedTransactions
      };
    });

    // Merge full 12 months of 2025 with current 2026 actuals to expand training scope to 17 months!
    return [...trends2025, ...trends2026];
  }, [filteredRecords, selectedBrand]);

  // Perform statistics, Linear Regression, and Extrapolation formulas with 4-Month Cashback Cycle Surge Analysis
  const modelingResults = useMemo(() => {
    const N = historicalTrends.length;
    if (N < 2) {
      // Robust fallback when brand doesn't have sales yet, generating targets for year-round rendering
      const fallbackMonths = [
        "Jan '26", "Feb '26", "Mar '26", "Apr '26", "May '26", "Jun '26", 
        "Jul '26", "Aug '26", "Sep '26", "Oct '26", "Nov '26", "Dec '26"
      ];
      const fallbackChartData = fallbackMonths.map(mName => {
        const targetKey = `${selectedBrand}_${mName}`;
        const targetVal = monthlyTargets[targetKey] !== undefined
          ? monthlyTargets[targetKey]
          : (DEFAULT_2026_BRAND_TARGETS[selectedBrand]?.[mName] || 0);

        return {
          month: mName,
          actual: null,
          linearRegression: null,
          extrapolation: null,
          isForecast: true,
          target: targetVal || null,
          isClosingMonth: isClosingMonthOfCBPorgram(mName)
        };
      });

      return {
        hasEnoughData: false,
        regressionLine: { m: 0, c: 0 },
        rSquared: 0,
        coeffOfVariation: 0,
        historicalAvg: 0,
        chartData: fallbackChartData,
        forecastPoints: [],
        recommendation: `Silakan muat [Pakai Data Sampel] di bar atas atau upload spreadsheet penjualan retail Anda yang mengandung brand ${selectedBrand === 'ALL' ? 'Acnes, Hada Labo, Selsun, dsb.' : selectedBrand} untuk mengaktifkan ramalan otomatis! Target bulanan 2026 tetap ditampilkan untuk monitoring.`,
        confidenceLevel: 'Low' as const,
        bestModelLabel: 'Belum Ada Data Historis Aktif',
        calculatedCagr: 0,
        cbSurgeAnalysis: { multiplier: 1.45, status: 'Tidak ada data', avgClosingRevenue: 0, avgNormalRevenue: 0, closingCount: 0, normalCount: 0 }
      };
    }

    // 1. Map to variables: X (1, 2, ... N) and Y (revenue for each month)
    const xValues = historicalTrends.map((_, i) => i + 1);
    const yValues = historicalTrends.map(t => t.revenue);

    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);

    const meanX = sumX / N;
    const meanY = sumY / N;

    // Linear Regression parameters
    const denominator = N * sumX2 - sumX * sumX;
    let m = 0;
    let c = meanY;

    if (Math.abs(denominator) > 0.00001) {
      m = (N * sumXY - sumX * sumY) / denominator;
      c = (sumY - m * sumX) / N;
    }

    // Calculate Coefficient of Determination (R²)
    // Total Sum of Squares (SStot)
    const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
    // Residual Sum of Squares (SSres)
    const ssRes = yValues.reduce((sum, y, i) => {
      const predictedY = m * xValues[i] + c;
      return sum + Math.pow(y - predictedY, 2);
    }, 0);

    const rSquared = ssTot > 0 ? Math.max(0, Math.min(1, 1 - ssRes / ssTot)) : 0;

    // Calculate Coefficient of Variation (CV) = standard dev / mean
    const variance = ssTot / N;
    const standardDev = Math.sqrt(variance);
    const coeffOfVariation = meanY > 0 ? standardDev / meanY : 0;

    // 2. Compute Extrapolation Baselines
    // MoM Absolute Delta: average absolute monthly difference
    let totalMoMDiff = 0;
    for (let i = 1; i < N; i++) {
      totalMoMDiff += yValues[i] - yValues[i - 1];
    }
    const avgMoMDiff = totalMoMDiff / (N - 1);

    // CAGR (Compound Monthly Growth Rate) helper
    const firstVal = yValues[0];
    const lastVal = yValues[N - 1];
    let calculatedCagr = 0;
    if (firstVal > 0 && lastVal > 0) {
      calculatedCagr = Math.pow(lastVal / firstVal, 1 / (N - 1)) - 1;
      // Cap growth rates at extremes of sanity for basic extrapolations (-30% to +50% MoM)
      calculatedCagr = Math.max(-0.3, Math.min(0.5, calculatedCagr));
    }

    // Simple historical average
    const simpleAvg = meanY;

    // 3. Analyze the exact size of transaction surge near 4-Month Cashback program closed!
    // Cashback cycles close every 4 months (April, August, December)
    const closingTrends = historicalTrends.filter(t => isClosingMonthOfCBPorgram(t.month));
    const normalTrends = historicalTrends.filter(t => !isClosingMonthOfCBPorgram(t.month));
    
    const avgClosingRevenue = closingTrends.length > 0
      ? closingTrends.reduce((sum, t) => sum + t.revenue, 0) / closingTrends.length
      : 0;
      
    const avgNormalRevenue = normalTrends.length > 0
      ? normalTrends.reduce((sum, t) => sum + t.revenue, 0) / normalTrends.length
      : 0;

    let calculatedMultiplier = 1.45; // default 45% surge if not enough comparative historical data
    let calculationStatus = 'Standard Model (+45% Surge)';

    if (avgClosingRevenue > 0 && avgNormalRevenue > 0) {
      calculatedMultiplier = avgClosingRevenue / avgNormalRevenue;
      if (calculatedMultiplier < 1.05) {
        calculatedMultiplier = 1.25; // fallback baseline if small
        calculationStatus = 'Konservatif (+25% Surge)';
      } else if (calculatedMultiplier > 2.5) {
        calculatedMultiplier = 1.95; // cap to avoid runaway visual lines
        calculationStatus = 'Terdeteksi Ekstrim (Capped +95% Surge)';
      } else {
        calculationStatus = `Hasil Analisis Riwayat (+${((calculatedMultiplier - 1) * 100).toFixed(0)}% Surge)`;
      }
    }

    const cbSurgeAnalysis = {
      multiplier: calculatedMultiplier,
      status: calculationStatus,
      avgClosingRevenue: Math.round(avgClosingRevenue),
      avgNormalRevenue: Math.round(avgNormalRevenue),
      closingCount: closingTrends.length,
      normalCount: normalTrends.length
    };

    // 4. Recommendation Intelligence engine
    let recommendation = '';
    let confidenceLevel: 'High' | 'Moderate' | 'Low' = 'Low';
    let bestModelLabel = '';

    if (rSquared >= 0.5) {
      bestModelLabel = 'Linear Regression (X = Bulan, Y = Net Sell)';
      confidenceLevel = 'High';
      recommendation = `Linear Regression adalah model terbaik untuk data Anda! Tren bulanan penjualan Anda menunjukkan arah linier yang sangat konsisten (R² = ${(rSquared * 100).toFixed(0)}%). Garis tren linear LSQ menangkap arah pergerakan omset jangka panjang dengan andal tanpa terpengaruh lompatan fluktuatif sesaat.`;
    } else if (coeffOfVariation < 0.15) {
      bestModelLabel = 'Basic Extrapolation (Simple Average Runway)';
      confidenceLevel = 'Moderate';
      recommendation = `Ekstrapolasi Rata-rata Stabil direkomendasikan. Penjualan bulanan Anda relatif konstan dan stabil dengan deviasi kecil, namun tidak mengikuti arah linier (R² rendah = ${(rSquared * 100).toFixed(0)}%). Menggunakan Regresi Linier di sini berisiko meleset karena kemiringannya terlalu rentan terhadap naik-turun kecil.`;
    } else {
      bestModelLabel = 'Basic Extrapolation (Historical MoM Trend)';
      confidenceLevel = 'Moderate';
      recommendation = `Ekstrapolasi MoM Delta dengan faktor konservatif disarankan. Data Anda mendeteksi fluktuasi/volatilitas bulanan yang tinggi (Coefficient of Variation = ${(coeffOfVariation * 100).toFixed(0)}%). Hindari regresi linier jangka panjang karena bisa meramalkan nilai ekstrim yang tidak realistis (terlalu tinggi atau di bawah nol).`;
    }

    // 5. Generate Future Forecast Points and learn the end-of-cycle CB surge
    // Determine last known month labeling sequence
    const lastTrend = historicalTrends[N - 1];
    const lastLabel = lastTrend.month;
    const monthsNameMap = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Attempt parse last month
    let startYear = 26;
    let startMonthIdx = 4; // default to May

    const cleanLabel = lastLabel.trim();
    const parts = cleanLabel.split(' ');
    if (parts.length === 2) {
      const monthPart = parts[0];
      const yearPart = parts[1].replace("'", "");
      
      const idx = monthsNameMap.indexOf(monthPart);
      if (idx !== -1) startMonthIdx = idx;
      
      const parsedYear = parseInt(yearPart, 10);
      if (!isNaN(parsedYear)) startYear = parsedYear;
    }

    // We want to make sure we project at least until December 2026 (month 11, year 26)
    // Let's compute how many months are needed from startMonthIdx and startYear
    let targetSteps = monthsToProject;
    if (startYear === 25) {
      // 12 months of 2026, plus whatever is left of 2025
      const monthsLeftIn2025 = 11 - startMonthIdx;
      targetSteps = Math.max(monthsToProject, monthsLeftIn2025 + 12);
    } else if (startYear === 26) {
      const monthsLeftIn2026 = 11 - startMonthIdx;
      targetSteps = Math.max(monthsToProject, monthsLeftIn2026);
    }

    const forecastPoints = [];
    let cumulativeCagrValue = lastVal;

    for (let step = 1; step <= targetSteps; step++) {
      const nextXIdx = N + step;
      
      // A. Linear Regression estimate
      const regressionEstimate = Math.max(0, Math.round(m * nextXIdx + c));

      // B. Custom Adjusted Extrapolations
      let extrapolationEstimate = 0;
      const adjustFactor = 1 + (manualAdjustment / 100);

      if (extrapolateMethod === 'mom_delta') {
        extrapolationEstimate = Math.max(0, Math.round((lastVal + (step * avgMoMDiff)) * adjustFactor));
      } else if (extrapolateMethod === 'cagr') {
        cumulativeCagrValue = cumulativeCagrValue * (1 + calculatedCagr);
        extrapolationEstimate = Math.max(0, Math.round(cumulativeCagrValue * adjustFactor));
      } else {
        // simple average runway
        extrapolationEstimate = Math.max(0, Math.round(simpleAvg * adjustFactor));
      }

      // Compute label
      const computedMonthIdx = (startMonthIdx + step) % 12;
      const yearOffset = Math.floor((startMonthIdx + step) / 12);
      const computedYear = startYear + yearOffset;
      const futureLabel = `${monthsNameMap[computedMonthIdx]} '${computedYear}`;

      // Investigate if this future month is a closing cashback program month
      const isClosing = isClosingMonthOfCBPorgram(futureLabel);
      if (applyCBProgramSurge && isClosing) {
        // Learn how big transactions spike at the end of cyclical 4-Month programs
        extrapolationEstimate = Math.round(extrapolationEstimate * cbSurgeAnalysis.multiplier);
      }

      forecastPoints.push({
        step,
        month: futureLabel,
        linearRegression: regressionEstimate,
        extrapolation: extrapolationEstimate,
        isForecast: true,
        isClosingMonth: isClosing
      });
    }

    // 6. Combine data for Recharts display
    const chartData = [
      ...historicalTrends.map((t, idx) => {
        const targetKey = `${selectedBrand}_${t.month}`;
        let targetVal = monthlyTargets[targetKey] !== undefined
          ? monthlyTargets[targetKey]
          : (DEFAULT_2026_BRAND_TARGETS[selectedBrand]?.[t.month] || 0);

        // Fetch fallback for 12 months in MBS 2025 scaled by brand ratio
        if (targetVal === 0 && t.month.endsWith("'25")) {
          const matched2025 = HISTORICAL_2025_ALL_DATA.find(d => d.month === t.month);
          if (matched2025) {
            const brandRatioVal = selectedBrand === 'ALL' ? 1.0 : (() => {
              const brandTotal = Object.values(DEFAULT_2026_BRAND_TARGETS[selectedBrand] || {}).reduce((a: number, b: number) => a + b, 0);
              const allTotal = Object.values(DEFAULT_2026_BRAND_TARGETS['ALL'] || {}).reduce((a: number, b: number) => a + b, 0);
              return allTotal > 0 ? (brandTotal / allTotal) : 0.15;
            })();
            targetVal = Math.round(matched2025.target * brandRatioVal);
          }
        }

        return {
          month: t.month,
          actual: t.revenue,
          linearRegression: Math.round(m * (idx + 1) + c),
          extrapolation: t.revenue,
          isForecast: false,
          target: targetVal || null,
          isClosingMonth: isClosingMonthOfCBPorgram(t.month)
        };
      }),
      ...forecastPoints.map(f => {
        const targetKey = `${selectedBrand}_${f.month}`;
        const targetVal = monthlyTargets[targetKey] !== undefined
          ? monthlyTargets[targetKey]
          : (DEFAULT_2026_BRAND_TARGETS[selectedBrand]?.[f.month] || 0);

        return {
          month: f.month,
          actual: null,
          linearRegression: f.linearRegression,
          extrapolation: f.extrapolation,
          isForecast: true,
          target: targetVal || null,
          isClosingMonth: f.isClosingMonth
        };
      })
    ];

    return {
      hasEnoughData: true,
      regressionLine: { m, c },
      rSquared,
      coeffOfVariation,
      historicalAvg: Math.round(meanY),
      chartData,
      forecastPoints,
      recommendation,
      confidenceLevel,
      bestModelLabel,
      calculatedCagr,
      cbSurgeAnalysis
    };

  }, [historicalTrends, monthsToProject, extrapolateMethod, manualAdjustment, monthlyTargets, applyCBProgramSurge, selectedBrand]);

  // Brand-Specific Compound Growth & BCG BCG/McKinsey Matrix calculation for Board Presentational Deck
  const brandAnalysis = useMemo(() => {
    if (!records || records.length === 0) return [];

    const brandsMap: Record<string, { monthSales: Record<string, number>; totalRevenue: number; units: number }> = {};
    const allMonths = historicalTrends.map(t => t.month);

    records.forEach(r => {
      const { catName } = classifyRecord(r.group_name || '', r.product || '');
      const brand = catName;
      if (!brandsMap[brand]) {
        brandsMap[brand] = { monthSales: {}, totalRevenue: 0, units: 0 };
      }
      brandsMap[brand].totalRevenue += r.ttl_sales || 0;
      brandsMap[brand].units += r.quantity || 0;

      if (r.date) {
        const parts = r.date.split('-');
        if (parts.length === 3) {
          const monthsNameMap = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const mIdx = parseInt(parts[1], 10) - 1;
          const yearShort = parts[0].substring(2);
          if (mIdx >= 0 && mIdx < 12) {
            const mStr = `${monthsNameMap[mIdx]} '${yearShort}`;
            brandsMap[brand].monthSales[mStr] = (brandsMap[brand].monthSales[mStr] || 0) + (r.ttl_sales || 0);
          }
        }
      }
    });

    const totalAllRevenue = Object.values(brandsMap).reduce((sum, b) => sum + b.totalRevenue, 0);
    const N_months = allMonths.length;

    return Object.entries(brandsMap).map(([brandName, data]) => {
      const monthlyList = allMonths.map(m => data.monthSales[m] || 0);
      
      let brandCagr = 0;
      const validVal = monthlyList.filter(v => v > 0);
      if (validVal.length >= 2) {
        const firstVal = validVal[0];
        const lastVal = validVal[validVal.length - 1];
        brandCagr = Math.pow(lastVal / firstVal, 1 / (validVal.length - 1)) - 1;
        brandCagr = Math.max(-0.4, Math.min(0.8, brandCagr));
      } else {
        brandCagr = 0.02; // flat 2% growth fallback
      }

      // Volatility (Coefficient of variation of sales over historical months)
      const avgSales = data.totalRevenue / (N_months || 1);
      let varianceSum = 0;
      monthlyList.forEach(v => {
        varianceSum += Math.pow(v - avgSales, 2);
      });
      const stdDev = Math.sqrt(varianceSum / (N_months || 1));
      const volatility = avgSales > 0 ? stdDev / avgSales : 0;

      // Classify via relative size and CAGR
      const contributionShare = totalAllRevenue > 0 ? data.totalRevenue / totalAllRevenue : 0;
      let bcgStatus: 'Star' | 'Cash Cow' | 'Question Mark' | 'Dog' = 'Dog';

      if (contributionShare >= 0.15 && brandCagr >= 0.05) {
        bcgStatus = 'Star';
      } else if (contributionShare >= 0.15 && brandCagr < 0.05) {
        bcgStatus = 'Cash Cow';
      } else if (contributionShare < 0.15 && brandCagr >= 0.03) {
        bcgStatus = 'Question Mark';
      } else {
        bcgStatus = 'Dog';
      }

      let recommendation = '';
      let horizon = 'Horizon 1 (Core)';
      if (bcgStatus === 'Star') {
        recommendation = 'Investasi modal agresif & percepat penetrasi. Tingkatkan credit limit logistik dan optimalkan insentif "White Bonus" eksklusif guna memaksimalkan penyerapan stok menjelang periode transaksi penutupan program.';
        horizon = 'Horizon 2 (Platform Pertumbuhan Berkelanjutan)';
      } else if (bcgStatus === 'Cash Cow') {
        recommendation = 'Lakukan panen profitabilitas stabil & maksimalkan loyalti gerai. Alokasikan surplus profitabilitas untuk mendanai aktivasi brand bertumbuh, seraya memantau pemenuhan target cashback kanal secara periodik.';
        horizon = 'Horizon 1 (Mesin Arus Kas Inti)';
      } else if (bcgStatus === 'Question Mark') {
        recommendation = 'Butuh intervensi taktis pada modern trade select gerai apotek utama. Tawarkan insentif mikro terarah dan fasilitasi visual merchandising khusus guna merangsang penetrasi volume.';
        horizon = 'Horizon 3 (Inovasi & Penetrasi Niche)';
      } else {
        recommendation = 'Inisiasi rasionalisasi portofolio SKU berkinerja rendah dan berlakukan batas minimum pemesanan (MOQ) logistik guna menahan kebocoran margin kontribusi operasional.';
        horizon = 'Horizon 1 (Efisiensi & Pemulihan Operasional)';
      }

      return {
        brandName,
        totalRevenue: data.totalRevenue,
        units: data.units,
        contribution: contributionShare,
        cagr: brandCagr,
        volatility,
        bcgStatus,
        recommendation,
        horizon,
        monthlyList
      };
    });
  }, [records, historicalTrends]);

  const overallMonths = useMemo(() => calculateMonthlyTrends(records), [records]);

  // Real-time Data Diagnostics calculation to replace static consulting templates
  const dataDiagnostics = useMemo(() => {
    if (!records || records.length === 0) return null;

    let minSales = Infinity;
    let maxSales = -Infinity;
    let peakMonthName = '';
    let valleyMonthName = '';
    
    // Calculate totals per month
    const monthlySum: Record<string, number> = {};
    records.forEach(r => {
      if (r.date) {
        const parts = r.date.split('-');
        if (parts.length === 3) {
          const monthsNameMap = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const mIdx = parseInt(parts[1], 10) - 1;
          const yearShort = parts[0].substring(2);
          if (mIdx >= 0 && mIdx < 12) {
            const mStr = `${monthsNameMap[mIdx]} '${yearShort}`;
            monthlySum[mStr] = (monthlySum[mStr] || 0) + (r.ttl_sales || 0);
          }
        }
      }
    });

    Object.entries(monthlySum).forEach(([m, s]) => {
      if (s > maxSales) {
        maxSales = s;
        peakMonthName = m;
      }
      if (s < minSales) {
        minSales = s;
        valleyMonthName = m;
      }
    });

    const uniqueOutlets = new Set(records.map(r => (r.customer_id || 'GUEST').trim().toUpperCase())).size;
    const uniqueBrands = new Set(records.map(r => r.group_name || 'Uncategorized')).size;
    const totalTransactions = records.length;
    const totalSalesVolume = records.reduce((sum, r) => sum + (r.ttl_sales || 0), 0);

    return {
      peakMonth: peakMonthName,
      peakSales: maxSales === -Infinity ? 0 : maxSales,
      valleyMonth: valleyMonthName,
      valleySales: minSales === Infinity ? 0 : minSales,
      uniqueOutlets,
      uniqueBrands,
      totalTransactions,
      totalSalesVolume
    };
  }, [records]);

  const handleDownloadReport = () => {
    const brandLabel = selectedBrand === 'ALL' ? 'ALL BRANDS (KONSOLIDASI)' : selectedBrand;
    const dateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    
    let reportText = `# LAPORAN ANALISIS DIAGNOSTIK RIIL DATASET PENCOCOKAN PENJUALAN ROHTO
**Sasaran Analisis:** Kategori ${brandLabel}
**Tanggal Pelaporan:** ${dateStr}
**Total Transaksi Ledger:** ${dataDiagnostics?.totalTransactions || 0}
**Total Pendapatan Terakumulasi:** ${formatCurrency(dataDiagnostics?.totalSalesVolume || 0)}

---

## 1. STRUKTUR DAN STATUS KESEHATAN DATASET
*   **Total Kategori Brand Terdeteksi:** ${dataDiagnostics?.uniqueBrands || 0} brand
*   **Total Kontributor Outlet Aktif:** ${dataDiagnostics?.uniqueOutlets || 0} apotek/gerai unik
*   **Bulan Penjualan Puncak (Peak):** ${dataDiagnostics?.peakMonth || 'N/A'} dengan total omset ${formatCurrency(dataDiagnostics?.peakSales || 0)}
*   **Bulan Penjualan Terendah (Valley):** ${dataDiagnostics?.valleyMonth || 'N/A'} dengan total omset ${formatCurrency(dataDiagnostics?.valleySales || 0)}
*   **Volatilitas Keseluruhan (Coefficient of Variation):** ${(coeffOfVariation * 100).toFixed(1)}%

---

## 2. DETEKSI ANOMALI PROGRAM CASHBACK (CBP SURGE EFFECT)
Model diagnostik membandingkan rata-rata pembelanjaan dealer di bulan penutupan regular CBP (April, Agustus, Desember) vs bulan sela lainnya:
*   **Rata-rata Omset Bulan Normal (Luar Siklus Tutup):** ${formatCurrency(modelingResults?.cbSurgeAnalysis?.avgNormalRevenue || 0)}
*   **Rata-rata Omset Bulan Penutupan CBP:** ${formatCurrency(modelingResults?.cbSurgeAnalysis?.avgClosingRevenue || 0)}
*   **Faktor Multiplier Lonjakan Riil:** +${((modelingResults?.cbSurgeAnalysis?.multiplier - 1) * 100).toFixed(1)}%
*   **Status Deteksi Musikaltas:** ${modelingResults?.cbSurgeAnalysis?.status}

---

## 3. MATRIKS TREN KINERJA KATEGORI BRAND AKTUAL
Berikut adalah klasifikasi pertumbuhan majemuk (CAGR) historis dari seluruh brand yang terdaftar berdasarkan catatan transaksi riil:

| Kategori Brand | Total Net Sales | Volume Pangsa Pasar % | CAGR % | Kuadran Portofolio |
| :--- | :---: | :---: | :---: | :---: |
`;

    brandAnalysis.forEach(b => {
      reportText += `| ${b.brandName} | ${formatCurrency(b.totalRevenue)} | ${(b.contribution * 100).toFixed(1)}% | ${(b.cagr * 100).toFixed(1)}% | ${b.bcgStatus} |\n`;
    });

    reportText += `
---
Laporan ini dihasilkan secara dinamis berdasarkan data aktual ledger Anda. Hak Cipta Sistem Intelijen MBS 2026.
`;

    const blob = new Blob([reportText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Laporan_Diagnostik_Riil_${selectedBrand.replace(/\s+/g, '_')}_ReportKuy.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (overallMonths.length < 2) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-4 max-w-2xl mx-auto shadow-xs my-8">
        <div className="p-4 bg-amber-50 rounded-full text-amber-600 w-16 h-16 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Data Kurang Memadai</h3>
        <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-md mx-auto">
          Pemodelan statistik dan ramalan membutuhkan minimal <strong>2 bulan bersambung</strong> data penjualan historis di dalam buku kerja Anda. 
        </p>
        <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl text-[11px] text-slate-550 leading-relaxed font-semibold">
          💡 Tips: Silakan upload file ledger penjualan kustom Anda atau klik tombol <strong>[Reset with Sample Data]</strong> di bagian kanan atas halaman utama untuk langsung mencoba simulasi regresi ini!
        </div>
      </div>
    );
  }

  const {
    chartData,
    rSquared,
    coeffOfVariation,
    historicalAvg,
    forecastPoints,
    recommendation,
    confidenceLevel,
    bestModelLabel,
    calculatedCagr
  } = modelingResults;

  const visibleChartData = useMemo(() => {
    return chartData.filter(d => !d.month.includes("'25"));
  }, [chartData]);

  return (
    <div className="space-y-6">
      
      {/* Forecasting Control Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-3xs">
        <div className="text-left space-y-1">
          <span className="text-[10px] uppercase font-mono tracking-widest text-indigo-600 font-extrabold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            Sistem Peramalan & Simulasi Penjualan
          </span>
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">
            Proyeksi Tren & Simulasi Target Bulanan
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap font-semibold">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 shadow-3xs rounded-xl px-3 py-2">
            <Store className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span className="text-[9.5px] font-black uppercase text-slate-500 shrink-0 font-sans tracking-tight">Kategori Brand:</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-transparent border-none text-[11px] font-black text-slate-900 focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">ALL BRANDS (KONSOLIDASI)</option>
              <option value="ACNES">ACNES</option>
              <option value="HADA LABO">HADA LABO</option>
              <option value="KHALISA">KHALISA</option>
              <option value="LIP ICE">LIP ICE</option>
              <option value="MELANO CC">MELANO CC</option>
              <option value="MENTHOLATUM">MENTHOLATUM</option>
              <option value="OXY">OXY</option>
              <option value="ROHTO EYE CARE">ROHTO EYE CARE</option>
              <option value="ROHTO EYE FLUSH">ROHTO EYE FLUSH</option>
              <option value="SELSUN">SELSUN</option>
              <option value="SKIN AQUA">SKIN AQUA</option>
              <option value="SUNPLAY">SUNPLAY</option>
            </select>
          </div>
        </div>
      </div>

      {/* Modern Sub-Tab Switcher inside modeling dashboard */}
      <div className="flex border-b border-slate-200 mt-2 bg-slate-50/50 p-1 rounded-xl gap-2 w-max">
        <button
          onClick={() => setActiveTabName('forecasting')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            activeTabName === 'forecasting'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-550 hover:text-slate-800 hover:bg-slate-100 font-bold'
          }`}
        >
          Proyeksi & Target Bulanan
        </button>
        <button
          onClick={() => setActiveTabName('sku_outlets')}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            activeTabName === 'sku_outlets'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-550 hover:text-slate-800 hover:bg-slate-100 font-bold'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Store className="w-3.5 h-3.5" />
            Detil SKU & Sebaran Outlet
          </span>
        </button>
      </div>

      {activeTabName === 'forecasting' ? (
        <div className="space-y-6">
          {/* New Target by Brand Table */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs text-left space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-1 w-full">
              <div>
                <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight flex items-center gap-1.5">
                  Tabel Target Bulanan per Brand (2026)
                </h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">
                  Klik baris brand untuk mengaktifkan filter detail visualisasi dan model proyeksi di bawah.
                </span>
              </div>
              
              {/* Ultra-polished Compact Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-end sm:self-auto shrink-0 shadow-3xs">
                <button
                  type="button"
                  onClick={() => setTargetViewFormat('millions')}
                  className={`px-2.5 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                    targetViewFormat === 'millions'
                      ? 'bg-white text-slate-950 shadow-3xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Ringkas (Jt)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetViewFormat('full')}
                  className={`px-2.5 py-1 text-[8.5px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                    targetViewFormat === 'full'
                      ? 'bg-white text-slate-950 shadow-3xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Penuh (Rp)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl no-scrollbar">
              <table className="w-full text-left font-sans text-[8px] border-collapse min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-extrabold uppercase text-[7.5px] tracking-wider">
                    <th className="py-1 px-1.5 sticky left-0 bg-slate-50 z-10 border-r border-slate-150 shadow-[1px_0_0_0_rgba(226,232,240,1)] font-extrabold w-[110px] min-w-[110px] max-w-[110px] truncate">Brand / Kategori</th>
                    <th className="py-1 px-1 text-right font-extrabold uppercase text-[7.5px] tracking-tight">Jan</th>
                    <th className="py-1 px-1 text-right font-extrabold uppercase text-[7.5px] tracking-tight">Feb</th>
                    <th className="py-1 px-1 text-right font-extrabold uppercase text-[7.5px] tracking-tight">Mar</th>
                    <th className="py-1 px-1 text-right font-extrabold uppercase text-[7.5px] tracking-tight">Apr</th>
                    <th className="py-1 px-1 text-right font-extrabold uppercase text-[7.5px] tracking-tight">Mei</th>
                    <th className="py-1 px-1 text-right font-extrabold uppercase text-[7.5px] tracking-tight">Jun</th>
                    <th className="py-1 px-1 text-right font-extrabold uppercase text-[7.5px] tracking-tight">Jul</th>
                    <th className="py-1 px-1 text-right font-extrabold uppercase text-[7.5px] tracking-tight">Agt</th>
                    <th className="py-1 px-1 text-right font-extrabold uppercase text-[7.5px] tracking-tight">Sept</th>
                    <th className="py-1 px-1 text-right font-extrabold uppercase text-[7.5px] tracking-tight">Okt</th>
                    <th className="py-1 px-1 text-right font-extrabold uppercase text-[7.5px] tracking-tight">Nov</th>
                    <th className="py-1 px-1 text-right font-extrabold uppercase text-[7.5px] tracking-tight">Des</th>
                    <th className="py-1 px-1.5 text-right bg-slate-100/50 font-extrabold w-[90px] min-w-[90px]">Total Setahun</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {[
                    { id: 'ACNES', name: 'ACNES' },
                    { id: 'HADA LABO', name: 'HADA LABO' },
                    { id: 'KHALISA', name: 'KHALISA' },
                    { id: 'LIP ICE', name: 'LIP ICE' },
                    { id: 'MELANO CC', name: 'MELANO CC' },
                    { id: 'MENTHOLATUM', name: 'MENTHOLATUM' },
                    { id: 'OXY', name: 'OXY' },
                    { id: 'ROHTO EYE CARE', name: 'ROHTO EYE CARE' },
                    { id: 'ROHTO EYE FLUSH', name: 'ROHTO EYE FLUSH' },
                    { id: 'SELSUN', name: 'SELSUN' },
                    { id: 'SKIN AQUA', name: 'SKIN AQUA' },
                    { id: 'SUNPLAY', name: 'SUNPLAY' },
                    { id: 'ALL', name: 'TOTAL', isTotal: true }
                  ].map((b) => {
                    const isSelected = selectedBrand === b.id;
                    const tableMonthsList = [
                      "Jan '26", "Feb '26", "Mar '26", "Apr '26", "May '26", "Jun '26", 
                      "Jul '26", "Aug '26", "Sep '26", "Oct '26", "Nov '26", "Dec '26"
                    ];

                    const isTotalBrand = b.isTotal || b.id === 'ALL';
                    const targetMap = tableMonthsList.reduce((acc, mKey) => {
                      const targetKey = `${b.id}_${mKey}`;
                      if (monthlyTargets[targetKey] !== undefined) {
                        acc[mKey] = monthlyTargets[targetKey];
                      } else if (isTotalBrand) {
                        // For TOTAL brand, if not explicitly edited, sum up all other individual brands' targets!
                        const otherBrands = [
                          'ACNES', 'HADA LABO', 'KHALISA', 'LIP ICE', 'MELANO CC', 
                          'MENTHOLATUM', 'OXY', 'ROHTO EYE CARE', 'ROHTO EYE FLUSH', 
                          'SELSUN', 'SKIN AQUA', 'SUNPLAY'
                        ];
                        const sumOthers = otherBrands.reduce((sum, otherId) => {
                          const otherKey = `${otherId}_${mKey}`;
                          return sum + (monthlyTargets[otherKey] !== undefined
                            ? monthlyTargets[otherKey]
                            : (DEFAULT_2026_BRAND_TARGETS[otherId]?.[mKey] || 0));
                        }, 0);
                        acc[mKey] = sumOthers;
                      } else {
                        acc[mKey] = DEFAULT_2026_BRAND_TARGETS[b.id]?.[mKey] || 0;
                      }
                      return acc;
                    }, {} as Record<string, number>);

                    const annualTotal = Object.values(targetMap).reduce((sum, val) => sum + val, 0);

                    return (
                      <tr 
                        key={b.id} 
                        onClick={() => setSelectedBrand(b.id)}
                        className={`cursor-pointer transition-colors ${
                          b.isTotal 
                            ? 'bg-slate-100/75 font-black text-slate-950 hover:bg-slate-150/80' 
                            : isSelected 
                            ? 'bg-indigo-50/70 font-bold text-indigo-950 hover:bg-indigo-100/70' 
                            : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <td className={`py-1 px-1.5 sticky left-0 z-10 font-extrabold border-r border-slate-150 shadow-[1px_0_0_0_rgba(226,232,240,1)] text-[8px] w-[110px] min-w-[110px] max-w-[110px] truncate ${
                          b.isTotal 
                            ? 'bg-slate-100 text-slate-950 font-black' 
                            : isSelected 
                            ? 'bg-indigo-50 text-indigo-700 font-black border-l-4 border-l-indigo-600 pl-1.5' 
                            : 'bg-white text-slate-800 font-black'
                        }`}>
                          {b.name}
                        </td>
                        {tableMonthsList.map(mKey => {
                          const val = targetMap[mKey] || 0;
                          return (
                            <td key={mKey} className="py-1 px-1 text-right font-mono whitespace-nowrap text-[8px] tracking-tighter">
                              {formatTargetVal(val)}
                            </td>
                          );
                        })}
                        <td className={`py-1 px-1.5 text-right font-mono font-black text-[8px] tracking-tighter w-[90px] min-w-[90px] ${
                          b.isTotal ? 'text-slate-950 bg-slate-150/50' : 'text-indigo-700 bg-slate-100/40'
                        }`}>
                          {formatTargetVal(annualTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Primary header widget layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* Statistics & Model Summary Info Card */}
            <div className="md:col-span-1 bg-white border border-slate-200 p-5 rounded-3xl shadow-3xs text-left space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Cpu className="w-5 h-5 text-indigo-600 animate-pulse" />
                <div>
                  <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">MODEL ANALYTICS</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Statistik & Kelayakan Data</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Koefisien Determinasi (R²)</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xl font-mono font-black text-indigo-750">{(rSquared * 100).toFixed(1)}%</span>
                    <span className="text-[9.5px] text-slate-450 font-bold">Akurasi Hubungan Linier</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-505 ${rSquared >= 0.5 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.round(rSquared * 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Volatilitas (Coeff of Variation)</span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-base font-mono font-black text-slate-800">{(coeffOfVariation * 100).toFixed(1)}%</span>
                    <span className="text-[9.5px] text-slate-450 font-bold">Tingkat Fluktuasi Bulanan</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Rata-Rata Bulanan Aktual</span>
                  <span className="text-base font-mono font-black text-emerald-700 block mt-0.5">
                    {formatCurrency(historicalAvg)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide block">Jumlah Historis Bulan</span>
                  <span className="text-xs font-bold text-slate-700 block mt-0.5">
                    {historicalTrends.length} Bulan Terdaftar
                  </span>
                </div>
              </div>
            </div>

            {/* Advisor Recommendation Intelligence Panel */}
            <div className="md:col-span-2 bg-gradient-to-br from-indigo-50/70 to-white border border-indigo-100/70 p-5 rounded-3xl shadow-3xs text-left space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-indigo-100/50">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-5 h-5 text-indigo-700" />
                  <div>
                    <h4 className="text-sm font-black text-indigo-950 uppercase tracking-tight">REKOMENDASI MODEL</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Berdasarkan Dataset Anda</p>
                  </div>
                </div>
                
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full uppercase font-mono font-black border tracking-wider flex items-center gap-1 ${
                  confidenceLevel === 'High' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Kelayakan: {confidenceLevel}</span>
                </span>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">PILIHAN MODEL TERBAIK UNTUK ANDA</span>
                  <p className="text-sm font-black text-slate-900 leading-tight">
                    {bestModelLabel}
                  </p>
                </div>

                <div className="p-3.5 bg-white border border-indigo-100/50 rounded-2xl relative">
                  <p className="text-[11.5px] text-slate-650 leading-relaxed font-medium">
                    {recommendation}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-800 bg-indigo-50/50 px-3 py-2 rounded-xl">
                  <Info className="w-4 h-4 text-indigo-650 shrink-0" />
                  <span>Model merekomendasikan komparasi visual di bawah agar peramalan tidak mengalami distorsi.</span>
                </div>
              </div>

            </div>

          </div>

          {/* Main visualization chart block */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs text-left space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">GRAFIK PREDIKSI OMSET (CASHBACK & OPERASIONAL)</h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wide block">Regresi Linier vs Ekstrapolasi Bulanan</span>
              </div>

              {/* Interactive controls bar */}
              <div className="flex items-center flex-wrap gap-4 text-xs font-bold text-slate-700">
                {/* Projection month length */}
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-150">
                  <span className="text-[10px] uppercase font-black tracking-wide text-slate-450 px-1">Proyeksi</span>
                  <select
                    value={monthsToProject}
                    onChange={(e) => setMonthsToProject(Number(e.target.value))}
                    className="bg-white border border-slate-200 text-xs font-extrabold rounded-lg px-2 py-1 text-slate-800 outline-none"
                  >
                    <option value={1}>+1 Bulan</option>
                    <option value={2}>+2 Bulan</option>
                    <option value={3}>+3 Bulan</option>
                    <option value={6}>+6 Bulan</option>
                    <option value={12}>+12 Bulan (1 Tahun)</option>
                  </select>
                </div>

                {/* Extrapolation type choice */}
                <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-150">
                  <span className="text-[10px] uppercase font-black tracking-wide text-slate-455 px-1">Tipe Ekstrapolasi</span>
                  <select
                    value={extrapolateMethod}
                    onChange={(e) => setExtrapolateMethod(e.target.value as ExtrapolateType)}
                    className="bg-white border border-slate-200 text-xs font-extrabold rounded-lg px-2 py-1 text-slate-800 outline-none"
                  >
                    <option value="mom_delta">MoM Absolute Delta (Tren Rata-rata Selisih)</option>
                    <option value="cagr">CAGR Projections (Pertumbuhan Compound: {(calculatedCagr * 100).toFixed(1)}%)</option>
                    <option value="simple_avg">Steady Average Runway (Rata-rata Historis)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Optimism Manual Control Slider */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Sliders className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
                <div>
                  <span className="text-[11px] font-black uppercase text-slate-800 block">Faktor Optimisme Manual (Ekstrapolasi)</span>
                  <p className="text-[10px] text-slate-450 font-semibold leading-relaxed">Sesuaikan target elastisitas pertumbuhan pasar kustom Anda di sini</p>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto">
                <input
                  type="range"
                  min={-50}
                  max={50}
                  step={5}
                  value={manualAdjustment}
                  onChange={(e) => setManualAdjustment(Number(e.target.value))}
                  className="w-full sm:w-48 accent-indigo-600 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className={`text-[11px] font-mono font-black px-2 py-1 rounded-lg w-16 text-center shrink-0 tracking-tight ${
                  manualAdjustment > 0 
                    ? 'bg-emerald-50 text-emerald-700 font-black' 
                    : manualAdjustment < 0 
                    ? 'bg-rose-50 text-rose-700 font-bold' 
                    : 'bg-slate-200 text-slate-800'
                }`}>
                  {manualAdjustment > 0 ? `+${manualAdjustment}%` : `${manualAdjustment}%`}
                </span>
              </div>
            </div>

            {/* Recharts chart canvas */}
            <div className="w-full h-[280px] bg-slate-50/30 p-2 border border-slate-100 rounded-xl overflow-hidden mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={visibleChartData}
                  margin={{ top: 12, right: 12, left: 16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 9.5, fill: '#64748b', fontWeight: 650 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tickFormatter={(val) => `Rp ${(val / 1000000).toFixed(0)}Jt`}
                    tick={{ fontSize: 9.5, fill: '#64748b', fontWeight: 650 }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                  />
                  
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      if (value === null) return ['N/A', name];
                      const labelMap: Record<string, string> = {
                        actual: 'Net Sales Aktual',
                        linearRegression: 'Linear Regression (Best Fit)',
                        extrapolation: 'Ekstrapolasi Proyeksi',
                        target: 'Target Bulanan'
                      };
                      return [formatCurrency(Number(value)), labelMap[name] || name];
                    }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '10.5px',
                      fontWeight: 650,
                      color: '#1e293b'
                    }}
                  />
                  
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', fonttext: 'bold', fontWeight: 700, paddingBottom: 10 }}
                  />

                  {/* Display custom targets setting in hot pink / magenta */}
                  <Line 
                    name="target" 
                    type="monotone" 
                    dataKey="target" 
                    stroke="#d946ef" 
                    strokeWidth={2.5}
                    strokeDasharray="4 4"
                    dot={{ r: 4, strokeWidth: 1.5, fill: '#fff', stroke: '#d946ef' }}
                    activeDot={{ r: 6 }}
                    connectNulls={true}
                  />

                  {/* Display historical shaded area */}
                  <Area 
                    name="actual" 
                    type="monotone" 
                    dataKey="actual" 
                    fill="#ecefff" 
                    stroke="#4f46e5" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 1.5, fill: '#fff', stroke: '#4f46e5' }}
                    activeDot={{ r: 6 }}
                  />

                  {/* Display linear regression best-fit extension in Green */}
                  <Line 
                    name="linearRegression" 
                    type="monotone" 
                    dataKey="linearRegression" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />

                  {/* Display extrapolation extension in Amber */}
                  <Line 
                    name="extrapolation" 
                    type="monotone" 
                    dataKey="extrapolation" 
                    stroke="#f59e0b" 
                    strokeWidth={2.5}
                    strokeDasharray="3 3"
                    dot={false}
                  />

                  {/* Split historic vs future indicator */}
                  {historicalTrends.length > 0 && (
                    <ReferenceLine 
                      x={historicalTrends[historicalTrends.length - 1].month} 
                      stroke="#cbd5e1" 
                      strokeDasharray="3 3"
                      label={{ value: 'Mulai Proyeksi', position: 'top', fill: '#94a3b8', fontSize: '9px', fontWeight: 700 }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Unified monthly targets & performance tracker table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs text-left space-y-3">
            <div>
              <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">TARGET & KINERJA BULANAN (HISTORIS & PROYEKSI)</h4>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block">Rangkuman Kinerja vs Target yang Tersimpan untuk Setiap Sesi</span>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left font-sans text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-black uppercase text-[9px] tracking-wide">
                    <th className="py-2.5 px-4">Bulan / Periode</th>
                    <th className="py-2.5 px-4 text-center">Tipe Sesi</th>
                    <th className="py-2.5 px-4 text-right">Nilai Omset (Riil / Proyeksi)</th>
                    <th className="py-2.5 px-4 text-center" style={{ width: '180px' }}>Set Target Bulanan</th>
                    <th className="py-2.5 px-4 text-center">Pencapaian Target %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {visibleChartData.map((item) => {
                    const isForecast = item.isForecast;
                    const revenueAmount = isForecast ? item.extrapolation : (item.actual || 0);
                    const targetVal = item.target || 0;
                    const actualAchievement = targetVal > 0 
                      ? (revenueAmount / targetVal) * 100 
                      : null;

                    const inputVal = editingTargetMonth === item.month 
                      ? tempTargetVal 
                      : (targetVal > 0 ? String(targetVal) : '');

                    return (
                      <tr key={item.month} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-4 font-black text-slate-900 flex items-center gap-1.5 align-middle">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.month}</span>
                        </td>
                        <td className="py-2.5 px-4 text-center align-middle">
                          {isForecast ? (
                            <span className="bg-amber-50 text-amber-700 text-[8.5px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-amber-100/50">
                              Proyeksi
                            </span>
                          ) : (
                            <span className="bg-indigo-50 text-indigo-700 text-[8.5px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-indigo-100/50">
                              Aktual Historis
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-800 align-middle">
                          {formatCurrency(revenueAmount)}
                        </td>
                        <td className="py-2.5 px-4 text-center align-middle">
                          <div className="flex justify-center">
                            <div className="relative w-full max-w-[150px]">
                              <span className="absolute left-2.5 top-1.5 text-[9px] font-black text-slate-400">Rp</span>
                              <input
                                type="text"
                                placeholder="Input target (ex: 20000000)"
                                value={inputVal}
                                onFocus={() => {
                                  setEditingTargetMonth(item.month);
                                  setTempTargetVal(targetVal > 0 ? String(targetVal) : '');
                                }}
                                onChange={(e) => setTempTargetVal(e.target.value)}
                                onBlur={() => handleSaveTarget(item.month, tempTargetVal)}
                                className="w-full pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-mono font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white text-left"
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-center align-middle">
                          {actualAchievement !== null ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-[9.5px] font-black font-mono px-2 py-0.5 rounded-md inline-block leading-none ${
                                actualAchievement >= 100 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : actualAchievement >= 75 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {actualAchievement.toFixed(1)}%
                              </span>
                              
                              {/* Mini dynamic visual bar */}
                              <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${actualAchievement >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                  style={{ width: `${Math.min(100, actualAchievement)}%` }}
                                ></div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                              No Target Set
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {/* Total summary row */}
                  {(() => {
                    const totalRevenue = visibleChartData.reduce((sum, item) => {
                      const isForecast = item.isForecast;
                      const revenueAmount = isForecast ? item.extrapolation : (item.actual || 0);
                      return sum + (revenueAmount || 0);
                    }, 0);

                    const totalTarget = visibleChartData.reduce((sum, item) => {
                      return sum + (item.target || 0);
                    }, 0);

                    return (
                      <tr className="bg-slate-150/50 font-black text-slate-900 border-t border-slate-200">
                        <td className="py-2.5 px-4 flex items-center gap-1.5 align-middle font-black text-slate-950">
                          <TrendingUp className="w-3.5 h-3.5 text-indigo-750" />
                          <span>TOTAL SETAHUN (2026)</span>
                        </td>
                        <td className="py-2.5 px-4 text-center align-middle">
                          <span className="bg-indigo-50 text-indigo-800 text-[8.5px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider border border-indigo-150">
                            Konsolidasi
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-black text-slate-950 align-middle">
                          {formatCurrency(totalRevenue)}
                        </td>
                        <td className="py-2.5 px-4 text-center align-middle">
                          <span className="font-mono font-black text-indigo-700 text-[11px]">
                            {formatCurrency(totalTarget)}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center align-middle">
                          {totalTarget > 0 ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md inline-block leading-none ${
                                (totalRevenue / totalTarget * 100) >= 100 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : (totalRevenue / totalTarget * 100) >= 75 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {(totalRevenue / totalTarget * 100).toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-bold">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            <div className="text-[10px] text-slate-400 font-semibold leading-relaxed pt-2 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span>Setiap target yang Anda masukkan disimpan otomatis secara offline di peramban ini. Anda dapat menggunakannya untuk membandingkan target kustom dengan prediksi realistis L.R. (Garis Regresi Linier) & Model Ekstrapolasi Anda.</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SKU SEBARAN OUTLET PANEL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Metric A */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-3xs text-left">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Jenis SKU</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-mono font-black text-slate-900">{skuOutletList.length}</span>
                <span className="text-[10px] text-emerald-600 font-extrabold uppercase bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  Aktif
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Jenis produk dengan transaksi tercatat di sistem.</p>
            </div>

            {/* Metric B */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-3xs text-left">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Volume Terjual</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-mono font-black text-indigo-750">
                  {skuOutletMetrics.totalVolume.toLocaleString('id-ID')}
                </span>
                <span className="text-[9.5px] text-slate-500 font-bold">Unit</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Total pemesanan distributor & ritel.</p>
            </div>

            {/* Metric C */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-3xs text-left">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Rata-rata Sebaran Outlet</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-mono font-black text-amber-700">
                  {skuOutletMetrics.avgOutlets}
                </span>
                <span className="text-[9.5px] text-slate-500 font-bold">Outlet / SKU</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Rata-rata jumlah toko ritel yang menjual per SKU.</p>
            </div>

            {/* Metric D */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-3xs text-left">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Total Omset SKU</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[15px] font-mono font-black text-slate-900 block truncate">
                  {formatCurrency(skuOutletMetrics.totalRevenue)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Nilai penjualan kotor seluruh SKU tergrup.</p>
            </div>
          </div>

          {/* MAIN SKU ROW TABLE VIEW */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs text-left space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <div>
                <h4 className="text-sm font-black text-slate-950 uppercase tracking-tight">INFORMASI DISTRIBUSI & OUTLET PENJUAL SKU</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wide">
                  Hasil Pemetaan Distribusi SKU ke Tiap-Tiap Outlet Berdasarkan Data Real Transaksi Ledger
                </p>
              </div>

              {/* SKU Search filter input bar */}
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Cari nama produk SKU..."
                  value={skuSearchQuery}
                  onChange={(e) => {
                    setSkuSearchQuery(e.target.value);
                    setSkuCurrentPage(1);
                  }}
                  className="w-full px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600 focus:bg-white"
                />
              </div>
            </div>

            {/* List Table of SKU details with expand support */}
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left font-sans text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold uppercase text-[8.5px] tracking-widest">
                    <th className="py-2.5 px-4">Nama Produk SKU</th>
                    <th className="py-2.5 px-4 text-center">Performa Sales</th>
                    <th className="py-2.5 px-4 text-center">Sebaran Outlet</th>
                    <th className="py-2.5 px-4 text-center" style={{ width: '110px' }}>Detil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedSkus.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-semibold uppercase tracking-wider text-xs">
                        Tidak ada SKU ditemukan dengan kata pencarian "{skuSearchQuery}"
                      </td>
                    </tr>
                  ) : (
                    paginatedSkus.map(sku => {
                      const isExpanded = expandedSku === sku.product;

                      return (
                        <>
                          <tr key={sku.product} className={`hover:bg-slate-50/40 transition-colors ${isExpanded ? 'bg-indigo-50/10' : ''}`}>
                            <td className="py-2.5 px-4 max-w-[240px]">
                              <div className="font-extrabold text-slate-900 leading-normal truncate" title={sku.product}>
                                {sku.product}
                              </div>
                              <span className="inline-block mt-0.5 font-mono font-bold text-[8.5px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded uppercase">
                                {sku.brand}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <div className="font-mono font-extrabold text-slate-900">
                                {sku.totalSold.toLocaleString('id-ID')} unit
                              </div>
                              <div className="text-[10px] text-slate-450 font-mono mt-0.5">
                                {formatCurrency(sku.totalRevenue)}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <div className="inline-block font-mono font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 text-[9.5px]">
                                {sku.outletsCount} Outlet
                              </div>
                              <div className="text-[10px] text-slate-550 mt-1 font-semibold leading-tight max-w-[180px] truncate mx-auto" title={sku.topOutlet.outletName || sku.topOutlet.outletId}>
                                Utama: <span className="text-slate-800">{sku.topOutlet.outletName || sku.topOutlet.outletId}</span> ({sku.topOutlet.percentage.toFixed(0)}%)
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-center align-middle">
                              <button
                                onClick={() => {
                                  setExpandedSku(isExpanded ? null : sku.product);
                                }}
                                className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer border ${
                                  isExpanded 
                                    ? 'bg-rose-50 border-rose-150 text-rose-600 hover:bg-rose-100' 
                                    : 'bg-indigo-50 border-indigo-100 text-indigo-650 hover:bg-indigo-100/70'
                                }`}
                              >
                                <span>{isExpanded ? 'Tutup' : 'Outlet'}</span>
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Outlet list section nested directly under table row */}
                          {isExpanded && (
                            <tr key={`${sku.product}-expanded`}>
                              <td colSpan={4} className="p-3 bg-slate-50/70">
                                <div className="border border-slate-200 bg-white rounded-2xl p-4 shadow-3xs space-y-3 font-sans max-w-3xl mx-auto">
                                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                                      Sebaran Outlet Aktif ({sku.outletsCount})
                                    </span>
                                    <span className="text-[10px] text-indigo-650 font-mono font-black uppercase">
                                      Total Omset: {formatCurrency(sku.totalRevenue)}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    {/* Left list: top selling outlets */}
                                    <div className="md:col-span-8 space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white text-left">
                                        {sku.outlets.map((outlet, idx) => (
                                          <div key={outlet.outletId} className="p-1.5 px-2.5 flex items-center justify-between gap-3 text-xs hover:bg-slate-50/50">
                                            <div className="flex items-start gap-2 max-w-[240px] text-left">
                                              <span className="text-[9.5px] font-mono font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 shrink-0">
                                                #{idx + 1}
                                              </span>
                                              <div className="flex flex-col min-w-0">
                                                <span className="text-[11px] font-extrabold text-slate-900 truncate" title={outlet.outletName || outlet.outletId}>
                                                  {outlet.outletName || outlet.outletId}
                                                </span>
                                                {outlet.outletName && (
                                                  <span className="text-[9.5px] font-mono font-medium text-slate-450 mt-0.5 block">
                                                    Kode: <span className="text-slate-500 font-bold">{outlet.outletId}</span>
                                                  </span>
                                                )}
                                              </div>
                                            </div>



                                            <div className="text-right shrink-0">
                                              <span className="font-mono font-bold text-slate-900 text-[11px] block">
                                                {outlet.quantitySold.toLocaleString('id-ID')} unit
                                              </span>
                                              <span className="text-[8.5px] text-emerald-600 font-semibold block">
                                                {outlet.percentage.toFixed(1)}% kontribusi
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Right compact suggestion box */}
                                    <div className="md:col-span-4 bg-slate-100/50 border border-slate-250/30 p-3 rounded-xl text-[10.5px] text-slate-600 leading-relaxed text-left flex flex-col justify-between">
                                      <div>
                                        <div className="flex items-center gap-1 text-amber-600 font-extrabold uppercase text-[9px] tracking-wide mb-1">
                                          <Lightbulb className="w-3.5 h-3.5" />
                                          Rekomendasi
                                        </div>
                                        <p className="text-slate-550 leading-normal font-medium">
                                          Penjualan SKU didominasi <strong className="text-indigo-700">{sku.topOutlet.outletName || sku.topOutlet.outletId}</strong> ({sku.topOutlet.percentage.toFixed(0)}%). Disarankan promosi merata di outlet lain untuk meningkatkan penetrasi produk.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalSkuPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 font-sans text-xs text-slate-500">
                <span className="font-semibold font-mono text-[10.5px]">
                  Menampilkan {Math.min(filteredSkus.length, (skuCurrentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(filteredSkus.length, skuCurrentPage * ITEMS_PER_PAGE)} dari {filteredSkus.length} SKU
                </span>

                <div className="flex items-center gap-1">
                  <button
                    disabled={skuCurrentPage === 1}
                    onClick={() => setSkuCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 border border-slate-200 rounded-lg text-slate-600 transition-all font-semibold flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed text-[10.5px] uppercase tracking-wide"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Sebelumnya</span>
                  </button>

                  <div className="flex items-center gap-1 mx-1.5 font-mono text-[10.5px] font-black text-slate-700">
                    Halaman <span className="text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">{skuCurrentPage}</span> dari {totalSkuPages}
                  </div>

                  <button
                    disabled={skuCurrentPage === totalSkuPages}
                    onClick={() => setSkuCurrentPage(prev => Math.min(totalSkuPages, prev + 1))}
                    className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 border border-slate-200 rounded-lg text-slate-600 transition-all font-semibold flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed text-[10.5px] uppercase tracking-wide"
                  >
                    <span>Berikutnya</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
