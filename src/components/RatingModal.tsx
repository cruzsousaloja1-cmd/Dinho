import React, { useState } from 'react';
import { Ride } from '../types';
import { Star, CheckCircle2, AlertTriangle, X, Send, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface RatingModalProps {
  isOpen: boolean;
  ride: Ride | null;
  onSubmitRating: (rating: number, comment: string, issueComment?: string) => void;
  onClose: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  ride,
  onSubmitRating,
  onClose,
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('Carro limpo, chegou rápido');
  const [issueComment, setIssueComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Carro limpo', 'Chegou rápido']);

  if (!isOpen || !ride) return null;

  const isMoto =
    ride.category === 'moto_passageiro' ||
    ride.category === 'moto_entrega' ||
    ride.driver?.category === 'moto_passageiro' ||
    ride.driver?.category === 'moto_entrega';

  const driverName = ride.driver?.name || (isMoto ? 'Lucas Souza' : 'José da Cruz');
  const driverVehicle = ride.driver?.vehicleModel
    ? `${ride.driver.vehicleModel} - ${ride.driver.vehiclePlate}`
    : (isMoto ? 'Honda CG 160 Fan - MTO-1A23' : 'Chevrolet Onix - RCE9C40');
  const driverAvatar =
    ride.driver?.avatar ||
    (isMoto
      ? 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=150&auto=format&fit=crop&q=80'
      : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80');

  const quickTags = isMoto
    ? ['Chegou rápido', 'Capacete limpo', 'Direção segura', 'Educado', 'Pontual']
    : ['Carro limpo', 'Chegou rápido', 'Ar gelado', 'Direção segura', 'Educado', 'Pontual'];

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag];
      if (next.length > 0) {
        setComment(next.join(', '));
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullComment = comment.trim() || selectedTags.join(', ') || 'Excelente corrida!';
    onSubmitRating(rating, fullComment, rating <= 2 ? issueComment.trim() : undefined);

    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    onClose();
  };

  const getRatingLabel = (val: number) => {
    switch (val) {
      case 5:
        return 'Excelente! ⭐⭐⭐⭐⭐';
      case 4:
        return 'Muito Bom! ⭐⭐⭐⭐';
      case 3:
        return 'Bom ⭐⭐⭐';
      case 2:
        return 'Ruim ⭐⭐';
      case 1:
        return 'Muito Ruim ⭐';
      default:
        return 'Selecione as estrelas';
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white border-2 border-[#ff6a00] rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative my-8 space-y-5 animate-scale-up">
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header com badge de Viagem Concluída */}
        <div className="text-center space-y-1">
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-mono font-black px-3 py-1 rounded-full border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            VIAGEM FINALIZADA • VOCÊ CHEGOU AO DESTINO
          </span>
          <h3 className="text-2xl font-heading font-black text-slate-950">
            {isMoto ? 'Avalie seu motoboy' : 'Avalie seu motorista'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600">
            Sua nota avalia o condutor e ajuda a manter a segurança e a qualidade do RACE em Indaiatuba.
          </p>
        </div>

        {/* Card do Motorista / Veículo */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="relative shrink-0">
            <img
              src={driverAvatar}
              alt={driverName}
              className="w-16 h-16 rounded-full object-cover border-3 border-[#ff6a00] shadow-md"
            />
            <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full border border-black shadow">
              ★ 5.0
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-mono text-[#ff6a00] font-black uppercase tracking-wider block">
              {isMoto ? 'Motoboy Oficial RACE' : 'Motorista Oficial RACE'}
            </span>
            <h4 className="font-heading font-black text-slate-950 text-lg leading-tight truncate">
              {driverName}
            </h4>
            <p className="text-xs text-slate-700 font-mono font-bold truncate mt-0.5">
              {driverVehicle}
            </p>
          </div>
        </div>

        {/* 5 Estrelas Clicáveis (1 a 5) */}
        <div className="text-center space-y-2 py-1">
          <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider block">
            Clique para avaliar:
          </span>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = hoverRating ? star <= hoverRating : star <= rating;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 cursor-pointer transition-transform hover:scale-125 active:scale-95 focus:outline-none"
                  title={`${star} estrela${star > 1 ? 's' : ''}`}
                >
                  <Star
                    className={`w-9 h-9 sm:w-11 sm:h-11 transition-colors ${
                      active
                        ? 'fill-amber-400 text-amber-500 drop-shadow-md'
                        : 'text-slate-300 hover:text-amber-200'
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <div className="text-sm font-heading font-black text-[#ff6a00]">
            {getRatingLabel(hoverRating || rating)}
          </div>
        </div>

        {/* Tags de elogios rápidos */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-700 block">
            Destaques da viagem:
          </span>
          <div className="flex flex-wrap gap-2">
            {quickTags.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer font-bold ${
                    isSelected
                      ? 'bg-amber-100 border-[#ff6a00] text-amber-950 shadow-xs'
                      : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {isSelected ? `✓ ${tag}` : tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Campo de Comentário */}
        <div className="space-y-1.5">
          <label className="text-xs font-heading font-bold text-slate-800 block">
            Como foi sua corrida com {driverName}?
          </label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ex: Carro limpo, chegou rápido"
            className="w-full bg-slate-50 border-2 border-slate-300 focus:border-[#ff6a00] rounded-2xl p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none font-medium transition-colors"
          />
        </div>

        {/* Se avaliação for 1 ou 2 estrelas: Abrir campo "O que deu errado?" para o admin */}
        {rating <= 2 && (
          <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-4 space-y-2 animate-fade-in shadow-inner">
            <div className="flex items-center gap-2 text-rose-800 font-heading font-black text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>O que deu errado? (Relatório para a Administração)</span>
            </div>
            <p className="text-xs text-rose-700 font-medium">
              A administração do RACE irá analisar seu relato para tomar medidas com o condutor.
            </p>
            <textarea
              rows={2}
              value={issueComment}
              onChange={(e) => setIssueComment(e.target.value)}
              placeholder="Descreva o problema ocorrido na corrida (ex: atraso excessivo, postura, etc.)..."
              className="w-full bg-white border border-rose-300 focus:border-rose-500 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>
        )}

        {/* Botão Enviar Avaliação */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-95 text-white font-heading font-black py-4 px-4 rounded-2xl shadow-xl transition-all cursor-pointer border border-[#ff8533] flex items-center justify-center gap-2 text-base uppercase tracking-wider"
          >
            <Send className="w-5 h-5" />
            <span>Enviar avaliação</span>
          </button>
        </div>
      </div>
    </div>
  );
};
