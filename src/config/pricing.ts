// Configurações de Comissionamento e Precificação da Plataforma RACE
// NOVO MODELO: Motorista NÃO paga nada para trabalhar. O app Race fica com 15% de cada corrida.
// Motorista recebe 85% de cada corrida.

export const RACE_COMMISSION_PERCENT = 15; // 15% Comissão Race
export const DRIVER_SHARE_PERCENT = 85;     // 85% Repasse ao Condutor
export const COMMISSION = 0.15;            // Fração 15%

export const WEEKLY_FEE = 0;               // Sem taxa semanal / mensalidade
export const WEEKLY_FEE_TEXT = "Sem taxa semanal - Comissão 15%";
export const WEEKLY_FEE_SHORT = "Sem taxa";
export const WEEKLY_FEE_BADGE = "Comissão 15%";
export const WEEKLY_DAYS = 7;
export const ECONOMY_VS_UBER_PERCENT = 25;

// Chave PIX Real Manual da Race (usada para recebimento de pagamentos no app pelo Admin)
export const RACE_PIX_KEY = "9d9e5635-9e68-46bf-bffe-08bdae29c8ba";
export const PIX_KEY_RACE = RACE_PIX_KEY; // compatibilidade
export const RACE_PIX_KEY_TYPE = "Chave Aleatória"; // Chave Aleatória / EVP
export const RACE_PIX_BANK = "Seu Banco - Jose Cruz Sousa";
export const RACE_PIX_NAME = "Jose Cruz Sousa - Race";

export const FINAL_RIDE_MESSAGE = "Motorista recebe 85% • Race fica com 15% de comissão por corrida - Sem mensalidade, sem taxa para trabalhar";

