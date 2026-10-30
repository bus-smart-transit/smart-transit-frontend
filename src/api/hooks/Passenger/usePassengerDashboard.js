import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../useAuth';
import PassengerService from '../../PassengerService/PassengerService';
import { initFcmAndGetToken } from '../../../services/fcmService';
import { openPrintWindow } from '../../../utils/qr';

const PROTECTED_TABS = new Set(['tickets', 'rewards', 'transactions', 'profile']);
const TICKET_QR_CACHE_KEY = 'smart_transit_ticket_qr_cache_v1';
const QR_SUCCESS_TTL_MS = 5 * 60 * 1000;
const QR_FAILURE_TTL_MS = 45 * 1000;
const HISTORY_PAGE_SIZE = 50;

const readHistoryPage = (response) => {
  const payload = response?.data ?? response;
  if (Array.isArray(payload)) return { items: payload, meta: null };
  const meta = payload?.meta ?? (payload?.current_page ? payload : null);
  return { items: Array.isArray(payload?.data) ? payload.data : [], meta };
};

const readSessionCache = (key) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeSessionCache = (key, value) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore cache persistence failures.
  }
};

const toDate = (value) => {
  if (!value) return null;
  const str = String(value);
  // Date-only strings (YYYY-MM-DD) are parsed as UTC midnight by spec,
  // shifting the display by the user's UTC offset. Parse as local time instead.
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(str) ? str + 'T00:00' : str;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
};

const pickStopName = (stopLike) => {
  if (!stopLike) return null;
  if (typeof stopLike === 'string') return stopLike;
  return stopLike.stop_name || stopLike.name || null;
};

const getRouteOriginFallback = (ticket) => (
  ticket?.trip?.fleet_route?.route?.origin ||
  ticket?.trip?.fleetRoute?.route?.origin ||
  null
);

const getRouteDestinationFallback = (ticket) => (
  ticket?.trip?.fleet_route?.route?.destination ||
  ticket?.trip?.fleetRoute?.route?.destination ||
  null
);

export default function usePassengerDashboard({ preloadMapView }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { logout, user, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  // 2026-10-29 (Batch 36 Phase 2): the passenger saves their own name, phone and gender; the shown profile takes
  // what the server sent back. Resolves to { ok, message } for the profile form.
  const saveProfile = useCallback(async (changes) => {
    try {
      const response = await PassengerService.updateProfile(changes);
      const updated = response?.data;
      if (updated && typeof updated === 'object') setProfile((prev) => ({ ...(prev ?? {}), ...updated }));
      return { ok: true, message: 'Your profile was saved.' };
    } catch (err) {
      return { ok: false, message: err?.message || 'Your profile could not be saved. Please try again.' };
    }
  }, []);
  const [dashboardFacts, setDashboardFacts] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [isLoadingPrivate, setIsLoadingPrivate] = useState(false);
  const [privateError, setPrivateError] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [paymentNotice, setPaymentNotice] = useState('');
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedTicketQr, setSelectedTicketQr] = useState(null);
  const [loadingTicketQr, setLoadingTicketQr] = useState(false);
  const [loadingMoreHistory, setLoadingMoreHistory] = useState('');
  const [historyPagination, setHistoryPagination] = useState({
    tickets: { page: 1, last_page: 1, total: 0 },
    rewards: { page: 1, last_page: 1, total: 0 },
    payments: { page: 1, last_page: 1, total: 0 },
  });
  const qrCacheRef = useRef(readSessionCache(TICKET_QR_CACHE_KEY));
  const privateLoadRequestRef = useRef(null);
  const lastPrivateLoadStartedAtRef = useRef(0);
  const historyLoadInFlightRef = useRef(new Set());

  const formatDateTime = useCallback((value) => {
    const str = String(value ?? '');
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(str);
    const date = toDate(value);
    if (!date) return '-';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    if (isDateOnly) return `${yyyy}/${mm}/${dd}`;
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yyyy}/${mm}/${dd} - ${hh}:${min}`;
  }, []);

  const getOriginLabel = useCallback((ticket) => {
    const stopName = pickStopName(ticket?.origin_stop) || pickStopName(ticket?.originStop);
    if (stopName) return stopName;
    if (ticket?.origin) return ticket.origin;
    if (selectedTicket?.ticket_uuid && ticket?.ticket_uuid === selectedTicket.ticket_uuid && selectedTicketQr?.origin) {
      return selectedTicketQr.origin;
    }
    // Custom GPS pinpoint fallback when no reverse-geocoded label exists.
    if (ticket?.origin_lat != null && ticket?.origin_lng != null) {
      return 'Custom pickup point';
    }
    return getRouteOriginFallback(ticket) || 'Route unavailable';
  }, [selectedTicket, selectedTicketQr]);

  const getDestinationLabel = useCallback((ticket) => {
    // A custom drop-off carries the label the passenger chose (or the server's snapped point).
    if (ticket?.destination_label) return ticket.destination_label;
    const stopName = pickStopName(ticket?.destination_stop) || pickStopName(ticket?.destinationStop);
    if (stopName) return stopName;
    if (ticket?.destination) return ticket.destination;
    if (selectedTicket?.ticket_uuid && ticket?.ticket_uuid === selectedTicket.ticket_uuid && selectedTicketQr?.destination) {
      return selectedTicketQr.destination;
    }
    // Custom GPS drop-off fallback when no reverse-geocoded label exists.
    if (ticket?.destination_lat != null && ticket?.destination_lng != null) {
      return 'Custom drop-off point';
    }
    return getRouteDestinationFallback(ticket) || 'Route unavailable';
  }, [selectedTicket, selectedTicketQr]);

  const clearPrivateData = useCallback(() => {
    setIsLoadingPrivate(false);
    setPrivateError('');
    setProfile(null);
    setDashboardFacts(null);
    setTickets([]);
    setTransactions([]);
    setRewards([]);
    setHistoryPagination({
      tickets: { page: 1, last_page: 1, total: 0 },
      rewards: { page: 1, last_page: 1, total: 0 },
      payments: { page: 1, last_page: 1, total: 0 },
    });
    setLastSync(null);
    setTicketModalOpen(false);
    setSelectedTicket(null);
    setSelectedTicketQr(null);
  }, []);

  const loadPrivateData = useCallback(async () => {
    if (privateLoadRequestRef.current) {
      return privateLoadRequestRef.current;
    }

    if (!isAuthenticated) {
      setProfile(null);
      setTickets([]);
      setTransactions([]);
      setRewards([]);
      setLastSync(null);
      return;
    }

    privateLoadRequestRef.current = (async () => {
      lastPrivateLoadStartedAtRef.current = Date.now();
      setIsLoadingPrivate(true);
      setPrivateError('');

      const getStatus = (err) => err?.cause?.response?.status ?? err?.response?.status ?? null;

      try {
        const summaryRes = await PassengerService.getDashboardSummary();
        const payload = summaryRes?.data ?? summaryRes ?? {};

        const profilePayload = payload?.profile ?? user ?? null;
        const ticketList = payload?.tickets ?? [];
        const rewardList = payload?.rewards ?? [];
        const paymentList = payload?.payments ?? [];
        setDashboardFacts(payload?.dashboard_facts ?? null);

        setProfile(profilePayload);
        setTickets(Array.isArray(ticketList) ? ticketList : []);
        setRewards(Array.isArray(rewardList) ? rewardList : []);
        setTransactions(Array.isArray(paymentList) ? paymentList : []);
        const pageMeta = payload?.meta?.history_pagination ?? {};
        setHistoryPagination({
          tickets: pageMeta.tickets ?? { page: 1, last_page: 1, total: ticketList.length },
          rewards: pageMeta.rewards ?? { page: 1, last_page: 1, total: rewardList.length },
          payments: pageMeta.payments ?? { page: 1, last_page: 1, total: paymentList.length },
        });
      } catch (summaryErr) {
        const summaryStatus = getStatus(summaryErr);
        if (summaryStatus === 401 || summaryStatus === 403 || summaryStatus === 404) {
          clearPrivateData();
          await logout();
          return;
        }

        const [ticketsRes, rewardsRes, paymentsRes] = await Promise.allSettled([
          PassengerService.getTickets({ page: 1, per_page: HISTORY_PAGE_SIZE }),
          PassengerService.getRewardsHistory({ page: 1, per_page: HISTORY_PAGE_SIZE }),
          PassengerService.getPaymentHistory({ page: 1, per_page: HISTORY_PAGE_SIZE }),
        ]);

        const authLikeFailure = [ticketsRes, rewardsRes, paymentsRes].some((result) => {
          if (result.status !== 'rejected') return false;
          const status = getStatus(result.reason);
          return status === 401 || status === 403 || status === 404;
        });

        if (authLikeFailure) {
          clearPrivateData();
          await logout();
          return;
        }

        const failures = [];
        setProfile(user ?? null);
        setDashboardFacts(null);

        if (ticketsRes.status === 'fulfilled') {
          const ticketPage = readHistoryPage(ticketsRes.value);
          setTickets(ticketPage.items);
          setHistoryPagination((previous) => ({ ...previous, tickets: ticketPage.meta ? {
            page: ticketPage.meta.current_page, last_page: ticketPage.meta.last_page, total: ticketPage.meta.total,
          } : { page: 1, last_page: 1, total: ticketPage.items.length } }));
        } else {
          setTickets([]);
          failures.push('Tickets endpoint failed');
        }

        if (rewardsRes.status === 'fulfilled') {
          const rewardPage = readHistoryPage(rewardsRes.value);
          setRewards(rewardPage.items);
          setHistoryPagination((previous) => ({ ...previous, rewards: rewardPage.meta ? {
            page: rewardPage.meta.current_page, last_page: rewardPage.meta.last_page, total: rewardPage.meta.total,
          } : { page: 1, last_page: 1, total: rewardPage.items.length } }));
        } else {
          setRewards([]);
          failures.push('Rewards endpoint failed');
        }

        if (paymentsRes.status === 'fulfilled') {
          const paymentPage = readHistoryPage(paymentsRes.value);
          setTransactions(paymentPage.items);
          setHistoryPagination((previous) => ({ ...previous, payments: paymentPage.meta ? {
            page: paymentPage.meta.current_page, last_page: paymentPage.meta.last_page, total: paymentPage.meta.total,
          } : { page: 1, last_page: 1, total: paymentPage.items.length } }));
        } else {
          setTransactions([]);
          failures.push('Payments endpoint failed');
        }

        if (failures.length > 0) {
          setPrivateError(failures.join(' | '));
        }
      } finally {
        setLastSync(new Date());
        setIsLoadingPrivate(false);
        privateLoadRequestRef.current = null;
      }
    })();

    return privateLoadRequestRef.current;
  }, [clearPrivateData, isAuthenticated, logout, user]);

  const loadMoreHistory = useCallback(async (kind) => {
    const current = historyPagination[kind];
    if (!current || current.page >= current.last_page || historyLoadInFlightRef.current.has(kind)) return;

    historyLoadInFlightRef.current.add(kind);
    setLoadingMoreHistory(kind);
    const page = current.page + 1;
    const options = { page, per_page: HISTORY_PAGE_SIZE };
    const loaders = {
      tickets: () => PassengerService.getTickets(options),
      rewards: () => PassengerService.getRewardsHistory(options),
      payments: () => PassengerService.getPaymentHistory(options),
    };

    try {
      const result = readHistoryPage(await loaders[kind]());
      const setters = { tickets: setTickets, rewards: setRewards, payments: setTransactions };
      setters[kind]((previous) => [...previous, ...result.items]);
      setHistoryPagination((previous) => ({
        ...previous,
        [kind]: {
          page: Number(result.meta?.current_page ?? page),
          last_page: Number(result.meta?.last_page ?? previous[kind].last_page),
          total: Number(result.meta?.total ?? previous[kind].total),
        },
      }));
    } catch (error) {
      setPrivateError(error?.message || 'Could not load more history. Please try again.');
    } finally {
      historyLoadInFlightRef.current.delete(kind);
      setLoadingMoreHistory('');
    }
  }, [historyPagination]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isAuthenticated) {
        void loadPrivateData();
      } else {
        clearPrivateData();
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isAuthenticated, loadPrivateData, clearPrivateData]);

  // Notifications audit follow-up: register for push notifications (trip
  // cancellation, payment failure alerts) once the passenger is logged in.
  // Fail-soft — initFcmAndGetToken() resolves to null on any failure
  // (unsupported browser, permission denied, missing config) and this
  // effect simply does nothing further in that case.
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let cancelled = false;
    void (async () => {
      const token = await initFcmAndGetToken();
      if (!cancelled && token) {
        try {
          await PassengerService.registerFcmToken(token);
        } catch {
          // Non-critical — silently ignore, matches FcmService's fail-soft design.
        }
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);


  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (!paymentStatus) {
      return;
    }

    const timer = setTimeout(() => {
      if (paymentStatus === 'success') {
        setPaymentNotice('Payment successful. You have been redirected back.');
        const isLoadInFlight = !!privateLoadRequestRef.current;
        const startedRecently = Date.now() - lastPrivateLoadStartedAtRef.current <= 5000;
        // Avoid immediate duplicate reload when an auth/mount-triggered load already started.
        if (isAuthenticated && !isLoadInFlight && !startedRecently) {
          void loadPrivateData();
        }
      } else if (paymentStatus === 'cancel') {
        setPaymentNotice('Payment was cancelled. You can try checkout again.');
      }

      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('payment');
      setSearchParams(nextParams, { replace: true });
    }, 0);

    return () => clearTimeout(timer);
  }, [isAuthenticated, loadPrivateData, searchParams, setSearchParams]);

  const handleLogout = useCallback(async () => {
    void logout();
    navigate('/', { replace: true });
  }, [logout, navigate]);

  const closeTicketModal = useCallback(() => {
    setTicketModalOpen(false);
    setSelectedTicket(null);
    setSelectedTicketQr(null);
  }, []);

  const openTicketModal = useCallback(async (ticket) => {
    setSelectedTicket(ticket);
    setSelectedTicketQr(null);
    setTicketModalOpen(true);

    if (!ticket?.ticket_uuid) {
      return;
    }

    const ticketUuid = ticket.ticket_uuid;
    const cached = qrCacheRef.current[ticketUuid];
    if (cached && typeof cached === 'object') {
      const ageMs = Date.now() - Number(cached.ts || 0);
      const ttlMs = cached.ok ? QR_SUCCESS_TTL_MS : QR_FAILURE_TTL_MS;
      if (ageMs <= ttlMs) {
        setSelectedTicketQr(cached.ok ? cached.value : null);
        return;
      }
    }

    setLoadingTicketQr(true);
    try {
      const qrRes = await PassengerService.getTicketQR(ticketUuid);
      const qrPayload = qrRes?.data ?? qrRes ?? null;
      setSelectedTicketQr(qrPayload);
      qrCacheRef.current[ticketUuid] = {
        ts: Date.now(),
        ok: true,
        value: qrPayload,
      };
      writeSessionCache(TICKET_QR_CACHE_KEY, qrCacheRef.current);
    } catch {
      setSelectedTicketQr(null);
      qrCacheRef.current[ticketUuid] = {
        ts: Date.now(),
        ok: false,
        value: null,
      };
      writeSessionCache(TICKET_QR_CACHE_KEY, qrCacheRef.current);
    } finally {
      setLoadingTicketQr(false);
    }
  }, []);

  const printSelectedTicket = useCallback(() => {
    if (!selectedTicket) return;

    const qrContent = selectedTicketQr?.qr_content || '';
    const ticketStatus = String(selectedTicket.status || 'valid').toLowerCase();
    const footerMessages = {
      boarded:   'Boarded — You are currently on this trip',
      alighted:  'Trip Completed — Thank you for riding!',
      expired:   'This ticket has expired',
      cancelled: 'Ticket Cancelled',
    };
    const footerText = footerMessages[ticketStatus] ?? 'Valid ticket. Show this QR code when boarding';
    const footerStyles = {
      boarded:   'border:1px solid #7dd3fc;background:#e0f2fe;color:#0369a1;',
      alighted:  'border:1px solid #94a3b8;background:#f1f5f9;color:#475569;',
      expired:   'border:1px solid #fca5a5;background:#fef2f2;color:#991b1b;',
      cancelled: 'border:1px solid #fca5a5;background:#fef2f2;color:#7f1d1d;',
    };
    const footerStyle = footerStyles[ticketStatus] ?? 'border:1px solid #9dd7af;background:#eaf9f0;color:#166534;';
    const buildHtml = (qrSrc) => `
      <html>
        <head>
          <title>Smart Transit Ticket</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 18px; color: #0f172a; background: #f8fafc; }
            .ticket { max-width: 760px; border: 1px solid #d6dbe5; border-radius: 12px; overflow: hidden; background: #fff; }
            .head { background: linear-gradient(145deg, #2ab557, #31c964); color: #fff; padding: 18px; }
            .head h1 { margin: 0; font-size: 20px; }
            .head h2 { margin: 4px 0 0; font-size: 32px; line-height: 1.05; }
            .strip { margin-top: 14px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
            .strip span { display: block; font-size: 10px; text-transform: uppercase; opacity: 0.85; }
            .strip strong { display: block; margin-top: 2px; font-size: 13px; }
            .body { padding: 14px; display: grid; grid-template-columns: 160px 1fr; gap: 14px; border-top: 2px dashed #d6dbe5; }
            .qr-wrap { width: 160px; height: 160px; border: 1px solid #d7dee8; border-radius: 10px; display: grid; place-items: center; background: #fff; }
            img { width: 146px; height: 146px; object-fit: contain; }
            .meta { display: grid; gap: 8px; }
            .meta div { display: flex; justify-content: space-between; border-bottom: 1px solid #ebeff5; padding-bottom: 6px; }
            .meta .k { color: #64748b; font-size: 12px; }
            .meta .v { color: #0f172a; font-size: 13px; font-weight: 700; }
            .foot { margin: 0 14px 14px; border: 1px solid #9dd7af; background: #eaf9f0; color: #166534; border-radius: 10px; padding: 9px 10px; font-size: 12px; text-align: center; font-weight: 700; }
          </style>
        </head>
        <body>
          <article class="ticket">
            <header class="head">
              <h1>${getOriginLabel(selectedTicket)}</h1>
              <h2>${getDestinationLabel(selectedTicket)}</h2>
              <div class="strip">
                <div><span>Departure</span><strong>${formatDateTime(selectedTicket.valid_from ?? selectedTicketQr?.valid_from)}</strong></div>
                <div><span>Seat</span><strong>${selectedTicket.seat_type || '-'}</strong></div>
                <div><span>Route</span><strong>${getOriginLabel(selectedTicket)} to ${getDestinationLabel(selectedTicket)}</strong></div>
              </div>
            </header>
            <div class="body">
              <div class="qr-wrap">${qrSrc ? `<img src="${qrSrc}" alt="Ticket QR" />` : '<span>QR unavailable</span>'}</div>
              <div class="meta">
                <div><span class="k">Valid</span><span class="v">${formatDateTime(selectedTicket.valid_from ?? selectedTicketQr?.valid_from)}</span></div>
                <div><span class="k">Expires</span><span class="v">${formatDateTime(selectedTicket.expires_at ?? selectedTicketQr?.expires_at)}</span></div>
                <div><span class="k">Status</span><span class="v">${selectedTicket.status || '-'}</span></div>
                <div><span class="k">Fare Paid</span><span class="v">PHP ${Number(selectedTicket.amount ?? selectedTicket.final_amount ?? 0).toFixed(2)}</span></div>
              </div>
            </div>
            <div class="foot" style="${footerStyle}">${footerText}</div>
          </article>
          </div>
          <script>window.onload = function () { window.print(); };</script>
        </body>
      </html>
    `;

    // The QR is drawn locally (same renderer as the screen); nothing is fetched.
    if (qrContent) {
      openPrintWindow(qrContent, buildHtml);
      return;
    }
    const popup = window.open('', '_blank', 'width=900,height=700');
    if (!popup) return;
    popup.document.write(buildHtml(''));
    popup.document.close();
  }, [formatDateTime, getDestinationLabel, getOriginLabel, selectedTicket, selectedTicketQr]);

  const handleTabChange = useCallback((item) => {
    if (item.key === 'map') {
      void preloadMapView();
    }

    if (item.protected && !isAuthenticated) {
      navigate('/passenger/login');
      return;
    }

    if (item.key === 'transactions' && isAuthenticated) {
      void loadPrivateData();
    }

    setActiveTab(item.key);
    setMenuOpen(false);
  }, [isAuthenticated, loadPrivateData, navigate, preloadMapView]);

  useEffect(() => {
    const rawTab = String(searchParams.get('tab') || '').trim().toLowerCase();
    // Every portal calls this page "Account"; for a passenger the tab is still named "profile" in the address.
    const tabParam = rawTab === 'account' ? 'profile' : rawTab;
    if (!tabParam) return;

    // There is one booking page; an old ?tab=buy link goes there.
    if (tabParam === 'buy') {
      navigate('/passenger/book', { replace: true });
      return;
    }

    const allowed = new Set(['dashboard', 'map', 'tickets', 'transactions', 'rewards', 'profile']);
    if (!allowed.has(tabParam)) return;

    if (PROTECTED_TABS.has(tabParam) && !isAuthenticated) {
      setActiveTab('dashboard');
      return;
    }

    setActiveTab(tabParam);
  }, [isAuthenticated, navigate, searchParams]);

  const points = Number(profile?.reward_points ?? user?.reward_points ?? 0).toFixed(2);
  const visibleTab = !isAuthenticated && PROTECTED_TABS.has(activeTab) ? 'dashboard' : activeTab;

  return {
    activeTab,
    closeTicketModal,
    formatDateTime,
    getDestinationLabel,
    getOriginLabel,
    handleLogout,
    handleTabChange,
    historyPagination,
    isAuthenticated,
    isLoadingPrivate,
    dashboardFacts,
    lastSync,
    loadMoreHistory,
    loadPrivateData,
    loadingMoreHistory,
    loadingTicketQr,
    menuOpen,
    navigate,
    paymentNotice,
    points,
    privateError,
    profile,
    saveProfile,
    rewards,
    selectedTicket,
    selectedTicketQr,
    setMenuOpen,
    ticketModalOpen,
    tickets,
    transactions,
    user,
    visibleTab,
    openTicketModal,
    printSelectedTicket,
  };
}
