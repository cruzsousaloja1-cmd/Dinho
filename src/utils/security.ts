import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 10;

export function isBcryptHash(value?: string | null): boolean {
  if (!value) return false;
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

/**
 * Gera hash seguro bcrypt (salt rounds = 10) antes de enviar senha ao Supabase.
 */
export async function hashPasswordBcrypt(plainPassword: string): Promise<string> {
  const pwd = String(plainPassword || '');
  if (!pwd) return '';
  if (isBcryptHash(pwd)) return pwd;
  return bcrypt.hash(pwd, BCRYPT_SALT_ROUNDS);
}

/**
 * Compara senha digitada contra o hash armazenado no banco (com compatibilidade para contas legadas).
 */
export async function verifyPasswordBcrypt(
  plainPassword: string,
  storedHashOrLegacy?: string | null
): Promise<boolean> {
  if (!plainPassword || !storedHashOrLegacy) return false;
  if (isBcryptHash(storedHashOrLegacy)) {
    try {
      return await bcrypt.compare(plainPassword, storedHashOrLegacy);
    } catch {
      return false;
    }
  }
  return plainPassword === storedHashOrLegacy;
}

/**
 * Valida formato de e-mail válido.
 */
export function isValidEmail(email: string): boolean {
  const clean = String(email || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean);
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
