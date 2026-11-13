import React, { useState, useEffect } from 'react';
import { 
  Driver, 
  LocationPoint, 
  PushNotification, 
  Ride, 
  VehicleCategory 
} from './types';
import { 
  INITIAL_DRIVERS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_RIDES_HISTORY,
  DEFAULT_NEW_DRIVER
} from './data/mockData';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { MapRealtime } from './components/MapRealtime';
import { PassengerRideView } from './components/PassengerRideView';
import { DeliveryFlashView } from './components/DeliveryFlashView';
import { DriverPartnerPortal } from './components/DriverPartnerPortal';
import { DriverWorkSelectionView } from './components/DriverWorkSelectionView';
import { AdminDashboard } from './components/AdminDashboard';
import { RideHistoryView } from './components/RideHistoryView';
import { Support24hModal } from './components/Support24hModal';
import { SosModal } from './components/SosModal';
import { PushNotificationToast } from './components/PushNotificationToast';
import { ShareModal } from './components/ShareModal';
import { AuthModal } from './components/AuthModal';
import { DriverLoginScreen } from './components/DriverLoginScreen';
import { FullMapView } from './components/FullMapView';
import { PassengerOptionsView } from './components/PassengerOptionsView';
import { PassengerAccountView } from './components/PassengerAccountView';
import { RatingModal } from './components/RatingModal';
import { saveDriverReview } from './services/reviewService';
import { AppUser } from './types';
import { AlertTriangle, CheckCircle2, X, QrCode } from 'lucide-react';
import confetti from 'canvas-confetti';
import { WEEKLY_FEE, WEEKLY_FEE_TEXT, COMMISSION, WEEKLY_FEE_BADGE } from './config/pricing';
import { 
  getIsolatedUserRides, 
  saveIsolatedRide, 
  saveUserAccount, 
  getUserAccount, 
  normalizeEmail,
  ADMIN_EMAIL,
  deleteUserAccount,
  deleteAllUserAccounts,
  activateAllDriverAccounts,
  getAllRegisteredPassengers
} from './services/userService';
import {
  notifyDriverAccepted,
  notifyDriverArrived,
  notifyRideFinished
} from './services/audioNotificationService';
import {
  getDriverBalance,
  addDriverEarnings,
  checkMondayAutoDeduction
} from './services/walletService';
import { getCorridasSupabase, savePagamentoSupabase } from './supabase';

export default function App() {
  // Global States - Inicialmente no Portal de Motorista e deslogado para exibir a tela preta e laranja
  const [activeTab, setActiveTab] = useState<TabType>('driver_portal');
  const [isFullMapOpen, setIsFullMapOpen] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>(() => {
    try {
      const stored = localStorage.getItem('race_registered_drivers');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          Array.isArray(parsed) &&
          !parsed.some((d: any) => d.email?.includes('raceapp.com.br') || d.id === 'drv-01')
        ) {
          return parsed;
        }
      }
    } catch {}
    return INITIAL_DRIVERS;
  });

  // currentDriver carrega estritamente os dados do motorista autenticado (ou padrão novo)
  const [currentDriver, setCurrentDriver] = useState<Driver>(() => {
    try {
      const storedUser = localStorage.getItem('race_current_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u && u.driverData) return u.driverData;
        if (u && u.email) {
          const acc = getUserAccount(u.email);
          if (acc && acc.driverData) return acc.driverData;
        }
      }
    } catch {}
    return DEFAULT_NEW_DRIVER;
  });
  const [ridesHistory, setRidesHistory] = useState<Ride[]>(INITIAL_RIDES_HISTORY);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [completedRideForRating, setCompletedRideForRating] = useState<Ride | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>('economica');

  // Registered Passengers State
  const [passengers, setPassengers] = useState<AppUser[]>(() => {
    try {
      const stored = localStorage.getItem('race_registered_passengers');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // 1. Authentication & Session - Auto-login persistente via localStorage
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const stored = localStorage.getItem('race_current_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.email && !parsed.email.includes('raceapp.com.br')) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loginSuccessBanner, setLoginSuccessBanner] = useState<string | null>(null);

  // Map and Route States (Foco exclusivo em Indaiatuba - SP com número)
  const [pickup, setPickup] = useState<LocationPoint | null>({
    address: 'Av. Presidente Vargas, 1250 - Centro, Indaiatuba-SP',
    lat: -23.0842,
    lng: -47.2118,
  });
  const [destination, setDestination] = useState<LocationPoint | null>({
    address: 'Av. dos Trabalhadores, 350 - Jardim América, Indaiatuba-SP',
    lat: -23.0805,
    lng: -47.2050,
  });
  const [mapSelectionMode, setMapSelectionMode] = useState<'pickup' | 'destination' | null>(null);

  // Animated driver position along simulated route (Início na Av. Presidente Vargas, Indaiatuba)
  const [driverPosition, setDriverPosition] = useState<{ lat: number; lng: number } | undefined>({
    lat: -23.0842,
    lng: -47.2118,
  });

  // Modals & Push Notifications
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isNotifCenterOpen, setIsNotifCenterOpen] = useState(false);
  const [notifications, setNotifications] = useState<PushNotification[]>(INITIAL_NOTIFICATIONS);
  const [currentToast, setCurrentToast] = useState<PushNotification | null>(null);


  // 2. Auto-login no App.tsx: verificar localStorage.getItem('race_current_user') e restaurar sessão ativa
  useEffect(() => {
    try {
      const stored = localStorage.getItem('race_current_user');
      if (stored) {
        const parsed: AppUser = JSON.parse(stored);
        if (parsed && parsed.email && !parsed.email.includes('raceapp.com.br')) {
          setCurrentUser(parsed);

          // Se for admin, direciona para o painel de administração
          if (parsed.role === 'admin' || parsed.isAdmin || parsed.email.toLowerCase() === 'admin@race.com.br') {
            setActiveTab('admin');
            return;
          }

          const isDriverOrMotoboy =
            parsed.tipo === 'driver' ||
            parsed.tipo === 'motoboy' ||
            parsed.role === 'driver' ||
            parsed.role === 'motoboy' ||
            parsed.tipo === 'motorista_economico' ||
            parsed.tipo === 'motorista_confort' ||
            parsed.tipo === 'motoboy_passageiro' ||
            parsed.tipo === 'motoboy_entregas';

          if (isDriverOrMotoboy) {
            // Restaura dados ISOLADOS deste motorista/motoboy
            const userAcc = getUserAccount(parsed.email);
            const matched = userAcc?.driverData || parsed.driverData;
            if (matched) {
              const currentBalance = getDriverBalance(matched.id, matched.walletBalance || 0);

              const updatedMatched: Driver = {
                ...matched,
                walletBalance: currentBalance,
                weeklyPlanActive: true,
                status: 'online',
              };
              setCurrentDriver(updatedMatched);
              setLoginSuccessBanner(
                `Bem-vindo(a) de volta, ${matched.name}! Você recebe 85% de cada corrida sem mensalidade. Central de Corridas pronta para receber chamados.`
              );
            }
          }
          setActiveTab('rides');
        }
      }
    } catch {}
  }, []);

  // Sincronizar corridas isoladas da nuvem Supabase para o usuário logado
  useEffect(() => {
    if (!currentUser) return;
    getCorridasSupabase(currentUser)
      .then((cloudRides) => {
        if (cloudRides && cloudRides.length > 0) {
          setRidesHistory(cloudRides);
        }
      })
      .catch((err) => {
        console.warn('Aviso ao sincronizar corridas do Supabase:', err);
      });
  }, [currentUser]);

  // 3. Rota Secreta /admin: abre o AdminDashboard se o usuário for admin, senão volta para tela preta de login
  useEffect(() => {
    const checkSecretAdminRoute = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const isTryingAdmin = hash === '#/admin' || hash === '#admin' || path.endsWith('/admin');

      if (isTryingAdmin) {
        let savedUser: AppUser | null = currentUser;
        if (!savedUser) {
          try {
            const raw = localStorage.getItem('race_current_user');
            if (raw) savedUser = JSON.parse(raw);
          } catch {}
        }

        const isUserAdmin = savedUser?.email?.trim().toLowerCase() === 'admin@race.com.br';

        if (isUserAdmin && savedUser) {
          // Usuário é admin: abre o AdminDashboard
          setCurrentUser(savedUser);
          setActiveTab('admin');
        } else {
          // Não é admin: volta para a tela preta de login
          try {
            localStorage.removeItem('race_current_user');
          } catch {}
          setCurrentUser(null);
          if (window.location.hash) {
            try {
              window.history.replaceState(null, '', window.location.pathname);
            } catch {}
          }
        }
      }
    };

    checkSecretAdminRoute();
    window.addEventListener('hashchange', checkSecretAdminRoute);
    return () => window.removeEventListener('hashchange', checkSecretAdminRoute);
  }, [currentUser]);

  // Motoristas trabalham livres sem bloqueio de taxa semanal (modelo 15% Race / 85% motorista)

  // Simulated GPS movement when a ride is active
  useEffect(() => {
    if (!activeRide || !activeRide.driver || activeRide.status === 'completed') {
      setDriverPosition(undefined);
      return;
    }

    let step = 0;
    const startLat = activeRide.driver.lat;
    const startLng = activeRide.driver.lng;
    const targetLat = activeRide.pickup.lat;
    const targetLng = activeRide.pickup.lng;

    const interval = setInterval(() => {
      step += 1;
      const progress = Math.min(step / 30, 1);
      const curLat = startLat + (targetLat - startLat) * progress;
      const curLng = startLng + (targetLng - startLng) * progress;

      setDriverPosition({ lat: curLat, lng: curLng });

      if (progress >= 1) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeRide]);

  // Dispatch a push notification
  const triggerPush = (title: string, message: string, type: 'ride' | 'financial' | 'safety' | 'system' = 'ride') => {
    const newNotif: PushNotification = {
      id: `push-${Date.now()}`,
      title,
      message,
      time: 'Agora',
      type,
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setCurrentToast(newNotif);

    // Auto dismiss toast after 6 seconds
    setTimeout(() => {
      setCurrentToast((curr) => (curr?.id === newNotif.id ? null : curr));
    }, 6000);
  };

  // Passenger requests a ride - vai DIRETO para o FullMapView fullscreen
  const handleStartRide = (ride: Ride) => {
    setActiveRide(ride);
    setIsFullMapOpen(true);
    const isMotoboy =
      ride.category === 'moto_passageiro' ||
      ride.category === 'moto_entrega' ||
      ride.driver?.category === 'moto_passageiro' ||
      ride.driver?.category === 'moto_entrega';
    notifyDriverAccepted(isMotoboy);
    triggerPush(
      '🚗 Corrida Confirmada!',
      `Seu motorista ${ride.driver?.name} está a caminho em um ${ride.driver?.vehicleModel} (${ride.driver?.vehiclePlate}).`,
      'ride'
    );
  };

  // Complete active ride - fecha mapa e abre modal de Avaliação
  const handleCompleteRide = () => {
    if (!activeRide) return;
    const updatedRide: Ride = {
      ...activeRide,
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
    setActiveRide(updatedRide);
    setCompletedRideForRating(updatedRide);
    setIsRatingModalOpen(true);
    setIsFullMapOpen(false); // Retorna do mapa para tela de avaliação
    notifyRideFinished();

    // Credita o valor da corrida na carteira do motorista
    if (activeRide.driver?.id) {
      const updatedBalance = addDriverEarnings(activeRide.driver.id, activeRide.price);
      setCurrentDriver((prev) => {
        if (!prev) return prev;
        if (prev.id === activeRide.driver?.id) {
          return {
            ...prev,
            walletBalance: updatedBalance,
            earningsToday: (prev.earningsToday || 0) + activeRide.price,
            earningsWeek: (prev.earningsWeek || 0) + activeRide.price,
          };
        }
        return prev;
      });
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === activeRide.driver?.id
            ? {
                ...d,
                walletBalance: updatedBalance,
                earningsToday: d.earningsToday + activeRide.price,
                earningsWeek: d.earningsWeek + activeRide.price,
              }
            : d
        )
      );
    }

    triggerPush(
      '🏁 Viagem Finalizada!',
      `Total de R$ ${activeRide.price.toFixed(2)} creditado no saldo do motorista! Avalie seu condutor.`,
      'ride'
    );
  };

  // Submit rating
  const handleSubmitRating = (rating: number, comment: string, issueComment?: string) => {
    const targetRide = completedRideForRating || activeRide;
    if (!targetRide) return;

    const finalizedRide: Ride = {
      ...targetRide,
      passengerId: currentUser?.id,
      passengerEmail: currentUser?.email,
      passengerName: currentUser?.name || targetRide.passengerName || 'Passageiro',
      ratingGivenToDriver: rating,
      ratingComment: comment,
      issueComment: issueComment,
    };
    setRidesHistory((prev) => [finalizedRide, ...prev]);
    saveIsolatedRide(finalizedRide, currentUser);

    // Salva na base de avaliações e comentários dos motoristas
    saveDriverReview({
      rideId: finalizedRide.id,
      driverId: targetRide.driver?.id || 'drv-indaiatuba-1',
      driverName: targetRide.driver?.name || 'José da Cruz',
      driverVehicle: targetRide.driver?.vehicleModel
        ? `${targetRide.driver.vehicleModel} - ${targetRide.driver.vehiclePlate}`
        : 'Chevrolet Onix - RCE9C40',
      passengerName: currentUser?.name || targetRide.passengerName || 'Passageiro',
      passengerEmail: currentUser?.email,
      rating,
      comment,
      issueComment,
    });

    // Atualiza a média de avaliação do condutor
    if (targetRide.driver?.id) {
      const driverId = targetRide.driver.id;
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id === driverId) {
            const currentTotal = d.totalRides || 25;
            const newAverage = Number(((d.rating * currentTotal + rating) / (currentTotal + 1)).toFixed(2));
            return {
              ...d,
              rating: newAverage,
              totalRides: currentTotal + 1,
            };
          }
          return d;
        })
      );

      setCurrentDriver((prev) => {
        if (!prev) return prev;
        const currentTotal = prev.totalRides || 25;
        const newAverage = Number(((prev.rating * currentTotal + rating) / (currentTotal + 1)).toFixed(2));
        return {
          ...prev,
          rating: newAverage,
          totalRides: currentTotal + 1,
        };
      });
    }

    setActiveRide(null);
    setCompletedRideForRating(null);
    setIsRatingModalOpen(false);

    triggerPush(
      '⭐ Obrigado pela Avaliação!',
      `Sua nota de ${rating} estrelas foi registrada com sucesso!`,
      'safety'
    );
  };

  // Cancel active ride
  const handleCancelRide = () => {
    setActiveRide(null);
    triggerPush(
      '❌ Corrida Cancelada',
      'A corrida foi cancelada. Nenhum valor foi debitado.',
      'system'
    );
  };

  // Delivery Flash order
  const handleStartDelivery = (ride: Ride) => {
    setActiveRide(ride);
    notifyDriverAccepted(true); // Notificação com voz para motoboy a caminho
    triggerPush(
      '📦 RACE Flash Acionado!',
      `O motoboy ${ride.driver?.name} foi despachado para coleta. Código de entrega: ${ride.deliveryDetails?.deliveryCode}.`,
      'ride'
    );
  };

  // Map interaction
  const handleMapClick = (coords: { lat: number; lng: number; address: string }) => {
    if (mapSelectionMode === 'pickup') {
      setPickup(coords);
      setMapSelectionMode(null);
      triggerPush('📍 Ponto de Embarque Marcado', coords.address, 'system');
    } else if (mapSelectionMode === 'destination') {
      setDestination(coords);
      setMapSelectionMode(null);
      triggerPush('🏁 Destino Marcado', coords.address, 'system');
    }
  };

  // Driver register / updates
  const handleRegisterDriver = (newDriver: Driver) => {
    setDrivers((prev) => {
      const next = [newDriver, ...prev.filter((d) => d.id !== newDriver.id)];
      try {
        localStorage.setItem('race_registered_drivers', JSON.stringify(next));
      } catch {}
      return next;
    });
    setCurrentDriver(newDriver);

    // Sincroniza a conta isolada do condutor
    saveUserAccount({
      id: newDriver.id,
      name: newDriver.name,
      email: newDriver.email,
      phone: newDriver.phone,
      password: newDriver.password,
      role: (newDriver.category === 'moto_passageiro' || newDriver.category === 'moto_entrega') ? 'motoboy' : 'driver',
      tipo: newDriver.category === 'economica' ? 'motorista_economico' :
            newDriver.category === 'confort' ? 'motorista_confort' :
            newDriver.category === 'moto_passageiro' ? 'motoboy_passageiro' : 'motoboy_entregas',
      placa: newDriver.vehiclePlate,
      avatar: newDriver.avatar,
      rating: newDriver.rating,
      driverData: newDriver,
      createdAt: new Date().toISOString(),
    });

    triggerPush(
      '🎉 Bem-vindo à RACE!',
      `Cadastro de ${newDriver.name} concluído com sucesso. Ative sua assinatura semanal de ${WEEKLY_FEE_TEXT} para começar a receber corridas com 100% dos ganhos livres!`,
      'financial'
    );
  };

  const handleUpdateDriver = (updated: Driver) => {
    setCurrentDriver(updated);
    setDrivers((prev) => {
      const next = prev.map((d) => (d.id === updated.id ? updated : d));
      try {
        localStorage.setItem('race_registered_drivers', JSON.stringify(next));
      } catch {}
      return next;
    });

    // Sincroniza a conta isolada do condutor em race_user_${email}
    if (updated.email) {
      const userAcc = getUserAccount(updated.email);
      if (userAcc) {
        saveUserAccount({
          ...userAcc,
          driverData: updated,
          placa: updated.vehiclePlate,
        });
      }
    }
  };

  const handleToggleDriverStatus = (driverId: string) => {
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driverId
          ? { ...d, status: d.status === 'online' ? 'offline' : 'online' }
          : d
      )
    );
  };

  const handleRenewWeeklyPlan = (driverTarget?: Driver | null) => {
    const target = driverTarget || currentDriver;
    if (!target) return;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const updated: Driver = {
      ...target,
      weeklyFeePaidAt: now.toISOString(),
      weeklyFeeExpiresAt: expiresAt.toISOString(),
      weeklyPlanExpiresAt: expiresAt.toISOString(),
      weeklyPlanActive: true,
      weeklyPlanPrice: WEEKLY_FEE,
      status: 'online',
    };
    handleUpdateDriver(updated);
    if (currentUser?.driverData?.id === updated.id) {
      setCurrentUser((prev) => (prev ? { ...prev, driverData: updated } : null));
    }
    triggerPush(
      '🎉 Status Online Ativado!',
      'Modelo sem taxas fixas: você fica com 85% de cada corrida e a Race com 15%. Sem taxa semanal ou mensalidade!',
      'financial'
    );
    try {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    } catch {}
  };

  const handleApproveDriver = (driverId: string) => {
    setDrivers((prev) =>
      prev.map((d) =>
        d.id === driverId
          ? { ...d, cnhVerified: true, vehicleVerified: true, weeklyPlanActive: true }
          : d
      )
    );
    triggerPush('🛡️ Auditoria Aprovada', 'Documentos de condutor validados com sucesso.', 'safety');
  };

  const handleApproveWeeklyPayment = (driver: Driver) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const updated: Driver = {
      ...driver,
      weeklyFeePaidAt: now.toISOString(),
      weeklyFeeExpiresAt: expiresAt.toISOString(),
      weeklyPlanExpiresAt: expiresAt.toISOString(),
      weeklyPlanActive: true,
      weeklyPlanPrice: WEEKLY_FEE,
      status: 'online',
      pendingPayment: driver.pendingPayment
        ? {
            ...driver.pendingPayment,
            status: 'approved',
          }
        : null,
    };
    handleUpdateDriver(updated);
    if (currentUser?.driverData?.id === updated.id) {
      setCurrentUser((prev) => (prev ? { ...prev, driverData: updated } : null));
    }

    // Salvar na tabela public.pagamentos no Supabase
    savePagamentoSupabase({
      id: driver.pendingPayment?.comprovanteId || `PAG-${Date.now()}`,
      id_motorista: driver.id,
      nome_motorista: driver.name,
      email_motorista: driver.email,
      valor: WEEKLY_FEE,
      status: 'approved',
      chave_pix: '9d9e5635-9e68-46bf-bffe-08bdae29c8ba',
    });

    triggerPush(
      'Pagamento aprovado!',
      `O comprovante de R$ 200 de ${driver.name} foi aprovado! Status ONLINE liberado por 7 dias com 100% dos ganhos.`,
      'financial'
    );
    try {
      confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
    } catch {}
  };

  const handleRejectWeeklyPayment = (driver: Driver) => {
    const updated: Driver = {
      ...driver,
      pendingPayment: driver.pendingPayment
        ? {
            ...driver.pendingPayment,
            status: 'rejected',
          }
        : null,
    };
    handleUpdateDriver(updated);
    if (currentUser?.driverData?.id === updated.id) {
      setCurrentUser((prev) => (prev ? { ...prev, driverData: updated } : null));
    }

    // Salvar na tabela public.pagamentos no Supabase
    savePagamentoSupabase({
      id: driver.pendingPayment?.comprovanteId || `PAG-${Date.now()}`,
      id_motorista: driver.id,
      nome_motorista: driver.name,
      email_motorista: driver.email,
      valor: WEEKLY_FEE,
      status: 'rejected',
      chave_pix: '9d9e5635-9e68-46bf-bffe-08bdae29c8ba',
    });

    triggerPush(
      'Pagamento Reprovado',
      `O comprovante PIX de ${driver.name} foi reprovado. O condutor foi notificado para enviar novo comprovante.`,
      'financial'
    );
  };

  // Admin Management: Remover Motorista Individual
  const handleRemoveDriver = (driverId: string, email: string) => {
    deleteUserAccount(email, driverId);
    setDrivers((prev) => prev.filter((d) => d.id !== driverId && normalizeEmail(d.email) !== normalizeEmail(email)));
    triggerPush('🗑️ Cadastro Removido', `O cadastro do motorista ${email} foi excluído com sucesso.`, 'system');
  };

  // Admin Management: Remover Passageiro Individual
  const handleRemovePassenger = (passengerId: string, email: string) => {
    deleteUserAccount(email, passengerId);
    setPassengers((prev) => prev.filter((p) => p.id !== passengerId && normalizeEmail(p.email) !== normalizeEmail(email)));
    triggerPush('🗑️ Passageiro Removido', `O cadastro do passageiro ${email} foi excluído com sucesso.`, 'system');
  };

  // Admin Management: Ativar TODOS os motoristas/motoboys
  const handleActivateAllDrivers = () => {
    const updated = activateAllDriverAccounts(drivers);
    setDrivers(updated);
    triggerPush(
      '✅ Todos os Cadastros Ativados',
      `Todos os ${updated.length} condutores foram ativados com 7 dias liberados e status ONLINE!`,
      'financial'
    );
    try {
      confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 } });
    } catch {}
  };

  // Admin Management: Remover TODOS os cadastros
  const handleRemoveAllAccounts = () => {
    deleteAllUserAccounts();
    setDrivers([]);
    setPassengers([]);
    triggerPush(
      '🗑️ Todos os Cadastros Removidos',
      'Todos os cadastros de motoristas e passageiros foram excluídos do sistema.',
      'system'
    );
  };

  // Auth success handler: "Após realização de cadastro com login e senha todos entrarão no aplicativo direto na página de atendimento de corridas"
  const handleAuthSuccess = (user: AppUser, driver?: Driver) => {
    setCurrentUser(user);
    if (driver) {
      setDrivers((prev) => [driver, ...prev.filter((d) => d.id !== driver.id)]);
      setCurrentDriver(driver);
    }
    setActiveTab('rides');
    const roleName = user.role === 'driver' ? 'Motorista/Motoboy Parceiro' : 'Passageiro';
    setLoginSuccessBanner(
      `Bem-vindo(a), ${user.name}! Acesso validado com login e senha (${roleName}). Você entrou direto na página de atendimento de corridas RACE!`
    );
    triggerPush(
      '🎉 Acesso Liberado!',
      `Olá ${user.name}! Você entrou direto na Central de Atendimento de Corridas RACE.`,
      'system'
    );
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('race_current_user');
    } catch {}
    setCurrentUser(null);
    setCurrentDriver(DEFAULT_NEW_DRIVER);
    setActiveTab('rides');
    triggerPush('Sessão Encerrada', 'Você saiu da sua conta RACE.', 'system');
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  // Reusable real-time GPS map component instance
  const mapElement = (
    <MapRealtime
      drivers={drivers}
      pickup={pickup}
      destination={destination}
      activeDriver={activeRide?.driver || null}
      rideStatus={activeRide?.status || 'idle'}
      driverPosition={driverPosition}
      onMapClick={handleMapClick}
      selectionMode={mapSelectionMode}
    />
  );

  // 1. Quando o app abre deslogado, NÃO mostrar PassengerRideView, Header ou BottomNav.
  // Mostrar tela de login de motorista full-screen com design preto e laranja igual ao print.
  if (!currentUser) {
    return (
      <DriverLoginScreen
        drivers={drivers}
        passengers={passengers}
        onLoginSuccess={(user, driver) => {
          setCurrentUser(user);
          try {
            localStorage.setItem('race_current_user', JSON.stringify(user));
          } catch {}

          // Se for Administrador (ex: admin@race.com.br)
          if (
            user.role === 'admin' ||
            user.isAdmin ||
            user.email?.toLowerCase() === 'admin@race.com.br'
          ) {
            setActiveTab('admin');
            setLoginSuccessBanner(
              'Bem-vindo, Administrador Geral! Painel de controle e auditoria liberados.'
            );
            return;
          }

          const isDriverOrMotoboy =
            user.role === 'driver' ||
            user.role === 'motoboy' ||
            user.tipo === 'driver' ||
            user.tipo === 'motoboy' ||
            user.tipo === 'motorista_economico' ||
            user.tipo === 'motorista_confort' ||
            user.tipo === 'motoboy_passageiro' ||
            user.tipo === 'motoboy_entregas';

          if (isDriverOrMotoboy && driver) {
            const currentBal = getDriverBalance(driver.id, driver.walletBalance || 0);
            const driverWithBal: Driver = { 
              ...driver, 
              walletBalance: currentBal,
              weeklyPlanActive: true,
              status: 'online' 
            };
            setCurrentDriver(driverWithBal);
            handleUpdateDriver(driverWithBal);
            setActiveTab('rides');
            setLoginSuccessBanner(
              `Bem-vindo(a), ${driver.name}! Central de Corridas pronta para receber chamados. Você fica com 85% de cada corrida sem mensalidade!`
            );
          } else {
            // Passageiro: vai direto para tela de pedir corrida com mapa
            setActiveTab('rides');
            setLoginSuccessBanner(
              `Olá, ${user.name}! Escolha seu ponto de embarque e destino para solicitar sua corrida ou entrega.`
            );
          }
        }}
        onRegisterDriverSuccess={(user, newDriver) => {
          handleRegisterDriver(newDriver);
        }}
        onRegisterMotoboySuccess={(user, newMotoboy) => {
          handleRegisterDriver(newMotoboy);
        }}
        onRegisterPassengerSuccess={(newUser) => {
          setPassengers((prev) => {
            const next = [newUser, ...prev.filter((p) => p.id !== newUser.id)];
            try {
              localStorage.setItem('race_registered_passengers', JSON.stringify(next));
            } catch {}
            return next;
          });
        }}
      />
    );
  }

  const isUserDriver = Boolean(
    currentUser && (
      currentUser.role === 'driver' ||
      currentUser.role === 'motoboy' ||
      Boolean(currentUser.driverData) ||
      currentUser.tipo === 'motorista_economico' ||
      currentUser.tipo === 'motorista_confort' ||
      currentUser.tipo === 'motoboy_passageiro' ||
      currentUser.tipo === 'motoboy_entregas'
    )
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans pb-28 selection:bg-slate-900 selection:text-white w-full max-w-full overflow-x-hidden box-border">
      {/* Prominent RACE Brand Header */}
      <Header
        unreadNotifsCount={unreadNotifsCount}
        onOpenNotifications={() => setIsNotifCenterOpen(true)}
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenSos={() => setIsSosOpen(true)}
        onOpenShare={() => setIsShareOpen(true)}
        activeRole={
          activeTab === 'admin'
            ? 'admin'
            : currentUser?.role === 'admin' || currentUser?.isAdmin || currentUser?.email?.toLowerCase() === 'admin@race.com.br'
            ? 'admin'
            : currentUser?.role === 'motoboy' || currentUser?.tipo === 'motoboy'
            ? 'driver'
            : activeTab === 'driver_portal'
            ? 'driver'
            : 'passenger'
        }
        onChangeRole={(role) => {
          if (role === 'passenger') setActiveTab('rides');
          if (role === 'driver') setActiveTab('driver_portal');
          if (role === 'admin') {
            const isUserAdmin = Boolean(
              currentUser?.email?.toLowerCase() === 'admin@race.com.br' ||
              currentUser?.role === 'admin' ||
              currentUser?.isAdmin === true
            );
            if (isUserAdmin) {
              setActiveTab('admin');
            }
          }
        }}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Layout Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5 overflow-x-hidden box-border">
        {/* 1. Corridas (Passageiro / Condutor) com MAPA ABAIXO DAS OPÇÕES DE CORRIDA */}
        {activeTab === 'rides' && (
          <PassengerRideView
            onStartRide={handleStartRide}
            activeRide={activeRide}
            onCancelRide={handleCancelRide}
            onCompleteRide={handleCompleteRide}
            onSubmitRating={handleSubmitRating}
            pickup={pickup}
            destination={destination}
            setPickup={setPickup}
            setDestination={setDestination}
            onSelectOnMap={(type) => setMapSelectionMode(type)}
            availableDrivers={drivers}
            mapElement={mapElement}
            currentUser={currentUser}
            currentDriver={currentDriver}
            loginSuccessBanner={loginSuccessBanner}
            onClearLoginBanner={() => setLoginSuccessBanner(null)}
            onOpenFullMap={() => {
              if (!activeRide || activeRide.paymentStatus !== 'paid') {
                triggerPush(
                  'Complete o fluxo primeiro',
                  'Preencha seu endereço de início e chegada com número, escolha a categoria e confirme o pagamento no app para liberar o mapa.',
                  'ride'
                );
                return;
              }
              setIsFullMapOpen(true);
            }}
          />
        )}

        {/* 2. Entregas Flash (Motoboy para entrega) */}
        {activeTab === 'delivery' && (
          <DeliveryFlashView
            onStartDelivery={handleStartDelivery}
            availableMotoboys={drivers.filter((d) => d.category === 'moto_entrega')}
            pickup={pickup}
            destination={destination}
            setPickup={setPickup}
            setDestination={setDestination}
          />
        )}

        {/* 3. Condutor & Cadastro (Plano Semanal R$ 200 e 100% dos Ganhos) */}
        {activeTab === 'driver_portal' && (
          isUserDriver ? (
            <DriverPartnerPortal
              currentDriver={currentDriver}
              currentUser={currentUser}
              rides={getIsolatedUserRides(currentUser)}
              activeRide={activeRide}
              onAcceptIncomingRide={(ride) => {
                setActiveRide({ ...ride, status: 'driver_assigned' });
              }}
              onUpdateDriver={handleUpdateDriver}
              onRegisterDriver={(newDriver) => {
                handleRegisterDriver(newDriver);
              }}
              onLoginDriverSuccess={(user, driver) => {
                setCurrentUser(user);
                if (driver) setCurrentDriver(driver);
                try {
                  localStorage.setItem('race_current_user', JSON.stringify(user));
                } catch {}
                setLoginSuccessBanner(
                  `Bem-vindo(a), ${user.name}! Login efetuado com sucesso com 100% dos ganhos livres.`
                );
              }}
              onNavigateToRides={() => {
                setActiveTab('rides');
                setLoginSuccessBanner(
                  `Você alternou para a página de pedidos de corrida (Passageiro).`
                );
              }}
              onOpenSupport={() => setIsSupportOpen(true)}
              onOpenShare={() => setIsShareOpen(true)}
              onRenewWeeklyPlan={handleRenewWeeklyPlan}
              onTriggerToast={(title, msg, type) => triggerPush(title, msg, type || 'financial')}
            />
          ) : (
            <DriverWorkSelectionView
              currentUser={currentUser!}
              onCompleteDriverRegister={(newDriver) => {
                handleRegisterDriver(newDriver);
                const isMoto = newDriver.category === 'moto_entrega' || newDriver.category === 'moto_passageiro';
                const updatedUser: AppUser = {
                  ...currentUser!,
                  role: isMoto ? 'motoboy' : 'driver',
                  tipo: newDriver.category === 'economica' ? 'motorista_economico' :
                        newDriver.category === 'confort' ? 'motorista_confort' :
                        newDriver.category === 'moto_passageiro' ? 'motoboy_passageiro' : 'motoboy_entregas',
                  placa: newDriver.vehiclePlate,
                  driverData: newDriver,
                };
                setCurrentUser(updatedUser);
                setCurrentDriver(newDriver);
                try {
                  localStorage.setItem('race_current_user', JSON.stringify(updatedUser));
                } catch {}
                setLoginSuccessBanner(
                  `Parabéns, ${newDriver.name}! Cadastro de motorista homologado com sucesso!`
                );
              }}
              onBackToRides={() => setActiveTab('rides')}
              onRenewWeeklyPlan={handleRenewWeeklyPlan}
            />
          )
        )}

        {/* 4. Histórico Completo & Recibos - APENAS dados do próprio usuário */}
        {activeTab === 'history' && (
          <RideHistoryView rides={getIsolatedUserRides(currentUser)} />
        )}

        {/* 5. Opções de Categoria para Passageiro (4 Categorias) */}
        {activeTab === 'passenger_options' && (
          <PassengerOptionsView
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
            onNavigateToRides={() => setActiveTab('rides')}
          />
        )}

        {/* 6. Conta & Perfil do Passageiro (Nome, E-mail, WhatsApp, Login, Endereço com Meu GPS, Sair) */}
        {activeTab === 'passenger_account' && (
          <PassengerAccountView
            currentUser={currentUser}
            currentAddress={pickup?.address}
            pickup={pickup}
            onUpdateAddress={(addr, lat, lng) => setPickup({ address: addr, lat, lng })}
            onLogout={handleLogout}
            onNavigateToHistory={() => setActiveTab('history')}
            onOpenSupport={() => setIsSupportOpen(true)}
            onOpenShare={() => setIsShareOpen(true)}
            onUpdateAvatar={(avatarBase64) => {
              setCurrentUser((prev) => (prev ? { ...prev, avatar: avatarBase64 } : null));
            }}
          />
        )}

        {/* 5. Painel Administrativo Master - APENAS admin@race.com.br */}
        {activeTab === 'admin' && (
          (currentUser?.email?.toLowerCase() === ADMIN_EMAIL || currentUser?.role === 'admin' || currentUser?.isAdmin) ? (
            <AdminDashboard
              drivers={drivers}
              rides={ridesHistory}
              onApproveDriver={handleApproveDriver}
              onToggleDriverStatus={handleToggleDriverStatus}
              onOpenShare={() => setIsShareOpen(true)}
              onApproveWeeklyPayment={handleApproveWeeklyPayment}
              onRejectWeeklyPayment={handleRejectWeeklyPayment}
            />
          ) : (
            <div className="text-center py-12 p-6 bg-zinc-950 border-2 border-[#ff6a00] rounded-3xl text-white space-y-3 shadow-xl">
              <AlertTriangle className="w-12 h-12 text-[#ff6a00] mx-auto animate-pulse" />
              <h3 className="text-xl font-heading font-black text-white">Acesso Exclusivo da Administração</h3>
              <p className="text-sm text-zinc-300 max-w-md mx-auto">
                Apenas o login oficial <strong>{ADMIN_EMAIL}</strong> tem permissão para auditar a frota geral, conferir comprovantes PIX e gerenciar todos os motoristas de Indaiatuba.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('rides')}
                className="mt-4 px-6 py-2.5 bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-sm rounded-xl cursor-pointer"
              >
                Voltar para Corridas
              </button>
            </div>
          )
        )}
      </main>

      {/* Floating Push Notification Toast */}
      <PushNotificationToast
        notification={currentToast}
        onDismiss={() => setCurrentToast(null)}
        isOpenCenter={isNotifCenterOpen}
        onCloseCenter={() => setIsNotifCenterOpen(false)}
        notificationsList={notifications}
        onMarkAllAsRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
      />

      {/* 24h Technical Support Modal */}
      <Support24hModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        userType={
          activeTab === 'admin'
            ? 'admin'
            : activeTab === 'driver_portal'
            ? 'driver'
            : 'passenger'
        }
      />

      {/* Emergency SOS & Security Modal */}
      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        currentLocation={pickup?.address || 'Av. Presidente Vargas, 1250 - Centro, Indaiatuba-SP'}
      />

      {/* Share Platform Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
      />

      {/* Universal Login & Cadastro Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialRole={activeTab === 'driver_portal' ? 'driver' : 'passenger'}
      />


      {/* Ergonomic Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          if (tab === 'admin') {
            const isUserAdmin = Boolean(
              currentUser?.email?.toLowerCase() === 'admin@race.com.br' ||
              currentUser?.role === 'admin' ||
              currentUser?.isAdmin === true
            );
            if (!isUserAdmin) return;
          }

          // Se for passageiro e tentar abrir OPÇÃO ou ATIVIDADE antes de ter corrida paga:
          const isPassenger = !currentUser?.role || currentUser.role === 'passenger';
          const hasPaidRide = Boolean(activeRide && activeRide.paymentStatus === 'paid');

          if (isPassenger && (tab === 'passenger_options' || tab === 'history')) {
            if (!hasPaidRide) {
              triggerPush(
                'Faça sua corrida primeiro',
                'Preencha endereço de início e chegada com número, escolha a categoria e conclua o pagamento no app antes de acessar.',
                'ride'
              );
              setActiveTab('rides');
              return;
            }
          }

          setActiveTab(tab);
        }}
        isDriverOnline={currentDriver.status === 'online'}
        currentUser={currentUser}
      />

      {/* 1. Página de Mapa Fullscreen Toda Tela Sem Nenhuma Informação por Cima (Somente com corrida paga) */}
      {isFullMapOpen && activeRide && activeRide.paymentStatus === 'paid' && (
        <FullMapView
          onClose={() => setIsFullMapOpen(false)}
          pickup={pickup}
          destination={destination}
          activeDriver={activeRide.driver ?? null}
          activeRide={activeRide}
          onCompleteRide={handleCompleteRide}
          onUpdateDriverPosition={(pos) => {
            setDriverPosition((prev) => {
              if (prev && prev.lat === pos.lat && prev.lng === pos.lng) return prev;
              return pos;
            });
          }}
        />
      )}

      {/* Modal de Avaliação do Motorista / Motoboy ao Concluir Corrida */}
      <RatingModal
        isOpen={isRatingModalOpen}
        ride={completedRideForRating || activeRide}
        onSubmitRating={handleSubmitRating}
        onClose={() => {
          setIsRatingModalOpen(false);
          setActiveRide(null);
        }}
      />
    </div>
  );
}
