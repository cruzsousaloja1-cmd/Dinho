import React, { useState, useRef, useEffect } from 'react';
import { AppUser, LocationPoint } from '../types';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  LogOut, 
  Navigation, 
  Crosshair, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  Share2, 
  Headphones, 
  Star,
  KeyRound,
  Camera,
  Pencil,
  Loader2,
  X,
  Check,
  MessageCircle,
  Car,
  Copy,
  Gift,
  Wallet,
  Download
} from 'lucide-react';
import { requestCurrentLocationFast } from '../services/addressSearchService';
import { saveSessionUser, isAppUserAdmin, isAppUserDriver } from '../services/userService';
import { formatBRL } from '../services/pricingService';
import {
  extractPhotoFromRow,
  getUsuarioSupabase,
  saveUsuarioSupabase,
  supabase,
  uploadProfilePhotoSupabase,
  withPhotoCacheBuster,
  ensureUserReferralCodeSupabase,
  getDriverReferralsAndBonusesSupabase,
  getPagamentosSupabase,
  ReferralCandidateItem,
  SupabasePagamentoRow,
} from '../supabase';
import { validateAndCompressPhotoFile, validatePhotoMax2MB } from '../utils/imageCompression';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { DriverBenefitsBox } from './DriverBenefitsBox';
import {
  buildReferralWhatsappShareText,
  getLaunchPromoCountdownText,
  getRaceLogoPublicUrl,
  preloadRaceLogoBlob,
  downloadRaceLogoPng,
  shareReferralWithLogo,
  isPassengerReferralRole,
  PASSENGER_REFERRAL_BONUS_AMOUNT,
  PASSENGER_REFERRAL_REQUIRED_RIDES,
  parseReferralBonusMeta,
  formatPassengerReferralBonusMessage,
} from '../services/promoService';

interface PassengerAccountViewProps {
  currentUser: AppUser | null;
  currentAddress?: string;
  pickup?: LocationPoint | null;
  onUpdateAddress?: (address: string, lat: number, lng: number) => void;
  onLogout: () => void;
  onNavigateToHistory: () => void;
  onOpenSupport?: () => void;
  onOpenShare?: () => void;
  onUpdateAvatar?: (avatarBase64: string) => void;
  onUpdateProfile?: (updatedUser: AppUser) => void;
  onOpenPrivacyPage?: () => void;
  onWantToBeDriver?: () => void;
}

export const PassengerAccountView: React.FC<PassengerAccountViewProps> = ({
  currentUser,
  currentAddress,
  pickup,
  onUpdateAddress,
  onLogout,
  onNavigateToHistory,
  onOpenSupport,
  onOpenShare,
  onUpdateAvatar,
  onUpdateProfile,
  onOpenPrivacyPage,
  onWantToBeDriver,
}) => {
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string>(currentUser?.avatar || '');
  const [draftName, setDraftName] = useState<string>(currentUser?.name || '');
  const [draftEmail, setDraftEmail] = useState<string>(currentUser?.email || '');
  const [draftPhone, setDraftPhone] = useState<string>(
    currentUser?.whatsapp || currentUser?.phone || ''
  );
  const [draftAvatar, setDraftAvatar] = useState<string>(currentUser?.avatar || '');
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [hasPendingAvatarPreview, setHasPendingAvatarPreview] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [referralCode, setReferralCode] = useState<string>(
    currentUser?.codigoIndicacao || currentUser?.driverData?.codigoIndicacao || ''
  );
  const [creditBalance, setCreditBalance] = useState<number>(
    Number(currentUser?.creditBalance || 0)
  );
  const [copiedCodeHeader, setCopiedCodeHeader] = useState(false);
  const [copiedCodeCard, setCopiedCodeCard] = useState(false);
  const [showDownloadLogoFallback, setShowDownloadLogoFallback] = useState(false);
  const [logoDownloadedNotice, setLogoDownloadedNotice] = useState(false);
  const [myReferrals, setMyReferrals] = useState<ReferralCandidateItem[]>([]);
  const [myBonusPayments, setMyBonusPayments] = useState<SupabasePagamentoRow[]>([]);
  const [isLoadingMyReferrals, setIsLoadingMyReferrals] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCreditBalance(Number(currentUser?.creditBalance || 0));
  }, [currentUser?.creditBalance]);

  const loadMyPassengerReferrals = async () => {
    if (!currentUser?.email && !currentUser?.id) return;
    setIsLoadingMyReferrals(true);
    try {
      const [refs, payments] = await Promise.all([
        getDriverReferralsAndBonusesSupabase(currentUser).catch(() => [] as ReferralCandidateItem[]),
        getPagamentosSupabase(currentUser).catch(() => [] as SupabasePagamentoRow[]),
      ]);
      setMyReferrals(refs);
      setMyBonusPayments(payments.filter((p) => p.tipo === 'bonus_indicacao'));
    } finally {
      setIsLoadingMyReferrals(false);
    }
  };

  useEffect(() => {
    loadMyPassengerReferrals();
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    if (!isEditingProfile && !hasPendingAvatarPreview) {
      setUserAvatar((prev) => currentUser?.avatar || prev || '');
      setDraftAvatar((prev) => currentUser?.avatar || prev || '');
      setPendingPhotoFile(null);
      setDraftName(currentUser?.name || '');
      setDraftEmail(currentUser?.email || '');
      setDraftPhone(currentUser?.whatsapp || currentUser?.phone || '');
    }
  }, [currentUser, isEditingProfile, hasPendingAvatarPreview]);

  useEffect(() => {
    let active = true;
    const loadProfilePhotoFromSupabase = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user;
        const targetEmail = String(currentUser?.email || authUser?.email || '').trim().toLowerCase();
        if (!targetEmail) return;

        let row: any = null;
        try {
          const { data } = await supabase
            .from('usuarios')
            .select('foto, avatar, saldo, codigo_indicacao')
            .eq('email', targetEmail)
            .single();
          row = data;
        } catch {}

        if (!row) {
          try {
            row = await getUsuarioSupabase(targetEmail);
          } catch {}
        }

        if (active && row && row.saldo !== undefined && row.saldo !== null) {
          const liveSaldo = Number(row.saldo || 0);
          setCreditBalance(liveSaldo);
          if (currentUser && liveSaldo !== Number(currentUser.creditBalance || 0)) {
            const updatedUser: AppUser = { ...currentUser, creditBalance: liveSaldo };
            saveSessionUser(updatedUser);
            if (onUpdateProfile) {
              onUpdateProfile(updatedUser);
            }
          }
        }

        const rawFoto = String(
          row?.avatar ||
            row?.foto ||
            authUser?.user_metadata?.avatar_url ||
            authUser?.user_metadata?.foto ||
            currentUser?.avatar ||
            ''
        ).trim();

        const fotoUrl = rawFoto ? withPhotoCacheBuster(rawFoto) : '';
        console.log('fotoUrl carregada:', fotoUrl);

        if (!active || !fotoUrl || hasPendingAvatarPreview) return;

        setUserAvatar(fotoUrl);
        if (!isEditingProfile) {
          setDraftAvatar(fotoUrl);
        }
        if (onUpdateAvatar && fotoUrl !== currentUser?.avatar) {
          onUpdateAvatar(fotoUrl);
        }
      } catch (err) {
        console.log('fotoUrl carregada: erro ao consultar usuarios', err);
      }
    };

    loadProfilePhotoFromSupabase();
    return () => {
      active = false;
    };
  }, [currentUser?.email]);

  useEffect(() => {
    preloadRaceLogoBlob().catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    if (currentUser?.codigoIndicacao || currentUser?.driverData?.codigoIndicacao) {
      setReferralCode(
        String(currentUser?.codigoIndicacao || currentUser?.driverData?.codigoIndicacao || '')
          .trim()
          .toUpperCase()
      );
      return;
    }
    const ensureCode = async () => {
      if (!currentUser?.email && !currentUser?.id) return;
      const ensured = await ensureUserReferralCodeSupabase({
        id: currentUser.id,
        email: currentUser.email,
        name: currentUser.name,
        currentCode: currentUser.codigoIndicacao,
      });
      if (!active || !ensured) return;
      setReferralCode(ensured);
      if (ensured !== currentUser.codigoIndicacao) {
        const updatedUser: AppUser = {
          ...currentUser,
          codigoIndicacao: ensured,
          driverData: currentUser.driverData
            ? { ...currentUser.driverData, codigoIndicacao: ensured }
            : currentUser.driverData,
        };
        saveSessionUser(updatedUser);
        if (onUpdateProfile) {
          onUpdateProfile(updatedUser);
        }
      }
    };
    ensureCode();
    return () => {
      active = false;
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.codigoIndicacao]);

  const handleOpenEditProfile = () => {
    setDraftName(currentUser?.name || '');
    setDraftEmail(currentUser?.email || '');
    setDraftPhone(currentUser?.whatsapp || currentUser?.phone || '');
    setDraftAvatar(userAvatar || currentUser?.avatar || '');
    setPendingPhotoFile(null);
    setHasPendingAvatarPreview(false);
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setDraftName(currentUser?.name || '');
    setDraftEmail(currentUser?.email || '');
    setDraftPhone(currentUser?.whatsapp || currentUser?.phone || '');
    setDraftAvatar(currentUser?.avatar || userAvatar || '');
    setPendingPhotoFile(null);
    setHasPendingAvatarPreview(false);
    setProfileErrorMsg(null);
    setIsEditingProfile(false);
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeErr = validatePhotoMax2MB(file);
    if (sizeErr) {
      setProfileErrorMsg(sizeErr);
      setProfileSuccessMsg(null);
      if (e.target) e.target.value = '';
      return;
    }

    try {
      const { dataUrl } = await validateAndCompressPhotoFile(file);
      if (dataUrl) {
        // Mostra prévia da nova foto na hora no círculo e no formulário antes de salvar
        setDraftAvatar(dataUrl);
        setPendingPhotoFile(file);
        setHasPendingAvatarPreview(true);
        setProfileErrorMsg(null);
        setProfileSuccessMsg(null);
        setIsEditingProfile(true);
      }
    } catch (err: any) {
      console.log('Erro ao processar foto do passageiro:', err);
      setProfileErrorMsg(err?.message || 'Não foi possível processar a imagem escolhida. Tente outra foto.');
    } finally {
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleSaveProfileChanges = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = draftName.trim();
    const cleanEmail = draftEmail.trim().toLowerCase();
    const cleanPhone = draftPhone.trim();

    if (!cleanName) {
      setProfileErrorMsg('Informe seu nome completo.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setProfileErrorMsg('Informe um e-mail válido.');
      return;
    }

    setIsSavingProfile(true);
    setProfileErrorMsg(null);
    setProfileSuccessMsg(null);

    try {
      const isChangingPhoto = Boolean(hasPendingAvatarPreview || pendingPhotoFile);
      let photoToSave = draftAvatar || userAvatar || currentUser?.avatar || '';
      let storageErrorDetail = '';

      if (photoToSave && (pendingPhotoFile || photoToSave.startsWith('data:image'))) {
        const uploadRes = await uploadProfilePhotoSupabase({
          photo: pendingPhotoFile || photoToSave,
          identifier: cleanEmail || currentUser?.id || 'usuario',
        });
        if (!uploadRes.url && uploadRes.error) {
          setProfileErrorMsg(uploadRes.error);
          return;
        }
        if (!uploadRes.storageUploaded && uploadRes.error) {
          storageErrorDetail = uploadRes.error;
        }
        photoToSave = uploadRes.url || uploadRes.compressedDataUrl || photoToSave;
      }

      const res = await saveUsuarioSupabase({
        id: currentUser?.id,
        previousEmail: currentUser?.email,
        nome: cleanName,
        email: cleanEmail,
        celular: cleanPhone,
        whatsapp: cleanPhone,
        login: currentUser?.login || currentUser?.email || cleanEmail,
        tipo: currentUser?.tipo || 'passenger',
        foto: photoToSave || undefined,
        avatar: photoToSave || undefined,
        rating: currentUser?.rating || 0,
      });

      if (!res.success) {
        const combinedError = storageErrorDetail
          ? `Storage: ${storageErrorDetail} | Banco: ${res.error || 'Erro ao salvar alterações.'}`
          : res.error || 'Erro ao salvar alterações no Supabase. Tente novamente.';
        setProfileErrorMsg(combinedError);
        return;
      }

      const returnedPhotoRaw = extractPhotoFromRow(res.data) || photoToSave || '';
      if (isChangingPhoto && !returnedPhotoRaw) {
        setProfileErrorMsg(
          storageErrorDetail
            ? `Erro no upload da foto (${storageErrorDetail}). Verifique as políticas do Storage e tente novamente.`
            : 'A foto não pôde ser salva no servidor. Verifique as permissões de Storage e RLS.'
        );
        return;
      }

      if (returnedPhotoRaw) {
        try {
          await supabase.auth.updateUser({
            data: {
              avatar_url: returnedPhotoRaw,
              foto: returnedPhotoRaw,
            },
          });
        } catch {}
      }

      const fotoUrlBusted = returnedPhotoRaw ? withPhotoCacheBuster(returnedPhotoRaw) : '';
      console.log('fotoUrl carregada:', fotoUrlBusted);

      const updatedUser: AppUser = {
        ...(currentUser || {
          id: res.data?.id ? String(res.data.id) : 'local',
          role: 'passenger',
          rating: 0,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
        }),
        id: res.data?.id ? String(res.data.id) : currentUser?.id || 'local',
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        whatsapp: cleanPhone,
        avatar: fotoUrlBusted,
      };

      setUserAvatar(fotoUrlBusted);
      setDraftAvatar(fotoUrlBusted);
      setPendingPhotoFile(null);
      setHasPendingAvatarPreview(false);
      saveSessionUser(updatedUser);
      if (onUpdateAvatar && fotoUrlBusted) {
        onUpdateAvatar(fotoUrlBusted);
      }
      if (onUpdateProfile) {
        onUpdateProfile(updatedUser);
      }

      setIsEditingProfile(false);
      setProfileSuccessMsg(isChangingPhoto ? 'Foto salva!' : 'Perfil atualizado com sucesso!');
      setTimeout(() => setProfileSuccessMsg(null), 6000);
    } catch (err: any) {
      setProfileErrorMsg(err?.message || 'Falha ao salvar perfil. Tente novamente.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const [activeAddress, setActiveAddress] = useState(
    pickup?.address || currentAddress || 'Clique em Atualizar com Meu GPS para detectar sua localização'
  );

  const displayName = currentUser?.name || 'Passageiro RACE';
  const displayEmail = currentUser?.email || '';
  const displayPhone = currentUser?.whatsapp || currentUser?.phone || 'Não informado';
  const displayLogin = currentUser?.login || currentUser?.email || '';
  const visibleAvatar =
    isEditingProfile || hasPendingAvatarPreview
      ? draftAvatar || userAvatar
      : userAvatar || currentUser?.avatar || '';

  // Atualizar endereço com GPS Real em Indaiatuba-SP (máx 5s, sem loop, fallback última localização salva)
  const handleUpdateGps = async () => {
    if (isLocating) return;
    const gpsErrorMsg =
      'Ative o GPS do celular e permita a localização para o RACE, depois clique em MEU GPS de novo';

    setIsLocating(true);
    setGpsStatus('Buscando GPS preciso...');

    try {
      const result = await requestCurrentLocationFast({
        targetAccuracyMeters: 30,
        maxWaitMs: 7000,
        onStatusMessage: (msg) => setGpsStatus(msg),
      });
      if (
        (result.status === 'ok' || result.status === 'fallback_saved') &&
        result.fullAddress &&
        typeof result.lat === 'number' &&
        typeof result.lng === 'number'
      ) {
        setActiveAddress(result.fullAddress);
        if (onUpdateAddress) onUpdateAddress(result.fullAddress, result.lat, result.lng);
        setGpsStatus(
          result.status === 'fallback_saved' && result.notice
            ? result.notice
            : '📍 Localização GPS atualizada com sucesso!'
        );
        return;
      }
      setGpsStatus(result.errorMessage || gpsErrorMsg);
    } catch {
      setGpsStatus(gpsErrorMsg);
    } finally {
      setIsLocating(false);
      setTimeout(() => setGpsStatus(null), 6000);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarFileChange}
        className="hidden"
        id="passenger-avatar-file-input"
      />

      {profileSuccessMsg && (
        <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-950 rounded-2xl p-4 shadow-md flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-heading font-black text-sm">{profileSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setProfileSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {profileErrorMsg && (
        <div className="bg-rose-50 border-2 border-rose-500 text-rose-950 rounded-2xl p-4 shadow-md flex items-center justify-between gap-3 animate-fade-in">
          <div className="text-xs sm:text-sm font-bold leading-snug">{profileErrorMsg}</div>
          <button
            type="button"
            onClick={() => setProfileErrorMsg(null)}
            className="text-rose-700 hover:text-rose-950 p-1 rounded-lg cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 1. Header do Perfil do Passageiro */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="relative group cursor-pointer shrink-0"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-3 border-[#ff6a00] overflow-hidden shadow-lg bg-zinc-900 ring-4 ring-[#ff6a00]/20 flex items-center justify-center">
              {visibleAvatar ? (
                <img
                  src={visibleAvatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-heading font-black text-2xl sm:text-3xl text-[#ff6a00]">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="absolute bottom-0 right-0 p-1.5 rounded-full bg-[#ff6a00] hover:bg-[#e05e00] text-white shadow-md border-2 border-white transition-all cursor-pointer active:scale-95"
              title="Trocar foto pela galeria do celular"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading font-black text-slate-950 text-xl sm:text-2xl">
                {displayName}
              </h2>
              {isAppUserAdmin(currentUser) ? (
                <span className="bg-amber-100 text-amber-900 border border-amber-400 text-xs px-2.5 py-0.5 rounded-full font-black flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                  ADM • Administrador
                </span>
              ) : (
                <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Passageiro Ativo
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-heading font-black text-[#ff6a00] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Trocar foto</span>
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleOpenEditProfile}
                className="text-xs font-heading font-black text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Editar perfil</span>
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(true)}
                className="text-xs font-heading font-black text-slate-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#ff6a00]" />
                <span>Alterar senha</span>
              </button>
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1 text-amber-600 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {(currentUser?.rating || 0).toFixed(1)} Avaliação
              </span>
              <span>•</span>
              <span className="font-mono text-slate-500">ID: {currentUser?.id || '-'}</span>
            </div>

            {referralCode && (
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-2 flex-wrap bg-orange-50 border border-orange-300 rounded-xl px-3 py-1.5">
                  <span className="text-xs font-bold text-slate-800">
                    Seu código de indicação:{' '}
                    <strong className="font-mono font-black text-[#ff6a00] tracking-wider">
                      {referralCode}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(referralCode);
                      } catch {}
                      setCopiedCodeHeader(true);
                      setTimeout(() => setCopiedCodeHeader(false), 2500);
                    }}
                    className="px-2.5 py-0.5 rounded-lg bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-[11px] inline-flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
                  >
                    {copiedCodeHeader ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCodeHeader ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>

                {!isAppUserDriver(currentUser) && (
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 border ${
                      creditBalance > 0
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                        : 'bg-blue-50 border-blue-200 text-blue-900'
                    }`}
                  >
                    <Wallet
                      className={`w-3.5 h-3.5 shrink-0 ${
                        creditBalance > 0 ? 'text-emerald-600' : 'text-blue-600'
                      }`}
                    />
                    <span className="text-xs font-bold">
                      Seu crédito: <strong className="font-mono font-black">{formatBRL(creditBalance)}</strong> - Use na próxima corrida
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-heading font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
          title="Sair da Conta"
        >
          <LogOut className="w-4 h-4 text-rose-600" />
          <span>Sair</span>
        </button>
      </div>

      {/* 2. EDITAR PERFIL ou DADOS CADASTRAIS */}
      {isEditingProfile ? (
        <form
          onSubmit={handleSaveProfileChanges}
          className="bg-white border-2 border-emerald-500 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5 animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg flex items-center gap-2">
              <Pencil className="w-5 h-5 text-[#ff6a00]" />
              <span>Editar Perfil</span>
            </h3>
            <button
              type="button"
              onClick={handleCancelEditProfile}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-bold text-xs cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          {/* Prévia da Foto Nova */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative cursor-pointer shrink-0"
            >
              <div className="w-24 h-24 rounded-full border-4 border-[#ff6a00] overflow-hidden shadow-lg bg-zinc-900 flex items-center justify-center">
                {draftAvatar ? (
                  <img
                    src={draftAvatar}
                    alt="Prévia da foto"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-heading font-black text-3xl text-[#ff6a00]">
                    {(draftName || displayName).charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="absolute bottom-0 right-0 p-2 rounded-full bg-[#ff6a00] text-white border-2 border-white shadow">
                <Camera className="w-4 h-4" />
              </span>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              {hasPendingAvatarPreview ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-heading font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full">
                  <Check className="w-3.5 h-3.5" />
                  Prévia da nova foto pronta — clique em SALVAR ALTERAÇÕES abaixo
                </span>
              ) : (
                <p className="text-xs font-bold text-slate-600">
                  Toque na foto ou no botão ao lado para abrir a galeria e trocar sua foto de perfil.
                </p>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-heading font-black text-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-[#ff6a00]" />
                  <span>{hasPendingAvatarPreview ? 'Escolher Outra Foto' : 'Escolher Foto na Galeria'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-heading font-black text-slate-700 uppercase block">
                Nome Completo
              </label>
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                required
                placeholder="Seu nome completo"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20 text-slate-950 font-bold text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-heading font-black text-slate-700 uppercase block">
                E-mail
              </label>
              <input
                type="email"
                value={draftEmail}
                onChange={(e) => setDraftEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20 text-slate-950 font-mono font-bold text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-heading font-black text-slate-700 uppercase block">
                WhatsApp / Celular
              </label>
              <input
                type="tel"
                value={draftPhone}
                onChange={(e) => setDraftPhone(e.target.value)}
                placeholder="(19) 99999-9999"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 focus:border-[#ff6a00] focus:ring-2 focus:ring-[#ff6a00]/20 text-slate-950 font-mono font-bold text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-heading font-black text-slate-500 uppercase block">
                Login (não alterável)
              </label>
              <div className="w-full px-4 py-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 font-mono font-bold text-sm">
                {displayLogin}
              </div>
            </div>
          </div>

          {profileErrorMsg && (
            <div className="bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl p-3 text-xs font-bold">
              {profileErrorMsg}
            </div>
          )}

          {/* Botão Grande Verde SALVAR ALTERAÇÕES no final */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-heading font-black text-base rounded-2xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2.5 uppercase tracking-wider cursor-pointer disabled:opacity-60"
            >
              {isSavingProfile ? (
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
          </div>
        </form>
      ) : (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-[#ff6a00]" />
              <span>Meus Dados Cadastrais</span>
            </h3>

            <button
              type="button"
              onClick={handleOpenEditProfile}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Editar perfil</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Nome */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <span className="text-[11px] font-mono font-bold text-slate-500 uppercase block tracking-wider">
                Nome Completo
              </span>
              <p className="font-heading font-black text-slate-900 text-sm sm:text-base mt-0.5">
                {displayName}
              </p>
            </div>

            {/* E-mail */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <span className="text-[11px] font-mono font-bold text-slate-500 uppercase block tracking-wider">
                E-mail Cadastrado
              </span>
              <p className="font-mono font-bold text-slate-900 text-sm sm:text-base mt-0.5 break-all">
                {displayEmail}
              </p>
            </div>

            {/* WhatsApp */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <span className="text-[11px] font-mono font-bold text-slate-500 uppercase block tracking-wider">
                WhatsApp / Celular
              </span>
              <p className="font-mono font-bold text-slate-900 text-sm sm:text-base mt-0.5">
                {displayPhone}
              </p>
            </div>

            {/* Login */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <span className="text-[11px] font-mono font-bold text-slate-500 uppercase block tracking-wider">
                Login (Nome de Usuário)
              </span>
              <p className="font-mono font-bold text-slate-900 text-sm sm:text-base mt-0.5">
                {displayLogin}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3. ENDEREÇO COM MEU GPS */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <h3 className="font-heading font-black text-slate-950 text-base sm:text-lg">
              Endereço com Meu GPS
            </h3>
          </div>

          <button
            type="button"
            onClick={handleUpdateGps}
            disabled={isLocating}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-heading font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span>{isLocating ? 'Buscando GPS preciso...' : 'Atualizar com Meu GPS'}</span>
          </button>
        </div>

        {gpsStatus && (
          <div className={`border rounded-2xl p-3 text-xs font-bold flex items-center gap-2 ${
            gpsStatus.includes('Ative o GPS')
              ? 'bg-rose-50 border-rose-300 text-rose-900'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}>
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${
              gpsStatus.includes('Ative o GPS') ? 'text-rose-600' : 'text-emerald-600'
            }`} />
            <span>{gpsStatus}</span>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500">
            <Navigation className="w-3.5 h-3.5 text-[#ff6a00]" />
            <span>Localização Atual Detectada em Indaiatuba:</span>
          </div>
          <p className="font-heading font-black text-slate-900 text-sm sm:text-base">
            {activeAddress}
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            Cidade oficial: Indaiatuba - SP &bull; GPS ativo e calibrado
          </p>
        </div>
      </div>

      {/* 3B. INDICAR E GANHAR (CÓDIGO DE INDICAÇÃO) */}
      {referralCode && (() => {
        const isDriverOrMoto = isAppUserDriver(currentUser);
        const countdownText = getLaunchPromoCountdownText();
        const unifiedShareText = buildReferralWhatsappShareText(referralCode);
        const raceLogoUrl = getRaceLogoPublicUrl();
        return (
        <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 text-white rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-widest bg-black/25 px-3 py-1 rounded-full inline-block">
                Indicação Premiada RACE • Quanto antes, mais tempo!
              </span>
              <h3 className="text-xl sm:text-2xl font-heading font-black leading-tight">
                {isDriverOrMoto ? 'Indicar e Ganhar R$ 50,00' : 'Indicar e Ganhar Crédito!'}
              </h3>
              {isDriverOrMoto ? (
                <p className="text-xs sm:text-sm font-semibold text-amber-50 leading-relaxed">
                  ⚡ LANÇAMENTO RACE! Sem taxa até 17/12/2026! Quanto antes você se cadastrar e indicar, mais tempo sem taxa e mais bônus você ganha! Indique agora e ganhe <strong>R$50</strong> por cada Motorista OU Motoboy que fizer <strong>10 corridas</strong> até 17/12! Depois dessa data, volta para 15% de taxa.
                </p>
              ) : (
                <p className="text-xs sm:text-sm font-semibold text-amber-50 leading-relaxed">
                  Indique 1 Motorista OU Motoboy com seu código <strong>{referralCode}</strong>. Quando ele finalizar 10 corridas, você ganha <strong>R$ 50,00 de crédito</strong> para suas corridas! Indique 1 Passageiro e ganhe <strong>R$ 10,00 de crédito</strong> quando ele fizer a 1ª corrida!
                </p>
              )}
              <div className="pt-0.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-black/30 border border-white/25 text-amber-100 text-xs font-black px-3 py-1 rounded-full">
                  <span>⏳ {countdownText}</span>
                </span>
                {!isDriverOrMoto && (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-300/70 text-emerald-100 text-xs font-black px-3 py-1 rounded-full">
                    <Wallet className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span>Seu crédito: {formatBRL(creditBalance)} - Use na próxima corrida</span>
                  </span>
                )}
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-black/20 border border-white/30 flex items-center justify-center shrink-0">
              <Gift className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="bg-[#9a3412] border-2 border-yellow-400 rounded-2xl p-5 sm:p-6 text-center space-y-4 shadow-xl">
            <div className="flex flex-col items-center gap-2">
              <img
                src={raceLogoUrl}
                alt="RACE - Mobilidade e Entregas Indaiatuba - SP"
                onLoad={() => {
                  preloadRaceLogoBlob().catch(() => {});
                }}
                className="w-40 h-40 sm:w-48 sm:h-48 rounded-3xl object-contain border-2 border-yellow-400 shadow-2xl mx-auto bg-black"
              />
            </div>

            <DriverBenefitsBox />

            <span className="text-[14px] font-bold uppercase tracking-widest text-amber-100 block">
              SEU CÓDIGO DE INDICAÇÃO
            </span>
            <div className="text-[40px] leading-none font-mono font-bold tracking-[0.16em] text-white text-center select-all py-2 break-all">
              {referralCode}
            </div>

            <div className="flex flex-col gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  try {
                    navigator.clipboard.writeText(referralCode);
                  } catch {}
                  setCopiedCodeCard(true);
                  setTimeout(() => setCopiedCodeCard(false), 2500);
                }}
                className="w-full min-h-[54px] py-3.5 px-5 rounded-xl bg-white text-orange-800 hover:bg-amber-50 font-heading font-black text-base sm:text-lg flex items-center justify-center gap-2.5 cursor-pointer shadow-lg transition-all active:scale-[0.98]"
              >
                {copiedCodeCard ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5" />}
                <span>{copiedCodeCard ? 'Código copiado!' : 'Copiar código'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  shareReferralWithLogo(referralCode)
                    .then((res) => {
                      if (res === 'whatsapp_with_download') {
                        setShowDownloadLogoFallback(true);
                      }
                    })
                    .catch(() => {});
                }}
                className="w-full min-h-[60px] py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-heading font-bold text-[18px] leading-tight flex items-center justify-center gap-2.5 shadow-lg transition-all active:scale-[0.98] cursor-pointer"
              >
                <MessageCircle className="w-6 h-6 shrink-0" />
                <span>Compartilhar para Motorista, Motoboy e Passageiros</span>
              </button>

              {showDownloadLogoFallback && (
                <div className="bg-black/45 border border-yellow-400/70 rounded-xl p-3.5 space-y-2.5 text-center">
                  <p className="text-xs font-semibold text-amber-100 leading-snug">
                    Seu celular/navegador não permitiu enviar a imagem direto. Baixe a logo abaixo para anexar manualmente no WhatsApp:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      downloadRaceLogoPng()
                        .then(() => {
                          setLogoDownloadedNotice(true);
                          setTimeout(() => setLogoDownloadedNotice(false), 3500);
                        })
                        .catch(() => {});
                    }}
                    className="w-full min-h-[50px] py-2.5 px-4 rounded-xl bg-black hover:bg-zinc-900 border-2 border-yellow-400 text-white font-heading font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                  >
                    {logoDownloadedNotice ? (
                      <>
                        <Check className="w-5 h-5 text-emerald-400" />
                        <span>Logo baixada! Anexe no WhatsApp</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5 text-yellow-400" />
                        <span>Baixar Logo</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <p className="text-[11px] text-amber-100/95 font-medium break-words whitespace-pre-line bg-black/30 rounded-xl p-3 border border-white/15 text-left leading-relaxed">
              {unifiedShareText}
            </p>

            <div className="bg-black/40 border border-yellow-400/60 rounded-xl p-3 text-center">
              <p className="text-xs sm:text-sm font-black text-yellow-300 tracking-wide">
                SEM LIMITE DE INDICAÇÃO ATÉ 17/12/2026 - Quanto mais você indicar, mais você ganha!
              </p>
            </div>
          </div>

          {!isDriverOrMoto && (() => {
            const passengerRefs = myReferrals.filter((r) => isPassengerReferralRole(r.tipo));
            const passengerPayments10 = myBonusPayments.filter((p) => {
              const meta = parseReferralBonusMeta(p.comprovante_url, p.chave_pix, p.valor);
              return meta.indicatedRole === 'passenger' || Number(p.valor) === PASSENGER_REFERRAL_BONUS_AMOUNT;
            });
            const releasedList = passengerRefs.filter((r) => {
              const hasPayment = passengerPayments10.some((p) => {
                const meta = parseReferralBonusMeta(p.comprovante_url, p.chave_pix, p.valor);
                return (
                  (meta.indicatedId && meta.indicatedId === String(r.id)) ||
                  (meta.indicatedEmail && meta.indicatedEmail.toLowerCase() === r.email.toLowerCase())
                );
              });
              return r.bonusPaid || r.ridesCount >= PASSENGER_REFERRAL_REQUIRED_RIDES || hasPayment;
            });
            const totalReleasedAmount = Number(
              (releasedList.length * PASSENGER_REFERRAL_BONUS_AMOUNT).toFixed(2)
            );
            const consumedAmount = Math.max(0, totalReleasedAmount - Math.max(0, creditBalance));
            const sortedCreditedIds = [...releasedList]
              .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
              .map((r) => String(r.id));
            const usedIdSet = new Set<string>();
            let remainingUsed = consumedAmount;
            for (const rid of sortedCreditedIds) {
              if (remainingUsed >= PASSENGER_REFERRAL_BONUS_AMOUNT - 0.01) {
                usedIdSet.add(rid);
                remainingUsed -= PASSENGER_REFERRAL_BONUS_AMOUNT;
              }
            }

            return (
              <div className="bg-white text-slate-950 rounded-2xl p-4 sm:p-5 space-y-4 border-2 border-blue-400 shadow-lg">
                <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h4 className="font-heading font-black text-base sm:text-lg flex items-center gap-2">
                      <Gift className="w-5 h-5 shrink-0" />
                      <span>Promoção Indicação R$10 - Passageiro Indica Passageiro</span>
                    </h4>
                    <p className="text-xs text-blue-50 font-medium">
                      Seu crédito: <strong>{formatBRL(creditBalance)}</strong> - Use na próxima corrida. Sem limite de indicações até 17/12/2026!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadMyPassengerReferrals}
                    disabled={isLoadingMyReferrals}
                    className="px-3 py-2 rounded-xl bg-black/25 hover:bg-black/40 border border-white/30 text-white text-xs font-heading font-black cursor-pointer shrink-0 disabled:opacity-60"
                  >
                    {isLoadingMyReferrals ? 'Atualizando...' : 'Atualizar'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <span className="text-[10px] font-bold uppercase text-blue-800 block">
                      Passageiros Indicados
                    </span>
                    <span className="text-2xl font-heading font-black text-slate-950">
                      {passengerRefs.length}
                    </span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <span className="text-[10px] font-bold uppercase text-emerald-800 block">
                      Créditos Liberados (R$10)
                    </span>
                    <span className="text-2xl font-heading font-black text-emerald-700">
                      {releasedList.length}
                    </span>
                  </div>
                  <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
                    <span className="text-[10px] font-bold uppercase text-sky-800 block">
                      Total em Créditos R$10
                    </span>
                    <span className="text-2xl font-heading font-black text-blue-700">
                      {formatBRL(totalReleasedAmount)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h5 className="font-heading font-black text-slate-950 text-sm">
                    Indicações de Passageiros ({passengerRefs.length})
                  </h5>
                  {passengerRefs.length === 0 ? (
                    <p className="text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4 text-center">
                      Nenhum passageiro indicado ainda. Compartilhe seu código e ganhe R$10 quando seu indicado fizer a 1ª corrida!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {passengerRefs.map((refItem) => {
                        const completedRides = Math.min(
                          PASSENGER_REFERRAL_REQUIRED_RIDES,
                          Number(refItem.ridesCount || 0)
                        );
                        const isReleased = releasedList.some((r) => String(r.id) === String(refItem.id));
                        const isUsed = isReleased && usedIdSet.has(String(refItem.id));
                        return (
                          <div
                            key={refItem.id || refItem.email}
                            className="p-3 rounded-xl border border-blue-200 bg-blue-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                          >
                            <div className="space-y-0.5">
                              <p className="font-heading font-black text-slate-950 text-xs sm:text-sm">
                                {refItem.nome}
                              </p>
                              <p className="text-[11px] font-mono text-slate-600">
                                {completedRides}/{PASSENGER_REFERRAL_REQUIRED_RIDES} corrida &bull; Valor: R$10
                              </p>
                            </div>
                            {!isReleased ? (
                              <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold self-start sm:self-auto shrink-0">
                                ⏳ Aguardando 1ª corrida
                              </span>
                            ) : isUsed ? (
                              <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 border border-slate-300 text-[11px] font-black self-start sm:self-auto shrink-0">
                                💳 Crédito Usado
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black self-start sm:self-auto shrink-0">
                                ✅ Crédito Liberado
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {passengerPayments10.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    {passengerPayments10.map((bonus, idx) => {
                      const meta = parseReferralBonusMeta(bonus.comprovante_url, bonus.chave_pix, bonus.valor);
                      return (
                        <div
                          key={bonus.id || `pass-bonus-${idx}`}
                          className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="font-bold text-emerald-950">
                            {formatPassengerReferralBonusMessage(meta.indicatedName)}
                          </span>
                          <span className="font-mono font-black text-emerald-700 shrink-0">
                            +{formatBRL(Number(bonus.valor || PASSENGER_REFERRAL_BONUS_AMOUNT))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
        );
      })()}

      {/* 4. ATALHOS RÁPIDOS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onNavigateToHistory}
          className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-xs transition-all cursor-pointer text-left flex items-center gap-3 group active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 group-hover:bg-[#ff6a00] group-hover:text-white transition-colors">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <strong className="block text-slate-900 font-heading font-black text-xs sm:text-sm">
              Minhas Atividades
            </strong>
            <span className="text-[11px] text-slate-500 font-medium">
              Histórico de corridas
            </span>
          </div>
        </button>

        {onOpenSupport && (
          <button
            type="button"
            onClick={onOpenSupport}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-xs transition-all cursor-pointer text-left flex items-center gap-3 group active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-slate-900 font-heading font-black text-xs sm:text-sm">
                Suporte 24h
              </strong>
              <span className="text-[11px] text-slate-500 font-medium">
                Atendimento direto
              </span>
            </div>
          </button>
        )}

        {onOpenShare && (
          <button
            type="button"
            onClick={onOpenShare}
            className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-xs transition-all cursor-pointer text-left flex items-center gap-3 group active:scale-95"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <strong className="block text-slate-900 font-heading font-black text-xs sm:text-sm">
                Compartilhar App
              </strong>
              <span className="text-[11px] text-slate-500 font-medium">
                Indicar para amigos
              </span>
            </div>
          </button>
        )}
      </div>

      {/* 5. QUERO SER MOTORISTA, SUPORTE NO WHATSAPP & PRIVACIDADE LGPD */}
      <div className="space-y-3 pt-1">
        {onWantToBeDriver && currentUser?.role === 'passenger' && (
          <button
            type="button"
            onClick={onWantToBeDriver}
            className="w-full py-4 px-5 bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white font-heading font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-[#ff6a00]/20 transition-all flex items-center justify-center gap-2.5 uppercase tracking-wider cursor-pointer"
          >
            <Car className="w-5 h-5 shrink-0" />
            <span>Quero ser motorista RACE</span>
          </button>
        )}

        <a
          href="https://wa.me/5519920032074?text=Preciso%20de%20ajuda%20no%20RACE"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-4 px-5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-heading font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2.5 uppercase tracking-wider"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Falar com suporte no WhatsApp</span>
        </a>

        <div className="flex justify-center">
          <a
            href={`${import.meta.env.BASE_URL}privacidade`}
            onClick={(e) => {
              if (onOpenPrivacyPage) {
                e.preventDefault();
                onOpenPrivacyPage();
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 underline underline-offset-4 py-1"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Política de Privacidade (LGPD)</span>
          </a>
        </div>
      </div>

      {/* 6. BOTÃO SAIR DA CONTA */}
      <div className="pt-1">
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-4 bg-slate-950 hover:bg-slate-900 active:scale-95 text-white font-heading font-black text-sm sm:text-base rounded-2xl shadow-md transition-all cursor-pointer border border-zinc-800 flex items-center justify-center gap-2.5 uppercase tracking-wider"
        >
          <LogOut className="w-5 h-5 text-rose-500" />
          <span>Sair da Minha Conta</span>
        </button>
      </div>

      <ForgotPasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        initialIdentifier={currentUser?.email || ''}
        onPasswordResetSuccess={(_id, msg) => {
          setIsChangePasswordOpen(false);
          setProfileErrorMsg(null);
          setProfileSuccessMsg(msg || 'Senha alterada com sucesso!');
          setTimeout(() => setProfileSuccessMsg(null), 6000);
        }}
      />
    </div>
  );
};
