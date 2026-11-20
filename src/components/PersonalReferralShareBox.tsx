import React, { useState, useEffect } from 'react';
import { Copy, Check, MessageCircle, Link2, Download } from 'lucide-react';
import {
  buildPersonalReferralLink,
  buildPersonalInstallShareText,
  shareReferralWithLogo,
  getRaceLogoPublicUrl,
  preloadRaceLogoBlob,
  downloadRaceLogoPng,
  PersonalShareRole,
} from '../services/promoService';

interface PersonalReferralShareBoxProps {
  code: string;
  role: PersonalShareRole;
}

export const PersonalReferralShareBox: React.FC<PersonalReferralShareBoxProps> = ({
  code,
  role,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showLogoDownloadHint, setShowLogoDownloadHint] = useState(false);
  const [logoSaved, setLogoSaved] = useState(false);

  useEffect(() => {
    preloadRaceLogoBlob().catch(() => {});
  }, []);

  const cleanCode = String(code || '').replace(/\s+/g, '').trim().toUpperCase();
  if (!cleanCode) return null;

  const raceLogoUrl = getRaceLogoPublicUrl();
  const personalLink = buildPersonalReferralLink(cleanCode);
  const shareMessage = buildPersonalInstallShareText(cleanCode, role);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(personalLink);
      } else {
        const ta = document.createElement('textarea');
        ta.value = personalLink;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleShareWhatsappWithLogo = async () => {
    try {
      const audience =
        role === 'motoboy' ? 'motoboy' : role === 'driver' ? 'driver' : 'passenger';
      const res = await shareReferralWithLogo(cleanCode, audience);
      if (res === 'whatsapp_with_download') {
        setShowLogoDownloadHint(true);
      }
    } catch {
      // ignore share errors
    }
  };

  return (
    <div className="bg-zinc-950 border-2 border-red-600 rounded-3xl p-5 sm:p-6 text-left space-y-4 shadow-2xl">
      {/* Logo RACE no topo */}
      <div className="flex flex-col items-center gap-2 text-center">
        <img
          src={raceLogoUrl}
          alt="RACE - Mobilidade e Entregas"
          onLoad={() => {
            preloadRaceLogoBlob().catch(() => {});
          }}
          className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-contain bg-black shadow-xl"
        />
        <span className="text-[11px] font-black uppercase tracking-widest text-red-400">
          Compartilhar RACE • App Oficial (APK)
        </span>
      </div>

      {/* Seu código + Seu link (APK direto) */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-black/70 border border-white/15 rounded-xl px-3.5 py-2.5">
          <span className="text-xs sm:text-sm font-bold text-amber-200">
            Seu código:
          </span>
          <span className="font-mono font-black text-lg sm:text-xl tracking-wider text-white select-all">
            {cleanCode}
          </span>
        </div>

        <div className="bg-black/70 border border-white/15 rounded-xl px-3.5 py-2.5 space-y-1">
          <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>Seu link:</span>
          </span>
          <p className="font-mono text-xs sm:text-sm font-bold text-white break-all select-all leading-snug">
            {personalLink}
          </p>
        </div>
      </div>

      {/* Prévia da mensagem exata com quebra de linha (sem #) */}
      <div className="bg-black/60 border border-white/15 rounded-xl p-3.5">
        <p className="text-xs sm:text-sm text-zinc-100 font-medium whitespace-pre-line break-words leading-relaxed">
          {shareMessage}
        </p>
      </div>

      {/* SÓ 2 BOTÕES: [Copiar link] e [Compartilhar no WhatsApp] */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleCopyLink}
          className="w-full min-h-[52px] py-3 px-4 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-950 font-heading font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
        >
          {copiedLink ? (
            <>
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-emerald-700">Link copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5 shrink-0" />
              <span>Copiar link</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleShareWhatsappWithLogo}
          className="w-full min-h-[52px] py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.98] text-white font-heading font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
        >
          <MessageCircle className="w-5 h-5 shrink-0" />
          <span>Compartilhar no WhatsApp</span>
        </button>
      </div>

      {showLogoDownloadHint && (
        <div className="bg-black/75 border border-amber-400/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-amber-100 font-medium">
            Se o WhatsApp não anexou a imagem automaticamente, baixe o logo:
          </span>
          <button
            type="button"
            onClick={() => {
              downloadRaceLogoPng()
                .then(() => {
                  setLogoSaved(true);
                  setTimeout(() => setLogoSaved(false), 3000);
                })
                .catch(() => {});
            }}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            {logoSaved ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Logo salvo!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Baixar logo</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
