import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { INDAIATUBA_BOUNDS, INDAIATUBA_MIN_ZOOM, INDAIATUBA_MAX_ZOOM } from '../config/indaiatuba';

interface GpsLocationPinMapProps {
  lat: number;
  lng: number;
  address: string;
  onPinDragged?: (newLat: number, newLng: number) => void;
  isUpdatingAddress?: boolean;
}

export const GpsLocationPinMap: React.FC<GpsLocationPinMapProps> = ({
  lat,
  lng,
  address,
  onPinDragged,
  isUpdatingAddress = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPinDraggedRef = useRef(onPinDragged);

  useEffect(() => {
    onPinDraggedRef.current = onPinDragged;
  }, [onPinDragged]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 17,
        minZoom: INDAIATUBA_MIN_ZOOM,
        maxZoom: INDAIATUBA_MAX_ZOOM,
        maxBounds: INDAIATUBA_BOUNDS,
        maxBoundsViscosity: 0.5,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      setTimeout(() => map.invalidateSize(), 100);
      setTimeout(() => map.invalidateSize(), 350);
    }

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            mapRef.current?.invalidateSize();
          }
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const pinIcon = L.divIcon({
      className: 'gps-user-pin',
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-85%);cursor:grab;">
          <div style="background:#059669;color:#ffffff;font-family:sans-serif;font-size:11px;font-weight:800;padding:3px 8px;border-radius:9999px;border:2px solid #ffffff;box-shadow:0 4px 10px rgba(0,0,0,0.35);white-space:nowrap;margin-bottom:3px;">
            Você está aqui
          </div>
          <div style="width:20px;height:20px;border-radius:9999px;background:#10b981;border:3px solid #ffffff;box-shadow:0 3px 8px rgba(0,0,0,0.4);"></div>
          <div style="width:3px;height:10px;background:#047857;border-radius:2px;margin-top:-1px;"></div>
        </div>
      `,
      iconSize: [24, 48],
      iconAnchor: [0, 0],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const marker = L.marker([lat, lng], {
        icon: pinIcon,
        draggable: true,
        autoPan: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const next = marker.getLatLng();
        if (onPinDraggedRef.current) {
          onPinDraggedRef.current(next.lat, next.lng);
        }
      });

      markerRef.current = marker;
    }

    if (address) {
      markerRef.current.bindPopup(
        `<div style="font-family:sans-serif;font-size:12px;font-weight:700;color:#0f172a;">${address}</div>`
      );
    }

    map.setView([lat, lng], 17, { animate: true });
    setTimeout(() => map.invalidateSize(), 120);
  }, [lat, lng, address]);

  return (
    <div
      className="w-full h-48 sm:h-52 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-sm bg-slate-100 relative touch-none overscroll-none"
      style={{ touchAction: 'none' }}
    >
      <div
        ref={containerRef}
        className="w-full h-full z-0 touch-none"
        style={{ touchAction: 'none' }}
      />
      <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[400] flex justify-center">
        <span className="bg-slate-900/85 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
          {isUpdatingAddress
            ? 'Buscando endereço da nova posição...'
            : 'Arraste o pino "Você está aqui" para ajustar o local exato'}
        </span>
      </div>
    </div>
  );
};
