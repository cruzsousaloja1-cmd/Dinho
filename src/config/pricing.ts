// Configurações de Comissionamento e Precificação da Plataforma RACE
// NOVO MODELO: Motorista NÃO paga nada para trabalhar. O app Race fica com 15% de cada corrida.
// Motorista recebe 85% de cada corrida.

export const RACE_COMMISSION_PERCENT = 15; // 15% Comissão Race
export const DRIVER_SHARE_PERCENT = 85;     // 85% Repasse ao Condutor
export const COMMISSION = 0.15;            // Fração 15%

export const WEEKLY_FEE = 0;               // Sem taxa semanal / sem mensalidade
export const WEEKLY_FEE_TEXT = "Você fica com 85% de cada corrida, Race fica com 15% - sem mensalidade, sem taxa para trabalhar";
export const WEEKLY_FEE_SHORT = "85% seu";
export const WEEKLY_FEE_BADGE = "85% seu • 15% Race";
export const WEEKLY_DAYS = 7;
export const ECONOMY_VS_UBER_PERCENT = 25;

// Pagamentos no app processados oficialmente via Asaas (PIX e Cartão)
export const RACE_PIX_KEY = "pagamentos@race.com.br";
export const PIX_KEY_RACE = RACE_PIX_KEY; // compatibilidade
export const RACE_PIX_KEY_TYPE = "Asaas PIX";
export const RACE_PIX_BANK = "Asaas Instituição de Pagamento";
export const RACE_PIX_NAME = "RACE Mobilidade - Asaas";

export const FINAL_RIDE_MESSAGE = "Você fica com 85% de cada corrida, Race fica com 15% - sem mensalidade, sem taxa para trabalhar";

