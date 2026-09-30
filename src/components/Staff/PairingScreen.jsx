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
import StaffService from '../../api/StaffService/StaffBaseService';
import QrImage from '../Passenger/Ticket/QrImage';

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
  }, [role, onPaired, stopScanner]);

  const startScanner = useCallback(async () => {
    setScannerError('');
    setResult(null);
    if (!videoRef.current) return;
    if (!window.isSecureContext) {
      setScannerError('Camera access requires HTTPS or localhost. Please open this app in a secure context.');
      return;
    }
    if (!navigator?.mediaDevices?.getUserMedia) {
      setScannerError('Camera API is not available on this browser/device. Use manual pairing instead.');
      return;
    }

    try {
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        setScannerError('No camera device was detected. Use manual pairing instead.');
        return;
      }

      const cameraList = await QrScanner.listCameras(true).catch(() => []);
      const preferredCamera = cameraList.find((camera) => /back|rear|environment/i.test(String(camera?.label || '')))?.id || 'environment';

      const onDecode = async (result) => {
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
      };

      let qrScanner = new QrScanner(
        videoRef.current,
        onDecode,
        {
          onDecodeError: () => {},
          maxScansPerSecond: 2,
          preferredCamera,
          workerPath: '/qr-scanner-worker.min.js',
        },
      );

      try {
        await qrScanner.start();
      } catch {
        if (typeof qrScanner.destroy === 'function') qrScanner.destroy();
        qrScanner = new QrScanner(
          videoRef.current,
          onDecode,
          {
            onDecodeError: () => {},
            maxScansPerSecond: 2,
            preferredCamera,
          },
        );
        await qrScanner.start();
      }

      scannerRef.current = qrScanner;
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
    <section className="staff-card staff-card-roomy">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs text-sky-700">
            <Shield className="h-3.5 w-3.5" />
            Pairing Required
          </div>
          <h3 className="mt-2 text-base font-semibold text-slate-900">Pair with your {partnerRole}</h3>
          <p className="mt-1 text-xs text-slate-500">{unlockMessage}</p>
          {paired && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Paired with your {partnerRole}
            </div>
          )}
        </div>
        {myToken?.fleet_plate && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <div>Fleet: <strong>{myToken.fleet_plate}</strong></div>
            {myToken.route_name && <div className="mt-0.5 text-slate-500">{myToken.route_name}</div>}
          </div>
        )}
      </div>

      <div className="staff-grid md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Your pairing QR (primary)</h4>

          {loadingToken ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader className="h-7 w-7 animate-spin text-sky-500" />
              <p className="text-xs text-slate-500">Generating token...</p>
            </div>
          ) : tokenError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
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
                className="rounded-xl border border-slate-200 bg-white p-2 transition hover:scale-[1.01]"
                title="Tap to show or hide PIN"
              >
                <QrImage content={myToken.token} alt="Your pairing QR" size={384} className="h-48 w-48" />
              </button>

              <button
                type="button"
                onClick={() => setShowPin((prev) => !prev)}
                className="text-xs font-semibold text-sky-600 transition hover:text-sky-700"
              >
                {showPin ? 'Hide PIN' : 'Show PIN'}
              </button>

              {showPin && (
                <div className="font-data rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-xl font-bold tracking-[0.2em] text-slate-900">
                  {revealedPin || '------'}
                </div>
              )}

              {showPin && !revealedPin && (
                <p className="text-xs text-amber-600">PIN is not available yet. Tap refresh and try again.</p>
              )}

              <button
                type="button"
                onClick={() => void loadMyToken()}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-700"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh QR/PIN
              </button>
            </div>
          ) : null}
        </article>

        <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-900">Pair now</h4>

          {paired && (
            <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Session pairing is complete. Live dashboard features are unlocked.
            </div>
          )}

          {!paired && <div className="mb-3 flex gap-2">
            {!scannerRunning ? (
              <button
                type="button"
                onClick={() => void startScanner()}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
              >
                <Camera className="h-4 w-4" />
                Start Camera
              </button>
            ) : (
              <button
                type="button"
                onClick={stopScanner}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                <Camera className="h-4 w-4" />
                Stop Camera
              </button>
            )}
          </div>}

          {/* Batch 23 fix: this container was previously `aspect-video w-full`,
              which meant its rendered size was never an intentional value —
              it was width (whatever the narrow 2-column grid cell resolved
              to, e.g. 219px) recalculated to a 16:9 height (e.g. 123.19px).
              A fixed, explicit 300x200 box removes that computed-size drift
              entirely. */}
          {!paired && <div className="relative mx-auto h-[200px] w-[300px] max-w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
            <video
              ref={videoRef}
              className="h-full w-full bg-slate-900 object-cover"
              muted
              playsInline
              autoPlay
            />
            {scannerBusy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 backdrop-blur-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-sky-500" />
                <p className="text-xs font-semibold text-sky-300">Verifying...</p>
              </div>
            )}
          </div>}

          {!paired && scannerStatus && <p className="mt-2 text-xs text-slate-500">{scannerStatus}</p>}
          {!paired && scannerError && <p className="mt-2 text-xs text-red-600">{scannerError}</p>}

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
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400"
              />
              <button
                type="button"
                onClick={() => void submitPairing(manualToken)}
                disabled={!manualToken.trim() || scannerBusy}
                className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <QrCode className="h-4 w-4" />
              </button>
            </div>
          </div>}

          {!paired && result && (
            <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
              result.success
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
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
            className="text-xs text-slate-500 underline transition hover:text-slate-700"
          >
            Sign out
          </button>
        </div>
      )}
    </section>
  );
}
