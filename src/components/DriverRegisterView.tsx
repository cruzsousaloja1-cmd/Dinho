import React, { useState } from 'react';
import { AppUser, Driver, VehicleCategory } from '../types';
import { WEEKLY_FEE } from '../config/pricing';
import { Eye, EyeOff, AlertTriangle, ArrowLeft, Camera } from 'lucide-react';
import confetti from 'canvas-confetti';
import { saveUserAccount } from '../services/userService';
import { compressImageToMax200KB } from '../utils/imageCompression';
import { isValidEmail, isValidWhatsApp11, isValidPassword } from '../utils/security';
import { LegalConsentSection } from './LegalConsentSection';
import { checkDuplicateRegistrationSupabase, saveDriverApplicationSupabase } from '../supabase';

interface DriverRegisterViewProps {
  onRegisterSuccess: (user: AppUser, newDriver: Driver) => void;
  onBackToLogin: () => void;
  existingDrivers?: Driver[];
}

export const DriverRegisterView: React.FC<DriverRegisterViewProps> = ({
  onRegisterSuccess,
  onBackToLogin,
  existingDrivers = [],
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleYear, setVehicleYear] = useState('2024');
  const [cnh, setCnh] = useState('');
  const [category, setCategory] = useState<VehicleCategory>('economica');
  const [avatar, setAvatar] = useState('');
  const [cnhFrontPhoto, setCnhFrontPhoto] = useState('');
  const [cnhBackPhoto, setCnhBackPhoto] = useState('');
  const [crlvPhoto, setCrlvPhoto] = useState('');
  const [acceptedContract, setAcceptedContract] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedLgpd, setAcceptedLgpd] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDocUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToMax200KB(file);
      if (compressed) setter(compressed);
    } catch {}
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageToMax200KB(file);
      if (compressed) setAvatar(compressed);
    } catch {}
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!avatar) {
      setErrorMessage('Adicione sua foto para continuar.');
      return;
    }

    const cleanEmail = email.replace(/\s+/g, '').trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone.replace(/\D/g, '');
    const cleanPlate = vehiclePlate.trim().toUpperCase();
    const cleanModel = vehicleModel.trim();
    const cleanColor = vehicleColor.trim();
    const cleanCnh = cnh.trim();

    if (!cleanName || !cleanEmail || !cleanPhone || !password || !cleanPlate || !cleanModel || !cleanColor || !cleanCnh) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios (incluindo cor, placa, modelo e CNH).');
      return;
    }

    if (!cnhFrontPhoto || !cnhBackPhoto || !crlvPhoto) {
      setErrorMessage('Envie as fotos obrigatórias da CNH (Frente), CNH (Verso) e do CRLV para análise do ADM.');
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setErrorMessage('E-mail inválido. Digite um e-mail completo (ex: seu.nome@gmail.com).');
      return;
    }

    if (!isValidWhatsApp11(cleanPhone)) {
      setErrorMessage('WhatsApp inválido! Digite exatamente 11 dígitos com DDD + 9 (ex: 19999999999).');
      return;
    }

    if (!isValidPassword(password)) {
      setErrorMessage('A senha deve conter no mínimo 6 dígitos.');
      return;
    }

    if (!acceptedContract || !acceptedTerms || !acceptedLgpd) {
      setErrorMessage('Você deve ler e aceitar o Contrato de Parceria, os Termos de Uso e a Política de Privacidade (LGPD) antes de salvar.');
      return;
    }

    if (existingDrivers.some((d) => d.email.replace(/\s+/g, '').trim().toLowerCase() === cleanEmail)) {
      setErrorMessage('Este e-mail já está cadastrado. Clique em Entrar ou em Esqueci minha senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      const dupCheck = await checkDuplicateRegistrationSupabase({
        email: cleanEmail,
        whatsapp: cleanPhone,
      });
      if (dupCheck.isDuplicate) {
        setErrorMessage(dupCheck.message || 'Este e-mail já está cadastrado. Clique em Entrar ou em Esqueci minha senha.');
        return;
      }

      // Cria motorista com status pendente até o ADM aprovar
      const newDriver: Driver = {
        id: '',
        name: cleanName,
        avatar: avatar,
        phone: cleanPhone,
        email: cleanEmail,
        cpf: '',
        cnh: `${cleanCnh} - Categoria B (EAR)`,
        category,
        vehicleModel: cleanModel,
        vehiclePlate: cleanPlate,
        vehicleColor: cleanColor,
        vehicleYear: parseInt(vehicleYear, 10) || 2024,
        cnhPhoto: cnhFrontPhoto,
        cnhFrontPhoto,
        cnhBackPhoto,
        crlvPhoto,
        approvalStatus: 'pendente',
        rating: 0,
        totalRides: 0,
        status: 'pending_approval',
        lat: -23.0903,
        lng: -47.2180,
        weeklyPlanActive: true,
        weeklyPlanExpiresAt: null,
        weeklyFeePaidAt: null,
        weeklyFeeExpiresAt: null,
        weeklyPlanPrice: 0,
        earningsToday: 0,
        earningsWeek: 0,
        cnhVerified: false,
        vehicleVerified: false,
        criminalRecordClear: true,
        registrationDate: new Date().toISOString().split('T')[0],
      };

      const appUser: AppUser = {
        id: newDriver.id,
        name: newDriver.name,
        email: newDriver.email,
        phone: newDriver.phone,
        whatsapp: cleanPhone,
        role: 'driver',
        tipo: 'driver',
        placa: cleanPlate,
        avatar: avatar,
        rating: 0,
        driverData: newDriver,
      };

      saveUserAccount({
        id: appUser.id,
        name: appUser.name,
        email: cleanEmail,
        phone: cleanPhone,
        whatsapp: cleanPhone,
        role: 'driver',
        tipo: 'driver',
        placa: cleanPlate,
        password,
        avatar: avatar,
        rating: 0,
        driverData: newDriver,
        createdAt: new Date().toISOString(),
        aceitou_contrato: true,
        aceitou_termos: true,
        aceitou_lgpd: true,
        data_aceite: new Date().toISOString(),
      }, true);

      await saveDriverApplicationSupabase({
        email: cleanEmail,
        name: cleanName,
        phone: cleanPhone,
        whatsapp: cleanPhone,
        category,
        vehicleModel: cleanModel,
        vehicleColor: cleanColor,
        vehiclePlate: cleanPlate,
        vehicleYear: parseInt(vehicleYear, 10) || 2024,
        cnh: cleanCnh,
        avatar,
        cnhFrontPhoto,
        cnhBackPhoto,
        crlvPhoto,
        approvalStatus: 'pendente',
        online: false,
        driverStatus: 'pending_approval',
      }).catch(() => {});

      try {
        confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
      } catch {}

      onRegisterSuccess(appUser, newDriver);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center items-center px-6 py-12 selection:bg-[#ff6a00] selection:text-white">
      <div className="w-full max-w-sm sm:max-w-md space-y-6 animate-fade-in">
        {/* Topo: Título RACE em laranja e subtítulo Cadastro Motorista */}
        <div className="text-center space-y-2">
          <h1 className="text-6xl sm:text-7xl font-heading font-black text-[#ff6a00] tracking-tighter uppercase select-none">
            RACE
          </h1>
          <p className="text-zinc-300 font-medium text-base sm:text-lg tracking-wide">
            Cadastro Motorista Parceiro
          </p>
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMessage && (
          <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-xl flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulário com campos de motorista: Nome, Email, Celular, Senha, Placa, Modelo do carro, Ano, CNH */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="flex items-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3">
            <label className="w-12 h-12 rounded-full bg-zinc-900 border-2 border-[#ff6a00] flex items-center justify-center overflow-hidden cursor-pointer shrink-0">
              {avatar ? <img src={avatar} alt="Foto" className="w-full h-full object-cover" /> : <Camera className="w-5 h-5 text-[#ff6a00]" />}
              <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </label>
            <div className="text-xs">
              <span className="font-bold text-white block">FOTO DE PERFIL * (OBRIGATÓRIA)</span>
              <span className="text-zinc-400">{avatar ? 'Foto anexada' : 'Toque ao lado para enviar'}</span>
            </div>
          </div>
          {/* NOME COMPLETO */}
          <div className="space-y-1">
            <label className="text-white text-xs font-bold uppercase tracking-wider block">
              NOME COMPLETO
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
            />
          </div>

          {/* EMAIL & CELULAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                EMAIL
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                CELULAR / WHATSAPP
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>
          </div>

          {/* SENHA */}
          <div className="space-y-1">
            <label className="text-white text-xs font-bold uppercase tracking-wider block">
              SENHA
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 dígitos"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-2.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* MODELO, COR & ANO */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                MODELO DO CARRO *
              </label>
              <input
                type="text"
                required
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="Ex: Onix Plus"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                COR DO CARRO *
              </label>
              <input
                type="text"
                required
                value={vehicleColor}
                onChange={(e) => setVehicleColor(e.target.value)}
                placeholder="Ex: Prata"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                ANO *
              </label>
              <input
                type="number"
                required
                min="2012"
                max="2026"
                value={vehicleYear}
                onChange={(e) => setVehicleYear(e.target.value)}
                placeholder="2024"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>
          </div>

          {/* PLACA & CNH */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                PLACA DO VEÍCULO *
              </label>
              <input
                type="text"
                required
                value={vehiclePlate}
                onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                placeholder="BRA2E19"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6a00] transition-colors uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-white text-xs font-bold uppercase tracking-wider block">
                CNH (COM EAR) *
              </label>
              <input
                type="text"
                required
                value={cnh}
                onChange={(e) => setCnh(e.target.value)}
                placeholder="01234567890"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6a00] transition-colors"
              />
            </div>
          </div>

          {/* FOTOS CNH FRENTE, CNH VERSO E CRLV */}
          <div className="grid grid-cols-3 gap-2">
            <label className={`p-2.5 rounded-xl border-2 text-center cursor-pointer flex flex-col items-center justify-center min-h-[82px] ${cnhFrontPhoto ? 'bg-emerald-950/30 border-emerald-500' : 'bg-[#1a1a1a] border-dashed border-[#2a2a2a] hover:border-[#ff6a00]'}`}>
              <input type="file" accept="image/*" onChange={(e) => handleDocUpload(e, setCnhFrontPhoto)} className="hidden" />
              {cnhFrontPhoto ? <img src={cnhFrontPhoto} alt="CNH Frente" className="w-full h-11 object-cover rounded mb-1" /> : <Camera className="w-4 h-4 text-[#ff6a00] mb-1" />}
              <span className="text-[10px] font-bold">{cnhFrontPhoto ? 'CNH Frente ✓' : 'CNH Frente *'}</span>
            </label>
            <label className={`p-2.5 rounded-xl border-2 text-center cursor-pointer flex flex-col items-center justify-center min-h-[82px] ${cnhBackPhoto ? 'bg-emerald-950/30 border-emerald-500' : 'bg-[#1a1a1a] border-dashed border-[#2a2a2a] hover:border-[#ff6a00]'}`}>
              <input type="file" accept="image/*" onChange={(e) => handleDocUpload(e, setCnhBackPhoto)} className="hidden" />
              {cnhBackPhoto ? <img src={cnhBackPhoto} alt="CNH Verso" className="w-full h-11 object-cover rounded mb-1" /> : <Camera className="w-4 h-4 text-[#ff6a00] mb-1" />}
              <span className="text-[10px] font-bold">{cnhBackPhoto ? 'CNH Verso ✓' : 'CNH Verso *'}</span>
            </label>
            <label className={`p-2.5 rounded-xl border-2 text-center cursor-pointer flex flex-col items-center justify-center min-h-[82px] ${crlvPhoto ? 'bg-emerald-950/30 border-emerald-500' : 'bg-[#1a1a1a] border-dashed border-[#2a2a2a] hover:border-[#ff6a00]'}`}>
              <input type="file" accept="image/*" onChange={(e) => handleDocUpload(e, setCrlvPhoto)} className="hidden" />
              {crlvPhoto ? <img src={crlvPhoto} alt="CRLV" className="w-full h-11 object-cover rounded mb-1" /> : <Camera className="w-4 h-4 text-[#ff6a00] mb-1" />}
              <span className="text-[10px] font-bold">{crlvPhoto ? 'CRLV ✓' : 'Foto CRLV *'}</span>
            </label>
          </div>

          {/* CATEGORIA */}
          <div className="space-y-1">
            <label className="text-white text-xs font-bold uppercase tracking-wider block">
              CATEGORIA DO SERVIÇO
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as VehicleCategory)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-[#ff6a00] transition-colors"
            >
              <option value="economica">RACE Econômica (Carro Hatch/Sedã)</option>
              <option value="confort">RACE Confort (Sedã Médio/SUV)</option>
              <option value="moto_passageiro">RACE Moto Passageiro</option>
              <option value="moto_entrega">RACE Flash (Entregas)</option>
            </select>
          </div>

          <LegalConsentSection
            acceptedContract={acceptedContract}
            acceptedTerms={acceptedTerms}
            acceptedLgpd={acceptedLgpd}
            onChangeContract={setAcceptedContract}
            onChangeTerms={setAcceptedTerms}
            onChangeLgpd={setAcceptedLgpd}
            theme="dark"
          />

          {errorMessage && (
            <div className="bg-red-950/90 border border-red-500 text-red-200 text-xs sm:text-sm p-3.5 rounded-xl flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* BOTÃO CADASTRAR */}
          <button
            type="submit"
            disabled={isSubmitting || !acceptedContract || !acceptedTerms || !acceptedLgpd}
            className={`w-full font-heading font-black text-base py-3.5 px-6 rounded-xl transition-all uppercase tracking-wider block mt-5 ${
              !isSubmitting && acceptedContract && acceptedTerms && acceptedLgpd
                ? 'bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white cursor-pointer shadow-lg shadow-blue-600/25'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700 opacity-60'
            }`}
          >
            {isSubmitting
              ? 'VERIFICANDO CADASTRO...'
              : acceptedContract && acceptedTerms && acceptedLgpd
              ? 'CONCLUIR CADASTRO MOTORISTA'
              : 'ACEITE CONTRATO, TERMOS E LGPD PARA SALVAR'}
          </button>

          {/* Voltar para login */}
          <div className="text-center pt-1.5">
            <button
              type="button"
              onClick={onBackToLogin}
              className="text-[#ff6a00] hover:underline text-sm font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Já tenho conta - Fazer Login</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
