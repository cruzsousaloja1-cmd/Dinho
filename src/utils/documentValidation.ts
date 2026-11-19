/**
 * Validação estrita de documentos e dados brasileiros (CPF, CNH, Placa, E-mail .com e WhatsApp 11 dígitos)
 * aplicada antes de salvar cadastros no Supabase.
 */

export interface DocumentValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

export const CPF_INVALID_ERROR = 'CPF inválido. Digite o CPF correto.';
export const CNH_INVALID_ERROR = 'CNH inválida.';
export const PLATE_INVALID_ERROR = 'Placa inválida. Digite ABC-1234 ou ABC1D23.';
export const EMAIL_INVALID_ERROR = 'E-mail inválido. Digite um e-mail válido com @ e .com (ex: seu.nome@gmail.com).';
export const WHATSAPP_INVALID_ERROR = 'WhatsApp inválido! Digite exatamente 11 dígitos com DDD + 9 (ex: 19999999999).';

/**
 * Valida CPF brasileiro (11 dígitos + dígitos verificadores Módulo 11, bloqueando sequências repetidas como 111.111.111-11 e 000.000.000-00).
 */
export function validateCPF(rawCpf: string): DocumentValidationResult {
  const digits = String(rawCpf || '').replace(/\D/g, '');
  if (digits.length !== 11) {
    return { valid: false, error: CPF_INVALID_ERROR };
  }
  if (/^(\d)\1{10}$/.test(digits)) {
    return { valid: false, error: CPF_INVALID_ERROR };
  }

  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += Number(digits[i]) * (10 - i);
  }
  const rem1 = (sum1 * 10) % 11;
  const check1 = rem1 === 10 ? 0 : rem1;
  if (check1 !== Number(digits[9])) {
    return { valid: false, error: CPF_INVALID_ERROR };
  }

  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += Number(digits[i]) * (11 - i);
  }
  const rem2 = (sum2 * 10) % 11;
  const check2 = rem2 === 10 ? 0 : rem2;
  if (check2 !== Number(digits[10])) {
    return { valid: false, error: CPF_INVALID_ERROR };
  }

  const formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  return { valid: true, normalized: formatted };
}

/**
 * Valida CNH brasileira (11 dígitos + 2 dígitos verificadores oficiais do DETRAN, bloqueando sequências repetidas).
 */
export function validateCNH(rawCnh: string): DocumentValidationResult {
  const digits = String(rawCnh || '').replace(/\D/g, '');
  if (digits.length !== 11) {
    return { valid: false, error: CNH_INVALID_ERROR };
  }
  if (/^(\d)\1{10}$/.test(digits)) {
    return { valid: false, error: CNH_INVALID_ERROR };
  }

  let sum1 = 0;
  for (let i = 0, weight = 9; i < 9; i++, weight--) {
    sum1 += Number(digits[i]) * weight;
  }
  let dsc = 0;
  let dv1 = sum1 % 11;
  if (dv1 >= 10) {
    dv1 = 0;
    dsc = 2;
  }

  let sum2 = 0;
  for (let i = 0, weight = 1; i < 9; i++, weight++) {
    sum2 += Number(digits[i]) * weight;
  }
  let rem2 = (sum2 % 11) - dsc;
  if (rem2 < 0) rem2 += 11;
  const dv2 = rem2 >= 10 ? 0 : rem2;

  if (dv1 !== Number(digits[9]) || dv2 !== Number(digits[10])) {
    return { valid: false, error: CNH_INVALID_ERROR };
  }

  return { valid: true, normalized: digits };
}

/**
 * Valida placa brasileira nos formatos antigos (ABC-1234) ou Mercosul (ABC1D23).
 */
export function validatePlate(rawPlate: string): DocumentValidationResult {
  const clean = String(rawPlate || '').trim().toUpperCase().replace(/\s+/g, '');
  const oldWithDash = /^[A-Z]{3}-\d{4}$/;
  const oldNoDash = /^[A-Z]{3}\d{4}$/;
  const mercosul = /^[A-Z]{3}\d[A-Z]\d{2}$/;

  if (oldWithDash.test(clean)) {
    return { valid: true, normalized: clean };
  }
  if (oldNoDash.test(clean)) {
    return { valid: true, normalized: `${clean.slice(0, 3)}-${clean.slice(3)}` };
  }
  if (mercosul.test(clean)) {
    return { valid: true, normalized: clean };
  }

  return { valid: false, error: PLATE_INVALID_ERROR };
}

/**
 * Valida e-mail contendo @ e domínio .com (aceita .com e .com.br).
 */
export function validateEmailCom(rawEmail: string): DocumentValidationResult {
  const clean = String(rawEmail || '').replace(/\s+/g, '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.com(\.[a-z]{2,})?$/i.test(clean)) {
    return { valid: false, error: EMAIL_INVALID_ERROR };
  }
  return { valid: true, normalized: clean };
}

/**
 * Valida WhatsApp brasileiro: exatamente 11 dígitos numéricos (DDD válido + dígito 9 + 8 números).
 */
export function validateWhatsAppBR(rawPhone: string): DocumentValidationResult {
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (digits.length !== 11 || !/^[1-9]{2}9\d{8}$/.test(digits)) {
    return { valid: false, error: WHATSAPP_INVALID_ERROR };
  }
  return { valid: true, normalized: digits };
}
