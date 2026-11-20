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

export interface ConductorMissingCheckResult {
  missingItems: string[];
  completedItems: string[];
  isComplete: boolean;
  title: string;
  message: string;
  signature: string;
}

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
 * e gera a mensagem oficial da Equipe RACE listando SOMENTE o que falta
 * (ou confirmando que o cadastro está completo e AGUARDANDO APROVAÇÃO).
 */
export function evaluateConductorMissingFields(
  input: ConductorMissingCheckInput
): ConductorMissingCheckResult {
  const vehiclePhotoLabel = input.isMoto ? 'Foto da moto' : 'Foto do carro';

  const plateValue = String(input.vehiclePlate || '').trim();
  const cpfValue = String(input.cpf || '').trim();
  const cnhValue = String(input.cnh || '').trim();

  const checks: Array<{ label: string; ok: boolean }> = [
    { label: 'Foto de Perfil', ok: isNonEmptyText(input.profilePhoto) },
    { label: 'CNH Frente', ok: isNonEmptyText(input.cnhFrontPhoto) },
    { label: 'CNH Verso', ok: isNonEmptyText(input.cnhBackPhoto) },
    { label: 'CRLV', ok: isNonEmptyText(input.crlvPhoto) },
    { label: vehiclePhotoLabel, ok: isNonEmptyText(input.vehiclePhoto) },
    { label: 'Modelo', ok: isNonEmptyText(input.vehicleModel) },
    { label: 'Cor', ok: isNonEmptyText(input.vehicleColor) },
    { label: 'Placa', ok: Boolean(plateValue) && validatePlate(plateValue).valid },
    { label: 'Ano', ok: isValidYearInput(input.vehicleYear) },
    { label: 'CPF', ok: Boolean(cpfValue) && validateCPF(cpfValue).valid },
    { label: 'CNH', ok: Boolean(cnhValue) && validateCNH(cnhValue).valid },
    { label: 'Chave PIX', ok: isNonEmptyText(input.pixKey) },
  ];

  const missingItems = checks.filter((item) => !item.ok).map((item) => item.label);
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
 * Monta a mensagem oficial do WhatsApp da Equipe RACE para o condutor pendente
 * (sempre como RACE, nunca com nome pessoal do ADM).
 */
export function buildPendingConductorWhatsAppMessage(params: {
  name?: string | null;
  missingItems: string[];
}): string {
  const firstName =
    String(params.name || 'Condutor')
      .trim()
      .split(/\s+/)[0] || 'Condutor';

  if (params.missingItems.length > 0) {
    return `Olá ${firstName}! Você está Aguardando completar cadastro no RACE. Falta: ${params.missingItems.join(', ')}. Complete aqui: ${RACE_APP_PUBLIC_LINK} - Equipe RACE`;
  }

  return `Olá ${firstName}! Seu cadastro no RACE está completo e AGUARDANDO APROVAÇÃO! Acompanhe aqui: ${RACE_APP_PUBLIC_LINK} - Equipe RACE`;
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

