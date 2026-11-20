import { Driver } from '../types';
import { supabase } from '../supabase';
import { validateCNH, validateCPF, validatePlate } from '../utils/documentValidation';

export const RACE_APP_PUBLIC_LINK = 'https://cruzsousaloja1-cmd.github.io/Dinho/';

const PENDING_BELL_MSG_STORAGE_PREFIX = 'race_pending_conductor_msg_v1:';

export interface PendingConductorBellMessage {
  email: string;
  title: string;
  message: string;
  missingItems: string[];
  sentAt: string;
}

export interface ConductorMissingCheckInput {
  profilePhoto?: string | null;
  cnhFrontPhoto?: string | null;
  cnhBackPhoto?: string | null;
  crlvPhoto?: string | null;
  vehiclePhoto?: string | null;
  vehicleModel?: string | null;
  vehicleColor?: string | null;
  vehiclePlate?: string | null;
  vehicleYear?: string | number | null;
  cpf?: string | null;
  cnh?: string | null;
  pixKey?: string | null;
  isMoto?: boolean;
}

export interface ConductorMissingItem {
  key: string;
  label: string;
  emoji: string;
}

export interface ConductorMissingCheckResult {
  missingItems: string[];
  missingDetails: ConductorMissingItem[];
  completedItems: string[];
  isComplete: boolean;
  title: string;
  message: string;
  signature: string;
}

const ITEM_EMOJI_MAP: Record<string, string> = {
  'Foto de Perfil': '🤳',
  'CNH Frente (foto)': '📸',
  'CNH Verso (foto)': '📸',
  CRLV: '📄',
  'Foto do carro (Frente)': '🚗',
  'Foto da moto': '🏍️',
  Modelo: '🚘',
  Cor: '🎨',
  Placa: '🔢',
  Ano: '📅',
  CPF: '🪪',
  'Número da CNH': '🆔',
  'Chave PIX': '💰',
};

const isNonEmptyText = (value?: string | null): boolean =>
  typeof value === 'string' && value.trim().length > 0;

const isValidYearInput = (value?: string | number | null): boolean => {
  if (value === null || value === undefined) return false;
  const str = String(value).trim();
  if (str.length !== 4) return false;
  const num = parseInt(str, 10);
  return !Number.isNaN(num) && num >= 1995 && num <= 2030;
};

/**
 * Verifica automaticamente todos os 12 itens obrigatórios do cadastro do condutor
 * diferenciando claramente CNH Frente/Verso (fotos) de Número da CNH (digitado),
 * sem jamais duplicar CNH na lista.
 */
export function evaluateConductorMissingFields(
  input: ConductorMissingCheckInput
): ConductorMissingCheckResult {
  const vehiclePhotoLabel = input.isMoto ? 'Foto da moto' : 'Foto do carro (Frente)';
  const vehiclePhotoEmoji = input.isMoto ? '🏍️' : '🚗';

  const plateValue = String(input.vehiclePlate || '').trim();
  const cpfValue = String(input.cpf || '').trim();
  const cnhValue = String(input.cnh || '').trim();

  const checks: Array<{ key: string; label: string; emoji: string; ok: boolean }> = [
    { key: 'profile_photo', label: 'Foto de Perfil', emoji: '🤳', ok: isNonEmptyText(input.profilePhoto) },
    { key: 'cnh_front_photo', label: 'CNH Frente (foto)', emoji: '📸', ok: isNonEmptyText(input.cnhFrontPhoto) },
    { key: 'cnh_back_photo', label: 'CNH Verso (foto)', emoji: '📸', ok: isNonEmptyText(input.cnhBackPhoto) },
    { key: 'crlv_photo', label: 'CRLV', emoji: '📄', ok: isNonEmptyText(input.crlvPhoto) },
    { key: 'vehicle_photo', label: vehiclePhotoLabel, emoji: vehiclePhotoEmoji, ok: isNonEmptyText(input.vehiclePhoto) },
    { key: 'vehicle_model', label: 'Modelo', emoji: '🚘', ok: isNonEmptyText(input.vehicleModel) },
    { key: 'vehicle_color', label: 'Cor', emoji: '🎨', ok: isNonEmptyText(input.vehicleColor) },
    { key: 'vehicle_plate', label: 'Placa', emoji: '🔢', ok: Boolean(plateValue) && validatePlate(plateValue).valid },
    { key: 'vehicle_year', label: 'Ano', emoji: '📅', ok: isValidYearInput(input.vehicleYear) },
    { key: 'cpf_number', label: 'CPF', emoji: '🪪', ok: Boolean(cpfValue) && validateCPF(cpfValue).valid },
    { key: 'cnh_number', label: 'Número da CNH', emoji: '🆔', ok: Boolean(cnhValue) && validateCNH(cnhValue).valid },
    { key: 'pix_key', label: 'Chave PIX', emoji: '💰', ok: isNonEmptyText(input.pixKey) },
  ];

  const missingDetails: ConductorMissingItem[] = [];
  const seenLabels = new Set<string>();
  for (const item of checks) {
    if (!item.ok && !seenLabels.has(item.label)) {
      seenLabels.add(item.label);
      missingDetails.push({ key: item.key, label: item.label, emoji: item.emoji });
    }
  }

  const missingItems = missingDetails.map((item) => item.label);
  const completedItems = checks.filter((item) => item.ok).map((item) => item.label);
  const isComplete = missingItems.length === 0;

  let title: string;
  let message: string;

  if (isComplete) {
    title = 'RACE • Cadastro Completo';
    message = 'Cadastro completo! AGUARDANDO APROVAÇÃO! - Equipe RACE';
  } else if (missingItems.length === 1) {
    title = 'RACE • Aguardando Completar Cadastro';
    message = `Aguardando completar cadastro - Você ainda não enviou: ${missingItems[0]}. Complete seu cadastro! - Equipe RACE`;
  } else {
    title = 'RACE • Aguardando Completar Cadastro';
    message = `Aguardando completar cadastro - Você ainda não enviou: ${missingItems.join(', ')}. Complete seu cadastro para ir para aprovação! - Equipe RACE`;
  }

  const signature = isComplete ? 'COMPLETE' : `MISSING:${missingItems.join('|')}`;

  return {
    missingItems,
    missingDetails,
    completedItems,
    isComplete,
    title,
    message,
    signature,
  };
}

/**
 * Avalia os campos faltantes diretamente a partir de um objeto Driver + avatar opcional do usuário.
 */
export function checkDriverObjectMissingFields(
  driver?: Partial<Driver> | null,
  fallbackAvatar?: string | null
): ConductorMissingCheckResult {
  const isMoto =
    driver?.category === 'moto_passageiro' || driver?.category === 'moto_entrega';

  return evaluateConductorMissingFields({
    profilePhoto: driver?.avatar || fallbackAvatar || '',
    cnhFrontPhoto: driver?.cnhFrontPhoto || driver?.cnhPhoto || '',
    cnhBackPhoto: driver?.cnhBackPhoto || '',
    crlvPhoto: driver?.crlvPhoto || '',
    vehiclePhoto: driver?.vehiclePhoto || '',
    vehicleModel: driver?.vehicleModel || '',
    vehicleColor: driver?.vehicleColor || '',
    vehiclePlate: driver?.vehiclePlate || '',
    vehicleYear: driver?.vehicleYear || '',
    cpf: driver?.cpf || '',
    cnh: driver?.cnh || '',
    pixKey: driver?.pixKey || '',
    isMoto,
  });
}

/**
 * Monta a mensagem oficial do WhatsApp da Equipe RACE para o condutor pendente,
 * em formato de lista (um embaixo do outro com emoji), sem duplicar CNH
 * e sempre como Equipe RACE (nunca com nome pessoal do ADM).
 */
export function buildPendingConductorWhatsAppMessage(params: {
  name?: string | null;
  missingItems: string[];
}): string {
  const firstName =
    String(params.name || 'Condutor')
      .trim()
      .split(/\s+/)[0] || 'Condutor';

  const uniqueItems = Array.from(new Set(params.missingItems.filter(Boolean)));

  if (uniqueItems.length > 0) {
    const bulletLines = uniqueItems
      .map((label) => `${ITEM_EMOJI_MAP[label] || '📌'} ${label}`)
      .join('\n');

    return [
      `Olá ${firstName}! 👋`,
      `Você está Aguardando completar cadastro no RACE.`,
      ``,
      `📋 Falta enviar:`,
      bulletLines,
      ``,
      `👉 Complete aqui: ${RACE_APP_PUBLIC_LINK}`,
      ``,
      `- Equipe RACE`,
    ].join('\n');
  }

  return [
    `Olá ${firstName}! 👋`,
    `Seu cadastro no RACE está completo e AGUARDANDO APROVAÇÃO! ✅`,
    ``,
    `👉 Acompanhe aqui: ${RACE_APP_PUBLIC_LINK}`,
    ``,
    `- Equipe RACE`,
  ].join('\n');
}

/**
 * Gera o link direto do WhatsApp com o telefone do condutor e a mensagem pronta.
 */
export function buildPendingConductorWhatsAppUrl(
  phoneOrWhatsApp: string | undefined | null,
  message: string
): string {
  const rawDigits = String(phoneOrWhatsApp || '').replace(/\D/g, '');
  const waPhone =
    rawDigits.length === 10 || rawDigits.length === 11
      ? `55${rawDigits}`
      : rawDigits;
  const encodedText = encodeURIComponent(message);
  return waPhone
    ? `https://wa.me/${waPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
}

function buildSafeEmailFileKey(email: string): string {
  return String(email || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
}

/**
 * Salva a mesma mensagem enviada pelo ADM no Supabase Storage e localStorage
 * para aparecer automaticamente no sino 🔔 do condutor quando ele abrir o app/link.
 */
export async function savePendingConductorBellMessageCloud(
  email: string,
  message: string,
  missingItems: string[]
): Promise<PendingConductorBellMessage | null> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return null;

  const record: PendingConductorBellMessage = {
    email: cleanEmail,
    title:
      missingItems.length > 0
        ? 'RACE • Aguardando Completar Cadastro'
        : 'RACE • Cadastro Completo',
    message,
    missingItems,
    sentAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(
      `${PENDING_BELL_MSG_STORAGE_PREFIX}${cleanEmail}`,
      JSON.stringify(record)
    );
  } catch {
    // ignore storage errors
  }

  try {
    const safeKey = buildSafeEmailFileKey(cleanEmail);
    const path = `driver-messages/${safeKey}.json`;
    const blob = new Blob([JSON.stringify(record)], { type: 'application/json' });
    await supabase.storage.from('avatars').upload(path, blob, {
      upsert: true,
      contentType: 'application/json',
      cacheControl: '30',
    });
  } catch {
    // fallback local já salvo
  }

  return record;
}

/**
 * Busca a última mensagem RACE enviada ao condutor pendente (nuvem + fallback local)
 * para exibir no sino 🔔 quando o condutor abrir o link.
 */
export async function fetchPendingConductorBellMessageCloud(
  email?: string | null
): Promise<PendingConductorBellMessage | null> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return null;

  let localRecord: PendingConductorBellMessage | null = null;
  try {
    const raw = localStorage.getItem(`${PENDING_BELL_MSG_STORAGE_PREFIX}${cleanEmail}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.message === 'string' && parsed.message.trim()) {
        localRecord = parsed;
      }
    }
  } catch {
    // ignore
  }

  try {
    const safeKey = buildSafeEmailFileKey(cleanEmail);
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(`driver-messages/${safeKey}.json`);
    if (data?.publicUrl) {
      const res = await fetch(`${data.publicUrl}?t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const parsed = await res.json();
        if (parsed && typeof parsed.message === 'string' && parsed.message.trim()) {
          if (
            !localRecord ||
            new Date(parsed.sentAt || 0).getTime() >= new Date(localRecord.sentAt || 0).getTime()
          ) {
            return parsed as PendingConductorBellMessage;
          }
        }
      }
    }
  } catch {
    // usa fallback local
  }

  return localRecord;
}

