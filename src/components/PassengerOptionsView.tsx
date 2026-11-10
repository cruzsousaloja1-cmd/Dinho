import React from 'react';
import { VehicleCategory } from '../types';
import { 
  Car, 
  Sparkles, 
  Bike, 
  PackageCheck, 
  Check, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  Navigation 
} from 'lucide-react';

interface PassengerOptionsViewProps {
  selectedCategory?: VehicleCategory;
  onSelectCategory: (category: VehicleCategory) => void;
  onNavigateToRides: () => void;
}

export const PassengerOptionsView: React.FC<PassengerOptionsViewProps> = ({
  selectedCategory = 'economica',
  onSelectCategory,
  onNavigateToRides,
}) => {
  const options = [
    {
      id: 'economica' as VehicleCategory,
      name: 'Motorista Econômico',
      badge: 'Mais Popular',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: Car,
      iconBg: 'bg-amber-100 text-[#ff6a00] border-amber-300',
      headline: 'Viagens diárias com máxima economia e conforto',
      features: [
        'Veículos compactos e sedãs de 4 portas com ar-condicionado',
        'Capacidade para até 4 passageiros',
        'Motoristas locais avaliados de Indaiatuba',
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
      headline: 'Veículos mais novos, espaçosos e motoristas top de avaliação',
      features: [
        'Sedãs e SUVs selecionados com porta-malas amplo',
        'Mais espaço interno para pernas e bagagens',
        'Motoristas com nota máxima de atendimento',
        'Temperatura personalizada ao seu gosto',
      ],
    },
    {
      id: 'moto_passageiro' as VehicleCategory,
      name: 'Motoboy Passageiro',
      badge: 'Mais Rápido',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      icon: Bike,
      iconBg: 'bg-blue-100 text-blue-700 border-blue-300',
      headline: 'Deslocamento ágil para escapar do trânsito',
      features: [
        'Trajeto veloz e direto em horários de pico',
        'Capacete higienizado fornecido para você',
        'Condutores experientes e habilitados',
        'Ideal para compromissos rápidos e individuais',
      ],
    },
    {
      id: 'moto_entrega' as VehicleCategory,
      name: 'Motoboy Entregas',
      badge: 'Flash Encomendas',
      badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: PackageCheck,
      iconBg: 'bg-amber-100 text-amber-700 border-amber-300',
      headline: 'Envio expresso de encomendas, compras e documentos',
      features: [
        'Coleta e entrega expressa porta a porta',
        'Código de segurança de entrega de 4 dígitos',
        'Baú seguro para pacotes de até 20 kg',
        'Rastreamento ao vivo no mapa de Indaiatuba',
      ],
    },
  ];

  const handleChoose = (category: VehicleCategory) => {
    onSelectCategory(category);
    onNavigateToRides();
  };

  return (
    <div className="space-y-5 animate-fade-in pb-8">
      {/* Header em Card Branco Limpo */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#ff6a00] flex items-center justify-center font-bold border border-orange-200 shadow-xs shrink-0">
            <Car className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading font-black text-slate-950 text-xl sm:text-2xl">
              Opções de Viagem RACE
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              Escolha a categoria ideal para seu deslocamento ou entrega em Indaiatuba
            </p>
          </div>
        </div>
      </div>

      {/* Grid com as 4 Categorias */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((item) => {
          const Icon = item.icon;
          const isSelected = selectedCategory === item.id;

          return (
            <div
              key={item.id}
              className={`bg-white border-2 rounded-3xl p-5 sm:p-6 shadow-md transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-[#ff6a00] ring-4 ring-[#ff6a00]/15'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="space-y-3.5">
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${item.iconBg}`}>
                      <Icon className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg">
                        {item.name}
                      </h3>
                      <span className={`text-[10px] sm:text-xs font-mono font-bold px-2 py-0.5 rounded-full border inline-block ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                  {item.headline}
                </p>

                {/* Lista de Vantagens */}
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                  {item.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botão de Ação */}
              <div className="pt-5 mt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleChoose(item.id)}
                  className="w-full py-3.5 px-4 bg-[#ff6a00] hover:bg-[#e05e00] active:scale-95 text-white font-heading font-black text-xs sm:text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 border border-[#ff8533] uppercase tracking-wider"
                >
                  <span>Pedir nesta Categoria</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Banner de Garantia e Segurança do Passageiro */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 sm:p-5 flex items-center gap-3.5 text-xs text-emerald-950 font-medium shadow-xs">
        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <strong className="block text-emerald-950 font-heading font-black text-sm">
            Segurança em 100% das Corridas RACE
          </strong>
          <span>
            Todos os motoristas e motoboys passam por verificação de CNH, documentação do veículo e auditoria de antecedentes antes de rodar.
          </span>
        </div>
      </div>
    </div>
  );
};
