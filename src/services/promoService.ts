export const LAUNCH_PROMO_BANNER_TEXT =
  '⚡ LANÇAMENTO RACE! Sem taxa até 17/12/2026! Quanto antes você se cadastrar e indicar, mais tempo sem taxa e mais bônus você ganha! Indique agora e ganhe R$50 por cada Motorista que fizer 10 corridas até 17/12! Depois dessa data, volta para 15% de taxa.';

export const LAUNCH_PROMO_EARNINGS_BADGE_TEXT =
  'Promoção Lançamento: 0% até 17/12 - Você está com 100%!';

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
    const ms = new Date(`${yyyy}-${mm}-${dd}T12:00:00Z`).getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  const ms = new Date(trimmed).getTime();
  return Number.isFinite(ms) ? ms : null;
};

/**
 * Promoção 1 — 1º MÊS SEM TAXA:
 * Se a data da corrida for até 17/12/2026 E o motorista foi cadastrado a partir de 17/11/2026,
 * comissão = 0% (motorista fica com 100% / app 0%).
 * Após 17/12/2026, volta automaticamente para 15% (motorista 85% / app 15%).
 */
export const isDriverInLaunchZeroFeePromo = (
  driverCreatedAt?: string | null,
  referenceDateIso?: string | null
): boolean => {
  const refMs = parseDateMs(referenceDateIso) ?? Date.now();
  if (refMs > PROMO_ZERO_FEE_END_MS) {
    return false;
  }
  if (!driverCreatedAt) {
    // Fallback conservative: if reference date is already during launch and created_at is missing,
    // treat newly active drivers during the launch window before 17/12/2026 as eligible only if date >= start.
    return refMs >= PROMO_ZERO_FEE_START_MS && refMs <= PROMO_ZERO_FEE_END_MS;
  }
  const createdMs = parseDateMs(driverCreatedAt);
  if (createdMs === null) {
    return refMs >= PROMO_ZERO_FEE_START_MS && refMs <= PROMO_ZERO_FEE_END_MS;
  }
  return createdMs >= PROMO_ZERO_FEE_START_MS && refMs <= PROMO_ZERO_FEE_END_MS;
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

export interface ReferralBonusMeta {
  indicatedId: string;
  indicatedName: string;
  indicatedEmail: string;
  ridesCount: number;
}

export const parseReferralBonusMeta = (
  comprovanteUrl?: string | null,
  chavePix?: string | null
): ReferralBonusMeta => {
  let indicatedId = '';
  if (chavePix && chavePix.startsWith('INDICADO:')) {
    indicatedId = chavePix.slice('INDICADO:'.length).trim();
  }
  if (comprovanteUrl && typeof comprovanteUrl === 'string') {
    try {
      const parsed = JSON.parse(comprovanteUrl);
      if (parsed && typeof parsed === 'object') {
        return {
          indicatedId: String(parsed.indicatedId ?? indicatedId ?? '').trim(),
          indicatedName: String(parsed.indicatedName || 'Motorista indicado').trim(),
          indicatedEmail: String(parsed.indicatedEmail || '').trim(),
          ridesCount: Number(parsed.ridesCount) || REFERRAL_REQUIRED_RIDES,
        };
      }
    } catch {
      // Ignore plain text fallback
    }
  }
  return {
    indicatedId,
    indicatedName: 'Motorista indicado',
    indicatedEmail: '',
    ridesCount: REFERRAL_REQUIRED_RIDES,
  };
};

export const formatReferralBonusMessage = (indicatedName?: string | null): string => {
  const cleanName = (indicatedName || 'Motorista indicado').trim();
  return `Bônus Indicação: + R$50 - ${cleanName} fez 10 corridas!`;
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
  options?: { isDriver?: boolean }
): string => {
  const cleanCode = String(code || '').trim().toUpperCase() || 'RACE100';
  if (options?.isDriver) {
    return `Baixa o RACE para trabalhar! Usa meu código ${cleanCode} e ganha Sem taxa até 17/12/2026! Quanto antes você entrar, mais tempo sem taxa você tem! Promoção até 17/12/2026! cruzsousaloja1-cmd.github.io/Dinho/`;
  }
  return `Baixa o RACE! Usa meu código ${cleanCode} e ganha 1º mês sem taxa! cruzsousaloja1-cmd.github.io/Dinho/`;
};

export const buildReferralWhatsappShareUrl = (
  code?: string | null,
  options?: { isDriver?: boolean }
): string => {
  const text = buildReferralWhatsappShareText(code, options);
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
};

