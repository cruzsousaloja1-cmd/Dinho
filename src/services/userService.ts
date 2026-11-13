import { AppUser, Driver, Ride, UserRole, UserTipo } from '../types';
import {
  saveUsuarioSupabase,
  getUsuarioSupabase,
  saveCorridaSupabase,
  deleteUsuarioSupabase,
  zerarDadosTesteSupabase,
  supabase,
  mapSupabaseRowToDriver,
} from '../supabase';

export interface StoredUserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  whatsapp?: string;
  login?: string;
  role: UserRole;
  tipo?: UserTipo;
  placa?: string;
  password?: string;
  avatar?: string;
  rating?: number;
  driverData?: Driver;
  rides?: Ride[];
  createdAt: string;
}

export const ADMIN_EMAIL = 'admin@race.com.br';

export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

export function getUserStorageKey(email: string): string {
  return `race_user_${normalizeEmail(email)}`;
}

export function getUserRidesStorageKey(email: string): string {
  return `race_rides_${normalizeEmail(email)}`;
}

/**
 * Salva apenas a sessão mínima do usuário logado (validada no Supabase a cada abertura do app)
 */
export function saveSessionUser(user: AppUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!user) {
      localStorage.removeItem('race_current_user');
      return;
    }
    const minimalSession = {
      id: user.id,
      name: user.name,
      email: normalizeEmail(user.email),
      role: user.role,
      tipo: user.tipo,
      isAdmin: user.isAdmin,
    };
    localStorage.setItem('race_current_user', JSON.stringify(minimalSession));
  } catch {}
}

export function getSessionUser(): AppUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('race_current_user');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.email) return parsed;
  } catch {}
  return null;
}

/**
 * Converte uma linha da tabela public.usuarios do Supabase para AppUser e Driver
 */
export function mapSupabaseRowToAppUser(cloudUser: any): { user: AppUser; driver?: Driver } {
  const cleanEmail = normalizeEmail(cloudUser['e-mail'] || cloudUser.email || '');
  const isCloudAdmin =
    String(cloudUser.tipo || '').toUpperCase() === 'ADM' ||
    String(cloudUser.tipo || '').toLowerCase() === 'admin';

  const isMoto =
    !isCloudAdmin &&
    (cloudUser.tipo === 'motoboy' ||
      cloudUser.tipo === 'motoboy_passageiro' ||
      cloudUser.tipo === 'motoboy_entregas' ||
      cloudUser.categoria === 'moto_passageiro' ||
      cloudUser.categoria === 'moto_entrega');

  const isDriver =
    !isCloudAdmin &&
    (cloudUser.tipo === 'driver' ||
      cloudUser.tipo === 'motorista_economico' ||
      cloudUser.tipo === 'motorista_confort' ||
      isMoto);

  const driverObj: Driver | undefined = isDriver ? mapSupabaseRowToDriver(cloudUser) : undefined;
  const role: UserRole = isCloudAdmin ? 'admin' : isMoto ? 'motoboy' : isDriver ? 'driver' : 'passenger';

  const userPayload: AppUser = {
    id: String(cloudUser.id),
    name: cloudUser.nome || '',
    email: cleanEmail,
    phone: cloudUser.celular || cloudUser.whatsapp || '',
    whatsapp: cloudUser.whatsapp || cloudUser.celular || '',
    login: cloudUser.login || cleanEmail,
    role,
    tipo: (cloudUser.tipo as UserTipo) || role,
    isAdmin: isCloudAdmin || undefined,
    placa: cloudUser.placa || '',
    avatar: cloudUser.avatar || '',
    rating: Number(cloudUser.rating || 0),
    driverData: driverObj,
  };

  return { user: userPayload, driver: driverObj };
}

/**
 * Sincroniza a conta do usuário diretamente no Supabase (sem armazenar dados em localStorage)
 */
export function saveUserAccount(account: StoredUserAccount, setActiveSession: boolean = true): void {
  const cleanEmail = normalizeEmail(account.email);
  if (!cleanEmail) return;

  const isAdminAccount =
    account.role === 'admin' ||
    String(account.tipo || '').toUpperCase() === 'ADM';

  const currentUserPayload: AppUser = {
    id: account.id,
    name: account.name,
    email: cleanEmail,
    phone: account.phone,
    whatsapp: account.whatsapp || account.phone,
    login: account.login || cleanEmail,
    role: isAdminAccount ? 'admin' : account.role,
    tipo: account.tipo,
    isAdmin: isAdminAccount || undefined,
    placa: account.placa || account.driverData?.vehiclePlate || '',
    avatar: account.avatar,
    rating: account.rating || 0,
    driverData: account.driverData,
  };

  if (setActiveSession) {
    saveSessionUser(currentUserPayload);
  }

  saveUsuarioSupabase({
    id: account.id,
    nome: account.name,
    email: cleanEmail,
    celular: account.phone,
    whatsapp: account.whatsapp || account.phone,
    login: account.login || cleanEmail,
    senha: account.password,
    tipo: account.tipo || (account.role === 'passenger' ? 'passenger' : 'driver'),
    categoria: account.driverData?.category || 'economica',
    placa: account.placa || account.driverData?.vehiclePlate || '',
    modelo: account.driverData?.vehicleModel || '',
    ano: account.driverData?.vehicleYear || 2023,
    cnh: account.driverData?.cnh || '',
    avatar: account.avatar || '',
    rating: account.rating || 0,
    saldo: account.driverData?.walletBalance || 0,
    plano_ativo: account.driverData?.weeklyPlanActive ?? false,
  }).catch((cloudErr) => {
    console.warn('Aviso de sincronização Supabase usuarios:', cloudErr);
  });
}

export function getUserAccount(_email: string): StoredUserAccount | null {
  return null;
}

export function getStoredAdminPassword(): string | null {
  return null;
}

export function findLocalUserAccount(_identifier: string): StoredUserAccount | null {
  return null;
}

export function updateUserPasswordLocal(_identifier: string, _newPassword: string): void {
  // Senhas são persistidas exclusivamente no Supabase (public.usuarios)
}

export function verifyUserLogin(
  _emailInput: string,
  _passwordInput: string
): { success: boolean; error?: string; user?: AppUser; driver?: Driver } {
  return { success: false, error: 'Use a autenticação online do Supabase.' };
}

/**
 * Autenticação estritamente via Supabase (tabela public.usuarios)
 */
export async function verifyUserLoginAsync(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; error?: string; user?: AppUser; driver?: Driver }> {
  const cleanIdentifier = emailInput.trim().toLowerCase();
  if (!cleanIdentifier || !passwordInput) {
    return { success: false, error: 'Por favor, informe seu Login ou E-mail e sua senha.' };
  }

  try {
    const cloudUser = await getUsuarioSupabase(cleanIdentifier);
    if (!cloudUser) {
      return {
        success: false,
        error: 'Usuário não encontrado no Supabase. Verifique seu e-mail ou crie uma conta.',
      };
    }

    if (cloudUser.status === 'bloqueado') {
      return {
        success: false,
        error: 'Esta conta está bloqueada pela administração.',
      };
    }

    if (cloudUser.senha && cloudUser.senha !== passwordInput) {
      return { success: false, error: 'Senha incorreta para esta conta.' };
    }

    const { user: userPayload, driver: driverObj } = mapSupabaseRowToAppUser(cloudUser);
    saveSessionUser(userPayload);

    return { success: true, user: userPayload, driver: driverObj };
  } catch (err) {
    console.warn('Erro ao autenticar no Supabase:', err);
    return {
      success: false,
      error: 'Erro de conexão com o Supabase. Tente novamente.',
    };
  }
}

export function getIsolatedUserRides(_currentUser: AppUser | null): Ride[] {
  return [];
}

/**
 * Salva uma nova corrida diretamente no Supabase (tabela public.corridas)
 */
export function saveIsolatedRide(ride: Ride, currentUser: AppUser | null): void {
  saveCorridaSupabase(ride, currentUser).catch((cloudErr) => {
    console.warn('Aviso de sincronização Supabase corridas:', cloudErr);
  });
}

/**
 * Remove um cadastro individual do Supabase (motorista ou passageiro)
 */
export function deleteUserAccount(email: string, id?: string): void {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || cleanEmail === ADMIN_EMAIL) return;

  deleteUsuarioSupabase({ id, email: cleanEmail }).catch(() => {});

  const session = getSessionUser();
  if (session && normalizeEmail(session.email) === cleanEmail) {
    saveSessionUser(null);
  }
}

/**
 * Zera TODOS os dados de teste no Supabase (corridas, pagamentos e usuários não-ADM)
 */
export async function deleteAllUserAccounts(): Promise<void> {
  await zerarDadosTesteSupabase();
}

/**
 * Ativa TODOS os cadastros de motoristas/motoboys no Supabase
 */
export function activateAllDriverAccounts(currentDrivers: Driver[]): Driver[] {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const updatedDrivers = currentDrivers.map((driver) => {
    const updated: Driver = {
      ...driver,
      weeklyFeePaidAt: now.toISOString(),
      weeklyFeeExpiresAt: expiresAt.toISOString(),
      weeklyPlanExpiresAt: expiresAt.toISOString(),
      weeklyPlanActive: true,
      weeklyPlanPrice: 0,
      status: 'online',
      cnhVerified: true,
      vehicleVerified: true,
      pendingPayment: driver.pendingPayment
        ? {
            ...driver.pendingPayment,
            status: 'approved',
          }
        : null,
    };

    if (driver.id) {
      supabase
        .from('usuarios')
        .update({ plano_ativo: true, status: 'online' })
        .eq('id', driver.id)
        .then(() => {}, () => {});
    }

    return updated;
  });

  return updatedDrivers;
}

export function getAllRegisteredPassengers(): AppUser[] {
  return [];
}

