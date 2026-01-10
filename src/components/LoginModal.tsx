import { useState, useEffect, useCallback, useRef } from 'react';
import { getLoginQRCode, checkQRCodeStatus, type QRCodeData } from '../services/auth';
import { qrcodegen } from '../utils/qrcodegen';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [qrCode, setQRCode] = useState<QRCodeData | null>(null);
  const [status, setStatus] = useState<string>('Loading...');
  const [error, setError] = useState<string | null>(null);
  const [qrModules, setQrModules] = useState<boolean[][] | null>(null);
  const [qrRenderError, setQrRenderError] = useState<string | null>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const isTauri = typeof window !== 'undefined'
    && Boolean((window as unknown as { __TAURI__?: unknown }).__TAURI__);

  const fetchQRCode = useCallback(async () => {
    if (!isTauri) return;
    setError(null);
    setQrModules(null);
    setQrRenderError(null);
    setStatus('Generating QR code...');

    const data = await getLoginQRCode();
    if (data) {
      setQRCode(data);
      setStatus('Scan with Bilibili app');
    } else {
      setError('Failed to generate QR code');
    }
  }, [isTauri]);

  const pollStatus = useCallback(async () => {
    if (!qrCode) return;

    const result = await checkQRCodeStatus(qrCode.qrcode_key);

    if (result.code === 0) {
      // Login successful
      setStatus('Login successful!');
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setTimeout(() => {
        onLoginSuccess();
        onClose();
      }, 1000);
    } else if (result.code === 86038) {
      // QR code expired
      setError('QR code expired');
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    } else if (result.code === 86090) {
      setStatus('Scanned - confirm on your phone');
    } else if (result.code === 86101) {
      setStatus('Scan with Bilibili app');
    }
  }, [qrCode, onLoginSuccess, onClose]);

  useEffect(() => {
    if (!qrCode) {
      setQrModules(null);
      setQrRenderError(null);
      return;
    }
    try {
      const qr = qrcodegen.QrCode.encodeText(qrCode.url, qrcodegen.QrCode.Ecc.LOW);
      const modules = Array.from({ length: qr.size }, (_, y) =>
        Array.from({ length: qr.size }, (_, x) => qr.getModule(x, y))
      );
      setQrModules(modules);
      setQrRenderError(null);
    } catch (err) {
      console.error('Failed to generate QR modules:', err);
      setQrModules(null);
      setQrRenderError('Failed to render QR code');
    }
  }, [qrCode]);

  useEffect(() => {
    if (isOpen) {
      if (!isTauri) {
        setQRCode(null);
        setError(null);
        setQrModules(null);
        setQrRenderError(null);
        setStatus('Sign in is available in the desktop app only.');
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch data on mount
        fetchQRCode();
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, fetchQRCode, isTauri]);

  useEffect(() => {
    if (qrCode && isTauri && !pollIntervalRef.current) {
      pollIntervalRef.current = window.setInterval(pollStatus, 2000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [qrCode, pollStatus, isTauri]);

  if (!isOpen) return null;

  const quietZone = 4;
  const qrSize = qrModules ? qrModules.length + quietZone * 2 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#00a1d6] to-[#fb7299] flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sign in to Bilibili</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isTauri ? 'Scan with the Bilibili mobile app' : 'Access your account'}
          </p>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center">
          {!isTauri ? (
            <div className="w-full">
              {/* Browser limitation message */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Desktop App Required
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                  Browser security prevents sending login cookies to Bilibili.
                  Download the desktop app for full sign-in support.
                </p>
              </div>

              {/* Benefits of signing in */}
              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center">With sign-in you can:</p>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4 text-[#00a1d6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Load all comments</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4 text-[#00a1d6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Access higher video quality</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <svg className="w-4 h-4 text-[#00a1d6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>View member-only content</span>
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="w-48 h-48 flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg">
              <svg className="w-12 h-12 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              <button
                onClick={fetchQRCode}
                className="mt-3 px-4 py-1.5 bg-[#00a1d6] text-white text-sm rounded-full hover:bg-[#00b5e5] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : qrRenderError ? (
            <div className="w-48 h-48 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-600 dark:text-gray-300 text-center">
                {qrRenderError}
              </p>
              <button
                onClick={fetchQRCode}
                className="mt-3 px-3 py-1.5 bg-[#00a1d6] text-white text-xs rounded-full hover:bg-[#00b5e5] transition-colors"
              >
                Retry
              </button>
            </div>
          ) : qrModules ? (
            <div className="relative">
              <svg
                role="img"
                aria-label="Login QR Code"
                viewBox={`0 0 ${qrSize} ${qrSize}`}
                className="w-48 h-48 rounded-lg"
                shapeRendering="crispEdges"
              >
                <rect width={qrSize} height={qrSize} fill="#fff" />
                {qrModules.map((row, y) =>
                  row.map((cell, x) =>
                    cell ? (
                      <rect
                        key={`${x}-${y}`}
                        x={x + quietZone}
                        y={y + quietZone}
                        width="1"
                        height="1"
                        fill="#000"
                      />
                    ) : null
                  )
                )}
              </svg>
              {status.includes('confirm') && (
                <div className="absolute inset-0 bg-green-500/90 rounded-lg flex items-center justify-center">
                  <div className="text-center text-white">
                    <svg className="w-12 h-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm font-medium">Scanned!</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-48 h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg">
              <div className="w-8 h-8 border-2 border-[#00a1d6] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* Status */}
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            {status}
          </p>
        </div>

        {/* Instructions - only show for desktop app */}
        {isTauri && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Open Bilibili app → Tap profile → Scan icon (top right)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
