import React, { useState } from 'react';
import { 
  Headphones, 
  Send, 
  PhoneCall
} from 'lucide-react';
import { WEEKLY_FEE_TEXT } from '../config/pricing';

interface Support24hModalProps {
  isOpen: boolean;
  onClose: () => void;
  userType?: 'passenger' | 'driver' | 'admin';
}

interface Message {
  id: string;
  sender: 'user' | 'support';
  text: string;
  time: string;
}

export const Support24hModal: React.FC<Support24hModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'm1',
      sender: 'support',
      text: 'Olá! Seja bem-vindo à Central de Atendimento 24 Horas RACE. Nossa equipe de suporte técnico e segurança está pronta para te atender em tempo real. Como podemos ajudar agora?',
      time: 'Agora',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  if (!isOpen) return null;

  const quickQuestions = [
    'Quais carros são aceitos no RACE Confort?',
    'Como funciona a comissão de 15% e o ganho de 85%?',
    'Tem alguma mensalidade ou taxa para trabalhar?',
    'Quais são os valores por km nas categorias?',
    'Como acionar o suporte de emergência durante a corrida?',
    'Como cadastrar moto para entrega ou passageiro?',
  ];

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      let reply = 'Entendido! Nossa equipe especializada está verificando sua solicitação.';
      const lower = text.toLowerCase();

      if (lower.includes('confort') || lower.includes('voyage') || lower.includes('etios') || lower.includes('argo') || lower.includes('polo')) {
        reply = 'As exigências do modelo RACE Confort para liberação são: 1) Etios Sedan, Voyage, Prisma, Logan e Cobalt: ano a partir de 2019; 2) Argo e Polo: ano a partir de 2023; 3) Demais modelos (SUVs, CR-V, Sedãs médios): ano a partir de 2018!';
      } else if (lower.includes('taxa') || lower.includes('mensalidade') || lower.includes('comissão') || lower.includes('85%') || lower.includes('15%') || lower.includes('ganho')) {
        reply = 'Você fica com 85% de cada corrida, Race fica com 15% - sem mensalidade, sem taxa para trabalhar! Os repasses são feitos toda sexta-feira diretamente na sua chave PIX.';
      } else if (lower.includes('km') || lower.includes('valor') || lower.includes('tarifa') || lower.includes('preço')) {
        reply = 'Nossas tarifas oficiais são: RACE Econômica a R$ 2,50/km, RACE Confort a R$ 3,50/km, Motoboy Passageiro a R$ 1,80/km e Motoboy Entrega Flash a R$ 2,00/km.';
      } else if (lower.includes('emergência') || lower.includes('sos') || lower.includes('segurança')) {
        reply = 'Para ocorrências imediatas, o botão SOS fica no topo da tela 24 horas por dia. Nossa central tem telemetria GPS e contata as autoridades e suporte presencial em segundos.';
      } else if (lower.includes('cadastro') || lower.includes('motoboy') || lower.includes('moto')) {
        reply = 'Para cadastrar moto ou carro, acesse a aba "Condutor" no rodapé e clique em "Novo Cadastro". A validação da CNH com EAR e do veículo é feita com auditoria rápida.';
      } else {
        reply = `Obrigado pelo contato! Um especialista do Suporte 24h RACE analisou sua mensagem ("${text}"). Todos os seus dados e corridas estão seguros e com telemetria ativa.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          sender: 'support',
          text: reply,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white border border-slate-300 max-w-xl w-full rounded-3xl shadow-2xl flex flex-col h-[640px] max-h-[92vh] overflow-hidden">
        {/* Header in White */}
        <div className="bg-white p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow border border-amber-400">
                <Headphones className="w-6 h-6" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white radar-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-black text-slate-950 text-lg sm:text-xl">
                  Suporte Técnico RACE 24h
                </h3>
                <span className="text-xs bg-emerald-50 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full font-mono border border-emerald-200">
                  ONLINE
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-medium">
                Atendimento 24 horas por dia para motoristas, motoboys e passageiros
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-base font-black cursor-pointer transition-all border border-slate-300"
          >
            ✕
          </button>
        </div>

        {/* Quick Question Buttons */}
        <div className="bg-slate-50 p-3 border-b border-slate-200 flex gap-2.5 overflow-x-auto scrollbar-none">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(q)}
              className="shrink-0 bg-white hover:bg-amber-50 border border-slate-300 hover:border-amber-400 text-slate-800 hover:text-amber-900 text-xs sm:text-sm font-semibold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-sm"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat message stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-3.5 bg-slate-50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${
                m.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-sm sm:text-base leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-amber-500 text-slate-950 font-bold rounded-br-none shadow-md'
                    : 'bg-white border border-slate-200 text-slate-900 font-medium rounded-bl-none shadow-sm'
                }`}
              >
                {m.text}
              </div>
              <span className="text-xs text-slate-500 px-2 mt-1 font-medium">{m.time}</span>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-sm text-amber-900 bg-amber-50 w-fit px-4 py-2 rounded-full border border-amber-300 animate-pulse font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce delay-100" />
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce delay-200" />
              <span className="text-xs sm:text-sm ml-1 font-bold">Atendente RACE 24h digitando...</span>
            </div>
          )}
        </div>

        {/* Emergency Voice hotline */}
        <div className="bg-white px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs sm:text-sm text-slate-700 font-medium">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-emerald-600" />
            <span>Plantão Telefônico Emergencial 24h:</span>
          </div>
          <span className="font-mono text-emerald-700 font-black text-sm sm:text-base">0800 722 3000</span>
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite sua dúvida ou relato..."
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm sm:text-base text-slate-950 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-medium"
          />
          <button
            onClick={() => handleSend()}
            className="w-12 h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition-all cursor-pointer shadow active:scale-95 border border-amber-400 shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
