/**
 * Serviço de Integração Asaas (PIX e Cartão)
 * Comunicação exclusiva via proxy server-side (`/api/asaas` usando `ASAAS_API_KEY`)
 * ou via Supabase Edge Function segura (`asaas-proxy`).
 * Nenhuma chave de API do Asaas existe ou é armazenada no frontend.
 */
import QRCode from 'qrcode';
import { RACE_PIX_KEY } from '../config/pricing';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../supabase';
import { calculateRideSplitForDriver } from './promoService';

export interface AsaasCustomer {
  id: string;
  name: string;
  email?: string;
  mobilePhone?: string;
}

export interface AsaasPixQrCodeResponse {
  encodedImage: string; // base64 da imagem PNG ou data URL
  payload: string;      // Código PIX Copia e Cola completo do Asaas
  pixCopyPaste?: string;// Campo alternativo completo retornado pelo Asaas
  expirationDate: string;
}

export interface AsaasPaymentResult {
  id: string;
  value: number;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED';
  billingType: 'PIX' | 'CREDIT_CARD';
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCode?: AsaasPixQrCodeResponse;
  customer?: string;
  isSimulated?: boolean;
}

export interface AsaasBalanceInfo {
  balance: number;
  totalReceived: number;
  raceCommission15: number;
  repassarSexta85: number;
  nextPayoutDate: string;
  isLive: boolean;
}

const SUPABASE_ASAAS_PROXY_URL = `${SUPABASE_URL}/functions/v1/asaas-proxy`;

function getLocalAsaasProxyUrl(): string {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/Dinho/')) {
    return '/Dinho/api/asaas';
  }
  return '/api/asaas';
}

async function callAsaasProxy<T = any>(payload: Record<string, any>): Promise<{ ok: boolean; data?: T }> {
  // 1. Tenta primeiro o proxy server-side local (/api/asaas), que lê process.env.ASAAS_API_KEY com segurança
  try {
    const localUrl = getLocalAsaasProxyUrl();
    const localRes = await fetch(localUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const contentType = localRes.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const localData = await localRes.json().catch(() => null);
      if (localData && localData.configured !== false) {
        if (!localRes.ok) {
          return { ok: false, data: localData };
        }
        return { ok: true, data: localData };
      }
    }
  } catch {
    // Segue para o proxy do Supabase Edge Function caso esteja em hospedagem estática (ex: GitHub Pages)
  }

  // 2. Fallback para Supabase Edge Function segura (`asaas-proxy` usando Secret ASAAS_API_KEY no Supabase)
  try {
    const res = await fetch(SUPABASE_ASAAS_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.configured === false) {
      return { ok: false, data: data || undefined };
    }
    return { ok: true, data };
  } catch (err) {
    console.warn('[Asaas Proxy] Gateway indisponível no momento:', err);
    return { ok: false };
  }
}

export function formatEMVField(id: string, val: string): string {
  const len = String(val.length).padStart(2, '0');
  return id + len + val;
}

/**
 * Calcula CRC16-CCITT (Polinômio 0x1021, valor inicial 0xFFFF)
 * Exigido estritamente pelo Banco Central do Brasil para validação em apps bancários.
 */
export function calculatePixCRC16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera string padrão PIX (EMV Co/Brcode) 100% válida e aceita por qualquer banco no Brasil
 */
export function generateFallbackPixCopiaECola(valor: number, desc = 'Corrida RACE'): string {
  const chavePix = RACE_PIX_KEY;
  const valorStr = Number(valor).toFixed(2);
  const accountInfo = formatEMVField('00', 'br.gov.bcb.pix') + formatEMVField('01', chavePix);
  const cleanTxId = desc.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15) || 'RACE1120';
  const additionalData = formatEMVField('05', cleanTxId);

  const raw =
    formatEMVField('00', '01') +
    formatEMVField('26', accountInfo) +
    formatEMVField('52', '0000') +
    formatEMVField('53', '986') +
    formatEMVField('54', valorStr) +
    formatEMVField('58', 'BR') +
    formatEMVField('59', 'RACE Mobilidade') +
    formatEMVField('60', 'Indaiatuba') +
    formatEMVField('62', additionalData) +
    '6304';

  return raw + calculatePixCRC16(raw);
}

/**
 * Cria uma cobrança PIX no Asaas via Edge Function segura (`asaas-proxy`)
 */
export async function createAsaasPixPayment(params: {
  value: number;
  categoryName: string;
  passengerName?: string;
  passengerEmail?: string;
  passengerPhone?: string;
}): Promise<AsaasPaymentResult> {
  const description = `Corrida RACE ${params.categoryName} - R$ ${params.value.toFixed(2)}`;

  const proxyRes = await callAsaasProxy<{
    configured?: boolean;
    payment?: any;
    pixQrCode?: any;
  }>({
    action: 'create_pix',
    value: params.value,
    categoryName: params.categoryName,
    passengerName: params.passengerName,
    passengerEmail: params.passengerEmail,
    passengerPhone: params.passengerPhone,
  });

  if (proxyRes.ok && proxyRes.data?.payment?.id) {
    const paymentData = proxyRes.data.payment;
    const qrData = proxyRes.data.pixQrCode || {};
    const rawPayload = (
      qrData.payload ||
      qrData.pixCopyPaste ||
      qrData.copyAndPaste ||
      qrData.copyAndPasteUrl ||
      ''
    ).trim();
    const finalPayload = rawPayload || generateFallbackPixCopiaECola(params.value, description);
    const imageStr = qrData.encodedImage
      ? (qrData.encodedImage.startsWith('data:')
          ? qrData.encodedImage
          : `data:image/png;base64,${qrData.encodedImage}`)
      : await QRCode.toDataURL(finalPayload, { width: 320, margin: 1 });

    return {
      id: paymentData.id,
      value: params.value,
      status: paymentData.status || 'PENDING',
      billingType: 'PIX',
      invoiceUrl: paymentData.invoiceUrl,
      bankSlipUrl: paymentData.bankSlipUrl,
      pixQrCode: {
        encodedImage: imageStr,
        payload: finalPayload,
        pixCopyPaste: finalPayload,
        expirationDate: qrData.expirationDate || new Date(Date.now() + 3600000).toISOString(),
      },
      customer: paymentData.customer,
      isSimulated: false,
    };
  }

  // Fallback local EMV caso a Edge Function ainda não esteja deployada no projeto Supabase
  const mockId = 'pay_asaas_' + Math.random().toString(36).substring(2, 10);
  const payload = generateFallbackPixCopiaECola(params.value, description);
  const encodedImage = await QRCode.toDataURL(payload, { width: 300, margin: 1 });

  return {
    id: mockId,
    value: params.value,
    status: 'PENDING',
    billingType: 'PIX',
    invoiceUrl: `https://www.asaas.com/i/${mockId}`,
    pixQrCode: {
      encodedImage,
      payload,
      pixCopyPaste: payload,
      expirationDate: new Date(Date.now() + 3600000).toISOString(),
    },
    isSimulated: true,
  };
}

/**
 * Cria cobrança de Cartão de Crédito via Edge Function segura (`asaas-proxy`)
 */
export async function createAsaasCardPayment(params: {
  value: number;
  categoryName: string;
  passengerName?: string;
  passengerEmail?: string;
  passengerPhone?: string;
}): Promise<AsaasPaymentResult> {
  const proxyRes = await callAsaasProxy<{
    configured?: boolean;
    payment?: any;
  }>({
    action: 'create_card',
    value: params.value,
    categoryName: params.categoryName,
    passengerName: params.passengerName,
    passengerEmail: params.passengerEmail,
    passengerPhone: params.passengerPhone,
  });

  if (proxyRes.ok && proxyRes.data?.payment?.id) {
    const paymentData = proxyRes.data.payment;
    return {
      id: paymentData.id,
      value: params.value,
      status: paymentData.status || 'PENDING',
      billingType: 'CREDIT_CARD',
      invoiceUrl: paymentData.invoiceUrl,
      bankSlipUrl: paymentData.bankSlipUrl,
      customer: paymentData.customer,
      isSimulated: false,
    };
  }

  const mockId = 'pay_card_' + Math.random().toString(36).substring(2, 10);
  return {
    id: mockId,
    value: params.value,
    status: 'PENDING',
    billingType: 'CREDIT_CARD',
    invoiceUrl: `https://www.asaas.com/i/${mockId}`,
    isSimulated: true,
  };
}

/**
 * Processa pagamento com Cartão de Crédito via Edge Function segura (`asaas-proxy`).
 * Só retorna isPaid = true se o Asaas retornar status RECEIVED ou CONFIRMED.
 */
export async function payAsaasPaymentWithCreditCard(params: {
  paymentId: string;
  cardHolder: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  holderName: string;
  holderEmail: string;
  holderCpfCnpj: string;
  holderPostalCode: string;
  holderAddressNumber: string;
  holderPhone: string;
}): Promise<{
  id: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED';
  isPaid: boolean;
  errorMessage?: string;
}> {
  if (!params.paymentId || params.paymentId.startsWith('pay_card_') || params.paymentId.startsWith('pay_asaas_')) {
    return {
      id: params.paymentId,
      status: 'PENDING',
      isPaid: false,
      errorMessage: 'Configure a Edge Function asaas-proxy no Supabase para processar cartões em produção.',
    };
  }

  const proxyRes = await callAsaasProxy<{
    configured?: boolean;
    ok?: boolean;
    data?: any;
    error?: string;
  }>({
    action: 'pay_card',
    paymentId: params.paymentId,
    creditCard: {
      holderName: params.cardHolder,
      number: params.cardNumber.replace(/\D/g, ''),
      expiryMonth: params.expiryMonth,
      expiryYear: params.expiryYear,
      ccv: params.ccv,
    },
    creditCardHolderInfo: {
      name: params.holderName,
      email: params.holderEmail,
      cpfCnpj: params.holderCpfCnpj.replace(/\D/g, ''),
      postalCode: params.holderPostalCode.replace(/\D/g, ''),
      addressNumber: params.holderAddressNumber || 'S/N',
      phone: params.holderPhone.replace(/\D/g, ''),
    },
  });

  if (!proxyRes.ok || !proxyRes.data?.ok) {
    const apiErr =
      proxyRes.data?.data?.errors?.[0]?.description ||
      proxyRes.data?.error ||
      'Cartão não autorizado pelo gateway Asaas.';
    return {
      id: params.paymentId,
      status: 'PENDING',
      isPaid: false,
      errorMessage: apiErr,
    };
  }

  const status = (proxyRes.data.data?.status || 'PENDING') as
    | 'PENDING'
    | 'RECEIVED'
    | 'CONFIRMED'
    | 'OVERDUE'
    | 'REFUNDED';
  const isPaid = status === 'RECEIVED' || status === 'CONFIRMED';

  return {
    id: params.paymentId,
    status,
    isPaid,
    errorMessage: isPaid ? undefined : `Status atual no Asaas: ${status}. Aguardando confirmação.`,
  };
}

/**
 * Verifica o status REAL de uma cobrança no Asaas via Edge Function segura.
 * Só retorna isPaid = true quando o Asaas confirmar status = 'RECEIVED' ou 'CONFIRMED'.
 */
export async function checkAsaasPaymentStatus(paymentId: string): Promise<{
  id: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED';
  isPaid: boolean;
}> {
  if (paymentId && !paymentId.startsWith('pay_asaas_') && !paymentId.startsWith('pay_card_')) {
    const proxyRes = await callAsaasProxy<{ ok?: boolean; data?: any }>({
      action: 'check_status',
      paymentId,
    });
    if (proxyRes.ok && proxyRes.data?.ok && proxyRes.data.data) {
      const status = (proxyRes.data.data.status || 'PENDING') as
        | 'PENDING'
        | 'RECEIVED'
        | 'CONFIRMED'
        | 'OVERDUE'
        | 'REFUNDED';
      const isPaid = status === 'RECEIVED' || status === 'CONFIRMED';
      return { id: paymentId, status, isPaid };
    }
  }

  return { id: paymentId, status: 'PENDING', isPaid: false };
}

/**
 * Obtém saldo do Asaas via Edge Function segura e métricas de repasse de sexta-feira (85%)
 */
export async function getAsaasFinancialSummary(completedRidesTotal = 0): Promise<AsaasBalanceInfo> {
  let liveBalance = 0;
  let isLive = false;

  const proxyRes = await callAsaasProxy<{ ok?: boolean; balance?: number }>({
    action: 'financial_summary',
  });
  if (proxyRes.ok && proxyRes.data?.ok) {
    liveBalance = Number(proxyRes.data.balance || 0);
    isLive = true;
  }

  const totalReceived = Number((completedRidesTotal || 0).toFixed(2));
  const split = calculateRideSplitForDriver(totalReceived);
  const raceCommission15 = split.platformFee;
  const repassarSexta85 = split.driverEarnings;

  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const nextFriday = new Date(now.getTime() + daysUntilFriday * 24 * 60 * 60 * 1000);
  const nextPayoutDate = `Sexta-feira, ${nextFriday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às 18:00`;

  return {
    balance: isLive ? liveBalance : totalReceived,
    totalReceived,
    raceCommission15,
    repassarSexta85,
    nextPayoutDate,
    isLive,
  };
}
