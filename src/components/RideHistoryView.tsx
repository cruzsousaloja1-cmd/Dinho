import React, { useState } from 'react';
import { Ride } from '../types';
import { formatBRL } from '../services/pricingService';
import { 
  History, 
  Search, 
  Filter, 
  Star, 
  Car, 
  Bike, 
  PackageCheck, 
  Receipt
} from 'lucide-react';

interface RideHistoryViewProps {
  rides: Ride[];
  onOpenRideDetails?: (ride: Ride) => void;
}

export const RideHistoryView: React.FC<RideHistoryViewProps> = ({
  rides,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

  const filteredRides = rides.filter((ride) => {
    const matchesCategory =
      categoryFilter === 'all' || ride.category === categoryFilter;
    const matchesSearch =
      ride.pickup.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ride.destination.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ride.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ride.driver?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Title & Filter Header in White */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <History className="w-6 h-6 text-amber-600" />
            <h2 className="font-heading font-black text-slate-950 text-xl">
              Histórico de Viagens & Entregas RACE
            </h2>
          </div>
          <span className="text-xs sm:text-sm text-slate-600 font-mono font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            {filteredRides.length} viagens registradas
          </span>
        </div>

        {/* Search & Advanced Filters */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por endereço, motorista ou código da corrida..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-sm sm:text-base text-slate-950 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-5 h-5 text-slate-500 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 font-medium w-full sm:w-auto"
            >
              <option value="all">Todas as Categorias</option>
              <option value="economica">Econômica (R$ 2,50/km)</option>
              <option value="confort">Confort (R$ 3,50/km)</option>
              <option value="moto_passageiro">Moto Passageiro (R$ 1,80/km)</option>
              <option value="moto_entrega">Moto Entrega Flash (R$ 2,00/km)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rides List in White */}
      <div className="space-y-3.5">
        {filteredRides.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 text-sm font-medium shadow-md">
            Nenhuma corrida ainda
          </div>
        ) : (
          filteredRides.map((ride) => {
            const isComfort = ride.category === 'confort';
            const isBike = ride.category.includes('moto');
            const isDelivery = ride.category === 'moto_entrega';

            return (
              <div
                key={ride.id}
                onClick={() => setSelectedRide(ride)}
                className="bg-white border border-slate-200 hover:border-amber-400 rounded-3xl p-5 shadow-md transition-all cursor-pointer space-y-3.5"
              >
                {/* Header line of card */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isDelivery
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : isBike
                          ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                          : isComfort
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {isDelivery ? (
                        <PackageCheck className="w-6 h-6" />
                      ) : isBike ? (
                        <Bike className="w-6 h-6" />
                      ) : (
                        <Car className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-black text-slate-950 text-base sm:text-lg">
                          {ride.category === 'confort'
                            ? 'RACE Confort'
                            : ride.category === 'economica'
                            ? 'RACE Econômica'
                            : ride.category === 'moto_entrega'
                            ? 'RACE Flash Entrega'
                            : 'RACE Moto'}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          #{ride.id}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm text-slate-500 font-medium">
                        {new Date(ride.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-heading font-black text-slate-950 text-lg sm:text-xl">
                      {formatBRL(ride.price)}
                    </span>
                    <span className="text-xs text-emerald-700 block font-bold">
                      {ride.paymentMethod === 'money' || ride.paymentMethod === 'dinheiro'
                        ? 'Dinheiro (direto ao condutor)'
                        : `Pago via ${ride.paymentMethod === 'pix' ? 'PIX' : 'Cartão'}`}
                    </span>
                  </div>
                </div>

                {/* Route */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-sm">
                  <div className="flex items-center gap-2.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span className="text-slate-900 truncate">{ride.pickup.address}</span>
                  </div>
                  <div className="flex items-center gap-2.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                    <span className="text-slate-900 truncate">{ride.destination.address}</span>
                  </div>
                </div>

                {/* Driver Info & Rating */}
                {ride.driver && (
                  <div className="flex items-center justify-between text-xs sm:text-sm pt-2 border-t border-slate-200 font-medium">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={ride.driver.avatar}
                        alt={ride.driver.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <span className="text-slate-800 font-bold">{ride.driver.name}</span>
                      <span className="text-xs font-mono text-slate-500">
                        ({ride.driver.vehiclePlate})
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-amber-700 font-black">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      <span>{ride.ratingGivenToDriver || 5.0}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Detailed Receipt Modal in White */}
      {selectedRide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-6 h-6 text-amber-600" />
                <h3 className="font-heading font-black text-slate-950 text-lg">
                  Recibo Oficial RACE #{selectedRide.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRide(null)}
                className="text-slate-400 hover:text-slate-800 text-lg font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Receipt calculation breakdown */}
            <div className="space-y-2.5 text-sm bg-slate-50 p-5 rounded-2xl border border-slate-200 font-mono font-medium">
              <div className="flex justify-between text-slate-600">
                <span>Distância percorrida</span>
                <span className="text-slate-950 font-bold">{selectedRide.distanceKm} km</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Tarifa por km</span>
                <span className="text-slate-950 font-bold">
                  {selectedRide.category === 'confort'
                    ? 'R$ 3,50'
                    : selectedRide.category === 'economica'
                    ? 'R$ 2,50'
                    : selectedRide.category === 'moto_entrega'
                    ? 'R$ 2,00'
                    : 'R$ 1,80'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Comissão Race (15%)</span>
                <span className="text-amber-700 font-bold">{formatBRL(selectedRide.platformFee || Number((selectedRide.price * 0.15).toFixed(2)))}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Repasse ao Condutor (85%)</span>
                <span className="text-emerald-700 font-bold">{formatBRL(selectedRide.driverEarnings || Number((selectedRide.price * 0.85).toFixed(2)))}</span>
              </div>
              <div className="border-t border-slate-200 pt-2.5 flex justify-between text-base font-black text-slate-950">
                <span>TOTAL PAGO</span>
                <span className="text-amber-800">{formatBRL(selectedRide.price)}</span>
              </div>
            </div>

            {/* Rating and comments */}
            {selectedRide.ratingComment && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm">
                <div className="flex items-center gap-1.5 text-amber-700 font-black mb-1">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>Avaliação: {selectedRide.ratingGivenToDriver} estrelas</span>
                </div>
                <p className="text-slate-800 italic font-medium">"{selectedRide.ratingComment}"</p>
              </div>
            )}

            <button
              onClick={() => setSelectedRide(null)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-black py-3.5 rounded-xl text-sm transition-all cursor-pointer shadow border border-amber-400"
            >
              Fechar Recibo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
