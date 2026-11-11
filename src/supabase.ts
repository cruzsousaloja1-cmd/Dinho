import { createClient } from '@supabase/supabase-js';
import { AppUser, Driver, Ride } from './types';
import { RACE_PIX_KEY } from './config/pricing';

export const SUPABASE_URL = 'https://catljaosibqsqexzkrrv.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_FLS7sl0xEJ2StmxWfsJQ3Q_y_GiYKoM';

// Cliente oficial Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * SQL DDL para criar as tabelas no Supabase caso ainda não tenham sido criadas no SQL Editor
 */
export const SUPABASE_SETUP_SQL = `-- SCRIPT OFICIAL RACE - EXECUTE NO SQL EDITOR DO SUPABASE (https://supabase.com/dashboard)

-- 1. TABELA DE USUÁRIOS (Motoristas, Motoboys, Passageiros e Admin)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  celular TEXT,
  whatsapp TEXT,
  login TEXT,
  senha TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'passenger',
  categoria TEXT DEFAULT 'economica',
  placa TEXT DEFAULT '',
  modelo TEXT DEFAULT '',
  ano INTEGER DEFAULT 2023,
  cnh TEXT DEFAULT '',
  avatar TEXT,
  rating NUMERIC DEFAULT 5.0,
  saldo NUMERIC DEFAULT 0.0,
  plano_ativo BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'offline',
  data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. TABELA DE CORRIDAS
CREATE TABLE IF NOT EXISTS public.corridas (
  id TEXT PRIMARY KEY,
  id_passageiro TEXT,
  email_passageiro TEXT,
  nome_passageiro TEXT,
  id_motorista TEXT,
  email_motorista TEXT,
  nome_motorista TEXT,
  origem JSONB,
  destino JSONB,
  origem_texto TEXT,
  destino_texto TEXT,
  valor NUMERIC NOT NULL,
  categoria TEXT DEFAULT 'economica',
  status TEXT DEFAULT 'completed',
  forma_pagamento TEXT DEFAULT 'pix',
  rating_dado NUMERIC,
  comentario TEXT,
  detalhe_problema TEXT,
  data TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE PAGAMENTOS (Assinatura Semanal R$ 200 e Saques)
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id TEXT PRIMARY KEY,
  id_motorista TEXT,
  nome_motorista TEXT,
  email_motorista TEXT,
  valor NUMERIC NOT NULL DEFAULT 200.00,
  tipo TEXT DEFAULT 'assinatura_semanal',
  status TEXT DEFAULT 'pending',
  chave_pix TEXT DEFAULT '9d9e5635-9e68-46bf-bffe-08bdae29c8ba',
  comprovante_url TEXT,
  data TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corridas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para o client publishable do RACE
DROP POLICY IF EXISTS "Acesso total usuarios" ON public.usuarios;
CREATE POLICY "Acesso total usuarios" ON public.usuarios FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total corridas" ON public.corridas;
CREATE POLICY "Acesso total corridas" ON public.corridas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total pagamentos" ON public.pagamentos;
CREATE POLICY "Acesso total pagamentos" ON public.pagamentos FOR ALL USING (true) WITH CHECK (true);
`;

export interface SupabaseUsuarioRow {
  id: string;
  nome: string;
  email: string;
  celular?: string;
  whatsapp?: string;
  login?: string;
  senha?: string;
  tipo?: string;
  categoria?: string;
  placa?: string;
  modelo?: string;
  ano?: number;
  cnh?: string;
  avatar?: string;
  rating?: number;
  saldo?: number;
  plano_ativo?: boolean;
  status?: string;
  data_cadastro?: string;
}

export interface SupabaseCorridaRow {
  id: string;
  id_passageiro: string;
  email_passageiro?: string;
  nome_passageiro?: string;
  id_motorista: string;
  email_motorista?: string;
  nome_motorista?: string;
  origem: any;
  destino: any;
  origem_texto?: string;
  destino_texto?: string;
  valor: number;
  categoria?: string;
  status: string;
  forma_pagamento?: string;
  rating_dado?: number;
  comentario?: string;
  detalhe_problema?: string;
  data: string;
}

export interface SupabasePagamentoRow {
  id: string;
  id_motorista: string;
  nome_motorista?: string;
  email_motorista?: string;
  valor: number;
  tipo?: string;
  status: string;
  data: string;
  chave_pix: string;
  comprovante_url?: string;
}

/**
 * Salva usuário na tabela public.usuarios no Supabase
 */
export async function saveUsuarioSupabase(user: {
  id: string;
  nome: string;
  email: string;
  celular?: string;
  whatsapp?: string;
  login?: string;
  senha?: string;
  tipo?: string;
  categoria?: string;
  placa?: string;
  modelo?: string;
  ano?: number;
  cnh?: string;
  avatar?: string;
  rating?: number;
  saldo?: number;
  plano_ativo?: boolean;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const payload: SupabaseUsuarioRow = {
      id: user.id,
      nome: user.nome,
      email: user.email.toLowerCase().trim(),
      celular: user.celular || user.whatsapp || '',
      whatsapp: user.whatsapp || user.celular || '',
      login: (user.login || user.email).toLowerCase().trim(),
      senha: user.senha || '',
      tipo: user.tipo || 'passenger',
      categoria: user.categoria || 'economica',
      placa: user.placa || '',
      modelo: user.modelo || '',
      ano: user.ano || 2023,
      cnh: user.cnh || '',
      avatar: user.avatar || '',
      rating: user.rating || 5.0,
      saldo: user.saldo || 0,
      plano_ativo: user.plano_ativo ?? false,
    };

    const { data, error } = await supabase
      .from('usuarios')
      .upsert(payload, { onConflict: 'email' })
      .select()
      .single();

    if (error) {
      console.warn('Aviso Supabase ao salvar usuario:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.warn('Erro ao conectar ao Supabase (usuarios):', err?.message || err);
    return { success: false, error: err?.message || 'Falha de conexão com Supabase' };
  }
}

/**
 * Busca usuário por e-mail ou login no Supabase
 */
export async function getUsuarioSupabase(emailOrLogin: string): Promise<SupabaseUsuarioRow | null> {
  const clean = emailOrLogin.trim().toLowerCase();
  if (!clean) return null;

  try {
    // Tenta por email
    const { data: byEmail, error: errEmail } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', clean)
      .maybeSingle();

    if (byEmail) return byEmail as SupabaseUsuarioRow;

    // Tenta por login
    const { data: byLogin, error: errLogin } = await supabase
      .from('usuarios')
      .select('*')
      .eq('login', clean)
      .maybeSingle();

    if (byLogin) return byLogin as SupabaseUsuarioRow;
  } catch (err) {
    console.warn('Aviso ao consultar Supabase por usuario:', err);
  }

  return null;
}

/**
 * Busca todos os usuários do Supabase (Apenas Admin)
 */
export async function getAllUsuariosSupabase(): Promise<SupabaseUsuarioRow[]> {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('data_cadastro', { ascending: false });

    if (error) {
      console.warn('Aviso ao listar usuarios do Supabase:', error.message);
      return [];
    }

    return (data || []) as SupabaseUsuarioRow[];
  } catch {
    return [];
  }
}

/**
 * Salva corrida na tabela public.corridas no Supabase
 */
export async function saveCorridaSupabase(
  ride: Ride,
  currentUser: AppUser | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: SupabaseCorridaRow = {
      id: ride.id,
      id_passageiro: (ride as any).passengerId || currentUser?.id || 'psg-desconhecido',
      email_passageiro: ((ride as any).passengerEmail || currentUser?.email || '').toLowerCase().trim(),
      nome_passageiro: ride.passengerName || currentUser?.name || 'Passageiro',
      id_motorista: ride.driver?.id || 'drv-indaiatuba-1',
      email_motorista: (ride.driver?.email || '').toLowerCase().trim(),
      nome_motorista: ride.driver?.name || 'José da Cruz',
      origem: ride.pickup,
      destino: ride.destination,
      origem_texto: ride.pickup?.address || '',
      destino_texto: ride.destination?.address || '',
      valor: Number(ride.price.toFixed(2)),
      categoria: ride.category,
      status: ride.status || 'completed',
      forma_pagamento: ride.paymentMethod || 'pix',
      rating_dado: ride.ratingGivenToDriver,
      comentario: ride.ratingComment,
      detalhe_problema: (ride as any).issueComment,
      data: ride.createdAt || new Date().toISOString(),
    };

    const { error } = await supabase.from('corridas').upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('Aviso Supabase ao salvar corrida:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Erro ao salvar corrida no Supabase:', err?.message || err);
    return { success: false, error: err?.message };
  }
}

/**
 * Busca corridas filtradas estritamente de acordo com quem está logado:
 * - Motorista/Motoboy: só as corridas DELE
 * - Passageiro: só as corridas DELE
 * - Admin (admin@race.com.br): todas as corridas
 */
export async function getCorridasSupabase(currentUser: AppUser | null): Promise<Ride[]> {
  if (!currentUser) return [];

  const cleanEmail = (currentUser.email || '').toLowerCase().trim();
  const isAdmin = currentUser.role === 'admin' || currentUser.isAdmin || cleanEmail === 'admin@race.com.br';

  try {
    let query = supabase.from('corridas').select('*').order('data', { ascending: false });

    if (!isAdmin) {
      const isDriverOrMotoboy =
        currentUser.role === 'driver' ||
        currentUser.role === 'motoboy' ||
        currentUser.tipo === 'motorista_economico' ||
        currentUser.tipo === 'motorista_confort' ||
        currentUser.tipo === 'motoboy_passageiro' ||
        currentUser.tipo === 'motoboy_entregas';

      if (isDriverOrMotoboy) {
        query = query.or(`id_motorista.eq.${currentUser.id},email_motorista.eq.${cleanEmail}`);
      } else {
        query = query.or(`id_passageiro.eq.${currentUser.id},email_passageiro.eq.${cleanEmail}`);
      }
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Aviso ao consultar corridas no Supabase:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Mapeia para o tipo Ride do app
    return data.map((row: SupabaseCorridaRow) => ({
      id: row.id,
      passengerId: row.id_passageiro,
      passengerEmail: row.email_passageiro,
      passengerName: row.nome_passageiro || 'Passageiro',
      passengerPhone: '',
      passengerRating: 5.0,
      driver: {
        id: row.id_motorista,
        name: row.nome_motorista || 'José da Cruz',
        email: row.email_motorista || '',
        phone: '(19) 98765-4321',
        category: (row.categoria as any) || 'economica',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
        rating: 5.0,
        totalRides: 25,
        vehicleModel: 'Chevrolet Onix',
        vehiclePlate: 'RCE9C40',
        vehicleColor: 'Prata',
        vehicleYear: 2021,
        cpf: '123.456.789-00',
        cnh: '99887766554',
        weeklyPlanActive: true,
        weeklyPlanPrice: 200,
        status: 'online',
        earningsToday: row.valor,
        earningsWeek: row.valor,
        cnhVerified: true,
        vehicleVerified: true,
        criminalRecordClear: true,
        lat: -23.0842,
        lng: -47.2118,
        registrationDate: row.data,
      },
      category: (row.categoria as any) || 'economica',
      pickup: row.origem || {
        address: row.origem_texto || 'Indaiatuba - SP',
        lat: -23.0842,
        lng: -47.2118,
      },
      destination: row.destino || {
        address: row.destino_texto || 'Indaiatuba - SP',
        lat: -23.0805,
        lng: -47.2050,
      },
      distanceKm: 2.5,
      durationMinutes: 7,
      price: Number(row.valor),
      driverEarnings: Number(row.valor),
      platformFee: 0,
      paymentMethod: (row.forma_pagamento as any) || 'pix',
      paymentStatus: 'paid',
      status: (row.status as any) || 'completed',
      createdAt: row.data,
      ratingGivenToDriver: row.rating_dado,
      ratingComment: row.comentario,
      issueComment: row.detalhe_problema,
    }));
  } catch (err) {
    console.warn('Erro ao consultar corridas no Supabase:', err);
    return [];
  }
}

/**
 * Salva pagamento na tabela public.pagamentos no Supabase
 * Valor padrão 200, chave pix oficial 9d9e5635-9e68-46bf-bffe-08bdae29c8ba
 */
export async function savePagamentoSupabase(pagamento: {
  id?: string;
  id_motorista: string;
  nome_motorista?: string;
  email_motorista?: string;
  valor?: number;
  tipo?: string;
  status?: string;
  chave_pix?: string;
  comprovante_url?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: SupabasePagamentoRow = {
      id: pagamento.id || `pag-${Date.now()}`,
      id_motorista: pagamento.id_motorista,
      nome_motorista: pagamento.nome_motorista || 'Motorista Parceiro',
      email_motorista: (pagamento.email_motorista || '').toLowerCase().trim(),
      valor: pagamento.valor ?? 200.0,
      tipo: pagamento.tipo || 'assinatura_semanal',
      status: pagamento.status || 'pending',
      data: new Date().toISOString(),
      chave_pix: pagamento.chave_pix || RACE_PIX_KEY,
      comprovante_url: pagamento.comprovante_url || '',
    };

    const { error } = await supabase.from('pagamentos').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Aviso Supabase ao salvar pagamento:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.warn('Erro ao salvar pagamento no Supabase:', err?.message || err);
    return { success: false, error: err?.message };
  }
}

/**
 * Busca pagamentos no Supabase
 */
export async function getPagamentosSupabase(currentUser: AppUser | null): Promise<SupabasePagamentoRow[]> {
  if (!currentUser) return [];

  const cleanEmail = (currentUser.email || '').toLowerCase().trim();
  const isAdmin = currentUser.role === 'admin' || currentUser.isAdmin || cleanEmail === 'admin@race.com.br';

  try {
    let query = supabase.from('pagamentos').select('*').order('data', { ascending: false });

    if (!isAdmin) {
      query = query.or(`id_motorista.eq.${currentUser.id},email_motorista.eq.${cleanEmail}`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Aviso ao consultar pagamentos no Supabase:', error.message);
      return [];
    }

    return (data || []) as SupabasePagamentoRow[];
  } catch {
    return [];
  }
}

/**
 * Testa o status da conexão e verifica se as tabelas existem no Supabase
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  tables: {
    usuarios: boolean;
    corridas: boolean;
    pagamentos: boolean;
  };
  details: string;
}> {
  const result = {
    connected: false,
    tables: {
      usuarios: false,
      corridas: false,
      pagamentos: false,
    },
    details: '',
  };

  try {
    const [uRes, cRes, pRes] = await Promise.allSettled([
      supabase.from('usuarios').select('id').limit(1),
      supabase.from('corridas').select('id').limit(1),
      supabase.from('pagamentos').select('id').limit(1),
    ]);

    result.connected = true;

    if (uRes.status === 'fulfilled' && !uRes.value.error) {
      result.tables.usuarios = true;
    }
    if (cRes.status === 'fulfilled' && !cRes.value.error) {
      result.tables.corridas = true;
    }
    if (pRes.status === 'fulfilled' && !pRes.value.error) {
      result.tables.pagamentos = true;
    }

    const readyCount = Object.values(result.tables).filter(Boolean).length;
    if (readyCount === 3) {
      result.details = 'Conectado à nuvem Supabase com todas as 3 tabelas ativas e sincronizadas.';
    } else {
      result.details = `Conectado ao projeto Supabase (${readyCount}/3 tabelas criadas no SQL Editor).`;
    }
  } catch (err: any) {
    result.details = `Erro de conexão: ${err?.message || 'Falha ao acessar o Supabase'}`;
  }

  return result;
}
