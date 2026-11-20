import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Já rodando como app instalado (PWA standalone ou APK Capacitor): oculta automaticamente
  if (isInstalled) {
    return null;
  }

  // Fluxo Android / Chrome / Desktop (instalação direta sem propaganda e sem AppsGeyser)
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-rose-600/70 text-white font-heading font-black transition-all shadow-xs cursor-pointer active:scale-95 ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs sm:text-sm'
        }`}
        title="Instalar App RACE limpo sem propaganda"
      >
        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 shrink-0" />
        <span>{compact ? 'App' : 'Instalar App'}</span>
      </button>
    );
  }

  // Fluxo iOS Safari
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-rose-600/70 text-white font-heading font-black transition-all shadow-xs cursor-pointer active:scale-95 ${
            compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs sm:text-sm'
          }`}
          title="Instalar RACE no iPhone"
        >
          <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 shrink-0" />
          <span>{compact ? 'App' : 'Instalar App'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white border border-slate-200 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-heading font-black text-slate-950">
                  Instalar RACE no iPhone
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-slate-400 hover:text-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-700 font-medium leading-relaxed">
                1. Toque no botão <strong>Compartilhar</strong> na barra do Safari.<br />
                2. Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.<br />
                3. O ícone <strong>RACE</strong> abre em tela cheia, limpo e sem propaganda.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-2xl bg-slate-950 hover:bg-slate-800 py-3 text-sm font-heading font-black text-white cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1200] flex items-center gap-2 rounded-full bg-slate-950 border border-amber-400 px-3.5 py-1.5 text-xs font-heading font-black text-amber-300 shadow-lg">
      <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
      <span>Sem conexão — aguardando internet</span>
    </div>
  );
};
