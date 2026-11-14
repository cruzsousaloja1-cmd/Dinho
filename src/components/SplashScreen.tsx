import React, { useEffect, useRef } from 'react';

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
      className="fixed inset-0 z-[9999] bg-[#000000] flex flex-col items-center justify-center px-6 select-none overflow-hidden"
      role="status"
      aria-label="RACE - Indaiatuba - SP"
    >
      <div className="flex flex-col items-center justify-center text-center">
        <h1 className="text-[80px] leading-none font-heading font-black tracking-tight uppercase text-center bg-gradient-to-b from-[#ff0000] via-[#ff2600] to-[#ff6a00] bg-clip-text text-transparent drop-shadow-[0_0_28px_rgba(255,40,0,0.45)]">
          RACE
        </h1>
        <p className="mt-3 text-xs sm:text-sm font-medium text-white tracking-widest text-center">
          Indaiatuba - SP
        </p>
      </div>
    </div>
  );
};
