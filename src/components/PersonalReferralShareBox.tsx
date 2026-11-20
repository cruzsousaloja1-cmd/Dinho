import React, { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Link2 } from 'lucide-react';
import {
  buildPersonalReferralLink,
  buildPersonalInstallShareText,
  buildPersonalInstallWhatsappUrl,
  sharePersonalInstallLink,
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
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const cleanCode = String(code || '').replace(/\s+/g, '').trim().toUpperCase();
  if (!cleanCode) return null;

  const personalLink = buildPersonalReferralLink(cleanCode);
  const shareMessage = buildPersonalInstallShareText(cleanCode, role);
  const whatsappUrl = buildPersonalInstallWhatsappUrl(cleanCode, role);

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

  const handleShareNative = async () => {
    const res = await sharePersonalInstallLink(cleanCode, role);
    if (res === 'native') {
      setShareFeedback('Compartilhamento aberto com seu código e link!');
      setTimeout(() => setShareFeedback(null), 3000);
    } else if (res === 'whatsapp') {
      setShareFeedback('WhatsApp aberto com seu código e link!');
      setTimeout(() => setShareFeedback(null), 3000);
    }
  };

  return (
    <div className="bg-black/55 border-2 border-red-500/80 rounded-2xl p-4 sm:p-5 text-left space-y-3.5 shadow-xl">
      {/* Seu código + Seu link */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5">
          <span className="text-xs sm:text-sm font-bold text-amber-200">
            Seu código:
          </span>
          <span className="font-mono font-black text-base sm:text-lg tracking-wider text-white select-all">
            {cleanCode}
          </span>
        </div>

        <div className="bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 space-y-1">
          <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>Seu link:</span>
          </span>
          <p className="font-mono text-xs sm:text-sm font-bold text-white break-all select-all leading-snug">
            {personalLink}
          </p>
        </div>
      </div>

      {/* Botão GRANDE VERMELHO: COMPARTILHAR MEU LINK */}
      <button
        type="button"
        onClick={handleShareNative}
        className="w-full min-h-[60px] py-3.5 px-5 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-heading font-black text-base sm:text-lg uppercase tracking-wide flex items-center justify-center gap-2.5 shadow-xl border-2 border-red-400 transition-all cursor-pointer"
      >
        <Share2 className="w-6 h-6 shrink-0" />
        <span>COMPARTILHAR MEU LINK</span>
      </button>

      {shareFeedback && (
        <p className="text-xs font-bold text-emerald-300 text-center">
          {shareFeedback}
        </p>
      )}

      {/* Botões Copiar link + Compartilhar no WhatsApp */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleCopyLink}
          className="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 active:scale-[0.98] text-slate-950 font-heading font-black text-sm flex items-center justify-center gap-2 shadow cursor-pointer transition-all"
        >
          {copiedLink ? (
            <>
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-emerald-700">Link copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 shrink-0" />
              <span>Copiar link</span>
            </>
          )}
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] active:scale-[0.98] text-white font-heading font-black text-sm flex items-center justify-center gap-2 shadow cursor-pointer transition-all no-underline"
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span>Compartilhar no WhatsApp</span>
        </a>
      </div>

      {/* Prévia da mensagem automática do usuário logado */}
      <p className="text-[11px] text-amber-100/95 font-medium whitespace-pre-line break-words bg-black/40 rounded-xl p-3 border border-white/10 leading-relaxed">
        {shareMessage}
      </p>
    </div>
  );
};
