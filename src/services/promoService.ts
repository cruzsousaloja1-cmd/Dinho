export const LAUNCH_PROMO_BANNER_TEXT =
  '⚡ LANÇAMENTO RACE! Sem taxa até 17/12/2026! Quanto antes você se cadastrar e indicar, mais tempo sem taxa e mais bônus você ganha! Indique agora e ganhe R$50 por cada Motorista OU Motoboy que fizer 10 corridas até 17/12! Depois dessa data, volta para 15% de taxa.';

export const LAUNCH_PROMO_EARNINGS_BADGE_TEXT =
  'PROMOÇÃO DE LANÇAMENTO - Você ganha 100% - 0% de taxa até 17/12/2026 - Pagamento toda sexta';

export const STANDARD_EARNINGS_BADGE_TEXT =
  'Você ganha 85% - taxa 15% - Pagamento toda sexta';

export const getDriverEarningsStatusText = (isPromoActive: boolean): string =>
  isPromoActive ? LAUNCH_PROMO_EARNINGS_BADGE_TEXT : STANDARD_EARNINGS_BADGE_TEXT;

// Launch window: 17/11/2026 00:00:00 UTC through end of 17/12/2026 (covering UTC and BRT -03:00)
export const PROMO_ZERO_FEE_START_MS = new Date('2026-11-17T00:00:00Z').getTime();
export const PROMO_ZERO_FEE_END_MS = new Date('2026-12-18T02:59:59.999Z').getTime();

export const getLaunchPromoDaysRemaining = (now: Date = new Date()): number => {
  const endUtcDay = Date.UTC(2026, 11, 17); // 17/12/2026 (month 11 = Dezembro)
  const todayUtcDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((endUtcDay - todayUtcDay) / (1000 * 60 * 60 * 24));
};

export const getLaunchPromoCountdownText = (now: Date = new Date()): string => {
  const days = getLaunchPromoDaysRemaining(now);
  if (days > 1) {
    return `Faltam ${days} dias para acabar a promoção!`;
  }
  if (days === 1) {
    return 'Falta 1 dia para acabar a promoção!';
  }
  if (days === 0) {
    return 'Último dia! A promoção acaba hoje (17/12/2026)!';
  }
  return 'Promoção encerrada em 17/12/2026 (taxa padrão 15%).';
};

export const STANDARD_COMMISSION_RATE = 0.15;
export const REFERRAL_REQUIRED_RIDES = 10;
export const REFERRAL_BONUS_AMOUNT = 50;
export const PASSENGER_REFERRAL_REQUIRED_RIDES = 1;
export const PASSENGER_REFERRAL_BONUS_AMOUNT = 10;

export interface PassengerCreditBreakdown {
  originalPrice: number;
  availableCredit: number;
  creditUsed: number;
  finalPayable: number;
}

export const computePassengerCreditBreakdown = (
  ridePrice: number,
  availableCredit?: number | null
): PassengerCreditBreakdown => {
  const safeOriginal = Number(Math.max(0, Number(ridePrice || 0)).toFixed(2));
  const safeCredit = Number(Math.max(0, Number(availableCredit || 0)).toFixed(2));
  const creditUsed = Number(Math.min(safeOriginal, safeCredit).toFixed(2));
  const finalPayable = Number(Math.max(0, safeOriginal - creditUsed).toFixed(2));
  return {
    originalPrice: safeOriginal,
    availableCredit: safeCredit,
    creditUsed,
    finalPayable,
  };
};

export interface RideSplitResult {
  totalPrice: number;
  isPromoZeroFee: boolean;
  commissionRate: number;
  commissionPercent: number;
  driverSharePercent: number;
  driverEarnings: number;
  platformFee: number;
}

const roundCurrency = (value: number): number => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Number(Math.max(0, n).toFixed(2));
};

const parseDateMs = (isoOrDate?: string | null): number | null => {
  if (!isoOrDate || typeof isoOrDate !== 'string') return null;
  const trimmed = isoOrDate.trim();
  if (!trimmed) return null;
  // Support DD/MM/YYYY format if stored as Brazilian locale date
  const brMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    const ms = new Date(`${yyyy}-${mm}-${dd}T12:00:00-03:00`).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  // Support date-only YYYY-MM-DD in BRT (-03:00)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const ms = new Date(`${trimmed}T12:00:00-03:00`).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = new Date(trimmed).getTime();
  return Number.isFinite(ms) ? ms : null;
};

/**
 * Taxa por data:
 * - Até 17/12/2026 (23:59:59 BRT): taxa = 0% (motorista / motoboy ganha 100%).
 * - Depois de 17/12/2026: taxa = 15% (motorista / motoboy ganha 85%).
 */
export const isDriverInLaunchZeroFeePromo = (
  _driverCreatedAt?: string | null,
  referenceDateIso?: string | null
): boolean => {
  const refMs = parseDateMs(referenceDateIso) ?? Date.now();
  return refMs <= PROMO_ZERO_FEE_END_MS;
};

export const calculateRideSplitForDriver = (
  totalPrice: number,
  driver?: { createdAt?: string | null; registrationDate?: string | null; data_cadastro?: string | null } | null,
  rideDateIso?: string | null
): RideSplitResult => {
  const safeTotal = roundCurrency(totalPrice);
  const createdAtCandidate =
    driver?.createdAt || driver?.registrationDate || driver?.data_cadastro || undefined;
  const isPromoZeroFee = isDriverInLaunchZeroFeePromo(createdAtCandidate, rideDateIso);

  const commissionRate = isPromoZeroFee ? 0 : STANDARD_COMMISSION_RATE;
  const commissionPercent = isPromoZeroFee ? 0 : 15;
  const driverSharePercent = isPromoZeroFee ? 100 : 85;
  const platformFee = isPromoZeroFee ? 0 : roundCurrency(safeTotal * STANDARD_COMMISSION_RATE);
  const driverEarnings = isPromoZeroFee
    ? safeTotal
    : roundCurrency(Math.max(0, safeTotal - platformFee));

  return {
    totalPrice: safeTotal,
    isPromoZeroFee,
    commissionRate,
    commissionPercent,
    driverSharePercent,
    driverEarnings,
    platformFee,
  };
};

export const normalizeReferralDigits = (raw?: string | null): string => {
  if (!raw || typeof raw !== 'string') return '';
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // Normalize Brazilian phones with 55 prefix if > 11 digits (e.g. 5518999999999 -> 18999999999)
  if (digits.length >= 12 && digits.startsWith('55')) {
    return digits.slice(2);
  }
  return digits;
};

export const buildReferralLink = (whatsappOrCode: string): string => {
  const digits = normalizeReferralDigits(whatsappOrCode);
  const cleanCode = digits || (whatsappOrCode || '').trim();
  if (typeof window === 'undefined') {
    return `https://race.app/Dinho/?indicado=${encodeURIComponent(cleanCode)}`;
  }
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  if (cleanCode) {
    url.searchParams.set('indicado', cleanCode);
  }
  return url.toString();
};

export const getReferralCodeFromUrl = (): string => {
  if (typeof window === 'undefined') return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('indicado') || params.get('ref') || params.get('codigo') || '';
    return raw.trim();
  } catch {
    return '';
  }
};

export const isPassengerReferralRole = (tipo?: string | null): boolean => {
  const norm = String(tipo || '').trim().toLowerCase();
  return norm === 'passenger' || norm === 'passageiro';
};

export interface ReferralBonusMeta {
  indicatedId: string;
  indicatedName: string;
  indicatedEmail: string;
  indicatedRole: 'passenger' | 'driver';
  ridesCount: number;
  requiredRides: number;
  paidFriday?: boolean;
  paidAt?: string | null;
}

export const parseReferralBonusMeta = (
  comprovanteUrl?: string | null,
  chavePix?: string | null,
  bonusAmount?: number | null
): ReferralBonusMeta => {
  let indicatedId = '';
  if (chavePix && chavePix.startsWith('INDICADO:')) {
    indicatedId = chavePix.slice('INDICADO:'.length).trim();
  }
  const inferredRoleFromAmount: 'passenger' | 'driver' =
    Number(bonusAmount) === PASSENGER_REFERRAL_BONUS_AMOUNT ? 'passenger' : 'driver';

  if (comprovanteUrl && typeof comprovanteUrl === 'string') {
    try {
      const parsed = JSON.parse(comprovanteUrl);
      if (parsed && typeof parsed === 'object') {
        const rawRole = String(parsed.indicatedRole || '').trim().toLowerCase();
        const resolvedRole: 'passenger' | 'driver' =
          rawRole === 'passenger' || rawRole === 'passageiro'
            ? 'passenger'
            : rawRole === 'driver' || rawRole === 'motoboy' || rawRole === 'motorista'
            ? 'driver'
            : inferredRoleFromAmount;
        const defaultRequired =
          resolvedRole === 'passenger' ? PASSENGER_REFERRAL_REQUIRED_RIDES : REFERRAL_REQUIRED_RIDES;
        const defaultName =
          resolvedRole === 'passenger' ? 'Passageiro indicado' : 'Motorista OU Motoboy indicado';
        return {
          indicatedId: String(parsed.indicatedId ?? indicatedId ?? '').trim(),
          indicatedName: String(parsed.indicatedName || defaultName).trim(),
          indicatedEmail: String(parsed.indicatedEmail || '').trim(),
          indicatedRole: resolvedRole,
          ridesCount: Number(parsed.ridesCount) || defaultRequired,
          requiredRides: Number(parsed.requiredRides) || defaultRequired,
          paidFriday: Boolean(parsed.paidFriday),
          paidAt: parsed.paidAt ? String(parsed.paidAt) : null,
        };
      }
    } catch {
      // Ignore plain text fallback
    }
  }
  const defaultRequired =
    inferredRoleFromAmount === 'passenger' ? PASSENGER_REFERRAL_REQUIRED_RIDES : REFERRAL_REQUIRED_RIDES;
  return {
    indicatedId,
    indicatedName:
      inferredRoleFromAmount === 'passenger' ? 'Passageiro indicado' : 'Motorista OU Motoboy indicado',
    indicatedEmail: '',
    indicatedRole: inferredRoleFromAmount,
    ridesCount: defaultRequired,
    requiredRides: defaultRequired,
    paidFriday: false,
    paidAt: null,
  };
};

export const formatReferralBonusMessage = (indicatedName?: string | null): string => {
  const cleanName = (indicatedName || 'Motorista OU Motoboy indicado').trim();
  return `Bônus Indicação: + R$50 - ${cleanName} fez 10 corridas!`;
};

export const formatPassengerReferralBonusMessage = (indicatedName?: string | null): string => {
  const cleanName = (indicatedName || 'Passageiro indicado').trim();
  return `Crédito Indicação: + R$10 - ${cleanName} completou a 1ª corrida!`;
};

/**
 * Gera candidato de código de indicação:
 * Nome sem acento, 4 primeiras letras maiúsculas + 3 números aleatórios (100-999). Ex: JOSE123
 */
export const generateReferralCodeCandidate = (name?: string | null): string => {
  const normalizedLetters = String(name || 'RACE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
  const prefix = normalizedLetters.padEnd(4, 'RACE').slice(0, 4);
  const digits = Math.floor(100 + Math.random() * 900);
  return `${prefix}${digits}`;
};

export const buildReferralWhatsappShareText = (
  code?: string | null,
  _options?: { isDriver?: boolean }
): string => {
  const cleanCode = String(code || '').trim().toUpperCase() || 'RACE100';
  return [
    'LANÇAMENTO RACE! Sem taxa até 17/12/2026! Quanto antes você se cadastrar e indicar, mais tempo sem taxa e mais bônus você ganha! Indique agora e ganhe R$50 por cada Motorista OU Motoboy que fizer 10 corridas até 17/12! Depois dessa data, volta para 15% de taxa.',
    '',
    'PROMOÇÃO DE LANÇAMENTO',
    `*CÓDIGO DE CADASTRO, ${cleanCode}*`,
    '® CADASTRANDO NO APP RACE COMO MOTORISTA OU MOTOBOY USANDO MEU CÓDIGO, GANHA 100% DAS CORRIDAS ATÉ 17/12/2026.',
    '® INDICANDO MOTOBOY OU MOTORISTA USANDO SEU CÓDIGO GANHA R$50 QUANDO SEU INDICADO COMPLETAR 10 CORRIDAS.',
    '® INDICANDO PASSAGEIROS COM SEU CÓDIGO GANHA R$10 DE CRÉDITOS SOMENTE NA PRIMEIRA VIAGEM DO SEU INDICADO',
    'SEM LIMITE DE INDICAÇÃO ATÉ A DATA 17/12/2026',
    'Promoção até 17/12/2026! cruzsousaloja1-cmd.github.io/Dinho/',
  ].join('\n');
};

export const buildReferralWhatsappShareUrl = (
  code?: string | null,
  options?: { isDriver?: boolean }
): string => {
  const text = buildReferralWhatsappShareText(code, options);
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

export const getRaceLogoPublicUrl = (): string => {
  const base =
    (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
    '/Dinho/';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}logo-race-indaiatuba.png`;
};

let cachedRaceLogoBlob: Blob | null = null;
let cachedRaceLogoPromise: Promise<Blob | null> | null = null;

const isPngBuffer = (buf: ArrayBuffer): boolean => {
  if (buf.byteLength < 8) return false;
  const bytes = new Uint8Array(buf, 0, 8);
  return (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
};

const fetchVerifiedPngBlob = async (url: string): Promise<Blob | null> => {
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (!isPngBuffer(buf)) return null;
    return new Blob([buf], { type: 'image/png' });
  } catch {
    return null;
  }
};

export const preloadRaceLogoBlob = (): Promise<Blob | null> => {
  if (cachedRaceLogoBlob) return Promise.resolve(cachedRaceLogoBlob);
  if (cachedRaceLogoPromise) return cachedRaceLogoPromise;
  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    return Promise.resolve(null);
  }
  const candidates = Array.from(
    new Set([
      '/Dinho/logo-race-indaiatuba.png',
      getRaceLogoPublicUrl(),
      '/logo-race-indaiatuba.png',
    ])
  );
  cachedRaceLogoPromise = (async () => {
    for (const url of candidates) {
      const pngBlob = await fetchVerifiedPngBlob(url);
      if (pngBlob) {
        cachedRaceLogoBlob = pngBlob;
        return pngBlob;
      }
    }
    return null;
  })();
  return cachedRaceLogoPromise;
};

const triggerFileDownload = (blob: Blob, filename: string) => {
  try {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
  } catch {
    const link = document.createElement('a');
    link.href = getRaceLogoPublicUrl();
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const downloadRaceLogoPng = async (): Promise<boolean> => {
  const logoBlob = cachedRaceLogoBlob || (await preloadRaceLogoBlob());
  if (logoBlob) {
    triggerFileDownload(logoBlob, 'logo-race.png');
    return true;
  }
  const link = document.createElement('a');
  link.href = getRaceLogoPublicUrl();
  link.download = 'logo-race.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return false;
};

const openExternalUrlSafely = (url: string) => {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

export type ShareWithLogoResult = 'native_with_logo' | 'cancelled' | 'whatsapp_with_download';

export const shareReferralWithLogo = async (
  code?: string | null
): Promise<ShareWithLogoResult> => {
  const text = buildReferralWhatsappShareText(code);
  const whatsappUrl = buildReferralWhatsappShareUrl(code);
  const logoBlob = cachedRaceLogoBlob || (await preloadRaceLogoBlob());

  if (
    logoBlob &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function'
  ) {
    try {
      const logoFile = new File([logoBlob], 'logo-race.png', { type: 'image/png' });
      const canShareFiles =
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [logoFile] });
      if (canShareFiles) {
        await navigator.share({
          files: [logoFile],
          text,
        });
        return 'native_with_logo';
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
      // Fall through to WhatsApp message + Baixar Logo button
    }
  }

  openExternalUrlSafely(whatsappUrl);
  return 'whatsapp_with_download';
};

