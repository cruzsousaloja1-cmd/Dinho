import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Driver, LocationPoint, RideStatus } from '../types';
import { Compass, Crosshair, Navigation, ShieldCheck } from 'lucide-react';

import { 
  INDAIATUBA_CENTER_COORDS, 
  INDAIATUBA_BOUNDS, 
  INDAIATUBA_MIN_ZOOM, 
  INDAIATUBA_MAX_ZOOM, 
  INDAIATUBA_DEFAULT_ZOOM 
} from '../config/indaiatuba';

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
  rideStatus,
  driverPosition,
  onMapClick,
  selectionMode,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineBorderRef = useRef<L.Polyline | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Centro fixo oficial: Indaiatuba-SP
  const defaultCenter = INDAIATUBA_CENTER_COORDS;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [-23.0903, -47.2180],
        zoom: 16,
        minZoom: INDAIATUBA_MIN_ZOOM,
        maxZoom: INDAIATUBA_MAX_ZOOM,
        maxBounds: INDAIATUBA_BOUNDS,
        maxBoundsViscosity: 0.5,
        dragging: true,
        scrollWheelZoom: true,
        touchZoom: true,
        doubleClickZoom: true,
        zoomControl: true,
      });

      // OpenStreetMap Oficial Claro - Ruas nítidas com nomes
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Invalidate size shortly after mount to ensure crisp full-container rendering
      map.invalidateSize();
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
      setTimeout(() => {
        map.invalidateSize();
      }, 350);

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

  // Update drivers markers on map with REAL TOP-DOWN VEHICLES (no circles, no balls)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const isAccepted =
      rideStatus === 'accepted' ||
      (rideStatus as string) === 'aceita' ||
      rideStatus === 'driver_assigned' ||
      rideStatus === 'driver_arriving' ||
      rideStatus === 'in_progress' ||
      rideStatus === 'completed' ||
      rideStatus === 'finalizada';

    const driversToShow = isAccepted && activeDriver
      ? [activeDriver]
      : drivers.filter((d) => d.status === 'online');

    // Clear old driver markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!driversToShow.some((d) => (d.id || d.email) === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    driversToShow.forEach((drv, idx) => {
      const markerKey = drv.id || drv.email || `drv-${idx}`;
      const isBike = drv.category.includes('moto');
      const offsetLat = !isAccepted ? (((idx % 5) - 2) * 0.0022) : 0;
      const offsetLng = !isAccepted ? ((Math.floor(idx / 5) - 1) * 0.0025 + ((idx % 2) ? 0.0014 : -0.0014)) : 0;
      const pos: [number, number] =
        isAccepted && activeDriver && (activeDriver.id === drv.id || activeDriver.email === drv.email) && driverPosition
          ? [driverPosition.lat, driverPosition.lng]
          : [drv.lat + offsetLat, drv.lng + offsetLng];

      const vehicleSvg = isBike
        ? `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45));">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
              <rect x="22" y="3" width="4" height="9" rx="2" fill="#18181b" stroke="#ffffff" stroke-width="0.8" />
              <line x1="12" y1="12" x2="36" y2="12" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" />
              <rect x="10" y="10.5" width="4" height="3" rx="1.5" fill="#ff6a00" />
              <rect x="34" y="10.5" width="4" height="3" rx="1.5" fill="#ff6a00" />
              <ellipse cx="24" cy="5" rx="2.5" ry="1.5" fill="#ffffff" />
              <path d="M21 14C21 13 22 12.5 24 12.5C26 12.5 27 13 27 14L28 20C28 21 26.5 22 24 22C21.5 22 20 21 20 20L21 14Z" fill="#ff6a00" stroke="#ffffff" stroke-width="1" />
              <circle cx="24" cy="25" r="5" fill="#18181b" stroke="#ffffff" stroke-width="1.2" />
              <path d="M21.5 22.5C22.5 21.8 25.5 21.8 26.5 22.5" stroke="#ff6a00" stroke-width="2" stroke-linecap="round" />
              <rect x="21" y="29" width="6" height="8" rx="3" fill="#27272a" />
              <rect x="22" y="36" width="4" height="9" rx="2" fill="#18181b" stroke="#ffffff" stroke-width="0.8" />
            </svg>
          </div>
          <span style="font-family: monospace; font-size: 10px; font-weight: 800; background: #09090b; color: #ff6a00; border: 1.5px solid #ffffff; padding: 1px 6px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 3px 5px rgba(0,0,0,0.3); margin-top: -2px;">
            ${drv.vehiclePlate}
          </span>
        </div>
        `
        : `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.45));">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none">
              <rect x="7" y="10" width="4" height="8" rx="2" fill="#18181b" />
              <rect x="37" y="10" width="4" height="8" rx="2" fill="#18181b" />
              <rect x="7" y="30" width="4" height="8" rx="2" fill="#18181b" />
              <rect x="37" y="30" width="4" height="8" rx="2" fill="#18181b" />
              <rect x="6" y="15" width="4" height="3" rx="1.5" fill="#e05e00" stroke="#ffffff" stroke-width="0.8" />
              <rect x="38" y="15" width="4" height="3" rx="1.5" fill="#e05e00" stroke="#ffffff" stroke-width="0.8" />
              <path d="M14 12C14 7 17 4 24 4C31 4 34 7 34 12V36C34 41 31 44 24 44C17 44 14 41 14 36V12Z" fill="#ff6a00" stroke="#ffffff" stroke-width="1.8" />
              <ellipse cx="16.5" cy="6.5" rx="2" ry="1.2" fill="#ffffff" />
              <ellipse cx="31.5" cy="6.5" rx="2" ry="1.2" fill="#ffffff" />
              <path d="M16 14C17 12 20 11 24 11C28 11 31 12 32 14L31 18H17L16 14Z" fill="#09090b" stroke="#3f3f46" stroke-width="0.8" />
              <rect x="17.5" y="19" width="13" height="12" rx="2" fill="#e05e00" />
              <rect x="19" y="21" width="10" height="7" rx="1.5" fill="#18181b" opacity="0.85" />
              <path d="M17 32H31L32 35C31 36.5 28 37 24 37C20 37 17 36.5 16 35L17 32Z" fill="#09090b" stroke="#3f3f46" stroke-width="0.8" />
              <rect x="15.5" y="42" width="4.5" height="1.8" rx="0.9" fill="#ef4444" />
              <rect x="28" y="42" width="4.5" height="1.8" rx="0.9" fill="#ef4444" />
            </svg>
          </div>
          <span style="font-family: monospace; font-size: 10px; font-weight: 800; background: #09090b; color: #ff6a00; border: 1.5px solid #ffffff; padding: 1px 6px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 3px 5px rgba(0,0,0,0.3); margin-top: -2px;">
            ${drv.vehiclePlate}
          </span>
        </div>
        `;

      const customIcon = L.divIcon({
        className: 'real-topdown-vehicle',
        html: vehicleSvg,
        iconSize: [44, 58],
        iconAnchor: [22, 22],
      });

      if (markersRef.current[markerKey]) {
        markersRef.current[markerKey].setLatLng(pos);
      } else {
        const marker = L.marker(pos, { icon: customIcon }).addTo(map);
        marker.bindPopup(`
          <div style="color: #0f172a; font-family: sans-serif; padding: 6px;">
            <b style="font-size: 14px; font-weight: bold;">${drv.name}</b><br/>
            <span style="font-size: 12px; color: #475569;">${drv.vehicleModel} (${drv.vehiclePlate})</span><br/>
            <span style="font-size: 12px; color: #16a34a; font-weight: bold;">⭐ ${drv.rating.toFixed(2)} • Parceiro Oficial RACE</span>
          </div>
        `);
        markersRef.current[markerKey] = marker;
      }
    });
  }, [drivers, activeDriver, driverPosition, rideStatus]);

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

    // Route Polyline com borda branca e linha laranja #ff6a00 (oculta durante MODO PROCURANDO)
    const isSearchingStatus =
      rideStatus === 'searching' ||
      (rideStatus as string) === 'procurando' ||
      rideStatus === 'procurando_motorista';
    if (pickup && destination && !isSearchingStatus) {
      const midLat = (pickup.lat + destination.lat) / 2 + 0.003;
      const midLng = (pickup.lng + destination.lng) / 2 - 0.004;

      const routePoints: [number, number][] = [
        [pickup.lat, pickup.lng],
        [midLat, midLng],
        [destination.lat, destination.lng],
      ];

      // Borda branca externa
      if (routePolylineBorderRef.current) {
        routePolylineBorderRef.current.setLatLngs(routePoints);
      } else {
        routePolylineBorderRef.current = L.polyline(routePoints, {
          color: '#ffffff',
          weight: 10,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      }

      // Linha laranja grossa principal
      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs(routePoints);
      } else {
        routePolylineRef.current = L.polyline(routePoints, {
          color: '#ff6a00',
          weight: 6,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(map);
      }

      const bounds = L.latLngBounds(routePoints);
      map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      if (routePolylineBorderRef.current) {
        routePolylineBorderRef.current.remove();
        routePolylineBorderRef.current = null;
      }
      if (routePolylineRef.current) {
        routePolylineRef.current.remove();
        routePolylineRef.current = null;
      }
    }
  }, [pickup, destination, rideStatus]);

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
    <div className="relative w-full h-full min-h-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Real Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating GPS HUD overlay */}
      <div className="absolute top-2 left-2 z-[400] flex items-center gap-1.5 pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5 text-xs text-slate-800 shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 radar-pulse" />
          <span className="font-heading font-black text-amber-700 tracking-wide text-[11px]">
            INDAIATUBA - SP
          </span>
          <span className="text-[10px] text-slate-500 border-l border-slate-200 pl-1.5 font-mono">
            GPS
          </span>
        </div>
      </div>

      {/* Selection Mode helper tip */}
      {selectionMode && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[400] bg-amber-500 text-slate-950 px-3 py-1 rounded-full font-bold text-xs shadow-md animate-bounce flex items-center gap-1.5 border border-amber-300">
          <Crosshair className="w-3.5 h-3.5" />
          <span>Toque no mapa para marcar {selectionMode === 'pickup' ? 'embarque' : 'destino'}</span>
        </div>
      )}

      {/* Floating GPS Controls */}
      <div className="absolute bottom-2 right-2 z-[400] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleCenterOnUser}
          title="Minha Localização"
          className="w-8 h-8 bg-white hover:bg-slate-50 active:scale-95 text-amber-600 rounded-lg border border-slate-300 shadow-md flex items-center justify-center transition-all cursor-pointer"
        >
          <Navigation className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => mapInstanceRef.current?.setView(defaultCenter, INDAIATUBA_DEFAULT_ZOOM)}
          title="Centro de Indaiatuba"
          className="w-8 h-8 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 rounded-lg border border-slate-300 shadow-md flex items-center justify-center transition-all cursor-pointer"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Live Active Legend */}
      <div className="absolute bottom-2 left-2 z-[400] bg-white/95 backdrop-blur-md px-2 py-0.5 rounded-lg border border-slate-200 flex items-center gap-2 text-[10px] text-slate-700 shadow-sm font-semibold">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Carro</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-cyan-500" />
          <span>Moto</span>
        </div>
      </div>
    </div>
  );
};
