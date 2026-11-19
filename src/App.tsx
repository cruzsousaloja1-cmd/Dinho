import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
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
import { ForgotPasswordModal } from './components/ForgotPasswordModal';
import { DriverLoginScreen } from './components/DriverLoginScreen';
import { SplashScreen } from './components/SplashScreen';
import { FullMapView } from './components/FullMapView';
import { PassengerOptionsView } from './components/PassengerOptionsView';
import { PassengerAccountView } from './components/PassengerAccountView';
import { PrivacyPolicyPage } from './components/PrivacyPolicyPage';
import { RatingModal } from './components/RatingModal';
import { saveDriverReview, clearReviewsCache } from './services/reviewService';
import { AppUser } from './types';
import { AlertTriangle, CheckCircle2, X, QrCode, XCircle, Loader2 } from 'lucide-react';
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
  isAppUserAdmin,
  isAppUserDriver,
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
  checkEmailExistsSupabase,
  getAllDriversFromSupabase,
  getOnlineDriversFromSupabase,
  updateDriverOnlineStatusSupabase,
  getAllPassengersFromSupabase,
  subscribeToCorridasRealtime,
  purgeLegacyTestLocalStorage,
  normalizeRideCategory,
  getPassengerDebtSupabase,
  clearPassengerDebtSupabase,
  hydrateRidesWithUserPhotosSupabase,
  fetchUsuarioPhotoByIdentity,
  fetchRideCounterpartProfileSupabase,
  signOutSupabase,
  fetchDriverApplicationsSupabase,
  mergeDriverWithApplication,
  checkAndAwardReferralBonusSupabase,
  deductPassengerCreditSupabase,
  syncDriverWalletSaldoSupabase,
  ensureUserReferralCodeSupabase,
  supabase,
  withPhotoCacheBuster
} from './supabase';
import { generateUniqueRideConfirmationCode } from './services/pricingService';
import { calculateRideSplitForDriver, getDriverEarningsStatusText, isDriverInLaunchZeroFeePromo } from './services/promoService';

export default function App() {
  const initialSessionRef = React.useRef<AppUser | null | undefined>(undefined);
  if (initialSessionRef.current === undefined) {
    initialSessionRef.current = getSessionUser();
  }
  const initialUser = initialSessionRef.current;

  const resolveInitialTab = (u: AppUser | null): TabType => {
    if (!u) return 'driver_portal';
    if (isAppUserAdmin(u)) return 'admin';
    return isAppUserDriver(u) ? 'driver_portal' : 'rides';
  };

  // Global States
  const [activeTab, setActiveTab] = useState<TabType>(() => resolveInitialTab(initialUser));
  const tabScrollTopsRef = useRef<Partial<Record<TabType, number>>>({});
  const tabPanelRefs = useRef<Partial<Record<TabType, HTMLDivElement | null>>>({});

  useLayoutEffect(() => {
    const el = tabPanelRefs.current[activeTab];
    if (el) {
      el.scrollTop = tabScrollTopsRef.current[activeTab] ?? 0;
    }
  }, [activeTab]);

  const [isFullMapOpen, setIsFullMapOpen] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [currentDriver, setCurrentDriver] = useState<Driver>(
    () => initialUser?.driverData || DEFAULT_NEW_DRIVER
  );
  const [ridesHistory, setRidesHistory] = useState<Ride[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isCancellingRide, setIsCancellingRide] = useState(false);
  const [completedRideForRating, setCompletedRideForRating] = useState<Ride | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  const activeRideStatusLower = String(activeRide?.status || '').toLowerCase();
  const isSearchingActiveRide =
    Boolean(activeRide) &&
    (activeRideStatusLower === '' ||
      activeRideStatusLower === 'procurando' ||
      activeRideStatusLower === 'searching' ||
      activeRideStatusLower === 'procurando_motorista');
  const isRideActivePhase =
    Boolean(activeRide) &&
    activeRideStatusLower !== 'completed' &&
    activeRideStatusLower !== 'finalizada' &&
    activeRideStatusLower !== 'cancelled' &&
    activeRideStatusLower !== 'cancelada';

  const getTabPanelProps = (tab: TabType) => {
    const isActive = activeTab === tab;
    const bottomPad = isRideActivePhase && tab !== 'driver_portal' ? 'pb-40' : 'pb-28';
    return {
      ref: (el: HTMLDivElement | null) => {
        tabPanelRefs.current[tab] = el;
      },
      onScroll: (e: React.UIEvent<HTMLDivElement>) => {
        if (isActive) {
          tabScrollTopsRef.current[tab] = e.currentTarget.scrollTop;
        }
      },
      className: isActive
        ? `h-full w-full overflow-y-auto overscroll-contain px-4 py-4 sm:p-5 ${bottomPad} box-border`
        : 'hidden',
    };
  };
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory>('economica');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'pix' | 'credit_card' | 'dinheiro'>('pix');
  const [optionsLaunchNonce, setOptionsLaunchNonce] = useState(0);

  // Registered Passengers State (100% Supabase)
  const [passengers, setPassengers] = useState<AppUser[]>([]);

  // 1. Authentication & Session (salvo em race_usuario_logado + sincronizado no Supabase)
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => initialUser);
  const ADMIN_DRIVER_BLOCK_MESSAGE =
    'Esta conta é de ADM. Para ser motorista, crie uma conta de motorista.';

  // Garante isolamento de abas para ADM: apenas ADM e CONTA (nunca Motorista/Corridas)
  useEffect(() => {
    if (currentUser && isAppUserAdmin(currentUser)) {
      if (activeTab !== 'admin' && activeTab !== 'passenger_account') {
        setActiveTab('admin');
      }
    }
  }, [currentUser, activeTab]);
  const [passengerDebt, setPassengerDebt] = useState<{
    debtAmount: number;
    isBlocked: boolean;
    unpaidRideIds: string[];
  }>({ debtAmount: 0, isBlocked: false, unpaidRideIds: [] });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [loginSuccessBanner, setLoginSuccessBanner] = useState<string | null>(null);
  const [showStartupSplash, setShowStartupSplash] = useState(true);
  const [showPostAuthSplash, setShowPostAuthSplash] = useState(false);

  // Map and Route States
  const [pickup, setPickup] = useState<LocationPoint | null>(null);
  const [destination, setDestination] = useState<LocationPoint | null>(null);
  const [hasSearchedRoute, setHasSearchedRoute] = useState(false);
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
  const [passwordRecoveryEmail, setPasswordRecoveryEmail] = useState<string | null>(null);

  const isPrivacyPath = () => {
    if (typeof window === 'undefined') return false;
    const p = window.location.pathname.toLowerCase();
    const h = window.location.hash.toLowerCase();
    return p.endsWith('/privacidade') || p.endsWith('/privacidade/') || h.includes('/privacidade');
  };
  const [isPrivacyPageOpen, setIsPrivacyPageOpen] = useState<boolean>(() => isPrivacyPath());

  useEffect(() => {
    const syncPrivacyRoute = () => setIsPrivacyPageOpen(isPrivacyPath());
    window.addEventListener('popstate', syncPrivacyRoute);
    window.addEventListener('hashchange', syncPrivacyRoute);
    return () => {
      window.removeEventListener('popstate', syncPrivacyRoute);
      window.removeEventListener('hashchange', syncPrivacyRoute);
    };
  }, []);

  // Detecta retorno do link de redefinição de senha do Supabase Auth (/Dinho/#...type=recovery)
  useEffect(() => {
    const checkInitialRecovery = async () => {
      try {
        const hash = typeof window !== 'undefined' ? window.location.hash.toLowerCase() : '';
        if (hash.includes('type=recovery')) {
          const { data } = await supabase.auth.getSession();
          const email = data?.session?.user?.email || '';
          if (email) {
            setPasswordRecoveryEmail(email.toLowerCase());
          }
        }
      } catch {}
    };
    checkInitialRecovery();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        const email = session?.user?.email || '';
        setPasswordRecoveryEmail(email ? email.toLowerCase() : '');
      }
    });
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const openPrivacyPage = () => {
    try {
      const targetUrl = `${import.meta.env.BASE_URL}privacidade`;
      if (!window.location.pathname.endsWith('/privacidade')) {
        window.history.pushState({ privacy: true }, '', targetUrl);
      }
    } catch {}
    setIsPrivacyPageOpen(true);
  };

  const closePrivacyPage = () => {
    try {
      if (window.location.pathname.toLowerCase().includes('/privacidade')) {
        window.history.pushState({}, '', import.meta.env.BASE_URL);
      }
    } catch {}
    setIsPrivacyPageOpen(false);
  };

  // 2. Startup: limpar resquícios antigos de localStorage e validar sessão ativa diretamente no Supabase (com isolamento por login)
  useEffect(() => {
    purgeLegacyTestLocalStorage(true);

    let active = true;
    const initFromSupabase = async () => {
      const session = getSessionUser();
      const sessionIdentifier = session?.email || session?.login || '';
      if (!session || !sessionIdentifier) {
        if (active) {
          setDrivers([]);
          setPassengers([]);
          setRidesHistory([]);
        }
        return;
      }

      try {
        const cloudRow = await getUsuarioSupabase(sessionIdentifier);
        if (!active) return;

        if (cloudRow && cloudRow.status === 'bloqueado') {
          saveSessionUser(null);
          setCurrentUser(null);
          setCurrentDriver(DEFAULT_NEW_DRIVER);
          setDrivers([]);
          setPassengers([]);
          setRidesHistory([]);
          return;
        }

        if (!cloudRow) {
          if (!isAppUserAdmin(session)) {
            try {
              const stillExists = await checkEmailExistsSupabase(sessionIdentifier);
              if (stillExists === false) {
                saveSessionUser(null);
                setCurrentUser(null);
                setCurrentDriver(DEFAULT_NEW_DRIVER);
                await supabase.auth.signOut().catch(() => {});
              }
            } catch {}
          }
          // Mesmo com sessão local, carrega apenas marcadores públicos online se passageiro/motorista
          const publicOnline = await getOnlineDriversFromSupabase().catch(() => []);
          if (active) {
            setDrivers(publicOnline.filter((d) => d.status === 'online' && d.approvalStatus === 'aprovado'));
            setPassengers([]);
          }
          return;
        }

        const { user: hydratedUser, driver: hydratedDriver } = mapSupabaseRowToAppUser(cloudRow);
        let directPhoto = hydratedUser.avatar || '';
        if (!directPhoto && sessionIdentifier.includes('@')) {
          try {
            const { data: photoRow } = await supabase
              .from('usuarios')
              .select('foto, avatar')
              .eq('email', sessionIdentifier.trim().toLowerCase())
              .single();
            directPhoto = String(photoRow?.avatar || photoRow?.foto || '').trim();
          } catch {}
        }
        if (!directPhoto) {
          try {
            const { data: authUserRes } = await supabase.auth.getUser();
            directPhoto = String(
              authUserRes?.user?.user_metadata?.avatar_url ||
                authUserRes?.user?.user_metadata?.foto ||
                ''
            ).trim();
          } catch {}
        }
        const resolvedAvatar = withPhotoCacheBuster(directPhoto || session.avatar || '');
        if (resolvedAvatar) {
          console.log('fotoUrl carregada:', resolvedAvatar);
        }
        const ensuredCodigoIndicacao = await ensureUserReferralCodeSupabase({
          id: hydratedUser.id,
          email: hydratedUser.email,
          name: hydratedUser.name,
          currentCode: hydratedUser.codigoIndicacao || session.codigoIndicacao,
        });
        if (!active) return;

        const mergedUser: AppUser = {
          ...hydratedUser,
          avatar: resolvedAvatar,
          codigoIndicacao: ensuredCodigoIndicacao,
          driverData: hydratedDriver
            ? {
                ...hydratedDriver,
                avatar: resolvedAvatar || hydratedDriver.avatar,
                codigoIndicacao: ensuredCodigoIndicacao,
              }
            : hydratedUser.driverData,
        };
        setCurrentUser(mergedUser);
        saveSessionUser(mergedUser);

        if (isAppUserAdmin(mergedUser)) {
          setActiveTab('admin');
          try {
            const [cloudDrivers, onlineRpcDrivers, cloudPassengers, fetchedApps] = await Promise.all([
              getAllDriversFromSupabase(),
              getOnlineDriversFromSupabase(),
              getAllPassengersFromSupabase(),
              fetchDriverApplicationsSupabase().catch(() => ({} as Record<string, any>)),
            ]);
            if (!active) return;
            const appsMap: Record<string, any> = fetchedApps || {};
            const mergedDriversMap = new Map<string, Driver>();
            [...cloudDrivers, ...onlineRpcDrivers].forEach((drv) => {
              const emailKey = (drv.email || '').trim().toLowerCase();
              const hydratedWithApp = mergeDriverWithApplication(drv, emailKey ? appsMap[emailKey] : undefined);
              const key = hydratedWithApp.id || hydratedWithApp.email || `${hydratedWithApp.name}-${hydratedWithApp.vehiclePlate}`;
              if (!key) return;
              const prev = mergedDriversMap.get(key);
              if (!prev) {
                mergedDriversMap.set(key, hydratedWithApp);
              } else {
                const combined = {
                  ...prev,
                  ...hydratedWithApp,
                  avatar: hydratedWithApp.avatar || prev.avatar,
                };
                mergedDriversMap.set(key, {
                  ...combined,
                  status:
                    combined.approvalStatus === 'aprovado' &&
                    (prev.status === 'online' || hydratedWithApp.status === 'online')
                      ? 'online'
                      : combined.approvalStatus === 'aprovado'
                      ? 'offline'
                      : combined.approvalStatus === 'reprovado'
                      ? 'offline'
                      : 'pending_approval',
                });
              }
            });
            setDrivers(Array.from(mergedDriversMap.values()));
            setPassengers(cloudPassengers);
          } catch {}
          return;
        }

        const isDriverOrMotoboy = isAppUserDriver(mergedUser);
        const onlineRpcDrivers = await getOnlineDriversFromSupabase().catch(() => []);
        if (!active) return;

        setPassengers([]);

        if (isDriverOrMotoboy && hydratedDriver) {
          const emailKey = (hydratedDriver.email || mergedUser.email || '').trim().toLowerCase();
          const appsMap = emailKey
            ? await fetchDriverApplicationsSupabase(emailKey).catch(() => ({}))
            : {};
          if (!active) return;
          const appMergedDriver = mergeDriverWithApplication(
            hydratedDriver,
            emailKey ? (appsMap as Record<string, any>)[emailKey] : undefined
          );
          const isConfigured =
            appMergedDriver.categoryConfigured !== false &&
            Boolean(appMergedDriver.vehiclePlate?.trim() && appMergedDriver.vehicleModel?.trim()) &&
            appMergedDriver.requirementsConfirmed === true &&
            appMergedDriver.documentosAceitos !== false;
          const isApproved = appMergedDriver.approvalStatus === 'aprovado';
          const currentBalance = getDriverBalance(appMergedDriver.id, appMergedDriver.walletBalance || 0);
          const updatedMatched: Driver = {
            ...appMergedDriver,
            categoryConfigured:
              appMergedDriver.categoryConfigured !== false &&
              Boolean(appMergedDriver.vehiclePlate?.trim() && appMergedDriver.vehicleModel?.trim()),
            requirementsConfirmed: appMergedDriver.requirementsConfirmed === true,
            walletBalance: currentBalance,
            weeklyPlanActive: true,
            status:
              isConfigured && isApproved && appMergedDriver.status === 'online'
                ? 'online'
                : isApproved
                ? 'offline'
                : appMergedDriver.approvalStatus === 'reprovado'
                ? 'offline'
                : 'pending_approval',
          };
          setCurrentDriver(updatedMatched);
          setDrivers(
            onlineRpcDrivers.filter((d) => d.status === 'online' && d.approvalStatus === 'aprovado')
          );
          setActiveTab('driver_portal');
          if (isConfigured && isApproved && updatedMatched.status === 'online') {
            captureAndSyncDriverGps(updatedMatched, 'online');
          }
        } else {
          setDrivers(
            onlineRpcDrivers.filter((d) => d.status === 'online' && d.approvalStatus === 'aprovado')
          );
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
    if (
      status === 'offline' ||
      driverTarget.approvalStatus !== 'aprovado' ||
      driverTarget.documentosAceitos === false
    ) {
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

  const refreshRidesHistory = async (userTarget: AppUser | null = currentUser) => {
    if (!userTarget) {
      setRidesHistory([]);
      return;
    }
    setIsLoadingHistory(true);
    try {
      const cloudRides = await getCorridasSupabase(userTarget);
      setRidesHistory(cloudRides || []);
    } catch (err) {
      console.warn('Aviso ao sincronizar corridas do Supabase:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Sincronizar corridas isoladas da nuvem Supabase para o usuário logado
  useEffect(() => {
    if (!currentUser) {
      setRidesHistory([]);
      setPassengerDebt({ debtAmount: 0, isBlocked: false, unpaidRideIds: [] });
      return;
    }
    refreshRidesHistory(currentUser);

    getPassengerDebtSupabase(currentUser)
      .then((debt) => {
        setPassengerDebt(debt);
      })
      .catch(() => {});

    if (!isAppUserDriver(currentUser) && !isAppUserAdmin(currentUser) && currentUser.email) {
      getUsuarioSupabase(currentUser.email)
        .then((cloudRow) => {
          if (cloudRow && typeof cloudRow.saldo === 'number') {
            const nextSaldo = Math.max(0, Number(cloudRow.saldo) || 0);
            setCurrentUser((prev) => {
              if (!prev) return prev;
              const prevSaldo = Number(prev.creditBalance || 0);
              if (Math.abs(nextSaldo - prevSaldo) < 0.01) return prev;
              const updated = { ...prev, creditBalance: nextSaldo };
              saveSessionUser(updated);
              return updated;
            });
          }
        })
        .catch(() => {});
    }
  }, [currentUser, activeTab]);

  const handleClearPassengerDebt = async (
    asaasPaymentId: string,
    asaasStatus: 'RECEIVED' | 'CONFIRMED'
  ) => {
    if (!currentUser) return;
    const ok = await clearPassengerDebtSupabase({
      user: currentUser,
      debtAmount: passengerDebt.debtAmount,
      asaasPaymentId,
      asaasStatus,
      unpaidRideIds: passengerDebt.unpaidRideIds,
    });
    if (ok) {
      const updatedUser: AppUser = {
        ...currentUser,
        debtAmount: 0,
        isBlockedDebt: false,
        debtRideId: undefined,
      };
      setCurrentUser(updatedUser);
      saveSessionUser(updatedUser);
      setPassengerDebt({ debtAmount: 0, isBlocked: false, unpaidRideIds: [] });
      triggerPush(
        'Dívida quitada via PIX Asaas!',
        'Seu acesso para novas corridas na RACE foi liberado.',
        'financial'
      );
    }
  };

  // Polling em tempo real dos motoristas/motoboys ONLINE no Supabase (para o mapa do passageiro)
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    const isAdmin = isAppUserAdmin(currentUser);
    const isDriver = !isAdmin && isAppUserDriver(currentUser);
    const ownDriverEmail = (currentDriver?.email || currentUser?.email || '').trim().toLowerCase();

    const syncOnlineDrivers = async () => {
      try {
        if (isAdmin) {
          const [cloudDrivers, onlineListRaw, appsMap] = await Promise.all([
            getAllDriversFromSupabase(),
            getOnlineDriversFromSupabase(),
            fetchDriverApplicationsSupabase().catch(() => ({})),
          ]);
          if (!active) return;

          const mergedMap = new Map<string, Driver>();
          [...cloudDrivers, ...onlineListRaw].forEach((drv) => {
            const emailKey = (drv.email || '').trim().toLowerCase();
            const hydrated = mergeDriverWithApplication(drv, emailKey ? (appsMap as Record<string, any>)[emailKey] : undefined);
            const k = hydrated.id || hydrated.email || `${hydrated.name}-${hydrated.vehiclePlate}`;
            if (!k) return;
            const prev = mergedMap.get(k);
            if (!prev) {
              mergedMap.set(k, hydrated);
            } else {
              mergedMap.set(k, {
                ...prev,
                ...hydrated,
                avatar: hydrated.avatar || prev.avatar,
                status:
                  hydrated.approvalStatus === 'aprovado' && (prev.status === 'online' || hydrated.status === 'online')
                    ? 'online'
                    : hydrated.approvalStatus === 'aprovado'
                    ? 'offline'
                    : hydrated.approvalStatus === 'reprovado'
                    ? 'offline'
                    : 'pending_approval',
              });
            }
          });
          setDrivers(Array.from(mergedMap.values()));
          return;
        }

        const [onlineListRaw, ownAppsMap] = await Promise.all([
          getOnlineDriversFromSupabase(),
          isDriver && ownDriverEmail
            ? fetchDriverApplicationsSupabase(ownDriverEmail).catch(() => ({}))
            : Promise.resolve({}),
        ]);
        if (!active) return;

        const onlineList = onlineListRaw.filter(
          (d) => d.status === 'online' && d.approvalStatus === 'aprovado'
        );

        if (isDriver && ownDriverEmail) {
          const myApp = (ownAppsMap as Record<string, any>)[ownDriverEmail];
          if (myApp && myApp.approvalStatus && myApp.approvalStatus !== currentDriver.approvalStatus) {
            setCurrentDriver((prev) => mergeDriverWithApplication(prev, myApp));
          }
        }

        // Passageiros e motoristas comuns só enxergam condutores online aprovados no mapa
        setDrivers(onlineList);
      } catch {}
    };

    syncOnlineDrivers();
    const timer = setInterval(syncOnlineDrivers, 3500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [currentUser, isFullMapOpen, activeTab, currentDriver?.email, currentDriver?.approvalStatus]);

  // 3. Rota Secreta /admin: abre o AdminDashboard se o usuário for admin, senão volta para tela preta de login
  useEffect(() => {
    const checkSecretAdminRoute = () => {
      const hash = window.location.hash.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      const isTryingAdmin = hash === '#/admin' || hash === '#admin' || path.endsWith('/admin');

      if (isTryingAdmin) {
        const savedUser: AppUser | null = currentUser || getSessionUser();

        const isUserAdmin = isAppUserAdmin(savedUser);

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

  // Realtime Supabase ('corridas') + Polling em tempo real enquanto houver corrida ativa
  useEffect(() => {
    const curSt = String(activeRide?.status || '').toLowerCase();
    const isTerminal =
      curSt === 'completed' ||
      curSt === 'finalizada' ||
      curSt === 'cancelled' ||
      curSt === 'cancelada';
    if (!activeRide || isTerminal) return;

    const isSearching =
      curSt === 'searching' || curSt === 'procurando' || curSt === 'procurando_motorista';

    let isMounted = true;
    let handledAccept = !isSearching;

    const applyLatestRideUpdate = async (latestRide: Ride) => {
      if (!isMounted || !latestRide) return;
      const matchesOwnEmail =
        !latestRide.passengerEmail ||
        !currentUser?.email ||
        normalizeEmail(latestRide.passengerEmail) === normalizeEmail(currentUser.email);
      if (!matchesOwnEmail) return;

      const st = String(latestRide.status || '').toLowerCase();

      if (st === 'cancelled' || st === 'cancelada') {
        cancelVoiceSpeech();
        setActiveRide(null);
        setIsFullMapOpen(false);
        setIsCancelConfirmOpen(false);
        setDriverPosition(undefined);
        return;
      }

      if (
        isSearching &&
        !handledAccept &&
        (st === 'accepted' ||
          st === 'aceita' ||
          st === 'em_andamento' ||
          st === 'driver_assigned' ||
          st === 'driver_arriving' ||
          st === 'in_progress')
      ) {
        handledAccept = true;
        const [hydratedLatest] = await hydrateRidesWithUserPhotosSupabase([latestRide]).catch(() => [latestRide]);
        if (!isMounted) return;
        const resolvedRide = hydratedLatest || latestRide;
        let fullDriver = resolvedRide.driver;
        if (fullDriver) {
          let matched = drivers.find(
            (d) =>
              (fullDriver?.id && d.id === fullDriver.id) ||
              (fullDriver?.email && d.email && d.email.toLowerCase() === fullDriver.email.toLowerCase())
          );
          if (!matched || !matched.avatar) {
            const refreshedDrivers = await getOnlineDriversFromSupabase().catch(() => []);
            if (!isMounted) return;
            const foundInRefreshed = refreshedDrivers.find(
              (d) =>
                (fullDriver?.id && d.id === fullDriver.id) ||
                (fullDriver?.email && d.email && d.email.toLowerCase() === fullDriver.email.toLowerCase())
            );
            if (foundInRefreshed) matched = foundInRefreshed;
          }
          if (matched) {
            fullDriver = {
              ...matched,
              ...fullDriver,
              avatar: fullDriver.avatar || matched.avatar || '',
              vehicleModel: fullDriver.vehicleModel || matched.vehicleModel || '',
              vehiclePlate: fullDriver.vehiclePlate || matched.vehiclePlate || '',
              vehicleColor: fullDriver.vehicleColor || matched.vehicleColor || '',
              vehicleYear: fullDriver.vehicleYear || matched.vehicleYear || 2023,
              phone: fullDriver.phone || matched.phone || '',
              rating: fullDriver.rating || matched.rating || 0,
            };
          }
          const targetCorridaId = resolvedRide.id || activeRide.id;
          if ((!fullDriver.avatar || !fullDriver.phone || !fullDriver.vehiclePlate) && targetCorridaId && /^\d+$/.test(String(targetCorridaId))) {
            const cp = await fetchRideCounterpartProfileSupabase(targetCorridaId).catch(() => null);
            if (!isMounted) return;
            if (cp) {
              fullDriver = {
                ...fullDriver,
                avatar: fullDriver.avatar || cp.avatar || '',
                name: fullDriver.name || cp.name || 'Motorista',
                vehiclePlate: fullDriver.vehiclePlate || cp.vehiclePlate || '',
                vehicleModel: fullDriver.vehicleModel || cp.vehicleModel || '',
                vehicleColor: fullDriver.vehicleColor || cp.vehicleColor || '',
                vehicleYear: fullDriver.vehicleYear || cp.vehicleYear || 2023,
                phone: fullDriver.phone || cp.phone || '',
                rating: fullDriver.rating || cp.rating || 0,
              };
            }
          }
        }
        const acceptedDriverName = (fullDriver?.name || '').trim() || 'Motorista';
        setActiveRide((curr) =>
          curr
            ? {
                ...curr,
                id: resolvedRide.id || curr.id,
                passengerAvatar: resolvedRide.passengerAvatar || curr.passengerAvatar || currentUser?.avatar || '',
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
          Boolean(activeRide.id && updRide.id) &&
          String(updRide.id) === String(activeRide.id);
        const matchesCode =
          Boolean(activeRide.confirmationCode && updRide.confirmationCode) &&
          updRide.confirmationCode === activeRide.confirmationCode;
        const matchesPassenger =
          !updRide.passengerEmail ||
          !currentUser?.email ||
          normalizeEmail(updRide.passengerEmail) === normalizeEmail(currentUser.email);
        if ((matchesId || matchesCode) && matchesPassenger) {
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
          latestRide =
            (activeRide.confirmationCode
              ? allUserRides.find((r) => r.confirmationCode === activeRide.confirmationCode)
              : null) ||
            allUserRides[0] ||
            null;
        }
        if (latestRide) {
          await applyLatestRideUpdate(latestRide);
        }
      } catch {}
    };

    const interval = setInterval(checkAccepted, isSearching ? 2500 : 4000);
    return () => {
      isMounted = false;
      unsubscribeRealtime();
      clearInterval(interval);
    };
  }, [activeRide?.id, activeRide?.status, activeRide?.confirmationCode, currentUser, drivers]);

  // Hidrata automaticamente fotos do motorista e passageiro direto do Supabase sempre que abrir a chamada/corrida
  useEffect(() => {
    if (!activeRide) return;
    const needsPassengerPhoto = !activeRide.passengerAvatar;
    const needsDriverPhoto = Boolean(
      activeRide.driver && (!activeRide.driver.avatar || !activeRide.driver.vehiclePlate)
    );
    if (!needsPassengerPhoto && !needsDriverPhoto) return;

    let mounted = true;
    hydrateRidesWithUserPhotosSupabase([activeRide])
      .then(([hydrated]) => {
        if (!mounted || !hydrated) return;
        const nextPassengerAvatar = hydrated.passengerAvatar || activeRide.passengerAvatar || currentUser?.avatar || '';
        const nextDriver = hydrated.driver || activeRide.driver;
        if (
          nextPassengerAvatar !== (activeRide.passengerAvatar || '') ||
          nextDriver?.avatar !== activeRide.driver?.avatar ||
          nextDriver?.vehiclePlate !== activeRide.driver?.vehiclePlate
        ) {
          setActiveRide((curr) =>
            curr
              ? {
                  ...curr,
                  passengerAvatar: nextPassengerAvatar || curr.passengerAvatar,
                  driver: nextDriver
                    ? {
                        ...nextDriver,
                        avatar: nextDriver.avatar || curr.driver?.avatar || '',
                      }
                    : curr.driver,
                }
              : curr
          );
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [
    activeRide?.id,
    activeRide?.status,
    activeRide?.passengerAvatar,
    activeRide?.driver?.id,
    activeRide?.driver?.email,
    activeRide?.driver?.avatar,
    activeRide?.driver?.vehiclePlate,
    currentUser?.avatar,
  ]);

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

  // Passenger confirma corrida -> só cria se for Dinheiro ou Asaas RECEIVED/CONFIRMED (e sem dívida bloqueada)
  const handleStartRide = (ride: Ride) => {
    if (passengerDebt.isBlocked && passengerDebt.debtAmount > 0) {
      triggerPush(
        'Conta bloqueada por dívida em aberto',
        `Quite o valor de R$ ${passengerDebt.debtAmount.toFixed(2).replace('.', ',')} via PIX Asaas antes de solicitar nova corrida.`,
        'financial'
      );
      return;
    }
    const isCash = ride.paymentMethod === 'money' || ride.paymentMethod === 'dinheiro';
    const isCreditCovered =
      ride.paymentMethod === 'race_pay' &&
      Number(ride.creditUsed || 0) > 0 &&
      Number(ride.price || 0) <= 0 &&
      ride.paymentStatus === 'paid';
    const isAsaasConfirmed =
      ride.asaasStatus === 'RECEIVED' || ride.asaasStatus === 'CONFIRMED';

    if (!isCash && !isCreditCovered && (!isAsaasConfirmed || ride.paymentStatus !== 'paid')) {
      triggerPush(
        'Pague primeiro para chamar o motorista',
        'Aguarde a confirmação real do pagamento no Asaas (PIX ou Cartão) ou escolha Dinheiro.',
        'ride'
      );
      return;
    }

    const confirmationCode = ride.confirmationCode || generateUniqueRideConfirmationCode();
    const resolvedPassengerAvatar = ride.passengerAvatar || currentUser?.avatar || '';
    const startedRide: Ride = {
      ...ride,
      passengerId: ride.passengerId || currentUser?.id,
      passengerEmail: ride.passengerEmail || currentUser?.email,
      passengerAvatar: resolvedPassengerAvatar,
      paymentMethod: isCreditCovered ? 'race_pay' : isCash ? 'dinheiro' : ride.paymentMethod,
      paymentStatus: isCash ? 'pending' : 'paid',
      status: 'procurando',
      confirmationCode,
    };
    setActiveRide(startedRide);
    if (!resolvedPassengerAvatar && (currentUser?.email || currentUser?.id)) {
      fetchUsuarioPhotoByIdentity({ id: currentUser?.id, email: currentUser?.email })
        .then((prof) => {
          if (prof?.avatar) {
            setActiveRide((curr) =>
              curr && curr.confirmationCode === confirmationCode
                ? { ...curr, passengerAvatar: prof.avatar }
                : curr
            );
          }
        })
        .catch(() => {});
    }
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

    // Deduz crédito RACE utilizado pelo passageiro (parcial ou total)
    const creditUsedAmount = Number(ride.creditUsed || 0);
    if (creditUsedAmount > 0 && (currentUser?.id || currentUser?.email)) {
      setCurrentUser((prev) => {
        if (!prev) return prev;
        const optimisticSaldo = Math.max(
          0,
          Number((Number(prev.creditBalance || 0) - creditUsedAmount).toFixed(2))
        );
        const nextUser = { ...prev, creditBalance: optimisticSaldo };
        saveSessionUser(nextUser);
        return nextUser;
      });
      deductPassengerCreditSupabase({
        userId: currentUser?.id,
        email: currentUser?.email,
        amountUsed: creditUsedAmount,
      })
        .then((res) => {
          if (res.success && typeof res.newBalance === 'number') {
            setCurrentUser((prev) => {
              if (!prev) return prev;
              const nextUser = { ...prev, creditBalance: res.newBalance };
              saveSessionUser(nextUser);
              return nextUser;
            });
          }
        })
        .catch(() => {});
    }

    // Dinheiro e 100% Crédito NÃO passam pelo Asaas — só grava pagamento Asaas quando há valor pago via PIX / Cartão
    if (!isCash && !isCreditCovered && startedRide.price > 0) {
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
      title: isCash
        ? `💵 Pagamento em DINHEIRO - Receba ${`R$ ${ride.price.toFixed(2).replace('.', ',')}`} do passageiro`
        : isCreditCovered
        ? '🎟️ Nova corrida (Crédito RACE) - Aceitar'
        : '🔔 Nova corrida - Aceitar',
      message: `${ride.passengerName || 'Passageiro'} • ${ride.pickup.address} → ${ride.destination.address} (R$ ${(ride.originalPrice ?? ride.price).toFixed(2).replace('.', ',')})`,
      time: 'Agora',
      type: 'ride',
      read: false,
    };
    setNotifications((prev) => [driverAlert, ...prev]);
  };

  // Complete active ride - fecha mapa e abre modal de Avaliação
  const handleCompleteRide = () => {
    if (!activeRide) return;
    const isCash = activeRide.paymentMethod === 'money' || activeRide.paymentMethod === 'dinheiro';
    const finalStatus = 'finalizada';
    const targetDriver = activeRide.driver || currentDriver;
    const fareForSplit = activeRide.originalPrice ?? activeRide.price;
    const split = calculateRideSplitForDriver(
      fareForSplit,
      targetDriver,
      activeRide.createdAt
    );

    const updatedRide: Ride = {
      ...activeRide,
      driverEarnings: split.driverEarnings,
      platformFee: split.platformFee,
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
      updateCorridaStatusSupabase(
        activeRide.id,
        finalStatus,
        isCash ? 'dinheiro' : undefined,
        {
          valor_motorista: split.driverEarnings,
          valor_race: split.platformFee,
        }
      ).catch(() => {});
    }

    // Verifica bônus de indicação do passageiro (1ª corrida finalizada -> R$ 10,00 de crédito para quem indicou)
    if (activeRide.passengerId || activeRide.passengerEmail || currentUser?.id || currentUser?.email) {
      checkAndAwardReferralBonusSupabase({
        userId: activeRide.passengerId || currentUser?.id,
        userEmail: activeRide.passengerEmail || currentUser?.email,
      }).catch(() => {});
    }

    // Credita o valor líquido da corrida (100% na Promo Lançamento ou 85% normal) na carteira do motorista
    if (activeRide.driver?.id) {
      const updatedBalance = !isCash
        ? addDriverEarnings(activeRide.driver.id, split.driverEarnings)
        : getDriverBalance(activeRide.driver.id, activeRide.driver.walletBalance || 0);

      if (!isCash) {
        syncDriverWalletSaldoSupabase({
          driverId: activeRide.driver.id,
          driverEmail: activeRide.driver.email,
          saldo: updatedBalance,
        }).catch(() => {});
      }

      checkAndAwardReferralBonusSupabase({
        driverId: activeRide.driver.id,
        driverEmail: activeRide.driver.email,
      }).catch(() => {});

      setCurrentDriver((prev) => {
        if (!prev) return prev;
        if (prev.id === activeRide.driver?.id) {
          return {
            ...prev,
            walletBalance: updatedBalance,
            earningsToday: (prev.earningsToday || 0) + split.driverEarnings,
            earningsWeek: (prev.earningsWeek || 0) + split.driverEarnings,
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
                earningsToday: d.earningsToday + split.driverEarnings,
                earningsWeek: d.earningsWeek + split.driverEarnings,
              }
            : d
        )
      );
    }

    triggerPush(
      '🏁 Viagem Finalizada!',
      isCash
        ? `Corrida em dinheiro (R$ ${activeRide.price.toFixed(2).replace('.', ',')}) finalizada! Avalie seu condutor.`
        : `Total de R$ ${split.driverEarnings.toFixed(2).replace('.', ',')} (${split.driverSharePercent}%) creditado ao motorista! Avalie seu condutor.`,
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

  // Confirm & Cancel active ride (para tudo, atualiza status 'cancelada' no Supabase e volta para o mapa limpo)
  const handleConfirmCancelRide = async () => {
    if (isCancellingRide) return;
    setIsCancellingRide(true);
    try {
      cancelVoiceSpeech();
      let targetRideId = activeRide?.id ? String(activeRide.id) : '';
      if ((!targetRideId || !/^\d+$/.test(targetRideId)) && currentUser) {
        try {
          const userRides = await getCorridasSupabase(currentUser);
          const match =
            (activeRide?.confirmationCode
              ? userRides.find((r) => r.confirmationCode === activeRide.confirmationCode)
              : null) || userRides[0];
          if (match?.id && /^\d+$/.test(String(match.id))) {
            targetRideId = String(match.id);
          }
        } catch {}
      }

      if (targetRideId && /^\d+$/.test(targetRideId)) {
        await updateCorridaStatusSupabase(targetRideId, 'cancelada').catch(() => false);
      }

      setRidesHistory((prev) =>
        prev.map((r) =>
          (targetRideId && String(r.id) === targetRideId) ||
          (activeRide?.confirmationCode && r.confirmationCode === activeRide.confirmationCode)
            ? { ...r, status: 'cancelada' }
            : r
        )
      );
      setActiveRide(null);
      setIsFullMapOpen(false);
      setDriverPosition(undefined);
      setCompletedRideForRating(null);
      setIsRatingModalOpen(false);
      setIsCancelConfirmOpen(false);
      setActiveTab('rides');
      triggerPush(
        '❌ Corrida Cancelada',
        'A corrida foi cancelada. Nenhum valor adicional foi cobrado.',
        'system'
      );
    } finally {
      setIsCancellingRide(false);
    }
  };

  const handleRequestCancelRide = () => {
    setIsCancelConfirmOpen(true);
  };

  // Delivery Flash order -> direciona para pagamento obrigatório antes de chamar motoboy
  const handleStartDelivery = (ride: Ride) => {
    const isCash = ride.paymentMethod === 'money' || ride.paymentMethod === 'dinheiro';
    const isAsaasConfirmed =
      ride.asaasStatus === 'RECEIVED' || ride.asaasStatus === 'CONFIRMED';
    if (!isCash && (!isAsaasConfirmed || ride.paymentStatus !== 'paid')) {
      setPickup(ride.pickup);
      setDestination(ride.destination);
      setSelectedCategory('moto_entrega');
      setActiveTab('rides');
      triggerPush(
        'Pague primeiro para chamar o motorista',
        'Conclua o pagamento no Asaas (PIX/Cartão) ou escolha Dinheiro na aba CORRIDA antes de chamar o motoboy.',
        'ride'
      );
      return;
    }
    handleStartRide(ride);
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
    const effectiveApproval = newDriver.approvalStatus || 'pendente';
    const isApproved = effectiveApproval === 'aprovado';
    const normalizedDriver: Driver = {
      ...newDriver,
      approvalStatus: effectiveApproval,
      categoryConfigured: isConfigured,
      status: !isConfigured
        ? 'offline'
        : isApproved
        ? newDriver.status === 'online'
          ? 'online'
          : 'offline'
        : effectiveApproval === 'reprovado'
        ? 'offline'
        : 'pending_approval',
    };
    setDrivers((prev) => [
      normalizedDriver,
      ...prev.filter(
        (d) =>
          d.id !== normalizedDriver.id &&
          normalizeEmail(d.email) !== normalizeEmail(normalizedDriver.email)
      ),
    ]);
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
      !isConfigured
        ? 'Escolha sua categoria no app'
        : isApproved
        ? '🎉 Bem-vindo à RACE!'
        : '⏳ Cadastro em análise pelo ADM',
      !isConfigured
        ? `Olá ${normalizedDriver.name}! Escolha sua categoria e informe os dados do veículo e documentos.`
        : isApproved
        ? `Cadastro de ${normalizedDriver.name} aprovado! ${getDriverEarningsStatusText(isDriverInLaunchZeroFeePromo())}.`
        : `Recebemos sua CNH (frente e verso), CRLV e dados do veículo. Assim que o ADM aprovar, você poderá ficar ONLINE.`,
      isApproved ? 'financial' : 'system'
    );
  };

  const handleUpdateDriver = (updated: Driver) => {
    const isConfigured =
      updated.categoryConfigured !== false &&
      Boolean(updated.vehiclePlate?.trim() && updated.vehicleModel?.trim());
    const effectiveApproval = updated.approvalStatus || 'pendente';
    const isApproved = effectiveApproval === 'aprovado';
    const safeUpdated: Driver = {
      ...updated,
      approvalStatus: effectiveApproval,
      categoryConfigured: isConfigured,
      status: !isConfigured
        ? 'offline'
        : isApproved
        ? updated.status
        : effectiveApproval === 'reprovado'
        ? 'offline'
        : 'pending_approval',
    };
    setCurrentDriver(safeUpdated);
    setDrivers((prev) => [
      safeUpdated,
      ...prev.filter(
        (d) =>
          d.id !== safeUpdated.id &&
          normalizeEmail(d.email) !== normalizeEmail(safeUpdated.email)
      ),
    ]);

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
        if (d.approvalStatus !== 'aprovado') {
          return {
            ...d,
            status: d.approvalStatus === 'reprovado' ? 'offline' : 'pending_approval',
          };
        }
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
      `${getDriverEarningsStatusText(isDriverInLaunchZeroFeePromo())}. Sem taxa semanal ou mensalidade!`,
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
          ? {
              ...d,
              approvalStatus: 'aprovado',
              rejectionReason: '',
              approvedAt: new Date().toISOString(),
              cnhVerified: true,
              vehicleVerified: true,
              weeklyPlanActive: true,
              status: d.status === 'pending_approval' ? 'offline' : d.status,
            }
          : d
      )
    );
    triggerPush('🛡️ Auditoria Aprovada', 'Motorista aprovado com sucesso! Já pode ficar ONLINE.', 'safety');
  };

  const handleApproveDriverApplication = (email: string, updatedDriver?: Driver) => {
    const cleanEmail = normalizeEmail(email);
    setDrivers((prev) => {
      const exists = prev.some((d) => normalizeEmail(d.email) === cleanEmail);
      if (!exists && updatedDriver) {
        return [updatedDriver, ...prev];
      }
      return prev.map((d) =>
        normalizeEmail(d.email) === cleanEmail
          ? {
              ...d,
              ...(updatedDriver || {}),
              approvalStatus: 'aprovado',
              rejectionReason: '',
              approvedAt: updatedDriver?.approvedAt || new Date().toISOString(),
              cnhVerified: true,
              vehicleVerified: true,
              status: d.status === 'online' ? 'online' : 'offline',
            }
          : d
      );
    });
    if (normalizeEmail(currentDriver.email) === cleanEmail) {
      setCurrentDriver((prev) => ({
        ...prev,
        ...(updatedDriver || {}),
        approvalStatus: 'aprovado',
        rejectionReason: '',
        cnhVerified: true,
        vehicleVerified: true,
        status: prev.status === 'online' ? 'online' : 'offline',
      }));
    }
    triggerPush('🛡️ Motorista Aprovado', `Cadastro de ${email} aprovado! Condutor liberado para ficar ONLINE.`, 'safety');
  };

  const handleRejectDriverApplication = (email: string, reason: string) => {
    const cleanEmail = normalizeEmail(email);
    setDrivers((prev) =>
      prev.map((d) =>
        normalizeEmail(d.email) === cleanEmail
          ? {
              ...d,
              approvalStatus: 'reprovado',
              rejectionReason: reason,
              cnhVerified: false,
              vehicleVerified: false,
              status: 'offline',
            }
          : d
      )
    );
    if (normalizeEmail(currentDriver.email) === cleanEmail) {
      setCurrentDriver((prev) => ({
        ...prev,
        approvalStatus: 'reprovado',
        rejectionReason: reason,
        cnhVerified: false,
        vehicleVerified: false,
        status: 'offline',
      }));
    }
    triggerPush('Cadastro Reprovado', `O cadastro de ${email} foi marcado como reprovado.`, 'safety');
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
      `${driver.name} está ONLINE! ${getDriverEarningsStatusText(isDriverInLaunchZeroFeePromo())}.`,
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
    const cleanEmail = normalizeEmail(email);
    setDrivers((prev) => prev.filter((d) => String(d.id) !== String(driverId) && (!cleanEmail || normalizeEmail(d.email) !== cleanEmail)));
    setRidesHistory((prev) =>
      prev.filter(
        (r) =>
          String(r.driver?.id || '') !== String(driverId) &&
          (!cleanEmail || normalizeEmail(r.driver?.email || '') !== cleanEmail)
      )
    );
    triggerPush('🗑️ Cadastro Removido', `O cadastro do motorista ${email} foi excluído com sucesso.`, 'system');
  };

  // Admin Management: Remover Passageiro Individual
  const handleRemovePassenger = (passengerId: string, email: string) => {
    const cleanEmail = normalizeEmail(email);
    setPassengers((prev) => prev.filter((p) => String(p.id) !== String(passengerId) && (!cleanEmail || normalizeEmail(p.email) !== cleanEmail)));
    setRidesHistory((prev) =>
      prev.filter(
        (r) =>
          String(r.passengerId || '') !== String(passengerId) &&
          (!cleanEmail || normalizeEmail(r.passengerEmail || '') !== cleanEmail)
      )
    );
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

  const loadRoleScopedDataAfterLogin = async (user: AppUser) => {
    try {
      if (isAppUserAdmin(user)) {
        const [allDrivers, onlineRpcDrivers, allPassengers, appsMap] = await Promise.all([
          getAllDriversFromSupabase().catch(() => []),
          getOnlineDriversFromSupabase().catch(() => []),
          getAllPassengersFromSupabase().catch(() => []),
          fetchDriverApplicationsSupabase().catch(() => ({})),
        ]);
        const mergedMap = new Map<string, Driver>();
        [...allDrivers, ...onlineRpcDrivers].forEach((drv) => {
          const emailKey = (drv.email || '').trim().toLowerCase();
          const hydrated = mergeDriverWithApplication(drv, emailKey ? (appsMap as Record<string, any>)[emailKey] : undefined);
          const k = hydrated.id || hydrated.email || `${hydrated.name}-${hydrated.vehiclePlate}`;
          if (k) mergedMap.set(k, hydrated);
        });
        setDrivers(Array.from(mergedMap.values()));
        setPassengers(allPassengers);
      } else {
        setPassengers([]);
        const onlineDrivers = await getOnlineDriversFromSupabase().catch(() => []);
        setDrivers(
          onlineDrivers.filter((d) => d.status === 'online' && d.approvalStatus === 'aprovado')
        );
      }
    } catch {}
  };

  // Auth success handler: direciona cada perfil direto para sua tela oficial com isolamento por login
  const handleAuthSuccess = (user: AppUser, driver?: Driver) => {
    clearWalletMemoryCache();
    clearReviewsCache();
    setRidesHistory([]);
    setActiveRide(null);
    setIsCancelConfirmOpen(false);
    setIsCancellingRide(false);
    setCompletedRideForRating(null);
    setIsRatingModalOpen(false);
    setIsFullMapOpen(false);
    setDriverPosition(undefined);
    setPickup(null);
    setDestination(null);
    setPassengers([]);
    setDrivers([]);
    setPassengerDebt({ debtAmount: 0, isBlocked: false, unpaidRideIds: [] });

    setCurrentUser(user);
    saveSessionUser(user);
    setHasSearchedRoute(false);
    setShowPostAuthSplash(true);
    if (driver) {
      const isConfigured =
        driver.categoryConfigured !== false &&
        Boolean(driver.vehiclePlate?.trim() && driver.vehicleModel?.trim()) &&
        driver.requirementsConfirmed === true &&
        driver.documentosAceitos !== false;
      const isApproved = driver.approvalStatus === 'aprovado';
      const nextDrv: Driver = {
        ...driver,
        approvalStatus: driver.approvalStatus || 'pendente',
        categoryConfigured: isConfigured,
        status:
          isConfigured && isApproved && driver.status === 'online'
            ? 'online'
            : isApproved
            ? 'offline'
            : driver.approvalStatus === 'reprovado'
            ? 'offline'
            : 'pending_approval',
      };
      setCurrentDriver(nextDrv);
      if (isConfigured && isApproved && nextDrv.status === 'online') {
        captureAndSyncDriverGps(nextDrv, 'online');
      }
    } else {
      setCurrentDriver(DEFAULT_NEW_DRIVER);
    }
    const isAdminUser = isAppUserAdmin(user);
    const isDriverUser =
      !isAdminUser &&
      (isAppUserDriver(user) || Boolean(driver) || Boolean(user.driverData));
    setActiveTab(isAdminUser ? 'admin' : isDriverUser ? 'driver_portal' : 'rides');
    loadRoleScopedDataAfterLogin(user);
    const roleName = isAdminUser
      ? 'Administrador ADM'
      : user.role === 'driver' || user.role === 'motoboy'
      ? 'Motorista/Motoboy Parceiro'
      : 'Passageiro';
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
    signOutSupabase().catch(() => {});
    saveSessionUser(null);
    purgeLegacyTestLocalStorage(false);
    clearWalletMemoryCache();
    clearReviewsCache();
    setCurrentUser(null);
    setShowPostAuthSplash(false);
    setHasSearchedRoute(false);
    setPickup(null);
    setDestination(null);
    setCurrentDriver(DEFAULT_NEW_DRIVER);
    setDrivers([]);
    setPassengers([]);
    setRidesHistory([]);
    setActiveRide(null);
    setIsCancelConfirmOpen(false);
    setIsCancellingRide(false);
    setCompletedRideForRating(null);
    setIsRatingModalOpen(false);
    setIsFullMapOpen(false);
    setDriverPosition(undefined);
    setPassengerDebt({ debtAmount: 0, isBlocked: false, unpaidRideIds: [] });
    setActiveTab('rides');
    triggerPush('Sessão Encerrada', 'Você saiu da sua conta RACE.', 'system');
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;

  // Reusable real-time GPS map component instance (SOMENTE motoristas APROVADOS e ONLINE com categoria configurada)
  const mapElement = (
    <MapRealtime
      drivers={drivers.filter(
        (d) =>
          d.status === 'online' &&
          d.approvalStatus === 'aprovado' &&
          d.categoryConfigured !== false &&
          d.documentosAceitos !== false
      )}
      pickup={pickup}
      destination={destination}
      activeDriver={activeRide?.driver || null}
      rideStatus={activeRide?.status || 'idle'}
      driverPosition={driverPosition}
      onMapClick={handleMapClick}
      selectionMode={mapSelectionMode}
    />
  );

  if (isPrivacyPageOpen) {
    return <PrivacyPolicyPage onBack={closePrivacyPage} />;
  }

  // Tela preta Splash com logo RACE vermelho/laranja grande (90px) por 3 segundos toda vez que entrar no app
  if (showStartupSplash || showPostAuthSplash) {
    return (
      <SplashScreen
        durationMs={3000}
        onComplete={() => {
          setShowStartupSplash(false);
          setShowPostAuthSplash(false);
        }}
      />
    );
  }

  if (passwordRecoveryEmail !== null) {
    return (
      <div className="h-dvh bg-[#000000] text-white flex items-center justify-center p-4 overflow-y-auto overscroll-contain">
        <ForgotPasswordModal
          isOpen={true}
          recoveryEmail={passwordRecoveryEmail}
          initialIdentifier={passwordRecoveryEmail}
          onClose={() => {
            setPasswordRecoveryEmail(null);
            try {
              if (window.location.hash.includes('type=recovery') || window.location.hash.includes('access_token=')) {
                window.history.replaceState({}, '', `${import.meta.env.BASE_URL}`);
              }
            } catch {}
          }}
          onPasswordResetSuccess={(_id, msg) => {
            setPasswordRecoveryEmail(null);
            try {
              window.history.replaceState({}, '', `${import.meta.env.BASE_URL}`);
            } catch {}
            setLoginSuccessBanner(msg || 'Senha alterada com sucesso!');
          }}
        />
      </div>
    );
  }

  // 1. Quando o app abre deslogado, NÃO mostrar PassengerRideView, Header ou BottomNav.
  // Mostrar tela de login de motorista full-screen com design preto e laranja igual ao print.
  if (!currentUser) {
    return (
      <DriverLoginScreen
        drivers={[]}
        passengers={[]}
        onOpenPrivacyPage={openPrivacyPage}
        onLoginSuccess={(user, driver) => {
          clearWalletMemoryCache();
          clearReviewsCache();
          setRidesHistory([]);
          setActiveRide(null);
          setCompletedRideForRating(null);
          setIsRatingModalOpen(false);
          setIsFullMapOpen(false);
          setDriverPosition(undefined);
          setPickup(null);
          setDestination(null);
          setPassengers([]);
          setDrivers([]);
          setPassengerDebt({ debtAmount: 0, isBlocked: false, unpaidRideIds: [] });

          setCurrentUser(user);
          saveSessionUser(user);
          setHasSearchedRoute(false);
          setShowPostAuthSplash(true);
          loadRoleScopedDataAfterLogin(user);

          // Se for Administrador (tipo = ADM / admin / Administrador ou admin@race.com.br)
          if (isAppUserAdmin(user)) {
            setCurrentDriver(DEFAULT_NEW_DRIVER);
            setActiveTab('admin');
            setLoginSuccessBanner(
              'Bem-vindo, Administrador Geral! Painel de controle e auditoria liberados.'
            );
            return;
          }

          const loginTipoLower = String(user.tipo || '').toLowerCase().trim();
          const isDriverOrMotoboy = isAppUserDriver(user);

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
            const hasVehicleFields =
              targetDriver.categoryConfigured !== false &&
              Boolean(targetDriver.vehiclePlate?.trim() && targetDriver.vehicleModel?.trim());
            const isConfigured =
              hasVehicleFields &&
              targetDriver.requirementsConfirmed === true &&
              targetDriver.documentosAceitos !== false;
            const isApproved = targetDriver.approvalStatus === 'aprovado';
            const currentBal = getDriverBalance(targetDriver.id, targetDriver.walletBalance || 0);
            const driverWithBal: Driver = {
              ...targetDriver,
              approvalStatus: targetDriver.approvalStatus || 'pendente',
              categoryConfigured: hasVehicleFields,
              requirementsConfirmed: targetDriver.requirementsConfirmed === true,
              walletBalance: currentBal,
              weeklyPlanActive: isConfigured,
              codigoIndicacao: targetDriver.codigoIndicacao || user.codigoIndicacao || undefined,
              status:
                isConfigured && isApproved && targetDriver.status === 'online'
                  ? 'online'
                  : isApproved
                  ? 'offline'
                  : targetDriver.approvalStatus === 'reprovado'
                  ? 'offline'
                  : 'pending_approval',
            };
            setCurrentDriver(driverWithBal);
            if (isConfigured && isApproved && driverWithBal.status === 'online') {
              captureAndSyncDriverGps(driverWithBal, 'online');
            }
            setActiveTab('driver_portal');
            setLoginSuccessBanner(
              !isConfigured
                ? `Bem-vindo(a), ${targetDriver.name}! Escolha sua modalidade, informe os dados do veículo e envie as fotos da CNH (frente e verso) e CRLV.`
                : !isApproved
                ? `Bem-vindo(a), ${targetDriver.name}! Seu cadastro está PENDENTE de aprovação do ADM. Assim que aprovado, você poderá ficar ONLINE.`
                : `Bem-vindo(a), ${targetDriver.name}! Central de Corridas pronta. ${getDriverEarningsStatusText(isDriverInLaunchZeroFeePromo())}!`
            );
          } else {
            // Passageiro: vai direto para tela de pedir corrida com mapa
            setCurrentDriver(DEFAULT_NEW_DRIVER);
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

  const isUserDriver = Boolean(
    currentUser && (isAppUserDriver(currentUser) || Boolean(currentUser.driverData))
  );

  const isDriverCategoryConfigured = Boolean(
    currentDriver.categoryConfigured !== false &&
    currentDriver.vehiclePlate?.trim() &&
    currentDriver.vehicleModel?.trim() &&
    currentDriver.requirementsConfirmed === true &&
    currentDriver.documentosAceitos !== false
  );

  // TELA FULLSCREEN OBRIGATÓRIA DE ESCOLHA DE MODALIDADE E CONFIRMAÇÃO DE EXIGÊNCIAS
  // Não mostra tela de passageiro, Header ou BottomNav até concluir o preenchimento e confirmação das exigências.
  if (isUserDriver && !isDriverCategoryConfigured) {
    return (
      <div className="h-dvh bg-[#0a0a0a] text-white px-4 py-6 sm:py-10 overflow-y-auto overscroll-contain">
        <DriverWorkSelectionView
          currentUser={currentUser}
          isMandatorySetup={true}
          onLogout={handleLogout}
          onOpenPrivacyPage={openPrivacyPage}
          onCompleteDriverRegister={(newDriver) => {
            const isApproved = newDriver.approvalStatus === 'aprovado';
            const acceptedAt = newDriver.dataAceite || new Date().toISOString();
            const configuredDriver: Driver = {
              ...newDriver,
              approvalStatus: newDriver.approvalStatus || 'pendente',
              categoryConfigured: true,
              requirementsConfirmed: true,
              documentosAceitos: true,
              dataAceite: acceptedAt,
              status: isApproved ? 'offline' : 'pending_approval',
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
            setActiveTab('driver_portal');
            setLoginSuccessBanner(
              isApproved
                ? `Modalidade configurada! Você já pode ficar ONLINE e receber corridas na RACE.`
                : `Cadastro enviado! Seus documentos (CNH frente/verso e CRLV) estão com status PENDENTE aguardando aprovação do ADM.`
            );
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-dvh bg-white text-slate-900 flex flex-col font-sans selection:bg-slate-900 selection:text-white w-full max-w-[100vw] overflow-hidden overscroll-none box-border">
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
            : isAppUserAdmin(currentUser)
            ? 'admin'
            : currentUser?.role === 'motoboy' || currentUser?.tipo === 'motoboy'
            ? 'driver'
            : activeTab === 'driver_portal'
            ? 'driver'
            : 'passenger'
        }
        onChangeRole={(role) => {
          if (isAppUserAdmin(currentUser)) {
            if (role === 'driver') {
              triggerPush('Acesso restrito', ADMIN_DRIVER_BLOCK_MESSAGE, 'ride');
            }
            setActiveTab('admin');
            return;
          }
          if (role === 'passenger') setActiveTab('rides');
          if (role === 'driver') setActiveTab('driver_portal');
          if (role === 'admin') {
            if (isAppUserAdmin(currentUser)) {
              setActiveTab('admin');
            }
          }
        }}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Layout Container - Scroll isolado por aba para não acionar pull-to-refresh nem perder posição */}
      <main className="flex-1 min-h-0 max-w-4xl w-full max-w-[100vw] mx-auto overflow-hidden box-border relative">
        {/* 1. Corridas (Passageiro / Condutor) */}
        <div {...getTabPanelProps('rides')}>
          <PassengerRideView
            onStartRide={handleStartRide}
            activeRide={activeRide}
            onCancelRide={handleRequestCancelRide}
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
            passengerDebt={passengerDebt}
            onClearPassengerDebt={handleClearPassengerDebt}
            selectedCategoryProp={selectedCategory}
            onCategoryChange={setSelectedCategory}
            paymentMethodProp={selectedPaymentMethod}
            onPaymentMethodChange={setSelectedPaymentMethod}
            optionsLaunchNonce={optionsLaunchNonce}
            hasSearchedRoute={hasSearchedRoute}
            onRouteSearched={setHasSearchedRoute}
            onOpenFullMap={() => {
              const isRideAuthorized = Boolean(
                activeRide &&
                (activeRide.paymentStatus === 'paid' ||
                  activeRide.paymentMethod === 'money' ||
                  activeRide.paymentMethod === 'dinheiro')
              );
              if (!isRideAuthorized) {
                triggerPush(
                  'Pague o PIX primeiro, estamos aguardando confirmação do Asaas',
                  'Preencha seu endereço de início e chegada com número, escolha a categoria e aguarde o Asaas confirmar o pagamento (ou escolha Dinheiro) para liberar o mapa.',
                  'ride'
                );
                return;
              }
              setIsFullMapOpen(true);
            }}
          />
        </div>

        {/* 2. Entregas Flash (Motoboy para entrega) */}
        <div {...getTabPanelProps('delivery')}>
          <DeliveryFlashView
            onStartDelivery={handleStartDelivery}
            availableMotoboys={drivers.filter((d) => d.category === 'moto_entrega')}
            pickup={pickup}
            destination={destination}
            setPickup={setPickup}
            setDestination={setDestination}
          />
        </div>

        {/* 3. Condutor & Cadastro (85% para você, 15% Race - Sem mensalidade) */}
        <div {...getTabPanelProps('driver_portal')}>
          {isAppUserAdmin(currentUser) ? (
            <div className="text-center py-12 p-6 bg-zinc-950 border-2 border-[#ff6a00] rounded-3xl text-white space-y-3 shadow-xl">
              <AlertTriangle className="w-12 h-12 text-[#ff6a00] mx-auto" />
              <h3 className="text-xl font-heading font-black text-white">Acesso Bloqueado</h3>
              <p className="text-sm text-zinc-200 max-w-md mx-auto font-bold">
                {ADMIN_DRIVER_BLOCK_MESSAGE}
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="mt-4 px-6 py-2.5 bg-[#ff6a00] hover:bg-[#e05e00] text-white font-heading font-black text-sm rounded-xl cursor-pointer"
              >
                Voltar para o Painel ADM
              </button>
            </div>
          ) : isUserDriver ? (
            <DriverPartnerPortal
              currentDriver={currentDriver}
              currentUser={currentUser}
              rides={ridesHistory}
              activeRide={activeRide}
              onAcceptIncomingRide={(ride) => {
                const resolvedDriver: Driver = {
                  ...currentDriver,
                  avatar: currentDriver.avatar || currentUser?.avatar || '',
                };
                const acceptedObj: Ride = { ...ride, driver: resolvedDriver, status: 'accepted' };
                setActiveRide(acceptedObj);
                if (ride.id && /^\d+$/.test(String(ride.id))) {
                  acceptCorridaSupabase(ride.id, resolvedDriver).catch(() => {});
                }
              }}
              onUpdateDriver={handleUpdateDriver}
              onUpdateUserProfile={(updatedUser) => {
                setCurrentUser(updatedUser);
                saveSessionUser(updatedUser);
              }}
              onRegisterDriver={(newDriver) => {
                handleRegisterDriver(newDriver);
              }}
              onLoginDriverSuccess={(user, driver) => {
                setCurrentUser(user);
                setShowPostAuthSplash(true);
                if (driver) {
                  const isConfigured =
                    driver.categoryConfigured !== false &&
                    Boolean(driver.vehiclePlate?.trim() && driver.vehicleModel?.trim()) &&
                    driver.requirementsConfirmed === true &&
                    driver.documentosAceitos !== false;
                  const isApproved = driver.approvalStatus === 'aprovado';
                  const nextDrv: Driver = {
                    ...driver,
                    approvalStatus: driver.approvalStatus || 'pendente',
                    categoryConfigured: isConfigured,
                    status:
                      isConfigured && isApproved && driver.status === 'online'
                        ? 'online'
                        : isApproved
                        ? 'offline'
                        : driver.approvalStatus === 'reprovado'
                        ? 'offline'
                        : 'pending_approval',
                  };
                  setCurrentDriver(nextDrv);
                  if (isConfigured && isApproved && nextDrv.status === 'online') {
                    captureAndSyncDriverGps(nextDrv, 'online');
                  }
                }
                saveSessionUser(user);
                setLoginSuccessBanner(
                  `Bem-vindo(a), ${user.name}! ${getDriverEarningsStatusText(isDriverInLaunchZeroFeePromo())}.`
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
              onOpenPrivacyPage={openPrivacyPage}
              onRenewWeeklyPlan={handleRenewWeeklyPlan}
              onTriggerToast={(title, msg, type) => triggerPush(title, msg, type || 'financial')}
            />
          ) : (
            <DriverWorkSelectionView
              currentUser={currentUser!}
              onOpenPrivacyPage={openPrivacyPage}
              onCompleteDriverRegister={(newDriver) => {
                const isApproved = newDriver.approvalStatus === 'aprovado';
                const acceptedAt = newDriver.dataAceite || new Date().toISOString();
                const pendingDriver: Driver = {
                  ...newDriver,
                  approvalStatus: newDriver.approvalStatus || 'pendente',
                  documentosAceitos: true,
                  dataAceite: acceptedAt,
                  status: isApproved ? newDriver.status : 'pending_approval',
                };
                handleRegisterDriver(pendingDriver);
                const isMoto = pendingDriver.category === 'moto_entrega' || pendingDriver.category === 'moto_passageiro';
                const updatedUser: AppUser = {
                  ...currentUser!,
                  role: isMoto ? 'motoboy' : 'driver',
                  tipo: pendingDriver.category === 'economica' ? 'motorista_economico' :
                        pendingDriver.category === 'confort' ? 'motorista_confort' :
                        pendingDriver.category === 'moto_passageiro' ? 'motoboy_passageiro' : 'motoboy_entregas',
                  placa: pendingDriver.vehiclePlate,
                  driverData: pendingDriver,
                };
                setCurrentUser(updatedUser);
                setCurrentDriver(pendingDriver);
                saveSessionUser(updatedUser);
                setLoginSuccessBanner(
                  isApproved
                    ? `Parabéns, ${pendingDriver.name}! Cadastro de motorista aprovado!`
                    : `Cadastro enviado! Seus documentos estão PENDENTES de aprovação do ADM. Você não ficará online até ser aprovado.`
                );
              }}
              onBackToRides={() => setActiveTab('rides')}
              onRenewWeeklyPlan={handleRenewWeeklyPlan}
            />
          )}
        </div>

        {/* 4. Histórico Completo & Recibos - APENAS dados do próprio usuário no Supabase */}
        <div {...getTabPanelProps('history')}>
          <RideHistoryView
            rides={ridesHistory}
            activeRide={activeRide}
            isLoading={isLoadingHistory}
            onRefresh={() => refreshRidesHistory(currentUser)}
          />
        </div>

        {/* 5. Opções de Categoria para Passageiro (4 Categorias + Forma de Pagamento) */}
        <div {...getTabPanelProps('passenger_options')}>
          <PassengerOptionsView
            selectedCategory={selectedCategory}
            onSelectCategory={(cat) => setSelectedCategory(cat)}
            selectedPaymentMethod={selectedPaymentMethod}
            onSelectPaymentMethod={(method) => setSelectedPaymentMethod(method)}
            pickup={pickup}
            destination={destination}
            hasSearchedRoute={hasSearchedRoute}
            availableDrivers={drivers}
            onNavigateToRides={(chosenCategory) => {
              if (chosenCategory) {
                setSelectedCategory(chosenCategory);
              }
              setOptionsLaunchNonce((n) => n + 1);
              setActiveTab('rides');
            }}
          />
        </div>

        {/* 6. Conta & Perfil do Passageiro (Nome, E-mail, WhatsApp, Login, Endereço com Meu GPS, Sair) */}
        <div {...getTabPanelProps('passenger_account')}>
          <PassengerAccountView
            currentUser={currentUser}
            currentAddress={pickup?.address}
            pickup={pickup}
            onUpdateAddress={(addr, lat, lng) => setPickup({ address: addr, lat, lng })}
            onLogout={handleLogout}
            onNavigateToHistory={() => setActiveTab('history')}
            onOpenSupport={() => setIsSupportOpen(true)}
            onOpenShare={() => setIsShareOpen(true)}
            onUpdateAvatar={(avatarUrlOrBase64) => {
              setCurrentUser((prev) => {
                if (!prev) return null;
                const next: AppUser = {
                  ...prev,
                  avatar: avatarUrlOrBase64,
                  driverData: prev.driverData
                    ? { ...prev.driverData, avatar: avatarUrlOrBase64 }
                    : prev.driverData,
                };
                saveSessionUser(next);
                return next;
              });
              setCurrentDriver((prev) =>
                prev && currentUser && normalizeEmail(prev.email) === normalizeEmail(currentUser.email)
                  ? { ...prev, avatar: avatarUrlOrBase64 }
                  : prev
              );
              setDrivers((prev) =>
                prev.map((d) =>
                  currentUser &&
                  (d.id === currentUser.id || normalizeEmail(d.email) === normalizeEmail(currentUser.email))
                    ? { ...d, avatar: avatarUrlOrBase64 }
                    : d
                )
              );
            }}
            onUpdateProfile={(updatedUser) => {
              setCurrentUser(updatedUser);
              saveSessionUser(updatedUser);
              if (updatedUser.avatar) {
                setCurrentDriver((prev) =>
                  prev && normalizeEmail(prev.email) === normalizeEmail(updatedUser.email)
                    ? {
                        ...prev,
                        name: updatedUser.name,
                        phone: updatedUser.phone || prev.phone,
                        avatar: updatedUser.avatar || prev.avatar,
                      }
                    : prev
                );
                setDrivers((prev) =>
                  prev.map((d) =>
                    d.id === updatedUser.id || normalizeEmail(d.email) === normalizeEmail(updatedUser.email)
                      ? { ...d, name: updatedUser.name, avatar: updatedUser.avatar || d.avatar }
                      : d
                  )
                );
              }
            }}
            onOpenPrivacyPage={openPrivacyPage}
            onWantToBeDriver={() => {
              if (isAppUserAdmin(currentUser)) {
                triggerPush('Acesso restrito', ADMIN_DRIVER_BLOCK_MESSAGE, 'ride');
                setActiveTab('admin');
                return;
              }
              setActiveTab('driver_portal');
            }}
          />
        </div>

        {/* 7. Painel Administrativo Master - ADM */}
        <div {...getTabPanelProps('admin')}>
          {isAppUserAdmin(currentUser) ? (
            <AdminDashboard
              currentUser={currentUser}
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
              onApproveDriverApplication={handleApproveDriverApplication}
              onRejectDriverApplication={handleRejectDriverApplication}
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
          )}
        </div>
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
        currentLocation={
          activeRide?.pickup?.address ||
          pickup?.address ||
          'Av. Presidente Vargas, 1250 - Centro, Indaiatuba-SP'
        }
        currentLat={activeRide?.pickup?.lat ?? pickup?.lat}
        currentLng={activeRide?.pickup?.lng ?? pickup?.lng}
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
        onOpenPrivacyPage={openPrivacyPage}
        initialRole={activeTab === 'driver_portal' ? 'driver' : 'passenger'}
      />


      {/* Ergonomic Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => {
          if (isAppUserAdmin(currentUser)) {
            if (tab === 'driver_portal') {
              triggerPush('Acesso restrito', ADMIN_DRIVER_BLOCK_MESSAGE, 'ride');
              setActiveTab('admin');
              return;
            }
            if (tab !== 'admin' && tab !== 'passenger_account') {
              setActiveTab('admin');
              return;
            }
          }
          if (tab === 'admin') {
            if (!isAppUserAdmin(currentUser)) return;
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
            if (
              d.status !== 'online' ||
              d.approvalStatus !== 'aprovado' ||
              d.categoryConfigured === false ||
              d.documentosAceitos === false
            )
              return false;
            return normalizeRideCategory(d.category) === targetRideCat;
          });
          return (
            <FullMapView
              onClose={() => setIsFullMapOpen(false)}
              pickup={pickup}
              destination={destination}
              activeDriver={activeRide.driver ?? null}
              activeRide={activeRide}
              currentUserAvatar={currentUser?.avatar}
              currentUserName={currentUser?.name}
              onlineDrivers={matchingOnlineDrivers}
              onCompleteRide={handleCompleteRide}
              onCancelRide={handleRequestCancelRide}
              onUpdateDriverPosition={(pos) => {
                setDriverPosition((prev) => {
                  if (prev && prev.lat === pos.lat && prev.lng === pos.lng) return prev;
                  return pos;
                });
              }}
            />
          );
        })()}

      {/* Botão Fixo CANCELAR CORRIDA: enquanto procura no mapa tela cheia ou fora do mapa tela cheia */}
      {typeof document !== 'undefined' &&
        Boolean(currentUser) &&
        isRideActivePhase &&
        !isRatingModalOpen &&
        (isFullMapOpen ? isSearchingActiveRide : activeTab !== 'driver_portal') &&
        createPortal(
          <button
            type="button"
            onClick={handleRequestCancelRide}
            style={{
              position: 'fixed',
              bottom: isFullMapOpen ? '20px' : '80px',
              left: '16px',
              right: '16px',
              zIndex: 999,
              height: '52px',
            }}
            className="bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-heading font-black text-base uppercase tracking-wider rounded-2xl shadow-[0_8px_24px_rgba(220,38,38,0.45)] border-2 border-red-400 flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <XCircle className="w-5 h-5 shrink-0" />
            <span>CANCELAR CORRIDA</span>
          </button>,
          document.body
        )}

      {/* Modal de Confirmação de Cancelamento (Sim / Não) */}
      {typeof document !== 'undefined' &&
        isCancelConfirmOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
            style={{ zIndex: 1100 }}
          >
            <div className="w-full max-w-sm bg-white border-2 border-red-500 rounded-3xl p-6 shadow-2xl space-y-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-heading font-black text-lg text-slate-950">
                  Tem certeza que deseja cancelar?
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  Ao confirmar, a corrida será cancelada e você voltará para o mapa limpo.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isCancellingRide}
                  onClick={() => setIsCancelConfirmOpen(false)}
                  className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-heading font-black text-sm uppercase cursor-pointer disabled:opacity-60"
                >
                  Não
                </button>
                <button
                  type="button"
                  disabled={isCancellingRide}
                  onClick={handleConfirmCancelRide}
                  className="py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-heading font-black text-sm uppercase cursor-pointer shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isCancellingRide ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Sim</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
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
