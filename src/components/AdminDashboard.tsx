import React, { useState } from 'react';
import { Driver, Ride } from '../types';
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
  Check
} from 'lucide-react';

interface AdminDashboardProps {
  drivers: Driver[];
  rides: Ride[];
  onApproveDriver: (driverId: string) => void;
  onToggleDriverStatus: (driverId: string) => void;
  onOpenShare?: () => void;
  onApproveWeeklyPayment?: (driver: Driver) => void;
  onRejectWeeklyPayment?: (driver: Driver) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  drivers,
  rides,
  onApproveDriver,
  onToggleDriverStatus,
  onOpenShare,
  onApproveWeeklyPayment,
  onRejectWeeklyPayment,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'drivers' | 'rides' | 'reports'>('overview');
  const [driverFilterCategory, setDriverFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewProofImage, setPreviewProofImage] = useState<string | null>(null);

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
      d.vehicleModel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
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
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'drivers'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Gestão de Condutores ({drivers.length})
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

          {/* Operational Model Insight */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-md">
            <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-600" />
              <span>Eficiência do Modelo RACE vs Apps Tradicionais</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-300 space-y-2.5">
                <span className="font-black text-emerald-900 uppercase text-xs sm:text-sm block">
                  Plataforma RACE (Assinatura Semanal {WEEKLY_FEE_TEXT})
                </span>
                <p className="text-slate-800 font-medium">
                  O condutor retém <strong>100% de todas as corridas</strong>. Se faturar R$ 2.500 no mês, fica com R$ 2.500 integrais, pagando apenas a mensalidade previsível.
                </p>
                <div className="text-xs sm:text-sm text-emerald-800 font-bold">
                  Retenção de motoristas: 98.4% de fidelidade
                </div>
              </div>

              <div className="bg-rose-50 p-5 rounded-2xl border border-rose-300 space-y-2.5">
                <span className="font-black text-rose-900 uppercase text-xs sm:text-sm block">
                  Aplicativos Convencionais (25% a 40% de taxa)
                </span>
                <p className="text-slate-800 font-medium">
                  Cobram porcentagens abusivas a cada corrida, diminuindo os ganhos líquidos do motorista e gerando cancelamentos frequentes.
                </p>
                <div className="text-xs sm:text-sm text-slate-600">
                  Desconto médio: R$ 600 a R$ 1.200 retidos por condutor
                </div>
              </div>
            </div>
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

      {/* TAB 3: DRIVERS & MOTOBOYS MANAGEMENT */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-3.5 shadow-md">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, placa do veículo ou modelo..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-sm sm:text-base text-slate-950 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>

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
          </div>

          {/* Drivers List */}
          <div className="space-y-3.5">
            {filteredDrivers.map((driver) => (
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
                    <div className="flex items-center gap-2.5">
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
                          ✨ Confort Aprovado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 font-medium mt-1">
                      {driver.vehicleModel} ({driver.vehicleYear}) • {driver.cnh}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 font-medium">
                      <span>Tel: {driver.phone}</span>
                      <span>•</span>
                      <span>Login: <strong className="text-slate-800">{driver.email}</strong></span>
                      <span>•</span>
                      <span>{driver.totalRides} corridas</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block font-mono font-bold">
                      Plano {WEEKLY_FEE_BADGE}
                    </span>
                    <span
                      className={`text-sm font-black ${
                        driver.weeklyPlanActive ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {driver.weeklyPlanActive ? 'Ativo & Regular' : 'Aguardando Pagamento'}
                    </span>
                  </div>

                  <button
                    onClick={() => onToggleDriverStatus(driver.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-black transition-all cursor-pointer ${
                      driver.status === 'online'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-300'
                    }`}
                  >
                    {driver.status === 'online' ? 'Online' : 'Offline'}
                  </button>
                </div>
              </div>
            ))}
          </div>
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
    </div>
  );
};
