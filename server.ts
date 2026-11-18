import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
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

async function startServer() {
  const app = express();
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

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const publicDir = path.resolve(__dirname, 'public');
    if (fs.existsSync(publicDir)) {
      app.use('/Dinho', express.static(publicDir));
      app.use(express.static(publicDir));
    }
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, '0.0.0.0', () => {
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
