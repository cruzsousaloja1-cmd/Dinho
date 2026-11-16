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
  Check
} from 'lucide-react';
import { requestCurrentLocationFast } from '../services/addressSearchService';
import { saveSessionUser } from '../services/userService';
import { saveUsuarioSupabase } from '../supabase';
import { compressImageToMax200KB } from '../utils/imageCompression';

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
  const [hasPendingAvatarPreview, setHasPendingAvatarPreview] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditingProfile && !hasPendingAvatarPreview) {
      setUserAvatar(currentUser?.avatar || '');
      setDraftAvatar(currentUser?.avatar || '');
      setDraftName(currentUser?.name || '');
      setDraftEmail(currentUser?.email || '');
      setDraftPhone(currentUser?.whatsapp || currentUser?.phone || '');
    }
  }, [currentUser, isEditingProfile, hasPendingAvatarPreview]);

  const handleOpenEditProfile = () => {
    setDraftName(currentUser?.name || '');
    setDraftEmail(currentUser?.email || '');
    setDraftPhone(currentUser?.whatsapp || currentUser?.phone || '');
    setDraftAvatar(userAvatar || currentUser?.avatar || '');
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
    setHasPendingAvatarPreview(false);
    setProfileErrorMsg(null);
    setIsEditingProfile(false);
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressImageToMax200KB(file);
      if (base64) {
        // Mostra prévia da nova foto imediatamente e só salva após clicar em SALVAR ALTERAÇÕES
        setDraftAvatar(base64);
        setHasPendingAvatarPreview(true);
        setProfileErrorMsg(null);
        setProfileSuccessMsg(null);
        setIsEditingProfile(true);
      }
    } catch (err) {
      console.log('Erro ao processar foto do passageiro:', err);
      setProfileErrorMsg('Não foi possível processar a imagem escolhida. Tente outra foto.');
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
      const finalAvatar = draftAvatar || userAvatar || currentUser?.avatar || '';
      const res = await saveUsuarioSupabase({
        id: currentUser?.id,
        previousEmail: currentUser?.email,
        nome: cleanName,
        email: cleanEmail,
        celular: cleanPhone,
        whatsapp: cleanPhone,
        login: currentUser?.login || currentUser?.email || cleanEmail,
        tipo: currentUser?.tipo || 'passenger',
        foto: finalAvatar || undefined,
        avatar: finalAvatar || undefined,
        rating: currentUser?.rating || 0,
      });

      if (!res.success) {
        setProfileErrorMsg(res.error || 'Erro ao salvar alterações no Supabase. Tente novamente.');
        return;
      }

      const returnedPhoto = String(res.data?.foto || res.data?.avatar || finalAvatar || '').trim();
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
        avatar: returnedPhoto,
      };

      setUserAvatar(returnedPhoto);
      setDraftAvatar(returnedPhoto);
      setHasPendingAvatarPreview(false);
      saveSessionUser(updatedUser);
      if (onUpdateAvatar && returnedPhoto) {
        onUpdateAvatar(returnedPhoto);
      }
      if (onUpdateProfile) {
        onUpdateProfile(updatedUser);
      }

      setIsEditingProfile(false);
      setProfileSuccessMsg('Perfil atualizado com sucesso!');
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
  const visibleAvatar = isEditingProfile ? draftAvatar : userAvatar;

  // Atualizar endereço com GPS Real em Indaiatuba-SP (máx 5s, sem loop, fallback última localização salva)
  const handleUpdateGps = async () => {
    if (isLocating) return;
    const gpsErrorMsg =
      'Ative o GPS do celular e permita a localização para o RACE, depois clique em MEU GPS de novo';

    setIsLocating(true);
    setGpsStatus('Buscando GPS...');

    try {
      const result = await requestCurrentLocationFast();
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
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Passageiro Ativo
              </span>
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
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 font-medium">
              <span className="flex items-center gap-1 text-amber-600 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {(currentUser?.rating || 0).toFixed(1)} Avaliação
              </span>
              <span>•</span>
              <span className="font-mono text-slate-500">ID: {currentUser?.id || '-'}</span>
            </div>
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
            <span>{isLocating ? 'Buscando GPS...' : 'Atualizar com Meu GPS'}</span>
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

      {/* 5. BOTÃO SAIR DA CONTA */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-4 bg-slate-950 hover:bg-slate-900 active:scale-95 text-white font-heading font-black text-sm sm:text-base rounded-2xl shadow-md transition-all cursor-pointer border border-zinc-800 flex items-center justify-center gap-2.5 uppercase tracking-wider"
        >
          <LogOut className="w-5 h-5 text-rose-500" />
          <span>Sair da Minha Conta</span>
        </button>
      </div>
    </div>
  );
};
