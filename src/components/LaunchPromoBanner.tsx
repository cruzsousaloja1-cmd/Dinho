import React from 'react';
import { Clock, Sparkles } from 'lucide-react';
import {
  LAUNCH_PROMO_BANNER_TEXT,
  getLaunchPromoCountdownText,
} from '../services/promoService';

interface LaunchPromoBannerProps {
  className?: string;
  compact?: boolean;
}

export const LaunchPromoBanner: React.FC<LaunchPromoBannerProps> = ({
  className = '',
  compact = false,
}) => {
  const countdownText = getLaunchPromoCountdownText();

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
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-100/95">
            Promoção Oficial de Lançamento • Quanto antes, mais tempo!
          </p>
          <p
            className={`${
              compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
            } font-extrabold leading-snug text-white drop-shadow-sm`}
          >
            {LAUNCH_PROMO_BANNER_TEXT}
          </p>
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-black/30 border border-white/25 px-3 py-1.5 text-xs sm:text-sm font-black text-amber-100">
            <Clock className="h-4 w-4 shrink-0 text-amber-200" />
            <span>{countdownText}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
