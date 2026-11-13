import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react';
import { getUsuarioSupabase, updatePasswordSupabase } from '../supabase';
import {
  ADMIN_EMAIL,
  findLocalUserAccount,
  updateUserPasswordLocal,
} from '../services/userService';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIdentifier?: string;
  onPasswordResetSuccess: (resolvedIdentifier: string, successMessage: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialIdentifier = '',
  onPasswordResetSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [resolvedEmail, setResolvedEmail] = useState('');
  const [resolvedName, setResolvedName] = useState('');
  const [resolvedContactHint, setResolvedContactHint] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setIdentifier(initialIdentifier || '');
      setResolvedEmail('');
      setResolvedName('');
      setResolvedContactHint('');
      setGeneratedCode('');
      setCodeInput('');
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setErrorMessage(null);
      setIsLoading(false);
    }
  }, [isOpen, initialIdentifier]);

  if (!isOpen) return null;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const clean = identifier.trim().toLowerCase();
    if (!clean) {
      setErrorMessage('Digite seu Login ou E-mail cadastrado.');
      return;
    }

    setIsLoading(true);
    try {
      let foundEmail = '';
      let foundName = '';
      let foundPhone = '';

      if (clean === ADMIN_EMAIL) {
        foundEmail = ADMIN_EMAIL;
        foundName = 'Administrador Geral';
        foundPhone = '(19) 99999-0000';
      } else {
        // 1. Verifica na nuvem (Supabase public.usuarios)
        const cloudUser = await getUsuarioSupabase(clean);
        if (cloudUser) {
          foundEmail = (cloudUser['e-mail'] || cloudUser.email || clean).toLowerCase().trim();
          foundName = cloudUser.nome || 'Usuário RACE';
          foundPhone = cloudUser.celular || cloudUser.whatsapp || '';
        } else {
          // 2. Verifica no armazenamento local
          const localUser = findLocalUserAccount(clean);
          if (localUser) {
            foundEmail = localUser.email.toLowerCase().trim();
            foundName = localUser.name || 'Usuário RACE';
            foundPhone = localUser.whatsapp || localUser.phone || '';
          }
        }
      }

      if (!foundEmail) {
        setErrorMessage('Login ou E-mail não encontrado no sistema. Confira os dados digitados.');
        return;
      }

      const code = String(Math.floor(1000 + Math.random() * 9000));
      console.log(`[RACE] Código de redefinição de senha para ${foundEmail}: ${code}`);

      setResolvedEmail(foundEmail);
      setResolvedName(foundName);
      setResolvedContactHint(foundPhone ? `${foundEmail} / WhatsApp ${foundPhone}` : foundEmail);
      setGeneratedCode(code);
      setCodeInput('');
      setStep(2);
    } catch {
      setErrorMessage('Não foi possível verificar o cadastro agora. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = () => {
    const newCode = String(Math.floor(1000 + Math.random() * 9000));
    console.log(`[RACE] Novo código de redefinição de senha para ${resolvedEmail}: ${newCode}`);
    setGeneratedCode(newCode);
    setCodeInput('');
    setErrorMessage(null);
  };

  const handleConfirmCode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const digits = codeInput.replace(/\D/g, '');
    if (digits.length !== 4) {
      setErrorMessage('Digite o código de 4 números enviado para seu WhatsApp / E-mail.');
      return;
    }

    if (digits !== generatedCode) {
      setErrorMessage('Código incorreto. Confira os 4 números e tente novamente.');
      return;
    }

    setStep(3);
  };

  const handleSaveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('As senhas não conferem');
      return;
    }

    setIsLoading(true);
    try {
      const targetEmail = resolvedEmail || identifier.trim().toLowerCase();

      // 1. Atualiza na tabela public.usuarios no Supabase
      const cloudRes = await updatePasswordSupabase(targetEmail, newPassword, resolvedName);
      if (!cloudRes.success && targetEmail !== ADMIN_EMAIL) {
        // Se existir conta local mesmo offline/não encontrada na nuvem, ainda salva localmente
        const localExists = findLocalUserAccount(targetEmail);
        if (!localExists) {
          setErrorMessage(cloudRes.error || 'Erro ao salvar nova senha no Supabase.');
          return;
        }
      }

      // 2. Atualiza no armazenamento local (inclui conta ADM, motoristas, motoboys e passageiros)
      updateUserPasswordLocal(targetEmail, newPassword);

      // 3. Retorna à tela de login com a mensagem de confirmação
      onPasswordResetSuccess(targetEmail, 'Senha alterada! Entre com a nova senha');
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Erro ao salvar a nova senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#111111] border border-zinc-800 rounded-3xl p-6 sm:p-7 text-white shadow-2xl relative space-y-5">
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cabeçalho + Indicador de 3 Passos */}
        <div className="space-y-2 pr-8">
          <div className="flex items-center gap-2 text-[#ff6a00]">
            <KeyRound className="w-5 h-5" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">
              Recuperar Acesso • Passo {step} de 3
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-heading font-black text-white">
            Esqueci a senha
          </h3>
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <div className={`h-1.5 rounded-full ${step >= 1 ? 'bg-[#ff6a00]' : 'bg-zinc-800'}`} />
            <div className={`h-1.5 rounded-full ${step >= 2 ? 'bg-[#ff6a00]' : 'bg-zinc-800'}`} />
            <div className={`h-1.5 rounded-full ${step >= 3 ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
          </div>
        </div>

        {/* Mensagem de erro */}
        {errorMessage && (
          <div className="bg-red-950/80 border border-red-500/80 text-red-200 text-xs sm:text-sm p-3.5 rounded-2xl font-bold flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PASSO 1: Login / E-mail cadastrado */}
        {step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <p className="text-xs sm:text-sm text-zinc-400">
              Informe seu Login ou E-mail cadastrado (ADM, Motorista, Motoboy ou Passageiro) para receber o código de 4 números.
            </p>

            <div className="space-y-1.5">
              <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                Login / E-mail cadastrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-4" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Ex: admin@race.com.br"
                  className="w-full bg-[#1a1a1a] border border-zinc-700 text-white placeholder-zinc-500 rounded-2xl pl-10 pr-4 py-3.5 text-sm sm:text-base focus:outline-none focus:border-[#ff6a00] transition-colors font-medium"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#ff6a00] hover:bg-[#e05e00] disabled:opacity-60 active:scale-[0.99] text-white font-heading font-black text-base py-4 px-5 rounded-2xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/25 uppercase tracking-wider"
            >
              {isLoading ? 'VERIFICANDO...' : 'ENVIAR CÓDIGO'}
            </button>
          </form>
        )}

        {/* PASSO 2: Código de 4 números */}
        {step === 2 && (
          <form onSubmit={handleConfirmCode} className="space-y-4">
            <div className="bg-emerald-950/60 border border-emerald-500/60 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase">
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span>Código enviado para WhatsApp / E-mail</span>
              </div>
              <p className="text-xs text-zinc-300 break-all">
                Destino: <span className="font-bold text-white">{resolvedContactHint}</span>
              </p>
              <div className="mt-2 bg-amber-400 text-black rounded-xl px-3 py-2 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider block">
                  Seu código de verificação (WhatsApp / E-mail)
                </span>
                <span className="text-2xl font-mono font-black tracking-[0.25em]">
                  {generatedCode}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                Código de 4 números
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                required
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0000"
                className="w-full bg-[#1a1a1a] border border-zinc-700 text-white placeholder-zinc-600 rounded-2xl px-4 py-4 text-center text-3xl font-mono font-black tracking-[0.4em] focus:outline-none focus:border-[#ff6a00] transition-colors"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full bg-[#ff6a00] hover:bg-[#e05e00] active:scale-[0.99] text-white font-heading font-black text-base py-4 px-5 rounded-2xl transition-all cursor-pointer shadow-lg shadow-[#ff6a00]/25 uppercase tracking-wider"
            >
              CONFIRMAR CÓDIGO
            </button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setErrorMessage(null);
                  setStep(1);
                }}
                className="text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Trocar e-mail</span>
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                className="text-[#ff6a00] hover:underline cursor-pointer font-bold"
              >
                Reenviar código
              </button>
            </div>
          </form>
        )}

        {/* PASSO 3: Criar Nova Senha */}
        {step === 3 && (
          <form onSubmit={handleSaveNewPassword} className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center gap-2 text-xs text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Código confirmado para {resolvedEmail}</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                Nova senha (mínimo 6 caracteres)
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-[#1a1a1a] border border-zinc-700 text-white placeholder-zinc-500 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-emerald-500 transition-colors pr-12 font-medium"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-3.5 text-zinc-400 hover:text-white cursor-pointer"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-zinc-300 text-xs font-bold uppercase tracking-wider block">
                Confirmar nova senha
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full bg-[#1a1a1a] border border-zinc-700 text-white placeholder-zinc-500 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-emerald-500 transition-colors pr-12 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-3.5 text-zinc-400 hover:text-white cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 active:scale-[0.99] text-white font-heading font-black text-base py-4 px-5 rounded-2xl transition-all cursor-pointer shadow-lg shadow-emerald-600/25 uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isLoading ? 'SALVANDO SENHA...' : 'SALVAR NOVA SENHA'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
