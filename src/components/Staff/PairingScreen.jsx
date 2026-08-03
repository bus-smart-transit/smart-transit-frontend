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

export default function PairingScreen({ role, onPaired, onLogout }) {
  const partnerRole = role === 'driver' ? 'Conductor' : 'Driver';

  // Own pairing QR
  const [myToken, setMyToken]         = useState(null);
  const [loadingToken, setLoadingToken] = useState(true);
  const [tokenError, setTokenError]   = useState('');

  // Camera scanner
  const [scannerRunning, setScannerRunning] = useState(false);
  const [scannerBusy, setScannerBusy]       = useState(false);
  const [scannerStatus, setScannerStatus]   = useState('');
  const [scannerError, setScannerError]     = useState('');

  // Manual fallback
  const [manualToken, setManualToken] = useState('');

  // Pairing outcome
  const [result, setResult] = useState(null); // { success, message }

  const videoRef        = useRef(null);
  const scannerRef      = useRef(null);
  const scannerBusyRef  = useRef(false);
  const lastScannedRef  = useRef({ value: '', at: 0 });

  // ── Load own QR token ──────────────────────────────────────────────────────
  const loadMyToken = useCallback(async () => {
    setLoadingToken(true);
    setTokenError('');
    try {
      const res = await StaffService.getPairingToken(role);
      setMyToken(res?.data ?? res);
    } catch (err) {
      setTokenError(err.message || 'Failed to generate your pairing QR. Make sure a trip is assigned for today.');
    } finally {
      setLoadingToken(false);
    }
  }, [role]);

  useEffect(() => { void loadMyToken(); }, [loadMyToken]);

  // ── Submit partner token (shared by camera + manual) ─────────────────────
  const submitPairing = useCallback(async (partnerToken) => {
    const token = String(partnerToken ?? '').trim();
    if (!token) return;

    setResult(null);
    setScannerStatus('Verifying pairing…');

    try {
      const res = await StaffService.submitPairing(role, token);
      setResult({ success: true, message: res?.message || 'Pairing confirmed!' });
      stopScanner(); // eslint-disable-line no-use-before-define
      setTimeout(() => onPaired(), 1000);
    } catch (err) {
      setResult({ success: false, message: err.message || 'Pairing failed.' });
      setScannerStatus('');
    }
  }, [role, onPaired]); // stopScanner added after definition

  // ── Camera scanner ────────────────────────────────────────────────────────
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
            await submitPairing(raw);
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-3xl">

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/40 bg-sky-500/10">
            <Shield className="h-7 w-7 text-sky-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">
            Pair with your {partnerRole}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Dashboard is locked until QR pairing is confirmed.
          </p>
          {myToken?.fleet_plate && (
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-sky-800 bg-sky-950/40 px-3 py-1 text-xs text-sky-300">
              Fleet: <strong>{myToken.fleet_plate}</strong>
              {myToken.route_name && <> · {myToken.route_name}</>}
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">

          {/* Left — My QR */}
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-300">
              Your QR Code — show this to your {partnerRole}
            </h2>

            {loadingToken ? (
              <div className="flex flex-col items-center gap-3 py-10">
                <Loader className="h-8 w-8 animate-spin text-sky-400" />
                <p className="text-sm text-slate-400">Generating your token…</p>
              </div>
            ) : tokenError ? (
              <div className="rounded-xl border border-red-900 bg-red-950/40 p-4">
                <p className="text-sm text-red-300">{tokenError}</p>
                <button
                  onClick={loadMyToken}
                  className="mt-3 text-xs text-sky-400 underline"
                >
                  Retry
                </button>
              </div>
            ) : myToken ? (
              <div className="flex flex-col items-center gap-3">
                <img
                  src={myToken.qr_url}
                  alt="Your pairing QR"
                  className="h-52 w-52 rounded-xl border border-slate-700 bg-white p-2"
                />
                <div className="space-y-1 text-center text-xs text-slate-500">
                  <p>Valid until end of today</p>
                  {myToken.trip_id && <p>Trip #{myToken.trip_id}</p>}
                </div>
                <button
                  onClick={loadMyToken}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-slate-200"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh QR
                </button>
              </div>
            ) : null}
          </article>

          {/* Right — Scan partner */}
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-4 text-sm font-semibold text-slate-300">
              Scan your {partnerRole}'s QR Code
            </h2>

            {/* Camera controls */}
            <div className="mb-3 flex gap-2">
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
            </div>

            {/* Video + busy overlay */}
            <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
              <video
                ref={videoRef}
                className="aspect-video w-full bg-slate-950 object-cover"
                muted
                playsInline
                autoPlay
              />
              {scannerBusy && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 backdrop-blur-sm">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-sky-400" />
                  <p className="text-xs font-semibold text-sky-300">Verifying…</p>
                </div>
              )}
            </div>

            {scannerStatus && <p className="mt-2 text-xs text-slate-400">{scannerStatus}</p>}
            {scannerError && <p className="mt-2 text-xs text-red-400">{scannerError}</p>}

            {/* Manual fallback */}
            <div className="mt-4">
              <p className="mb-2 text-xs text-slate-500">
                Camera not working? Paste your partner's token:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Paste pairing token here…"
                  value={manualToken}
                  onChange={(e) => { setManualToken(e.target.value); setResult(null); }}
                  className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 text-xs text-slate-100 outline-none placeholder:text-slate-600 focus:border-sky-400"
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
            </div>

            {/* Result */}
            {result && (
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

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            onClick={onLogout}
            className="text-xs text-slate-600 underline transition hover:text-slate-400"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
