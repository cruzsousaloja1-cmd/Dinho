import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Phone, 
  Share2, 
  MapPin, 
  Radio
} from 'lucide-react';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation?: string;
}

export const SosModal: React.FC<SosModalProps> = ({
  isOpen,
  onClose,
  currentLocation = 'Av. Paulista, 1578 - São Paulo / SP',
}) => {
  const [sosTriggered, setSosTriggered] = useState(false);
  const [shared, setShared] = useState(false);

  if (!isOpen) return null;

  const handleTriggerEmergency = () => {
    setSosTriggered(true);
  };

  const handleShareLocation = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Minha rota em tempo real - RACE',
        text: `Estou em trânsito com segurança pela RACE. Acompanhe minha localização ao vivo: ${currentLocation}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(`Rastreamento RACE: ${window.location.href}`);
      setShared(true);
      setTimeout(() => setShared(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white border-2 border-rose-500 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-5 text-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-300">
              <ShieldAlert className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h3 className="font-heading font-black text-rose-700 text-lg sm:text-xl">
                CENTRAL DE SEGURANÇA 24H
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Protocolo de Emergência e Proteção do Usuário
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 text-xl font-black p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Current GPS Coordinates */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3 text-sm">
          <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1 truncate">
            <span className="text-xs text-slate-500 block uppercase font-black">
              Localização GPS Atual Registrada
            </span>
            <span className="text-slate-900 font-mono text-xs sm:text-sm font-bold">{currentLocation}</span>
          </div>
        </div>

        {/* Big Emergency Trigger */}
        {!sosTriggered ? (
          <div className="space-y-3.5">
            <button
              onClick={handleTriggerEmergency}
              className="w-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-heading font-black py-4 px-6 rounded-2xl shadow-lg flex items-center justify-center gap-3 cursor-pointer transition-all border border-rose-500 animate-pulse text-base sm:text-lg"
            >
              <Radio className="w-6 h-6" />
              <span>ACIONAR ALERTA DE PÂNICO 24H</span>
            </button>
            <p className="text-xs sm:text-sm text-slate-600 text-center font-medium">
              Ao acionar, nossa central de monitoramento grava o áudio da cabine, notifica as autoridades policiais e envia viatura de apoio mais próxima.
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
            <p className="text-sm text-slate-800 font-medium">
              A Central de Operações RACE e a Polícia Militar receberam sua coordenada GPS. Mantenha a calma, o apoio está a caminho.
            </p>
          </div>
        )}

        {/* Secondary options */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <a
            href="tel:190"
            className="p-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-2xl flex items-center justify-center gap-2 text-sm font-black text-slate-900 transition-all shadow-sm"
          >
            <Phone className="w-4 h-4 text-rose-600" />
            <span>Ligar 190</span>
          </a>

          <button
            onClick={handleShareLocation}
            className="p-3.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-2xl flex items-center justify-center gap-2 text-sm font-black text-amber-900 transition-all cursor-pointer shadow-sm"
          >
            <Share2 className="w-4 h-4 text-amber-600" />
            <span>{shared ? 'Link Copiado!' : 'Compartilhar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
