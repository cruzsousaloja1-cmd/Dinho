import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getAsaasApiKey(): string {
  return (process.env.ASAAS_API_KEY || '').trim();
}

function getAsaasBaseUrl(apiKey: string): string {
  const explicitEnv = (process.env.ASAAS_ENV || '').trim().toLowerCase();
  if (explicitEnv === 'sandbox') {
    return 'https://sandbox.asaas.com/v3';
  }
  if (explicitEnv === 'production') {
    return 'https://api.asaas.com/v3';
  }
  if (apiKey.toLowerCase().includes('sandbox') || apiKey.toLowerCase().startsWith('$aact_ytu')) {
    return 'https://sandbox.asaas.com/v3';
  }
  return 'https://api.asaas.com/v3';
}

async function getOrCreateAsaasCustomer(
  baseUrl: string,
  apiKey: string,
  name: string,
  email?: string,
  phone?: string,
  cpfCnpj?: string
): Promise<string> {
  const cleanEmail = (email || '').trim();
  if (cleanEmail) {
    const searchRes = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(cleanEmail)}`, {
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'RACE-Mobilidade/1.0',
      },
    });
    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as { data?: Array<{ id: string }> };
      if (searchData?.data && searchData.data.length > 0) {
        return searchData.data[0].id;
      }
    }
  }

  const cleanPhone = phone ? String(phone).replace(/\D/g, '') : undefined;
  const cleanCpf = cpfCnpj ? String(cpfCnpj).replace(/\D/g, '') : undefined;

  const createRes = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers: {
      access_token: apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'RACE-Mobilidade/1.0',
    },
    body: JSON.stringify({
      name: (name || 'Passageiro RACE').trim(),
      email: cleanEmail || `passageiro.${Date.now()}@race.com.br`,
      mobilePhone: cleanPhone || undefined,
      cpfCnpj: cleanCpf || undefined,
    }),
  });

  if (createRes.ok) {
    const created = (await createRes.json()) as { id: string };
    return created.id;
  }

  const errData = (await createRes.json().catch(() => null)) as {
    errors?: Array<{ description?: string }>;
  } | null;
  throw new Error(
    errData?.errors?.[0]?.description || 'Não foi possível criar cliente no gateway Asaas.'
  );
}

async function handleAsaasProxyRequest(req: Request, res: Response): Promise<void> {
  try {
    const apiKey = getAsaasApiKey();
    if (!apiKey) {
      res.status(200).json({
        configured: false,
        error: 'ASAAS_API_KEY não configurada no servidor.',
      });
      return;
    }

    const baseUrl = getAsaasBaseUrl(apiKey);
    const body = (req.body || {}) as Record<string, any>;
    const action = body.action;

    if (action === 'create_pix') {
      const dueDate = new Date().toISOString().split('T')[0];
      const customerId = await getOrCreateAsaasCustomer(
        baseUrl,
        apiKey,
        body.passengerName || 'Passageiro RACE',
        body.passengerEmail,
        body.passengerPhone,
        body.passengerCpfCnpj
      );

      const numericValue = Number(body.value || 0);
      const paymentRes = await fetch(`${baseUrl}/payments`, {
        method: 'POST',
        headers: {
          access_token: apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'RACE-Mobilidade/1.0',
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'PIX',
          value: numericValue,
          dueDate,
          description: `Corrida RACE ${body.categoryName || ''} - R$ ${numericValue.toFixed(2)}`,
          postalService: false,
        }),
      });

      const paymentData = (await paymentRes.json().catch(() => ({}))) as any;
      if (!paymentRes.ok) {
        res.status(400).json({
          configured: true,
          error: paymentData?.errors?.[0]?.description || 'Erro ao gerar cobrança PIX no Asaas.',
          data: paymentData,
        });
        return;
      }

      let pixQrCode = null;
      const qrRes = await fetch(`${baseUrl}/payments/${encodeURIComponent(paymentData.id)}/pixQrCode`, {
        headers: {
          access_token: apiKey,
          'User-Agent': 'RACE-Mobilidade/1.0',
        },
      });
      if (qrRes.ok) {
        pixQrCode = await qrRes.json().catch(() => null);
      }

      res.status(200).json({
        configured: true,
        payment: paymentData,
        pixQrCode,
      });
      return;
    }

    if (action === 'create_card') {
      const dueDate = new Date().toISOString().split('T')[0];
      const customerId = await getOrCreateAsaasCustomer(
        baseUrl,
        apiKey,
        body.passengerName || 'Passageiro RACE',
        body.passengerEmail,
        body.passengerPhone,
        body.passengerCpfCnpj
      );

      const numericValue = Number(body.value || 0);
      const paymentRes = await fetch(`${baseUrl}/payments`, {
        method: 'POST',
        headers: {
          access_token: apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'RACE-Mobilidade/1.0',
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'CREDIT_CARD',
          value: numericValue,
          dueDate,
          description: `Corrida RACE ${body.categoryName || ''} - Cartão - R$ ${numericValue.toFixed(2)}`,
          postalService: false,
        }),
      });

      const paymentData = (await paymentRes.json().catch(() => ({}))) as any;
      if (!paymentRes.ok) {
        res.status(400).json({
          configured: true,
          error: paymentData?.errors?.[0]?.description || 'Erro ao gerar cobrança no cartão.',
          data: paymentData,
        });
        return;
      }

      res.status(200).json({
        configured: true,
        payment: paymentData,
      });
      return;
    }

    if (action === 'pay_card') {
      if (!body.paymentId) {
        res.status(400).json({ configured: true, ok: false, error: 'paymentId obrigatório.' });
        return;
      }
      const payRes = await fetch(
        `${baseUrl}/payments/${encodeURIComponent(String(body.paymentId))}/payWithCreditCard`,
        {
          method: 'POST',
          headers: {
            access_token: apiKey,
            'Content-Type': 'application/json',
            'User-Agent': 'RACE-Mobilidade/1.0',
          },
          body: JSON.stringify({
            creditCard: body.creditCard,
            creditCardHolderInfo: body.creditCardHolderInfo,
          }),
        }
      );
      const payData = await payRes.json().catch(() => ({}));
      res.status(payRes.ok ? 200 : 400).json({
        configured: true,
        ok: payRes.ok,
        data: payData,
      });
      return;
    }

    if (action === 'check_status') {
      if (!body.paymentId) {
        res.status(400).json({ configured: true, ok: false, error: 'paymentId obrigatório.' });
        return;
      }
      const statusRes = await fetch(
        `${baseUrl}/payments/${encodeURIComponent(String(body.paymentId))}`,
        {
          headers: {
            access_token: apiKey,
            'User-Agent': 'RACE-Mobilidade/1.0',
          },
        }
      );
      const statusData = await statusRes.json().catch(() => ({}));
      res.status(statusRes.ok ? 200 : 400).json({
        configured: true,
        ok: statusRes.ok,
        data: statusData,
      });
      return;
    }

    if (action === 'financial_summary') {
      const balRes = await fetch(`${baseUrl}/finance/balance`, {
        headers: {
          access_token: apiKey,
          'User-Agent': 'RACE-Mobilidade/1.0',
        },
      });
      const balData = (await balRes.json().catch(() => ({}))) as { balance?: number };
      res.status(200).json({
        configured: true,
        ok: balRes.ok,
        balance: balData?.balance ?? 0,
      });
      return;
    }

    res.status(400).json({ configured: true, error: 'Ação inválida.' });
  } catch (err: any) {
    res.status(500).json({
      configured: Boolean(getAsaasApiKey()),
      error: err?.message || 'Erro interno no proxy Asaas.',
    });
  }
}

async function handleAdminDeleteAuthUser(req: Request, res: Response): Promise<void> {
  try {
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://catljaosibqsqexzkrrv.supabase.co').trim().replace(/\/$/, '');
    if (!serviceRoleKey) {
      res.status(200).json({ configured: false, deleted: false });
      return;
    }

    const authHeader = String(req.headers.authorization || '').trim();
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    if (!bearerToken) {
      res.status(401).json({ configured: true, deleted: false, error: 'Sessão ADM não autenticada.' });
      return;
    }

    const callerRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${bearerToken}`,
      },
    });
    if (!callerRes.ok) {
      res.status(401).json({ configured: true, deleted: false, error: 'Token ADM inválido ou expirado.' });
      return;
    }
    const callerUser = (await callerRes.json().catch(() => null)) as any;
    const callerEmail = String(callerUser?.email || '').trim().toLowerCase();
    const callerMetaRole = String(callerUser?.app_metadata?.role || callerUser?.user_metadata?.role || '').trim().toLowerCase();

    let isAdmin = callerMetaRole === 'admin' || callerEmail === 'admin@race.com.br';
    if (!isAdmin && callerEmail) {
      const checkAdminRes = await fetch(
        `${supabaseUrl}/rest/v1/usuarios?select=id,tipo&limit=1&or=(%22e-mail%22.ilike.${encodeURIComponent(callerEmail)},email.ilike.${encodeURIComponent(callerEmail)})`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        }
      ).catch(() => null);
      if (checkAdminRes && checkAdminRes.ok) {
        const rows = (await checkAdminRes.json().catch(() => [])) as any[];
        const tipo = String(rows?.[0]?.tipo || '').trim().toLowerCase();
        isAdmin = tipo === 'adm' || tipo === 'admin' || tipo === 'administrador';
      }
    }

    if (!isAdmin) {
      res.status(403).json({ configured: true, deleted: false, error: 'Acesso negado: apenas ADM.' });
      return;
    }

    const body = (req.body || {}) as { authUid?: string; email?: string };
    let targetUid = String(body.authUid || '').trim();
    const targetEmail = String(body.email || '').trim().toLowerCase();

    if (targetEmail && targetEmail === callerEmail) {
      res.status(400).json({ configured: true, deleted: false, error: 'Você não pode apagar seu próprio ADM.' });
      return;
    }

    if (!targetUid && targetEmail) {
      const listRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`,
        {
          headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
          },
        }
      );
      if (listRes.ok) {
        const listJson = (await listRes.json().catch(() => null)) as { users?: any[] } | null;
        const match = (listJson?.users || []).find(
          (u) => String(u?.email || '').trim().toLowerCase() === targetEmail
        );
        if (match?.id) targetUid = String(match.id);
      }
    }

    if (!targetUid) {
      res.status(200).json({ configured: true, deleted: false, notFound: true });
      return;
    }

    const delRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(targetUid)}`, {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });
    if (!delRes.ok) {
      const errBody = (await delRes.json().catch(() => null)) as any;
      res.status(delRes.status).json({
        configured: true,
        deleted: false,
        error: errBody?.message || errBody?.msg || 'Erro ao excluir usuário no Supabase Auth.',
      });
      return;
    }

    res.status(200).json({ configured: true, deleted: true });
  } catch (err: any) {
    res.status(500).json({
      configured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      deleted: false,
      error: err?.message || 'Erro interno ao excluir conta no Supabase Auth.',
    });
  }
}

async function startServer() {
  const app = express();
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '1mb' }));

  app.get(['/api/asaas/status', '/Dinho/api/asaas/status'], (_req, res) => {
    const apiKey = getAsaasApiKey();
    res.json({
      configured: Boolean(apiKey),
      mode: apiKey
        ? getAsaasBaseUrl(apiKey).includes('sandbox')
          ? 'sandbox'
          : 'production'
        : 'unconfigured',
    });
  });

  app.post(['/api/asaas', '/Dinho/api/asaas'], handleAsaasProxyRequest);
  app.post(['/api/admin/delete-auth-user', '/Dinho/api/admin/delete-auth-user'], handleAdminDeleteAuthUser);

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const publicDir = path.resolve(__dirname, 'public');
    if (fs.existsSync(publicDir)) {
      app.use('/Dinho', express.static(publicDir));
      app.use(express.static(publicDir));
    }
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
        hmr: disableHmr ? false : true,
        watch: disableHmr ? null : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use('/Dinho', express.static(distDir));
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build não encontrado. Execute npm run build.');
      }
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `RACE server running on http://0.0.0.0:${PORT} (ASAAS_API_KEY configured: ${Boolean(
        getAsaasApiKey()
      )})`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start RACE server:', err);
  process.exit(1);
});
