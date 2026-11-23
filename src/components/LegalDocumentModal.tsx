import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Lock,
  MapPin,
  MessageCircle,
  Scale,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { LEGAL_DOCUMENTS } from './LegalConsentSection';

export type FullLegalDocType = 'termos' | 'privacidade' | 'contrato';

interface LegalDocumentModalProps {
  doc: FullLegalDocType | null;
  onClose: () => void;
  onAccept?: () => void;
}

const WHATSAPP_SUPPORT_URL =
  'https://wa.me/5519920032074?text=Preciso%20de%20ajuda%20no%20RACE';

export const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({
  doc,
  onClose,
  onAccept,
}) => {
  if (!doc) return null;

  const isTerms = doc === 'termos';
  const isContract = doc === 'contrato';
  const isPrivacy = doc === 'privacidade';

  const headerTitle = isTerms
    ? 'Termos de Uso • RACE'
    : isContract
    ? 'Contrato de Parceria • RACE'
    : 'Privacidade (LGPD) • RACE';

  return (
    <div
      className="fixed inset-0 z-[1600] bg-slate-50 text-slate-900 flex flex-col overflow-hidden animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={headerTitle}
    >
      {/* Topo fixo com Voltar */}
      <header className="px-4 py-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0 shadow-xs">
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar</span>
        </button>

        <div className="flex items-center gap-2 min-w-0">
          {isTerms ? (
            <Scale className="w-4 h-4 text-[#ff6a00] shrink-0" />
          ) : isContract ? (
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span className="text-xs font-mono font-bold text-slate-700 uppercase truncate">
            {headerTitle}
          </span>
        </div>
      </header>

      {/* Conteúdo completo rolável */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:py-7">
        <div className="max-w-2xl mx-auto space-y-5 pb-6">
          {isTerms && (
            <>
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-2.5">
                <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-800 border border-orange-200 px-3 py-1 rounded-full text-xs font-heading font-black uppercase tracking-wider">
                  <Scale className="w-4 h-4 text-[#ff6a00]" />
                  <span>Documento Oficial • Indaiatuba-SP</span>
                </div>
                <h2 className="font-heading font-black text-xl sm:text-2xl text-slate-950 leading-tight">
                  {LEGAL_DOCUMENTS.termos.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {LEGAL_DOCUMENTS.termos.subtitle}
                </p>
              </div>

              <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-2.5 text-sm text-slate-800 leading-relaxed">
                {LEGAL_DOCUMENTS.termos.clauses.map((clause, idx) => (
                  <p
                    key={idx}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium"
                  >
                    {clause}
                  </p>
                ))}
              </section>
            </>
          )}

          {isContract && (
            <>
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-2.5">
                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs font-heading font-black uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Parceria Oficial • Indaiatuba-SP</span>
                </div>
                <h2 className="font-heading font-black text-xl sm:text-2xl text-slate-950 leading-tight">
                  {LEGAL_DOCUMENTS.contrato.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {LEGAL_DOCUMENTS.contrato.subtitle}
                </p>
              </div>

              <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
                <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  Promoção de Lançamento: taxa 0% (100% para o condutor) até 17/12/2026. Após essa
                  data, vigora a taxa padrão de 15% (85% para o condutor), com repasse toda
                  sexta-feira via PIX.
                </p>
                <div className="space-y-2.5 text-sm text-slate-800 leading-relaxed">
                  {LEGAL_DOCUMENTS.contrato.clauses.map((clause, idx) => (
                    <p
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium"
                    >
                      {clause}
                    </p>
                  ))}
                </div>
              </section>
            </>
          )}

          {isPrivacy && (
            <>
              <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-2.5">
                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-heading font-black uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>LGPD • Lei nº 13.709/2018</span>
                </div>
                <h2 className="font-heading font-black text-xl sm:text-2xl text-slate-950 leading-tight">
                  Política de Privacidade e Proteção de Dados — RACE Indaiatuba
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Esta política explica de forma clara como o aplicativo <strong>RACE</strong>{' '}
                  coleta, utiliza e protege os seus dados pessoais durante corridas e entregas em{' '}
                  <strong>Indaiatuba-SP</strong>.
                </p>
              </div>

              <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-950">
                  <FileText className="w-5 h-5 text-[#ff6a00] shrink-0" />
                  <h3 className="font-heading font-black text-base sm:text-lg">
                    1. Quais dados coletamos
                  </h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-700 leading-relaxed list-disc pl-5">
                  <li>
                    <strong>Dados de identificação:</strong> nome completo, e-mail, WhatsApp, login,
                    senha criptografada e foto de perfil.
                  </li>
                  <li>
                    <strong>Localização (GPS):</strong> endereço de saída e destino com número em
                    Indaiatuba-SP e localização em tempo real durante corridas ou uso do botão de
                    emergência.
                  </li>
                  <li>
                    <strong>Condutores (Motoristas e Motoboys):</strong> placa, modelo e ano do
                    veículo, CNH, CRLV e chave PIX para repasses semanais.
                  </li>
                </ul>
              </section>

              <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-950">
                  <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
                  <h3 className="font-heading font-black text-base sm:text-lg">
                    2. Para que usamos seus dados
                  </h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-700 leading-relaxed list-disc pl-5">
                  <li>Criar cadastro e conectar passageiros, motoristas e motoboys em Indaiatuba-SP.</li>
                  <li>Calcular rotas, valores, bônus de indicação e confirmar o embarque com segurança.</li>
                  <li>Processar pagamentos via Asaas e realizar repasses semanais aos condutores.</li>
                  <li>Acionar suporte e segurança quando solicitado pelo usuário.</li>
                </ul>
                <p className="text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                  O RACE não vende nem aluga seus dados pessoais para terceiros ou anúncios.
                </p>
              </section>

              <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-950">
                  <Lock className="w-5 h-5 text-blue-600 shrink-0" />
                  <h3 className="font-heading font-black text-base sm:text-lg">
                    3. Armazenamento e segurança
                  </h3>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Suas senhas são criptografadas exclusivamente pelo <strong>Supabase Auth</strong>{' '}
                  e nunca são salvas em texto simples. O banco de dados utiliza proteção{' '}
                  <strong>Row Level Security (RLS)</strong>, garantindo que apenas você e a
                  administração autorizada acessem seus dados.
                </p>
              </section>

              <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-slate-950">
                  <UserCheck className="w-5 h-5 text-[#ff6a00] shrink-0" />
                  <h3 className="font-heading font-black text-base sm:text-lg">
                    4. Seus direitos na LGPD e contato
                  </h3>
                </div>
                <div className="space-y-2 text-sm text-slate-700 leading-relaxed">
                  {LEGAL_DOCUMENTS.lgpd.clauses.slice(3).map((clause, idx) => (
                    <p
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium"
                    >
                      {clause}
                    </p>
                  ))}
                </div>
                <a
                  href={WHATSAPP_SUPPORT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-sm rounded-2xl shadow-sm inline-flex items-center justify-center gap-2 transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Falar com suporte no WhatsApp</span>
                </a>
              </section>
            </>
          )}
        </div>
      </div>

      {/* Rodapé fixo do modal */}
      <footer className="p-4 border-t border-slate-200 bg-white shrink-0">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-heading font-bold text-sm inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
          {onAccept && (
            <button
              type="button"
              onClick={onAccept}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-black text-sm uppercase tracking-wider cursor-pointer inline-flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Li e Aceito — Continuar</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};
