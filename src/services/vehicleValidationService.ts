export interface ComfortValidationResult {
  eligible: boolean;
  minYearRequired: number;
  ruleCategory: 'sedans_populares' | 'compactos_recentes' | 'suv_sedan_geral' | 'incompativel';
  ruleDescription: string;
  badgeText: string;
  feedbackMessage: string;
}

export const COMFORT_POPULAR_MODELS = [
  { name: 'Toyota Corolla', minYear: 2020, type: 'Sedã' },
  { name: 'Honda Civic', minYear: 2020, type: 'Sedã' },
  { name: 'VW T-Cross', minYear: 2020, type: 'SUV' },
  { name: 'Hyundai Creta', minYear: 2020, type: 'SUV' },
  { name: 'Jeep Compass', minYear: 2020, type: 'SUV' },
  { name: 'VW Nivus', minYear: 2020, type: 'SUV' },
  { name: 'VW Virtus', minYear: 2020, type: 'Sedã' },
  { name: 'Chevrolet Onix Plus', minYear: 2020, type: 'Sedã' },
];

export function isBasicPopularOneLiterModel(modelName: string): boolean {
  const n = (modelName || '').toLowerCase().trim();
  if (!n) return false;
  if (n.includes('onix plus')) return false;
  if (n.includes('1.0') && !n.includes('turbo') && !n.includes('tsi') && !n.includes('virtus') && !n.includes('nivus') && !n.includes('t-cross')) {
    return true;
  }
  const basicPopularTerms = ['kwid', 'mobi', 'uno ', 'gol ', 'celta', 'palio', 'march', 'ka 1.0', 'sandero 1.0', 'básico', 'basico'];
  return basicPopularTerms.some((term) => n.includes(term));
}

/**
 * Valida se um modelo e ano atendem às exigências oficiais do Motorista Confort:
 * - Automóvel a partir de 2020 (até 5 anos de uso)
 * - SUV, Sedã ou Hatch Premium (NÃO aceita carro popular 1.0 básico)
 */
export function validateComfortEligibility(
  modelName: string,
  year: number
): ComfortValidationResult {
  const validYear = Number(year) || 0;
  const minYear = 2020;

  if (validYear > 0 && validYear < minYear) {
    return {
      eligible: false,
      minYearRequired: minYear,
      ruleCategory: 'incompativel',
      ruleDescription: 'Automóvel a partir de 2020 (SUV, Sedã ou Hatch Premium).',
      badgeText: 'Ano Inferior a 2020',
      feedbackMessage: 'Seu veículo não atende Confort (mínimo 2020). Você pode se cadastrar como Motorista Econômico.',
    };
  }

  if (isBasicPopularOneLiterModel(modelName)) {
    return {
      eligible: false,
      minYearRequired: minYear,
      ruleCategory: 'incompativel',
      ruleDescription: 'NÃO aceita carro popular 1.0 básico (apenas SUV, Sedã ou Hatch Premium 2020+).',
      badgeText: 'Popular 1.0 Básico Não Aceito',
      feedbackMessage: 'Motorista Confort NÃO aceita carro popular 1.0 básico. Você pode se cadastrar como Motorista Econômico.',
    };
  }

  return {
    eligible: true,
    minYearRequired: minYear,
    ruleCategory: 'suv_sedan_geral',
    ruleDescription: 'Automóvel a partir de 2020 (SUV, Sedã ou Hatch Premium).',
    badgeText: 'Confort Homologado (2020+)',
    feedbackMessage: 'Veículo compatível com Motorista Confort (ano 2020+ e categoria SUV/Sedã/Hatch Premium).',
  };
}
