import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { INDAIATUBA_BOUNDS, INDAIATUBA_MIN_ZOOM, INDAIATUBA_MAX_ZOOM } from '../config/indaiatuba';

interface GpsLocationPinMapProps {
  lat: number;
  lng: number;
  address: string;
}

export const GpsLocationPinMap: React.FC<GpsLocationPinMapProps> = ({ lat, lng, address }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

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

    return () => {
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
        <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-85%);">
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
      markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map);
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
    <div className="w-full h-44 sm:h-48 rounded-2xl overflow-hidden border-2 border-emerald-400 shadow-sm bg-slate-100 relative">
      <div ref={containerRef} className="w-full h-full z-0" />
    </div>
  );
};
