import React, { useState } from 'react';
import { FileText, ShieldCheck, Scale, X, CheckCircle2, ExternalLink } from 'lucide-react';

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
  onChangeContract: (checked: boolean) => void;
  onChangeTerms: (checked: boolean) => void;
  onChangeLgpd: (checked: boolean) => void;
  theme?: 'dark' | 'light';
}

export const LegalConsentSection: React.FC<LegalConsentSectionProps> = ({
  acceptedContract,
  acceptedTerms,
  acceptedLgpd,
  onChangeContract,
  onChangeTerms,
  onChangeLgpd,
  theme = 'dark',
}) => {
  const [openDoc, setOpenDoc] = useState<LegalDocKey | null>(null);

  const allAccepted = acceptedContract && acceptedTerms && acceptedLgpd;
  const isDark = theme === 'dark';

  const items: Array<{
    key: LegalDocKey;
    labelPrefix: string;
    docName: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    icon: React.ReactNode;
  }> = [
    {
      key: 'contrato',
      labelPrefix: 'Li e aceito o',
      docName: 'Contrato de Parceria',
      checked: acceptedContract,
      onChange: onChangeContract,
      icon: <FileText className="w-3.5 h-3.5 text-[#ff6a00] shrink-0" />,
    },
    {
      key: 'termos',
      labelPrefix: 'Li e aceito os',
      docName: 'Termos de Uso',
      checked: acceptedTerms,
      onChange: onChangeTerms,
      icon: <Scale className="w-3.5 h-3.5 text-[#ff6a00] shrink-0" />,
    },
    {
      key: 'lgpd',
      labelPrefix: 'Li e aceito a',
      docName: 'Política de Privacidade (LGPD)',
      checked: acceptedLgpd,
      onChange: onChangeLgpd,
      icon: <ShieldCheck className="w-3.5 h-3.5 text-[#ff6a00] shrink-0" />,
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
        className={`rounded-2xl p-3.5 border space-y-2.5 ${
          isDark
            ? allAccepted
              ? 'bg-emerald-950/25 border-emerald-500/50'
              : 'bg-[#121212] border-zinc-800'
            : allAccepted
            ? 'bg-emerald-50 border-emerald-300'
            : 'bg-slate-50 border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[11px] font-heading font-black uppercase tracking-wider ${
              isDark ? 'text-zinc-200' : 'text-slate-900'
            }`}
          >
            Aceite Obrigatório antes de Salvar *
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
            {allAccepted ? '3/3 Aceitos' : 'Obrigatório'}
          </span>
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.key}
              className={`flex items-start gap-2.5 p-2 rounded-xl border transition-colors ${
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
                className="mt-0.5 w-4 h-4 accent-[#ff6a00] rounded cursor-pointer shrink-0"
              />
              <div className="flex-1 min-w-0 text-xs leading-snug">
                <label
                  htmlFor={`legal-check-${item.key}-${theme}`}
                  className={`cursor-pointer font-medium ${
                    isDark ? 'text-zinc-200' : 'text-slate-800'
                  }`}
                >
                  {item.labelPrefix}{' '}
                </label>
                <button
                  type="button"
                  onClick={() => setOpenDoc(item.key)}
                  className="inline-flex items-center gap-1 font-bold text-[#ff6a00] hover:underline underline-offset-2 cursor-pointer text-left"
                >
                  <span>{item.docName}</span>
                  <ExternalLink className="w-3 h-3 shrink-0 inline" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <p className={`text-[11px] ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          Toque em cada título em laranja acima para ler o texto completo antes de confirmar.
        </p>
      </div>

      {/* Modal Fullscreen com o Texto Completo do Documento Selecionado */}
      {openDoc && (
        <div
          className="fixed inset-0 z-[1500] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg max-h-[88vh] bg-[#0f0f0f] text-white border border-zinc-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-start justify-between gap-3 bg-[#151515]">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-[#ff6a00] text-xs font-mono font-bold uppercase">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Documento Oficial RACE</span>
                </div>
                <h3 className="font-heading font-black text-base sm:text-lg text-white leading-tight">
                  {LEGAL_DOCUMENTS[openDoc].title}
                </h3>
                <p className="text-xs text-zinc-400">
                  {LEGAL_DOCUMENTS[openDoc].subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenDoc(null)}
                className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-3 text-xs sm:text-sm text-zinc-200 leading-relaxed">
              {LEGAL_DOCUMENTS[openDoc].clauses.map((clause, idx) => (
                <p
                  key={idx}
                  className="bg-[#181818] border border-zinc-800/80 rounded-xl p-3 font-medium"
                >
                  {clause}
                </p>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 bg-[#151515] flex items-center gap-3">
              <button
                type="button"
                onClick={() => setOpenDoc(null)}
                className="px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs sm:text-sm cursor-pointer transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleAcceptFromModal}
                className="flex-1 py-3 px-4 rounded-xl bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-xs sm:text-sm uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Li e Aceito este Documento</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
