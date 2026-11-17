import React, { useState } from 'react';
import { FileText, ShieldCheck, Scale, ArrowLeft, CheckCircle2, ExternalLink } from 'lucide-react';

export type LegalDocKey = 'contrato' | 'termos' | 'lgpd';

export const LEGAL_DOCUMENTS: Record<
  LegalDocKey,
  {
    title: string;
    subtitle: string;
    clauses: string[];
  }
> = {
  contrato: {
    title: 'CONTRATO DE PARCERIA - MOTORISTA / MOTOBOY',
    subtitle: 'Instrumento Particular de Intermediação Digital RACE — Indaiatuba-SP',
    clauses: [
      'Este Contrato é entre RACE (CNPJ a ser informado, Indaiatuba-SP) e o MOTORISTA parceiro.',
      '1. O motorista é AUTÔNOMO, sem vínculo empregatício com o RACE, sem horário fixo, sem subordinação.',
      '2. O motorista recebe 85% de cada corrida, o RACE fica com 15% de taxa de intermediação.',
      '3. Repasse toda sexta-feira para a conta do motorista.',
      '4. SEM mensalidade, SEM taxa de R$200/semana, SEM taxa para trabalhar.',
      '5. O motorista é responsável por seu veículo, CNH válida, CRLV em dia, seguro obrigatório e manutenção.',
      '6. O motorista deve seguir as exigências da sua modalidade: Econômico (carro a partir de 2015), Confort (carro a partir de 2020 SUV/Sedã), Motoboy Passageiro (moto a partir de 2018, mínimo 150cc), Motoboy Entregas (moto a partir de 2015 com baú 90L).',
      '7. Se o passageiro não pagar em dinheiro, o RACE paga os 85% para o motorista na sexta e cobra a dívida do passageiro.',
      '8. O RACE pode desativar o motorista em caso de avaliação baixa, reclamações ou descumprimento das regras.',
      '9. Foro: Indaiatuba-SP.',
    ],
  },
  termos: {
    title: 'TERMOS DE USO - PASSAGEIRO',
    subtitle: 'Regras de Utilização da Plataforma RACE — Indaiatuba-SP',
    clauses: [
      '1. O passageiro deve informar endereço de saída e chegada com número exato e MEU GPS.',
      '2. O passageiro deve pagar a corrida no app via PIX Asaas, Cartão ou Dinheiro para o motorista.',
      '3. Se escolher Dinheiro e não pagar, fica registrada dívida no app e o passageiro fica bloqueado até pagar via PIX.',
      '4. O passageiro deve avaliar o motorista com estrelas ao final da corrida.',
      '5. O passageiro não pode pedir corrida para terceiros sem autorização.',
      '6. Foro: Indaiatuba-SP.',
    ],
  },
  lgpd: {
    title: 'POLÍTICA DE PRIVACIDADE - LGPD (Lei 13.709/2018)',
    subtitle: 'Tratamento, Segurança e Direitos do Titular de Dados',
    clauses: [
      'O RACE coleta: Nome, E-mail, WhatsApp, Login, Senha criptografada, Foto, Localização (GPS) durante a corrida, Placa, Modelo, Ano, CNH.',
      'Uso: Para criar cadastro, conectar passageiro e motorista, calcular valor, processar pagamento via Asaas, repassar 85% ao motorista, e mostrar mapa.',
      'Não vendemos seus dados. Seus dados ficam no Supabase com RLS ativado, só você e o ADM veem seus dados.',
      'Você pode pedir para apagar seus dados a qualquer momento no ADM ou pelo WhatsApp do RACE.',
      'Contato do encarregado LGPD: admin@race.com.br',
    ],
  },
};

interface LegalConsentSectionProps {
  acceptedContract: boolean;
  acceptedTerms: boolean;
  acceptedLgpd: boolean;
  acceptedPrivacy?: boolean;
  onChangeContract: (checked: boolean) => void;
  onChangeTerms: (checked: boolean) => void;
  onChangeLgpd: (checked: boolean) => void;
  onChangePrivacy?: (checked: boolean) => void;
  onOpenPrivacyPage?: () => void;
  theme?: 'dark' | 'light';
}

export const LegalConsentSection: React.FC<LegalConsentSectionProps> = ({
  acceptedContract,
  acceptedTerms,
  acceptedLgpd,
  acceptedPrivacy,
  onChangeContract,
  onChangeTerms,
  onChangeLgpd,
  onChangePrivacy,
  onOpenPrivacyPage,
  theme = 'dark',
}) => {
  const [openDoc, setOpenDoc] = useState<LegalDocKey | null>(null);

  const hasFourthPrivacy = typeof onChangePrivacy === 'function';
  const allAccepted =
    acceptedContract &&
    acceptedTerms &&
    acceptedLgpd &&
    (!hasFourthPrivacy || Boolean(acceptedPrivacy));
  const isDark = theme === 'dark';

  const items: Array<{
    key: LegalDocKey;
    number: string;
    labelPrefix: string;
    docName: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    icon: React.ReactNode;
  }> = [
    {
      key: 'contrato',
      number: '1)',
      labelPrefix: 'Li e concordo com o',
      docName: 'Contrato de Parceria RACE',
      checked: acceptedContract,
      onChange: onChangeContract,
      icon: <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
    },
    {
      key: 'termos',
      number: '2)',
      labelPrefix: 'Li e concordo com os',
      docName: 'Termos de Uso',
      checked: acceptedTerms,
      onChange: onChangeTerms,
      icon: <Scale className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
    },
    {
      key: 'lgpd',
      number: '3)',
      labelPrefix: 'Li e concordo com a',
      docName: 'LGPD',
      checked: acceptedLgpd,
      onChange: onChangeLgpd,
      icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />,
    },
  ];

  const handleAcceptFromModal = () => {
    if (openDoc === 'contrato') onChangeContract(true);
    if (openDoc === 'termos') onChangeTerms(true);
    if (openDoc === 'lgpd') onChangeLgpd(true);
    setOpenDoc(null);
  };

  return (
    <>
      <div
        className={`rounded-2xl p-3.5 sm:p-4 border-2 space-y-2.5 ${
          isDark
            ? allAccepted
              ? 'bg-emerald-950/25 border-emerald-500/50'
              : 'bg-[#121212] border-zinc-800'
            : allAccepted
            ? 'bg-emerald-50 border-emerald-400'
            : 'bg-slate-50 border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[11px] sm:text-xs font-heading font-black uppercase tracking-wider ${
              isDark ? 'text-zinc-200' : 'text-slate-900'
            }`}
          >
            Documentos Obrigatórios ({hasFourthPrivacy ? '4 aceites' : '3 aceites'}) *
          </span>
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
              allAccepted
                ? isDark
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : isDark
                ? 'bg-amber-950/70 text-amber-300 border border-amber-500/40'
                : 'bg-amber-100 text-amber-900 border border-amber-300'
            }`}
          >
            {allAccepted ? (hasFourthPrivacy ? '4/4 Marcados' : '3/3 Marcados') : 'Obrigatório'}
          </span>
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.key}
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors ${
                isDark
                  ? item.checked
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-[#181818] border-zinc-800'
                  : item.checked
                  ? 'bg-white border-emerald-400'
                  : 'bg-white border-slate-200'
              }`}
            >
              <input
                id={`legal-check-${item.key}-${theme}`}
                type="checkbox"
                checked={item.checked}
                onChange={(e) => item.onChange(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-blue-600 rounded cursor-pointer shrink-0"
              />
              <div className="flex-1 min-w-0 text-xs sm:text-sm leading-snug">
                <label
                  htmlFor={`legal-check-${item.key}-${theme}`}
                  className={`cursor-pointer font-semibold ${
                    isDark ? 'text-zinc-200' : 'text-slate-800'
                  }`}
                >
                  {item.number} {item.labelPrefix}{' '}
                </label>
                <button
                  type="button"
                  onClick={() => setOpenDoc(item.key)}
                  className={`inline-flex items-center gap-1 font-bold underline underline-offset-2 cursor-pointer text-left ${
                    isDark
                      ? 'text-blue-400 hover:text-blue-300'
                      : 'text-blue-600 hover:text-blue-800'
                  }`}
                >
                  <span>{item.docName}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 inline" />
                </button>
              </div>
            </div>
          ))}

          {hasFourthPrivacy && (
            <div
              className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors ${
                isDark
                  ? acceptedPrivacy
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-[#181818] border-zinc-800'
                  : acceptedPrivacy
                  ? 'bg-white border-emerald-400'
                  : 'bg-white border-slate-200'
              }`}
            >
              <input
                id={`legal-check-privacidade-${theme}`}
                type="checkbox"
                checked={Boolean(acceptedPrivacy)}
                onChange={(e) => onChangePrivacy?.(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-blue-600 rounded cursor-pointer shrink-0"
              />
              <div className="flex-1 min-w-0 text-xs sm:text-sm leading-snug">
                <label
                  htmlFor={`legal-check-privacidade-${theme}`}
                  className={`cursor-pointer font-semibold ${
                    isDark ? 'text-zinc-200' : 'text-slate-800'
                  }`}
                >
                  4) Li e concordo com a{' '}
                </label>
                <a
                  href={`${import.meta.env.BASE_URL}privacidade`}
                  onClick={(e) => {
                    if (onOpenPrivacyPage) {
                      e.preventDefault();
                      onOpenPrivacyPage();
                    }
                  }}
                  className={`inline-flex items-center gap-1 font-bold underline underline-offset-2 cursor-pointer text-left ${
                    isDark
                      ? 'text-blue-400 hover:text-blue-300'
                      : 'text-blue-600 hover:text-blue-800'
                  }`}
                >
                  <span>Política de Privacidade (/privacidade)</span>
                  <ExternalLink className="w-3 h-3 shrink-0 inline" />
                </a>
              </div>
            </div>
          )}
        </div>

        <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
          Clique em cada link azul acima para ler o documento completo antes de marcar.
        </p>
      </div>

      {/* Tela Simples do Documento Completo com Botão Voltar */}
      {openDoc && (
        <div
          className="fixed inset-0 z-[1500] bg-white text-slate-900 flex flex-col overflow-hidden animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          {/* Topo com botão Voltar */}
          <div className="px-4 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setOpenDoc(null)}
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-600 uppercase truncate">
              Documento Oficial RACE
            </span>
          </div>

          {/* Conteúdo completo para leitura */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 max-w-2xl w-full mx-auto space-y-4">
            <div className="space-y-1 border-b border-slate-200 pb-3">
              <h2 className="font-heading font-black text-lg sm:text-xl text-slate-950 leading-tight">
                {LEGAL_DOCUMENTS[openDoc].title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                {LEGAL_DOCUMENTS[openDoc].subtitle}
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-800 leading-relaxed">
              {LEGAL_DOCUMENTS[openDoc].clauses.map((clause, idx) => (
                <p
                  key={idx}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 font-medium"
                >
                  {clause}
                </p>
              ))}
            </div>
          </div>

          {/* Rodapé com Voltar e Concordo */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center gap-3 max-w-2xl w-full mx-auto shrink-0">
            <button
              type="button"
              onClick={() => setOpenDoc(null)}
              className="px-5 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-900 font-heading font-bold text-sm flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
            <button
              type="button"
              onClick={handleAcceptFromModal}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-black text-sm uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Li e Concordo — Voltar</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
