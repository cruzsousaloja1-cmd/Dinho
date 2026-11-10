import React, { useState } from 'react';
import { AppUser, Driver, Ride } from '../types';
import { formatBRL, WEEKLY_SUBSCRIPTION_PRICE } from '../services/pricingService';
import { WEEKLY_FEE, WEEKLY_FEE_TEXT, WEEKLY_FEE_BADGE, RACE_PIX_BANK } from '../config/pricing';
import { 
  ShieldCheck, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Search, 
  Filter, 
  Download, 
  MapPin, 
  BarChart3, 
  Activity, 
  FileSpreadsheet,
  Share2,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  FileText,
  AlertTriangle,
  Phone,
  Calendar,
  Check,
  Trash2,
  CheckCheck,
  UserCheck,
  UserX,
  X
} from 'lucide-react';

interface AdminDashboardProps {
  drivers: Driver[];
  rides: Ride[];
  onApproveDriver: (driverId: string) => void;
  onToggleDriverStatus: (driverId: string) => void;
  onOpenShare?: () => void;
  onApproveWeeklyPayment?: (driver: Driver) => void;
  onRejectWeeklyPayment?: (driver: Driver) => void;
  passengers?: AppUser[];
  onRemoveDriver?: (driverId: string, email: string) => void;
  onRemovePassenger?: (passengerId: string, email: string) => void;
  onActivateAllDrivers?: () => void;
  onRemoveAllAccounts?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  drivers,
  rides,
  onApproveDriver,
  onToggleDriverStatus,
  onOpenShare,
  onApproveWeeklyPayment,
  onRejectWeeklyPayment,
  passengers = [],
  onRemoveDriver,
  onRemovePassenger,
  onActivateAllDrivers,
  onRemoveAllAccounts,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'drivers' | 'rides' | 'reports'>('overview');
  const [cadastrosSubTab, setCadastrosSubTab] = useState<'drivers' | 'passengers'>('drivers');
  const [driverFilterCategory, setDriverFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewProofImage, setPreviewProofImage] = useState<string | null>(null);

  // Modais de confirmação de remoção
  const [isConfirmRemoveAllModalOpen, setIsConfirmRemoveAllModalOpen] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'driver' | 'passenger';
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  const pendingDrivers = drivers.filter(
    (d) => d.pendingPayment && d.pendingPayment.status === 'pending'
  );

  // Financial calculations
  const activeWeeklySubs = drivers.filter((d) => d.weeklyPlanActive).length;
  const weeklyPlatformRevenue = activeWeeklySubs * WEEKLY_SUBSCRIPTION_PRICE;
  const avgFleetRating = (
    drivers.reduce((acc, d) => acc + d.rating, 0) / (drivers.length || 1)
  ).toFixed(2);

  const filteredDrivers = drivers.filter((d) => {
    const matchesCategory =
      driverFilterCategory === 'all' || d.category === driverFilterCategory;
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehicleModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.email && d.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const filteredPassengers = passengers.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.name || '').toLowerCase().includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    );
  });

  const exportReportCSV = () => {
    const rows = [
      ['ID', 'Nome', 'Categoria', 'Placa', 'Avaliação', `Status Plano Semanal (${WEEKLY_FEE_BADGE})`, 'Ganhos Semanais'],
      ...drivers.map((d) => [
        d.id,
        d.name,
        d.category,
        d.vehiclePlate,
        d.rating.toString(),
        d.weeklyPlanActive ? 'ATIVO' : 'PENDENTE',
        d.earningsWeek.toString(),
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RACE_relatorio_operacoes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Admin Title & Live Status in White Theme */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold border border-amber-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="font-heading font-black text-slate-950 text-xl sm:text-2xl">
              Painel Administrativo RACE Master
            </h2>
          </div>
          <p className="text-sm text-slate-600 mt-1 font-medium">
            Monitoramento de frota em tempo real, auditoria de segurança e análise de dados
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenShare && (
            <button
              onClick={onOpenShare}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-bold rounded-xl border border-emerald-300 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Share2 className="w-4 h-4 text-emerald-700" />
              <span>Compartilhar App</span>
            </button>
          )}
          <button
            onClick={exportReportCSV}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs sm:text-sm font-bold rounded-xl border border-slate-300 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Download className="w-4 h-4 text-slate-800" />
            <span>Exportar CSV</span>
          </button>
          <span className="text-xs sm:text-sm bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-2 rounded-xl font-mono font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 radar-pulse" />
            Servidores 100% OK
          </span>
        </div>
      </div>

      {/* Informações Bancárias PIX Oficial R$ 200 */}
      <div className="bg-slate-950 text-white rounded-2xl p-3.5 sm:p-4 border border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#ff6a00]/20 border border-[#ff6a00]/40 text-[#ff6a00] flex items-center justify-center font-bold shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <span className="font-heading font-black text-sm text-white block">
              Recebimento Oficial PIX &bull; Taxa R$ 200 / semana
            </span>
            <span className="text-zinc-400 font-mono text-[11px]">
              Chave PIX: <strong className="text-[#ff6a00] font-mono select-all">9d9e5635-9e68-46bf-bffe-08bdae29c8ba</strong> &bull; Banco Nubank
            </span>
          </div>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full font-mono text-xs font-bold">
            100% Repasse Livre aos Condutores
          </span>
        </div>
      </div>

      {/* Admin Subtabs in White */}
      <div className="bg-white border border-slate-200 p-2 rounded-2xl flex items-center gap-2 shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Visão Geral & Métricas
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'payments'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Wallet className="w-4 h-4 text-emerald-700" />
          <span>Pagamentos Pendentes ({pendingDrivers.length})</span>
          {pendingDrivers.length > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'drivers'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users className="w-4 h-4 text-amber-900" />
          <span>Gestão de Cadastros ({drivers.length + passengers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('rides')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'rides'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Monitor de Corridas
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'reports'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Relatórios & Performance
        </button>
      </div>

      {/* TAB 1: OVERVIEW & KEY PERFORMANCE INDICATORS */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Alerta de Pagamentos Pendentes no Overview se houver */}
          {pendingDrivers.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-amber-950 text-base sm:text-lg">
                    {pendingDrivers.length} {pendingDrivers.length === 1 ? 'Comprovante PIX Pendente' : 'Comprovantes PIX Pendentes'}
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-800 font-medium">
                    Condutores aguardando conferência bancária ({RACE_PIX_BANK}) para liberação de 7 dias com 100% dos ganhos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('payments')}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-heading font-black text-xs sm:text-sm rounded-xl transition-all cursor-pointer shadow-sm shrink-0 flex items-center justify-center gap-2"
              >
                <span>Auditar Comprovantes Agora</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}
          {/* Key KPI Cards in White */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* KPI 1 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs sm:text-sm text-slate-600 font-bold">Receita Semanal ({WEEKLY_FEE_BADGE})</span>
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-heading font-black text-amber-700">
                {formatBRL(weeklyPlatformRevenue)}
              </div>
              <p className="text-xs sm:text-sm text-emerald-700 mt-1 font-bold">
                {activeWeeklySubs} assinaturas ativas
              </p>
            </div>

            {/* KPI 2 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs sm:text-sm text-slate-600 font-bold">Repasse aos Condutores</span>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-heading font-black text-emerald-700">
                100%
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                Zero comissão descontada
              </p>
            </div>

            {/* KPI 3 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs sm:text-sm text-slate-600 font-bold">Frota Cadastrada</span>
                <Users className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-heading font-black text-slate-950">
                {drivers.length} ativos
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                Carros e Motoboys credenciados
              </p>
            </div>

            {/* KPI 4 */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-md">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs sm:text-sm text-slate-600 font-bold">Índice de Segurança</span>
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              </div>
              <div className="text-2xl sm:text-3xl font-heading font-black text-amber-700">
                ⭐ {avgFleetRating}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 font-medium">
                Auditoria CNH & Antecedentes
              </p>
            </div>
          </div>

          {/* Painel Direto: Motoristas Cadastrados & Status PIX R$ 200 */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-600" />
                  <span>Motoristas Cadastrados & Pagamento PIX R$ 200</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Chave PIX Nubank: <strong className="text-amber-700 font-mono">9d9e5635-9e68-46bf-bffe-08bdae29c8ba</strong> &bull; Libere 7 dias ou Bloqueie com um clique
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('drivers')}
                className="text-xs font-heading font-black text-amber-700 hover:text-amber-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span>Ver Todos os {drivers.length}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {drivers.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Nenhum motorista ou motoboy cadastrado no momento.
              </div>
            ) : (
              <div className="space-y-3">
                {drivers.map((driver) => {
                  const hasPaid = driver.weeklyPlanActive && driver.status === 'online';
                  return (
                    <div
                      key={driver.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={driver.avatar}
                          alt={driver.name}
                          className="w-11 h-11 rounded-full object-cover border-2 border-amber-500 shadow-xs"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-heading font-black text-slate-950 text-sm sm:text-base">
                              {driver.name}
                            </h4>
                            <span className="text-[11px] font-mono bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-300 font-bold uppercase">
                              {driver.vehiclePlate}
                            </span>
                            <span className="text-[11px] font-bold text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded uppercase">
                              {driver.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {driver.vehicleModel} &bull; {driver.email} &bull; {driver.phone}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                        <div className="text-left sm:text-right">
                          <span
                            className={`text-xs font-heading font-black px-2.5 py-1 rounded-full border inline-block ${
                              hasPaid
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            {hasPaid ? '✓ PIX R$ 200 Pago (Ativo)' : '⚠️ PIX R$ 200 Pendente'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onApproveWeeklyPayment && onApproveWeeklyPayment(driver)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                            title="Liberar 7 dias e ativar condutor"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Liberar 7 dias</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (onRejectWeeklyPayment) {
                                onRejectWeeklyPayment(driver);
                              } else {
                                onToggleDriverStatus(driver.id);
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-heading font-black text-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                            title="Bloquear condutor"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Bloquear</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PAGAMENTOS PENDENTES (AUDITORIA PIX MANUAL) */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold border border-amber-300">
                  <Wallet className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-slate-950 text-xl">
                    Auditoria de Pagamentos Semanais via PIX
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Conta: {RACE_PIX_BANK} &bull; Valor padrão: {WEEKLY_FEE_TEXT}
                  </span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
                Confira o extrato bancário do Nubank. Ao aprovar, o motorista é liberado imediatamente por 7 dias com status online e 100% de repasse.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
                {pendingDrivers.length} {pendingDrivers.length === 1 ? 'pendente' : 'pendentes'}
              </span>
            </div>
          </div>

          {/* Lista de Pagamentos Pendentes */}
          {pendingDrivers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-heading font-black text-slate-900 text-lg">
                Nenhum Pagamento Pendente de Auditoria
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto font-medium">
                Todos os comprovantes PIX enviados pelos motoristas foram auditados. Novos comprovantes aparecerão aqui assim que enviados pelo condutor.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {pendingDrivers.map((driver) => {
                const pending = driver.pendingPayment!;
                const formattedDate = pending.sentAt
                  ? new Date(pending.sentAt).toLocaleString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recentemente';

                return (
                  <div
                    key={driver.id}
                    className="bg-white border-2 border-amber-300 rounded-3xl p-5 sm:p-6 shadow-md hover:shadow-lg transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                      {/* Motorista info */}
                      <div className="flex items-center gap-3.5">
                        <img
                          src={driver.avatar}
                          alt={driver.name}
                          className="w-13 h-13 rounded-2xl object-cover border-2 border-amber-400 shadow-xs"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-heading font-black text-slate-950 text-base sm:text-lg">
                              {driver.name}
                            </h4>
                            <span className="text-[11px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200 uppercase">
                              {driver.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium mt-0.5 flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>{driver.phone}</span>
                            <span className="text-slate-300">&bull;</span>
                            <span>{driver.vehicleModel} ({driver.vehiclePlate})</span>
                          </p>
                        </div>
                      </div>

                      {/* Valor e Data */}
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-mono font-bold text-slate-500 block">
                          Valor Declarado
                        </span>
                        <span className="text-xl sm:text-2xl font-heading font-black text-emerald-700 block">
                          {formatBRL(pending.amount || WEEKLY_FEE)}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono font-bold flex items-center sm:justify-end gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Enviado: {formattedDate}</span>
                        </span>
                      </div>
                    </div>

                    {/* Detalhes do Comprovante */}
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <span className="font-mono font-bold text-slate-500 uppercase block text-[11px]">
                          Código / ID do Comprovante:
                        </span>
                        <span className="font-mono font-black text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-300 inline-block text-xs sm:text-sm select-all">
                          {pending.comprovanteId}
                        </span>
                      </div>

                      {pending.comprovanteUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewProofImage(pending.comprovanteUrl || null)}
                          className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 font-heading font-black rounded-xl border border-slate-300 shadow-xs cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                        >
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <span>Visualizar Print Anexo</span>
                        </button>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => onRejectWeeklyPayment && onRejectWeeklyPayment(driver)}
                        className="w-full sm:w-auto px-5 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-heading font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4 text-rose-600" />
                        <span>Reprovar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onApproveWeeklyPayment && onApproveWeeklyPayment(driver)}
                        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                        <span>Aprovar - Libera 7 dias</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: GESTÃO DE CADASTROS (MOTORISTAS, MOTOBOYS E PASSAGEIROS) */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          {/* Toast de feedback de ação */}
          {actionToast && (
            <div className="bg-slate-950 text-white border-2 border-[#ff6a00] p-3.5 rounded-2xl flex items-center justify-between shadow-lg animate-bounce">
              <span className="font-heading font-black text-xs sm:text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {actionToast}
              </span>
              <button
                type="button"
                onClick={() => setActionToast(null)}
                className="text-zinc-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* BARRA DE AÇÕES GERAIS: ATIVAR TODOS E REMOVER TODOS */}
          <div className="bg-gradient-to-r from-slate-950 to-zinc-900 text-white border border-zinc-800 rounded-3xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#ff6a00]/20 border border-[#ff6a00]/40 flex items-center justify-center text-[#ff6a00]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-base sm:text-lg text-white">
                    Ações de Cadastros no RACE
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {drivers.length} condutores cadastrados • {activeWeeklySubs} ativos • {passengers.length} passageiros
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto">
              {/* Botão ATIVAR TODOS OS CADASTROS */}
              <button
                type="button"
                onClick={() => {
                  if (onActivateAllDrivers) {
                    onActivateAllDrivers();
                    showToast('✅ Todos os motoristas foram ativados com 7 dias liberados e status ONLINE!');
                  }
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-heading font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                title="Ativar e liberar todos os motoristas com 7 dias de plano semanal"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Ativar Todos os Cadastros ({drivers.length})</span>
              </button>

              {/* Botão REMOVER TODOS OS CADASTROS */}
              <button
                type="button"
                onClick={() => setIsConfirmRemoveAllModalOpen(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-700 hover:bg-rose-600 active:scale-95 text-white font-heading font-black text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                title="Remover todos os cadastros"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remover Todos</span>
              </button>
            </div>
          </div>

          {/* SUB-ABAS: MOTORISTAS/MOTOBOYS VS PASSAGEIROS */}
          <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex items-center gap-2 shadow-xs">
            <button
              type="button"
              onClick={() => setCadastrosSubTab('drivers')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                cadastrosSubTab === 'drivers'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Motoristas & Motoboys ({drivers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setCadastrosSubTab('passengers')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                cadastrosSubTab === 'passengers'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Passageiros Cadastrados ({passengers.length})</span>
            </button>
          </div>

          {/* Filters & Search */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-3.5 shadow-md">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  cadastrosSubTab === 'drivers'
                    ? 'Buscar por nome, placa do veículo, modelo ou e-mail...'
                    : 'Buscar por nome, telefone ou e-mail de passageiro...'
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-sm sm:text-base text-slate-950 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>

            {cadastrosSubTab === 'drivers' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-5 h-5 text-slate-500" />
                <select
                  value={driverFilterCategory}
                  onChange={(e) => setDriverFilterCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="all">Todas as Categorias</option>
                  <option value="economica">Econômica (R$ 2,50/km)</option>
                  <option value="confort">Confort (R$ 3,50/km)</option>
                  <option value="moto_passageiro">Moto Passageiro (R$ 1,80/km)</option>
                  <option value="moto_entrega">Moto Entrega Flash (R$ 2,00/km)</option>
                </select>
              </div>
            )}
          </div>

          {/* LISTA DE MOTORISTAS & MOTOBOYS */}
          {cadastrosSubTab === 'drivers' && (
            <div className="space-y-3.5">
              {filteredDrivers.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500">
                  <p className="font-heading font-bold text-base">Nenhum motorista ou motoboy encontrado.</p>
                  <p className="text-xs mt-1">Cadastre novos motoristas na aba Motorista &gt; Novo Cadastro.</p>
                </div>
              ) : (
                filteredDrivers.map((driver) => (
                  <div
                    key={driver.id}
                    className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={driver.avatar}
                        alt={driver.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-amber-500 shadow-sm"
                      />
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-heading font-black text-slate-900 text-base sm:text-lg">
                            {driver.name}
                          </h4>
                          <span className="text-xs font-mono bg-slate-100 text-slate-900 px-2.5 py-0.5 rounded border border-slate-300 font-bold">
                            {driver.vehiclePlate}
                          </span>
                          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                            ⭐ {driver.rating.toFixed(2)}
                          </span>
                          {driver.category === 'confort' && (
                            <span className="text-xs bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded font-black flex items-center gap-1">
                              ✨ Confort
                            </span>
                          )}
                          <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                            {driver.category === 'economica' ? 'Econômica' :
                             driver.category === 'confort' ? 'Confort' :
                             driver.category === 'moto_passageiro' ? 'Moto Passageiro' : 'Moto Entrega'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 font-medium mt-1">
                          {driver.vehicleModel} ({driver.vehicleYear}) • CNH: {driver.cnh}
                        </p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium flex-wrap">
                          <span>Tel: {driver.phone}</span>
                          <span>•</span>
                          <span>Login: <strong className="text-slate-800">{driver.email}</strong></span>
                          <span>•</span>
                          <span>{driver.totalRides} corridas</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                      <div className="text-right mr-1">
                        <span className="text-[11px] text-slate-500 block font-mono font-bold">
                          Plano Semanal R$ 200
                        </span>
                        <span
                          className={`text-xs font-black ${
                            driver.weeklyPlanActive && driver.status === 'online'
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {driver.weeklyPlanActive && driver.status === 'online'
                            ? 'Liberado (Online 7d)'
                            : 'Bloqueado / Pendente'}
                        </span>
                      </div>

                      {/* Botão ATIVAR */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onApproveWeeklyPayment) {
                            onApproveWeeklyPayment(driver);
                            showToast(`✅ Cadastro de ${driver.name} ativado com sucesso!`);
                          }
                        }}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                        title="Ativar motorista e liberar 7 dias online"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ativar</span>
                      </button>

                      {/* Botão Bloquear */}
                      <button
                        type="button"
                        onClick={() => {
                          if (onRejectWeeklyPayment) {
                            onRejectWeeklyPayment(driver);
                          } else {
                            onToggleDriverStatus(driver.id);
                          }
                          showToast(`Status de ${driver.name} alterado.`);
                        }}
                        className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-heading font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                        title="Bloquear motorista / deixar offline"
                      >
                        <XCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Bloquear</span>
                      </button>

                      {/* Botão REMOVER */}
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirmTarget({
                            type: 'driver',
                            id: driver.id,
                            name: driver.name,
                            email: driver.email,
                          });
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-heading font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                        title="Remover cadastro permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* LISTA DE PASSAGEIROS CADASTRADOS */}
          {cadastrosSubTab === 'passengers' && (
            <div className="space-y-3.5">
              {filteredPassengers.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500">
                  <p className="font-heading font-bold text-base">Nenhum passageiro cadastrado no momento.</p>
                  <p className="text-xs mt-1">Novos passageiros aparecem aqui assim que criam conta no aplicativo.</p>
                </div>
              ) : (
                filteredPassengers.map((pass) => (
                  <div
                    key={pass.id}
                    className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-13 h-13 rounded-full bg-blue-100 text-blue-700 font-heading font-black text-lg flex items-center justify-center border-2 border-blue-300 shadow-sm shrink-0">
                        {pass.name ? pass.name.charAt(0).toUpperCase() : 'P'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-heading font-black text-slate-900 text-base sm:text-lg">
                            {pass.name}
                          </h4>
                          <span className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-0.5 rounded font-mono font-bold">
                            Passageiro
                          </span>
                          <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                            ⭐ {(pass.rating || 5.0).toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 font-medium flex-wrap">
                          <span>E-mail: <strong className="text-slate-900">{pass.email}</strong></span>
                          <span>•</span>
                          <span>Tel: {pass.phone || 'Não informado'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                      <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Conta Ativa</span>
                      </span>

                      {/* Botão REMOVER PASSAGEIRO */}
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirmTarget({
                            type: 'passenger',
                            id: pass.id,
                            name: pass.name,
                            email: pass.email,
                          });
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-heading font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                        title="Remover cadastro de passageiro"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: LIVE RIDES MONITOR */}
      {activeTab === 'rides' && (
        <div className="space-y-3.5">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md">
            <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-600" />
              <span>Corridas e Entregas Registradas na Plataforma</span>
            </h3>

            <div className="space-y-3">
              {rides.map((ride) => (
                <div
                  key={ride.id}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-extrabold text-amber-800 text-sm">{ride.id}</span>
                      <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-xs uppercase font-extrabold">
                        {ride.category.replace('_', ' ')}
                      </span>
                      <span className="text-emerald-700 font-bold">{ride.status}</span>
                    </div>
                    <p className="text-slate-900 font-medium">
                      <strong>De:</strong> {ride.pickup.address}
                    </p>
                    <p className="text-slate-600">
                      <strong>Para:</strong> {ride.destination.address}
                    </p>
                  </div>

                  <div className="text-right sm:shrink-0">
                    <div className="font-heading font-black text-slate-950 text-lg">
                      {formatBRL(ride.price)}
                    </div>
                    <span className="text-xs text-emerald-700 block font-extrabold">
                      Condutor: 100% ({formatBRL(ride.driverEarnings)})
                    </span>
                    <span className="text-xs text-slate-500">
                      Taxa RACE: R$ 0,00
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PERFORMANCE REPORTS & DATA ANALYSIS */}
      {activeTab === 'reports' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h3 className="font-heading font-black text-slate-950 text-xl flex items-center gap-2.5">
                <BarChart3 className="w-6 h-6 text-amber-600" />
                <span>Relatórios Detalhados e Análise de Desempenho</span>
              </h3>
              <p className="text-sm text-slate-600 font-medium mt-0.5">
                Métricas operacionais consolidadas para tomada de decisão
              </p>
            </div>
            <button
              onClick={exportReportCSV}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Baixar CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs text-slate-500 uppercase font-black block">Tarifas Praticadas</span>
              <p className="text-slate-900 text-sm font-bold">Econômica: R$ 2,50 / km</p>
              <p className="text-slate-900 text-sm font-bold">Confort: R$ 3,50 / km</p>
              <p className="text-slate-900 text-sm font-bold">Moto Passageiro: R$ 1,80 / km</p>
              <p className="text-slate-900 text-sm font-bold">Moto Entrega Flash: R$ 2,00 / km</p>
            </div>

            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-2">
              <span className="text-xs text-slate-500 uppercase font-black block">Sustentabilidade RACE</span>
              <p className="text-emerald-700 text-sm font-bold">Zero Risco para o Motorista</p>
              <p className="text-slate-700 text-xs font-medium">
                O modelo de {WEEKLY_FEE_BADGE} gera receita fixa para a plataforma e garante previsibilidade aos parceiros.
              </p>
            </div>

            <div className="bg-purple-50 p-5 rounded-2xl border border-purple-200 space-y-2 md:col-span-3">
              <span className="text-xs text-purple-900 uppercase font-black block">Regras Oficiais de Liberação do Modelo Confort</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm text-purple-950 font-medium pt-1">
                <div className="bg-white p-3 rounded-xl border border-purple-200">
                  <strong className="block text-slate-900">Etios Sedan, Voyage, Prisma, Logan, Cobalt:</strong>
                  <span className="font-bold text-purple-800">Ano de fabricação a partir de 2019</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-purple-200">
                  <strong className="block text-slate-900">Argo e Polo:</strong>
                  <span className="font-bold text-purple-800">Ano de fabricação a partir de 2023</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-purple-200">
                  <strong className="block text-slate-900">Demais modelos (SUV, CR-V, Sedã):</strong>
                  <span className="font-bold text-purple-800">Ano de fabricação a partir de 2018</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Prévia do Comprovante Anexo */}
      {previewProofImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-300 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="font-heading font-black text-slate-950 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>Comprovante PIX Anexado pelo Condutor</span>
              </h4>
              <button
                type="button"
                onClick={() => setPreviewProofImage(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                title="Fechar"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto rounded-2xl border border-slate-200 bg-slate-100 p-2 text-center">
              <img
                src={previewProofImage}
                alt="Comprovante"
                className="max-w-full h-auto object-contain rounded-xl mx-auto shadow-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setPreviewProofImage(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-heading font-black py-3 rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação: Remover Todos os Cadastros */}
      {isConfirmRemoveAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border-2 border-rose-500 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="text-center space-y-2">
              <h4 className="font-heading font-black text-slate-950 text-lg">
                Remover Todos os Cadastros?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                Esta ação irá excluir permanentemente <strong>todos os cadastros</strong> de motoristas e passageiros do sistema. O acesso oficial da administração (<strong className="text-slate-900">admin@race.com.br</strong>) continuará preservado.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmRemoveAllModalOpen(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-black text-xs sm:text-sm transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onRemoveAllAccounts) {
                    onRemoveAllAccounts();
                  }
                  setIsConfirmRemoveAllModalOpen(false);
                  showToast('🗑️ Todos os cadastros foram removidos.');
                }}
                className="flex-1 py-3 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-heading font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95"
              >
                Sim, Remover Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação: Remover Cadastro Individual */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-300 animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="text-center space-y-2">
              <h4 className="font-heading font-black text-slate-950 text-lg">
                Remover Cadastro?
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                Deseja realmente excluir o cadastro de <strong>{deleteConfirmTarget.name}</strong> (<span className="text-slate-900 font-mono">{deleteConfirmTarget.email}</span>)? Esta ação não poderá ser desfeita.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-black text-xs sm:text-sm transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteConfirmTarget.type === 'driver') {
                    if (onRemoveDriver) onRemoveDriver(deleteConfirmTarget.id, deleteConfirmTarget.email);
                  } else {
                    if (onRemovePassenger) onRemovePassenger(deleteConfirmTarget.id, deleteConfirmTarget.email);
                  }
                  showToast(`🗑️ Cadastro de ${deleteConfirmTarget.name} removido com sucesso.`);
                  setDeleteConfirmTarget(null);
                }}
                className="flex-1 py-3 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-heading font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
