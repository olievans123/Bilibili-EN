import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { load, Store } from '@tauri-apps/plugin-store';
import { setCookies, getCookies, getCurrentUser } from './bilibili';
import type { BiliUser } from '../types/bilibili';

const STORE_KEY = 'bilibili_auth';
const LOCAL_STORAGE_KEY = 'bilibili_auth';
const AUTH_BASE = 'https://passport.bilibili.com';
const AUTH_PROXY_BASE = (import.meta.env.VITE_PASSPORT_PROXY_BASE as string | undefined)?.replace(/\/$/, '')
  || '/api/passport';
let store: Store | null = null;
const isTauri = typeof window !== 'undefined'
  && Boolean((window as unknown as { __TAURI__?: unknown }).__TAURI__);

async function getStore(): Promise<Store> {
  if (!isTauri) {
    throw new Error('Store not available');
  }
  if (!store) {
    store = await load('auth.json');
  }
  return store;
}

export interface QRCodeData {
  url: string;
  qrcode_key: string;
}

async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${AUTH_BASE}${path}`;

  if (isTauri) {
    return tauriFetch(url, options);
  }

  const isDev = import.meta.env.DEV;
  const useProxy = isDev || Boolean(import.meta.env.VITE_PASSPORT_PROXY_BASE);
  const targetUrl = useProxy ? `${AUTH_PROXY_BASE}${path}` : url;
  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  return window.fetch(targetUrl, {
    ...options,
    headers,
  });
}

export async function getLoginQRCode(): Promise<QRCodeData | null> {
  try {
    const response = await authFetch('/x/passport-login/web/qrcode/generate', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com',
      },
    });

    const data = await response.json();

    if (data.code !== 0) {
      console.error('Failed to get QR code:', data.message);
      return null;
    }

    return {
      url: data.data.url,
      qrcode_key: data.data.qrcode_key,
    };
  } catch (error) {
    console.error('Error getting QR code:', error);
    return null;
  }
}

export interface QRCodeStatus {
  code: number;
  message: string;
  cookies?: string;
}

export async function checkQRCodeStatus(qrcode_key: string): Promise<QRCodeStatus> {
  try {
    const response = await authFetch(`/x/passport-login/web/qrcode/poll?qrcode_key=${qrcode_key}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com',
      },
    });

    const data = await response.json();

    // Status codes:
    // 0 = Success (logged in)
    // 86038 = QR code expired
    // 86090 = QR code scanned, waiting for confirmation
    // 86101 = QR code not scanned

    if (data.code !== 0) {
      return { code: data.code, message: data.message };
    }

    const statusCode = data.data.code;

    if (statusCode === 0) {
      // Login successful - extract cookies from response
      // The cookies are in the URL parameters of the refresh_token URL
      const url = data.data.url;
      const cookies = extractCookiesFromUrl(url);

      if (cookies) {
        await saveCookies(cookies);
        setCookies(cookies);
      }

      return { code: 0, message: 'Login successful', cookies: cookies || undefined };
    }

    return {
      code: statusCode,
      message: getStatusMessage(statusCode),
    };
  } catch (error) {
    console.error('Error checking QR code status:', error);
    return { code: -1, message: 'Network error' };
  }
}

function extractCookiesFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;

    const cookieParts: string[] = [];

    // Extract key cookies from URL parameters
    const DedeUserID = params.get('DedeUserID');
    const DedeUserID__ckMd5 = params.get('DedeUserID__ckMd5');
    const SESSDATA = params.get('SESSDATA');
    const bili_jct = params.get('bili_jct');

    if (DedeUserID) cookieParts.push(`DedeUserID=${DedeUserID}`);
    if (DedeUserID__ckMd5) cookieParts.push(`DedeUserID__ckMd5=${DedeUserID__ckMd5}`);
    if (SESSDATA) cookieParts.push(`SESSDATA=${SESSDATA}`);
    if (bili_jct) cookieParts.push(`bili_jct=${bili_jct}`);

    if (cookieParts.length > 0) {
      return cookieParts.join('; ');
    }

    return null;
  } catch (error) {
    console.error('Error extracting cookies:', error);
    return null;
  }
}

function getStatusMessage(code: number): string {
  switch (code) {
    case 86038:
      return 'QR code expired';
    case 86090:
      return 'Scanned - please confirm on your phone';
    case 86101:
      return 'Waiting for scan...';
    default:
      return 'Unknown status';
  }
}

export async function saveCookies(cookies: string): Promise<void> {
  try {
    if (!isTauri) {
      // Avoid persisting session cookies in web builds.
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      return;
    }
    const s = await getStore();
    await s.set(STORE_KEY, { cookies });
    await s.save();
  } catch (error) {
    console.error('Error saving cookies:', error);
  }
}

export async function loadSavedCookies(): Promise<string | null> {
  try {
    if (!isTauri) {
      // Clear any legacy persisted cookies from older builds.
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      return null;
    }
    const s = await getStore();
    const data = await s.get<{ cookies: string }>(STORE_KEY);
    if (data?.cookies) {
      setCookies(data.cookies);
      return data.cookies;
    }
    return null;
  } catch (error) {
    console.error('Error loading cookies:', error);
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    if (!isTauri) {
      window.localStorage.removeItem(LOCAL_STORAGE_KEY);
      setCookies('');
      return;
    }
    const s = await getStore();
    await s.delete(STORE_KEY);
    await s.save();
    setCookies('');
  } catch (error) {
    console.error('Error logging out:', error);
  }
}

export async function checkLoginStatus(): Promise<BiliUser | null> {
  const cookies = getCookies();
  if (!cookies) {
    await loadSavedCookies();
  }
  return getCurrentUser();
}
