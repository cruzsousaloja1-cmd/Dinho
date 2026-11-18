import React from 'react';

export const DRIVER_BENEFITS_ITEMS: readonly string[] = [
  '100% das corridas pra você até 17/12/2026 - SEM TAXA',
  'Depois só 15% de taxa - você fica com 85% - SEM MENSALIDADE',
  'Pagamento toda sexta-feira via PIX',
  'SEM LIMITE DE INDICAÇÃO ATÉ A DATA 17/12/2026 - indique quantos quiser',
  'Ganhe R$50 a cada motorista/motoboy indicado que fizer 10 corridas',
  'Ganhe R$10 de crédito a cada passageiro indicado que fizer 1ª corrida',
  'Você trabalha quando quiser - sem chefe, sem horário',
  'Corridas e entregas em Indaiatuba',
];

interface DriverBenefitsBoxProps {
  compact?: boolean;
  className?: string;
}

export const DriverBenefitsBox: React.FC<DriverBenefitsBoxProps> = ({
  compact = false,
  className = '',
}) => {
  return (
    <div
      className={`rounded-2xl bg-black/55 border border-yellow-400/70 text-left shadow-lg ${
        compact ? 'p-3.5 sm:p-4 space-y-2' : 'p-4 sm:p-5 space-y-2.5'
      } ${className}`}
    >
      <h4
        className={`font-heading font-black text-yellow-300 uppercase tracking-wide leading-snug ${
          compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
        }`}
      >
        POR QUE CADASTRAR COMO MOTORISTA / MOTOBOY NO RACE?
      </h4>
      <ul className={compact ? 'space-y-1.5' : 'space-y-2'}>
        {DRIVER_BENEFITS_ITEMS.map((benefit) => (
          <li
            key={benefit}
            className={`flex items-start gap-2 font-semibold text-white leading-snug ${
              compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm'
            }`}
          >
            <span aria-hidden="true" className="shrink-0 leading-none mt-0.5">
              ✅
            </span>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
