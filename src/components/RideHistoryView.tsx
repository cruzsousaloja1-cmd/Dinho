import React, { useMemo, useState } from 'react';
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
  Receipt,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface RideHistoryViewProps {
  rides: Ride[];
  activeRide?: Ride | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  onOpenRideDetails?: (ride: Ride) => void;
}

const isRideInProgress = (status?: string) => {
  const st = String(status || '').toLowerCase().trim();
  return (
    st === 'procurando' ||
    st === 'procurando_motorista' ||
    st === 'searching' ||
    st === 'accepted' ||
    st === 'aceita' ||
    st === 'em_andamento' ||
    st === 'driver_assigned' ||
    st === 'driver_arriving' ||
    st === 'in_progress'
  );
};

const isRideCompleted = (status?: string) => {
  const st = String(status || '').toLowerCase().trim();
  return st === 'completed' || st === 'finalizada';
};

const isRideCancelled = (status?: string) => {
  const st = String(status || '').toLowerCase().trim();
  return st === 'cancelled' || st === 'cancelada';
};

export const RideHistoryView: React.FC<RideHistoryViewProps> = ({
  rides,
  activeRide,
  isLoading = false,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

  const allRides = useMemo(() => {
    const list: Ride[] = [];
    const seenKeys = new Set<string>();

    const pushUnique = (r: Ride) => {
      const key = r.id
        ? `id:${r.id}`
        : r.confirmationCode
        ? `code:${r.confirmationCode}`
        : `dt:${r.createdAt}:${r.pickup?.address}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        list.push(r);
      }
    };

    if (activeRide) {
      pushUnique(activeRide);
    }
    rides.forEach(pushUnique);

    return list;
  }, [rides, activeRide]);

  const inProgressCount = useMemo(
    () => allRides.filter((r) => isRideInProgress(r.status)).length,
    [allRides]
  );
  const completedCount = useMemo(
    () => allRides.filter((r) => isRideCompleted(r.status)).length,
    [allRides]
  );

  const filteredRides = allRides.filter((ride) => {
    const matchesCategory = categoryFilter === 'all' || ride.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'in_progress' && isRideInProgress(ride.status)) ||
      (statusFilter === 'completed' && isRideCompleted(ride.status));

    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      (ride.pickup?.address || '').toLowerCase().includes(q) ||
      (ride.destination?.address || '').toLowerCase().includes(q) ||
      String(ride.id || '').toLowerCase().includes(q) ||
      (ride.driver?.name || '').toLowerCase().includes(q);

    return matchesCategory && matchesStatus && matchesSearch;
  });

  const renderStatusBadge = (status?: string) => {
    const st = String(status || '').toLowerCase().trim();
    if (st === 'procurando' || st === 'procurando_motorista' || st === 'searching') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
          <Clock className="w-3 h-3 shrink-0" />
          <span>Procurando motorista</span>
        </span>
      );
    }
    if (isRideInProgress(st)) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full bg-orange-100 text-[#ff6a00] border border-orange-300">
          <Clock className="w-3 h-3 shrink-0" />
          <span>Em andamento</span>
        </span>
      );
    }
    if (isRideCancelled(st)) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
          <XCircle className="w-3 h-3 shrink-0" />
          <span>Cancelada</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
        <CheckCircle2 className="w-3 h-3 shrink-0" />
        <span>Finalizada</span>
      </span>
    );
  };

  return (
    <div className="space-y-5 w-full max-w-full min-w-0 box-border pb-6">
      {/* Title & Filter Header in White */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-6 shadow-md space-y-4 min-w-0 w-full box-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <History className="w-6 h-6 text-[#ff6a00] shrink-0" />
            <h2 className="font-heading font-black text-slate-950 text-lg sm:text-xl leading-tight">
              Atividade e Histórico RACE
            </h2>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="text-xs sm:text-sm text-slate-600 font-mono font-bold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              {filteredRides.length} corridas
            </span>
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="inline-flex items-center gap-1.5 text-xs font-heading font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-full border border-slate-300 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs (Em andamento vs Finalizadas) */}
        <div className="grid grid-cols-3 gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`py-2.5 px-2 rounded-xl font-heading font-black text-xs transition-all cursor-pointer border text-center ${
              statusFilter === 'all'
                ? 'bg-[#ff6a00] text-white border-[#ff6a00] shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todas ({allRides.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('in_progress')}
            className={`py-2.5 px-2 rounded-xl font-heading font-black text-xs transition-all cursor-pointer border text-center ${
              statusFilter === 'in_progress'
                ? 'bg-[#ff6a00] text-white border-[#ff6a00] shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Em andamento ({inProgressCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`py-2.5 px-2 rounded-xl font-heading font-black text-xs transition-all cursor-pointer border text-center ${
              statusFilter === 'completed'
                ? 'bg-[#ff6a00] text-white border-[#ff6a00] shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Finalizadas ({completedCount})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 min-w-0">
          <div className="relative flex-1 w-full min-w-0">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar endereço, motorista ou código..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-sm sm:text-base text-slate-950 placeholder-slate-400 focus:outline-none focus:border-[#ff6a00] font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
            <Filter className="w-5 h-5 text-slate-500 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-[#ff6a00] font-medium w-full sm:w-auto"
            >
              <option value="all">Todas as Categorias</option>
              <option value="economica">Motorista Econômico</option>
              <option value="confort">Motorista Confort</option>
              <option value="moto_passageiro">Motoboy Passageiro</option>
              <option value="moto_entrega">Motoboy Entregas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rides List in White */}
      <div className="space-y-3.5 min-w-0">
        {isLoading && filteredRides.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 text-sm font-medium shadow-md">
            Carregando suas corridas...
          </div>
        ) : filteredRides.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 text-center space-y-2 shadow-md">
            <p className="text-slate-800 font-heading font-black text-base">
              {statusFilter === 'in_progress'
                ? 'Nenhuma corrida em andamento no momento'
                : statusFilter === 'completed'
                ? 'Nenhuma corrida finalizada ainda'
                : 'Nenhuma corrida registrada ainda'}
            </p>
            <p className="text-slate-500 text-xs sm:text-sm font-medium">
              Suas corridas em andamento, finalizadas, valores pagos e avaliações aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
          filteredRides.map((ride) => {
            const isComfort = ride.category === 'confort';
            const isBike = ride.category.includes('moto');
            const isDelivery = ride.category === 'moto_entrega';
            const ratingValue = Number(ride.ratingGivenToDriver || 0);
            const hasRating = ratingValue > 0;

            return (
              <div
                key={ride.id || ride.confirmationCode || ride.createdAt}
                onClick={() => setSelectedRide(ride)}
                className="bg-white border border-slate-200 hover:border-[#ff6a00] rounded-3xl p-4 sm:p-5 shadow-md transition-all cursor-pointer space-y-3.5 min-w-0 w-full box-border"
              >
                {/* Header line of card */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isDelivery
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : isBike
                          ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                          : isComfort
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-orange-100 text-[#ff6a00] border border-orange-200'
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
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading font-black text-slate-950 text-base sm:text-lg leading-tight">
                          {ride.category === 'confort'
                            ? 'Motorista Confort'
                            : ride.category === 'economica'
                            ? 'Motorista Econômico'
                            : ride.category === 'moto_entrega'
                            ? 'Motoboy Entregas'
                            : 'Motoboy Passageiro'}
                        </span>
                        {ride.id && (
                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            #{ride.id}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {renderStatusBadge(ride.status)}
                        <span className="text-xs text-slate-500 font-medium">
                          {new Date(ride.createdAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="font-heading font-black text-slate-950 text-lg sm:text-xl">
                      {formatBRL(ride.price)}
                    </span>
                    <span className="text-xs text-emerald-700 block font-bold">
                      {ride.paymentMethod === 'money' || ride.paymentMethod === 'dinheiro'
                        ? 'Dinheiro (ao condutor)'
                        : `Pago via ${ride.paymentMethod === 'pix' ? 'PIX' : 'Cartão'}`}
                    </span>
                  </div>
                </div>

                {/* Route */}
                <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-2 text-xs sm:text-sm min-w-0">
                  <div className="flex items-center gap-2.5 font-medium min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                    <span className="text-slate-900 truncate">{ride.pickup?.address || 'Origem não informada'}</span>
                  </div>
                  <div className="flex items-center gap-2.5 font-medium min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-600 shrink-0" />
                    <span className="text-slate-900 truncate">{ride.destination?.address || 'Destino não informado'}</span>
                  </div>
                </div>

                {/* Driver Info & Star Rating */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm pt-2 border-t border-slate-200 font-medium">
                  {ride.driver ? (
                    <div className="flex items-center gap-2.5 min-w-0">
                      {ride.driver.avatar ? (
                        <img
                          src={ride.driver.avatar}
                          alt={ride.driver.name}
                          className="w-7 h-7 rounded-full object-cover shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-heading font-black text-xs shrink-0">
                          {(ride.driver.name || 'M').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-slate-800 font-bold truncate">
                        {ride.driver.name || 'Motorista RACE'}
                      </span>
                      {ride.driver.vehiclePlate && (
                        <span className="text-xs font-mono text-slate-500 shrink-0">
                          ({ride.driver.vehiclePlate})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium">
                      {isRideInProgress(ride.status)
                        ? 'Aguardando motorista aceitar...'
                        : 'Condutor não informado'}
                    </span>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    {hasRating ? (
                      <>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= Math.round(ratingValue)
                                ? 'fill-amber-400 text-amber-500'
                                : 'text-slate-300'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-amber-700 font-black">
                          {ratingValue.toFixed(1)}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">
                        Sem avaliação registrada
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detailed Receipt Modal in White */}
      {selectedRide && (
        <div className="fixed inset-0 z-[1200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-md w-full rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-6 h-6 text-[#ff6a00]" />
                <h3 className="font-heading font-black text-slate-950 text-lg">
                  Recibo RACE #{selectedRide.id || 'Ativa'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRide(null)}
                className="text-slate-400 hover:text-slate-800 text-lg font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase">Status</span>
              {renderStatusBadge(selectedRide.status)}
            </div>

            {/* Receipt calculation breakdown */}
            <div className="space-y-2.5 text-sm bg-slate-50 p-5 rounded-2xl border border-slate-200 font-mono font-medium">
              <div className="flex justify-between text-slate-600">
                <span>Forma de pagamento</span>
                <span className="text-slate-950 font-bold uppercase">
                  {selectedRide.paymentMethod === 'money' || selectedRide.paymentMethod === 'dinheiro'
                    ? 'Dinheiro'
                    : selectedRide.paymentMethod === 'credit_card'
                    ? 'Cartão'
                    : 'PIX'}
                </span>
              </div>
              {selectedRide.driver?.name && (
                <div className="flex justify-between text-slate-600">
                  <span>Condutor</span>
                  <span className="text-slate-950 font-bold">{selectedRide.driver.name}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Comissão Race (15%)</span>
                <span className="text-amber-700 font-bold">
                  {formatBRL(selectedRide.platformFee || Number((selectedRide.price * 0.15).toFixed(2)))}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Repasse ao Condutor (85%)</span>
                <span className="text-emerald-700 font-bold">
                  {formatBRL(selectedRide.driverEarnings || Number((selectedRide.price * 0.85).toFixed(2)))}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2.5 flex justify-between text-base font-black text-slate-950">
                <span>TOTAL PAGO</span>
                <span className="text-[#ff6a00]">{formatBRL(selectedRide.price)}</span>
              </div>
            </div>

            {/* Rating and comments */}
            {Number(selectedRide.ratingGivenToDriver || 0) > 0 && (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-700 font-black">
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                  <span>Avaliação: {selectedRide.ratingGivenToDriver} estrelas</span>
                </div>
                {selectedRide.ratingComment && (
                  <p className="text-slate-800 italic font-medium">"{selectedRide.ratingComment}"</p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedRide(null)}
              className="w-full bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black py-3.5 rounded-xl text-sm transition-all cursor-pointer shadow border border-[#ff8533]"
            >
              Fechar Recibo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
