import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Camera,
  CheckCircle2,
  Loader,
  QrCode,
  RefreshCw,
  Shield,
  XCircle,
} from 'lucide-react';
import QrScanner from 'qr-scanner';
import StaffService from '../../api/StaffService/StaffService';

const isLikelyPin = (value) => /^\d{6}$/.test(String(value || '').trim());

export default function PairingScreen({ role, onPaired, onLogout, paired = false, pairingReason = '' }) {
  const partnerRole = role === 'driver' ? 'Conductor' : 'Driver';

  const [myToken, setMyToken] = useState(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [tokenError, setTokenError] = useState('');
  const [showPin, setShowPin] = useState(false);

  const [scannerRunning, setScannerRunning] = useState(false);
  const [scannerBusy, setScannerBusy] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('');
  const [scannerError, setScannerError] = useState('');

  const [manualToken, setManualToken] = useState('');

  const [result, setResult] = useState(null);

  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const scannerBusyRef = useRef(false);
  const lastScannedRef = useRef({ value: '', at: 0 });
  const didInitialTokenLoad = useRef(false);
  const tokenRequestRef = useRef(null);

  const loadMyToken = useCallback(async ({ background = false } = {}) => {
    if (tokenRequestRef.current) {
      return tokenRequestRef.current;
    }

    if (!background) {
      setLoadingToken(true);
    }
    setTokenError('');

    tokenRequestRef.current = (async () => {
      try {
        const res = await StaffService.getPairingToken(role);
        const tokenPayload = res?.data?.data ?? res?.data ?? res;
        setMyToken(tokenPayload);
      } catch (err) {
        setTokenError(err.message || 'Failed to generate your pairing QR. Make sure a trip is assigned for today.');
      } finally {
        if (!background) {
          setLoadingToken(false);
        }
        tokenRequestRef.current = null;
      }
    })();

    return tokenRequestRef.current;
  }, [role]);

  useEffect(() => {
    if (didInitialTokenLoad.current) return;
    didInitialTokenLoad.current = true;
    void loadMyToken();
  }, [loadMyToken]);

  const submitPairing = useCallback(async (credential, manualType = null) => {
    const value = String(credential ?? '').trim();
    if (!value) return;

    setResult(null);
    setScannerStatus('Verifying pairing...');

    const mode = manualType || (isLikelyPin(value) ? 'pin' : 'token');

    try {
      const res = await StaffService.submitPairing(role, value, mode);
      setResult({ success: true, message: res?.message || 'Pairing confirmed.' });
      stopScanner();

      setTimeout(() => {
        if (typeof onPaired === 'function') {
          onPaired(res?.data ?? null);
        }
      }, 900);
    } catch (err) {
      setResult({ success: false, message: err.message || 'Pairing failed.' });
      setScannerStatus('');
    }
  }, [role, onPaired]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      if (typeof scannerRef.current.destroy === 'function') scannerRef.current.destroy();
      scannerRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    scannerBusyRef.current = false;
    setScannerRunning(false);
    setScannerBusy(false);
  }, []);

  const startScanner = useCallback(async () => {
    setScannerError('');
    setResult(null);
    if (!videoRef.current) return;

    try {
      const qrScanner = new QrScanner(
        videoRef.current,
        async (result) => {
          const raw = result?.data;
          if (!raw) return;
          if (scannerBusyRef.current) return;

          const now = Date.now();
          if (lastScannedRef.current.value === raw && now - lastScannedRef.current.at < 3000) return;
          lastScannedRef.current = { value: raw, at: now };

          scannerBusyRef.current = true;
          setScannerBusy(true);

          try {
            await submitPairing(raw, 'token');
          } finally {
            scannerBusyRef.current = false;
            setScannerBusy(false);
          }
        },
        {
          onDecodeError: () => {},
          maxScansPerSecond: 2,
          preferredCamera: 'environment',
          workerPath: '/qr-scanner-worker.min.js',
        },
      );
      scannerRef.current = qrScanner;
      await qrScanner.start();
      if (!scannerRef.current) return;
      setScannerRunning(true);
      setScannerStatus(`Camera active. Point at your ${partnerRole.toLowerCase()}'s QR code.`);
    } catch (err) {
      stopScanner();
      setScannerError(err?.message || 'Camera unavailable. Use the manual entry below.');
    }
  }, [submitPairing, stopScanner, partnerRole]);

  useEffect(() => () => stopScanner(), [stopScanner]);

  const unlockMessage = pairingReason || `Waiting for pairing with your ${partnerRole}.`;
  const revealedPin = myToken?.token_pin || myToken?.pin_code || '';

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-800 bg-sky-950/40 px-2.5 py-1 text-xs text-sky-300">
            <Shield className="h-3.5 w-3.5" />
            Pairing Required
          </div>
          <h3 className="mt-2 text-base font-semibold text-slate-100">Pair with your {partnerRole}</h3>
          <p className="mt-1 text-xs text-slate-400">{unlockMessage}</p>
          {paired && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-950/40 px-2.5 py-1 text-xs text-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Paired with your {partnerRole}
            </div>
          )}
        </div>
        {myToken?.fleet_plate && (
          <div className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300">
            <div>Fleet: <strong>{myToken.fleet_plate}</strong></div>
            {myToken.route_name && <div className="mt-0.5 text-slate-400">{myToken.route_name}</div>}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-200">Your pairing QR (primary)</h4>

          {loadingToken ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader className="h-7 w-7 animate-spin text-sky-400" />
              <p className="text-xs text-slate-400">Generating token...</p>
            </div>
          ) : tokenError ? (
            <div className="rounded-xl border border-red-900 bg-red-950/40 p-3 text-xs text-red-300">
              {tokenError}
            </div>
          ) : myToken ? (
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPin((prev) => !prev);
                  if (!myToken?.token_pin && !myToken?.pin_code) {
                    void loadMyToken({ background: true });
                  }
                }}
                className="rounded-xl border border-slate-700 bg-white p-2 transition hover:scale-[1.01]"
                title="Tap to show or hide PIN"
              >
                <img
                  src={myToken.qr_url}
                  alt="Your pairing QR"
                  className="h-48 w-48"
                />
              </button>

              <button
                type="button"
                onClick={() => setShowPin((prev) => !prev)}
                className="text-xs font-semibold text-sky-400 transition hover:text-sky-300"
              >
                {showPin ? 'Hide PIN' : 'Show PIN'}
              </button>

              {showPin && (
                <div className="font-data rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-center text-xl font-bold tracking-[0.2em] text-slate-100">
                  {revealedPin || '------'}
                </div>
              )}

              {showPin && !revealedPin && (
                <p className="text-xs text-amber-300">PIN is not available yet. Tap refresh and try again.</p>
              )}

              <button
                type="button"
                onClick={() => void loadMyToken()}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-slate-200"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh QR/PIN
              </button>
            </div>
          ) : null}
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-200">Pair now</h4>

          {paired && (
            <div className="mb-3 rounded-xl border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">
              Session pairing is complete. Live dashboard features are unlocked.
            </div>
          )}

          {!paired && <div className="mb-3 flex gap-2">
            {!scannerRunning ? (
              <button
                type="button"
                onClick={() => void startScanner()}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-700 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
              >
                <Camera className="h-4 w-4" />
                Start Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={stopScanner}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-700 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
              >
                <Camera className="h-4 w-4" />
                Stop Camera
              </button>
            )}
          </div>}

          {!paired && <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
            <video
              ref={videoRef}
              className="aspect-video w-full bg-slate-900 object-cover"
              muted
              playsInline
              autoPlay
            />
            {scannerBusy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 backdrop-blur-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-sky-400" />
                <p className="text-xs font-semibold text-sky-300">Verifying...</p>
              </div>
            )}
          </div>}

          {!paired && scannerStatus && <p className="mt-2 text-xs text-slate-400">{scannerStatus}</p>}
          {!paired && scannerError && <p className="mt-2 text-xs text-red-400">{scannerError}</p>}

          {!paired && <div className="mt-4">
            <p className="mb-2 text-xs text-slate-500">Enter partner PIN or full token:</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="6-digit PIN or token"
                value={manualToken}
                onChange={(e) => {
                  setManualToken(e.target.value);
                  setResult(null);
                }}
                className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400"
              />
              <button
                type="button"
                onClick={() => void submitPairing(manualToken)}
                disabled={!manualToken.trim() || scannerBusy}
                className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <QrCode className="h-4 w-4" />
              </button>
            </div>
          </div>}

          {!paired && result && (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              result.success
                ? 'border-emerald-900 bg-emerald-950/40 text-emerald-300'
                : 'border-red-900 bg-red-950/40 text-red-300'
            }`}>
              <div className="flex items-start gap-2">
                {result.success
                  ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                <p>{result.message}</p>
              </div>
            </div>
          )}
        </article>
      </div>

      {!!onLogout && (
        <div className="mt-4 text-right">
          <button
            onClick={onLogout}
            className="text-xs text-slate-500 underline transition hover:text-slate-300"
          >
            Sign out
          </button>
        </div>
      )}
    </section>
  );
}
