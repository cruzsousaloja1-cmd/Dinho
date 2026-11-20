export interface AddressSuggestion {
  id: string;
  label: string; // "Rua + Número - Bairro, Indaiatuba-SP"
  mainText: string; // "Rua, Número"
  secondaryText: string; // "Bairro, Indaiatuba - SP"
  lat: number;
  lng: number;
  streetName?: string;
  streetNumber?: string;
  neighborhood?: string;
}

/**
 * Banco de dados instantâneo de vias e endereços oficiais com NÚMERO e BAIRRO de Indaiatuba - SP
 */
export const POPULAR_DATABASE_LOCATIONS: AddressSuggestion[] = [
  {
    id: 'ind-trab-1',
    label: 'Av. dos Trabalhadores, 350 - Jardim América, Indaiatuba-SP',
    mainText: 'Av. dos Trabalhadores, 350',
    secondaryText: 'Jardim América, Indaiatuba - SP',
    streetName: 'Av. dos Trabalhadores',
    streetNumber: '350',
    neighborhood: 'Jardim América',
    lat: -23.0805,
    lng: -47.2050,
  },
  {
    id: 'ind-trab-2',
    label: 'Av. dos Trabalhadores, 1100 - Jardim Carlos Aldrovandi, Indaiatuba-SP',
    mainText: 'Av. dos Trabalhadores, 1100',
    secondaryText: 'Jardim Carlos Aldrovandi, Indaiatuba - SP',
    streetName: 'Av. dos Trabalhadores',
    streetNumber: '1100',
    neighborhood: 'Jardim Carlos Aldrovandi',
    lat: -23.0760,
    lng: -47.1990,
  },
  {
    id: 'ind-trab-3',
    label: 'Av. dos Trabalhadores, 2450 - Distrito Industrial, Indaiatuba-SP',
    mainText: 'Av. dos Trabalhadores, 2450',
    secondaryText: 'Distrito Industrial, Indaiatuba - SP',
    streetName: 'Av. dos Trabalhadores',
    streetNumber: '2450',
    neighborhood: 'Distrito Industrial',
    lat: -23.0710,
    lng: -47.1920,
  },
  {
    id: 'ind-pres-1',
    label: 'Av. Presidente Vargas, 1250 - Centro, Indaiatuba-SP',
    mainText: 'Av. Presidente Vargas, 1250',
    secondaryText: 'Centro, Indaiatuba - SP • Corredor Gastronômico',
    streetName: 'Av. Presidente Vargas',
    streetNumber: '1250',
    neighborhood: 'Centro',
    lat: -23.0842,
    lng: -47.2118,
  },
  {
    id: 'ind-pres-2',
    label: 'Av. Presidente Vargas, 720 - Cidade Nova, Indaiatuba-SP',
    mainText: 'Av. Presidente Vargas, 720',
    secondaryText: 'Cidade Nova, Indaiatuba - SP',
    streetName: 'Av. Presidente Vargas',
    streetNumber: '720',
    neighborhood: 'Cidade Nova',
    lat: -23.0865,
    lng: -47.2135,
  },
  {
    id: 'ind-quinze-1',
    label: 'Rua 15 de Novembro, 840 - Centro, Indaiatuba-SP',
    mainText: 'Rua 15 de Novembro, 840',
    secondaryText: 'Centro, Indaiatuba - SP • Próximo à Praça Dom Pedro II',
    streetName: 'Rua 15 de Novembro',
    streetNumber: '840',
    neighborhood: 'Centro',
    lat: -23.0890,
    lng: -47.2160,
  },
  {
    id: 'ind-quinze-2',
    label: 'Rua 15 de Novembro, 420 - Centro, Indaiatuba-SP',
    mainText: 'Rua 15 de Novembro, 420',
    secondaryText: 'Centro Histórico, Indaiatuba - SP',
    streetName: 'Rua 15 de Novembro',
    streetNumber: '420',
    neighborhood: 'Centro',
    lat: -23.0903,
    lng: -47.2180,
  },
  {
    id: 'ind-parque-1',
    label: 'Av. Eng. Fábio Roberto Barnabé, 2800 - Parque Ecológico, Indaiatuba-SP',
    mainText: 'Av. Eng. Fábio Roberto Barnabé, 2800',
    secondaryText: 'Parque Ecológico, Indaiatuba - SP • Portão Principal',
    streetName: 'Av. Eng. Fábio Roberto Barnabé',
    streetNumber: '2800',
    neighborhood: 'Parque Ecológico',
    lat: -23.0955,
    lng: -47.2250,
  },
  {
    id: 'ind-parque-2',
    label: 'Av. Eng. Fábio Roberto Barnabé, 1450 - Jardim Esplanada, Indaiatuba-SP',
    mainText: 'Av. Eng. Fábio Roberto Barnabé, 1450',
    secondaryText: 'Jardim Esplanada, Indaiatuba - SP',
    streetName: 'Av. Eng. Fábio Roberto Barnabé',
    streetNumber: '1450',
    neighborhood: 'Jardim Esplanada',
    lat: -23.0920,
    lng: -47.2205,
  },
  {
    id: 'ind-morada-1',
    label: 'Rua Ário Barnabé, 850 - Jardim Morada do Sol, Indaiatuba-SP',
    mainText: 'Rua Ário Barnabé, 850',
    secondaryText: 'Jardim Morada do Sol, Indaiatuba - SP • Centro Comercial',
    streetName: 'Rua Ário Barnabé',
    streetNumber: '850',
    neighborhood: 'Jardim Morada do Sol',
    lat: -23.1180,
    lng: -47.2380,
  },
  {
    id: 'ind-morada-2',
    label: 'Rua Silvio Candello, 1200 - Jardim Morada do Sol, Indaiatuba-SP',
    mainText: 'Rua Silvio Candello, 1200',
    secondaryText: 'Jardim Morada do Sol, Indaiatuba - SP',
    streetName: 'Rua Silvio Candello',
    streetNumber: '1200',
    neighborhood: 'Jardim Morada do Sol',
    lat: -23.1140,
    lng: -47.2360,
  },
  {
    id: 'ind-polo-1',
    label: 'Alameda Filtros Mann, 670 - Jardim Tropical, Indaiatuba-SP (Polo Shopping)',
    mainText: 'Alameda Filtros Mann, 670',
    secondaryText: 'Jardim Tropical, Indaiatuba - SP • Polo Shopping Indaiatuba',
    streetName: 'Alameda Filtros Mann',
    streetNumber: '670',
    neighborhood: 'Jardim Tropical',
    lat: -23.0682,
    lng: -47.2024,
  },
  {
    id: 'ind-haoc-1',
    label: 'Av. Francisco de Paula Leite, 399 - Jardim Santa Cruz, Indaiatuba-SP (HAOC)',
    mainText: 'Av. Francisco de Paula Leite, 399',
    secondaryText: 'Jardim Santa Cruz, Indaiatuba - SP • Hospital HAOC',
    streetName: 'Av. Francisco de Paula Leite',
    streetNumber: '399',
    neighborhood: 'Jardim Santa Cruz',
    lat: -23.0890,
    lng: -47.2135,
  },
  {
    id: 'ind-rodov-1',
    label: 'Rua Alberto Santos Dumont, 400 - Jardim Belo Horizonte, Indaiatuba-SP (Rodoviária)',
    mainText: 'Rua Alberto Santos Dumont, 400',
    secondaryText: 'Jardim Belo Horizonte, Indaiatuba - SP • Terminal Rodoviário',
    streetName: 'Rua Alberto Santos Dumont',
    streetNumber: '400',
    neighborhood: 'Jardim Belo Horizonte',
    lat: -23.0760,
    lng: -47.2070,
  },
  {
    id: 'ind-candelaria-1',
    label: 'Rua Candelária, 510 - Centro, Indaiatuba-SP',
    mainText: 'Rua Candelária, 510',
    secondaryText: 'Centro, Indaiatuba - SP • Igreja Matriz',
    streetName: 'Rua Candelária',
    streetNumber: '510',
    neighborhood: 'Centro',
    lat: -23.0880,
    lng: -47.2170,
  },
  {
    id: 'ind-itaici-1',
    label: 'Av. Cel. Antônio Estanislau do Amaral, 980 - Itaici, Indaiatuba-SP',
    mainText: 'Av. Cel. Antônio Estanislau do Amaral, 980',
    secondaryText: 'Itaici, Indaiatuba - SP',
    streetName: 'Av. Cel. Antônio Estanislau do Amaral',
    streetNumber: '980',
    neighborhood: 'Itaici',
    lat: -23.1120,
    lng: -47.1850,
  },
];

/**
 * Verifica se um endereço contém um número de imóvel válido
 */
export function hasAddressNumber(address: string): boolean {
  if (!address) return false;
  // Procura por sequências numéricas de 1 a 5 dígitos
  return /\b\d{1,5}\b/.test(address);
}

/**
 * Extrai o número do endereço (se houver)
 */
export function extractAddressNumber(address: string): string | null {
  if (!address) return null;
  const match = address.match(/\b\d{1,5}\b/);
  return match ? match[0] : null;
}

/**
 * Realiza busca automática com geolocalização e autocompletar em tempo real
 * filtrada EXCLUSIVAMENTE para Indaiatuba-SP usando Nominatim OpenStreetMap Search
 */
export async function searchAddressAutocomplete(query: string): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const lowerQuery = trimmed.toLowerCase();
  const queryNumber = extractAddressNumber(trimmed);

  // 1. Filtra primeiro no banco local enriquecido de Indaiatuba
  const localMatches = POPULAR_DATABASE_LOCATIONS.filter((loc) => {
    return (
      loc.label.toLowerCase().includes(lowerQuery) ||
      loc.mainText.toLowerCase().includes(lowerQuery) ||
      loc.secondaryText.toLowerCase().includes(lowerQuery) ||
      (loc.streetName && loc.streetName.toLowerCase().includes(lowerQuery))
    );
  });

  // 2. Consulta Nominatim Search com filtro estrito de Indaiatuba:
  // url: https://nominatim.openstreetmap.org/search?format=json&q={texto}&addressdetails=1&limit=5&city=Indaiatuba
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      trimmed
    )}&addressdetails=1&limit=5&city=Indaiatuba&countrycodes=br`;

    const res = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const remoteResults: AddressSuggestion[] = [];

        data.forEach((item: any, idx: number) => {
          const addr = item.address || {};
          const road = addr.road || addr.pedestrian || addr.suburb || item.name || 'Rua';
          const rawNeighborhood =
            addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district || 'Centro';
          const neighborhood = correctNeighborhoodForIndaiatubaStreet(road, rawNeighborhood);
          
          // Se a API não tiver o número exato, usa o número que o usuário digitou ou números práticos da via
          const houseNumber =
            addr.house_number || queryNumber || '100';

          const fullLabel = `${road}, ${houseNumber} - ${neighborhood}, Indaiatuba-SP`;
          const mainText = `${road}, ${houseNumber}`;
          const secondaryText = `${neighborhood}, Indaiatuba - SP`;

          remoteResults.push({
            id: `remote-ind-${item.osm_id || idx}-${Date.now()}`,
            label: fullLabel,
            mainText,
            secondaryText,
            streetName: road,
            streetNumber: houseNumber,
            neighborhood,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          });

          // Se o usuário buscou uma avenida sem número especificado, cria variações numéricas úteis
          if (!queryNumber && !addr.house_number && remoteResults.length < 5) {
            remoteResults.push({
              id: `remote-ind-alt1-${idx}`,
              label: `${road}, 350 - ${neighborhood}, Indaiatuba-SP`,
              mainText: `${road}, 350`,
              secondaryText: `${neighborhood}, Indaiatuba - SP`,
              streetName: road,
              streetNumber: '350',
              neighborhood,
              lat: parseFloat(item.lat) + 0.001,
              lng: parseFloat(item.lon) + 0.001,
            });
            remoteResults.push({
              id: `remote-ind-alt2-${idx}`,
              label: `${road}, 1250 - ${neighborhood}, Indaiatuba-SP`,
              mainText: `${road}, 1250`,
              secondaryText: `${neighborhood}, Indaiatuba - SP`,
              streetName: road,
              streetNumber: '1250',
              neighborhood,
              lat: parseFloat(item.lat) - 0.0015,
              lng: parseFloat(item.lon) - 0.0015,
            });
          }
        });

        // Mescla com locais conhecidos
        const combined = [...remoteResults];
        localMatches.forEach((loc) => {
          if (!combined.some((c) => c.label.toLowerCase() === loc.label.toLowerCase())) {
            combined.push(loc);
          }
        });
        return combined.slice(0, 6);
      }
    }
  } catch {
    // Fallback gracioso para localMatches
  }

  // 3. Se houver matches locais, retorna-os
  if (localMatches.length > 0) {
    return localMatches.slice(0, 6);
  }

  // 4. Fallback com o texto digitado pelo usuário formatado em Indaiatuba-SP
  const fallbackNum = queryNumber || '100';
  return [
    {
      id: `custom-ind-1`,
      label: `${trimmed}, ${fallbackNum} - Centro, Indaiatuba-SP`,
      mainText: `${trimmed}, ${fallbackNum}`,
      secondaryText: 'Indaiatuba - SP',
      streetName: trimmed,
      streetNumber: fallbackNum,
      neighborhood: 'Centro',
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

  // Fator de rota urbana em ruas e avenidas de Indaiatuba
  const roadDistance = straightDistance * 1.25;

  return Math.max(Number(roadDistance.toFixed(1)), 1.2);
}

/**
 * Verifica se as coordenadas estão dentro da região de Indaiatuba - SP
 */
export function isCoordsWithinIndaiatuba(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= -23.225 && lat <= -22.985 && lng >= -47.345 && lng <= -47.105;
}

export const DEFAULT_MANUAL_PICKUP_EXAMPLE =
  'Rua Adélia Philomena Mattioni, 420 - Jardim do Sol, Indaiatuba-SP';

export const DEFAULT_MANUAL_PICKUP_COORDS = {
  lat: -23.1128,
  lng: -47.2245,
};

export const GPS_MANUAL_FALLBACK_MESSAGE = 'Digite o endereço na mão';

const GPS_PERMISSION_OR_CITY_ERROR = GPS_MANUAL_FALLBACK_MESSAGE;

export const GPS_FALLBACK_SAVED_NOTICE =
  'Usando última localização, ligue o GPS para mais precisão';

const LAST_GPS_LOCATION_STORAGE_KEY = 'race_last_gps_location';
const STREET_OVERRIDES_STORAGE_KEY = 'race_saved_street_overrides_v1';

/**
 * Abre as configurações de localização/permissão do app no Median / GoNative WebView Android
 */
export function openAppLocationSettings(): boolean {
  if (typeof window === 'undefined') return false;
  const win = window as unknown as {
    median?: {
      app?: { openAppSettings?: () => void };
      android?: { geoLocation?: { promptLocationServices?: () => void } };
      permissions?: { request?: (perms: string[]) => void };
    };
    gonative?: {
      app?: { openAppSettings?: () => void };
      android?: { geoLocation?: { promptLocationServices?: () => void } };
      permissions?: { request?: (perms: string[]) => void };
    };
  };

  try {
    const bridge = win.median || win.gonative;
    if (bridge?.android?.geoLocation?.promptLocationServices) {
      bridge.android.geoLocation.promptLocationServices();
    }
    if (bridge?.app?.openAppSettings) {
      bridge.app.openAppSettings();
      return true;
    }
    if (bridge?.permissions?.request) {
      bridge.permissions.request(['android.permission.ACCESS_FINE_LOCATION']);
      return true;
    }
  } catch {
    // ignore bridge errors
  }

  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    if (/median|gonative/i.test(ua)) {
      window.location.href = 'median://app/openAppSettings';
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export interface SavedStreetOverride {
  road: string;
  number: string;
  neighborhood: string;
  updatedAt: number;
}

export function normalizeTextKey(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function correctNeighborhoodForIndaiatubaStreet(road: string, rawNeighborhood: string): string {
  const cleanRoad = normalizeTextKey(road);
  const cleanNeighborhood = normalizeTextKey(rawNeighborhood);
  const isAdeliaPhilomena =
    cleanRoad.includes('adelia philomena mattioni') ||
    cleanRoad.includes('philomena mattioni');

  if (
    isAdeliaPhilomena &&
    (!cleanNeighborhood ||
      cleanNeighborhood === 'centro' ||
      cleanNeighborhood.includes('uniao'))
  ) {
    return 'Jardim do Sol';
  }

  return (rawNeighborhood || '').trim() || 'Centro';
}

export function parseStructuredIndaiatubaAddress(address: string): {
  road: string;
  number: string;
  neighborhood: string;
} {
  const trimmed = String(address || '').trim();
  if (!trimmed) {
    return { road: '', number: '', neighborhood: '' };
  }

  const withoutCity = trimmed.replace(/,\s*Indaiatuba\s*-?\s*SP\s*$/i, '').trim();
  const dashIdx = withoutCity.lastIndexOf(' - ');
  let leftPart = withoutCity;
  let neighborhoodPart = '';

  if (dashIdx > 0) {
    leftPart = withoutCity.slice(0, dashIdx).trim();
    neighborhoodPart = withoutCity.slice(dashIdx + 3).trim();
  }

  let road = leftPart;
  let number = '';
  const trailingNumMatch = leftPart.match(/^(.*?)[,\s]+(\d{1,5}[a-zA-Z]?)\s*$/);
  if (trailingNumMatch && trailingNumMatch[1].trim().length >= 3) {
    road = trailingNumMatch[1].replace(/,\s*$/, '').trim();
    number = trailingNumMatch[2].trim();
  }

  return {
    road: road.trim(),
    number: number.trim(),
    neighborhood: neighborhoodPart.trim(),
  };
}

function readStreetOverridesMap(): Record<string, SavedStreetOverride> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STREET_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, SavedStreetOverride>;
    }
  } catch {
    // ignore storage errors
  }
  return {};
}

export function getStreetAddressOverride(road: string): SavedStreetOverride | null {
  const key = normalizeTextKey(road);
  if (!key || key.length < 3) return null;
  const map = readStreetOverridesMap();
  const entry = map[key];
  if (entry && typeof entry === 'object') {
    return {
      road: String(entry.road || road).trim(),
      number: String(entry.number || '').trim(),
      neighborhood: String(entry.neighborhood || '').trim(),
      updatedAt: Number(entry.updatedAt || Date.now()),
    };
  }
  return null;
}

export function saveStreetAddressOverride(
  road: string,
  number?: string,
  neighborhood?: string
): void {
  if (typeof window === 'undefined') return;
  const cleanRoad = String(road || '').trim();
  const key = normalizeTextKey(cleanRoad);
  if (!key || key.length < 3) return;

  try {
    const map = readStreetOverridesMap();
    const existing = map[key];
    const nextNumber =
      typeof number === 'string' && number.trim().length > 0
        ? number.trim()
        : String(existing?.number || '').trim();
    const nextNeighborhood =
      typeof neighborhood === 'string' && neighborhood.trim().length > 0
        ? correctNeighborhoodForIndaiatubaStreet(cleanRoad, neighborhood.trim())
        : String(existing?.neighborhood || '').trim();

    if (!nextNumber && !nextNeighborhood) return;

    map[key] = {
      road: cleanRoad,
      number: nextNumber,
      neighborhood: nextNeighborhood,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STREET_OVERRIDES_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

export interface SavedGpsLocation {
  lat: number;
  lng: number;
  fullAddress: string;
  road: string;
  number: string;
  neighborhood: string;
  savedAt: number;
}

export function saveLastKnownGpsLocation(loc: Omit<SavedGpsLocation, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  if (!isCoordsWithinIndaiatuba(loc.lat, loc.lng) || !loc.fullAddress.trim()) return;
  try {
    const payload: SavedGpsLocation = {
      ...loc,
      savedAt: Date.now(),
    };
    localStorage.setItem(LAST_GPS_LOCATION_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage quota errors
  }
}

export function getLastKnownGpsLocation(): SavedGpsLocation | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_GPS_LOCATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedGpsLocation>;
    if (
      typeof parsed?.lat === 'number' &&
      typeof parsed?.lng === 'number' &&
      typeof parsed?.fullAddress === 'string' &&
      parsed.fullAddress.trim().length > 3 &&
      isCoordsWithinIndaiatuba(parsed.lat, parsed.lng)
    ) {
      return {
        lat: parsed.lat,
        lng: parsed.lng,
        fullAddress: parsed.fullAddress.trim(),
        road: String(parsed.road || '').trim(),
        number: String(parsed.number || '').trim(),
        neighborhood: String(parsed.neighborhood || 'Centro').trim(),
        savedAt: Number(parsed.savedAt || Date.now()),
      };
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

/**
 * Converte latitude e longitude reais em endereço de saída SOMENTE de Indaiatuba-SP
 * Usa Nominatim (zoom=18, addressdetails=1) priorizando suburb/neighbourhood/quarter
 * + aplica correção de bairro e preferências salvas por rua no localStorage.
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<{
  success: boolean;
  inIndaiatuba: boolean;
  fullAddress: string;
  road: string;
  number: string;
  neighborhood: string;
  errorMessage?: string;
}> {
  if (!isCoordsWithinIndaiatuba(lat, lng)) {
    return {
      success: false,
      inIndaiatuba: false,
      fullAddress: '',
      road: '',
      number: '',
      neighborhood: '',
      errorMessage: GPS_PERMISSION_OR_CITY_ERROR,
    };
  }

  let road = '';
  let houseNumber = '';
  let neighborhood = '';
  let detectedOtherCity = false;

  const nominatimPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3200);
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        String(lat)
      )}&lon=${encodeURIComponent(String(lng))}&addressdetails=1&zoom=18&accept-language=pt-BR`;
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });
      if (!res.ok) return null;
      return await res.json();
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  const photonPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2800);
    try {
      const photonUrl = `https://photon.komoot.io/reverse?lat=${encodeURIComponent(
        String(lat)
      )}&lon=${encodeURIComponent(String(lng))}`;
      const res = await fetch(photonUrl, {
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!res.ok) return null;
      return await res.json();
    } finally {
      clearTimeout(timeoutId);
    }
  })();

  const [nomRes, phoRes] = await Promise.allSettled([nominatimPromise, photonPromise]);

  if (nomRes.status === 'fulfilled' && nomRes.value) {
    const addr = nomRes.value?.address || {};
    const cityCandidate = String(
      addr.city || addr.town || addr.municipality || addr.village || ''
    )
      .toLowerCase()
      .trim();

    if (cityCandidate && !cityCandidate.includes('indaiatuba')) {
      detectedOtherCity = true;
    } else {
      road = String(
        addr.road ||
          addr.pedestrian ||
          addr.residential ||
          addr.footway ||
          addr.path ||
          addr.street ||
          addr.cycleway ||
          ''
      ).trim();
      houseNumber = String(addr.house_number || '').trim();
      // Prioriza estritamente suburb / neighbourhood / quarter vindos do Nominatim
      neighborhood = String(
        addr.suburb ||
          addr.neighbourhood ||
          addr.quarter ||
          addr.city_district ||
          addr.residential ||
          ''
      ).trim();
    }
  }

  if (detectedOtherCity) {
    return {
      success: false,
      inIndaiatuba: false,
      fullAddress: '',
      road: '',
      number: '',
      neighborhood: '',
      errorMessage: GPS_PERMISSION_OR_CITY_ERROR,
    };
  }

  if (phoRes.status === 'fulfilled' && phoRes.value && (!road || !houseNumber || !neighborhood)) {
    const feat = Array.isArray(phoRes.value?.features) ? phoRes.value.features[0] : null;
    const props = feat?.properties || {};
    const photonCity = String(props.city || props.county || '').toLowerCase().trim();

    if (photonCity && !photonCity.includes('indaiatuba') && !road) {
      return {
        success: false,
        inIndaiatuba: false,
        fullAddress: '',
        road: '',
        number: '',
        neighborhood: '',
        errorMessage: GPS_PERMISSION_OR_CITY_ERROR,
      };
    }

    const photonRoad = String(props.street || props.name || '').trim();
    const photonNum = String(props.housenumber || '').trim();
    const photonNeighborhood = String(props.district || props.locality || '').trim();

    if (!road && photonRoad && photonRoad.toLowerCase() !== 'indaiatuba') {
      road = photonRoad;
    }
    if (!houseNumber && photonNum) {
      houseNumber = photonNum;
    }
    if (!neighborhood && photonNeighborhood) {
      neighborhood = photonNeighborhood;
    }
  }

  if (!road || road.toLowerCase() === 'indaiatuba') {
    return {
      success: false,
      inIndaiatuba: true,
      fullAddress: '',
      road: '',
      number: '',
      neighborhood: '',
      errorMessage: GPS_PERMISSION_OR_CITY_ERROR,
    };
  }

  let finalNeighborhood = correctNeighborhoodForIndaiatubaStreet(road, neighborhood);
  let finalNumber = houseNumber;

  const streetOverride = getStreetAddressOverride(road);
  if (streetOverride) {
    if (!finalNumber && streetOverride.number) {
      finalNumber = streetOverride.number;
    }
    if (streetOverride.neighborhood) {
      finalNeighborhood = correctNeighborhoodForIndaiatubaStreet(
        road,
        streetOverride.neighborhood
      );
    }
  }

  const fullAddress = finalNumber
    ? `${road}, ${finalNumber} - ${finalNeighborhood}, Indaiatuba-SP`
    : `${road} - ${finalNeighborhood}, Indaiatuba-SP`;

  saveLastKnownGpsLocation({
    lat,
    lng,
    fullAddress,
    road,
    number: finalNumber,
    neighborhood: finalNeighborhood,
  });

  return {
    success: true,
    inIndaiatuba: true,
    fullAddress,
    road,
    number: finalNumber,
    neighborhood: finalNeighborhood,
  };
}

export type GpsErrorCode =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'UNSUPPORTED'
  | 'OUTSIDE_CITY'
  | 'GEOCODE_FAILED';

export interface FastGpsLookupResult {
  status: 'ok' | 'fallback_saved' | 'outside_indaiatuba' | 'error';
  errorCode?: GpsErrorCode;
  lat?: number;
  lng?: number;
  accuracy?: number;
  fullAddress?: string;
  road?: string;
  number?: string;
  neighborhood?: string;
  notice?: string;
  errorMessage?: string;
}

export interface FastGpsLookupOptions {
  onStatusMessage?: (msg: string) => void;
  targetAccuracyMeters?: number;
  maxWaitMs?: number;
}

/**
 * Busca localização atual compatível com Chrome, PWA, Capacitor e WebView do Median:
 * - Usa navigator.geolocation.getCurrentPosition com enableHighAccuracy: true, timeout: 10000, maximumAge: 0.
 * - Trata erro PERMISSION_DENIED separadamente (errorCode: 'PERMISSION_DENIED') para exibir botão "Permitir localização".
 * - Se falhar por timeout/indisponibilidade em ambiente indoor/WebView, tenta leitura rápida por rede antes do fallback manual.
 */
export function requestCurrentLocationFast(
  options?: FastGpsLookupOptions
): Promise<FastGpsLookupResult> {
  const timeoutMs = options?.maxWaitMs ?? 10000;

  return new Promise((resolve) => {
    const finishWithSavedFallbackOrError = (
      allowFallback: boolean,
      errorCode: GpsErrorCode
    ): void => {
      if (allowFallback) {
        const saved = getLastKnownGpsLocation();
        if (saved) {
          resolve({
            status: 'fallback_saved',
            lat: saved.lat,
            lng: saved.lng,
            fullAddress: saved.fullAddress,
            road: saved.road,
            number: saved.number,
            neighborhood: saved.neighborhood,
            notice: GPS_FALLBACK_SAVED_NOTICE,
          });
          return;
        }
      }
      resolve({
        status: 'error',
        errorCode,
        errorMessage: GPS_MANUAL_FALLBACK_MESSAGE,
      });
    };

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      finishWithSavedFallbackOrError(true, 'UNSUPPORTED');
      return;
    }

    const resolveFromPosition = async (pos: GeolocationPosition, isNetworkFallback = false) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : undefined;

      try {
        const geoResult = await reverseGeocodeCoords(lat, lng);
        if (!geoResult.inIndaiatuba) {
          resolve({
            status: 'outside_indaiatuba',
            errorCode: 'OUTSIDE_CITY',
            errorMessage: GPS_MANUAL_FALLBACK_MESSAGE,
          });
          return;
        }
        if (!geoResult.success || !geoResult.fullAddress) {
          finishWithSavedFallbackOrError(true, 'GEOCODE_FAILED');
          return;
        }
        resolve({
          status: 'ok',
          lat,
          lng,
          accuracy,
          fullAddress: geoResult.fullAddress,
          road: geoResult.road,
          number: geoResult.number,
          neighborhood: geoResult.neighborhood,
          notice: isNetworkFallback
            ? 'Localização aproximada capturada — confira o número se necessário.'
            : undefined,
        });
      } catch {
        finishWithSavedFallbackOrError(true, 'GEOCODE_FAILED');
      }
    };

    options?.onStatusMessage?.('Buscando GPS...');

    // 1ª tentativa oficial: getCurrentPosition com alta precisão (compatível com Median WebView)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void resolveFromPosition(pos, false);
      },
      (err) => {
        const code = err?.code;
        if (code === 1) {
          // PERMISSION_DENIED — retorna código específico para mostrar botão "Permitir localização"
          finishWithSavedFallbackOrError(false, 'PERMISSION_DENIED');
          return;
        }

        // 2ª tentativa rápida por rede/Wi-Fi dentro do WebView quando GPS satélite dá timeout/indisponível
        navigator.geolocation.getCurrentPosition(
          (posFallback) => {
            void resolveFromPosition(posFallback, true);
          },
          (errFallback) => {
            const fallbackCode = errFallback?.code;
            if (fallbackCode === 1) {
              finishWithSavedFallbackOrError(false, 'PERMISSION_DENIED');
              return;
            }
            finishWithSavedFallbackOrError(
              true,
              fallbackCode === 3 ? 'TIMEOUT' : 'POSITION_UNAVAILABLE'
            );
          },
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    );
  });
}

