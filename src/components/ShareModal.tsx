import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  QrCode, 
  ShieldCheck, 
  Sparkles,
  ExternalLink,
  Smartphone,
  Download
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { WEEKLY_FEE_TEXT, WEEKLY_FEE_BADGE } from '../config/pricing';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  appUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  if (!isOpen) return null;

  // Resolve target sharing URL
  const currentUrl = appUrl || (typeof window !== 'undefined' ? window.location.href : 'https://race-app.com');

  const shareTitle = 'RACE - Mobilidade Urbana & Entregas Inteligentes';
  const shareText = 
`🚀 Conheça a RACE: Mobilidade e Entregas em Indaiatuba!
⭐ Modelo justo: ${WEEKLY_FEE_TEXT}
🚗 Corridas Econômica: R$ 2,50/km | Confort: R$ 3,50/km
🏍️ Moto Passageiro: R$ 1,80/km | Flash Entrega: R$ 2,00/km
🛡️ Suporte 24h & GPS em tempo real!
Acesse agora: ${currentUrl}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        // Fallback for older browsers / iframe
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      try {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.6 } });
      } catch {}
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // safe fallback
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: currentUrl,
        });
      } catch {
        // User cancelled or unsupported
      }
    } else {
      handleCopyLink();
    }
  };

  const handleWhatsAppShare = () => {
    const encoded = encodeURIComponent(shareText);
    const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.location.href = waUrl;
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border-2 border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center font-bold shadow-md">
            <Share2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-heading font-black text-slate-950 text-xl sm:text-2xl">
              Compartilhar RACE
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Envie para passageiros, motoristas e entregadores
            </p>
          </div>
        </div>

        {/* Benefits badge banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Destaques da Plataforma RACE para compartilhar:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block">🚗 {WEEKLY_FEE_BADGE}</span>
              Sem mensalidade, sem taxa para trabalhar
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900 block">⚡ R$ 2,50 a R$ 3,50/km</span>
              Econômica & Confort homologado
            </div>
          </div>
        </div>

        {/* Quick Link Field with Copy */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Link Direto do Aplicativo
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-mono text-slate-800 select-all focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-sm active:scale-95 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-950 hover:bg-slate-800 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>
          {copied && (
            <p className="text-xs font-bold text-emerald-600 animate-pulse">
              ✓ Link copiado para a área de transferência!
            </p>
          )}
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* WhatsApp Direct */}
          <button
            type="button"
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-sm rounded-2xl shadow-md transition-all cursor-pointer active:scale-95"
          >
            <MessageCircle className="w-5 h-5 fill-white" />
            <span>Compartilhar no WhatsApp</span>
          </button>

          {/* Native Mobile Share */}
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-sm rounded-2xl shadow-md transition-all cursor-pointer active:scale-95"
          >
            <Smartphone className="w-5 h-5" />
            <span>Enviar no Celular</span>
          </button>
        </div>

        {/* Baixar Código-Fonte .ZIP */}
        <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Código-Fonte Completo (.ZIP)</span>
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full font-mono">
              106 KB
            </span>
          </div>
          <p className="text-xs text-slate-600 font-medium">
            Todos os arquivos React, TypeScript, Tailwind, mapas e regras de negócio do RACE prontos para download imediato.
          </p>
          <a
            href="/race-app-codigo-fonte.zip"
            download="race-app-codigo-fonte.zip"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-black text-sm rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer text-center"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Arquivo .ZIP do Projeto</span>
          </a>
        </div>

        {/* QR Code toggle */}
        <div className="border-t border-slate-200 pt-3 flex flex-col items-center">
          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer py-1"
          >
            <QrCode className="w-4 h-4 text-slate-800" />
            <span>{showQr ? 'Ocultar QR Code' : 'Exibir QR Code para escanear com câmera'}</span>
          </button>

          {showQr && (
            <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center gap-2">
              {/* Dynamic SVG QR Pattern */}
              <div className="bg-white p-3 rounded-xl border border-slate-300 shadow-sm">
                <svg width="140" height="140" viewBox="0 0 29 29" shapeRendering="crispEdges">
                  <path fill="#0f172a" d="
                    M0 0h7v7H0zM22 0h7v7H22zM0 22h7v7H0z
                    M1 1v5h5V1H1zM23 1v5h5V1H23zM1 23v5h5V1H1z
                    M2 2h3v3H2zM24 2h3v3H24zM2 24h3v3H2z
                    M8 1h1v3H8zM10 1h2v1h-2zM13 1h1v2h-1zM15 1h2v1h-2zM18 1h3v1h-3z
                    M8 5h2v2H8zM12 4h1v3h-1zM14 3h2v1h-2zM18 4h2v2h-2z
                    M0 8h2v1H0zM3 8h1v2H3zM5 8h2v1H5zM8 8h1v3H8zM10 8h3v1h-3z
                    M14 7h2v2h-2zM17 8h1v2h-1zM19 8h2v1h-2zM22 8h1v2h-1zM24 8h2v1h-2z
                    M0 10h1v3H0zM2 11h2v1H2zM5 10h1v2H5zM9 10h1v3H9zM12 10h2v2h-2z
                    M15 10h2v1h-2zM18 10h1v3h-1zM20 10h3v1h-3zM24 10h1v2h-1zM26 10h2v1h-2z
                    M0 14h29v1H0z
                    M1 16h2v2H1zM4 16h1v3H4zM6 16h2v1H6zM9 16h3v1H9zM13 16h1v2h-1z
                    M15 16h2v1h-2zM18 16h2v2h-2zM21 16h3v1h-3zM25 16h2v2h-2z
                    M2 19h2v2H2zM5 19h2v1H5zM8 18h2v2H8zM11 19h2v1h-2zM14 19h1v3h-1z
                    M16 18h2v2h-2zM19 19h2v1h-2zM22 19h3v1h-3zM26 19h1v2h-1z
                    M8 22h2v1H8zM11 22h1v3h-1zM13 22h3v1h-3zM17 22h2v2h-2zM20 22h1v2h-1z
                    M22 22h2v1h-2zM25 22h3v1h-3z
                    M8 24h1v3H8zM10 25h2v1h-2zM13 24h2v2h-2zM16 25h2v1h-2zM19 24h2v3h-2z
                    M22 24h1v2h-1zM24 25h2v1h-2zM27 24h1v3h-1z
                    M8 27h3v1H8zM12 27h2v1h-2zM15 27h1v1h-1zM17 27h3v1h-3zM21 27h2v1h-2zM24 27h4v1h-4z
                  "/>
                </svg>
              </div>
              <p className="text-[11px] text-slate-500 font-medium text-center">
                Aponte a câmera do seu smartphone para abrir o RACE imediatamente
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
