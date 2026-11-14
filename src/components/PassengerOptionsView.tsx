import React from 'react';
import { LocationPoint, VehicleCategory } from '../types';
import { calculateFare, formatBRL } from '../services/pricingService';
import { calculateDistanceKm } from '../services/addressSearchService';
import {
  Car,
  Sparkles,
  Bike,
  PackageCheck,
  Check,
  ArrowRight,
  ShieldCheck,
  QrCode,
  CreditCard,
  Wallet,
  MapPin,
} from 'lucide-react';

export type PassengerPaymentOption = 'pix' | 'credit_card' | 'dinheiro';

interface PassengerOptionsViewProps {
  selectedCategory?: VehicleCategory;
  onSelectCategory: (category: VehicleCategory) => void;
  selectedPaymentMethod?: PassengerPaymentOption;
  onSelectPaymentMethod?: (method: PassengerPaymentOption) => void;
  pickup?: LocationPoint | null;
  destination?: LocationPoint | null;
  onNavigateToRides: (chosenCategory?: VehicleCategory) => void;
}

export const PassengerOptionsView: React.FC<PassengerOptionsViewProps> = ({
  selectedCategory = 'economica',
  onSelectCategory,
  selectedPaymentMethod = 'pix',
  onSelectPaymentMethod,
  pickup,
  destination,
  onNavigateToRides,
}) => {
  const distanceKm =
    pickup && destination
      ? Number(calculateDistanceKm(pickup.lat, pickup.lng, destination.lat, destination.lng).toFixed(1)) || 1.2
      : 1.2;

  const options = [
    {
      id: 'economica' as VehicleCategory,
      name: 'Motorista Econômico',
      badge: 'Mais Popular',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: Car,
      iconBg: 'bg-amber-100 text-[#ff6a00] border-amber-300',
      priceColor: 'text-amber-600',
      headline: 'Viagens diárias com máxima economia e ar-condicionado',
      features: [
        'Carros de 4 portas com ar-condicionado (até 4 passageiros)',
        'Motoristas locais verificados em Indaiatuba',
        'Chegada rápida em poucos minutos',
      ],
    },
    {
      id: 'confort' as VehicleCategory,
      name: 'Motorista Confort',
      badge: 'Espaço & Conforto',
      badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
      icon: Sparkles,
      iconBg: 'bg-purple-100 text-purple-700 border-purple-300',
      priceColor: 'text-purple-800',
      headline: 'Sedãs e SUVs 2020+ com máximo conforto e porta-malas amplo',
      features: [
        'Automóveis 2020+ selecionados com mais espaço interno',
        'Motoristas com excelente avaliação de atendimento',
        'Ideal para viagens tranquilas ou com bagagens',
      ],
    },
    {
      id: 'moto_passageiro' as VehicleCategory,
      name: 'Motoboy Passageiro',
      badge: 'Mais Rápido',
      badgeColor: 'bg-cyan-100 text-cyan-900 border-cyan-300',
      icon: Bike,
      iconBg: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      priceColor: 'text-cyan-800',
      headline: 'Deslocamento ágil para chegar rápido sem trânsito',
      features: [
        'Trajeto direto e econômico em horários de pico',
        'Capacete higienizado fornecido pelo condutor',
        'Condutores habilitados e experientes em Indaiatuba',
      ],
    },
    {
      id: 'moto_entrega' as VehicleCategory,
      name: 'Motoboy Entregas',
      badge: 'Flash Encomendas',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: PackageCheck,
      iconBg: 'bg-amber-100 text-amber-700 border-amber-300',
      priceColor: 'text-amber-700',
      headline: 'Envio expresso de encomendas, compras e documentos',
      features: [
        'Coleta e entrega rápida porta a porta',
        'Código de confirmação de entrega de 4 dígitos',
        'Baú seguro para pacotes de até 20 kg',
      ],
    },
  ];

  const paymentMethods: {
    id: PassengerPaymentOption;
    label: string;
    subtitle: string;
    icon: typeof QrCode;
    activeClass: string;
  }[] = [
    {
      id: 'pix',
      label: 'PIX no app (Asaas)',
      subtitle: 'Confirmação automática em segundos via QR Code',
      icon: QrCode,
      activeClass: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200 text-emerald-950',
    },
    {
      id: 'credit_card',
      label: 'Cartão no app (Asaas)',
      subtitle: 'Crédito com validação instantânea no aplicativo',
      icon: CreditCard,
      activeClass: 'border-[#ff6a00] bg-orange-50 ring-2 ring-orange-200 text-slate-950',
    },
    {
      id: 'dinheiro',
      label: 'Dinheiro',
      subtitle: 'Pague diretamente ao motorista/motoboy ao final',
      icon: Wallet,
      activeClass: 'border-amber-500 bg-amber-50 ring-2 ring-amber-200 text-amber-950',
    },
  ];

  const handleChooseCategoryAndContinue = (category: VehicleCategory) => {
    onSelectCategory(category);
    onNavigateToRides(category);
  };

  return (
    <div className="space-y-5 animate-fade-in pb-8 w-full max-w-full min-w-0 box-border">
      {/* Header em Card Branco Limpo (1 coluna no celular) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-md space-y-3 min-w-0 w-full box-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#ff6a00] flex items-center justify-center font-bold border border-orange-200 shadow-xs shrink-0">
              <Car className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="font-heading font-black text-slate-950 text-xl sm:text-2xl leading-tight">
                Opções de Corrida RACE
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                Escolha a modalidade e a forma de pagamento ideal em Indaiatuba
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 self-start sm:self-auto shrink-0">
            Estimativa base: {distanceKm} km
          </span>
        </div>

        {pickup?.address && destination?.address && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-700 space-y-1">
            <div className="flex items-center gap-2 font-bold text-slate-900 truncate">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{pickup.address}</span>
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-900 truncate">
              <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">{destination.address}</span>
            </div>
          </div>
        )}
      </div>

      {/* Escolha da Forma de Pagamento */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-md space-y-3 min-w-0 w-full box-border">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg">
            1. Escolha a forma de pagamento
          </h3>
          <p className="text-xs text-slate-600 font-medium">
            Selecione como deseja pagar sua próxima corrida
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 min-w-0">
          {paymentMethods.map((pm) => {
            const PmIcon = pm.icon;
            const active = selectedPaymentMethod === pm.id;
            return (
              <button
                key={pm.id}
                type="button"
                onClick={() => onSelectPaymentMethod?.(pm.id)}
                className={`w-full text-left p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 min-w-0 ${
                  active
                    ? pm.activeClass
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-800'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
                  <PmIcon className="w-5 h-5 text-slate-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-heading font-black text-sm leading-tight">
                    {pm.label}
                  </div>
                  <div className="text-[11px] text-slate-600 font-medium mt-0.5 leading-snug">
                    {pm.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid com as 4 Categorias e Valores */}
      <div className="space-y-3 min-w-0">
        <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg px-1">
          2. Escolha sua modalidade e valor
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
          {options.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedCategory === item.id;
            const fare = calculateFare(item.id, distanceKm);

            return (
              <div
                key={item.id}
                onClick={() => onSelectCategory(item.id)}
                className={`bg-white border-2 rounded-3xl p-5 shadow-md transition-all flex flex-col justify-between cursor-pointer min-w-0 w-full box-border ${
                  isSelected
                    ? 'border-[#ff6a00] ring-4 ring-[#ff6a00]/15'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3.5 min-w-0">
                  {/* Header do Card em 1 coluna no mobile */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${item.iconBg}`}
                      >
                        <Icon className="w-6 h-6 stroke-[2.5]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg leading-tight">
                          {item.name}
                        </h3>
                        <span
                          className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border inline-block mt-1 ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                      </div>
                    </div>

                    <div className="text-left sm:text-right shrink-0 bg-slate-50 sm:bg-transparent px-3 py-2 sm:p-0 rounded-xl border border-slate-100 sm:border-0">
                      <span className={`font-heading font-black text-2xl sm:text-3xl whitespace-nowrap ${item.priceColor}`}>
                        {formatBRL(fare.totalPrice)}
                      </span>
                      <span className="block text-[11px] font-mono font-bold text-slate-500 uppercase">
                        Valor estimado ({distanceKm} km)
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                    {item.headline}
                  </p>

                  {/* Lista de Vantagens */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    {item.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botão de Ação */}
                <div className="pt-4 mt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChooseCategoryAndContinue(item.id);
                    }}
                    className="w-full py-3.5 px-4 bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.98] text-white font-heading font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#ff8533] uppercase tracking-wider"
                  >
                    <span>
                      Escolher {item.name} ({formatBRL(fare.totalPrice)})
                    </span>
                    <ArrowRight className="w-4 h-4 shrink-0" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Banner de Garantia e Segurança do Passageiro */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 sm:p-5 flex items-center gap-3.5 text-xs text-emerald-950 font-medium shadow-xs">
        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div className="min-w-0">
          <strong className="block text-emerald-950 font-heading font-black text-sm">
            Segurança em 100% das Corridas RACE
          </strong>
          <span>
            Todos os motoristas e motoboys passam por verificação de CNH, documentação do veículo e auditoria antes de rodar.
          </span>
        </div>
      </div>
    </div>
  );
};
