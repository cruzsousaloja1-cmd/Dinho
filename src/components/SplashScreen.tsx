import React, { useEffect, useRef } from 'react';
import { getRaceCircleIconUrl } from '../utils/brandAssets';

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  durationMs = 3000,
}) => {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const raceIconUrl = getRaceCircleIconUrl();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onCompleteRef.current();
    }, durationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [durationMs]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-[#000000] flex flex-col items-center justify-center px-4 select-none overflow-hidden"
      role="status"
      aria-label="RACE - Indaiatuba - SP"
    >
      <div className="flex flex-col items-center justify-center text-center">
        <img
          src={raceIconUrl}
          alt="RACE"
          className="w-56 h-56 sm:w-64 sm:h-64 rounded-full object-contain drop-shadow-[0_0_32px_rgba(255,20,40,0.45)]"
        />
        <p className="mt-5 text-xs sm:text-sm font-semibold text-white/90 tracking-widest text-center">
          Indaiatuba - SP
        </p>
      </div>
    </div>
  );
};
