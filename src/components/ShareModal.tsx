import React from 'react';
import { X } from 'lucide-react';
import { PersonalReferralShareBox } from './PersonalReferralShareBox';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  appUrl?: string;
  referralCode?: string | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  referralCode,
}) => {
  if (!isOpen) return null;

  const cleanCode =
    String(referralCode || '').replace(/\s+/g, '').trim().toUpperCase() || 'JOSE492';

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative max-w-lg w-full my-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 text-zinc-300 hover:text-white bg-zinc-900/90 hover:bg-zinc-800 border border-white/15 rounded-full transition-colors cursor-pointer"
          title="Fechar"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <PersonalReferralShareBox
          code={cleanCode}
          role="passenger"
        />
      </div>
    </div>
  );
};
