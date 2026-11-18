import React, { useState, useEffect } from 'react';
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
  X,
  ArrowDownCircle,
  Copy,
  Star,
  MessageSquare,
  Cloud,
  Database,
  RefreshCw,
  Car,
  KeyRound,
  Camera,
  Pencil,
  Loader2,
  Gift
} from 'lucide-react';
import { getWithdrawals, markWithdrawalAsPaid, setWithdrawalsFromSupabase } from '../services/walletService';
import { WithdrawalRequest } from '../types';
import { getStoredReviews, DriverReview, setReviewsFromSupabase } from '../services/reviewService';
import { 
  supabase,
  SUPABASE_URL, 
  SUPABASE_ANON_KEY, 
  SUPABASE_SETUP_SQL, 
  testSupabaseConnection, 
  saveUsuarioSupabase,
  selectSafeUsuariosRows,
  updateDriverOnlineStatusSupabase,
  getAllCorridasForAdminSupabase,
  getAllPagamentosSupabase,
  fetchDriverApplicationsSupabase,
  approveOrRejectDriverSupabase,
  uploadProfilePhotoSupabase,
  extractPhotoFromRow,
  getAllReferralsAdminSupabase,
  AdminReferralItem,
  DriverApplicationRecord,
  SupabasePagamentoRow
} from '../supabase';
import { 
  getAsaasFinancialSummary, 
  AsaasBalanceInfo
} from '../services/asaasService';
import { maskLast4Digits } from '../utils/security';
import { validateAndCompressPhotoFile, validatePhotoMax2MB } from '../utils/imageCompression';
import { isAppUserAdmin } from '../services/userService';
import {
  calculateRideSplitForDriver,
  parseReferralBonusMeta,
  formatReferralBonusMessage,
  REFERRAL_BONUS_AMOUNT,
  REFERRAL_REQUIRED_RIDES,
} from '../services/promoService';

interface AdminDashboardProps {
  currentUser?: AppUser | null;
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
  onApproveDriverApplication?: (email: string, updatedDriver?: Driver) => void;
  onRejectDriverApplication?: (email: string, reason: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
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
  onApproveDriverApplication,
  onRejectDriverApplication,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'pending_drivers' | 'withdrawals' | 'payments' | 'drivers' | 'rides' | 'referrals' | 'reports' | 'reviews' | 'supabase'>('overview');
  const [cadastrosSubTab, setCadastrosSubTab] = useState<'all' | 'drivers' | 'passengers'>('all');
  const [driverFilterCategory, setDriverFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewProofImage, setPreviewProofImage] = useState<string | null>(null);
  const [previewDocTitle, setPreviewDocTitle] = useState<string>('Comprovante PIX Anexado pelo Condutor');

  // Leitura direta das tabelas do Supabase (usuarios, corridas, pagamentos, motoristas)
  const [supabaseUsers, setSupabaseUsers] = useState<any[]>([]);
  const [supabaseCorridas, setSupabaseCorridas] = useState<Ride[]>(rides);
  const [supabasePagamentos, setSupabasePagamentos] = useState<SupabasePagamentoRow[]>([]);
  const [adminReferrals, setAdminReferrals] = useState<AdminReferralItem[]>([]);
  const [driverApplicationsMap, setDriverApplicationsMap] = useState<Record<string, DriverApplicationRecord>>({});
  const [rejectionReasonInputs, setRejectionReasonInputs] = useState<Record<string, string>>({});
  const [processingApprovalEmail, setProcessingApprovalEmail] = useState<string | null>(null);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [supabaseUsersError, setSupabaseUsersError] = useState<string | null>(null);
  const [userStatusMap, setUserStatusMap] = useState<Record<string, { status: 'liberado' | 'bloqueado' | 'pendente'; expiresAt?: string }>>({});
  const [selectedUserReviewModal, setSelectedUserReviewModal] = useState<any | null>(null);

  useEffect(() => {
    setSupabaseCorridas(rides);
  }, [rides]);

  // Busca de usuarios, corridas, pagamentos e cadastros de motoristas diretamente do Supabase (somente ADM)
  const fetchSupabaseUsuarios = async () => {
    if (!isAppUserAdmin(currentUser)) {
      setSupabaseUsers([]);
      setSupabaseCorridas([]);
      setSupabasePagamentos([]);
      setAdminReferrals([]);
      setDriverApplicationsMap({});
      setIsLoadingUsers(false);
      return;
    }
    setIsLoadingUsers(true);
    setSupabaseUsersError(null);
    try {
      const [usersRes, corridasData, pagamentosData, appsMap, referralsData] = await Promise.all([
        selectSafeUsuariosRows((q) => q.order('created_at', { ascending: false })),
        getAllCorridasForAdminSupabase(),
        getAllPagamentosSupabase(),
        fetchDriverApplicationsSupabase().catch(() => ({} as Record<string, DriverApplicationRecord>)),
        getAllReferralsAdminSupabase().catch(() => [] as AdminReferralItem[]),
      ]);

      if (usersRes.error) {
        console.error('Erro ao buscar usuarios no Supabase:', usersRes.error.message);
        setSupabaseUsersError(usersRes.error.message);
      } else if (usersRes.data) {
        setSupabaseUsers(usersRes.data);
      }

      setSupabaseCorridas(corridasData);
      setSupabasePagamentos(pagamentosData);
      setAdminReferrals(referralsData);
      setDriverApplicationsMap(appsMap);

      // Hidrata saques reais da tabela pagamentos
      const mappedWithdrawals: WithdrawalRequest[] = pagamentosData
        .filter((p) => p.tipo === 'saque')
        .map((p) => ({
          id: p.id !== undefined && p.id !== null ? String(p.id) : '',
          driverId: p.id_motorista !== undefined && p.id_motorista !== null ? String(p.id_motorista) : '',
          driverName: p.nome_motorista || 'Condutor',
          driverPhone: '',
          pixKey: p.chave_pix || '',
          grossAmount: Number(((Number(p.valor || 0)) / 0.85).toFixed(2)),
          platformFee15: Number((((Number(p.valor || 0)) / 0.85) * 0.15).toFixed(2)),
          weeklyFeeDeducted: 0,
          netAmount: Number(p.valor || 0),
          status: (p.status === 'paid' || p.status === 'pago' || p.status === 'approved') ? 'paid' : 'pending',
          requestedAt: p.data || new Date().toISOString(),
          paidAt: (p.status === 'paid' || p.status === 'pago' || p.status === 'approved') ? p.data : undefined,
        }));
      setWithdrawalsFromSupabase(mappedWithdrawals);
      setWithdrawalsList(mappedWithdrawals);

      // Hidrata avaliações reais das corridas do Supabase
      const mappedReviews: DriverReview[] = corridasData
        .filter((r) => typeof r.ratingGivenToDriver === 'number' && r.ratingGivenToDriver > 0)
        .map((r) => ({
          id: `rev-${r.id}`,
          rideId: r.id,
          driverId: r.driver?.id || '',
          driverName: r.driver?.name || '',
          driverVehicle: r.driver?.vehicleModel ? `${r.driver.vehicleModel} - ${r.driver.vehiclePlate}` : '',
          passengerName: r.passengerName || 'Passageiro',
          passengerEmail: r.passengerEmail,
          rating: Number(r.ratingGivenToDriver || 0),
          comment: r.ratingComment || '',
          issueComment: r.issueComment,
          tags: [],
          createdAt: r.createdAt || new Date().toISOString(),
        }));
      setReviewsFromSupabase(mappedReviews);
      setReviewsList(mappedReviews);
    } catch (err: any) {
      console.error('Falha ao conectar no Supabase:', err);
      setSupabaseUsersError(err?.message || 'Falha ao buscar dados do Supabase');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchSupabaseUsuarios();
  }, []);

  // Status da Nuvem Supabase
  const [supabaseHealth, setSupabaseHealth] = useState<{
    connected: boolean;
    tables: { usuarios: boolean; corridas: boolean; pagamentos: boolean };
    details: string;
  } | null>(null);
  const [isTestingSupabase, setIsTestingSupabase] = useState(false);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState(false);
  const [copiedSQL, setCopiedSQL] = useState(false);

  // Avaliações & Reclamações reais dos Passageiros
  const [reviewsList, setReviewsList] = useState<DriverReview[]>(() => getStoredReviews());
  const [reviewFilterStars, setReviewFilterStars] = useState<'all' | 'issues' | '5' | '4' | '3'>('all');

  useEffect(() => {
    const handleReviewUpdate = () => {
      setReviewsList(getStoredReviews());
    };
    window.addEventListener('race_review_added', handleReviewUpdate);
    return () => window.removeEventListener('race_review_added', handleReviewUpdate);
  }, []);

  const criticalIssues = reviewsList.filter((r) => r.rating <= 2);

  // Saques reais dos motoristas (tabela pagamentos)
  const [withdrawalsList, setWithdrawalsList] = useState<WithdrawalRequest[]>(() => getWithdrawals());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const pendingWithdrawals = withdrawalsList.filter((w) => w.status === 'pending');

  const handlePayWithdrawal = (withdrawalId: string, driverName: string, netAmount: number) => {
    markWithdrawalAsPaid(withdrawalId);
    setWithdrawalsList(getWithdrawals());
    setSupabasePagamentos((prev) =>
      prev.map((p) => (p.id === withdrawalId ? { ...p, status: 'paid' } : p))
    );
    showToast(`Pagamento de R$ ${netAmount.toFixed(2)} registrado como Pago via PIX para ${driverName}!`);
  };

  // Modais de confirmação de remoção
  const [isConfirmRemoveAllModalOpen, setIsConfirmRemoveAllModalOpen] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'driver' | 'passenger';
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Modal de edição de usuário pelo ADM (com botão SALVAR ALTERAÇÕES no final)
  const [editingAdminUser, setEditingAdminUser] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserAvatar, setEditUserAvatar] = useState('');
  const [editUserModel, setEditUserModel] = useState('');
  const [editUserPlate, setEditUserPlate] = useState('');
  const [editUserPhotoFile, setEditUserPhotoFile] = useState<File | null>(null);
  const [hasPendingEditAvatar, setHasPendingEditAvatar] = useState(false);
  const [isSavingAdminUser, setIsSavingAdminUser] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);
  const adminEditPhotoRef = React.useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 3500);
  };

  const handleOpenAdminEditUser = (u: any) => {
    setEditingAdminUser(u);
    setEditUserName(u.name || '');
    setEditUserEmail(u.email === 'Sem e-mail' ? '' : (u.email || ''));
    setEditUserPhone(u.phone === 'Não informado' ? '' : (u.phone || ''));
    setEditUserAvatar(u.avatar || extractPhotoFromRow(u.raw) || '');
    setEditUserModel(u.model || '');
    setEditUserPlate(u.plate || '');
    setEditUserPhotoFile(null);
    setHasPendingEditAvatar(false);
    setEditUserError(null);
  };

  const handleAdminEditAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeErr = validatePhotoMax2MB(file);
    if (sizeErr) {
      setEditUserError(sizeErr);
      if (e.target) e.target.value = '';
      return;
    }
    try {
      const { dataUrl } = await validateAndCompressPhotoFile(file);
      if (dataUrl) {
        setEditUserAvatar(dataUrl);
        setEditUserPhotoFile(file);
        setHasPendingEditAvatar(true);
        setEditUserError(null);
      }
    } catch (err: any) {
      setEditUserError(err?.message || 'Não foi possível processar a imagem escolhida.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveAdminUserChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdminUser) return;
    const cleanName = editUserName.trim();
    const cleanEmail = editUserEmail.trim().toLowerCase();
    const cleanPhone = editUserPhone.trim();

    if (!cleanName) {
      setEditUserError('Informe o nome completo do usuário.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setEditUserError('Informe um e-mail válido.');
      return;
    }

    setIsSavingAdminUser(true);
    setEditUserError(null);

    try {
      const isChangingPhoto = Boolean(hasPendingEditAvatar || editUserPhotoFile);
      let photoToSave = editUserAvatar || '';
      let storageErrorDetail = '';

      if (photoToSave && (editUserPhotoFile || photoToSave.startsWith('data:image'))) {
        const uploadRes = await uploadProfilePhotoSupabase({
          photo: editUserPhotoFile || photoToSave,
          identifier: cleanEmail || String(editingAdminUser.id || 'usuario'),
        });
        if (!uploadRes.url && uploadRes.error) {
          setEditUserError(uploadRes.error);
          return;
        }
        if (!uploadRes.storageUploaded && uploadRes.error) {
          storageErrorDetail = uploadRes.error;
        }
        photoToSave = uploadRes.url || uploadRes.compressedDataUrl || photoToSave;
      }

      const res = await saveUsuarioSupabase({
        id: editingAdminUser.id,
        previousEmail: editingAdminUser.email,
        nome: cleanName,
        email: cleanEmail,
        celular: cleanPhone,
        whatsapp: cleanPhone,
        login: editingAdminUser.login,
        tipo: editingAdminUser.raw?.tipo,
        categoria: editingAdminUser.raw?.categoria,
        modelo: !editingAdminUser.isPassenger && editUserModel.trim() ? editUserModel.trim() : undefined,
        placa: !editingAdminUser.isPassenger && editUserPlate.trim() ? editUserPlate.trim().toUpperCase() : undefined,
        foto: photoToSave || undefined,
        avatar: photoToSave || undefined,
      });

      if (!res.success) {
        setEditUserError(
          storageErrorDetail
            ? `Storage: ${storageErrorDetail} | Banco: ${res.error || 'Erro ao salvar no Supabase.'}`
            : res.error || 'Erro ao salvar alterações no Supabase.'
        );
        return;
      }

      const returnedPhoto = extractPhotoFromRow(res.data) || photoToSave || '';
      setSupabaseUsers((prev) =>
        prev.map((row) =>
          String(row.id) === String(editingAdminUser.id)
            ? {
                ...row,
                nome: cleanName,
                email: cleanEmail,
                'e-mail': cleanEmail,
                celular: cleanPhone,
                whatsapp: cleanPhone,
                modelo: !editingAdminUser.isPassenger && editUserModel.trim() ? editUserModel.trim() : row.modelo,
                placa: !editingAdminUser.isPassenger && editUserPlate.trim() ? editUserPlate.trim().toUpperCase() : row.placa,
                foto: returnedPhoto || row.foto,
                avatar: returnedPhoto || row.avatar,
              }
            : row
        )
      );

      setEditingAdminUser(null);
      setEditUserPhotoFile(null);
      setHasPendingEditAvatar(false);
      showToast(isChangingPhoto ? 'Foto salva!' : 'Perfil atualizado com sucesso!');
      fetchSupabaseUsuarios().catch(() => {});
    } catch (err: any) {
      setEditUserError(err?.message || 'Falha ao salvar alterações no Supabase.');
    } finally {
      setIsSavingAdminUser(false);
    }
  };

  const handleLiberar7Dias = async (u: any) => {
    const userId = String(u.id);
    const userEmail = (u['e-mail'] || u.email || '').toLowerCase().trim();

    setUserStatusMap((prev) => ({
      ...prev,
      [userId]: {
        status: 'liberado',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      },
    }));

    if (onApproveWeeklyPayment) {
      const match = drivers.find((d) => d.email.toLowerCase().trim() === userEmail || d.id === userId);
      if (match) onApproveWeeklyPayment(match);
    }

    try {
      await updateDriverOnlineStatusSupabase({
        id: String(u.id),
        email: userEmail,
        status: 'online',
      });
    } catch {}

    showToast(`✅ Acesso de 7 dias liberado com sucesso para ${u.nome}!`);
  };

  const handleBloquear = async (u: any) => {
    const userId = String(u.id);
    const userEmail = (u['e-mail'] || u.email || '').toLowerCase().trim();

    setUserStatusMap((prev) => ({
      ...prev,
      [userId]: { status: 'bloqueado' },
    }));

    if (onRejectWeeklyPayment) {
      const match = drivers.find((d) => d.email.toLowerCase().trim() === userEmail || d.id === userId);
      if (match) onRejectWeeklyPayment(match);
    } else if (onToggleDriverStatus) {
      const match = drivers.find((d) => d.email.toLowerCase().trim() === userEmail || d.id === userId);
      if (match) onToggleDriverStatus(match.id);
    }

    try {
      await updateDriverOnlineStatusSupabase({
        id: String(u.id),
        email: userEmail,
        status: 'offline',
      });
    } catch {}

    showToast(`⛔ Usuário ${u.nome} bloqueado pela administração.`);
  };

  const handleRemoverSupabaseUser = async (u: any) => {
    const userEmail = (u['e-mail'] || u.email || '').toLowerCase().trim();
    if (userEmail === 'admin@race.com.br') {
      showToast('⚠️ A conta principal admin@race.com.br não pode ser removida.');
      return;
    }

    try {
      await supabase.from('usuarios').delete().eq('id', u.id);
    } catch {}

    setSupabaseUsers((prev) => prev.filter((item) => item.id !== u.id));
    const isPassenger = u.tipo === 'passenger';
    if (isPassenger && onRemovePassenger) {
      onRemovePassenger(String(u.id), userEmail);
    } else if (!isPassenger && onRemoveDriver) {
      onRemoveDriver(String(u.id), userEmail);
    }
    showToast(`🗑️ Usuário ${u.nome || userEmail} removido com sucesso!`);
  };

  const handleVerAvaliacoes = (userParsed: any) => {
    setSelectedUserReviewModal(userParsed);
  };

  const parsedUsers = supabaseUsers.map((u) => {
    const email = (u['e-mail'] || u.email || '').trim();
    const phone = (u.celular || u.whatsapp || '').trim();
    const login = (u.login || email.split('@')[0] || '').trim();
    const tipoNorm = String(u.tipo || '').trim().toLowerCase();
    const isPassenger = tipoNorm === 'passenger' || tipoNorm === 'passageiro';
    const isMotoboy =
      tipoNorm === 'motoboy' ||
      tipoNorm === 'motoboy_passageiro' ||
      tipoNorm === 'motoboy_entregas' ||
      (u.categoria && u.categoria.includes('moto'));
    const isAdminRow =
      tipoNorm === 'adm' ||
      tipoNorm === 'admin' ||
      tipoNorm === 'administrador' ||
      email.toLowerCase() === 'admin@race.com.br';
    const userType = isAdminRow ? 'ADM' : isPassenger ? 'Passageiro' : isMotoboy ? 'Motoboy' : 'Motorista';

    let categoryLabel = 'Econômico';
    if (isAdminRow) {
      categoryLabel = 'Administrador';
    } else if (u.categoria === 'confort' || u.tipo === 'motorista_confort') {
      categoryLabel = 'Confort';
    } else if (u.categoria === 'moto_passageiro' || u.tipo === 'motoboy_passageiro') {
      categoryLabel = 'Motoboy Passageiro';
    } else if (u.categoria === 'moto_entrega' || u.tipo === 'motoboy_entregas') {
      categoryLabel = 'Motoboy Entregas';
    } else if (isPassenger) {
      categoryLabel = 'Passageiro';
    }

    const createdAtFormatted = u.created_at
      ? new Date(u.created_at).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Recente';

    const currentStatus = userStatusMap[String(u.id)] || {
      status: u.status === 'bloqueado' ? 'bloqueado' : isPassenger ? 'passageiro' : (u.plano_ativo ? 'liberado' : 'pendente'),
      expiresAt: u.plano_ativo ? 'Ativo 7 dias' : undefined,
    };

    const maskedCnh = maskLast4Digits(u.cnh || '');
    const maskedCpf = maskLast4Digits(u.cpf || '');
    const safeRaw = { ...u };
    delete (safeRaw as any).senha;
    if (safeRaw.cnh) safeRaw.cnh = maskedCnh;
    if (safeRaw.cpf) safeRaw.cpf = maskedCpf;

    return {
      raw: safeRaw,
      id: String(u.id),
      name: u.nome || 'Usuário Sem Nome',
      email,
      phone: phone || 'Não informado',
      login,
      isAdminRow,
      isPassenger,
      isMotoboy,
      userType,
      categoryLabel,
      categoryKey: u.categoria || (isPassenger ? 'passageiro' : 'economica'),
      plate: u.placa || '',
      model: u.modelo || '',
      year: u.ano || '',
      cnh: maskedCnh,
      cpf: maskedCpf,
      avatar: u.avatar || u.foto || null,
      rating: typeof u.rating === 'number' ? u.rating : 0,
      saldo: typeof u.saldo === 'number' ? u.saldo : 0.0,
      createdAt: u.created_at,
      createdAtFormatted,
      statusInfo: currentStatus,
    };
  });

  const filteredUsers = parsedUsers.filter((u) => {
    if (cadastrosSubTab === 'drivers' && u.isPassenger) return false;
    if (cadastrosSubTab === 'passengers' && !u.isPassenger) return false;
    if (driverFilterCategory !== 'all' && u.categoryKey !== driverFilterCategory) return false;

    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.toLowerCase().includes(q) ||
      u.login.toLowerCase().includes(q) ||
      u.plate.toLowerCase().includes(q) ||
      u.model.toLowerCase().includes(q)
    );
  });

  const overviewDrivers = parsedUsers.filter((u) => !u.isPassenger && !u.isAdminRow);

  const pendingDrivers = drivers.filter(
    (d) => d.pendingPayment && d.pendingPayment.status === 'pending'
  );

  // Lista consolidada de cadastros de motoristas para aprovação do ADM (Motoristas Pendentes)
  const mergedDriverApplications: DriverApplicationRecord[] = (() => {
    const byEmail = new Map<string, DriverApplicationRecord>();

    Object.entries(driverApplicationsMap).forEach(([em, rec]) => {
      const key = em.trim().toLowerCase();
      if (key) byEmail.set(key, rec);
    });

    drivers.forEach((d) => {
      const key = (d.email || '').trim().toLowerCase();
      if (!key) return;
      const existing = byEmail.get(key);
      byEmail.set(key, {
        ...(existing || {}),
        id: d.id || existing?.id,
        email: key,
        name: d.name || existing?.name || 'Condutor',
        phone: d.phone || existing?.phone || '',
        whatsapp: d.phone || existing?.whatsapp || '',
        category: d.category || existing?.category || 'economica',
        vehicleModel: d.vehicleModel || existing?.vehicleModel || '',
        vehicleColor: d.vehicleColor || existing?.vehicleColor || '',
        vehiclePlate: (d.vehiclePlate || existing?.vehiclePlate || '').toUpperCase(),
        vehicleYear: d.vehicleYear || existing?.vehicleYear || 2023,
        cnh: d.cnh || existing?.cnh || '',
        avatar: d.avatar || existing?.avatar || '',
        cnhFrontPhoto: d.cnhFrontPhoto || d.cnhPhoto || existing?.cnhFrontPhoto || '',
        cnhBackPhoto: d.cnhBackPhoto || existing?.cnhBackPhoto || '',
        crlvPhoto: d.crlvPhoto || existing?.crlvPhoto || '',
        vehiclePhoto: d.vehiclePhoto || existing?.vehiclePhoto || '',
        approvalStatus: existing?.approvalStatus || d.approvalStatus || 'pendente',
        rejectionReason: existing?.rejectionReason || d.rejectionReason || '',
        approvedAt: existing?.approvedAt || d.approvedAt || '',
        submittedAt: existing?.submittedAt || d.registrationDate || '',
        online: (existing?.approvalStatus || d.approvalStatus) === 'aprovado' && (existing?.online || d.status === 'online'),
        driverStatus: d.status,
      });
    });

    overviewDrivers.forEach((u) => {
      const key = (u.email || '').trim().toLowerCase();
      if (!key || key === 'sem e-mail') return;
      const existing = byEmail.get(key);
      byEmail.set(key, {
        ...(existing || {}),
        id: existing?.id || u.id,
        email: key,
        name: existing?.name || u.name,
        phone: existing?.phone || u.phone,
        whatsapp: existing?.whatsapp || u.phone,
        category: existing?.category || u.categoryKey,
        vehicleModel: existing?.vehicleModel || u.model || '',
        vehicleColor: existing?.vehicleColor || '',
        vehiclePlate: (existing?.vehiclePlate || u.plate || '').toUpperCase(),
        vehicleYear: existing?.vehicleYear || Number(u.year) || 2023,
        cnh: existing?.cnh || u.raw?.cnh || '',
        avatar: existing?.avatar || u.avatar || '',
        cnhFrontPhoto: existing?.cnhFrontPhoto || '',
        cnhBackPhoto: existing?.cnhBackPhoto || '',
        crlvPhoto: existing?.crlvPhoto || '',
        vehiclePhoto: existing?.vehiclePhoto || '',
        approvalStatus: existing?.approvalStatus || 'pendente',
        rejectionReason: existing?.rejectionReason || '',
        approvedAt: existing?.approvedAt || '',
        submittedAt: existing?.submittedAt || u.createdAt || '',
      });
    });

    return Array.from(byEmail.values());
  })();

  const pendingApprovalsList = mergedDriverApplications.filter(
    (app) => app.approvalStatus === 'pendente'
  );
  const rejectedApprovalsList = mergedDriverApplications.filter(
    (app) => app.approvalStatus === 'reprovado'
  );
  const approvedApprovalsList = mergedDriverApplications.filter(
    (app) => app.approvalStatus === 'aprovado'
  );

  const openDocumentPreview = (imageUrl: string, title: string) => {
    setPreviewDocTitle(title);
    setPreviewProofImage(imageUrl);
  };

  const handleApprovePendingDriver = async (app: DriverApplicationRecord) => {
    setProcessingApprovalEmail(app.email);
    try {
      const matchedDriver = drivers.find(
        (d) => (d.email || '').trim().toLowerCase() === app.email.toLowerCase()
      );
      const res = await approveOrRejectDriverSupabase({
        email: app.email,
        decision: 'aprovado',
        driverSnapshot: {
          ...matchedDriver,
          id: app.id || matchedDriver?.id || '',
          name: app.name || matchedDriver?.name || 'Condutor',
          email: app.email,
          phone: app.phone || matchedDriver?.phone || '',
          category: (app.category as any) || matchedDriver?.category || 'economica',
          vehicleModel: app.vehicleModel || matchedDriver?.vehicleModel || '',
          vehicleColor: app.vehicleColor || matchedDriver?.vehicleColor || '',
          vehiclePlate: app.vehiclePlate || matchedDriver?.vehiclePlate || '',
          vehicleYear: app.vehicleYear || matchedDriver?.vehicleYear || 2023,
          cnh: app.cnh || matchedDriver?.cnh || '',
          avatar: app.avatar || matchedDriver?.avatar || '',
          cnhFrontPhoto: app.cnhFrontPhoto || matchedDriver?.cnhFrontPhoto || '',
          cnhBackPhoto: app.cnhBackPhoto || matchedDriver?.cnhBackPhoto || '',
          crlvPhoto: app.crlvPhoto || matchedDriver?.crlvPhoto || '',
          vehiclePhoto: app.vehiclePhoto || matchedDriver?.vehiclePhoto || '',
        },
      });
      setDriverApplicationsMap((prev) => ({
        ...prev,
        [app.email.toLowerCase()]: {
          ...app,
          approvalStatus: 'aprovado',
          rejectionReason: '',
          approvedAt: res.approvedAt || new Date().toISOString(),
          online: false,
          driverStatus: 'offline',
        },
      }));
      if (matchedDriver) {
        onApproveDriver(matchedDriver.id);
      }
      const resolvedApprovedDriver: Driver = {
        ...(matchedDriver || ({} as Driver)),
        id: app.id || matchedDriver?.id || '',
        name: app.name || matchedDriver?.name || 'Condutor',
        avatar: app.avatar || matchedDriver?.avatar || '',
        phone: app.phone || matchedDriver?.phone || '',
        email: app.email,
        cnh: app.cnh || matchedDriver?.cnh || '',
        category: (app.category as any) || matchedDriver?.category || 'economica',
        categoryConfigured: true,
        requirementsConfirmed: true,
        vehicleModel: app.vehicleModel || matchedDriver?.vehicleModel || '',
        vehiclePlate: app.vehiclePlate || matchedDriver?.vehiclePlate || '',
        vehicleColor: app.vehicleColor || matchedDriver?.vehicleColor || '',
        vehicleYear: app.vehicleYear || matchedDriver?.vehicleYear || 2023,
        cnhFrontPhoto: app.cnhFrontPhoto || matchedDriver?.cnhFrontPhoto || '',
        cnhBackPhoto: app.cnhBackPhoto || matchedDriver?.cnhBackPhoto || '',
        crlvPhoto: app.crlvPhoto || matchedDriver?.crlvPhoto || '',
        vehiclePhoto: app.vehiclePhoto || matchedDriver?.vehiclePhoto || '',
        approvalStatus: 'aprovado',
        rejectionReason: '',
        approvedAt: res.approvedAt || new Date().toISOString(),
        cnhVerified: true,
        vehicleVerified: true,
        rating: matchedDriver?.rating || 0,
        totalRides: matchedDriver?.totalRides || 0,
        status: 'offline',
        lat: matchedDriver?.lat || -23.0903,
        lng: matchedDriver?.lng || -47.2180,
        weeklyPlanActive: true,
        weeklyFeePaidAt: matchedDriver?.weeklyFeePaidAt || new Date().toISOString(),
        weeklyFeeExpiresAt: null,
        earningsToday: matchedDriver?.earningsToday || 0,
        earningsWeek: matchedDriver?.earningsWeek || 0,
        criminalRecordClear: true,
        registrationDate: matchedDriver?.registrationDate || new Date().toISOString().split('T')[0],
      };
      if (onApproveDriverApplication) {
        onApproveDriverApplication(app.email, resolvedApprovedDriver);
      }
      showToast(`✅ Motorista ${app.name || app.email} APROVADO! Agora ele já pode ficar online.`);
    } finally {
      setProcessingApprovalEmail(null);
    }
  };

  const handleRejectPendingDriver = async (app: DriverApplicationRecord) => {
    const reason =
      (rejectionReasonInputs[app.email] || '').trim() ||
      'Documentação (CNH / CRLV / Dados do veículo) não aprovada pelo ADM. Reenvie fotos legíveis.';
    setProcessingApprovalEmail(app.email);
    try {
      const matchedDriver = drivers.find(
        (d) => (d.email || '').trim().toLowerCase() === app.email.toLowerCase()
      );
      await approveOrRejectDriverSupabase({
        email: app.email,
        decision: 'reprovado',
        rejectionReason: reason,
        driverSnapshot: matchedDriver,
      });
      setDriverApplicationsMap((prev) => ({
        ...prev,
        [app.email.toLowerCase()]: {
          ...app,
          approvalStatus: 'reprovado',
          rejectionReason: reason,
          online: false,
          driverStatus: 'offline',
        },
      }));
      if (onRejectDriverApplication) {
        onRejectDriverApplication(app.email, reason);
      }
      showToast(`❌ Cadastro de ${app.name || app.email} reprovado. Ele não aparecerá online.`);
    } finally {
      setProcessingApprovalEmail(null);
    }
  };

  // Financial calculations - Soma EXCLUSIVA das tabelas pagamentos e corridas do Supabase (considera Promo 0% quando aplicável)
  const activeWeeklySubs = approvedApprovalsList.filter((d) => d.online).length;
  const referralBonusesAdmin = supabasePagamentos.filter((p) => p.tipo === 'bonus_indicacao');
  const paidPaymentsTotal = supabasePagamentos
    .filter((p) => {
      const st = String(p.status || '').toLowerCase();
      return (
        p.tipo !== 'saque' &&
        p.tipo !== 'cadastro_motorista' &&
        p.tipo !== 'bonus_indicacao' &&
        (st === 'pago' || st === 'paid' || st === 'confirmed' || st === 'received' || st === 'approved')
      );
    })
    .reduce((acc, p) => acc + Number(p.valor || 0), 0);

  const ridesTotalFromSupabase = supabaseCorridas.reduce((acc, r) => acc + Number(r.price || 0), 0);
  const totalRidesAdmin = supabaseCorridas.length;
  const totalArrecadadoAdmin = Number((paidPaymentsTotal > 0 ? paidPaymentsTotal : ridesTotalFromSupabase).toFixed(2));
  const raceCommissionAdmin = Number(
    supabaseCorridas.length > 0
      ? supabaseCorridas
          .reduce(
            (acc, r) =>
              acc +
              (typeof r.platformFee === 'number'
                ? r.platformFee
                : calculateRideSplitForDriver(r.price, r.driver, r.createdAt).platformFee),
            0
          )
          .toFixed(2)
      : (totalArrecadadoAdmin * 0.15).toFixed(2)
  );
  const repasseMotoristasAdmin = Number(
    Math.max(0, totalArrecadadoAdmin - raceCommissionAdmin).toFixed(2)
  );

  // Dados Financeiros (Saldo, Total Recebido, Comissão 15% Race, Repasse 85% Motoristas)
  const [asaasData, setAsaasData] = useState<AsaasBalanceInfo>({
    balance: 0,
    totalReceived: 0,
    raceCommission15: 0,
    repassarSexta85: 0,
    nextPayoutDate: 'Toda Sexta-feira às 18:00',
    isLive: false,
  });
  const [isLoadingAsaasData, setIsLoadingAsaasData] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingAsaasData(true);
    getAsaasFinancialSummary(totalArrecadadoAdmin)
      .then((res) => {
        if (isMounted) {
          setAsaasData(res);
          setIsLoadingAsaasData(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingAsaasData(false);
      });
    return () => {
      isMounted = false;
    };
  }, [totalArrecadadoAdmin]);

  const ratedReviews = reviewsList.filter((r) => r.rating > 0);
  const avgFleetRating = (
    ratedReviews.length > 0
      ? (ratedReviews.reduce((acc, d) => acc + d.rating, 0) / ratedReviews.length).toFixed(2)
      : '0.00'
  );

  const exportReportCSV = () => {
    const rows = [
      ['ID', 'Nome', 'Categoria', 'Placa', 'Avaliação', 'Status Conta', 'Ganhos Líquidos (85%)'],
      ...drivers.map((d) => [
        d.id,
        d.name,
        d.category,
        d.vehiclePlate,
        d.rating.toString(),
        d.status === 'online' ? 'ONLINE' : 'OFFLINE',
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

  const exportSafeBackupJSON = () => {
    const safeUsers = parsedUsers.map((u) => ({
      id: u.id,
      nome: u.name,
      email: u.email,
      whatsapp: u.phone,
      login: u.login,
      tipo: u.userType,
      categoria: u.categoryLabel,
      placa: u.plate,
      modelo: u.model,
      ano: u.year,
      cnh_mascarada: u.cnh,
      cpf_mascarado: u.cpf,
      rating: u.rating,
      created_at: u.createdAt,
    }));

    const backupPayload = {
      app: 'RACE Indaiatuba',
      exportedAt: new Date().toISOString(),
      securityNote: 'Senhas gerenciadas exclusivamente pelo Supabase Auth (nenhuma coluna de senha em public.usuarios) e CPF/CNH mascarados (últimos 4 dígitos).',
      usuarios: safeUsers,
      corridas: supabaseCorridas,
      pagamentos: supabasePagamentos,
    };

    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `RACE_backup_seguro_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Backup JSON seguro baixado com sucesso (sem senhas e com CPF/CNH mascarados).');
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

      {/* Modelo Oficial Financeiro Race: Comissão 15% - Total Arrecadado */}
      <div className="bg-slate-950 text-white rounded-2xl p-3.5 sm:p-4 border border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#ff6a00]/20 border border-[#ff6a00]/40 text-[#ff6a00] flex items-center justify-center font-bold shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <span className="font-heading font-black text-sm text-white block">
              Comissão Race 15% - Total arrecadado: {formatBRL(asaasData.raceCommission15)}
            </span>
            <span className="text-zinc-400 font-mono text-[11px]">
              Total recebido no app: <strong className="text-white">{formatBRL(asaasData.totalReceived)}</strong> &bull; Repasse 85% aos condutores toda sexta-feira
            </span>
          </div>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full font-mono text-xs font-bold">
            85% Motorista • 15% Race • Sem Mensalidade
          </span>
        </div>
      </div>

      {/* Admin Subtabs in White */}
      <div className="bg-white border border-slate-200 p-2 rounded-2xl flex items-center gap-2 shadow-sm overflow-x-auto overscroll-x-contain">
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
          onClick={() => setActiveTab('pending_drivers')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'pending_drivers'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-4 h-4 text-[#ff6a00]" />
          <span>Motoristas Pendentes ({pendingApprovalsList.length})</span>
          {pendingApprovalsList.length > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff6a00] animate-pulse" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'withdrawals'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ArrowDownCircle className="w-4 h-4 text-emerald-700" />
          <span>Saques Pendentes ({pendingWithdrawals.length})</span>
          {pendingWithdrawals.length > 0 && (
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          )}
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
          onClick={() => setActiveTab('referrals')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'referrals'
              ? 'bg-[#ff6a00] text-white shadow'
              : 'text-orange-700 hover:text-orange-950 hover:bg-orange-50'
          }`}
        >
          <Gift className="w-4 h-4 shrink-0" />
          <span>Indicações & Bônus ({referralBonusesAdmin.length})</span>
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
        <button
          onClick={() => setActiveTab('reviews')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'reviews'
              ? 'bg-amber-500 text-slate-950 shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
          <span>Avaliações & Reclamações ({reviewsList.length})</span>
          {criticalIssues.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
              {criticalIssues.length} alerta{criticalIssues.length > 1 ? 's' : ''}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('supabase')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'supabase'
              ? 'bg-[#ff6a00] text-white shadow'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Cloud className="w-4 h-4 text-emerald-600" />
          <span>Nuvem Supabase</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>
      </div>

      {/* TAB 1: OVERVIEW & KEY PERFORMANCE INDICATORS */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* PAINEL DE CÓDIGOS DE EMBARQUE PARA CONFERÊNCIA ADM (SOMENTE CORRIDAS DO SUPABASE) */}
          {(() => {
            const merged = new Map<string, Ride>();
            supabaseCorridas.forEach((r) => merged.set(r.id, r));
            rides.forEach((r) => {
              if (!merged.has(r.id)) merged.set(r.id, r);
            });
            const ridesWithCode = Array.from(merged.values()).filter((r) => Boolean(r.confirmationCode));
            if (ridesWithCode.length === 0) return null;
            return (
              <div className="bg-amber-300/95 border-2 border-amber-500 rounded-3xl p-4 sm:p-5 shadow-md space-y-3 text-slate-950">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-slate-950 shrink-0" />
                    <h3 className="font-heading font-black text-sm sm:text-base uppercase tracking-wide">
                      Códigos de Embarque Ativos / Recentes (Conferência ADM)
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('rides')}
                    className="px-3 py-1 bg-slate-950 text-amber-300 font-heading font-black text-xs rounded-xl cursor-pointer hover:bg-slate-800"
                  >
                    Ver Todas no Monitor
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {ridesWithCode.slice(0, 6).map((r) => (
                    <div
                      key={r.id}
                      className="bg-white border-2 border-amber-500 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono font-bold text-slate-500 block truncate">
                          {r.id} • {r.status}
                        </span>
                        <span className="font-heading font-black text-xs text-slate-900 block truncate">
                          {r.pickup.address}
                        </span>
                        <span className="text-[11px] text-slate-600 font-semibold block truncate">
                          {formatBRL(r.price)}
                        </span>
                      </div>
                      <div className="bg-slate-950 text-amber-300 px-3 py-1.5 rounded-xl font-mono font-black text-2xl tracking-[0.2em] shrink-0">
                        {r.confirmationCode}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

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
                    Condutores aguardando conferência bancária ({RACE_PIX_BANK}) ou validação de chave PIX.
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
          {/* PAINEL OFICIAL ASAAS: Saldo Asaas, Total Recebido, Comissão 15% Race, Repasse Sexta 85% */}
          <div className="bg-gradient-to-br from-slate-900 via-zinc-950 to-slate-900 border-2 border-emerald-500/80 rounded-3xl p-5 sm:p-6 shadow-xl text-white space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 shrink-0">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading font-black text-lg sm:text-xl text-white">
                      Painel Financeiro Asaas
                    </h3>
                    <span className="text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {asaasData.isLive ? 'Asaas API Conectada' : 'Asaas via Edge Function'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Controle de cobranças PIX, Cartão e repasse semanal de 85% aos motoristas (chave protegida no servidor)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoadingAsaasData(true);
                    getAsaasFinancialSummary(totalArrecadadoAdmin).then((res) => {
                      setAsaasData(res);
                      setIsLoadingAsaasData(false);
                      showToast('✅ Saldo e dados financeiros do Asaas atualizados!');
                    });
                  }}
                  disabled={isLoadingAsaasData}
                  className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-heading font-bold text-xs rounded-xl border border-zinc-700 transition-all cursor-pointer flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAsaasData ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Atualizar Asaas</span>
                </button>
              </div>
            </div>

            {/* 4 Cards de Métricas Principais Solicitadas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Saldo Asaas */}
              <div className="bg-zinc-900/80 border border-emerald-500/30 rounded-2xl p-4 relative overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider font-mono">Saldo Asaas</span>
                  <Wallet className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-black text-emerald-400">
                  {formatBRL(asaasData.balance)}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Saldo disponível na conta
                </p>
              </div>

              {/* 2. Total Recebido */}
              <div className="bg-zinc-900/80 border border-zinc-700/80 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider font-mono">Total Recebido</span>
                  <DollarSign className="w-4 h-4 text-white" />
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-black text-white">
                  {formatBRL(asaasData.totalReceived)}
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Cobranças de corridas no app
                </p>
              </div>

              {/* 3. Comissão Race 15% - Total arrecadado */}
              <div className="bg-zinc-900/80 border border-amber-500/30 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-amber-400 font-bold uppercase tracking-wider font-mono">Comissão Race 15%</span>
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-black text-amber-400">
                  {formatBRL(asaasData.raceCommission15)}
                </div>
                <p className="text-[11px] text-amber-300/80 mt-1 font-medium">
                  Comissão Race 15% - Total arrecadado
                </p>
              </div>

              {/* 4. Valor a Repassar Sexta para Motoristas (85%) */}
              <div className="bg-zinc-900/80 border border-emerald-500/40 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-emerald-400 font-bold uppercase tracking-wider font-mono">Repassar Sexta (85%)</span>
                  <Calendar className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl sm:text-3xl font-heading font-black text-emerald-300">
                  {formatBRL(asaasData.repassarSexta85)}
                </div>
                <p className="text-[11px] text-emerald-400 mt-1 font-bold">
                  85% para condutores
                </p>
              </div>
            </div>

            {/* Banner de Repasse Sexta-feira às 18:00 */}
            <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-zinc-200">
                  <strong>Próximo Repasse Semanal:</strong> Toda sexta-feira às 18:00 o admin repassa os 85% ({formatBRL(asaasData.repassarSexta85)}) diretamente para as chaves PIX dos condutores.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  const rows = [
                    ['Motorista', 'Chave PIX', 'Total Arrecadado', 'Ganho Líquido (85%)', 'Comissão Race (15%)'],
                    ...overviewDrivers.map((d) => {
                      const driverTotal = d.saldo ? Number((d.saldo / 0.85).toFixed(2)) : 0;
                      const driver85 = d.saldo || 0;
                      const race15 = Number((driverTotal * 0.15).toFixed(2));
                      return [d.name, d.raw?.chave_pix || d.phone || 'PIX pendente', driverTotal.toFixed(2), driver85.toFixed(2), race15.toFixed(2)];
                    })
                  ];
                  const csv = '\uFEFF' + rows.map((r) => r.join(';')).join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `race_repasse_sexta_${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                  showToast('Folha de repasse de sexta-feira exportada com sucesso!');
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer shrink-0 transition-all flex items-center gap-1.5 self-end sm:self-auto"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Repasse Sexta</span>
              </button>
            </div>
          </div>

          {/* Painel Direto: Quem Ganhou Quanto (85% Motorista / 15% Race) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-600" />
                  <span>Quem Ganhou Quanto • Repasse 85% e Comissão Race 15%</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Acompanhe corridas feitas, total arrecadado, ganho do condutor (85%) e comissão retida pela Race (15%).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('drivers')}
                className="text-xs font-heading font-black text-amber-700 hover:text-amber-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span>Ver Todos os {overviewDrivers.length} Condutores</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            {isLoadingUsers ? (
              <div className="text-center py-8 text-slate-500 text-sm flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                <span>Carregando motoristas do Supabase...</span>
              </div>
            ) : overviewDrivers.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Nenhum motorista ou motoboy cadastrado no Supabase no momento.
              </div>
            ) : (
              <div className="space-y-3">
                {overviewDrivers.map((driver) => {
                  const driverRides = supabaseCorridas.filter(
                    (r) => r.driver?.id === driver.id || (driver.email && r.driver?.email?.toLowerCase() === driver.email?.toLowerCase()) || (driver.name && r.driver?.name?.toLowerCase() === driver.name?.toLowerCase())
                  );
                  const driverRidesCount = driverRides.length;
                  const driverTotalArrecadado = Number(driverRides.reduce((acc, r) => acc + Number(r.price || 0), 0).toFixed(2));
                  const driverEarnings85 = Number(
                    driverRides
                      .reduce(
                        (acc, r) =>
                          acc +
                          (typeof r.driverEarnings === 'number'
                            ? r.driverEarnings
                            : calculateRideSplitForDriver(r.price, driver.raw ? { createdAt: driver.raw.created_at } : null, r.createdAt).driverEarnings),
                        0
                      )
                      .toFixed(2)
                  );
                  const driverCommission15 = Number(
                    Math.max(0, driverTotalArrecadado - driverEarnings85).toFixed(2)
                  );
                  const driverSaldoRepassar = driverEarnings85 || driver.saldo || 0;

                  return (
                    <div
                      key={driver.id}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {driver.avatar ? (
                          <img
                            src={driver.avatar}
                            alt={driver.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-amber-500 shadow-xs shrink-0"
                          />
                        ) : (
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-heading font-black text-sm border-2 shadow-xs shrink-0 ${
                            driver.isMotoboy ? 'bg-cyan-100 text-cyan-800 border-cyan-300' : 'bg-amber-100 text-amber-800 border-amber-400'
                          }`}>
                            {driver.name ? driver.name.charAt(0).toUpperCase() : 'M'}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-heading font-black text-slate-950 text-sm sm:text-base">
                              {driver.name}
                            </h4>
                            {driver.plate && (
                              <span className="text-[11px] font-mono bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-300 font-bold uppercase">
                                {driver.plate}
                              </span>
                            )}
                            <span className="text-[11px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded uppercase">
                              {driver.categoryLabel}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                              {driver.userType}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-medium flex-wrap">
                            <span>E-mail: <strong className="text-slate-800">{driver.email}</strong></span>
                            <span>&bull;</span>
                            <span>WhatsApp: <strong className="text-slate-800">{driver.phone}</strong></span>
                            <span>&bull;</span>
                            <span>Login: <strong className="text-slate-800">{driver.login}</strong></span>
                            <span>&bull;</span>
                            <span>Cadastro: {driver.createdAtFormatted}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 justify-between md:justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-200">
                        {/* Quem Ganhou Quanto: Corridas, Total, Ganho 85%, Race 15%, Saldo */}
                        <div className="grid grid-cols-5 gap-2 text-center bg-white p-2.5 rounded-xl border border-slate-200 text-xs shadow-xs">
                          <div className="px-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Corridas</span>
                            <span className="font-heading font-black text-slate-900">{driverRidesCount}</span>
                          </div>
                          <div className="px-1 border-l border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total</span>
                            <span className="font-heading font-black text-slate-900">{formatBRL(driverTotalArrecadado)}</span>
                          </div>
                          <div className="px-1 border-l border-slate-100">
                            <span className="text-[10px] text-emerald-700 font-bold uppercase block">Ganho 85%</span>
                            <span className="font-heading font-black text-emerald-600">{formatBRL(driverEarnings85)}</span>
                          </div>
                          <div className="px-1 border-l border-slate-100">
                            <span className="text-[10px] text-amber-700 font-bold uppercase block">Race 15%</span>
                            <span className="font-heading font-black text-amber-600">{formatBRL(driverCommission15)}</span>
                          </div>
                          <div className="px-1 border-l border-slate-100">
                            <span className="text-[10px] text-blue-700 font-bold uppercase block">Saldo</span>
                            <span className="font-heading font-black text-blue-700">{formatBRL(driverSaldoRepassar)}</span>
                          </div>
                        </div>

                        {/* Botões: Editar, Liberar 7 dias, Bloquear, Ver avaliações */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenAdminEditUser(driver)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                            title="Editar usuário e foto"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleLiberar7Dias(driver.raw)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                            title="Liberar 7 dias e ativar condutor"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Liberar 7 dias</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleBloquear(driver.raw)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-heading font-black text-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                            title="Bloquear condutor"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Bloquear</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleVerAvaliacoes(driver)}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-heading font-black text-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                            title="Ver avaliações do condutor"
                          >
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>Ver avaliações</span>
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

      {/* TAB MOTORISTAS PENDENTES: APROVAÇÃO COM FOTOS CNH FRENTE/VERSO, CRLV, PLACA E MODELO/COR */}
      {activeTab === 'pending_drivers' && (
        <div className="space-y-4">
          {actionToast && (
            <div className="bg-slate-950 text-white border-2 border-[#ff6a00] p-3.5 rounded-2xl flex items-center justify-between shadow-lg">
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

          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-[#ff6a00] flex items-center justify-center font-bold border border-amber-300">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-slate-950 text-xl">
                    Aprovação de Motoristas Pendentes
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    CNH (frente e verso), CRLV, Placa, Modelo e Cor • Somente aprovados ficam ONLINE
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
                {pendingApprovalsList.length} Pendentes
              </span>
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300">
                {approvedApprovalsList.length} Aprovados
              </span>
              <button
                type="button"
                onClick={fetchSupabaseUsuarios}
                disabled={isLoadingUsers}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin text-[#ff6a00]' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>
          </div>

          {pendingApprovalsList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-heading font-black text-slate-900 text-lg">
                Nenhum Motorista Aguardando Aprovação
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto font-medium">
                Quando um novo usuário escolher &ldquo;Quero ser motorista&rdquo; e enviar CNH (frente e verso), CRLV, placa, modelo e cor, o cadastro aparecerá aqui para sua aprovação.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingApprovalsList.map((app) => {
                const isBusy = processingApprovalEmail === app.email;
                const docItems = [
                  { label: 'CNH (Frente)', url: app.cnhFrontPhoto },
                  { label: 'CNH (Verso)', url: app.cnhBackPhoto },
                  { label: 'CRLV do Veículo', url: app.crlvPhoto },
                  { label: 'Foto do Veículo', url: app.vehiclePhoto },
                ];
                return (
                  <div
                    key={app.email}
                    className="bg-white border-2 border-amber-400 rounded-3xl p-5 sm:p-6 shadow-md space-y-4"
                  >
                    {/* Cabeçalho do Motorista */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
                      <div className="flex items-center gap-3.5">
                        {app.avatar ? (
                          <img
                            src={app.avatar}
                            alt={app.name}
                            onClick={() => openDocumentPreview(app.avatar!, `Foto de Perfil — ${app.name}`)}
                            className="w-14 h-14 rounded-full object-cover border-2 border-amber-500 cursor-pointer shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-900 border-2 border-amber-500 flex items-center justify-center font-heading font-black text-xl shrink-0">
                            {(app.name || 'M').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-heading font-black text-slate-950 text-lg">
                              {app.name || 'Condutor RACE'}
                            </h4>
                            <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                              PENDENTE ADM
                            </span>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200 uppercase">
                              {String(app.category || 'economica').replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-mono mt-0.5">
                            {app.email} &bull; WhatsApp: <strong className="text-slate-900">{app.whatsapp || app.phone || 'Não informado'}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right text-xs font-mono text-slate-500">
                        <span className="block font-bold">Enviado em:</span>
                        <span>{app.submittedAt ? new Date(app.submittedAt).toLocaleString('pt-BR') : 'Recentemente'}</span>
                      </div>
                    </div>

                    {/* Dados do Veículo e CNH */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block font-bold uppercase text-[10px]">Modelo</span>
                        <strong className="text-slate-950 text-sm">{app.vehicleModel || '—'}</strong>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block font-bold uppercase text-[10px]">Cor</span>
                        <strong className="text-slate-950 text-sm">{app.vehicleColor || '—'}</strong>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block font-bold uppercase text-[10px]">Placa</span>
                        <strong className="text-slate-950 font-mono text-sm uppercase">{app.vehiclePlate || '—'}</strong>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <span className="text-slate-500 block font-bold uppercase text-[10px]">Ano</span>
                        <strong className="text-slate-950 font-mono text-sm">{app.vehicleYear || '—'}</strong>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                        <span className="text-slate-500 block font-bold uppercase text-[10px]">CNH</span>
                        <strong className="text-slate-950 font-mono text-sm">{app.cnh || '—'}</strong>
                      </div>
                    </div>

                    {/* Fotos Enviadas (Clique para ampliar) */}
                    <div className="space-y-2">
                      <span className="text-xs font-heading font-black text-slate-700 uppercase tracking-wider block">
                        Documentos Enviados (Toque na foto para ampliar):
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {docItems.map((doc) => (
                          <div
                            key={doc.label}
                            className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex flex-col items-center gap-2"
                          >
                            <span className="text-[11px] font-heading font-black text-slate-800 text-center">
                              {doc.label}
                            </span>
                            {doc.url ? (
                              <button
                                type="button"
                                onClick={() => openDocumentPreview(doc.url!, `${doc.label} — ${app.name}`)}
                                className="w-full group relative rounded-xl overflow-hidden border border-slate-300 cursor-pointer"
                              >
                                <img
                                  src={doc.url}
                                  alt={doc.label}
                                  className="w-full h-28 object-cover group-hover:scale-105 transition-transform"
                                />
                                <span className="absolute bottom-1 right-1 bg-slate-950/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                                  Ampliar
                                </span>
                              </button>
                            ) : (
                              <div className="w-full h-28 rounded-xl bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center text-[11px] font-bold text-slate-400 text-center px-2">
                                Não enviada
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Motivo opcional + Botões Aprovar / Reprovar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-slate-200">
                      <input
                        type="text"
                        value={rejectionReasonInputs[app.email] || ''}
                        onChange={(e) =>
                          setRejectionReasonInputs((prev) => ({
                            ...prev,
                            [app.email]: e.target.value,
                          }))
                        }
                        placeholder="Motivo caso reprove (ex: CNH ilegível ou CRLV vencido)"
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                      />

                      <div className="flex items-center gap-2.5 shrink-0">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRejectPendingDriver(app)}
                          className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-heading font-black text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>Reprovar</span>
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleApprovePendingDriver(app)}
                          className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isBusy ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                          <span>Aprovar Motorista</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Lista de Reprovados (com opção de ver fotos ou reaprovar) */}
          {rejectedApprovalsList.length > 0 && (
            <div className="bg-white border border-rose-200 rounded-3xl p-5 space-y-3 shadow-sm">
              <h4 className="font-heading font-black text-rose-900 text-sm uppercase tracking-wider">
                Cadastros Reprovados ({rejectedApprovalsList.length})
              </h4>
              <div className="space-y-2.5">
                {rejectedApprovalsList.map((app) => (
                  <div
                    key={app.email}
                    className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="font-heading font-black text-slate-950 text-sm">{app.name}</strong>
                        <span className="font-mono text-slate-600">{app.email}</span>
                        <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-rose-200 text-rose-800">
                          {app.vehicleModel} • {app.vehicleColor} • {app.vehiclePlate}
                        </span>
                      </div>
                      {app.rejectionReason && (
                        <p className="text-rose-800 font-medium">Motivo: {app.rejectionReason}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {app.cnhFrontPhoto && (
                        <button
                          type="button"
                          onClick={() => openDocumentPreview(app.cnhFrontPhoto!, `CNH (Frente) — ${app.name}`)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold cursor-pointer"
                        >
                          Ver CNH Frente
                        </button>
                      )}
                      {app.crlvPhoto && (
                        <button
                          type="button"
                          onClick={() => openDocumentPreview(app.crlvPhoto!, `CRLV — ${app.name}`)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold cursor-pointer"
                        >
                          Ver CRLV
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleApprovePendingDriver(app)}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs cursor-pointer"
                      >
                        Aprovar Agora
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB SAQUES: LISTA DE SAQUES PENDENTES E BOTÃO PAGAR */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold border border-emerald-300">
                  <ArrowDownCircle className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-slate-950 text-xl">
                    Solicitações de Saque dos Motoristas
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Repasses via PIX toda sexta-feira (85% para o motorista • 15% Comissão Race)
                  </span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
                Passageiros pagam dentro do app via Asaas. A comissão Race (15%) já é retida na origem e o motorista saca 85% líquido sem mensalidade.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300">
                {pendingWithdrawals.length} {pendingWithdrawals.length === 1 ? 'pendente' : 'pendentes'}
              </span>
            </div>
          </div>

          {/* Lista de Saques */}
          {withdrawalsList.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-sm">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="font-heading font-black text-slate-900 text-lg">
                Nenhum Saque Solicitado no Momento
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto font-medium">
                Assim que os motoristas acumularem saldo de corridas pagas e solicitarem saque, os pedidos aparecerão aqui para repasse via PIX.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {withdrawalsList.map((w) => (
                <div
                  key={w.id}
                  className={`bg-white border-2 rounded-3xl p-5 sm:p-6 shadow-md transition-all space-y-4 ${
                    w.status === 'pending' ? 'border-amber-400' : 'border-slate-200 opacity-90'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-heading font-black text-slate-950 text-base sm:text-lg">
                          {w.driverName}
                        </span>
                        <span className="font-mono text-xs text-slate-500 font-bold">
                          #{w.id}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-black px-2.5 py-0.5 rounded-full uppercase border ${
                            w.status === 'pending'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          {w.status === 'pending' ? '⏳ Pendente de Envio' : '✓ Pago via PIX'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {w.driverPhone && `WhatsApp: ${w.driverPhone} • `}
                        Solicitado em {new Date(w.requestedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">Valor Líquido a Transferir</span>
                      <span className="text-2xl sm:text-3xl font-heading font-black text-emerald-700">
                        {formatBRL(w.netAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Detalhes Financeiros: Saldo Acumulado (85%), Comissão Race 15% Já Descontada, Valor do PIX */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block font-medium">Saldo Acumulado (85%):</span>
                      <span className="font-heading font-black text-slate-900 text-sm">
                        {formatBRL(w.grossAmount)}
                      </span>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                      <span className="text-amber-800 block font-medium">Comissão Race 15%:</span>
                      <span className="font-heading font-black text-amber-900 text-sm">
                        Já descontada na corrida
                      </span>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                      <span className="text-emerald-800 block font-medium">Valor do PIX ao Motorista:</span>
                      <span className="font-heading font-black text-emerald-900 text-sm">
                        {formatBRL(w.netAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Chave PIX e Botão Pagar */}
                  <div className="bg-slate-100/80 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-700">Chave PIX do Motorista:</span>
                      <span className="font-mono font-black text-sm bg-white px-3 py-1 rounded-lg border border-slate-300 text-slate-950 shadow-xs">
                        {w.pixKey}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(w.pixKey);
                          setCopiedKey(w.id);
                          setTimeout(() => setCopiedKey(null), 2500);
                        }}
                        className="text-xs bg-white hover:bg-slate-50 text-slate-700 font-bold px-2.5 py-1 rounded-lg border border-slate-300 cursor-pointer transition-all flex items-center gap-1 active:scale-95"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedKey === w.id ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>

                    {w.status === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => handlePayWithdrawal(w.id, w.driverName, w.netAmount)}
                        className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-heading font-black text-xs sm:text-sm py-2.5 px-5 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border border-emerald-400"
                      >
                        <Check className="w-4 h-4" />
                        <span>Pagar {formatBRL(w.netAmount)}</span>
                      </button>
                    ) : (
                      <div className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                        <CheckCheck className="w-4 h-4 text-emerald-600" />
                        <span>Pago via PIX em {w.paidAt ? new Date(w.paidAt).toLocaleDateString('pt-BR') : 'Hoje'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
                    Auditoria de Repasses e Saques via PIX
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Conta: {RACE_PIX_BANK} &bull; Modelo: 85% Condutor / 15% Race
                  </span>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium">
                Confira os comprovantes bancários e solicitações de repasse. Motoristas recebem 85% líquido de cada corrida sem cobrança de mensalidade.
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
                        {(() => {
                          const matchedAvatar =
                            driver.avatar ||
                            parsedUsers.find(
                              (pu) =>
                                pu.id === driver.id ||
                                (driver.email && pu.email.toLowerCase() === driver.email.toLowerCase())
                            )?.avatar;
                          return matchedAvatar ? (
                            <img
                              src={matchedAvatar}
                              alt={driver.name}
                              className="w-13 h-13 rounded-2xl object-cover border-2 border-amber-400 shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-13 h-13 rounded-2xl bg-amber-100 text-amber-800 border-2 border-amber-400 shadow-xs shrink-0 flex items-center justify-center font-heading font-black text-lg">
                              {(driver.name || 'M').charAt(0).toUpperCase()}
                            </div>
                          );
                        })()}
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
                title="Ativar e liberar todos os motoristas com status ONLINE"
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

          {/* SUB-ABAS: TODOS VS MOTORISTAS/MOTOBOYS VS PASSAGEIROS (SUPABASE) */}
          <div className="bg-white border border-slate-200 p-1.5 rounded-2xl flex items-center gap-2 shadow-xs flex-wrap">
            <button
              type="button"
              onClick={() => setCadastrosSubTab('all')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-[140px] ${
                cadastrosSubTab === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Database className="w-4 h-4 text-slate-900" />
              <span>Todos ({parsedUsers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setCadastrosSubTab('drivers')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-[140px] ${
                cadastrosSubTab === 'drivers'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Car className="w-4 h-4 text-slate-900" />
              <span>Motoristas & Motos ({parsedUsers.filter(u => !u.isPassenger).length})</span>
            </button>

            <button
              type="button"
              onClick={() => setCadastrosSubTab('passengers')}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-heading font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-[140px] ${
                cadastrosSubTab === 'passengers'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Users className="w-4 h-4 text-slate-900" />
              <span>Passageiros ({parsedUsers.filter(u => u.isPassenger).length})</span>
            </button>
          </div>

          {/* Filters, Search & Atualizar Supabase */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-3.5 shadow-md">
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, e-mail, login, WhatsApp, placa ou modelo no Supabase..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-11 pr-4 py-2.5 text-sm sm:text-base text-slate-950 placeholder-slate-400 focus:outline-none focus:border-amber-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-5 h-5 text-slate-500 shrink-0" />
              <select
                value={driverFilterCategory}
                onChange={(e) => setDriverFilterCategory(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-amber-500 font-medium flex-1 sm:flex-none"
              >
                <option value="all">Todas Categorias</option>
                <option value="economica">Econômica</option>
                <option value="confort">Confort</option>
                <option value="moto_passageiro">Moto Passageiro</option>
                <option value="moto_entrega">Moto Entrega</option>
                <option value="passenger">Passageiro</option>
              </select>

              <button
                type="button"
                onClick={fetchSupabaseUsuarios}
                disabled={isLoadingUsers}
                className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 active:scale-95 shadow-xs"
                title="Sincronizar com o Supabase agora"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? 'animate-spin text-[#ff6a00]' : ''}`} />
                <span className="hidden sm:inline">Recarregar</span>
              </button>
            </div>
          </div>

          {supabaseUsersError && (
            <div className="bg-rose-50 border border-rose-300 text-rose-900 p-4 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Aviso Supabase: {supabaseUsersError}</span>
              </div>
              <button
                type="button"
                onClick={fetchSupabaseUsuarios}
                className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-500 cursor-pointer"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {/* LISTA COMPLETA DE USUÁRIOS DO SUPABASE (TABELA public.usuarios) */}
          <div className="space-y-3.5">
            {isLoadingUsers ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500 space-y-3 shadow-sm">
                <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
                <p className="font-heading font-bold text-base text-slate-800">
                  Consultando tabela public.usuarios no Supabase...
                </p>
                <p className="text-xs text-slate-400">
                  Carregando fotos, nomes, contatos e dados veiculares da nuvem
                </p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 shadow-sm space-y-2">
                <p className="font-heading font-bold text-base text-slate-800">
                  Nenhum cadastro encontrado para os filtros selecionados.
                </p>
                <p className="text-xs text-slate-500">
                  {searchQuery ? `Nenhum resultado para "${searchQuery}".` : 'Nenhum usuário registrado no Supabase nesta categoria.'}
                </p>
              </div>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-md hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0 w-full sm:w-auto">
                    {/* Foto (se tiver no cadastro) */}
                    {u.avatar ? (
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-amber-500 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center font-heading font-black text-lg border-2 shadow-sm shrink-0 ${
                        u.isPassenger 
                          ? 'bg-blue-100 text-blue-800 border-blue-300' 
                          : u.isMotoboy 
                          ? 'bg-cyan-100 text-cyan-800 border-cyan-300' 
                          : 'bg-amber-100 text-amber-800 border-amber-400'
                      }`}>
                        {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Nome + Badges de Tipo e Categoria */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-heading font-black text-slate-900 text-base sm:text-lg">
                          {u.name}
                        </h4>

                        {/* Tipo: Motorista / Motoboy / Passageiro */}
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                          u.isPassenger
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : u.isMotoboy
                            ? 'bg-cyan-50 text-cyan-800 border-cyan-200'
                            : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}>
                          {u.userType}
                        </span>

                        {/* Categoria: Econômico, Confort, Motoboy Passageiro, Motoboy Entregas */}
                        <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold border border-slate-200">
                          {u.categoryLabel}
                        </span>

                        {u.plate && (
                          <span className="text-xs font-mono bg-slate-900 text-amber-400 px-2.5 py-0.5 rounded font-bold uppercase">
                            {u.plate}
                          </span>
                        )}

                        <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                          ⭐ {u.rating.toFixed(1)}
                        </span>
                      </div>

                      {/* Dados veiculares e documentos mascarados (apenas 4 últimos dígitos) */}
                      {(u.model || u.cnh || u.cpf) && (
                        <p className="text-xs sm:text-sm text-slate-600 font-medium">
                          {u.model && <span>{u.model} {u.year ? `(${u.year})` : ''}</span>}
                          {u.model && (u.cnh || u.cpf) && <span> &bull; </span>}
                          {u.cnh && <span className="font-mono">CNH: {u.cnh}</span>}
                          {u.cnh && u.cpf && <span> &bull; </span>}
                          {u.cpf && <span className="font-mono">CPF: {u.cpf}</span>}
                        </p>
                      )}

                      {/* E-mail, WhatsApp, Login, Data de cadastro (created_at) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-600 font-medium pt-1">
                        <div>
                          <span className="text-slate-400 text-[10px] block font-bold uppercase">E-mail:</span>
                          <strong className="text-slate-900 truncate block">{u.email}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-bold uppercase">WhatsApp:</span>
                          <strong className="text-slate-900 block">{u.phone}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-bold uppercase">Login:</span>
                          <strong className="text-slate-900 block font-mono">{u.login}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-bold uppercase">Data de Cadastro:</span>
                          <span className="text-slate-700 block">{u.createdAtFormatted}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lado Direito: Saldo, Modelo 85%/15% e os 3 Botões (Liberar 7 dias, Bloquear, Ver avaliações) */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between gap-3 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-200">
                    {/* Saldo e Modelo */}
                    <div className="flex items-center gap-2.5 text-left lg:text-right flex-wrap">
                      <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                        <span className="text-[10px] text-slate-500 block font-bold uppercase">Saldo em Carteira</span>
                        <strong className="text-sm font-heading font-black text-emerald-700">
                          R$ {u.saldo.toFixed(2)}
                        </strong>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                        <span className="text-[10px] text-slate-500 block font-bold uppercase">Modelo de Repasse</span>
                        <span className={`text-xs font-black block ${
                          u.statusInfo.status === 'bloqueado'
                            ? 'text-rose-700'
                            : u.isPassenger
                            ? 'text-blue-700'
                            : 'text-emerald-700'
                        }`}>
                          {u.statusInfo.status === 'bloqueado'
                            ? '⛔ Bloqueado'
                            : u.isPassenger
                            ? 'Passageiro'
                            : '85% Motorista / 15% Race'}
                        </span>
                      </div>
                    </div>

                    {/* Botões de Controle ADM: Editar, Ativar / Liberar 7 dias, Bloquear, Remover, Ver avaliações */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Botão Editar */}
                      <button
                        type="button"
                        onClick={() => handleOpenAdminEditUser(u)}
                        className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        title="Editar nome, e-mail, WhatsApp e foto"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      {/* Botão 1: Ativar / Liberar 7 dias */}
                      <button
                        type="button"
                        onClick={() => handleLiberar7Dias(u.raw)}
                        className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        title="Ativar usuário e liberar 7 dias"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ativar / 7 dias</span>
                      </button>

                      {/* Botão 2: Bloquear */}
                      <button
                        type="button"
                        onClick={() => handleBloquear(u.raw)}
                        className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-heading font-black text-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        title="Bloquear usuário"
                      >
                        <XCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Bloquear</span>
                      </button>

                      {/* Botão 3: Remover usuário */}
                      {u.email?.toLowerCase() !== 'admin@race.com.br' && (
                        <button
                          type="button"
                          onClick={() => handleRemoverSupabaseUser(u.raw)}
                          className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-heading font-black text-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                          title="Remover usuário do Supabase e do app"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Remover</span>
                        </button>
                      )}

                      {/* Botão 4: Ver avaliações */}
                      <button
                        type="button"
                        onClick={() => handleVerAvaliacoes(u)}
                        className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 font-heading font-black text-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        title="Ver avaliações e comentários deste usuário"
                      >
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span>Avaliações</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
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
              {supabaseCorridas.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center space-y-2">
                  <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-heading font-black text-slate-800 text-base">
                    Nenhuma corrida ainda
                  </p>
                  <p className="text-xs text-slate-500">
                    Assim que uma corrida real for realizada no aplicativo, ela aparecerá aqui direto do Supabase.
                  </p>
                </div>
              ) : (
                supabaseCorridas.map((ride) => (
                  <div
                    key={ride.id}
                    className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-mono font-extrabold text-amber-800 text-sm">{ride.id}</span>
                        <span className="bg-slate-200 text-slate-800 px-2 py-0.5 rounded text-xs uppercase font-extrabold">
                          {ride.category.replace('_', ' ')}
                        </span>
                        <span className="text-emerald-700 font-bold">{ride.status}</span>
                        {ride.confirmationCode && (
                          <span className="bg-slate-950 text-[#ff6a00] border border-[#ff6a00]/60 px-2.5 py-0.5 rounded-lg font-mono font-black text-xs tracking-wider">
                            🔐 Código: {ride.confirmationCode}
                          </span>
                        )}
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
                      {(() => {
                        const split = calculateRideSplitForDriver(ride.price, ride.driver, ride.createdAt);
                        const dEarns = typeof ride.driverEarnings === 'number' ? ride.driverEarnings : split.driverEarnings;
                        const pFee = typeof ride.platformFee === 'number' ? ride.platformFee : split.platformFee;
                        const isZeroFee = pFee === 0;
                        return (
                          <>
                            <span className="text-xs text-emerald-700 block font-extrabold">
                              Condutor ({isZeroFee ? '100%' : '85%'}): {formatBRL(dEarns)}
                            </span>
                            <span className="text-xs text-amber-700 font-bold">
                              Comissão Race ({isZeroFee ? '0% Promo' : '15%'}): {formatBRL(pFee)}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))
              )}
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
              <span className="text-xs text-slate-500 uppercase font-black block">Comissão Race 15% - Total arrecadado</span>
              <p className="text-emerald-700 text-sm font-bold">85% Motorista • 15% Race • Sem Mensalidade</p>
              <p className="text-slate-700 text-xs font-medium">
                Você fica com 85% de cada corrida, Race fica com 15% - sem mensalidade, sem taxa para trabalhar. Repasse toda sexta-feira.
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

      {/* TAB: REVIEWS & RECLAMAÇÕES (O QUE DEU ERRADO?) */}
      {activeTab === 'reviews' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header & Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase block">Média da Frota</span>
                <span className="font-heading font-black text-2xl text-slate-900">
                  {avgFleetRating}{' '}
                  <span className="text-amber-500 text-lg">★</span>
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase block">Total de Avaliações</span>
                <span className="font-heading font-black text-2xl text-slate-900">
                  {reviewsList.length}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                criticalIssues.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-50 text-emerald-700'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase block">Reclamações Críticas (1-2★)</span>
                <span className={`font-heading font-black text-2xl ${
                  criticalIssues.length > 0 ? 'text-rose-700' : 'text-emerald-700'
                }`}>
                  {criticalIssues.length} {criticalIssues.length === 1 ? 'caso' : 'casos'}
                </span>
              </div>
            </div>
          </div>

          {/* Destaque para Reclamações 1 e 2 estrelas: "O que deu errado?" */}
          <div className="bg-white border-2 border-rose-300 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-rose-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black shadow-sm">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg">
                    Reclamações Críticas &bull; "O que deu errado?" (1 e 2 Estrelas)
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Relatórios enviados pelos passageiros para auditoria imediata da administração RACE
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full border border-rose-200">
                {criticalIssues.length} pendência(s) de atenção
              </span>
            </div>

            {criticalIssues.length === 0 ? (
              <div className="p-6 text-center bg-emerald-50 rounded-2xl border border-emerald-200">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <p className="font-heading font-black text-emerald-950 text-sm">
                  Nenhuma reclamação crítica pendente!
                </p>
                <p className="text-xs text-emerald-700 mt-1">
                  Todos os passageiros avaliaram os condutores com 3 ou mais estrelas.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {criticalIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-4 sm:p-5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-rose-200 text-rose-800 font-bold flex items-center justify-center text-sm border border-rose-300">
                          {issue.passengerName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-heading font-black text-slate-950 text-sm">
                              {issue.passengerName}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">avaliou</span>
                            <span className="font-bold text-slate-900 text-sm">
                              {issue.driverName}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {issue.driverVehicle} &bull; {new Date(issue.createdAt).toLocaleDateString('pt-BR')} às {new Date(issue.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-rose-600 text-white px-3 py-1 rounded-xl text-xs font-black shadow-xs self-start sm:self-auto">
                        <span>{issue.rating}</span>
                        <Star className="w-3.5 h-3.5 fill-white" />
                      </div>
                    </div>

                    {/* Comentário geral do passageiro */}
                    {issue.comment && (
                      <div className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-rose-200/80">
                        <strong className="text-slate-900 block mb-0.5">Comentário do passageiro:</strong>
                        &ldquo;{issue.comment}&rdquo;
                      </div>
                    )}

                    {/* Campo obrigatório de incidente: O que deu errado? */}
                    <div className="text-xs text-rose-950 bg-rose-100/90 p-3.5 rounded-xl border-2 border-rose-300 space-y-1">
                      <div className="flex items-center gap-1.5 font-heading font-black text-rose-900 text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                        <span>Relatório: O que deu errado?</span>
                      </div>
                      <p className="font-bold leading-relaxed">
                        {issue.issueComment || 'O passageiro não detalhou o incidente, mas atribuiu nota baixa.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Todas as Avaliações com Filtro */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg">
                  Histórico de Todas as Avaliações ({reviewsList.length})
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  Feed completo com notas, elogios, comentários e tags de feedback
                </p>
              </div>

              {/* Filtros por estrelas */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setReviewFilterStars('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reviewFilterStars === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Todas ({reviewsList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilterStars('issues')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reviewFilterStars === 'issues'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Alertas (1-2★) ({criticalIssues.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilterStars('5')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reviewFilterStars === '5'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  5★ ({reviewsList.filter((r) => r.rating === 5).length})
                </button>
                <button
                  type="button"
                  onClick={() => setReviewFilterStars('4')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reviewFilterStars === '4'
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  4★ ({reviewsList.filter((r) => r.rating === 4).length})
                </button>
              </div>
            </div>

            {/* Lista Filtrada */}
            {(() => {
              const displayed = reviewsList.filter((r) => {
                if (reviewFilterStars === 'issues') return r.rating <= 2;
                if (reviewFilterStars === '5') return r.rating === 5;
                if (reviewFilterStars === '4') return r.rating === 4;
                if (reviewFilterStars === '3') return r.rating === 3;
                return true;
              });

              if (displayed.length === 0) {
                return (
                  <p className="text-center text-slate-500 text-xs py-8 font-medium">
                    Nenhuma avaliação encontrada para o filtro selecionado.
                  </p>
                );
              }

              return (
                <div className="divide-y divide-slate-100">
                  {displayed.map((r) => (
                    <div key={r.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                            {r.passengerName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-heading font-black text-xs text-slate-900 block">
                              {r.passengerName}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Motorista: <strong>{r.driverName}</strong> ({r.driverVehicle})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= r.rating
                                    ? 'text-amber-500 fill-amber-500'
                                    : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>

                      {r.comment && (
                        <p className="text-xs text-slate-700 pl-10 font-medium">
                          &ldquo;{r.comment}&rdquo;
                        </p>
                      )}

                      {r.issueComment && (
                        <div className="ml-10 text-[11px] text-rose-800 bg-rose-50 p-2 rounded-lg border border-rose-200">
                          <strong>O que deu errado:</strong> {r.issueComment}
                        </div>
                      )}

                      {r.tags && r.tags.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pl-10 pt-0.5">
                          {r.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB: INDICAÇÕES & BÔNUS R$50 */}
      {activeTab === 'referrals' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-heading font-black text-xl sm:text-2xl flex items-center gap-2">
                <Gift className="w-6 h-6" />
                <span>Promoção Indicação R$50 & Taxa 0% Lançamento</span>
              </h3>
              <p className="text-xs sm:text-sm text-amber-50 font-medium">
                Acompanhe todas as indicações entre motoristas/motoboys e os bônus de R$ 50,00 gerados automaticamente ao completar 10 corridas finalizadas.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchSupabaseUsuarios}
              className="px-4 py-2.5 rounded-xl bg-black/25 hover:bg-black/40 border border-white/30 text-white text-xs font-heading font-black flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Atualizar Dados</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-bold uppercase text-slate-500 block">Indicados Cadastrados</span>
              <span className="text-3xl font-heading font-black text-slate-950">{adminReferrals.length}</span>
            </div>
            <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-bold uppercase text-emerald-700 block">Bônus Pagos (R$50)</span>
              <span className="text-3xl font-heading font-black text-emerald-700">{referralBonusesAdmin.length}</span>
            </div>
            <div className="bg-white border border-orange-200 rounded-2xl p-5 shadow-xs">
              <span className="text-xs font-bold uppercase text-orange-700 block">Total em Bônus Creditados</span>
              <span className="text-3xl font-heading font-black text-[#ff6a00]">
                {formatBRL(referralBonusesAdmin.reduce((acc, p) => acc + Number(p.valor || REFERRAL_BONUS_AMOUNT), 0))}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
            <h4 className="font-heading font-black text-slate-950 text-base">
              Indicações Registradas ({adminReferrals.length})
            </h4>
            {adminReferrals.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Nenhuma indicação registrada ainda em public.usuarios.
              </p>
            ) : (
              <div className="space-y-3">
                {adminReferrals.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-heading font-black text-slate-950 text-sm">{item.nome}</span>
                        <span className="text-[11px] font-mono bg-white border border-slate-300 px-2 py-0.5 rounded text-slate-700">
                          {item.tipo}
                        </span>
                        {item.bonusPaid ? (
                          <span className="text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                            ✓ Bônus R$50 Creditado
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full">
                            Progresso: {item.ridesCount}/{REFERRAL_REQUIRED_RIDES} corridas
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">
                        E-mail: <strong>{item.email}</strong> &bull; Indicado por WhatsApp/Código: <strong className="font-mono text-[#ff6a00]">{item.indicadoPor}</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
            <h4 className="font-heading font-black text-slate-950 text-base">
              Histórico de Bônus Pago (tipo = bonus_indicacao)
            </h4>
            {referralBonusesAdmin.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Nenhum bônus de indicação criado em public.pagamentos ainda.
              </p>
            ) : (
              <div className="space-y-2.5">
                {referralBonusesAdmin.map((bonus, idx) => {
                  const meta = parseReferralBonusMeta(bonus.comprovante_url, bonus.chave_pix);
                  return (
                    <div
                      key={bonus.id || `adm-bonus-${idx}`}
                      className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <p className="text-xs font-black text-emerald-950">
                          Indicador: {bonus.nome_motorista || bonus.email_motorista}
                        </p>
                        <p className="text-xs text-emerald-800 font-medium">
                          {formatReferralBonusMessage(meta.indicatedName)}
                        </p>
                      </div>
                      <span className="font-mono font-black text-emerald-700 text-base shrink-0">
                        +{formatBRL(Number(bonus.valor || REFERRAL_BONUS_AMOUNT))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: NUVEM SUPABASE */}
      {activeTab === 'supabase' && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Banner de Conexão */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-black text-white p-6 rounded-3xl border border-zinc-800 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black">
                  <Cloud className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-xl text-white flex items-center gap-2">
                    <span>Nuvem Supabase Conectada</span>
                    <span className="text-[11px] bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-mono">
                      LIVE
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium">
                    Persistência em nuvem oficial para substituir o armazenamento local mantendo isolamento de dados
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isTestingSupabase}
                  onClick={async () => {
                    setIsTestingSupabase(true);
                    try {
                      const health = await testSupabaseConnection();
                      setSupabaseHealth(health);
                      showToast(health.details);
                    } finally {
                      setIsTestingSupabase(false);
                    }
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-heading font-black transition-all cursor-pointer flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTestingSupabase ? 'animate-spin' : ''}`} />
                  <span>{isTestingSupabase ? 'Testando...' : 'Testar Conexão'}</span>
                </button>

                <button
                  type="button"
                  disabled={isSyncingSupabase}
                  onClick={async () => {
                    setIsSyncingSupabase(true);
                    let count = 0;
                    try {
                      for (const d of drivers) {
                        await saveUsuarioSupabase({
                          nome: d.name,
                          email: d.email,
                          celular: d.phone,
                          whatsapp: d.phone,
                          login: d.email.split('@')[0],
                          senha: '',
                          tipo: d.category === 'economica' ? 'motorista_economico' : d.category === 'confort' ? 'motorista_confort' : 'motoboy_passageiro',
                          categoria: d.category,
                          placa: d.vehiclePlate,
                          modelo: d.vehicleModel,
                          ano: d.vehicleYear,
                          cnh: d.cnh,
                          foto: d.avatar,
                          rating: d.rating,
                          saldo: d.walletBalance || 0,
                        });
                        count++;
                      }
                      for (const p of passengers) {
                        await saveUsuarioSupabase({
                          nome: p.name,
                          email: p.email,
                          celular: p.phone,
                          whatsapp: p.whatsapp || p.phone,
                          login: p.login || p.email.split('@')[0],
                          senha: '',
                          tipo: 'passenger',
                          foto: p.avatar,
                          rating: p.rating || 0,
                        });
                        count++;
                      }
                      showToast(`Sincronização concluída! ${count} cadastros enviados para a nuvem Supabase.`);
                    } catch (err: any) {
                      showToast(`Erro na sincronização: ${err?.message || 'Tente novamente'}`);
                    } finally {
                      setIsSyncingSupabase(false);
                    }
                  }}
                  className="px-4 py-2.5 bg-[#ff6a00] hover:bg-[#e05e00] text-white rounded-xl text-xs font-heading font-black transition-all cursor-pointer flex items-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{isSyncingSupabase ? 'Enviando...' : 'Sincronizar Cadastros'}</span>
                </button>
              </div>
            </div>

            {/* Credenciais e Detalhes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2 border-t border-zinc-800">
              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 space-y-1">
                <span className="text-zinc-400 font-mono text-[11px] uppercase block">Project URL (Supabase)</span>
                <span className="text-emerald-400 font-mono font-bold select-all break-all block">{SUPABASE_URL}</span>
              </div>
              <div className="bg-zinc-900/80 p-3 rounded-xl border border-zinc-800 space-y-1">
                <span className="text-zinc-400 font-mono text-[11px] uppercase block">Publishable Anon Key</span>
                <span className="text-[#ff6a00] font-mono font-bold select-all break-all block">{SUPABASE_ANON_KEY}</span>
              </div>
            </div>

            {supabaseHealth && (
              <div className={`p-3.5 rounded-xl border text-xs ${
                supabaseHealth.connected ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-200' : 'bg-rose-950/70 border-rose-500/40 text-rose-200'
              }`}>
                <strong>Status do Teste:</strong> {supabaseHealth.details}
              </div>
            )}
          </div>

          {/* 3 Tabelas Oficiais Criadas no Supabase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tabela 1: usuarios */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[11px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-mono font-bold">
                  public.usuarios
                </span>
              </div>
              <h4 className="font-heading font-black text-slate-900 text-base">Tabela de Usuários</h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Armazena motoristas, motoboys, passageiros e login administrativo.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 space-y-0.5">
                <p>• id (chave primária)</p>
                <p>• nome, email, celular, whatsapp</p>
                <p>• login (somente identificador; senha no Supabase Auth)</p>
                <p>• tipo, categoria</p>
                <p>• placa, modelo, ano, cnh (mascarada), foto</p>
                <p>• rating, saldo, divida</p>
              </div>
            </div>

            {/* Tabela 2: corridas */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                  <Car className="w-5 h-5" />
                </div>
                <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-mono font-bold">
                  public.corridas
                </span>
              </div>
              <h4 className="font-heading font-black text-slate-900 text-base">Tabela de Corridas</h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Histórico em tempo real de cada corrida realizada com isolamento estrito de acesso.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 space-y-0.5">
                <p>• id (chave primária)</p>
                <p>• id_passageiro, email_passageiro</p>
                <p>• id_motorista, email_motorista</p>
                <p>• origem (JSONB), destino (JSONB)</p>
                <p>• valor, status, data</p>
                <p>• rating_dado, comentario</p>
              </div>
            </div>

            {/* Tabela 3: pagamentos */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="text-[11px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-mono font-bold">
                  public.pagamentos
                </span>
              </div>
              <h4 className="font-heading font-black text-slate-900 text-base">Tabela de Pagamentos</h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Registro de corridas pagas no app e saques de condutores (85% repasse / 15% Race).
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-mono text-slate-700 space-y-0.5">
                <p>• id (chave primária)</p>
                <p>• id_motorista, nome_motorista</p>
                <p>• valor (tarifa da corrida ou saque)</p>
                <p>• status (pending, approved, completed)</p>
                <p>• chave_pix do condutor para repasse</p>
                <p>• data, comprovante_url</p>
              </div>
            </div>
          </div>

          {/* Regras de Isolamento de Dados, Segurança & Backup */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h4 className="font-heading font-black text-slate-950 text-base flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Segurança RLS, Proteção de Chaves & Backup Diário</span>
              </h4>
              <button
                type="button"
                onClick={exportSafeBackupJSON}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-heading font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 active:scale-95"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Exportar Backup JSON (Seguro)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700">
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                <strong className="text-emerald-950 block mb-1">Passageiro (RLS Ativo):</strong>
                Vê exclusivamente suas próprias corridas solicitadas e histórico de rotas.
              </div>
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
                <strong className="text-amber-950 block mb-1">Motorista / Motoboy (RLS Ativo):</strong>
                Vê corridas disponíveis da sua categoria e suas próprias corridas aceitas.
              </div>
              <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200">
                <strong className="text-purple-950 block mb-1">Admin Geral (role = 'admin'):</strong>
                Acesso total via RLS ativo nas 5 tabelas (<code className="font-mono">usuarios</code>, <code className="font-mono">corridas</code>, <code className="font-mono">motoristas</code>, <code className="font-mono">pagamentos</code>, <code className="font-mono">avaliacoes</code>), autenticação Supabase Auth e CPF/CNH mascarados.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <strong className="text-slate-900 block">Chave Asaas Protegida no Backend:</strong>
                <p className="text-slate-600 leading-relaxed">
                  Nenhuma chave secreta fica no código do navegador. A variável <code className="font-mono bg-slate-200 px-1 rounded">ASAAS_API_KEY</code> é lida exclusivamente no servidor (<code className="font-mono bg-slate-200 px-1 rounded">/api/asaas</code> ou Edge Function <code className="font-mono bg-slate-200 px-1 rounded">asaas-proxy</code>).
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <strong className="text-slate-900 block">Automated Daily Backups (Supabase):</strong>
                <p className="text-slate-600 leading-relaxed">
                  No painel do Supabase, acesse <strong className="text-slate-800">Settings &rarr; Database &rarr; Backups</strong> para confirmar os backups automáticos diários (Daily Backups) da sua base de produção.
                </p>
              </div>
            </div>
          </div>

          {/* Script SQL para o Supabase SQL Editor */}
          <div className="bg-slate-950 text-white rounded-3xl p-5 sm:p-6 border border-zinc-800 shadow-md space-y-4">
            <div className="bg-rose-950/70 border border-rose-500/70 rounded-2xl p-4 text-xs text-rose-100 space-y-1">
              <strong className="text-white block uppercase tracking-wider">
                Ação obrigatória no Supabase para remover &ldquo;SEM RESTRIÇÕES / RLS desativado&rdquo;:
              </strong>
              <p className="text-rose-200 leading-relaxed">
                1) Clique em <strong>Copiar SQL Completo</strong> &nbsp;&rarr;&nbsp; 2) Abra o <strong>SQL Editor</strong> no seu painel do Supabase &nbsp;&rarr;&nbsp; 3) Cole e clique em <strong>RUN</strong>. Isso apaga políticas permissivas antigas e ativa RLS restrito em <code>usuarios</code>, <code>corridas</code>, <code>pagamentos</code>, <code>motoristas</code> e <code>avaliacoes</code>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-heading font-black text-base text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#ff6a00]" />
                  <span>Script SQL para o Supabase SQL Editor</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Execute este código no SQL Editor do seu projeto Supabase para ativar o RLS e corrigir todas as políticas
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
                  setCopiedSQL(true);
                  showToast('Código SQL copiado para a área de transferência!');
                  setTimeout(() => setCopiedSQL(false), 3000);
                }}
                className="px-4 py-2.5 bg-white text-slate-950 hover:bg-slate-100 rounded-xl text-xs font-heading font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 active:scale-95"
              >
                {copiedSQL ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSQL ? 'SQL Copiado!' : 'Copiar SQL Completo'}</span>
              </button>
            </div>

            <pre className="p-4 bg-black/60 rounded-2xl border border-zinc-800 text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-64 leading-relaxed select-all">
              {SUPABASE_SETUP_SQL}
            </pre>
          </div>
        </div>
      )}

      {/* Modal de Prévia de Documento / Comprovante Anexo */}
      {previewProofImage && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-300 animate-scale-up">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="font-heading font-black text-slate-950 text-base flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>{previewDocTitle}</span>
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
            <div className="max-h-[65vh] overflow-auto overscroll-contain rounded-2xl border border-slate-200 bg-slate-100 p-2 text-center">
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
        <div className="fixed inset-0 z-[1200] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
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
                onClick={async () => {
                  if (onRemoveAllAccounts) {
                    await onRemoveAllAccounts();
                  }
                  setSupabaseUsers((prev) =>
                    prev.filter(
                      (u) =>
                        String(u.tipo || '').toUpperCase() === 'ADM' ||
                        String(u['e-mail'] || u.email || '').toLowerCase() === 'admin@race.com.br'
                    )
                  );
                  setSupabaseCorridas([]);
                  setSupabasePagamentos([]);
                  setWithdrawalsList([]);
                  setReviewsList([]);
                  setIsConfirmRemoveAllModalOpen(false);
                  showToast('🗑️ Todos os dados e cadastros não-ADM foram zerados no Supabase!');
                }}
                className="flex-1 py-3 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-heading font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95"
              >
                Sim, Zerar e Remover Todos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação: Remover Cadastro Individual */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
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

      {/* Modal: Ver Avaliações do Condutor */}
      {selectedUserReviewModal && (
        <div className="fixed inset-0 z-[1200] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-300 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg">
                    Avaliações &bull; {selectedUserReviewModal.name}
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {selectedUserReviewModal.userType} &bull; {selectedUserReviewModal.categoryLabel}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserReviewModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cartão de Resumo */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-500 block font-bold uppercase">Nota Média</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-3xl font-heading font-black text-slate-950">
                    ⭐ {selectedUserReviewModal.rating.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ 5.0</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block font-bold uppercase">Veículo / Placa</span>
                <span className="text-xs font-bold text-slate-800">
                  {selectedUserReviewModal.model || 'Veículo homologado'}
                </span>
                {selectedUserReviewModal.plate && (
                  <span className="block text-xs font-mono font-bold text-amber-700">
                    {selectedUserReviewModal.plate}
                  </span>
                )}
              </div>
            </div>

            {/* Lista de Avaliações */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-heading font-black text-slate-900 uppercase tracking-wider">
                Comentários dos Passageiros de Indaiatuba:
              </h4>

              {(() => {
                const matchedReviews = reviewsList.filter(
                  (r) =>
                    r.driverId === selectedUserReviewModal.id ||
                    (selectedUserReviewModal.name && r.driverName.toLowerCase() === selectedUserReviewModal.name.toLowerCase())
                );

                if (matchedReviews.length === 0) {
                  return (
                    <div className="p-4 bg-slate-50 rounded-2xl text-center text-slate-500 text-xs space-y-1">
                      <p className="font-bold text-slate-700">Condutor em início de atividades</p>
                      <p>Nenhuma reclamação ou ocorrência registrada contra este perfil.</p>
                      <span className="text-[11px] text-amber-700 font-bold block pt-1">
                        Novas avaliações após o término das corridas serão listadas aqui em tempo real.
                      </span>
                    </div>
                  );
                }

                return matchedReviews.map((rev) => (
                  <div key={rev.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{rev.passengerName}</span>
                      <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        ⭐ {rev.rating}.0
                      </span>
                    </div>
                    {rev.comment && (
                      <p className="text-xs text-slate-700 italic">&ldquo;{rev.comment}&rdquo;</p>
                    )}
                    {rev.issueComment && (
                      <p className="text-xs text-rose-700 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                        ⚠️ O que deu errado: {rev.issueComment}
                      </p>
                    )}
                    <span className="text-[10px] text-slate-400 block pt-0.5">
                      {new Date(rev.createdAt).toLocaleDateString('pt-BR')} às {new Date(rev.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ));
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setSelectedUserReviewModal(null);
                  setActiveTab('reviews');
                }}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-heading font-black text-xs rounded-xl cursor-pointer transition-colors shadow-xs"
              >
                Ver Todas as Avaliações
              </button>
              <button
                type="button"
                onClick={() => setSelectedUserReviewModal(null)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-heading font-black text-xs rounded-xl cursor-pointer transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ADM: Editar Usuário (Nome, E-mail, WhatsApp, Foto + SALVAR ALTERAÇÕES) */}
      {editingAdminUser && (
        <div className="fixed inset-0 z-[1250] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full border-2 border-emerald-500 shadow-2xl p-6 space-y-5 max-h-[92vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg">
                    Editar Usuário (ADM)
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {editingAdminUser.userType} &bull; Login: <strong className="font-mono">{editingAdminUser.login}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAdminUser(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdminUserChanges} className="space-y-4">
              <input
                ref={adminEditPhotoRef}
                type="file"
                accept="image/*"
                onChange={handleAdminEditAvatarChange}
                className="hidden"
              />

              {/* Prévia e Troca da Foto */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                <div
                  onClick={() => adminEditPhotoRef.current?.click()}
                  className="relative cursor-pointer shrink-0"
                >
                  {editUserAvatar ? (
                    <img
                      src={editUserAvatar}
                      alt={editUserName || 'Usuário'}
                      className="w-20 h-20 rounded-full object-cover border-4 border-[#ff6a00] shadow-md"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-800 border-4 border-[#ff6a00] shadow-md flex items-center justify-center font-heading font-black text-2xl">
                      {(editUserName || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#ff6a00] text-white border-2 border-white shadow">
                    <Camera className="w-3.5 h-3.5" />
                  </span>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  {hasPendingEditAvatar ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-heading font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5" />
                      Prévia da nova foto pronta — clique em SALVAR ALTERAÇÕES
                    </span>
                  ) : (
                    <p className="text-xs font-bold text-slate-600">
                      Toque na foto para trocar pela galeria antes de salvar.
                    </p>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => adminEditPhotoRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#ff6a00]" />
                      <span>{hasPendingEditAvatar ? 'Escolher Outra Foto' : 'Trocar Foto'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-heading font-black text-slate-700 uppercase block">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:border-[#ff6a00] text-slate-950 font-bold text-sm outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-heading font-black text-slate-700 uppercase block">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={editUserEmail}
                    onChange={(e) => setEditUserEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:border-[#ff6a00] text-slate-950 font-mono font-bold text-sm outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-heading font-black text-slate-700 uppercase block">
                    WhatsApp / Celular
                  </label>
                  <input
                    type="tel"
                    value={editUserPhone}
                    onChange={(e) => setEditUserPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:border-[#ff6a00] text-slate-950 font-mono font-bold text-sm outline-none"
                  />
                </div>

                {!editingAdminUser.isPassenger && !editingAdminUser.isAdminRow && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-heading font-black text-slate-700 uppercase block">
                        Veículo / Modelo
                      </label>
                      <input
                        type="text"
                        value={editUserModel}
                        onChange={(e) => setEditUserModel(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:border-[#ff6a00] text-slate-950 font-bold text-sm outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-heading font-black text-slate-700 uppercase block">
                        Placa
                      </label>
                      <input
                        type="text"
                        value={editUserPlate}
                        onChange={(e) => setEditUserPlate(e.target.value.toUpperCase())}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 focus:border-[#ff6a00] text-slate-950 font-mono font-bold text-sm uppercase outline-none"
                      />
                    </div>
                  </>
                )}
              </div>

              {editUserError && (
                <div className="bg-rose-50 border border-rose-300 text-rose-900 rounded-xl p-3 text-xs font-bold">
                  {editUserError}
                </div>
              )}

              {/* Botão Grande Verde SALVAR ALTERAÇÕES no final */}
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={isSavingAdminUser}
                  className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-heading font-black text-base rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer disabled:opacity-60"
                >
                  {isSavingAdminUser ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Salvando alterações...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>SALVAR ALTERAÇÕES</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAdminUser(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
