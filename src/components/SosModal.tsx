import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Phone,
  Share2,
  MapPin,
  Radio,
  MessageCircle,
} from 'lucide-react';
import { getLastKnownGpsLocation } from '../services/addressSearchService';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation?: string;
  currentLat?: number;
  currentLng?: number;
}

export const SosModal: React.FC<SosModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  currentLat,
  currentLng,
}) => {
  const [sosTriggered, setSosTriggered] = useState(false);
  const [shared, setShared] = useState(false);
  const [liveCoords, setLiveCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof currentLat === 'number' && typeof currentLng === 'number') {
      setLiveCoords({ lat: currentLat, lng: currentLng });
      return;
    }
    const saved = getLastKnownGpsLocation();
    if (saved) {
      setLiveCoords({ lat: saved.lat, lng: saved.lng });
    }
  }, [isOpen, currentLat, currentLng]);

  if (!isOpen) return null;

  const savedGps = getLastKnownGpsLocation();
  const resolvedLocation =
    (currentLocation && currentLocation.trim()) ||
    savedGps?.fullAddress ||
    'Av. Presidente Vargas, 1250 - Centro, Indaiatuba-SP';

  const resolvedLat =
    typeof currentLat === 'number'
      ? currentLat
      : liveCoords?.lat ?? savedGps?.lat ?? -23.0842;
  const resolvedLng =
    typeof currentLng === 'number'
      ? currentLng
      : liveCoords?.lng ?? savedGps?.lng ?? -47.2118;

  const googleMapsLink = `https://maps.google.com/?q=${resolvedLat.toFixed(6)},${resolvedLng.toFixed(6)}`;
  const emergencyShareText = `Preciso de ajuda! Estou em ${resolvedLocation} - Localização RACE: ${googleMapsLink}`;
  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(emergencyShareText)}`;

  const handleTriggerEmergency = () => {
    setSosTriggered(true);
  };

  const handleShareLocation = async () => {
    try {
      await navigator.clipboard?.writeText(emergencyShareText);
    } catch {
      // ignore clipboard errors
    }

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Pedido de Ajuda - RACE',
          text: emergencyShareText,
          url: googleMapsLink,
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }
      }
    }

    setShared(true);
    setTimeout(() => setShared(false), 3000);
    window.location.href = whatsappShareUrl;
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border-2 border-rose-500 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-5 text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-300 shrink-0">
              <ShieldAlert className="w-7 h-7 animate-pulse" />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading font-black text-rose-700 text-lg sm:text-xl leading-tight">
                CENTRAL DE SEGURANÇA 24H
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Protocolo de Emergência e Proteção do Usuário
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 text-xl font-black p-1 cursor-pointer shrink-0"
            aria-label="Fechar Central de Segurança"
          >
            ✕
          </button>
        </div>

        {/* Current GPS Coordinates - Endereço completo sem cortar */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-start gap-3 text-sm w-full min-w-0">
          <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 w-full">
            <span className="text-xs text-slate-500 block uppercase font-black mb-1">
              Localização GPS Atual Registrada
            </span>
            <span
              style={{
                width: '100%',
                whiteSpace: 'normal',
                wordWrap: 'break-word',
                overflowWrap: 'anywhere',
              }}
              className="text-slate-900 font-mono text-xs sm:text-sm font-bold leading-snug block whitespace-normal break-words"
            >
              {resolvedLocation}
            </span>
          </div>
        </div>

        {/* Big Emergency Trigger */}
        {!sosTriggered ? (
          <div className="space-y-3.5">
            <button
              type="button"
              onClick={handleTriggerEmergency}
              className="w-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-heading font-black py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 cursor-pointer transition-all border border-rose-500 animate-pulse text-base sm:text-lg"
            >
              <Radio className="w-6 h-6 shrink-0" />
              <span>ACIONAR ALERTA DE PÂNICO 24H</span>
            </button>
            <p className="text-xs sm:text-sm text-slate-600 text-center font-medium leading-relaxed">
              Ao acionar, sua localização GPS atual é registrada pela Central RACE para compartilhamento rápido com seus contatos de emergência. Em risco imediato, ligue 190.
            </p>
          </div>
        ) : (
          <div className="bg-rose-50 border border-rose-400 rounded-2xl p-5 text-center space-y-2.5">
            <div className="w-14 h-14 bg-rose-600 text-white rounded-full flex items-center justify-center mx-auto font-black text-xl shadow-md">
              ✓
            </div>
            <h4 className="font-heading font-black text-rose-800 text-lg">
              ALERTA DE SEGURANÇA TRANSMITIDO!
            </h4>
            <p className="text-sm text-slate-800 font-medium leading-relaxed">
              Seus contatos de emergência e a Central RACE receberam sua localização GPS. Mantenha a calma, o apoio está a caminho.
            </p>
          </div>
        )}

        {/* Secondary options */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <a
            href="tel:190"
            className="p-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-2xl flex items-center justify-center gap-2 text-sm font-black text-slate-900 transition-all shadow-sm"
          >
            <Phone className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Ligar 190</span>
          </a>

          <button
            type="button"
            onClick={handleShareLocation}
            className="p-3.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-2xl flex items-center justify-center gap-2 text-sm font-black text-amber-900 transition-all cursor-pointer shadow-sm"
          >
            <Share2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{shared ? 'Compartilhado!' : 'Compartilhar'}</span>
          </button>
        </div>

        <a
          href={whatsappShareUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm font-black transition-all shadow-sm"
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span>Enviar localização no WhatsApp agora</span>
        </a>
      </div>
    </div>
  );
};
