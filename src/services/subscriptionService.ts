import { 
  WEEKLY_FEE, 
  RACE_PIX_KEY, 
  RACE_PIX_KEY_TYPE, 
  RACE_PIX_BANK, 
  RACE_PIX_NAME 
} from "../config/pricing";

export interface ManualPixDetails {
  key: string;
  keyType: string;
  bank: string;
  recipientName: string;
  amount: number;
}

export function getManualPixDetails(): ManualPixDetails {
  return {
    key: RACE_PIX_KEY,
    keyType: RACE_PIX_KEY_TYPE,
    bank: RACE_PIX_BANK,
    recipientName: RACE_PIX_NAME,
    amount: WEEKLY_FEE,
  };
}

