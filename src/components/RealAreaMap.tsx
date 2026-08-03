import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { MapPin, Layers, Maximize2, Compass, CheckCircle2, Building2, Store } from 'lucide-react';
import { EAST_JAVA_BOUNDARIES } from './ModelingFeature';

interface RealAreaMapProps {
  selectedRegion: string;
  onSelectRegion: (regionKey: string) => void;
  areaMappingList: Array<{
    areaName: string;
    totalRevenue: number;
    outletsCount: number;
    totalQty: number;
  }>;
  formatCurrency: (val: number) => string;
}

// Coordinate list for the 17 Rayons
export const RAYON_COORDINATES: Record<string, { lat: number; lng: number; radiusKm: number }> = {
  'SURABAYA PUSAT': { lat: -7.2625, lng: 112.7420, radiusKm: 3.5 },
  'SURABAYA UTARA': { lat: -7.2085, lng: 112.7380, radiusKm: 4.0 },
  'SURABAYA SELATAN': { lat: -7.3050, lng: 112.7360, radiusKm: 4.0 },
  'SURABAYA BARAT': { lat: -7.2850, lng: 112.6780, radiusKm: 5.0 },
  'SURABAYA BARAT-GRESIK': { lat: -7.1600, lng: 112.6500, radiusKm: 7.0 },
  'SURABAYA-BANGKALAN': { lat: -7.0350, lng: 112.7450, radiusKm: 8.0 },
  'SAMPANG-PAMEKASAN-SUMENEP': { lat: -7.1600, lng: 113.4800, radiusKm: 25.0 },
  'SIDOARJO': { lat: -7.4478, lng: 112.7183, radiusKm: 6.0 },
  'RUNGKUT-SIDOARJO': { lat: -7.3300, lng: 112.7750, radiusKm: 4.5 },
  'SIDOARJO-SURABAYA PUSAT': { lat: -7.3400, lng: 112.7280, radiusKm: 3.5 },
  'KRIAN-MOJOKERTO': { lat: -7.4050, lng: 112.5200, radiusKm: 8.5 },
  'JOMBANG': { lat: -7.5460, lng: 112.2330, radiusKm: 10.0 },
  'LAMONGAN-TUBAN': { lat: -7.1180, lng: 112.4150, radiusKm: 12.0 },
  'TUBAN-BOJONEGORO': { lat: -6.8950, lng: 112.0480, radiusKm: 15.0 },
  'BOJONEGORO': { lat: -7.1500, lng: 111.8810, radiusKm: 12.0 },
  // User Requirement: CPO DK and KANTOR put on Waru Sidoarjo (-7.366005, 112.729817)
  'CPO DK': { lat: -7.366005, lng: 112.729817, radiusKm: 2.5 },
  'KANTOR': { lat: -7.366005, lng: 112.729817, radiusKm: 2.0 }
};

const MAP_TILES = {
  cartoDark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
  },
  cartoLight: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
  },
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  }
};

export const RealAreaMap: React.FC<RealAreaMapProps> = ({
  selectedRegion,
  onSelectRegion,
  areaMappingList,
  formatCurrency
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const circlesRef = useRef<Record<string, L.Circle>>({});

  const [tileStyle, setTileStyle] = useState<'cartoDark' | 'cartoLight' | 'osm' | 'satellite'>('cartoDark');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    // Center on East Java / Surabaya Metropolitan Area
    const map = L.map(mapContainerRef.current, {
      center: [-7.28, 112.72],
      zoom: 10,
      zoomControl: false,
      attributionControl: false
    });

    // Add Zoom Control at top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Initial Tile Layer
    const selectedTile = MAP_TILES[tileStyle];
    const tileLayer = L.tileLayer(selectedTile.url, {
      maxZoom: 18,
      attribution: selectedTile.attribution
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle Tile Style changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }
    const selectedTile = MAP_TILES[tileStyle];
    const newLayer = L.tileLayer(selectedTile.url, {
      maxZoom: 18,
      attribution: selectedTile.attribution
    }).addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  }, [tileStyle]);

  // Render & Update Markers and Circles on the real map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers and circles
    Object.values(markersRef.current).forEach((m: any) => m?.remove());
    Object.values(circlesRef.current).forEach((c: any) => c?.remove());
    markersRef.current = {};
    circlesRef.current = {};

    Object.keys(EAST_JAVA_BOUNDARIES).forEach(key => {
      const boundary = EAST_JAVA_BOUNDARIES[key];
      const coords = RAYON_COORDINATES[key] || { lat: -7.26, lng: 112.74, radiusKm: 3 };
      const data = areaMappingList.find(a => a.areaName === key) || { totalRevenue: 0, outletsCount: 0 };
      const isSelected = selectedRegion === key;

      const isWaruLocation = key === 'CPO DK' || key === 'KANTOR';

      // Custom DivIcon for Leaflet
      const iconHtml = `
        <div class="relative group cursor-pointer">
          ${isSelected ? '<div class="absolute -inset-2 rounded-2xl bg-emerald-500/30 animate-pulse blur-xs"></div>' : ''}
          <div class="relative px-2.5 py-1 rounded-xl shadow-xl border flex items-center gap-1.5 transition-all transform hover:scale-110 whitespace-nowrap ${
            isSelected
              ? 'bg-gradient-to-r from-emerald-500 to-indigo-600 text-white border-white ring-2 ring-emerald-300 font-black scale-110 z-50'
              : isWaruLocation
              ? 'bg-slate-900 text-amber-300 border-amber-500/80 font-bold hover:bg-slate-800 z-40'
              : 'bg-slate-900/95 text-slate-100 border-slate-700/80 font-semibold hover:bg-slate-800 z-30'
          }">
            <span class="text-[9px] font-mono px-1.5 py-0.2 rounded ${
              isSelected
                ? 'bg-white/20 text-white'
                : isWaruLocation
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 text-indigo-300'
            }">${boundary.code}</span>
            <span class="text-[10px] tracking-tight font-sans">${boundary.shortName}</span>
            ${isWaruLocation ? '<span class="text-[8px] bg-amber-400 text-slate-950 font-black px-1 rounded">Waru</span>' : ''}
          </div>
          ${
            isSelected
              ? `<div class="mt-0.5 text-center"><span class="bg-slate-950/90 text-emerald-300 text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/60 shadow-md inline-block">${formatCurrency(data.totalRevenue)}</span></div>`
              : ''
          }
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-marker',
        iconSize: [110, 32],
        iconAnchor: [55, 16]
      });

      // Create Marker
      const marker = L.marker([coords.lat, coords.lng], { icon: customIcon }).addTo(map);

      // Create Radius Circle
      const circle = L.circle([coords.lat, coords.lng], {
        radius: coords.radiusKm * 1000,
        color: isSelected ? '#10b981' : isWaruLocation ? '#f59e0b' : '#6366f1',
        fillColor: isSelected ? '#10b981' : isWaruLocation ? '#f59e0b' : '#6366f1',
        fillOpacity: isSelected ? 0.25 : 0.08,
        weight: isSelected ? 2.5 : 1,
        dashArray: isSelected ? undefined : '4, 4'
      }).addTo(map);

      // Popup Content
      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 4px; max-width: 240px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 900; font-size: 13px; color: #0f172a;">${boundary.fullName}</span>
            <span style="font-family: monospace; font-size: 10px; background: #e0e7ff; color: #3730a3; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${boundary.code}</span>
          </div>
          ${
            isWaruLocation
              ? `<div style="background: #fef3c7; border: 1px solid #fde68a; color: #92400e; font-size: 10px; font-weight: 800; padding: 3px 6px; border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center; gap: 4px;">
                  📍 Lokasi Fisik: Waru, Sidoarjo
                </div>`
              : ''
          }
          <div style="font-size: 11px; color: #475569; margin-bottom: 6px; line-height: 1.3;">
            <b>Hub:</b> ${boundary.hubType}<br/>
            <b>Koridor:</b> ${boundary.corridor}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background: #f8fafc; padding: 6px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 10px;">
            <div><span style="color: #64748b;">Pendapatan:</span><br/><b style="color: #047857; font-size: 11px;">${formatCurrency(data.totalRevenue)}</b></div>
            <div><span style="color: #64748b;">Total Ritel:</span><br/><b style="color: #1e293b; font-size: 11px;">${data.outletsCount} Outlet</b></div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { offset: [0, -10] });

      marker.on('click', () => {
        onSelectRegion(key);
      });

      markersRef.current[key] = marker;
      circlesRef.current[key] = circle;
    });
  }, [selectedRegion, areaMappingList, formatCurrency, onSelectRegion]);

  // Center map smoothly on selected region
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedRegion) return;

    const coords = RAYON_COORDINATES[selectedRegion];
    if (coords) {
      const zoomLevel = (selectedRegion === 'CPO DK' || selectedRegion === 'KANTOR') ? 13 : 11;
      map.flyTo([coords.lat, coords.lng], zoomLevel, {
        duration: 1.2,
        easeLinearity: 0.25
      });

      // Open popup after flyTo
      setTimeout(() => {
        if (markersRef.current[selectedRegion]) {
          markersRef.current[selectedRegion].openPopup();
        }
      }, 800);
    }
  }, [selectedRegion]);

  // Function to reset view to center of East Java
  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo([-7.28, 112.72], 9.5, { duration: 1 });
  };

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col justify-between bg-slate-950">
      {/* Top Map Header Overlay */}
      <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none flex flex-wrap items-center justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/80 text-xs text-white font-mono shadow-lg">
          <Compass className="w-4 h-4 text-emerald-400 animate-spin-slow" />
          <span className="font-bold">Leaflet OSM Real Map</span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 font-black">
            17 Rayon Real-Geo
          </span>
        </div>

        {/* Map Style Controls */}
        <div className="pointer-events-auto flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 shadow-lg">
          <button
            onClick={() => setTileStyle('cartoDark')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
              tileStyle === 'cartoDark' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Dark
          </button>
          <button
            onClick={() => setTileStyle('cartoLight')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
              tileStyle === 'cartoLight' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Light
          </button>
          <button
            onClick={() => setTileStyle('osm')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
              tileStyle === 'osm' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Street
          </button>
          <button
            onClick={() => setTileStyle('satellite')}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
              tileStyle === 'satellite' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Satelit
          </button>

          <button
            onClick={handleResetView}
            title="Reset Zoom & Center"
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-all ml-1 border-l border-slate-700"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Actual Map Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[460px] z-10" />

      {/* Bottom Floating Info Pill - Waru Notice */}
      <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-amber-500/40 text-[10px] text-amber-300 font-mono flex items-center gap-2 shadow-lg">
          <Building2 className="w-3.5 h-3.5 text-amber-400" />
          <span><b>CPO DK</b> & <b>Kantor Pusat</b>: Waru, Sidoarjo (-7.366005, 112.729817)</span>
        </div>
      </div>

      {/* Bottom Right Attribution / Legend */}
      <div className="absolute bottom-3 right-3 z-[1000] pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-[10px] text-slate-300 font-mono flex items-center gap-3 shadow-lg">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Selected Rayon</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Hub Waru</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-500"></span> Standard Rayon</span>
        </div>
      </div>
    </div>
  );
};
