// Supabase Edge Function: asaas-proxy
// Mantém ASAAS_API_KEY 100% segura nos Secrets do Supabase (nunca exposta no frontend).
// Deploy: supabase functions deploy asaas-proxy
// Secret: supabase secrets set ASAAS_API_KEY="$aact_..."

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-race-login, x-race-email',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function getAsaasBaseUrl(apiKey: string): string {
  if (apiKey.includes('sandbox') || apiKey.toLowerCase().startsWith('$aact_ytu')) {
    return 'https://sandbox.asaas.com/v3';
  }
  return 'https://api.asaas.com/v3';
}

async function getOrCreateCustomer(baseUrl: string, apiKey: string, name: string, email?: string, phone?: string) {
  if (email) {
    const searchRes = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(email)}`, {
      headers: { access_token: apiKey, 'Content-Type': 'application/json' },
    });
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData?.data?.length > 0) {
        return searchData.data[0].id;
      }
    }
  }

  const createRes = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers: { access_token: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: name || 'Passageiro RACE',
      email: email || `passageiro.${Date.now()}@race.com.br`,
      mobilePhone: phone ? String(phone).replace(/\D/g, '') : undefined,
    }),
  });
  if (createRes.ok) {
    const created = await createRes.json();
    return created.id;
  }
  throw new Error('Não foi possível criar cliente no gateway Asaas.');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = (Deno.env.get('ASAAS_API_KEY') || '').trim();
    if (!apiKey) {
      return new Response(
        JSON.stringify({ configured: false, error: 'ASAAS_API_KEY não configurada nos Secrets da Edge Function.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const baseUrl = getAsaasBaseUrl(apiKey);
    const body = await req.json();
    const action = body?.action;

    if (action === 'create_pix') {
      const dueDate = new Date().toISOString().split('T')[0];
      const customerId = await getOrCreateCustomer(
        baseUrl,
        apiKey,
        body.passengerName || 'Passageiro RACE',
        body.passengerEmail,
        body.passengerPhone
      );

      const paymentRes = await fetch(`${baseUrl}/payments`, {
        method: 'POST',
        headers: { access_token: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'PIX',
          value: body.value,
          dueDate,
          description: `Corrida RACE ${body.categoryName || ''} - R$ ${Number(body.value || 0).toFixed(2)}`,
          postalService: false,
        }),
      });
      const paymentData = await paymentRes.json();
      if (!paymentRes.ok) {
        return new Response(
          JSON.stringify({ configured: true, error: paymentData?.errors?.[0]?.description || 'Erro ao gerar cobrança PIX.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let pixQrCode = null;
      const qrRes = await fetch(`${baseUrl}/payments/${paymentData.id}/pixQrCode`, {
        headers: { access_token: apiKey },
      });
      if (qrRes.ok) {
        pixQrCode = await qrRes.json();
      }

      return new Response(
        JSON.stringify({ configured: true, payment: paymentData, pixQrCode }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'create_card') {
      const dueDate = new Date().toISOString().split('T')[0];
      const customerId = await getOrCreateCustomer(
        baseUrl,
        apiKey,
        body.passengerName || 'Passageiro RACE',
        body.passengerEmail,
        body.passengerPhone
      );

      const paymentRes = await fetch(`${baseUrl}/payments`, {
        method: 'POST',
        headers: { access_token: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'CREDIT_CARD',
          value: body.value,
          dueDate,
          description: `Corrida RACE ${body.categoryName || ''} - Cartão - R$ ${Number(body.value || 0).toFixed(2)}`,
          postalService: false,
        }),
      });
      const paymentData = await paymentRes.json();
      if (!paymentRes.ok) {
        return new Response(
          JSON.stringify({ configured: true, error: paymentData?.errors?.[0]?.description || 'Erro ao gerar cobrança no cartão.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ configured: true, payment: paymentData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'pay_card') {
      const payRes = await fetch(`${baseUrl}/payments/${encodeURIComponent(body.paymentId)}/payWithCreditCard`, {
        method: 'POST',
        headers: { access_token: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditCard: body.creditCard,
          creditCardHolderInfo: body.creditCardHolderInfo,
        }),
      });
      const payData = await payRes.json();
      return new Response(
        JSON.stringify({ configured: true, ok: payRes.ok, data: payData }),
        { status: payRes.ok ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'check_status') {
      const statusRes = await fetch(`${baseUrl}/payments/${encodeURIComponent(body.paymentId)}`, {
        headers: { access_token: apiKey },
      });
      const statusData = await statusRes.json();
      return new Response(
        JSON.stringify({ configured: true, ok: statusRes.ok, data: statusData }),
        { status: statusRes.ok ? 200 : 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'financial_summary') {
      const balRes = await fetch(`${baseUrl}/finance/balance`, {
        headers: { access_token: apiKey },
      });
      const balData = await balRes.json();
      return new Response(
        JSON.stringify({ configured: true, ok: balRes.ok, balance: balData?.balance ?? 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Erro interno no proxy Asaas.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
