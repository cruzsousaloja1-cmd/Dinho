import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Driver, LocationPoint, RideStatus } from '../types';
import { Compass, Crosshair, Navigation, ShieldCheck } from 'lucide-react';

interface MapRealtimeProps {
  drivers: Driver[];
  pickup: LocationPoint | null;
  destination: LocationPoint | null;
  activeDriver: Driver | null;
  rideStatus: RideStatus;
  driverPosition?: { lat: number; lng: number };
  onMapClick?: (coords: { lat: number; lng: number; address: string }) => void;
  selectionMode?: 'pickup' | 'destination' | null;
}

export const MapRealtime: React.FC<MapRealtimeProps> = ({
  drivers,
  pickup,
  destination,
  activeDriver,
  driverPosition,
  onMapClick,
  selectionMode,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Default initial center: São Paulo / Paulista corridor
  const defaultCenter: [number, number] = [-23.5615, -46.6558];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 14,
        zoomControl: false,
      });

      // CartoDB Voyager light tiles for crisp white/light theme
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Invalidate size shortly after mount to ensure crisp full-container rendering
      setTimeout(() => {
        map.invalidateSize();
      }, 250);

      // Handle map clicks
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const fakeAddress = `Ponto no Mapa (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        if (onMapClick) {
          onMapClick({ lat, lng, address: fakeAddress });
        }
      });
    }

    const handleResize = () => {
      mapInstanceRef.current?.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update drivers markers on map
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const driversToShow = activeDriver ? [activeDriver] : drivers;

    // Clear old driver markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!driversToShow.some((d) => d.id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    driversToShow.forEach((drv) => {
      const isBike = drv.category.includes('moto');
      const isDelivery = drv.category === 'moto_entrega';
      const pos: [number, number] =
        activeDriver?.id === drv.id && driverPosition
          ? [driverPosition.lat, driverPosition.lng]
          : [drv.lat, drv.lng];

      const iconHtml = `
        <div class="relative flex items-center justify-center transform transition-transform hover:scale-110">
          <div class="absolute w-10 h-10 rounded-full ${
            isDelivery
              ? 'bg-purple-500/25'
              : isBike
              ? 'bg-cyan-500/25'
              : 'bg-amber-500/25'
          } animate-ping"></div>
          <div class="relative w-9 h-9 rounded-full shadow-lg border-2 ${
            isDelivery
              ? 'bg-purple-600 border-white text-white'
              : isBike
              ? 'bg-cyan-600 border-white text-white'
              : 'bg-amber-500 border-white text-slate-950'
          } flex items-center justify-center font-bold text-sm shadow-md">
            ${isDelivery ? '📦' : isBike ? '🏍️' : '🚗'}
          </div>
          <span class="absolute -bottom-6 text-xs whitespace-nowrap bg-white text-slate-900 px-2 py-0.5 rounded-md font-mono font-bold border border-slate-300 shadow-md">
            ${drv.vehiclePlate}
          </span>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-driver-icon',
        html: iconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      if (markersRef.current[drv.id]) {
        markersRef.current[drv.id].setLatLng(pos);
      } else {
        const marker = L.marker(pos, { icon: customIcon }).addTo(map);
        marker.bindPopup(`
          <div style="color: #0f172a; font-family: sans-serif; padding: 6px;">
            <b style="font-size: 14px; font-weight: bold;">${drv.name}</b><br/>
            <span style="font-size: 12px; color: #475569;">${drv.vehicleModel} (${drv.vehiclePlate})</span><br/>
            <span style="font-size: 12px; color: #16a34a; font-weight: bold;">⭐ ${drv.rating.toFixed(2)} • 100% dos Ganhos</span>
          </div>
        `);
        markersRef.current[drv.id] = marker;
      }
    });
  }, [drivers, activeDriver, driverPosition]);

  // Update pickup and destination markers & route polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Pickup marker
    if (pickup) {
      if (!pickupMarkerRef.current) {
        const pickupIcon = L.divIcon({
          className: 'pickup-marker',
          html: `
            <div class="relative flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center border-2 border-white shadow-xl text-xs">
                🟢
              </div>
              <div class="bg-white text-emerald-700 text-xs px-2 py-0.5 rounded-md border border-emerald-300 mt-1 font-bold whitespace-nowrap shadow-md">
                Embarque
              </div>
            </div>
          `,
          iconSize: [32, 44],
          iconAnchor: [16, 22],
        });
        pickupMarkerRef.current = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon }).addTo(map);
      } else {
        pickupMarkerRef.current.setLatLng([pickup.lat, pickup.lng]);
      }
    } else if (pickupMarkerRef.current) {
      pickupMarkerRef.current.remove();
      pickupMarkerRef.current = null;
    }

    // Destination marker
    if (destination) {
      if (!destMarkerRef.current) {
        const destIcon = L.divIcon({
          className: 'dest-marker',
          html: `
            <div class="relative flex flex-col items-center">
              <div class="w-8 h-8 rounded-full bg-amber-500 text-slate-950 font-bold flex items-center justify-center border-2 border-white shadow-xl text-xs">
                🏁
              </div>
              <div class="bg-white text-amber-700 text-xs px-2 py-0.5 rounded-md border border-amber-300 mt-1 font-bold whitespace-nowrap shadow-md">
                Destino
              </div>
            </div>
          `,
          iconSize: [32, 44],
          iconAnchor: [16, 22],
        });
        destMarkerRef.current = L.marker([destination.lat, destination.lng], { icon: destIcon }).addTo(map);
      } else {
        destMarkerRef.current.setLatLng([destination.lat, destination.lng]);
      }
    } else if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    // Route Polyline
    if (pickup && destination) {
      const midLat = (pickup.lat + destination.lat) / 2 + 0.003;
      const midLng = (pickup.lng + destination.lng) / 2 - 0.004;

      const routePoints: [number, number][] = [
        [pickup.lat, pickup.lng],
        [midLat, midLng],
        [destination.lat, destination.lng],
      ];

      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs(routePoints);
      } else {
        routePolylineRef.current = L.polyline(routePoints, {
          color: '#d97706',
          weight: 5,
          opacity: 0.9,
          dashArray: '8, 8',
        }).addTo(map);
      }

      const bounds = L.latLngBounds(routePoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (routePolylineRef.current) {
      routePolylineRef.current.remove();
      routePolylineRef.current = null;
    }
  }, [pickup, destination]);

  const handleCenterOnUser = () => {
    if (!mapInstanceRef.current) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          mapInstanceRef.current?.setView([lat, lng], 15);
        },
        () => {
          mapInstanceRef.current?.setView(defaultCenter, 15);
        }
      );
    } else {
      mapInstanceRef.current.setView(defaultCenter, 15);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[180px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
      {/* Real Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating GPS HUD overlay */}
      <div className="absolute top-3 left-3 z-[400] flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 flex items-center gap-2.5 text-xs sm:text-sm text-slate-800 shadow-md">
          <span className="w-3 h-3 rounded-full bg-emerald-500 radar-pulse" />
          <span className="font-heading font-extrabold text-amber-700 tracking-wide text-xs sm:text-sm">
            GPS EM TEMPO REAL
          </span>
          <span className="text-xs text-slate-500 border-l border-slate-200 pl-2 font-mono">
            Telemetria 18ms
          </span>
        </div>

        <div className="hidden sm:flex bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 items-center gap-1.5 text-xs sm:text-sm text-slate-700 font-medium shadow-md">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Monitoramento 24h</span>
        </div>
      </div>

      {/* Selection Mode helper tip */}
      {selectionMode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-[400] bg-amber-500 text-slate-950 px-5 py-2 rounded-full font-extrabold text-sm shadow-xl animate-bounce flex items-center gap-2 border border-amber-300">
          <Crosshair className="w-4 h-4" />
          <span>Toque no mapa para marcar {selectionMode === 'pickup' ? 'o ponto de embarque' : 'o destino final'}</span>
        </div>
      )}

      {/* Floating GPS Controls */}
      <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-2">
        <button
          onClick={handleCenterOnUser}
          title="Minha Localização"
          className="w-12 h-12 bg-white hover:bg-slate-50 active:scale-95 text-amber-600 rounded-xl border border-slate-300 shadow-xl flex items-center justify-center transition-all cursor-pointer"
        >
          <Navigation className="w-5 h-5" />
        </button>

        <button
          onClick={() => mapInstanceRef.current?.setView(defaultCenter, 14)}
          title="Visão Geral Central"
          className="w-12 h-12 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 rounded-xl border border-slate-300 shadow-xl flex items-center justify-center transition-all cursor-pointer"
        >
          <Compass className="w-5 h-5" />
        </button>
      </div>

      {/* Live Active Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 flex items-center gap-3.5 text-xs sm:text-sm text-slate-800 shadow-md font-medium">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="font-semibold">Carros</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-cyan-500" />
          <span className="font-semibold">Moto Táxi</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="font-semibold">Entregas Flash</span>
        </div>
      </div>
    </div>
  );
};
