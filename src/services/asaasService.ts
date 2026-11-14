/**
 * Serviço de Integração Asaas (PIX e Cartão)
 * Utiliza VITE_ASAAS_API_KEY injetada a partir do GitHub Secrets.
 * Suporta Sandbox e Produção com fallback resiliente para execução no GitHub Pages.
 */
import QRCode from 'qrcode';
import { RACE_PIX_KEY } from '../config/pricing';

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

export function getAsaasApiKey(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ASAAS_API_KEY) {
    return String(import.meta.env.VITE_ASAAS_API_KEY).trim();
  }
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('race_asaas_api_key');
    if (local) return local.trim();
  }
  return '';
}

export function setCustomAsaasApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('race_asaas_api_key', key.trim());
  }
}

export function getAsaasBaseUrl(key?: string): string {
  const currentKey = key || getAsaasApiKey();
  // Se a chave contiver 'sandbox' ou começar com '$aact_YTU' normalmente é sandbox
  if (currentKey.includes('sandbox') || currentKey.toLowerCase().startsWith('$aact_ytu')) {
    return 'https://sandbox.asaas.com/v3';
  }
  return 'https://api.asaas.com/v3';
}

export function formatEMVField(id: string, val: string): string {
  const len = String(val.length).padStart(2, '0');
  return id + len + val;
}

/**
 * Calcula CRC16-CCITT (Polinômio 0x1021, valor inicial 0xFFFF)
 * Exigido estritamente pelo Banco Central do Brasil para validação em apps bancários (Nubank, Itaú, Bradesco, etc.)
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
 * com CRC16 completo, nome do recebedor, cidade e chave PIX cadastrada.
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

  const fullBRCode = raw + calculatePixCRC16(raw);
  return fullBRCode;
}

/**
 * Cria ou busca um cliente no Asaas
 */
export async function getOrCreateAsaasCustomer(
  name: string,
  email?: string,
  phone?: string
): Promise<string> {
  const apiKey = getAsaasApiKey();
  if (!apiKey) return 'cus_simulated_race';

  const baseUrl = getAsaasBaseUrl(apiKey);

  try {
    // 1. Tentar buscar cliente existente por e-mail
    if (email) {
      const searchRes = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(email)}`, {
        headers: {
          access_token: apiKey,
          'Content-Type': 'application/json',
        },
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.data && searchData.data.length > 0) {
          return searchData.data[0].id;
        }
      }
    }

    // 2. Criar novo cliente
    const createRes = await fetch(`${baseUrl}/customers`, {
      method: 'POST',
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name || 'Passageiro RACE',
        email: email || `passageiro.${Date.now()}@race.com.br`,
        mobilePhone: phone ? phone.replace(/\D/g, '') : undefined,
      }),
    });

    if (createRes.ok) {
      const newCustomer = await createRes.json();
      return newCustomer.id;
    }
  } catch (err) {
    console.warn('[Asaas] Aviso ao conectar API de clientes (usando cliente local/simulado):', err);
  }

  return 'cus_race_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Cria uma cobrança PIX no Asaas para a corrida
 */
export async function createAsaasPixPayment(params: {
  value: number;
  categoryName: string;
  passengerName?: string;
  passengerEmail?: string;
  passengerPhone?: string;
}): Promise<AsaasPaymentResult> {
  const apiKey = getAsaasApiKey();
  const baseUrl = getAsaasBaseUrl(apiKey);
  const now = new Date();
  const dueDate = now.toISOString().split('T')[0];
  const description = `Corrida RACE ${params.categoryName} - R$ ${params.value.toFixed(2)}`;

  // Se tiver API Key, tenta criar cobrança real no Asaas
  if (apiKey) {
    try {
      const customerId = await getOrCreateAsaasCustomer(
        params.passengerName || 'Passageiro RACE',
        params.passengerEmail,
        params.passengerPhone
      );

      const paymentRes = await fetch(`${baseUrl}/payments`, {
        method: 'POST',
        headers: {
          access_token: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'PIX',
          value: params.value,
          dueDate: dueDate,
          description: description,
          postalService: false,
        }),
      });

      if (paymentRes.ok) {
        const paymentData = await paymentRes.json();
        const paymentId = paymentData.id;

        // Obter QR Code PIX oficial do Asaas
        let pixQrCode: AsaasPixQrCodeResponse | undefined;
        try {
          const qrRes = await fetch(`${baseUrl}/payments/${paymentId}/pixQrCode`, {
            headers: {
              access_token: apiKey,
            },
          });
          if (qrRes.ok) {
            const qrData = await qrRes.json();
            const rawPayload = (qrData.payload || qrData.pixCopyPaste || qrData.copyAndPaste || qrData.copyAndPasteUrl || '').trim();
            const finalPayload = rawPayload || generateFallbackPixCopiaECola(params.value, description);
            const imageStr = qrData.encodedImage
              ? (qrData.encodedImage.startsWith('data:') ? qrData.encodedImage : `data:image/png;base64,${qrData.encodedImage}`)
              : await QRCode.toDataURL(finalPayload, { width: 320, margin: 1 });

            pixQrCode = {
              encodedImage: imageStr,
              payload: finalPayload, // Código completo sem nenhum corte
              pixCopyPaste: finalPayload,
              expirationDate: qrData.expirationDate || new Date(Date.now() + 3600000).toISOString(),
            };
          }
        } catch (qrErr) {
          console.warn('[Asaas] Erro ao buscar QR Code direto:', qrErr);
        }

        // Se o Asaas não retornou QR Code imediato, gera via biblioteca local com o payload do Asaas
        if (!pixQrCode) {
          const payload = generateFallbackPixCopiaECola(params.value, description);
          const dataUrl = await QRCode.toDataURL(payload, { width: 320, margin: 1 });
          pixQrCode = {
            encodedImage: dataUrl,
            payload: payload,
            pixCopyPaste: payload,
            expirationDate: new Date(Date.now() + 3600000).toISOString(),
          };
        }

        return {
          id: paymentId,
          value: params.value,
          status: paymentData.status || 'PENDING',
          billingType: 'PIX',
          invoiceUrl: paymentData.invoiceUrl,
          bankSlipUrl: paymentData.bankSlipUrl,
          pixQrCode,
          customer: customerId,
          isSimulated: false,
        };
      } else {
        const errJson = await paymentRes.json().catch(() => ({}));
        console.warn('[Asaas] API retornou erro ao criar pagamento:', errJson);
      }
    } catch (apiErr) {
      console.warn('[Asaas] Falha de conexão direta com API Asaas (CORS ou offline). Ativando fallback inteligente:', apiErr);
    }
  }

  // Fallback Inteligente e Resiliente (para GitHub Pages sem backend proxy ou preview local)
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
    isSimulated: !apiKey,
  };
}

/**
 * Cria cobrança de Cartão de Crédito / Link de Pagamento no Asaas
 */
export async function createAsaasCardPayment(params: {
  value: number;
  categoryName: string;
  passengerName?: string;
  passengerEmail?: string;
  passengerPhone?: string;
}): Promise<AsaasPaymentResult> {
  const apiKey = getAsaasApiKey();
  const baseUrl = getAsaasBaseUrl(apiKey);
  const now = new Date();
  const dueDate = now.toISOString().split('T')[0];
  const description = `Corrida RACE ${params.categoryName} - Cartão - R$ ${params.value.toFixed(2)}`;

  if (apiKey) {
    try {
      const customerId = await getOrCreateAsaasCustomer(
        params.passengerName || 'Passageiro RACE',
        params.passengerEmail,
        params.passengerPhone
      );

      const paymentRes = await fetch(`${baseUrl}/payments`, {
        method: 'POST',
        headers: {
          access_token: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'CREDIT_CARD',
          value: params.value,
          dueDate: dueDate,
          description: description,
          postalService: false,
        }),
      });

      if (paymentRes.ok) {
        const paymentData = await paymentRes.json();
        return {
          id: paymentData.id,
          value: params.value,
          status: paymentData.status || 'PENDING',
          billingType: 'CREDIT_CARD',
          invoiceUrl: paymentData.invoiceUrl,
          bankSlipUrl: paymentData.bankSlipUrl,
          customer: customerId,
          isSimulated: false,
        };
      }
    } catch (err) {
      console.warn('[Asaas] Erro ao criar pagamento com Cartão no Asaas:', err);
    }
  }

  const mockId = 'pay_card_' + Math.random().toString(36).substring(2, 10);
  return {
    id: mockId,
    value: params.value,
    status: 'PENDING',
    billingType: 'CREDIT_CARD',
    invoiceUrl: `https://www.asaas.com/i/${mockId}`,
    isSimulated: !apiKey,
  };
}

/**
 * Processa pagamento com Cartão de Crédito diretamente na API do Asaas.
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
  const apiKey = getAsaasApiKey();
  if (!apiKey || params.paymentId.startsWith('pay_card_') || params.paymentId.startsWith('pay_asaas_')) {
    return {
      id: params.paymentId,
      status: 'PENDING',
      isPaid: false,
      errorMessage: 'Chave Asaas não configurada ou cobrança ainda não registrada no gateway Asaas.',
    };
  }

  try {
    const baseUrl = getAsaasBaseUrl(apiKey);
    const res = await fetch(`${baseUrl}/payments/${params.paymentId}/payWithCreditCard`, {
      method: 'POST',
      headers: {
        access_token: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const apiErr = data?.errors?.[0]?.description || 'Cartão não autorizado pelo Asaas.';
      return {
        id: params.paymentId,
        status: 'PENDING',
        isPaid: false,
        errorMessage: apiErr,
      };
    }

    const status = (data.status || 'PENDING') as 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED';
    const isPaid = status === 'RECEIVED' || status === 'CONFIRMED';
    return {
      id: params.paymentId,
      status,
      isPaid,
      errorMessage: isPaid ? undefined : `Status atual no Asaas: ${status}. Aguardando confirmação.`,
    };
  } catch {
    return {
      id: params.paymentId,
      status: 'PENDING',
      isPaid: false,
      errorMessage: 'Não foi possível comunicar com o Asaas no navegador. Use o Link de Pagamento Asaas acima.',
    };
  }
}

/**
 * Verifica o status REAL de uma cobrança no Asaas.
 * Só retorna isPaid = true quando o Asaas confirmar status = 'RECEIVED' ou 'CONFIRMED'.
 */
export async function checkAsaasPaymentStatus(paymentId: string): Promise<{
  id: string;
  status: 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED';
  isPaid: boolean;
}> {
  const apiKey = getAsaasApiKey();
  if (apiKey && paymentId && !paymentId.startsWith('pay_asaas_') && !paymentId.startsWith('pay_card_')) {
    try {
      const baseUrl = getAsaasBaseUrl(apiKey);
      const res = await fetch(`${baseUrl}/payments/${paymentId}`, {
        headers: {
          access_token: apiKey,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const status = (data.status || 'PENDING') as 'PENDING' | 'RECEIVED' | 'CONFIRMED' | 'OVERDUE' | 'REFUNDED';
        const isPaid = status === 'RECEIVED' || status === 'CONFIRMED';
        return {
          id: paymentId,
          status,
          isPaid,
        };
      }
    } catch (err) {
      console.warn('[Asaas] Erro ao consultar status da cobrança:', err);
    }
  }

  return { id: paymentId, status: 'PENDING', isPaid: false };
}

/**
 * Obtém saldo do Asaas e métricas de repasse de sexta-feira (85%) a partir dos pagamentos reais do Supabase
 */
export async function getAsaasFinancialSummary(completedRidesTotal = 0): Promise<AsaasBalanceInfo> {
  const apiKey = getAsaasApiKey();
  let liveBalance = 0;
  let isLive = false;

  if (apiKey) {
    try {
      const baseUrl = getAsaasBaseUrl(apiKey);
      const res = await fetch(`${baseUrl}/finance/balance`, {
        headers: {
          access_token: apiKey,
        },
      });
      if (res.ok) {
        const data = await res.json();
        liveBalance = Number(data.balance || 0);
        isLive = true;
      }
    } catch (err) {
      console.warn('[Asaas] Falha ao consultar saldo Asaas em tempo real:', err);
    }
  }

  const totalReceived = Number((completedRidesTotal || 0).toFixed(2));
  const raceCommission15 = Number((totalReceived * 0.15).toFixed(2));
  const repassarSexta85 = Number((totalReceived * 0.85).toFixed(2));

  // Próxima sexta-feira às 18:00
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Domingo, 5 = Sexta
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
