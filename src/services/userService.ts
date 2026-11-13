import { AppUser, Driver, Ride, UserRole, UserTipo } from '../types';
import { WEEKLY_FEE } from '../config/pricing';
import { 
  saveUsuarioSupabase, 
  getUsuarioSupabase, 
  saveCorridaSupabase, 
  getCorridasSupabase 
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
 * Salva a conta do usuário no localStorage com ID único por e-mail: race_user_${email}
 * e atualiza race_current_user com { id, name, email, tipo, placa } apenas se setActiveSession for true
 */
export function saveUserAccount(account: StoredUserAccount, setActiveSession: boolean = true): void {
  const cleanEmail = normalizeEmail(account.email);
  if (!cleanEmail) return;

  const userKey = getUserStorageKey(cleanEmail);
  const normalizedAccount: StoredUserAccount = {
    ...account,
    email: cleanEmail,
    placa: account.placa || account.driverData?.vehiclePlate || '',
    createdAt: account.createdAt || new Date().toISOString(),
  };

  try {
    // 1. Salvar no localStorage com id único race_user_${email}
    localStorage.setItem(userKey, JSON.stringify(normalizedAccount));

    // 2. Preparar payload do usuário
    const currentUserPayload: AppUser = {
      id: normalizedAccount.id,
      name: normalizedAccount.name,
      email: normalizedAccount.email,
      phone: normalizedAccount.phone,
      whatsapp: normalizedAccount.whatsapp || normalizedAccount.phone,
      login: normalizedAccount.login || normalizedAccount.email,
      role: normalizedAccount.role,
      tipo: normalizedAccount.tipo,
      placa: normalizedAccount.placa,
      avatar: normalizedAccount.avatar,
      rating: normalizedAccount.rating || 5.0,
      driverData: normalizedAccount.driverData,
    };

    // Salvar race_current_user com id, nome, email, tipo, placa se setActiveSession for true
    if (setActiveSession) {
      localStorage.setItem('race_current_user', JSON.stringify(currentUserPayload));
    }

    // 3. Atualizar listas globais para acesso exclusivo do Admin (admin@race.com.br)
    if (normalizedAccount.driverData) {
      const storedDrivers = localStorage.getItem('race_registered_drivers');
      const driversList: Driver[] = storedDrivers ? JSON.parse(storedDrivers) : [];
      const updatedDrivers = [
        normalizedAccount.driverData,
        ...driversList.filter((d) => normalizeEmail(d.email) !== cleanEmail),
      ];
      localStorage.setItem('race_registered_drivers', JSON.stringify(updatedDrivers));
    } else if (normalizedAccount.role === 'passenger') {
      const storedPassengers = localStorage.getItem('race_registered_passengers');
      const passList: AppUser[] = storedPassengers ? JSON.parse(storedPassengers) : [];
      const updatedPass = [
        currentUserPayload,
        ...passList.filter((p) => normalizeEmail(p.email) !== cleanEmail),
      ];
      localStorage.setItem('race_registered_passengers', JSON.stringify(updatedPass));
    }
  } catch (err) {
    console.error('Erro ao salvar conta de usuário no localStorage:', err);
  }

  // 4. Salvar na nuvem Supabase (tabela public.usuarios)
  try {
    saveUsuarioSupabase({
      id: normalizedAccount.id,
      nome: normalizedAccount.name,
      email: normalizedAccount.email,
      celular: normalizedAccount.phone,
      whatsapp: normalizedAccount.whatsapp || normalizedAccount.phone,
      login: normalizedAccount.login || normalizedAccount.email,
      senha: normalizedAccount.password,
      tipo: normalizedAccount.tipo || (normalizedAccount.role === 'passenger' ? 'passenger' : 'motorista_economico'),
      categoria: normalizedAccount.driverData?.category || 'economica',
      placa: normalizedAccount.placa || normalizedAccount.driverData?.vehiclePlate || '',
      modelo: normalizedAccount.driverData?.vehicleModel || '',
      ano: normalizedAccount.driverData?.vehicleYear || 2023,
      cnh: normalizedAccount.driverData?.cnh || '',
      avatar: normalizedAccount.avatar || '',
      rating: normalizedAccount.rating || 5.0,
      saldo: normalizedAccount.driverData?.walletBalance || 0,
      plano_ativo: normalizedAccount.driverData?.weeklyPlanActive ?? false,
    }).catch((cloudErr) => {
      console.warn('Aviso de sincronização Supabase usuarios:', cloudErr);
    });
  } catch (cloudErr) {
    console.warn('Erro ao disparar sincronização Supabase usuarios:', cloudErr);
  }
}

/**
 * Recupera os dados isolados do usuário pelo e-mail
 */
export function getUserAccount(email: string): StoredUserAccount | null {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail) return null;

  try {
    const raw = localStorage.getItem(getUserStorageKey(cleanEmail));
    if (raw) {
      return JSON.parse(raw);
    }

    // Fallback de migração para cadastros anteriores
    const storedDrivers = localStorage.getItem('race_registered_drivers');
    if (storedDrivers) {
      const drivers: Driver[] = JSON.parse(storedDrivers);
      const matched = drivers.find((d) => normalizeEmail(d.email) === cleanEmail);
      if (matched) {
        const isMoto = matched.category === 'moto_entrega' || matched.category === 'moto_passageiro';
        const migrated: StoredUserAccount = {
          id: matched.id,
          name: matched.name,
          email: cleanEmail,
          phone: matched.phone,
          role: isMoto ? 'motoboy' : 'driver',
          tipo: matched.category === 'economica' ? 'motorista_economico' :
                matched.category === 'confort' ? 'motorista_confort' :
                matched.category === 'moto_passageiro' ? 'motoboy_passageiro' : 'motoboy_entregas',
          placa: matched.vehiclePlate,
          password: matched.password,
          avatar: matched.avatar,
          rating: matched.rating,
          driverData: matched,
          createdAt: matched.registrationDate || new Date().toISOString(),
        };
        localStorage.setItem(getUserStorageKey(cleanEmail), JSON.stringify(migrated));
        return migrated;
      }
    }

    const storedPassengers = localStorage.getItem('race_registered_passengers');
    if (storedPassengers) {
      const passengers: AppUser[] = JSON.parse(storedPassengers);
      const matched = passengers.find((p) => normalizeEmail(p.email) === cleanEmail);
      if (matched) {
        const migrated: StoredUserAccount = {
          id: matched.id,
          name: matched.name,
          email: cleanEmail,
          phone: matched.phone,
          role: 'passenger',
          tipo: 'passenger',
          placa: '',
          password: matched.password,
          avatar: matched.avatar,
          rating: matched.rating || 5.0,
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(getUserStorageKey(cleanEmail), JSON.stringify(migrated));
        return migrated;
      }
    }
  } catch (err) {
    console.error('Erro ao ler conta de usuário:', err);
  }

  return null;
}

/**
 * Validação segura de login por e-mail e senha
 */
export function verifyUserLogin(
  emailInput: string,
  passwordInput: string
): { success: boolean; error?: string; user?: AppUser; driver?: Driver } {
  const cleanEmail = normalizeEmail(emailInput);
  if (!cleanEmail || !passwordInput) {
    return { success: false, error: 'Por favor, informe seu e-mail e sua senha.' };
  }

  // 0. Conta Mestre de Administrador (admin@race.com.br)
  if (cleanEmail === ADMIN_EMAIL) {
    const validAdminPass = ['race123', 'race@2024', 'admin', 'admin123'];
    if (!validAdminPass.includes(passwordInput)) {
      return { success: false, error: 'Senha incorreta para a conta de Administrador (use race123).' };
    }

    const adminUser: AppUser = {
      id: 'usr-admin-master',
      name: 'Administrador Geral',
      email: ADMIN_EMAIL,
      phone: '(19) 99999-0000',
      role: 'admin',
      isAdmin: true,
      placa: 'ADMIN-01',
      rating: 5.0,
    };

    try {
      localStorage.setItem('race_current_user', JSON.stringify(adminUser));
    } catch {}

    return { success: true, user: adminUser };
  }

  // 1. Busca os dados daquele usuário específico (por e-mail ou por login)
  let account = getUserAccount(cleanEmail);
  if (!account) {
    // Procura por username/login
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('race_user_')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed: StoredUserAccount = JSON.parse(raw);
            if (
              (parsed.login && parsed.login.trim().toLowerCase() === cleanEmail) ||
              (parsed.phone && parsed.phone.replace(/\D/g, '') === cleanEmail.replace(/\D/g, ''))
            ) {
              account = parsed;
              break;
            }
          }
        }
      }
    } catch {}
  }

  if (!account) {
    return { success: false, error: 'Usuário não encontrado. Verifique seu e-mail/login ou crie uma conta.' };
  }

  // 2. Valida a senha
  if (account.password && account.password !== passwordInput) {
    return { success: false, error: 'Senha incorreta para esta conta.' };
  }

  // 3. Monta o AppUser com dados isolados
  const userPayload: AppUser = {
    id: account.id,
    name: account.name,
    email: account.email,
    phone: account.phone,
    whatsapp: account.whatsapp || account.phone,
    login: account.login || account.email,
    role: account.role,
    tipo: account.tipo,
    placa: account.placa || account.driverData?.vehiclePlate || '',
    avatar: account.avatar,
    rating: account.rating || 5.0,
    driverData: account.driverData,
  };

  try {
    localStorage.setItem('race_current_user', JSON.stringify(userPayload));
  } catch {}

  return { success: true, user: userPayload, driver: account.driverData };
}

/**
 * Autenticação assíncrona no Supabase com fallback local
 */
export async function verifyUserLoginAsync(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; error?: string; user?: AppUser; driver?: Driver }> {
  const cleanIdentifier = emailInput.trim().toLowerCase();
  if (!cleanIdentifier || !passwordInput) {
    return { success: false, error: 'Por favor, informe seu Login ou E-mail e sua senha.' };
  }

  // 0. Conta Mestre de Administrador (admin@race.com.br)
  if (cleanIdentifier === ADMIN_EMAIL) {
    return verifyUserLogin(cleanIdentifier, passwordInput);
  }

  // 1. Tentar buscar primeiro na nuvem Supabase
  try {
    const cloudUser = await getUsuarioSupabase(cleanIdentifier);
    if (cloudUser) {
      if (cloudUser.senha && cloudUser.senha !== passwordInput) {
        return { success: false, error: 'Senha incorreta para esta conta.' };
      }

      const isMoto =
        cloudUser.tipo === 'motoboy' ||
        cloudUser.tipo === 'motoboy_passageiro' ||
        cloudUser.tipo === 'motoboy_entregas' ||
        cloudUser.categoria === 'moto_passageiro' ||
        cloudUser.categoria === 'moto_entrega';

      const isDriver =
        cloudUser.tipo === 'driver' ||
        cloudUser.tipo === 'motorista_economico' ||
        cloudUser.tipo === 'motorista_confort' ||
        isMoto;

      let driverObj: Driver | undefined = undefined;
      if (isDriver) {
        driverObj = {
          id: cloudUser.id,
          name: cloudUser.nome,
          email: cloudUser.email,
          phone: cloudUser.celular || cloudUser.whatsapp || '',
          avatar: cloudUser.avatar || '',
          rating: Number(cloudUser.rating || 5.0),
          totalRides: 0,
          vehicleModel: cloudUser.modelo || (isMoto ? 'Honda CG 160 Fan' : 'Chevrolet Onix 1.0'),
          vehiclePlate: cloudUser.placa || (isMoto ? 'MTO-1A23' : 'RCE-2B34'),
          vehicleColor: isMoto ? 'Vermelha' : 'Branco',
          vehicleYear: cloudUser.ano || 2023,
          cpf: '123.456.789-00',
          cnh: cloudUser.cnh || '99887766554',
          category: (cloudUser.categoria as any) || (isMoto ? 'moto_passageiro' : 'economica'),
          weeklyPlanActive: true,
          weeklyPlanPrice: 0,
          status: (cloudUser.status as any) || 'online',
          earningsToday: 0,
          earningsWeek: 0,
          walletBalance: Number(cloudUser.saldo || 0),
          cnhVerified: true,
          vehicleVerified: true,
          criminalRecordClear: true,
          lat: -23.0842,
          lng: -47.2118,
          registrationDate: cloudUser.data_cadastro || new Date().toISOString(),
        };
      }

      const role = isMoto ? 'motoboy' : isDriver ? 'driver' : 'passenger';
      const userPayload: AppUser = {
        id: cloudUser.id,
        name: cloudUser.nome,
        email: cloudUser.email,
        phone: cloudUser.celular || cloudUser.whatsapp || '',
        whatsapp: cloudUser.whatsapp || cloudUser.celular || '',
        login: cloudUser.login || cloudUser.email,
        role: role as any,
        tipo: (cloudUser.tipo as any) || role,
        placa: cloudUser.placa || '',
        avatar: cloudUser.avatar || '',
        rating: Number(cloudUser.rating || 5.0),
        driverData: driverObj,
      };

      // Atualiza cache local
      saveUserAccount(
        {
          id: userPayload.id,
          name: userPayload.name,
          email: userPayload.email,
          phone: userPayload.phone,
          whatsapp: userPayload.whatsapp,
          login: userPayload.login,
          role: userPayload.role,
          tipo: userPayload.tipo,
          placa: userPayload.placa,
          password: cloudUser.senha,
          avatar: userPayload.avatar,
          rating: userPayload.rating,
          driverData: driverObj,
          createdAt: cloudUser.data_cadastro || new Date().toISOString(),
        },
        true
      );

      return { success: true, user: userPayload, driver: driverObj };
    }
  } catch (err) {
    console.warn('Aviso na busca no Supabase durante login, usando cache local:', err);
  }

  // 2. Se não encontrou no Supabase ou offline, consulta localmente
  return verifyUserLogin(cleanIdentifier, passwordInput);
}

/**
 * Retorna as corridas isoladas do usuário autenticado
 * Motorista/Motoboy: só as corridas DELE
 * Passageiro: só as corridas que ELE pediu
 * Admin: todas as corridas
 */
export function getIsolatedUserRides(currentUser: AppUser | null): Ride[] {
  if (!currentUser) return [];

  const cleanEmail = normalizeEmail(currentUser.email);

  // Admin vê todas as corridas registradas
  if (currentUser.role === 'admin' || currentUser.isAdmin || cleanEmail === ADMIN_EMAIL) {
    try {
      const allRidesRaw = localStorage.getItem('race_rides_history');
      if (allRidesRaw) return JSON.parse(allRidesRaw);
    } catch {}
    return [];
  }

  // Usuário comum: carregar APENAS as corridas DELE
  try {
    // 1. Verifica no storage isolado do usuário
    const isolatedRaw = localStorage.getItem(getUserRidesStorageKey(cleanEmail));
    if (isolatedRaw) {
      const parsed: Ride[] = JSON.parse(isolatedRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // 2. Se não houver storage isolado ainda, filtra da base geral
    const allRidesRaw = localStorage.getItem('race_rides_history');
    if (allRidesRaw) {
      const allRides: Ride[] = JSON.parse(allRidesRaw);
      const isDriverOrMotoboy = currentUser.role === 'driver' || currentUser.role === 'motoboy';

      const filtered = allRides.filter((ride) => {
        if (isDriverOrMotoboy) {
          return (
            ride.driver?.id === currentUser.id ||
            normalizeEmail(ride.driver?.email || '') === cleanEmail
          );
        } else {
          return (
            (ride as any).passengerId === currentUser.id ||
            normalizeEmail((ride as any).passengerEmail || '') === cleanEmail ||
            ride.passengerPhone === currentUser.phone
          );
        }
      });

      // Salva no storage isolado para manter a performance
      if (filtered.length > 0) {
        localStorage.setItem(getUserRidesStorageKey(cleanEmail), JSON.stringify(filtered));
      }
      return filtered;
    }
  } catch (err) {
    console.error('Erro ao ler histórico isolado:', err);
  }

  return [];
}

/**
 * Salva uma nova corrida nos dados isolados do usuário e no histórico geral para o Admin
 */
export function saveIsolatedRide(ride: Ride, currentUser: AppUser | null): void {
  try {
    // 1. Salva no histórico geral da plataforma (apenas para o Admin auditar)
    const allRidesRaw = localStorage.getItem('race_rides_history');
    const allRides: Ride[] = allRidesRaw ? JSON.parse(allRidesRaw) : [];
    const nextAll = [ride, ...allRides.filter((r) => r.id !== ride.id)];
    localStorage.setItem('race_rides_history', JSON.stringify(nextAll));

    // 2. Salva no storage isolado do passageiro
    const passEmail = normalizeEmail((ride as any).passengerEmail || currentUser?.email || '');
    if (passEmail && passEmail !== ADMIN_EMAIL) {
      const passKey = getUserRidesStorageKey(passEmail);
      const passRidesRaw = localStorage.getItem(passKey);
      const passRides: Ride[] = passRidesRaw ? JSON.parse(passRidesRaw) : [];
      const nextPassRides = [ride, ...passRides.filter((r) => r.id !== ride.id)];
      localStorage.setItem(passKey, JSON.stringify(nextPassRides));
    }

    // 3. Salva no storage isolado do motorista
    const driverEmail = normalizeEmail(ride.driver?.email || '');
    if (driverEmail && driverEmail !== ADMIN_EMAIL) {
      const drvKey = getUserRidesStorageKey(driverEmail);
      const drvRidesRaw = localStorage.getItem(drvKey);
      const drvRides: Ride[] = drvRidesRaw ? JSON.parse(drvRidesRaw) : [];
      const nextDrvRides = [ride, ...drvRides.filter((r) => r.id !== ride.id)];
      localStorage.setItem(drvKey, JSON.stringify(nextDrvRides));

      // Atualiza também os ganhos no registro isolado do motorista
      const drvAccount = getUserAccount(driverEmail);
      if (drvAccount && drvAccount.driverData) {
        drvAccount.driverData.earningsToday = (drvAccount.driverData.earningsToday || 0) + ride.price;
        drvAccount.driverData.earningsWeek = (drvAccount.driverData.earningsWeek || 0) + ride.price;
        drvAccount.driverData.totalRides = (drvAccount.driverData.totalRides || 0) + 1;
        saveUserAccount(drvAccount);
      }
    }
  } catch (err) {
    console.error('Erro ao salvar corrida isolada:', err);
  }

  // 4. Salvar na nuvem Supabase (tabela public.corridas)
  try {
    saveCorridaSupabase(ride, currentUser).catch((cloudErr) => {
      console.warn('Aviso de sincronização Supabase corridas:', cloudErr);
    });
  } catch (cloudErr) {
    console.warn('Erro ao disparar sincronização Supabase corridas:', cloudErr);
  }
}

/**
 * Remove um cadastro individual (motorista ou passageiro)
 */
export function deleteUserAccount(email: string, id?: string): void {
  const cleanEmail = normalizeEmail(email);
  if (!cleanEmail || cleanEmail === ADMIN_EMAIL) return;

  try {
    // 1. Remove a chave única race_user_${email}
    localStorage.removeItem(getUserStorageKey(cleanEmail));

    // 2. Remove as corridas isoladas daquele usuário
    localStorage.removeItem(getUserRidesStorageKey(cleanEmail));

    // 3. Remove da lista de motoristas cadastrados
    const storedDrivers = localStorage.getItem('race_registered_drivers');
    if (storedDrivers) {
      const drivers: Driver[] = JSON.parse(storedDrivers);
      const filtered = drivers.filter(
        (d) => normalizeEmail(d.email) !== cleanEmail && (id ? d.id !== id : true)
      );
      localStorage.setItem('race_registered_drivers', JSON.stringify(filtered));
    }

    // 4. Remove da lista de passageiros cadastrados
    const storedPassengers = localStorage.getItem('race_registered_passengers');
    if (storedPassengers) {
      const passengers: AppUser[] = JSON.parse(storedPassengers);
      const filtered = passengers.filter(
        (p) => normalizeEmail(p.email) !== cleanEmail && (id ? p.id !== id : true)
      );
      localStorage.setItem('race_registered_passengers', JSON.stringify(filtered));
    }

    // 5. Se for o usuário logado atualmente (e não for admin), limpa a sessão
    const currentRaw = localStorage.getItem('race_current_user');
    if (currentRaw) {
      const current = JSON.parse(currentRaw);
      if (normalizeEmail(current.email) === cleanEmail) {
        localStorage.removeItem('race_current_user');
      }
    }
  } catch (err) {
    console.error('Erro ao remover cadastro:', err);
  }
}

/**
 * Remove TODOS os cadastros de motoristas e passageiros (Apenas Admin)
 */
export function deleteAllUserAccounts(): void {
  try {
    // 1. Percorre todas as chaves do localStorage e remove race_user_* (exceto admin)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('race_user_') || key.startsWith('race_rides_'))) {
        if (!key.includes(ADMIN_EMAIL)) {
          keysToRemove.push(key);
        }
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // 2. Limpa a lista de motoristas registrados
    localStorage.setItem('race_registered_drivers', JSON.stringify([]));

    // 3. Limpa a lista de passageiros registrados
    localStorage.setItem('race_registered_passengers', JSON.stringify([]));

    // 4. Se o usuário atual não for o admin, limpa race_current_user
    const currentRaw = localStorage.getItem('race_current_user');
    if (currentRaw) {
      const cur = JSON.parse(currentRaw);
      if (normalizeEmail(cur.email) !== ADMIN_EMAIL) {
        localStorage.removeItem('race_current_user');
      }
    }
  } catch (err) {
    console.error('Erro ao remover todos os cadastros:', err);
  }
}

/**
 * Ativa TODOS os cadastros de motoristas/motoboys (status online com 85% dos ganhos e 15% Race)
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

    // Atualiza também a conta isolada race_user_${email}
    if (driver.email) {
      const cleanEmail = normalizeEmail(driver.email);
      const acc = getUserAccount(cleanEmail);
      if (acc) {
        saveUserAccount(
          {
            ...acc,
            driverData: updated,
            placa: updated.vehiclePlate,
          },
          false // Não substitui a sessão do admin
        );
      }
    }

    return updated;
  });

  try {
    localStorage.setItem('race_registered_drivers', JSON.stringify(updatedDrivers));
  } catch {}

  return updatedDrivers;
}

/**
 * Retorna todos os passageiros cadastrados no sistema
 */
export function getAllRegisteredPassengers(): AppUser[] {
  try {
    const stored = localStorage.getItem('race_registered_passengers');
    if (stored) {
      const list: AppUser[] = JSON.parse(stored);
      if (Array.isArray(list)) return list;
    }
  } catch {}
  return [];
}

