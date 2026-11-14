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
import { saveDriverReview, clearReviewsCache } from './services/reviewService';
import { AppUser } from './types';
import { AlertTriangle, CheckCircle2, X, QrCode } from 'lucide-react';
import confetti from 'canvas-confetti';
import { WEEKLY_FEE, WEEKLY_FEE_TEXT, COMMISSION, WEEKLY_FEE_BADGE } from './config/pricing';
import { 
  saveSessionUser,
  getSessionUser,
  mapSupabaseRowToAppUser,
  saveIsolatedRide, 
  saveUserAccount, 
  normalizeEmail,
  ADMIN_EMAIL,
  deleteUserAccount,
  deleteAllUserAccounts,
  activateAllDriverAccounts
} from './services/userService';
import {
  cancelVoiceSpeech,
  notifyRideFinished
} from './services/audioNotificationService';
import {
  getDriverBalance,
  addDriverEarnings,
  clearWalletMemoryCache
} from './services/walletService';
import {
  getCorridasSupabase,
  getCorridaByIdSupabase,
  acceptCorridaSupabase,
  updateCorridaStatusSupabase,
  saveCorridaSupabase,
  savePagamentoSupabase,
  getUsuarioSupabase,
  getAllDriversFromSupabase,
  getOnlineDriversFromSupabase,
  updateDriverOnlineStatusSupabase,
  getAllPassengersFromSupabase,
  subscribeToCorridasRealtime,
  purgeLegacyTestLocalStorage,
  normalizeRideCategory
} from './supabase';
import { generateUniqueRideConfirmationCode } from './services/pricingService';

export default function App() {
  // Global States - Inicialmente no Portal de Motorista e deslogado para exibir a tela preta e laranja
  const [activeTab, setActiveTab] = useState<TabType>('driver_portal');
  const [isFullMapOpen, setIsFullMapOpen] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [currentDriver, setCurrentDriver] = useState<Driver>(DEFAULT_NEW_DRIVER);
  const [ridesHistory, setRidesHistory] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [completedRideForRating, setCompletedRideForRating] = useState<Ride | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>('economica');

  // Registered Passengers State (100% Supabase)
  const [passengers, setPassengers] = useState<AppUser[]>([]);

  // 1. Authentication & Session (validado online no Supabase)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loginSuccessBanner, setLoginSuccessBanner] = useState<string | null>(null);

  // Map and Route States
  const [pickup, setPickup] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [mapSelectionMode, setMapSelectionMode] = useState<'pickup' | 'destination' | null>(null);

  // Driver live position during active ride
  const [driverPosition, setDriverPosition] = useState<{ lat: number; lng: number } | undefined>(undefined);

  // Modals & Push Notifications
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isNotifCenterOpen, setIsNotifCenterOpen] = useState(false);
  const [notifications, setNotifications] = useState<PushNotification[]>(INITIAL_NOTIFICATIONS);
  const [currentToast, setCurrentToast] = useState<PushNotification | null>(null);

  // 2. Startup: limpar resquícios antigos de localStorage e validar sessão ativa diretamente no Supabase
  useEffect(() => {
    purgeLegacyTestLocalStorage(true);

    let active = true;
    const initFromSupabase = async () => {
      try {
        const [cloudDrivers, cloudPassengers] = await Promise.all([
          getAllDriversFromSupabase(),
          getAllPassengersFromSupabase(),
        ]);
        if (active) {
          setDrivers(cloudDrivers);
          setPassengers(cloudPassengers);
        }
      } catch {}

      const session = getSessionUser();
      if (!session || !session.email) return;

      try {
        const cloudRow = await getUsuarioSupabase(session.email);
        if (!active) return;

        if (!cloudRow || cloudRow.status === 'bloqueado') {
          // Usuário não existe mais no Supabase (tabelas zeradas) ou está bloqueado -> voltar para tela inicial
          saveSessionUser(null);
          setCurrentUser(null);
          setCurrentDriver(DEFAULT_NEW_DRIVER);
          return;
        }

        const { user: hydratedUser, driver: hydratedDriver } = mapSupabaseRowToAppUser(cloudRow);
        setCurrentUser(hydratedUser);
        saveSessionUser(hydratedUser);

        if (
          hydratedUser.role === 'admin' ||
          hydratedUser.isAdmin ||
          String(hydratedUser.tipo || '').toUpperCase() === 'ADM' ||
          hydratedUser.email.toLowerCase() === ADMIN_EMAIL
        ) {
          setActiveTab('admin');
          return;
        }

        const hydratedTipoLower = String(hydratedUser.tipo || '').toLowerCase().trim();
        const isDriverOrMotoboy =
          hydratedUser.role === 'driver' ||
          hydratedUser.role === 'motoboy' ||
          hydratedTipoLower === 'driver' ||
          hydratedTipoLower === 'motorista' ||
          hydratedTipoLower === 'motoboy' ||
          hydratedTipoLower === 'motorista_economico' ||
          hydratedTipoLower === 'motorista_confort' ||
          hydratedTipoLower === 'motoboy_passageiro' ||
          hydratedTipoLower === 'motoboy_entregas';

        if (isDriverOrMotoboy && hydratedDriver) {
          const isConfigured =
            hydratedDriver.categoryConfigured !== false &&
            Boolean(hydratedDriver.vehiclePlate?.trim() && hydratedDriver.vehicleModel?.trim());
          const currentBalance = getDriverBalance(hydratedDriver.id, hydratedDriver.walletBalance || 0);
          const updatedMatched: Driver = {
            ...hydratedDriver,
            categoryConfigured: isConfigured,
            walletBalance: currentBalance,
            weeklyPlanActive: true,
            status: isConfigured && hydratedDriver.status === 'online' ? 'online' : 'offline',
          };
          setCurrentDriver(updatedMatched);
          setActiveTab('driver_portal');
          if (isConfigured && updatedMatched.status === 'online') {
            captureAndSyncDriverGps(updatedMatched, 'online');
          }
        } else {
          setActiveTab('rides');
        }
      } catch {
        // Se offline momentaneamente, mantém sessão mínima sem dados mockados
      }
    };

    initFromSupabase();
    return () => {
      active = false;
    };
  }, []);

  // Helper para capturar GPS real do condutor e gravar status ONLINE/OFFLINE no Supabase
  const captureAndSyncDriverGps = (driverTarget: Driver, status: 'online' | 'offline') => {
    if (!driverTarget?.email && !driverTarget?.id) return;
    if (status === 'offline') {
      updateDriverOnlineStatusSupabase({
        id: driverTarget.id,
        email: driverTarget.email,
        status: 'offline',
      }).catch(() => {});
      return;
    }

    updateDriverOnlineStatusSupabase({
      id: driverTarget.id,
      email: driverTarget.email,
      status: 'online',
      lat: driverTarget.lat,
      lng: driverTarget.lng,
    }).catch(() => {});

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentDriver((prev) =>
            prev && (prev.id === driverTarget.id || prev.email === driverTarget.email)
              ? { ...prev, status: 'online', lat, lng }
              : prev
          );
          setDrivers((prev) =>
            prev.map((d) =>
              d.id === driverTarget.id || d.email === driverTarget.email
                ? { ...d, status: 'online', lat, lng }
                : d
            )
          );
          updateDriverOnlineStatusSupabase({
            id: driverTarget.id,
            email: driverTarget.email,
            status: 'online',
            lat,
            lng,
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  };

  // Sincronizar corridas isoladas da nuvem Supabase para o usuário logado
  useEffect(() => {
    if (!currentUser) {
      setRidesHistory([]);
      return;
    }
    getCorridasSupabase(currentUser)
      .then((cloudRides) => {
        setRidesHistory(cloudRides || []);
      })
      .catch((err) => {
        console.warn('Aviso ao sincronizar corridas do Supabase:', err);
      });
  }, [currentUser]);

  // Polling em tempo real dos motoristas/motoboys ONLINE no Supabase (para o mapa do passageiro)
  useEffect(() => {
    if (!currentUser) return;
    let active = true;

    const syncOnlineDrivers = async () => {
      try {
        const onlineList = await getOnlineDriversFromSupabase();
        if (!active) return;

        setDrivers((prev) => {
          const onlineByKey = new Map<string, Driver>();
          onlineList.forEach((d) => {
            const k = (d.email || d.id || '').toLowerCase();
            if (k) onlineByKey.set(k, d);
          });

          const merged: Driver[] = [...onlineList];
          prev.forEach((existing) => {
            const k = (existing.email || existing.id || '').toLowerCase();
            if (k && !onlineByKey.has(k)) {
              merged.push({ ...existing, status: 'offline' });
            }
          });
          return merged;
        });
      } catch {}
    };

    syncOnlineDrivers();
    const timer = setInterval(syncOnlineDrivers, 3500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [currentUser, isFullMapOpen, activeTab]);

  // 3. Rota Secreta /admin: abre o AdminDashboard se o usuário for admin, senão volta para tela preta de login
  useEffect(() => {
    const checkSecretAdminRoute = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const isTryingAdmin = hash === '#/admin' || hash === '#admin' || path.endsWith('/admin');

      if (isTryingAdmin) {
        const savedUser: AppUser | null = currentUser || getSessionUser();

        const isUserAdmin = Boolean(
          savedUser &&
            (savedUser.role === 'admin' ||
              savedUser.isAdmin ||
              String(savedUser.tipo || '').toUpperCase() === 'ADM' ||
              savedUser.email?.trim().toLowerCase() === ADMIN_EMAIL)
        );

        if (isUserAdmin && savedUser) {
          setCurrentUser(savedUser);
          setActiveTab('admin');
        } else {
          saveSessionUser(null);
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

  // Realtime Supabase ('corridas') + Polling em tempo real enquanto a corrida do passageiro estiver em MODO PROCURANDO
  useEffect(() => {
    const curSt = String(activeRide?.status || '').toLowerCase();
    const isSearching =
      curSt === 'searching' || curSt === 'procurando' || curSt === 'procurando_motorista';
    if (!activeRide || !isSearching) return;

    let isMounted = true;
    let handledAccept = false;

    const applyLatestRideUpdate = async (latestRide: Ride) => {
      if (!isMounted || !latestRide) return;
      const st = String(latestRide.status || '').toLowerCase();

      if (st === 'cancelled' || st === 'cancelada') {
        cancelVoiceSpeech();
        setActiveRide(null);
        setIsFullMapOpen(false);
        return;
      }

      if (
        !handledAccept &&
        (st === 'accepted' ||
          st === 'aceita' ||
          st === 'em_andamento' ||
          st === 'driver_assigned' ||
          st === 'driver_arriving' ||
          st === 'in_progress')
      ) {
        handledAccept = true;
        let fullDriver = latestRide.driver;
        if (fullDriver) {
          let matched = drivers.find(
            (d) =>
              (fullDriver?.id && d.id === fullDriver.id) ||
              (fullDriver?.email && d.email.toLowerCase() === fullDriver.email.toLowerCase())
          );
          if (!matched) {
            const refreshedDrivers = await getAllDriversFromSupabase().catch(() => []);
            if (!isMounted) return;
            if (refreshedDrivers.length > 0) setDrivers(refreshedDrivers);
            matched = refreshedDrivers.find(
              (d) =>
                (fullDriver?.id && d.id === fullDriver.id) ||
                (fullDriver?.email && d.email.toLowerCase() === fullDriver.email.toLowerCase())
            );
          }
          if (matched) {
            fullDriver = matched;
          }
        }
        const acceptedDriverName = (fullDriver?.name || '').trim() || 'Motorista';
        setActiveRide((curr) =>
          curr
            ? {
                ...curr,
                id: latestRide.id || curr.id,
                status: 'aceita',
                driver: fullDriver || curr.driver,
              }
            : curr
        );
        triggerPush(
          '🚗 Corrida Aceita!',
          `${acceptedDriverName} aceitou sua corrida`,
          'ride'
        );
      }
    };

    const unsubscribeRealtime = subscribeToCorridasRealtime({
      onUpdate: (updRide) => {
        if (!isMounted) return;
        const matchesId =
          !activeRide.id ||
          !updRide.id ||
          String(updRide.id) === String(activeRide.id);
        const matchesCode =
          Boolean(activeRide.confirmationCode && updRide.confirmationCode) &&
          updRide.confirmationCode === activeRide.confirmationCode;
        if (matchesId || matchesCode) {
          applyLatestRideUpdate(updRide);
        }
      },
    });

    const checkAccepted = async () => {
      try {
        let latestRide: Ride | null = null;
        if (activeRide.id && /^\d+$/.test(String(activeRide.id))) {
          latestRide = await getCorridaByIdSupabase(activeRide.id);
        } else if (currentUser) {
          const allUserRides = await getCorridasSupabase(currentUser);
          latestRide = allUserRides[0] || null;
        }
        if (latestRide) {
          await applyLatestRideUpdate(latestRide);
        }
      } catch {}
    };

    const interval = setInterval(checkAccepted, 2500);
    return () => {
      isMounted = false;
      unsubscribeRealtime();
      clearInterval(interval);
    };
  }, [activeRide?.id, activeRide?.status, activeRide?.confirmationCode, currentUser, drivers]);

  // Simulated GPS movement ONLY after ride is accepted by a driver
  useEffect(() => {
    const st = String(activeRide?.status || '').toLowerCase();
    const isRideAccepted =
      st === 'accepted' ||
      st === 'aceita' ||
      st === 'driver_assigned' ||
      st === 'driver_arriving' ||
      st === 'in_progress';

    if (!activeRide || !activeRide.driver || !isRideAccepted) {
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

  // Passenger confirma corrida -> gera código único de 4 números, salva corrida em MODO PROCURANDO no Supabase (SEM voz ainda!)
  const handleStartRide = (ride: Ride) => {
    const isCash = ride.paymentMethod === 'money' || ride.paymentMethod === 'dinheiro';
    const confirmationCode = ride.confirmationCode || generateUniqueRideConfirmationCode();
    const startedRide: Ride = {
      ...ride,
      passengerId: ride.passengerId || currentUser?.id,
      passengerEmail: ride.passengerEmail || currentUser?.email,
      paymentMethod: isCash ? 'dinheiro' : ride.paymentMethod,
      paymentStatus: isCash ? 'pending' : (ride.paymentStatus || 'paid'),
      status: 'procurando',
      confirmationCode,
    };
    setActiveRide(startedRide);
    setRidesHistory((prev) => [
      startedRide,
      ...prev.filter((r) => (startedRide.id ? r.id !== startedRide.id : r !== startedRide)),
    ]);
    saveCorridaSupabase(startedRide, currentUser)
      .then((res) => {
        if (res.success && res.id) {
          const syncedId = res.id;
          setActiveRide((curr) =>
            curr && (curr === startedRide || (startedRide.id && curr.id === startedRide.id))
              ? { ...curr, id: syncedId }
              : curr
          );
          setRidesHistory((prev) =>
            prev.map((r) =>
              r === startedRide || (startedRide.id && r.id === startedRide.id) ? { ...r, id: syncedId } : r
            )
          );
        }
      })
      .catch(() => {});

    // Dinheiro NÃO passa pelo Asaas — só grava pagamento Asaas quando for PIX / Cartão
    if (!isCash) {
      savePagamentoSupabase({
        id_motorista: startedRide.driver?.id || '',
        nome_motorista: startedRide.driver?.name || '',
        email_motorista: startedRide.driver?.email || '',
        valor: startedRide.price,
        tipo: 'corrida',
        status: 'pago',
        chave_pix: '',
      }).catch(() => {});
    }
    setIsFullMapOpen(true);

    // Notificação silenciosa para o radar (sem voz enquanto aguarda motorista aceitar)
    const driverAlert: PushNotification = {
      id: `driver-call-${Date.now()}`,
      title: isCash ? '💵 Nova corrida em DINHEIRO - Aceitar' : '🔔 Nova corrida - Aceitar',
      message: `${ride.passengerName || 'Passageiro'} • ${ride.pickup.address} → ${ride.destination.address} (R$ ${ride.price.toFixed(2).replace('.', ',')})`,
      time: 'Agora',
      type: 'ride',
      read: false,
    };
    setNotifications((prev) => [driverAlert, ...prev]);

    triggerPush(
      '🔍 Procurando motorista...',
      isCash
        ? 'Corrida em dinheiro criada no sistema! Buscando motoristas online no mapa.'
        : 'Buscando motoristas online próximos a você no mapa.',
      'ride'
    );
  };

  // Complete active ride - fecha mapa e abre modal de Avaliação
  const handleCompleteRide = () => {
    if (!activeRide) return;
    const isCash = activeRide.paymentMethod === 'money' || activeRide.paymentMethod === 'dinheiro';
    const finalStatus = isCash ? 'finalizada' : 'completed';
    const updatedRide: Ride = {
      ...activeRide,
      paymentMethod: isCash ? 'dinheiro' : activeRide.paymentMethod,
      status: finalStatus,
      completedAt: new Date().toISOString(),
    };
    setActiveRide(updatedRide);
    setCompletedRideForRating(updatedRide);
    setIsRatingModalOpen(true);
    setIsFullMapOpen(false); // Retorna do mapa para tela de avaliação
    notifyRideFinished();

    if (activeRide.id && /^\d+$/.test(String(activeRide.id))) {
      updateCorridaStatusSupabase(activeRide.id, finalStatus, isCash ? 'dinheiro' : undefined).catch(() => {});
    }

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
      isCash
        ? `Corrida em dinheiro (R$ ${activeRide.price.toFixed(2).replace('.', ',')}) finalizada! Avalie seu condutor.`
        : `Total de R$ ${activeRide.price.toFixed(2)} creditado no saldo do motorista! Avalie seu condutor.`,
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
    setRidesHistory((prev) => [
      finalizedRide,
      ...prev.filter((r) => (finalizedRide.id ? r.id !== finalizedRide.id : r !== targetRide)),
    ]);
    saveIsolatedRide(finalizedRide, currentUser);

    // Salva avaliação real na memória da sessão e no Supabase
    saveDriverReview({
      rideId: finalizedRide.id,
      driverId: targetRide.driver?.id || '',
      driverName: targetRide.driver?.name || '',
      driverVehicle: targetRide.driver?.vehicleModel
        ? `${targetRide.driver.vehicleModel} - ${targetRide.driver.vehiclePlate}`
        : '',
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
            const currentTotal = d.totalRides || 0;
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
        const currentTotal = prev.totalRides || 0;
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

  // Cancel active ride (para tudo, sem voz e cancela no Supabase)
  const handleCancelRide = () => {
    cancelVoiceSpeech();
    if (activeRide?.id) {
      updateCorridaStatusSupabase(activeRide.id, 'cancelled').catch(() => {});
    }
    setActiveRide(null);
    setIsFullMapOpen(false);
    setDriverPosition(undefined);
    triggerPush(
      '❌ Busca Cancelada',
      'A corrida foi cancelada. Nenhum valor adicional foi cobrado.',
      'system'
    );
  };

  // Delivery Flash order
  const handleStartDelivery = (ride: Ride) => {
    setActiveRide({ ...ride, status: 'searching' });
    triggerPush(
      '📦 RACE Flash Solicitado!',
      `Buscando motoboy disponível para coleta. Código de entrega: ${ride.deliveryDetails?.deliveryCode}.`,
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

  // Driver register / updates (100% Supabase)
  const handleRegisterDriver = (newDriver: Driver) => {
    const isConfigured =
      newDriver.categoryConfigured !== false &&
      Boolean(newDriver.vehiclePlate?.trim() && newDriver.vehicleModel?.trim());
    const normalizedDriver: Driver = {
      ...newDriver,
      categoryConfigured: isConfigured,
      status: isConfigured ? newDriver.status : 'offline',
    };
    setDrivers((prev) => [normalizedDriver, ...prev.filter((d) => d.id !== normalizedDriver.id)]);
    setCurrentDriver(normalizedDriver);

    const isMoto =
      normalizedDriver.category === 'moto_passageiro' ||
      normalizedDriver.category === 'moto_entrega';
    const userTipo = !isConfigured
      ? isMoto
        ? 'motoboy'
        : 'driver'
      : normalizedDriver.category === 'economica'
      ? 'motorista_economico'
      : normalizedDriver.category === 'confort'
      ? 'motorista_confort'
      : normalizedDriver.category === 'moto_passageiro'
      ? 'motoboy_passageiro'
      : 'motoboy_entregas';

    // Sincroniza a conta isolada no Supabase
    saveUserAccount({
      id: normalizedDriver.id,
      name: normalizedDriver.name,
      email: normalizedDriver.email,
      phone: normalizedDriver.phone,
      password: normalizedDriver.password,
      role: isMoto ? 'motoboy' : 'driver',
      tipo: userTipo,
      placa: normalizedDriver.vehiclePlate,
      avatar: normalizedDriver.avatar,
      rating: normalizedDriver.rating,
      driverData: normalizedDriver,
      createdAt: new Date().toISOString(),
    });

    triggerPush(
      isConfigured ? '🎉 Bem-vindo à RACE!' : 'Escolha sua categoria no app',
      isConfigured
        ? `Cadastro de ${normalizedDriver.name} concluído com sucesso! Você fica com 85% de cada corrida, Race fica com 15% - sem mensalidade.`
        : `Olá ${normalizedDriver.name}! Escolha sua categoria e informe os dados do veículo para liberar o botão verde ONLINE.`,
      isConfigured ? 'financial' : 'system'
    );
  };

  const handleUpdateDriver = (updated: Driver) => {
    const isConfigured =
      updated.categoryConfigured !== false &&
      Boolean(updated.vehiclePlate?.trim() && updated.vehicleModel?.trim());
    const safeUpdated: Driver = {
      ...updated,
      categoryConfigured: isConfigured,
      status: isConfigured ? updated.status : 'offline',
    };
    setCurrentDriver(safeUpdated);
    setDrivers((prev) => [safeUpdated, ...prev.filter((d) => d.id !== safeUpdated.id)]);

    if (safeUpdated.email) {
      const isMoto =
        safeUpdated.category === 'moto_passageiro' ||
        safeUpdated.category === 'moto_entrega';
      const userTipo = !isConfigured
        ? isMoto
          ? 'motoboy'
          : 'driver'
        : safeUpdated.category === 'economica'
        ? 'motorista_economico'
        : safeUpdated.category === 'confort'
        ? 'motorista_confort'
        : safeUpdated.category === 'moto_passageiro'
        ? 'motoboy_passageiro'
        : 'motoboy_entregas';

      saveUserAccount({
        id: safeUpdated.id,
        name: safeUpdated.name,
        email: safeUpdated.email,
        phone: safeUpdated.phone,
        password: safeUpdated.password,
        role: isMoto ? 'motoboy' : 'driver',
        tipo: userTipo,
        placa: safeUpdated.vehiclePlate,
        avatar: safeUpdated.avatar,
        rating: safeUpdated.rating,
        driverData: safeUpdated,
        createdAt: safeUpdated.registrationDate || new Date().toISOString(),
      }, false);
    }
  };

  const handleToggleDriverStatus = (driverId: string) => {
    setDrivers((prev) =>
      prev.map((d) => {
        if (d.id !== driverId) return d;
        const nextStatus: 'online' | 'offline' = d.status === 'online' ? 'offline' : 'online';
        updateDriverOnlineStatusSupabase({
          id: d.id,
          email: d.email,
          status: nextStatus,
          lat: d.lat,
          lng: d.lng,
        }).catch(() => {});
        return { ...d, status: nextStatus };
      })
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

    // Salvar na tabela public.pagamentos no Supabase (id gerado automaticamente)
    savePagamentoSupabase({
      id_motorista: driver.id,
      nome_motorista: driver.name,
      email_motorista: driver.email,
      valor: driver.walletBalance || 0,
      status: 'approved',
      chave_pix: driver.pixKey || '',
    });

    triggerPush(
      'Cadastro Ativo!',
      `${driver.name} está ONLINE! Você fica com 85% de cada corrida, Race fica com 15% - sem mensalidade, sem taxa para trabalhar.`,
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

    // Salvar na tabela public.pagamentos no Supabase (id gerado automaticamente)
    savePagamentoSupabase({
      id_motorista: driver.id,
      nome_motorista: driver.name,
      email_motorista: driver.email,
      valor: 0,
      status: 'rejected',
      chave_pix: driver.pixKey || '',
    });

    triggerPush(
      'Solicitação Atualizada',
      `O registro de ${driver.name} foi atualizado pelo administrador.`,
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

  // Admin Management: Remover e Zerar TODOS os cadastros e dados de teste
  const handleRemoveAllAccounts = async () => {
    await deleteAllUserAccounts();
    setDrivers([]);
    setPassengers([]);
    setRidesHistory([]);
    setActiveRide(null);
    clearWalletMemoryCache();
    clearReviewsCache();
    triggerPush(
      '🗑️ Dados Zerados no Supabase',
      'Todos os cadastros não-ADM, corridas e pagamentos foram zerados com sucesso.',
      'system'
    );
  };

  // Auth success handler: direciona cada perfil direto para sua tela oficial
  const handleAuthSuccess = (user: AppUser, driver?: Driver) => {
    setCurrentUser(user);
    saveSessionUser(user);
    if (driver) {
      const isConfigured =
        driver.categoryConfigured !== false &&
        Boolean(driver.vehiclePlate?.trim() && driver.vehicleModel?.trim());
      const nextDrv: Driver = {
        ...driver,
        categoryConfigured: isConfigured,
        status: isConfigured ? 'online' : 'offline',
      };
      setDrivers((prev) => [nextDrv, ...prev.filter((d) => d.id !== nextDrv.id)]);
      setCurrentDriver(nextDrv);
      if (isConfigured) {
        captureAndSyncDriverGps(nextDrv, 'online');
      }
    }
    const isAdminUser = user.role === 'admin' || user.isAdmin || user.email?.toLowerCase() === ADMIN_EMAIL;
    const isDriverUser =
      user.role === 'driver' ||
      user.role === 'motoboy' ||
      Boolean(driver) ||
      Boolean(user.driverData);
    setActiveTab(isAdminUser ? 'admin' : isDriverUser ? 'driver_portal' : 'rides');
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
    if (currentDriver?.email) {
      updateDriverOnlineStatusSupabase({
        id: currentDriver.id,
        email: currentDriver.email,
        status: 'offline',
      }).catch(() => {});
    }
    saveSessionUser(null);
    purgeLegacyTestLocalStorage(false);
    clearWalletMemoryCache();
    clearReviewsCache();
    setCurrentUser(null);
    setCurrentDriver(DEFAULT_NEW_DRIVER);
    setRidesHistory([]);
    setActiveRide(null);
    setActiveTab('rides');
    triggerPush('Sessão Encerrada', 'Você saiu da sua conta RACE.', 'system');
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  // Reusable real-time GPS map component instance (SOMENTE motoristas ONLINE com categoria configurada)
  const mapElement = (
    <MapRealtime
      drivers={drivers.filter((d) => d.status === 'online' && d.categoryConfigured !== false)}
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
          saveSessionUser(user);

          // Se for Administrador (tipo = ADM ou admin@race.com.br)
          if (
            user.role === 'admin' ||
            user.isAdmin ||
            String(user.tipo || '').toUpperCase() === 'ADM' ||
            user.email?.toLowerCase() === 'admin@race.com.br'
          ) {
            setActiveTab('admin');
            setLoginSuccessBanner(
              'Bem-vindo, Administrador Geral! Painel de controle e auditoria liberados.'
            );
            return;
          }

          const loginTipoLower = String(user.tipo || '').toLowerCase().trim();
          const isDriverOrMotoboy =
            user.role === 'driver' ||
            user.role === 'motoboy' ||
            loginTipoLower === 'driver' ||
            loginTipoLower === 'motorista' ||
            loginTipoLower === 'motoboy' ||
            loginTipoLower === 'motorista_economico' ||
            loginTipoLower === 'motorista_confort' ||
            loginTipoLower === 'motoboy_passageiro' ||
            loginTipoLower === 'motoboy_entregas';

          if (isDriverOrMotoboy) {
            const targetDriver: Driver = driver || user.driverData || {
              ...DEFAULT_NEW_DRIVER,
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              avatar: user.avatar || '',
              category: user.role === 'motoboy' || loginTipoLower.includes('moto') ? 'moto_passageiro' : 'economica',
              categoryConfigured: false,
              status: 'offline',
            };
            const isConfigured =
              targetDriver.categoryConfigured !== false &&
              Boolean(targetDriver.vehiclePlate?.trim() && targetDriver.vehicleModel?.trim());
            const currentBal = getDriverBalance(targetDriver.id, targetDriver.walletBalance || 0);
            const driverWithBal: Driver = {
              ...targetDriver,
              categoryConfigured: isConfigured,
              walletBalance: currentBal,
              weeklyPlanActive: isConfigured,
              status: isConfigured && targetDriver.status === 'online' ? 'online' : 'offline',
            };
            setCurrentDriver(driverWithBal);
            setDrivers((prev) => [driverWithBal, ...prev.filter((d) => d.id !== driverWithBal.id)]);
            if (isConfigured && driverWithBal.status === 'online') {
              captureAndSyncDriverGps(driverWithBal, 'online');
            }
            setActiveTab('driver_portal');
            setLoginSuccessBanner(
              isConfigured
                ? `Bem-vindo(a), ${targetDriver.name}! Central de Corridas pronta para receber chamados. Você fica com 85% de cada corrida sem mensalidade!`
                : `Bem-vindo(a), ${targetDriver.name}! Escolha sua modalidade e preencha os dados do veículo para liberar o botão verde ONLINE.`
            );
          } else {
            // Passageiro: vai direto para tela de pedir corrida com mapa
            setActiveTab('rides');
            setLoginSuccessBanner(
              `Olá, ${user.name}! Escolha seu ponto de embarque e destino para solicitar sua corrida ou entrega.`
            );
          }
        }}
        onRegisterDriverSuccess={(_user, newDriver) => {
          handleRegisterDriver(newDriver);
        }}
        onRegisterMotoboySuccess={(_user, newMotoboy) => {
          handleRegisterDriver(newMotoboy);
        }}
        onRegisterPassengerSuccess={(newUser) => {
          setPassengers((prev) => [newUser, ...prev.filter((p) => p.id !== newUser.id)]);
        }}
      />
    );
  }

  const userTipoLower = String(currentUser.tipo || '').toLowerCase().trim();
  const isUserDriver = Boolean(
    currentUser && (
      currentUser.role === 'driver' ||
      currentUser.role === 'motoboy' ||
      Boolean(currentUser.driverData) ||
      userTipoLower === 'driver' ||
      userTipoLower === 'motorista' ||
      userTipoLower === 'motoboy' ||
      userTipoLower === 'motorista_economico' ||
      userTipoLower === 'motorista_confort' ||
      userTipoLower === 'motoboy_passageiro' ||
      userTipoLower === 'motoboy_entregas'
    )
  );

  const isDriverCategoryConfigured = Boolean(
    currentDriver.categoryConfigured !== false &&
    currentDriver.vehiclePlate?.trim() &&
    currentDriver.vehicleModel?.trim()
  );

  // TELA FULLSCREEN OBRIGATÓRIA DE ESCOLHA DE MODALIDADE APÓS CADASTRO DO MOTORISTA / MOTOBOY
  // Não mostra tela de passageiro, Header ou BottomNav até concluir o preenchimento da modalidade.
  if (isUserDriver && !isDriverCategoryConfigured) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-6 sm:py-10 overflow-y-auto">
        <DriverWorkSelectionView
          currentUser={currentUser}
          isMandatorySetup={true}
          onLogout={handleLogout}
          onCompleteDriverRegister={(newDriver) => {
            const configuredDriver: Driver = {
              ...newDriver,
              categoryConfigured: true,
              status: 'online',
              weeklyPlanActive: true,
            };
            const isMoto =
              configuredDriver.category === 'moto_passageiro' ||
              configuredDriver.category === 'moto_entrega';
            const nextTipo =
              configuredDriver.category === 'economica'
                ? 'motorista_economico'
                : configuredDriver.category === 'confort'
                ? 'motorista_confort'
                : configuredDriver.category === 'moto_passageiro'
                ? 'motoboy_passageiro'
                : 'motoboy_entregas';
            const updatedUser: AppUser = {
              ...currentUser,
              role: isMoto ? 'motoboy' : 'driver',
              tipo: nextTipo,
              placa: configuredDriver.vehiclePlate,
              driverData: configuredDriver,
            };
            setCurrentUser(updatedUser);
            saveSessionUser(updatedUser);
            handleRegisterDriver(configuredDriver);
            captureAndSyncDriverGps(configuredDriver, 'online');
            setActiveTab('driver_portal');
            setLoginSuccessBanner(
              `Modalidade configurada! Você já está ONLINE e pronto para receber corridas na RACE.`
            );
          }}
        />
      </div>
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
            : currentUser?.role === 'admin' ||
              currentUser?.isAdmin ||
              String(currentUser?.tipo || '').toUpperCase() === 'ADM' ||
              currentUser?.email?.toLowerCase() === 'admin@race.com.br'
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
              currentUser?.isAdmin === true ||
              String(currentUser?.tipo || '').toUpperCase() === 'ADM'
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
              const isRideAuthorized = Boolean(
                activeRide &&
                (activeRide.paymentStatus === 'paid' ||
                  activeRide.paymentMethod === 'money' ||
                  activeRide.paymentMethod === 'dinheiro')
              );
              if (!isRideAuthorized) {
                triggerPush(
                  'Complete o fluxo primeiro',
                  'Preencha seu endereço de início e chegada com número, escolha a categoria e confirme a forma de pagamento para liberar o mapa.',
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

        {/* 3. Condutor & Cadastro (85% para você, 15% Race - Sem mensalidade) */}
        {activeTab === 'driver_portal' && (
          isUserDriver ? (
            <DriverPartnerPortal
              currentDriver={currentDriver}
              currentUser={currentUser}
              rides={ridesHistory}
              activeRide={activeRide}
              onAcceptIncomingRide={(ride) => {
                const acceptedObj: Ride = { ...ride, driver: currentDriver, status: 'accepted' };
                setActiveRide(acceptedObj);
                if (ride.id && /^\d+$/.test(String(ride.id))) {
                  acceptCorridaSupabase(ride.id, currentDriver).catch(() => {});
                }
              }}
              onUpdateDriver={handleUpdateDriver}
              onRegisterDriver={(newDriver) => {
                handleRegisterDriver(newDriver);
              }}
              onLoginDriverSuccess={(user, driver) => {
                setCurrentUser(user);
                if (driver) {
                  const isConfigured =
                    driver.categoryConfigured !== false &&
                    Boolean(driver.vehiclePlate?.trim() && driver.vehicleModel?.trim());
                  const nextDrv: Driver = {
                    ...driver,
                    categoryConfigured: isConfigured,
                    status: isConfigured ? 'online' : 'offline',
                  };
                  setCurrentDriver(nextDrv);
                  if (isConfigured) {
                    captureAndSyncDriverGps(nextDrv, 'online');
                  }
                }
                saveSessionUser(user);
                setLoginSuccessBanner(
                  `Bem-vindo(a), ${user.name}! Você fica com 85% de cada corrida, Race fica com 15% - sem mensalidade, sem taxa para trabalhar.`
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
                saveSessionUser(updatedUser);
                setLoginSuccessBanner(
                  `Parabéns, ${newDriver.name}! Cadastro de motorista homologado com sucesso!`
                );
              }}
              onBackToRides={() => setActiveTab('rides')}
              onRenewWeeklyPlan={handleRenewWeeklyPlan}
            />
          )
        )}

        {/* 4. Histórico Completo & Recibos - APENAS dados do próprio usuário no Supabase */}
        {activeTab === 'history' && (
          <RideHistoryView rides={ridesHistory} />
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

        {/* 5. Painel Administrativo Master - ADM */}
        {activeTab === 'admin' && (
          (currentUser?.email?.toLowerCase() === ADMIN_EMAIL || currentUser?.role === 'admin' || currentUser?.isAdmin || String(currentUser?.tipo || '').toUpperCase() === 'ADM') ? (
            <AdminDashboard
              drivers={drivers}
              rides={ridesHistory}
              passengers={passengers}
              onApproveDriver={handleApproveDriver}
              onToggleDriverStatus={handleToggleDriverStatus}
              onOpenShare={() => setIsShareOpen(true)}
              onApproveWeeklyPayment={handleApproveWeeklyPayment}
              onRejectWeeklyPayment={handleRejectWeeklyPayment}
              onRemoveDriver={handleRemoveDriver}
              onRemovePassenger={handleRemovePassenger}
              onActivateAllDrivers={handleActivateAllDrivers}
              onRemoveAllAccounts={handleRemoveAllAccounts}
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
              currentUser?.isAdmin === true ||
              String(currentUser?.tipo || '').toUpperCase() === 'ADM'
            );
            if (!isUserAdmin) return;
          }

          // Se for passageiro e tentar abrir OPÇÃO ou ATIVIDADE antes de ter corrida confirmada (paga ou dinheiro):
          const isPassenger = !currentUser?.role || currentUser.role === 'passenger';
          const hasAuthorizedRide = Boolean(
            activeRide &&
            (activeRide.paymentStatus === 'paid' ||
              activeRide.paymentMethod === 'money' ||
              activeRide.paymentMethod === 'dinheiro')
          );

          if (isPassenger && (tab === 'passenger_options' || tab === 'history')) {
            if (!hasAuthorizedRide) {
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

      {/* 1. Página de Mapa Fullscreen Toda Tela Sem Nenhuma Informação por Cima (Somente com corrida paga ou em dinheiro) */}
      {isFullMapOpen &&
        activeRide &&
        (activeRide.paymentStatus === 'paid' ||
          activeRide.paymentMethod === 'money' ||
          activeRide.paymentMethod === 'dinheiro') && (() => {
          const targetRideCat = normalizeRideCategory(activeRide.category);
          const matchingOnlineDrivers = drivers.filter((d) => {
            if (d.status !== 'online' || d.categoryConfigured === false) return false;
            return normalizeRideCategory(d.category) === targetRideCat;
          });
          return (
            <FullMapView
              onClose={() => setIsFullMapOpen(false)}
              pickup={pickup}
              destination={destination}
              activeDriver={activeRide.driver ?? null}
              activeRide={activeRide}
              onlineDrivers={matchingOnlineDrivers}
              onCompleteRide={handleCompleteRide}
              onCancelRide={handleCancelRide}
              onUpdateDriverPosition={(pos) => {
                setDriverPosition((prev) => {
                  if (prev && prev.lat === pos.lat && prev.lng === pos.lng) return prev;
                  return pos;
                });
              }}
            />
          );
        })()}

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
