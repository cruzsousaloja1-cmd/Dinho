import React from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  MapPin,
  Lock,
  UserCheck,
  MessageCircle,
  FileText,
} from 'lucide-react';

interface PrivacyPolicyPageProps {
  onBack: () => void;
}

const WHATSAPP_SUPPORT_URL =
  'https://wa.me/5519920032074?text=Preciso%20de%20ajuda%20no%20RACE';

export const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ onBack }) => {
  return (
    <div className="h-dvh bg-slate-50 text-slate-900 flex flex-col overflow-y-auto overscroll-contain">
      {/* Cabeçalho fixo */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3.5 shadow-xs">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-heading font-black text-lg text-[#ff6a00] tracking-tight">
              RACE
            </span>
            <span className="text-xs font-mono font-bold text-slate-500 hidden sm:inline">
              • Indaiatuba-SP
            </span>
          </div>
        </div>
      </header>

      {/* Conteúdo LGPD */}
      <main className="flex-1 px-4 py-6 sm:py-8">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-sm space-y-3">
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-heading font-black uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>LGPD • Lei nº 13.709/2018</span>
            </div>

            <h1 className="font-heading font-black text-2xl sm:text-3xl text-slate-950 leading-tight">
              Política de Privacidade e Proteção de Dados — RACE Indaiatuba
            </h1>

            <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
              Esta política explica de forma simples como o aplicativo{' '}
              <strong>RACE</strong> coleta, utiliza e protege os seus dados pessoais durante o uso
              de corridas e entregas em <strong>Indaiatuba-SP</strong>.
            </p>
          </div>

          <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-slate-950">
              <FileText className="w-5 h-5 text-[#ff6a00] shrink-0" />
              <h2 className="font-heading font-black text-base sm:text-lg">
                1. Quais dados coletamos
              </h2>
            </div>
            <ul className="space-y-2 text-sm text-slate-700 leading-relaxed list-disc pl-5">
              <li>
                <strong>Dados de identificação:</strong> nome completo, e-mail, número de WhatsApp e
                foto de perfil.
              </li>
              <li>
                <strong>Localização (GPS):</strong> endereço de saída e destino com número em
                Indaiatuba-SP e localização em tempo real durante corridas ou uso do botão de
                emergência.
              </li>
              <li>
                <strong>Condutores (Motoristas e Motoboys):</strong> placa, modelo e ano do veículo,
                CNH, CRLV e chave PIX para repasses semanais (85% condutor / 15% RACE).
              </li>
            </ul>
          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-slate-950">
              <MapPin className="w-5 h-5 text-emerald-600 shrink-0" />
              <h2 className="font-heading font-black text-base sm:text-lg">
                2. Para que usamos seus dados
              </h2>
            </div>
            <ul className="space-y-2 text-sm text-slate-700 leading-relaxed list-disc pl-5">
              <li>Conectar passageiros e motoristas em Indaiatuba-SP.</li>
              <li>Calcular rotas, valores e confirmar o embarque com segurança.</li>
              <li>Acionar contatos de emergência e suporte na Central de Segurança 24h.</li>
              <li>Processar pagamentos via Asaas e realizar repasses semanais.</li>
            </ul>
            <p className="text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
              O RACE não vende nem aluga seus dados pessoais para terceiros ou campanhas de anúncio.
            </p>
          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2.5 text-slate-950">
              <Lock className="w-5 h-5 text-blue-600 shrink-0" />
              <h2 className="font-heading font-black text-base sm:text-lg">
                3. Armazenamento e segurança
              </h2>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              Suas senhas são criptografadas exclusivamente pelo <strong>Supabase Auth</strong> e
              nunca são salvas em texto simples. O banco de dados utiliza proteção por{' '}
              <strong>Row Level Security (RLS)</strong>, garantindo que cada passageiro ou condutor
              acesse apenas as suas próprias informações e corridas.
            </p>
          </section>

          <section className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5 text-slate-950">
              <UserCheck className="w-5 h-5 text-[#ff6a00] shrink-0" />
              <h2 className="font-heading font-black text-base sm:text-lg">
                4. Seus direitos na LGPD e contato
              </h2>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              A qualquer momento você pode solicitar consulta, atualização ou exclusão definitiva da
              sua conta e dos seus dados pessoais diretamente pelo suporte oficial no WhatsApp ou
              pela administração em Indaiatuba-SP.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <a
                href={WHATSAPP_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-sm rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Falar com suporte no WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={onBack}
                className="py-3.5 px-6 bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-sm rounded-2xl flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar ao cadastro</span>
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
