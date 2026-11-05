import QRCode from "qrcode";
import { WEEKLY_FEE, PIX_KEY_RACE } from "../config/pricing";

export type PixCharge = {
  chargeId: string;
  pixCopyPaste: string;
  qrCodeDataUrl: string;
  amount: number;
  expiresAt: string;
};

export async function createWeeklyPixCharge(driver: any): Promise<PixCharge> {
  const pixPayload = `00020126580014BR.GOV.BCB.PIX0136${PIX_KEY_RACE}5204000053039865405${WEEKLY_FEE.toFixed(2)}5802BR5909RACE APP6009SAO PAULO62070503***6304`;
  const qrDataUrl = await QRCode.toDataURL(pixPayload, {
    margin: 2,
    scale: 8,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
  await new Promise(r => setTimeout(r, 800));
  return {
    chargeId: `race_${driver?.id || 'drv'}_${Date.now()}`,
    pixCopyPaste: pixPayload,
    qrCodeDataUrl: qrDataUrl,
    amount: WEEKLY_FEE,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

export async function verifyPixPayment(chargeId: string): Promise<boolean> {
  await new Promise(r => setTimeout(r, 1000));
  return true; // simula pago, depois troca por chamada pro backend Asaas
}
