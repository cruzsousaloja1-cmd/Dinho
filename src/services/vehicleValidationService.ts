export interface ComfortValidationResult {
  eligible: boolean;
  minYearRequired: number;
  ruleCategory: 'sedans_populares' | 'compactos_recentes' | 'suv_sedan_geral' | 'incompativel';
  ruleDescription: string;
  badgeText: string;
  feedbackMessage: string;
}

export const COMFORT_POPULAR_MODELS = [
  // Grupo 1: a partir de 2019
  { name: 'Etios Sedan', minYear: 2019, type: 'Sedan' },
  { name: 'Voyage', minYear: 2019, type: 'Sedan' },
  { name: 'Prisma', minYear: 2019, type: 'Sedan' },
  { name: 'Logan', minYear: 2019, type: 'Sedan' },
  { name: 'Cobalt', minYear: 2019, type: 'Sedan' },

  // Grupo 2: a partir de 2023
  { name: 'Argo', minYear: 2023, type: 'Hatch Premium' },
  { name: 'Polo', minYear: 2023, type: 'Hatch Premium' },

  // Grupo 3: Demais modelos (SUV, CR-V, Sedã): a partir de 2018
  { name: 'Honda CR-V', minYear: 2018, type: 'SUV' },
  { name: 'Honda HR-V', minYear: 2018, type: 'SUV' },
  { name: 'Toyota Corolla Sedã', minYear: 2018, type: 'Sedan Médio' },
  { name: 'Honda Civic Sedã', minYear: 2018, type: 'Sedan Médio' },
  { name: 'Nissan Sentra Sedã', minYear: 2018, type: 'Sedan Médio' },
  { name: 'Chevrolet Onix Plus Sedã', minYear: 2018, type: 'Sedan' },
  { name: 'Volkswagen Virtus Sedã', minYear: 2018, type: 'Sedan' },
  { name: 'Fiat Cronos Sedã', minYear: 2018, type: 'Sedan' },
  { name: 'Jeep Compass SUV', minYear: 2018, type: 'SUV' },
  { name: 'Jeep Renegade SUV', minYear: 2018, type: 'SUV' },
  { name: 'Chevrolet Tracker SUV', minYear: 2018, type: 'SUV' },
  { name: 'Volkswagen T-Cross SUV', minYear: 2018, type: 'SUV' },
  { name: 'Hyundai Creta SUV', minYear: 2018, type: 'SUV' },
  { name: 'Nissan Kicks SUV', minYear: 2018, type: 'SUV' },
];

/**
 * Valida se um modelo e ano atendem às exigências oficiais do modelo RACE Confort:
 * 1. Etios Sedan, Voyage, Prisma, Logan e Cobalt: a partir de 2019.
 * 2. Argo e Polo: a partir de 2023.
 * 3. Demais modelos: a partir de 2018 (SUV, CR-V, Sedã).
 */
export function validateComfortEligibility(
  modelName: string,
  year: number
): ComfortValidationResult {
  const normalized = (modelName || '').toLowerCase().trim();
  const validYear = Number(year) || 0;

  // 1. Grupo: Etios Sedan, Voyage, Prisma, Logan e Cobalt (a partir de 2019)
  const isGroup2019 = 
    normalized.includes('etios') ||
    normalized.includes('voyage') ||
    normalized.includes('prisma') ||
    normalized.includes('logan') ||
    normalized.includes('cobalt');

  if (isGroup2019) {
    const minYear = 2019;
    const eligible = validYear >= minYear;
    return {
      eligible,
      minYearRequired: minYear,
      ruleCategory: 'sedans_populares',
      ruleDescription: 'Etios Sedan, Voyage, Prisma, Logan e Cobalt exigem ano a partir de 2019.',
      badgeText: eligible ? 'Confort Homologado (2019+)' : 'Ano Inferior a 2019 (Apenas Econômica)',
      feedbackMessage: eligible
        ? `✅ Veículo elegível para RACE Confort! Modelo atende à exigência mínima de fabricação (2019+).`
        : `⚠️ Para Etios Sedan, Voyage, Prisma, Logan e Cobalt o ano mínimo exigido no Confort é 2019 (seu veículo é ano ${validYear}). O cadastro será direcionado para RACE Econômica.`,
    };
  }

  // 2. Grupo: Argo e Polo (a partir de 2023)
  const isGroup2023 = 
    normalized.includes('argo') ||
    normalized.includes('polo');

  if (isGroup2023) {
    const minYear = 2023;
    const eligible = validYear >= minYear;
    return {
      eligible,
      minYearRequired: minYear,
      ruleCategory: 'compactos_recentes',
      ruleDescription: 'Argo e Polo exigem ano a partir de 2023.',
      badgeText: eligible ? 'Confort Homologado (2023+)' : 'Ano Inferior a 2023 (Apenas Econômica)',
      feedbackMessage: eligible
        ? `✅ Veículo elegível para RACE Confort! Argo / Polo com fabricação recente (2023+).`
        : `⚠️ Para Argo e Polo o ano de fabricação exigido para o Confort é a partir de 2023 (seu veículo é ano ${validYear}). O veículo poderá operar na categoria RACE Econômica.`,
    };
  }

  // 3. Demais modelos autorizados: SUV, CR-V, Sedã (a partir de 2018)
  const minYear = 2018;
  const eligible = validYear >= minYear;

  const isSUVorSedan = 
    normalized.includes('suv') ||
    normalized.includes('crv') ||
    normalized.includes('cr-v') ||
    normalized.includes('hr-v') ||
    normalized.includes('hrv') ||
    normalized.includes('seda') ||
    normalized.includes('sedan') ||
    normalized.includes('corolla') ||
    normalized.includes('civic') ||
    normalized.includes('sentra') ||
    normalized.includes('virtus') ||
    normalized.includes('cronos') ||
    normalized.includes('compass') ||
    normalized.includes('renegade') ||
    normalized.includes('tracker') ||
    normalized.includes('t-cross') ||
    normalized.includes('creta') ||
    normalized.includes('kicks') ||
    normalized.includes('duster');

  return {
    eligible,
    minYearRequired: minYear,
    ruleCategory: 'suv_sedan_geral',
    ruleDescription: 'Demais modelos autorizados (SUV, CR-V, Sedãs) exigem ano a partir de 2018.',
    badgeText: eligible ? 'Confort Homologado (2018+)' : 'Ano Inferior a 2018 (Apenas Econômica)',
    feedbackMessage: eligible
      ? `✅ Veículo elegível para RACE Confort! Modelo SUV / CR-V / Sedã atende à exigência mínima de fabricação (2018+).`
      : `⚠️ Demais modelos Confort (SUVs, CR-V, Sedãs) exigem ano de fabricação a partir de 2018 (seu veículo é ano ${validYear}). O cadastro será liberado na categoria RACE Econômica.`,
  };
}
