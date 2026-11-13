import React, { useState } from 'react';
import { AppUser } from '../types';
import { Eye, EyeOff, AlertTriangle, ArrowLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { saveUserAccount } from '../services/userService';

interface PassengerRegisterViewProps {
  onRegisterSuccess: (user: AppUser) => void;
  onBackToLogin: () => void;
  existingPassengers?: AppUser[];
}

export const PassengerRegisterView: React.FC<PassengerRegisterViewProps> = ({
  onRegisterSuccess,
  onBackToLogin,
  existingPassengers = [],
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || !cleanEmail || !cleanPhone || !password || !confirmPassword) {
      setErrorMessage('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem. Verifique e tente novamente.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 dígitos.');
      return;
    }

    if (existingPassengers.some((p) => p.email.toLowerCase() === cleanEmail)) {
      setErrorMessage('Já existe uma conta cadastrada com este e-mail. Faça login para continuar.');
      return;
    }

    const newPassenger: AppUser = {
      id: `psg-${Date.now().toString().slice(-5)}`,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      role: 'passenger',
      tipo: 'passenger',
      avatar: '',
      rating: 0,
      password: password,
    };

    // Salva direto no Supabase (sem logar automaticamente)
    saveUserAccount({
      id: newPassenger.id,
      name: newPassenger.name,
      email: newPassenger.email,
      phone: newPassenger.phone,
      role: 'passenger',
      tipo: 'passenger',
      placa: '',
      password: password,
      avatar: '',
      rating: 0,
      rides: [],
      createdAt: new Date().toISOString(),
    }, false);

    try {
      confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
    } catch {}

    onRegisterSuccess(newPassenger);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col justify-center items-center px-6 py-12 selection:bg-[#ff6a00] selection:text-white">
      <div className="w-full max-w-sm sm:max-w-md space-y-7 animate-fade-in">
        {/* Topo: Título RACE em laranja e subtítulo Cadastro Passageiro */}
        <div className="text-center space-y-2">
          <h1 className="text-6xl sm:text-7xl font-heading font-black text-[#ff6a00] tracking-tighter uppercase select-none">
            RACE
          </h1>
          <p className="text-zinc-300 font-medium text-base sm:text-lg tracking-wide">
            Cadastro Passageiro
          </p>
        </div>

        {/* Mensagem de Erro se houver */}
        {errorMessage && (
          <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-xl flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulário de Cadastro Passageiro */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* NOME COMPLETO */}
          <div className="space-y-1.5">
            <label className="text-white text-xs font-bold uppercase tracking-wider block">
              NOME COMPLETO
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome completo"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
            />
          </div>

          {/* EMAIL */}
          <div className="space-y-1.5">
            <label className="text-white text-xs font-bold uppercase tracking-wider block">
              EMAIL
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu.email@exemplo.com"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
            />
          </div>

          {/* CELULAR */}
          <div className="space-y-1.5">
            <label className="text-white text-xs font-bold uppercase tracking-wider block">
              CELULAR / WHATSAPP
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 98765-4321"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
            />
          </div>

          {/* SENHA */}
          <div className="space-y-1.5">
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
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* CONFIRMAR SENHA */}
          <div className="space-y-1.5">
            <label className="text-white text-xs font-bold uppercase tracking-wider block">
              CONFIRMAR SENHA
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite a senha novamente"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white placeholder-zinc-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#ff6a00] transition-colors"
            />
          </div>

          {/* BOTÃO CADASTRAR */}
          <button
            type="submit"
            className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white font-heading font-black text-base py-3.5 px-6 rounded-xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/20 uppercase tracking-wider block mt-6"
          >
            CADASTRAR E PEDIR CORRIDA
          </button>

          {/* Voltar para login */}
          <div className="text-center pt-2">
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
