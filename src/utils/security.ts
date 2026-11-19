/**
 * Valida formato de e-mail válido.
 */
export function isValidEmail(email: string): boolean {
  const clean = String(email || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.com(\.[a-z]{2,})?$/i.test(clean);
}

/**
 * Extrai apenas os dígitos numéricos de uma string.
 */
export function digitsOnly(value: string): string {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Valida WhatsApp brasileiro com exatamente 11 dígitos (DDD + 9 + 8 dígitos).
 */
export function isValidWhatsApp11(phone: string): boolean {
  const digits = digitsOnly(phone);
  return digits.length === 11 && /^[1-9]{2}9\d{8}$/.test(digits);
}

/**
 * Valida senha forte mínima (pelo menos 6 caracteres).
 */
export function isValidPassword(password: string): boolean {
  return String(password || '').length >= 6;
}

/**
 * Mascara documentos sensíveis (CPF / CNH) exibindo apenas os últimos 4 dígitos.
 */
export function maskLast4Digits(rawValue?: string | null): string {
  const str = String(rawValue || '').trim();
  if (!str) return '';
  const digits = str.replace(/\D/g, '');
  if (digits.length >= 4) {
    const last4 = digits.slice(-4);
    const hiddenLen = Math.max(4, digits.length - 4);
    return `${'*'.repeat(hiddenLen)}${last4}`;
  }
  if (str.length <= 4) return '****';
  return `${'*'.repeat(str.length - 4)}${str.slice(-4)}`;
}
