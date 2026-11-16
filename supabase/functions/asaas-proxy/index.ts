import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-race-login, x-race-email",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getAsaasBaseUrl(apiKey: string): string {
  if (apiKey.toLowerCase().includes("sandbox") || apiKey.toLowerCase().startsWith("$aact_ytu")) {
    return "https://sandbox.asaas.com/v3";
  }
  return "https://api.asaas.com/v3";
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getOrCreateCustomer(
  baseUrl: string,
  apiKey: string,
  customerInput: {
    name?: string;
    cpfCnpj?: string;
    email?: string;
    phone?: string;
  }
): Promise<string> {
  const cleanName = (customerInput.name || "Passageiro RACE").trim();
  const cleanEmail = (customerInput.email || "").trim();
  const cleanCpf = customerInput.cpfCnpj ? String(customerInput.cpfCnpj).replace(/\D/g, "") : "";
  const cleanPhone = customerInput.phone ? String(customerInput.phone).replace(/\D/g, "") : "";

  if (cleanCpf) {
    const cpfRes = await fetch(`${baseUrl}/customers?cpfCnpj=${encodeURIComponent(cleanCpf)}`, {
      headers: { access_token: apiKey, "Content-Type": "application/json" },
    });
    if (cpfRes.ok) {
      const cpfData = await cpfRes.json();
      if (cpfData?.data?.length > 0) {
        return cpfData.data[0].id;
      }
    }
  }

  if (cleanEmail) {
    const emailRes = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(cleanEmail)}`, {
      headers: { access_token: apiKey, "Content-Type": "application/json" },
    });
    if (emailRes.ok) {
      const emailData = await emailRes.json();
      if (emailData?.data?.length > 0) {
        const existing = emailData.data[0];
        if (cleanCpf && !existing.cpfCnpj) {
          await fetch(`${baseUrl}/customers/${encodeURIComponent(existing.id)}`, {
            method: "PUT",
            headers: { access_token: apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({ cpfCnpj: cleanCpf }),
          }).catch(() => null);
        }
        return existing.id;
      }
    }
  }

  const createBody: Record<string, string> = {
    name: cleanName,
    email: cleanEmail || `cliente.${Date.now()}@race.com.br`,
  };
  if (cleanCpf) createBody.cpfCnpj = cleanCpf;
  if (cleanPhone) createBody.mobilePhone = cleanPhone;

  const createRes = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers: { access_token: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(createBody),
  });

  const created = await createRes.json().catch(() => null);
  if (createRes.ok && created?.id) {
    return created.id;
  }

  throw new Error(created?.errors?.[0]?.description || "Não foi possível criar o cliente no Asaas.");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = (Deno.env.get("ASAAS_API_KEY") || "").trim();
    if (!apiKey) {
      return jsonResponse(
        { configured: false, error: "ASAAS_API_KEY não configurada nos Secrets da Edge Function." },
        200
      );
    }

    const baseUrl = getAsaasBaseUrl(apiKey);
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string | undefined;

    if (action === "pay_card") {
      if (!body?.paymentId) {
        return jsonResponse({ configured: true, ok: false, error: "paymentId obrigatório." }, 400);
      }
      const payRes = await fetch(
        `${baseUrl}/payments/${encodeURIComponent(String(body.paymentId))}/payWithCreditCard`,
        {
          method: "POST",
          headers: { access_token: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            creditCard: body.creditCard,
            creditCardHolderInfo: body.creditCardHolderInfo,
          }),
        }
      );
      const payData = await payRes.json().catch(() => ({}));
      return jsonResponse(
        { configured: true, ok: payRes.ok, data: payData },
        payRes.ok ? 200 : 400
      );
    }

    if (action === "check_status") {
      if (!body?.paymentId) {
        return jsonResponse({ configured: true, ok: false, error: "paymentId obrigatório." }, 400);
      }
      const statusRes = await fetch(
        `${baseUrl}/payments/${encodeURIComponent(String(body.paymentId))}`,
        { headers: { access_token: apiKey } }
      );
      const statusData = await statusRes.json().catch(() => ({}));
      return jsonResponse(
        { configured: true, ok: statusRes.ok, data: statusData },
        statusRes.ok ? 200 : 400
      );
    }

    if (action === "financial_summary") {
      const balRes = await fetch(`${baseUrl}/finance/balance`, {
        headers: { access_token: apiKey },
      });
      const balData = await balRes.json().catch(() => ({}));
      return jsonResponse({
        configured: true,
        ok: balRes.ok,
        balance: balData?.balance ?? 0,
      });
    }

    const rawType = String(
      action === "create_pix"
        ? "PIX"
        : action === "create_card"
        ? "CREDIT_CARD"
        : body?.tipoPagamento || body?.billingType || body?.tipo || "PIX"
    )
      .trim()
      .toUpperCase();

    const billingType =
      rawType === "CARTAO" || rawType === "CARTÃO" || rawType === "CREDIT_CARD" || rawType === "CARD"
        ? "CREDIT_CARD"
        : "PIX";

    const valor = Number(body?.valor ?? body?.value ?? 0);
    if (!Number.isFinite(valor) || valor <= 0) {
      return jsonResponse({ configured: true, error: "Valor da cobrança inválido." }, 400);
    }

    const cliente = body?.cliente || {};
    const customerId = await getOrCreateCustomer(baseUrl, apiKey, {
      name: cliente?.nome ?? cliente?.name ?? body?.passengerName ?? body?.nome,
      cpfCnpj: cliente?.cpf ?? cliente?.cpfCnpj ?? body?.passengerCpfCnpj ?? body?.cpf,
      email: cliente?.email ?? body?.passengerEmail ?? body?.email,
      phone: cliente?.telefone ?? cliente?.phone ?? body?.passengerPhone ?? body?.telefone,
    });

    const dueDate = new Date().toISOString().split("T")[0];
    const description =
      body?.descricao ||
      body?.description ||
      `Corrida RACE ${body?.categoryName || ""} - ${billingType === "PIX" ? "PIX" : "Cartão"} - R$ ${valor.toFixed(2)}`;

    const paymentRes = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: { access_token: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: customerId,
        billingType,
        value: Number(valor.toFixed(2)),
        dueDate,
        description,
        postalService: false,
      }),
    });

    const paymentData = await paymentRes.json().catch(() => ({}));
    if (!paymentRes.ok || !paymentData?.id) {
      return jsonResponse(
        {
          configured: true,
          error: paymentData?.errors?.[0]?.description || "Erro ao criar cobrança no Asaas.",
          data: paymentData,
        },
        400
      );
    }

    let pixQrCode = null;
    if (billingType === "PIX") {
      const qrRes = await fetch(`${baseUrl}/payments/${encodeURIComponent(paymentData.id)}/pixQrCode`, {
        headers: { access_token: apiKey },
      });
      if (qrRes.ok) {
        pixQrCode = await qrRes.json().catch(() => null);
      }
    }

    return jsonResponse({
      configured: true,
      payment: paymentData,
      ...(billingType === "PIX" ? { pixQrCode } : {}),
    });
  } catch (err: any) {
    return jsonResponse({ error: err?.message || "Erro interno no proxy Asaas." }, 500);
  }
});
