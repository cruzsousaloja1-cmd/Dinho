/**
 * Resolve o caminho da imagem oficial do ícone circular do RACE
 * (círculo preto, borda vermelha grossa, R estilizado em cima e RACE grande vermelho no meio)
 * compatível com Dev (/), GitHub Pages (/Dinho/) e Android Capacitor (./).
 */
export const getRaceCircleIconUrl = (): string => {
  const base =
    (typeof import.meta !== 'undefined' &&
      (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL) ||
    './';
  const normalized = base.endsWith('/') ? base : `${base}/`;
  return `${normalized}race-icon-circle.png`;
};
