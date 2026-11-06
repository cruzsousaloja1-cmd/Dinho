export interface AddressSuggestion {
  id: string;
  label: string;
  mainText: string;
  secondaryText: string;
  lat: number;
  lng: number;
}

// Banco de dados instantâneo com locais populares, avenidas, praças e bairros de Indaiatuba - SP
export const POPULAR_DATABASE_LOCATIONS: AddressSuggestion[] = [
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
  {
    id: 'loc-3',
    label: 'Av. Brigadeiro Faria Lima, 3477 - Itaim Bibi, São Paulo - SP',
    mainText: 'Av. Brigadeiro Faria Lima, 3477',
    secondaryText: 'Itaim Bibi, São Paulo - SP • Centro Financeiro',
    lat: -23.5850,
    lng: -46.6820,
  },
  {
    id: 'loc-4',
    label: 'Parque Ibirapuera - Portão 3, Av. Pedro Álvares Cabral, São Paulo - SP',
    mainText: 'Parque Ibirapuera - Portão 3',
    secondaryText: 'Vila Mariana, São Paulo - SP',
    lat: -23.5874,
    lng: -46.6576,
  },
  {
    id: 'loc-5',
    label: 'Rua Oscar Freire, 800 - Cerqueira César, São Paulo - SP',
    mainText: 'Rua Oscar Freire, 800',
    secondaryText: 'Cerqueira César / Jardins, São Paulo - SP',
    lat: -23.5640,
    lng: -46.6670,
  },
  {
    id: 'loc-6',
    label: 'Shopping Morumbi - Av. Roque Petroni Júnior, 1089, São Paulo - SP',
    mainText: 'Shopping Morumbi',
    secondaryText: 'Vila Gertrudes, São Paulo - SP',
    lat: -23.6225,
    lng: -46.6988,
  },
  {
    id: 'loc-7',
    label: 'Shopping Eldorado - Av. Rebouças, 3970 - Pinheiros, São Paulo - SP',
    mainText: 'Shopping Eldorado',
    secondaryText: 'Pinheiros, São Paulo - SP',
    lat: -23.5710,
    lng: -46.6980,
  },
  {
    id: 'loc-8',
    label: 'Aeroporto Internacional de Guarulhos (GRU) - Terminais 1, 2 e 3',
    mainText: 'Aeroporto de Guarulhos (GRU)',
    secondaryText: 'Rodovia Hélio Smidt, Guarulhos - SP',
    lat: -23.4356,
    lng: -46.4731,
  },
  {
    id: 'loc-9',
    label: 'Estação da Luz - Praça da Luz, 1 - Centro Histórico, São Paulo - SP',
    mainText: 'Estação da Luz',
    secondaryText: 'Centro Histórico, São Paulo - SP • Metrô e CPTM',
    lat: -23.5350,
    lng: -46.6350,
  },
  {
    id: 'loc-10',
    label: 'Allianz Parque - Av. Francisco Matarazzo, 1705 - Água Branca, SP',
    mainText: 'Allianz Parque',
    secondaryText: 'Água Branca, São Paulo - SP',
    lat: -23.5275,
    lng: -46.6784,
  },
  {
    id: 'loc-11',
    label: 'Hospital das Clínicas da FMUSP - Rua Dr. Ovídio Pires de Campos, SP',
    mainText: 'Hospital das Clínicas (HC)',
    secondaryText: 'Cerqueira César, São Paulo - SP',
    lat: -23.5573,
    lng: -46.6710,
  },
  {
    id: 'loc-12',
    label: 'Rua Augusta, 1200 - Consolação, São Paulo - SP',
    mainText: 'Rua Augusta, 1200',
    secondaryText: 'Consolação, São Paulo - SP',
    lat: -23.5530,
    lng: -46.6580,
  },
  {
    id: 'loc-13',
    label: 'Shopping Vila Olímpia - Rua Olimpíadas, 360, São Paulo - SP',
    mainText: 'Shopping Vila Olímpia',
    secondaryText: 'Vila Olímpia, São Paulo - SP',
    lat: -23.5950,
    lng: -46.6860,
  },
  {
    id: 'loc-14',
    label: 'Estação Sé - Praça da Sé, Centro, São Paulo - SP',
    mainText: 'Estação da Sé (Catedral)',
    secondaryText: 'Centro, São Paulo - SP',
    lat: -23.5505,
    lng: -46.6333,
  },
  {
    id: 'loc-15',
    label: 'Av. Engenheiro Luís Carlos Berrini, 1500 - Brooklin, São Paulo - SP',
    mainText: 'Av. Eng. Luís Carlos Berrini, 1500',
    secondaryText: 'Brooklin Novo, São Paulo - SP',
    lat: -23.6080,
    lng: -46.6970,
  },
];

/**
 * Realiza busca automática com geolocalização e autocompletar em tempo real.
 * Consulta primeiro o Nominatim OpenStreetMap (com timeout curto) e complementa com o índice local.
 */
export async function searchAddressAutocomplete(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const lowerQuery = trimmed.toLowerCase();

  // Filtra primeiro no banco local para resposta instantânea (< 5ms)
  const localMatches = POPULAR_DATABASE_LOCATIONS.filter(
    (loc) =>
      loc.label.toLowerCase().includes(lowerQuery) ||
      loc.mainText.toLowerCase().includes(lowerQuery) ||
      loc.secondaryText.toLowerCase().includes(lowerQuery)
  );

  // Tenta consulta online no OpenStreetMap Nominatim para qualquer rua, número ou cidade do Brasil
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2s timeout max

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed
    )}&countrycodes=br&limit=6&addressdetails=1`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const remoteResults: AddressSuggestion[] = data.map((item: any, idx: number) => {
          const parts = (item.display_name || '').split(',');
          const main = parts[0]?.trim() || item.name || 'Endereço';
          const secondary = parts.slice(1, 4).join(',').trim();

          return {
            id: `remote-${item.osm_id || idx}-${Date.now()}`,
            label: item.display_name,
            mainText: main,
            secondaryText: secondary || 'Brasil',
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          };
        });

        // Junta resultados remotos com locais mais relevantes
        const combined = [...remoteResults];
        localMatches.forEach((loc) => {
          if (!combined.some((c) => c.mainText.toLowerCase() === loc.mainText.toLowerCase())) {
            combined.push(loc);
          }
        });
        return combined.slice(0, 6);
      }
    }
  } catch {
    // Se estiver offline ou lenta a rede, retorna os matches do banco local enriquecido
  }

  // Gera sugestões automáticas baseadas no que o usuário digitou caso não haja match exato
  if (localMatches.length > 0) {
    return localMatches.slice(0, 5);
  }

  // Fallback inteligente para o endereço digitado pelo usuário
  return [
    {
      id: `custom-1`,
      label: `${trimmed}, Indaiatuba - SP`,
      mainText: trimmed,
      secondaryText: 'Localização pesquisada • Indaiatuba / SP',
      lat: -23.0903 + (Math.random() - 0.5) * 0.02,
      lng: -47.2180 + (Math.random() - 0.5) * 0.02,
    },
  ];
}

/**
 * Calcula distância real aproximada em km entre dois pontos no mapa
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDistance = R * c;

  // Fator de rota urbana em ruas e avenidas (aproximadamente 1.28x da linha reta)
  const roadDistance = straightDistance * 1.28;

  // Mínimo de 1.2 km para corridas urbanas
  return Math.max(Number(roadDistance.toFixed(1)), 1.2);
}

/**
 * Converte latitude e longitude em endereço de saída real formatado (Geocodificação Reversa)
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<string> {
  // 1. Verifica se está muito próximo de algum ponto de referência conhecido
  let closest: { loc: AddressSuggestion; dist: number } | null = null;
  for (const loc of POPULAR_DATABASE_LOCATIONS) {
    const d = calculateDistanceKm(lat, lng, loc.lat, loc.lng);
    if (!closest || d < closest.dist) {
      closest = { loc, dist: d };
    }
  }

  if (closest && closest.dist < 0.25) {
    return closest.loc.label;
  }

  // 2. Consulta de geocodificação reversa em tempo real no OpenStreetMap
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2800);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const road = addr.road || addr.pedestrian || addr.suburb || addr.neighbourhood;
      const number = addr.house_number || '';
      const neighborhood = addr.neighbourhood || addr.suburb || '';
      const city = addr.city || addr.town || addr.municipality || 'São Paulo';
      const state = addr.state || 'SP';

      if (road) {
        const numPart = number ? `, ${number}` : '';
        const neighPart = neighborhood ? ` - ${neighborhood}` : '';
        return `${road}${numPart}${neighPart}, ${city} - ${state}`;
      }

      if (data.display_name) {
        const parts = data.display_name.split(',');
        return parts.slice(0, 3).join(',').trim();
      }
    }
  } catch {
    // Falha silenciosa no fetch externo
  }

  // 3. Fallback inteligente com o ponto de referência mais próximo formatado
  if (closest && closest.loc) {
    return closest.loc.label;
  }

  return `Av. Paulista, 1578 - Bela Vista, São Paulo - SP`;
}

