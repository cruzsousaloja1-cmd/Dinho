/**
 * Configuração Geográfica e Rotas Oficiais de Indaiatuba - SP
 * Centro: -23.0903, -47.2180 | Zoom 14
 * Limites rigorosos (maxBounds) para manter navegação 100% restrita a Indaiatuba
 */

export const INDAIATUBA_CENTER: { lat: number; lng: number } = {
  lat: -23.0903,
  lng: -47.2180,
};

export const INDAIATUBA_CENTER_COORDS: [number, number] = [-23.0903, -47.2180];

// Limites Geográficos de Indaiatuba - impede o usuário de rolar para Campinas, SP, etc.
export const INDAIATUBA_BOUNDS: [[number, number], [number, number]] = [
  [-23.1850, -47.3050], // Sudoeste (Jd. Morada do Sol / limites Itaici)
  [-23.0150, -47.1300], // Nordeste (Polo Shopping / Helvetia)
];

export const INDAIATUBA_MIN_ZOOM = 12;
export const INDAIATUBA_MAX_ZOOM = 19;
export const INDAIATUBA_DEFAULT_ZOOM = 14;

// Pontos de Referência Reais em Indaiatuba
export const INDAIATUBA_LOCATIONS = [
  {
    id: 'ind-1',
    label: 'Av. Presidente Vargas, 1200 - Cidade Nova, Indaiatuba - SP',
    mainText: 'Av. Presidente Vargas, 1200',
    secondaryText: 'Cidade Nova, Indaiatuba - SP • Corredor Gastronômico',
    lat: -23.0842,
    lng: -47.2118,
  },
  {
    id: 'ind-2',
    label: 'Parque Ecológico de Indaiatuba - Av. Eng. Fábio Roberto Barnabé',
    mainText: 'Parque Ecológico de Indaiatuba',
    secondaryText: 'Av. Eng. Fábio Roberto Barnabé • Cartão Postal de Indaiatuba',
    lat: -23.0955,
    lng: -47.2250,
  },
  {
    id: 'ind-3',
    label: 'Centro de Indaiatuba - Praça Prudente de Moraes, Centro',
    mainText: 'Praça Prudente de Moraes (Centro)',
    secondaryText: 'Centro Histórico & Igreja Matriz Nossa Senhora da Candelária',
    lat: -23.0903,
    lng: -47.2180,
  },
  {
    id: 'ind-4',
    label: 'Jardim Morada do Sol - Rua Ário Barnabé, 800, Indaiatuba - SP',
    mainText: 'Rua Ário Barnabé, 800',
    secondaryText: 'Jardim Morada do Sol, Indaiatuba - SP • Polo Comercial',
    lat: -23.1180,
    lng: -47.2380,
  },
  {
    id: 'ind-5',
    label: 'Polo Shopping Indaiatuba - Alameda Filtros Mann, 670, Jardim Tropical',
    mainText: 'Polo Shopping Indaiatuba',
    secondaryText: 'Jardim Tropical, Indaiatuba - SP',
    lat: -23.0682,
    lng: -47.2024,
  },
  {
    id: 'ind-6',
    label: 'HAOC - Hospital Augusto de Oliveira Camargo, Av. Francisco de Paula Leite, 399',
    mainText: 'Hospital HAOC',
    secondaryText: 'Av. Francisco de Paula Leite, 399 - Jardim Santa Cruz',
    lat: -23.0890,
    lng: -47.2135,
  },
  {
    id: 'ind-7',
    label: 'Terminal Rodoviário de Indaiatuba - Rua Alberto Santos Dumont',
    mainText: 'Rodoviária de Indaiatuba',
    secondaryText: 'Jardim Belo Horizonte, Indaiatuba - SP',
    lat: -23.0760,
    lng: -47.2070,
  },
];

// Rota real em Indaiatuba: Partindo da Av. Presidente Vargas até o Parque Ecológico / Centro
export const SIMULATED_INDAIATUBA_ROUTE: [number, number][] = [
  [-23.0842, -47.2118], // Início: Av. Presidente Vargas
  [-23.0855, -47.2130], // Presidente Vargas x Rua Candelária
  [-23.0870, -47.2145], // R. Quinze de Novembro
  [-23.0885, -47.2160], // Praça Dom Pedro II
  [-23.0903, -47.2180], // Praça Prudente de Moraes (Centro)
  [-23.0920, -47.2205], // Acesso à Marginal do Parque
  [-23.0938, -47.2225], // Av. Eng. Fábio Roberto Barnabé
  [-23.0955, -47.2250], // Parque Ecológico (Chegada Embarque Passageiro)
  [-23.0980, -47.2275], // Marginal Sul
  [-23.1020, -47.2310], // Av. Francisco de Paula Leite
  [-23.1090, -47.2345], // Av. Ário Barnabé
  [-23.1180, -47.2380], // Destino Final: Jardim Morada do Sol
];
