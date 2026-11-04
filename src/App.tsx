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
  INITIAL_RIDES_HISTORY 
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
import { AppUser } from './types';

export default function App() {
  // Global States
  const [activeTab, setActiveTab] = useState<TabType>('rides');
  const [drivers, setDrivers] = useState<Driver[]>(INITIAL_DRIVERS);
  const [currentDriver, setCurrentDriver] = useState<Driver>(INITIAL_DRIVERS[0]);
  const [ridesHistory, setRidesHistory] = useState<Ride[]>(INITIAL_RIDES_HISTORY);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);

  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<AppUser | null>({
    id: 'usr-default',
    name: 'Carlos Silva',
    email: 'carlos.silva@raceapp.com.br',
    phone: '(11) 98765-4321',
    role: 'driver',
    driverData: INITIAL_DRIVERS[0],
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
    }, 1000);

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
    setDrivers((prev) => [newDriver, ...prev]);
    setCurrentDriver(newDriver);
    triggerPush(
      '🎉 Bem-vindo à RACE!',
      `Cadastro de ${newDriver.name} concluído com sucesso. Assinatura de R$ 300 ativa com 100% de ganhos livres!`,
      'financial'
    );
  };

  const handleUpdateDriver = (updated: Driver) => {
    setCurrentDriver(updated);
    setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
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

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans pb-28 selection:bg-slate-900 selection:text-white">
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
          setCurrentUser(null);
          triggerPush('Sessão Encerrada', 'Você saiu da sua conta RACE.', 'system');
        }}
      />

      {/* Main Layout Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5">
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

        {/* 3. Condutor & Cadastro (Plano Semanal R$ 300 e 100% dos Ganhos) */}
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

      {/* Ergonomic Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        isDriverOnline={currentDriver.status === 'online'}
      />
    </div>
  );
}
