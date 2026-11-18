import React from 'react';
import { Sparkles } from 'lucide-react';
import { LAUNCH_PROMO_BANNER_TEXT } from '../services/promoService';

interface LaunchPromoBannerProps {
  className?: string;
  compact?: boolean;
}

export const LaunchPromoBanner: React.FC<LaunchPromoBannerProps> = ({
  className = '',
  compact = false,
}) => {
  return (
    <div
      role="region"
      aria-label="Promoção de Lançamento RACE"
      className={`w-full rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white shadow-lg shadow-orange-950/30 border border-orange-300/40 ${
        compact ? 'px-3.5 py-2.5' : 'px-4 py-3.5 sm:px-5 sm:py-4'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black/20 border border-white/25 text-amber-100">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-100/95 mb-0.5">
            Promoção Oficial de Lançamento
          </p>
          <p
            className={`${
              compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
            } font-extrabold leading-snug text-white drop-shadow-sm`}
          >
            {LAUNCH_PROMO_BANNER_TEXT}
          </p>
        </div>
      </div>
    </div>
  );
};
