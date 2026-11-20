import { Driver } from '../types';
import { validateCNH, validateCPF, validatePlate } from '../utils/documentValidation';

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
