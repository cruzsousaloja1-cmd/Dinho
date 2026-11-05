import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Driver, LocationPoint, Ride } from '../types';
import { 
  ArrowLeft, 
  Crosshair 
} from 'lucide-react';

interface FullMapViewProps {
  onClose: () => void;
  pickup: LocationPoint | null;
  destination: LocationPoint | null;
  activeDriver: Driver | null;
  activeRide: Ride | null;
  driverPosition?: { lat: number; lng: number };
  onUpdateDriverPosition?: (pos: { lat: number; lng: number }) => void;
}

export const FullMapView: React.FC<FullMapViewProps> = ({
  onClose,
  pickup,
  destination,
  activeDriver,
  activeRide,
  driverPosition,
  onUpdateDriverPosition,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const pickupMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  // Fallback pickup point: Av. Paulista, 1578
  const defaultPickupLat = pickup?.lat ?? -23.5615;
  const defaultPickupLng = pickup?.lng ?? -46.6558;

  // Driver details: from activeRide, activeDriver or realistic simulation
  const effectiveDriver: Driver = activeRide?.driver || activeDriver || {
    id: 'drv-sim',
    name: 'Marcos Silva',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    phone: '(11) 98721-4321',
    email: 'motorista@race.com',
    cpf: '000.***.***-00',
    cnh: '01234567890',
    category: 'economica',
    vehicleModel: 'Chevrolet Onix Plus',
    vehiclePlate: 'BRA2E19',
    vehicleColor: 'Prata',
    vehicleYear: 2024,
    rating: 4.98,
    totalRides: 1420,
    status: 'online',
    lat: defaultPickupLat + 0.0095,
    lng: defaultPickupLng - 0.0085,
    weeklyPlanActive: true,
    weeklyFeePaidAt: new Date().toISOString(),
    weeklyFeeExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    earningsToday: 180,
    earningsWeek: 1240,
    cnhVerified: true,
    vehicleVerified: true,
    criminalRecordClear: true,
    registrationDate: '2024-01-01',
  };

  // Car position state: initializes at starting offset ~1.2 km away
  const [carPos, setCarPos] = useState<{ lat: number; lng: number }>(() => {
    if (driverPosition) return driverPosition;
    if (effectiveDriver.lat && effectiveDriver.lng) {
      return { lat: effectiveDriver.lat, lng: effectiveDriver.lng };
    }
    return { lat: defaultPickupLat + 0.0095, lng: defaultPickupLng - 0.0085 };
  });

  // Initialize Fullscreen Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [carPos.lat, carPos.lng],
        zoom: 15,
        zoomControl: false,
      });

      // CartoDB Dark Matter tiles for sleek black & orange visual
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Zoom control bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update pickup marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const pickupLat = pickup?.lat ?? defaultPickupLat;
    const pickupLng = pickup?.lng ?? defaultPickupLng;

    const pickupHtml = `
      <div class="relative flex flex-col items-center">
        <div class="w-8 h-8 rounded-full bg-emerald-500 text-black font-black flex items-center justify-center border-2 border-white shadow-2xl text-xs">
          👤
        </div>
        <div class="bg-black/90 text-white text-[10px] px-2 py-0.5 rounded-md border border-emerald-500 mt-1 font-bold whitespace-nowrap shadow-xl">
          Seu Embarque
        </div>
      </div>
    `;

    const pickupIcon = L.divIcon({
      className: 'pickup-full-marker',
      html: pickupHtml,
      iconSize: [36, 44],
      iconAnchor: [18, 22],
    });

    if (pickupMarkerRef.current) {
      pickupMarkerRef.current.setLatLng([pickupLat, pickupLng]);
    } else {
      pickupMarkerRef.current = L.marker([pickupLat, pickupLng], { icon: pickupIcon }).addTo(map);
    }
  }, [pickup]);

  // Update Driver Marker, Route Polyline (laranja #ff6a00) and ETA
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const pickupLat = pickup?.lat ?? defaultPickupLat;
    const pickupLng = pickup?.lng ?? defaultPickupLng;

    // Driver Marker with animated pulsing ping
    const driverHtml = `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-12 h-12 rounded-full bg-[#ff6a00]/30 animate-ping"></div>
        <div class="relative w-10 h-10 rounded-full shadow-2xl bg-[#ff6a00] border-2 border-white flex items-center justify-center text-white text-lg">
          🚗
        </div>
        <span class="absolute -bottom-6 text-[10px] whitespace-nowrap bg-black text-white px-2 py-0.5 rounded font-mono font-bold border border-zinc-700 shadow-xl">
          ${effectiveDriver.vehiclePlate}
        </span>
      </div>
    `;

    const driverIcon = L.divIcon({
      className: 'driver-full-marker',
      html: driverHtml,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([carPos.lat, carPos.lng]);
    } else {
      driverMarkerRef.current = L.marker([carPos.lat, carPos.lng], { icon: driverIcon }).addTo(map);
    }

    // Curva suave da rota do motorista até o passageiro com linha laranja #ff6a00
    const midLat = (carPos.lat + pickupLat) / 2 + 0.0012;
    const midLng = (carPos.lng + pickupLng) / 2 - 0.0018;

    const routePoints: [number, number][] = [
      [carPos.lat, carPos.lng],
      [midLat, midLng],
      [pickupLat, pickupLng],
    ];

    if (routePolylineRef.current) {
      routePolylineRef.current.setLatLngs(routePoints);
    } else {
      routePolylineRef.current = L.polyline(routePoints, {
        color: '#ff6a00',
        weight: 6,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    }
  }, [carPos, pickup]);

  // 3. Animação do carro andando: o marcador do motorista se move a cada 2 segundos em direção ao ponto de embarque
  useEffect(() => {
    const pickupLat = pickup?.lat ?? defaultPickupLat;
    const pickupLng = pickup?.lng ?? defaultPickupLng;

    let step = 0;
    const totalSteps = 45; // ~90 segundos para chegar
    const startLat = carPos.lat;
    const startLng = carPos.lng;

    const interval = setInterval(() => {
      step += 1;
      const progress = Math.min(step / totalSteps, 1);
      const nextLat = startLat + (pickupLat - startLat) * progress;
      const nextLng = startLng + (pickupLng - startLng) * progress;

      setCarPos({ lat: nextLat, lng: nextLng });
      if (onUpdateDriverPosition) {
        onUpdateDriverPosition({ lat: nextLat, lng: nextLng });
      }

      if (progress >= 1) {
        clearInterval(interval);
      }
    }, 2000); // 2 segundos conforme requisito

    return () => clearInterval(interval);
  }, []);

  // Botão "Centralizar" para seguir o carro
  const handleCenterOnCar = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([carPos.lat, carPos.lng], 16, { animate: true });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-white flex flex-col w-screen h-screen overflow-hidden select-none">
      {/* Botão VOLTAR no topo esquerdo */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 left-4 z-[1000] bg-[#ff6a00] hover:bg-[#e05e00] active:scale-95 text-white font-heading font-black text-xs sm:text-sm py-2.5 px-4 rounded-2xl shadow-2xl flex items-center gap-2 transition-all cursor-pointer border border-[#ff8533]"
      >
        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
        <span>VOLTAR</span>
      </button>

      {/* Botão Centralizar no Carro minimalista no canto inferior direito */}
      <button
        type="button"
        onClick={handleCenterOnCar}
        className="absolute bottom-6 right-6 z-[1000] w-12 h-12 bg-black/85 hover:bg-[#ff6a00] border border-zinc-700 hover:border-[#ff8533] active:scale-95 text-[#ff6a00] hover:text-white rounded-2xl shadow-2xl flex items-center justify-center transition-all cursor-pointer"
        title="Centralizar no Carro"
      >
        <Crosshair className="w-5 h-5" />
      </button>

      {/* Mapa Leaflet Grande Ocupando 100% da Altura e Largura Sem Nenhuma Informação por Cima */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />
    </div>
  );
};
