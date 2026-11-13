/**
 * Serviço de Notificação por Áudio e Voz do RACE
 * - Web Speech API: Sintetizador de voz em Português (pt-BR)
 * - Web Audio API: Toque de sino/chime harmônico (ding)
 * - Vibração tátil no celular via navigator.vibrate
 * - Controle de liga/desliga persistido em localStorage (padrão: ligado)
 */

const AUDIO_ENABLED_KEY = 'race_audio_enabled';

// Verifica se o áudio está ligado (padrão: true)
export function isAudioEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const val = localStorage.getItem(AUDIO_ENABLED_KEY);
    if (val === null) return true;
    return val === 'true';
  } catch {
    return true;
  }
}

// Altera o estado do áudio e emite evento para sincronizar componentes
export function setAudioEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUDIO_ENABLED_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('race_audio_toggle', { detail: { enabled } }));
  } catch {}
}

// Alterna o estado do áudio
export function toggleAudio(): boolean {
  const next = !isAudioEnabled();
  setAudioEnabled(next);
  return next;
}

// Toca som de notificação (chime / ding duplo harmônico) via Web Audio API
export function playChimeSound(): void {
  if (!isAudioEnabled() || typeof window === 'undefined') return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Primeiro tom: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.35, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.19);

    // Segundo tom: A5 (880.00 Hz) - clássico ding de chegada
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, now + 0.12);
    gain2.gain.setValueAtTime(0.001, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.45, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.66);

    // Fecha o contexto após o término para economizar recursos
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1000);
  } catch (err) {
    console.debug('Web Audio API não inicializada:', err);
  }
}

// Vibra o celular do usuário
export function vibrateDevice(pattern: number | number[] = 500): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

/**
 * Fala uma frase em português (pt-BR) usando Web Speech API
 */
export function speakText(text: string, vibratePattern: number | number[] = 500): void {
  if (!isAudioEnabled() || typeof window === 'undefined') return;

  // 1. Toca o ding sonoro e vibra o celular
  playChimeSound();
  vibrateDevice(vibratePattern);

  // 2. Toca a voz sintetizada em português
  if ('speechSynthesis' in window) {
    try {
      // Cancela falas anteriores para não encavalar
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.02; // Velocidade natural
      utterance.pitch = 1.05; // Tom amigável
      utterance.volume = 1.0;

      // Seleciona voz nativa em português se disponível
      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().includes('pt-br') ||
          v.lang.toLowerCase().includes('pt_br') ||
          v.lang.toLowerCase().startsWith('pt')
      );
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.debug('Erro ao executar síntese de voz:', err);
    }
  }
}

// Interrompe imediatamente qualquer fala em andamento (ex: ao cancelar busca)
export function cancelVoiceSpeech(): void {
  if (typeof window === 'undefined') return;
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  } catch {}
}

// Notificação 1: Quando o motorista/motoboy chega ao ponto de embarque
export function notifyDriverArrived(isMotoboy: boolean = false): void {
  const phrase = isMotoboy ? 'Seu motoboy chegou' : 'Seu motorista chegou';
  speakText(phrase, [200, 100, 200, 100, 400]);
}

// Notificação 2: Quando o motorista/motoboy aceita a corrida e está a caminho
export function notifyDriverAccepted(isMotoboy: boolean = false): void {
  const phrase = isMotoboy ? 'Motoboy a caminho!' : 'Motorista a caminho!';
  speakText(phrase, [200, 100, 200]);
}

// Notificação 3: Quando a corrida é finalizada e o destino é alcançado
export function notifyRideFinished(): void {
  speakText('Você chegou ao seu destino', [300, 150, 300]);
}

// Instrução de navegação curva a curva por voz (sem vibração repetitiva enquanto dirige)
export function speakNavigationInstruction(text: string): void {
  if (!isAudioEnabled() || typeof window === 'undefined' || !text) return;
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const ptVoice = voices.find(
        (v) =>
          v.lang.toLowerCase().includes('pt-br') ||
          v.lang.toLowerCase().includes('pt_br') ||
          v.lang.toLowerCase().startsWith('pt')
      );
      if (ptVoice) {
        utterance.voice = ptVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.debug('Erro na voz de navegação:', err);
    }
  }
}

