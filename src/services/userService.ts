import { AppUser, Driver, Ride, UserRole, UserTipo } from '../types';
import {
  saveUsuarioSupabase,
  getUsuarioSupabase,
  loginUsuarioSupabase,
  saveCorridaSupabase,
  deleteUsuarioSupabase,
  zerarDadosTesteSupabase,
  updateDriverOnlineStatusSupabase,
  mapSupabaseRowToDriver,
  normalizeRideCategory,
  getWorkCategoryFullTitle,
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
  aceitou_contrato?: boolean;
  aceitou_termos?: boolean;
  aceitou_lgpd?: boolean;
  data_aceite?: string;
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

export const LOGGED_USER_STORAGE_KEY = 'race_usuario_logado';

/**
 * Salva o usuário logado em localStorage (race_usuario_logado = { login, senha, tipo, nome, foto, ... })
 * para não pedir cadastro novamente enquanto não clicar em Sair.
 */
export function saveSessionUser(user: AppUser | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (!user) {
      localStorage.removeItem('race_current_user');
      localStorage.removeItem(LOGGED_USER_STORAGE_KEY);
      return;
    }

    let existingSaved: any = null;
    try {
      const rawExisting = localStorage.getItem(LOGGED_USER_STORAGE_KEY);
      if (rawExisting) existingSaved = JSON.parse(rawExisting);
    } catch {}

    const cleanEmail = normalizeEmail(user.email || existingSaved?.email || '');
    const resolvedLogin = (user.login || existingSaved?.login || cleanEmail).trim().toLowerCase();
    const resolvedFoto = user.avatar || existingSaved?.foto || existingSaved?.avatar || '';
    const resolvedDriverData = user.driverData || existingSaved?.driverData;
    const sanitizedDriverData = resolvedDriverData
      ? (() => {
          const clone = { ...resolvedDriverData };
          delete (clone as any).password;
          return clone;
        })()
      : undefined;

    const fullSavedSession = {
      id: user.id || existingSaved?.id || '',
      login: resolvedLogin,
      email: cleanEmail,
      tipo: user.tipo || user.role || existingSaved?.tipo || 'passenger',
      role: user.role,
      nome: user.name || existingSaved?.nome || '',
      name: user.name || existingSaved?.nome || '',
      foto: resolvedFoto,
      avatar: resolvedFoto,
      phone: user.phone || existingSaved?.phone || '',
      whatsapp: user.whatsapp || user.phone || existingSaved?.whatsapp || '',
      placa: user.placa || existingSaved?.placa || '',
      rating: user.rating ?? existingSaved?.rating ?? 0,
      isAdmin: user.isAdmin,
      driverData: sanitizedDriverData,
    };

    try {
      localStorage.setItem(LOGGED_USER_STORAGE_KEY, JSON.stringify(fullSavedSession));
    } catch {
      // Caso a foto ou driverData excedam a cota, garante ao menos os dados principais em race_usuario_logado
      const compactSavedSession = {
        ...fullSavedSession,
        driverData: resolvedDriverData
          ? {
              ...resolvedDriverData,
              avatar: '',
              vehiclePhoto: '',
              cnhPhoto: '',
              crlvPhoto: '',
            }
          : undefined,
      };
      try {
        localStorage.setItem(LOGGED_USER_STORAGE_KEY, JSON.stringify(compactSavedSession));
      } catch {
        localStorage.setItem(
          LOGGED_USER_STORAGE_KEY,
          JSON.stringify({ ...compactSavedSession, foto: '', avatar: '' })
        );
      }
    }

    const minimalSession = {
      id: fullSavedSession.id,
      name: fullSavedSession.name,
      email: fullSavedSession.email,
      login: fullSavedSession.login,
      role: fullSavedSession.role,
      tipo: fullSavedSession.tipo,
      isAdmin: fullSavedSession.isAdmin,
    };
    localStorage.setItem('race_current_user', JSON.stringify(minimalSession));
  } catch {}
}

export function getSessionUser(): AppUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const rawSaved =
      localStorage.getItem(LOGGED_USER_STORAGE_KEY) ||
      localStorage.getItem('race_current_user');
    if (!rawSaved) return null;
    const parsed = JSON.parse(rawSaved);
    if (!parsed || (!parsed.email && !parsed.login)) return null;

    const cleanEmail = normalizeEmail(parsed.email || parsed.login || '');
    const tipoStr = String(parsed.tipo || parsed.role || 'passenger');
    const tipoLower = tipoStr.toLowerCase().trim();
    const isAdmin =
      Boolean(parsed.isAdmin) ||
      parsed.role === 'admin' ||
      tipoLower === 'adm' ||
      tipoLower === 'admin' ||
      cleanEmail === ADMIN_EMAIL;
    const isMoto =
      !isAdmin &&
      (parsed.role === 'motoboy' ||
        tipoLower === 'motoboy' ||
        tipoLower === 'motoboy_passageiro' ||
        tipoLower === 'motoboy_entregas');
    const isDriver =
      !isAdmin &&
      (parsed.role === 'driver' ||
        tipoLower === 'driver' ||
        tipoLower === 'motorista' ||
        tipoLower === 'motorista_economico' ||
        tipoLower === 'motorista_confort' ||
        isMoto);

    const role: UserRole = isAdmin ? 'admin' : isMoto ? 'motoboy' : isDriver ? 'driver' : 'passenger';

    return {
      id: String(parsed.id || ''),
      name: parsed.nome || parsed.name || '',
      email: cleanEmail,
      phone: parsed.phone || parsed.whatsapp || '',
      whatsapp: parsed.whatsapp || parsed.phone || '',
      login: parsed.login || cleanEmail,
      role,
      tipo: tipoStr as UserTipo,
      isAdmin: isAdmin || undefined,
      placa: parsed.placa || '',
      avatar: parsed.foto || parsed.avatar || '',
      rating: Number(parsed.rating || 0),
      driverData: parsed.driverData,
    };
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

  const tipoLower = String(cloudUser.tipo || '').toLowerCase().trim();
  const rawCatNorm = cloudUser.categoria ? normalizeRideCategory(cloudUser.categoria) : null;
  const isMoto =
    !isCloudAdmin &&
    (tipoLower === 'motoboy' ||
      tipoLower === 'motoboy_passageiro' ||
      tipoLower === 'motoboy_entregas' ||
      rawCatNorm === 'moto_passageiro' ||
      rawCatNorm === 'moto_entrega');

  const isDriver =
    !isCloudAdmin &&
    (tipoLower === 'driver' ||
      tipoLower === 'motorista' ||
      tipoLower === 'motorista_economico' ||
      tipoLower === 'motorista_confort' ||
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
    avatar: cloudUser.foto || cloudUser.avatar || '',
    rating: Number(cloudUser.rating || 0),
    driverData: driverObj,
    debtAmount: Number(cloudUser.divida || 0),
    isBlockedDebt: Boolean(cloudUser.bloqueado_divida || Number(cloudUser.divida || 0) > 0),
    debtRideId: cloudUser.corrida_divida_id ? String(cloudUser.corrida_divida_id) : undefined,
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

  const isConfiguredDriver = Boolean(
    account.driverData?.categoryConfigured !== false &&
    account.driverData?.vehiclePlate?.trim() &&
    account.driverData?.vehicleModel?.trim()
  );

  saveUsuarioSupabase({
    nome: account.name,
    email: cleanEmail,
    celular: account.phone,
    whatsapp: account.whatsapp || account.phone,
    login: account.login || cleanEmail,
    senha: account.password,
    tipo: account.tipo || (account.role === 'passenger' ? 'passenger' : 'driver'),
    categoria: account.role === 'passenger' || isAdminAccount
      ? undefined
      : isConfiguredDriver && account.driverData?.category
      ? getWorkCategoryFullTitle(account.driverData.category)
      : undefined,
    placa: account.role === 'passenger' || isAdminAccount ? undefined : (account.placa || account.driverData?.vehiclePlate || undefined),
    modelo: account.role === 'passenger' || isAdminAccount ? undefined : (account.driverData?.vehicleModel || undefined),
    ano: account.role === 'passenger' || isAdminAccount ? undefined : (account.driverData?.vehicleYear || undefined),
    cnh: account.role === 'passenger' || isAdminAccount ? undefined : (account.driverData?.cnh || undefined),
    foto: account.avatar || undefined,
    rating: account.rating || 0,
    saldo: account.driverData?.walletBalance || 0,
  })
    .then((res) => {
      if (setActiveSession && res.success && res.data?.id !== undefined && res.data?.id !== null) {
        saveSessionUser({
          ...currentUserPayload,
          id: String(res.data.id),
        });
      }
    })
    .catch((cloudErr) => {
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
    const authRes = await loginUsuarioSupabase(cleanIdentifier, passwordInput);
    if (!authRes.success || !authRes.data) {
      return {
        success: false,
        error: authRes.error || 'Usuário não encontrado ou senha incorreta no Supabase.',
      };
    }

    const { user: userPayload, driver: driverObj } = mapSupabaseRowToAppUser(authRes.data);
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

    if (driver.id || driver.email) {
      updateDriverOnlineStatusSupabase({
        id: driver.id,
        email: driver.email,
        status: 'online',
      }).catch(() => {});
    }

    return updated;
  });

  return updatedDrivers;
}

export function getAllRegisteredPassengers(): AppUser[] {
  return [];
}

