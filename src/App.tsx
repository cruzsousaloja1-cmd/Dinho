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
import { AdminDashboard } from './components/AdminDashboard';
import { RideHistoryView } from './components/RideHistoryView';
import { Support24hModal } from './components/Support24hModal';
import { SosModal } from './components/SosModal';
import { PushNotificationToast } from './components/PushNotificationToast';
import { ShareModal } from './components/ShareModal';
import { AuthModal } from './components/AuthModal';
import { DriverLoginScreen } from './components/DriverLoginScreen';
import { FullMapView } from './components/FullMapView';
import { AppUser } from './types';
import { AlertTriangle, CheckCircle2, X, QrCode } from 'lucide-react';
import confetti from 'canvas-confetti';
import { WEEKLY_FEE, WEEKLY_FEE_TEXT, COMMISSION, WEEKLY_FEE_BADGE } from './config/pricing';

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

  const [currentDriver, setCurrentDriver] = useState<Driver>(() => {
    try {
      const stored = localStorage.getItem('race_registered_drivers');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          !parsed.some((d: any) => d.email?.includes('raceapp.com.br') || d.id === 'drv-01')
        ) {
          return parsed[0];
        }
      }
    } catch {}
    return DEFAULT_NEW_DRIVER;
  });
  const [ridesHistory, setRidesHistory] = useState<Ride[]>(INITIAL_RIDES_HISTORY);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

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

  // Map and Route States
  const [pickup, setPickup] = useState<LocationPoint | null>({
    address: 'Av. Paulista, 1578 - MASP',
    lat: -23.5615,
    lng: -46.6558,
  });
  const [destination, setDestination] = useState<LocationPoint | null>({
    address: 'Aeroporto de Congonhas - Terminal',
    lat: -23.6273,
    lng: -46.6565,
  });
  const [mapSelectionMode, setMapSelectionMode] = useState<'pickup' | 'destination' | null>(null);

  // Animated driver position along simulated route
  const [driverPosition, setDriverPosition] = useState<{ lat: number; lng: number } | undefined>(undefined);

  // Modals & Push Notifications
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isNotifCenterOpen, setIsNotifCenterOpen] = useState(false);
  const [notifications, setNotifications] = useState<PushNotification[]>(INITIAL_NOTIFICATIONS);
  const [currentToast, setCurrentToast] = useState<PushNotification | null>(null);
  const [subscriptionExpiredModalOpen, setSubscriptionExpiredModalOpen] = useState(false);
  const [expiredModalDriver, setExpiredModalDriver] = useState<Driver | null>(null);

  // 2. Auto-login no App.tsx: verificar localStorage.getItem('race_current_user') e restaurar sessão ativa
  useEffect(() => {
    try {
      const stored = localStorage.getItem('race_current_user');
      if (stored) {
        const parsed: AppUser = JSON.parse(stored);
        if (parsed && parsed.email && !parsed.email.includes('raceapp.com.br')) {
          setCurrentUser(parsed);

          const isDriverOrMotoboy =
            parsed.tipo === 'driver' ||
            parsed.tipo === 'motoboy' ||
            parsed.role === 'driver' ||
            parsed.role === 'motoboy';

          if (isDriverOrMotoboy) {
            // Restaura dados do motorista/motoboy
            const storedDrivers = localStorage.getItem('race_registered_drivers');
            const driverList: Driver[] = storedDrivers ? JSON.parse(storedDrivers) : [];
            const matched = driverList.find((d) => d.email.toLowerCase() === parsed.email.toLowerCase()) || parsed.driverData;
            if (matched) {
              const now = new Date();
              const expiresDate = matched.weeklyFeeExpiresAt
                ? new Date(matched.weeklyFeeExpiresAt)
                : matched.weeklyPlanExpiresAt
                ? new Date(matched.weeklyPlanExpiresAt)
                : null;
              const isSubActive = Boolean(matched.weeklyPlanActive && expiresDate && expiresDate > now);
              const updatedMatched: Driver = {
                ...matched,
                status: isSubActive ? 'online' : 'offline',
              };
              setCurrentDriver(updatedMatched);
              if (!isSubActive) {
                setLoginSuccessBanner(
                  `Bem-vindo(a) de volta, ${matched.name}! Você está na Central de Corridas (Aguardando Corridas). ⚠️ Assinatura semanal de R$ 200 pendente. Chave PIX: 9d9e5635-9e68-46bf-bffe-08bdae29c8ba.`
                );
              }
            }
          }
          setActiveTab('rides');
        }
      }
    } catch {}
  }, []);

  // 4. Bloqueio Automático a cada 1 minuto (Se weeklyFeeExpiresAt < now, set weeklyPlanActive = false e status = offline)
  useEffect(() => {
    const checkSubscriptions = () => {
      const now = new Date();
      setDrivers((prevDrivers) =>
        prevDrivers.map((driver) => {
          const expiresDate = driver.weeklyFeeExpiresAt
            ? new Date(driver.weeklyFeeExpiresAt)
            : driver.weeklyPlanExpiresAt
            ? new Date(driver.weeklyPlanExpiresAt)
            : null;

          if (expiresDate && expiresDate < now) {
            if (driver.weeklyPlanActive || driver.status === 'online') {
              return {
                ...driver,
                weeklyPlanActive: false,
                status: 'offline',
              };
            }
          }
          return driver;
        })
      );

      setCurrentDriver((prev) => {
        if (!prev) return prev;
        const expiresDate = prev.weeklyFeeExpiresAt
          ? new Date(prev.weeklyFeeExpiresAt)
          : prev.weeklyPlanExpiresAt
          ? new Date(prev.weeklyPlanExpiresAt)
          : null;

        if (expiresDate && expiresDate < now && (prev.weeklyPlanActive || prev.status === 'online')) {
          return {
            ...prev,
            weeklyPlanActive: false,
            status: 'offline',
          };
        }
        return prev;
      });
    };

    checkSubscriptions();
    const interval = setInterval(checkSubscriptions, 60_000);
    return () => clearInterval(interval);
  }, []);

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

  // Passenger requests a ride
  const handleStartRide = (ride: Ride) => {
    setActiveRide(ride);
    triggerPush(
      '🚗 Corrida Confirmada!',
      `Seu motorista ${ride.driver?.name} está a caminho em um ${ride.driver?.vehicleModel} (${ride.driver?.vehiclePlate}).`,
      'ride'
    );
  };

  // Complete active ride
  const handleCompleteRide = () => {
    if (!activeRide) return;
    const updatedRide: Ride = {
      ...activeRide,
      status: 'completed',
      completedAt: new Date().toISOString(),
    };
    setActiveRide(updatedRide);
    triggerPush(
      '🏁 Viagem Finalizada!',
      `Total de R$ ${activeRide.price.toFixed(2)} repassado integralmente ao motorista (100%). Por favor, avalie sua experiência!`,
      'financial'
    );
  };

  // Submit rating
  const handleSubmitRating = (rating: number, comment: string) => {
    if (!activeRide) return;
    const finalizedRide: Ride = {
      ...activeRide,
      ratingGivenToDriver: rating,
      ratingComment: comment,
    };
    setRidesHistory((prev) => [finalizedRide, ...prev]);
    setActiveRide(null);

    // Update driver rating
    if (activeRide.driver) {
      setDrivers((prev) =>
        prev.map((d) =>
          d.id === activeRide.driver?.id
            ? {
                ...d,
                rating: Number(((d.rating * d.totalRides + rating) / (d.totalRides + 1)).toFixed(2)),
                totalRides: d.totalRides + 1,
                earningsToday: d.earningsToday + activeRide.price,
                earningsWeek: d.earningsWeek + activeRide.price,
              }
            : d
        )
      );
    }

    triggerPush(
      '⭐ Obrigado pela Avaliação!',
      'Sua nota ajuda a manter o padrão de excelência e segurança da frota RACE.',
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
  };

  const handleToggleDriverStatus = (driverId: string) => {
    const target = drivers.find((d) => d.id === driverId);
    if (target) {
      const willBeOnline = target.status !== 'online';
      const expiresDate = target.weeklyFeeExpiresAt
        ? new Date(target.weeklyFeeExpiresAt)
        : target.weeklyPlanExpiresAt
        ? new Date(target.weeklyPlanExpiresAt)
        : null;
      const isExpired = !target.weeklyPlanActive || (expiresDate ? expiresDate < new Date() : false);

      if (willBeOnline && isExpired) {
        setExpiredModalDriver(target);
        setSubscriptionExpiredModalOpen(true);
        return;
      }
    }

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
    setSubscriptionExpiredModalOpen(false);
    triggerPush(
      '🎉 Assinatura Semanal Ativa!',
      `Pagamento de ${WEEKLY_FEE_TEXT} via PIX confirmado! Seu status está ONLINE e liberado para receber chamados com 100% de repasse.`,
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
    triggerPush(
      'Pagamento Reprovado',
      `O comprovante PIX de ${driver.name} foi reprovado. O condutor foi notificado para enviar novo comprovante.`,
      'financial'
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

          const isDriverOrMotoboy =
            user.role === 'driver' ||
            user.role === 'motoboy' ||
            user.tipo === 'driver' ||
            user.tipo === 'motoboy';

          if (isDriverOrMotoboy && driver) {
            setCurrentDriver(driver);
            const expiresDate = driver.weeklyFeeExpiresAt
              ? new Date(driver.weeklyFeeExpiresAt)
              : driver.weeklyPlanExpiresAt
              ? new Date(driver.weeklyPlanExpiresAt)
              : null;
            const isSubActive = Boolean(
              driver.weeklyPlanActive && expiresDate && expiresDate > new Date()
            );
            if (isSubActive) {
              handleUpdateDriver({ ...driver, status: 'online' });
              setActiveTab('rides');
              setLoginSuccessBanner(
                `Bem-vindo(a), ${driver.name}! Você entrou na Central de Corridas com 100% dos ganhos livres.`
              );
            } else {
              handleUpdateDriver({ ...driver, status: 'offline' });
              // Vai direto para central de corridas com aviso de assinatura R$ 200
              setActiveTab('rides');
              setLoginSuccessBanner(
                `Bem-vindo(a), ${driver.name}! Você está na Central de Corridas (Aguardando Corridas). ⚠️ ATENÇÃO: Sua assinatura semanal de R$ 200 está VENCIDA/PENDENTE. Chave PIX: 9d9e5635-9e68-46bf-bffe-08bdae29c8ba.`
              );
            }
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
          setCurrentUser(user);
          setCurrentDriver(newDriver);
          try {
            localStorage.setItem('race_current_user', JSON.stringify(user));
          } catch {}
          // 1. Redirecionar DIRETO para as opções de corridas, sem pedir login de novo
          // Motorista -> vai para tela "Aguardando corridas" + aviso assinatura R$200/semana PIX
          setActiveTab('rides');
          setLoginSuccessBanner(
            `Cadastro de Motorista (${newDriver.name}) realizado com sucesso! Você entrou direto na Central de Corridas (Aguardando Corridas). ⚠️ ATENÇÃO: Assinatura semanal de R$ 200 pendente. Chave PIX: 9d9e5635-9e68-46bf-bffe-08bdae29c8ba.`
          );
        }}
        onRegisterMotoboySuccess={(user, newMotoboy) => {
          handleRegisterDriver(newMotoboy);
          setCurrentUser(user);
          setCurrentDriver(newMotoboy);
          try {
            localStorage.setItem('race_current_user', JSON.stringify(user));
          } catch {}
          // 1. Redirecionar DIRETO para as opções de corridas, sem pedir login de novo
          // Motoboy -> vai para tela "Aguardando corridas" + aviso assinatura R$200/semana PIX
          setActiveTab('rides');
          setLoginSuccessBanner(
            `Cadastro de Motoboy Parceiro (${newMotoboy.name}) realizado com sucesso! Você entrou direto na Central de Corridas (Aguardando Corridas & Entregas Flash). ⚠️ ATENÇÃO: Assinatura semanal de R$ 200 pendente. Chave PIX: 9d9e5635-9e68-46bf-bffe-08bdae29c8ba.`
          );
        }}
        onRegisterPassengerSuccess={(newUser) => {
          setPassengers((prev) => {
            const next = [newUser, ...prev.filter((p) => p.id !== newUser.id)];
            try {
              localStorage.setItem('race_registered_passengers', JSON.stringify(next));
            } catch {}
            return next;
          });
          setCurrentUser(newUser);
          try {
            localStorage.setItem('race_current_user', JSON.stringify(newUser));
          } catch {}
          // 1. Passageiro -> vai direto para tela "Pedir corrida" com mapa
          setActiveTab('rides');
          setLoginSuccessBanner(
            `Bem-vindo(a) à RACE, ${newUser.name}! Sua conta de passageiro foi criada com sucesso. Peça sua corrida ou entrega agora.`
          );
        }}
      />
    );
  }

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
            : currentUser?.role === 'motoboy' || currentUser?.tipo === 'motoboy'
            ? 'driver'
            : activeTab === 'driver_portal'
            ? 'driver'
            : 'passenger'
        }
        onChangeRole={(role) => {
          if (role === 'passenger') setActiveTab('rides');
          if (role === 'driver') setActiveTab('driver_portal');
          if (role === 'admin') setActiveTab('admin');
        }}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={() => {
          // 3. Limpar localStorage e voltar para tela preta
          try {
            localStorage.removeItem('race_current_user');
          } catch {}
          setCurrentUser(null);
          setActiveTab('rides');
          triggerPush('Sessão Encerrada', 'Você saiu da sua conta RACE.', 'system');
        }}
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
            onOpenFullMap={() => setIsFullMapOpen(true)}
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
          <DriverPartnerPortal
            currentDriver={currentDriver}
            onUpdateDriver={handleUpdateDriver}
            onRegisterDriver={(newDriver) => {
              handleRegisterDriver(newDriver);
              setCurrentUser({
                id: newDriver.id,
                name: newDriver.name,
                email: newDriver.email,
                phone: newDriver.phone,
                role: 'driver',
                driverData: newDriver,
              });
              setActiveTab('rides');
              setLoginSuccessBanner(
                `Cadastro de ${newDriver.name} homologado com login e senha! Você entrou direto na página de atendimento de corridas com 100% dos ganhos livres.`
              );
            }}
            onNavigateToRides={() => {
              setActiveTab('rides');
              setLoginSuccessBanner(
                `Você entrou direto na página de atendimento de corridas! Seu status está ONLINE para atender chamados.`
              );
            }}
            onOpenSupport={() => setIsSupportOpen(true)}
            onOpenShare={() => setIsShareOpen(true)}
            onShowSubscriptionExpiredModal={() => {
              setExpiredModalDriver(currentDriver);
              setSubscriptionExpiredModalOpen(true);
            }}
            onRenewWeeklyPlan={handleRenewWeeklyPlan}
            onTriggerToast={(title, msg, type) => triggerPush(title, msg, type || 'financial')}
          />
        )}

        {/* 4. Histórico Completo & Recibos */}
        {activeTab === 'history' && (
          <RideHistoryView rides={ridesHistory} />
        )}

        {/* 5. Painel Administrativo Master */}
        {activeTab === 'admin' && (
          <AdminDashboard
            drivers={drivers}
            rides={ridesHistory}
            onApproveDriver={handleApproveDriver}
            onToggleDriverStatus={handleToggleDriverStatus}
            onOpenShare={() => setIsShareOpen(true)}
            onApproveWeeklyPayment={handleApproveWeeklyPayment}
            onRejectWeeklyPayment={handleRejectWeeklyPayment}
          />
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
        currentLocation={pickup?.address || 'Av. Paulista, 1578 - São Paulo / SP'}
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

      {/* 4. Modal de Assinatura Semanal Vencida */}
      {subscriptionExpiredModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border-2 border-rose-300 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative text-center space-y-4">
            <button
              onClick={() => setSubscriptionExpiredModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border-2 border-rose-200 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-mono font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 inline-block">
                Assinatura Vencida
              </span>
              <h3 className="text-xl sm:text-2xl font-heading font-black text-slate-950">
                Acesso aos Chamados Bloqueado
              </h3>
            </div>

            <p className="text-sm sm:text-base text-slate-800 font-bold leading-relaxed px-2">
              Sua assinatura semanal de R$200 venceu. Renove para voltar a receber corridas com 100% dos ganhos
            </p>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-slate-700 space-y-1.5 text-left font-medium">
              <div className="flex items-center gap-2 text-emerald-950 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Zero taxas sobre corridas (100% de repasse líquido)</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-950 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Ativação instantânea via PIX com validade de 7 dias</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSubscriptionExpiredModalOpen(false);
                  setActiveTab('driver_portal');
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black py-4 px-4 rounded-2xl shadow-lg transition-all cursor-pointer active:scale-95 text-sm sm:text-base flex items-center justify-center gap-2"
              >
                <span>Pagar R$200 da semana via PIX (Copiar Chave & Comprovante)</span>
              </button>

              <button
                type="button"
                onClick={() => setSubscriptionExpiredModalOpen(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-2xl transition-all cursor-pointer text-xs sm:text-sm"
              >
                Permanecer Offline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ergonomic Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        isDriverOnline={currentDriver.status === 'online'}
      />

      {/* 1. Página de Mapa Fullscreen Toda Tela Sem Nenhuma Informação por Cima */}
      {isFullMapOpen && (
        <FullMapView
          onClose={() => setIsFullMapOpen(false)}
          pickup={pickup}
          destination={destination}
          activeDriver={activeRide?.driver || (drivers.length > 0 ? drivers[0] : null)}
          activeRide={activeRide}
          driverPosition={driverPosition}
          onUpdateDriverPosition={(pos) => setDriverPosition(pos)}
        />
      )}
    </div>
  );
}
