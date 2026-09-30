import type { Page } from './types';
export const API_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:3000'
).replace(/\/$/, '');
const KEY = 'taskflow.session';
interface Tokens {
  accessToken: string;
  refreshToken: string;
}
let tokens: Tokens | null = readTokens();
let generation = 0;
let refreshing: Promise<void> | null = null;
function readTokens(): Tokens | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    return typeof value?.accessToken === 'string' &&
      typeof value?.refreshToken === 'string'
      ? value
      : null;
  } catch {
    return null;
  }
}
export function saveSession(value: Tokens | null) {
  generation++;
  tokens = value;
  if (value) sessionStorage.setItem(KEY, JSON.stringify(value));
  else sessionStorage.removeItem(KEY);
}
export const hasSession = () => !!tokens;
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
const messages: Record<string, string> = {
  'Invalid email or password': 'E-posta veya şifre hatalı.',
  'Resource already exists':
    'Bu kayıt zaten var. E-posta adresini veya üyeliği kontrol et.',
  'Workspace access denied': 'Bu çalışma alanına erişim iznin yok.',
  'Insufficient workspace role': 'Bu işlem için yetkin yok.',
  'Assignee must be a member of this workspace':
    'Görev yalnızca bu çalışma alanının bir üyesine atanabilir.',
  'User not found': 'Bu e-posta ile kayıtlı bir kullanıcı bulunamadı.',
  'dueDate cannot be in the past when creating a task':
    'Yeni görevin son tarihi geçmişte olamaz.',
  'Only owners can appoint administrators':
    'Yalnızca çalışma alanı sahibi yönetici atayabilir.',
  'Only owners can manage administrators':
    'Yöneticileri yalnızca çalışma alanı sahibi yönetebilir.',
  'Owner cannot leave or be removed':
    'Çalışma alanının sahibi alandan ayrılamaz.',
  'password must be at most 72 UTF-8 bytes':
    'Şifre çok uzun. Türkçe karakterlerle daha kısa bir şifre kullan.',
};
async function responseError(res: Response) {
  const data = await res.json().catch(() => ({}));
  const value = Array.isArray(data.message)
    ? data.message.join(' · ')
    : data.message;
  if (res.status === 429)
    return new ApiError(
      'Çok fazla istek gönderildi. Bir dakika sonra tekrar dene.',
      429,
    );
  return new ApiError(
    messages[value] || value || 'İşlem tamamlanamadı. Tekrar dene.',
    res.status,
  );
}
async function send(
  path: string,
  method: string,
  body?: unknown,
  signal?: AbortSignal,
  accessToken?: string,
) {
  try {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    return await fetch(`${API_URL}${path}`, {
      method,
      signal,
      headers: {
        ...(body !== undefined && !isForm
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      ...(body !== undefined
        ? { body: isForm ? body : JSON.stringify(body) }
        : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    throw new ApiError(
      'Sunucuya bağlanılamadı. Backend’in çalıştığından emin ol ve tekrar dene.',
      0,
    );
  }
}

export async function downloadBlob(path: string): Promise<Blob> {
  const usedToken = tokens?.accessToken;
  let res = await send(path, 'GET', undefined, undefined, usedToken);
  if (res.status === 401 && tokens) {
    if (tokens.accessToken === usedToken) await refreshSession();
    res = await send(path, 'GET', undefined, undefined, tokens?.accessToken);
  }
  if (!res.ok) throw await responseError(res);
  return res.blob();
}
async function refreshSession() {
  if (!refreshing) {
    const current = tokens;
    const started = generation;
    refreshing = (async () => {
      if (!current) throw new ApiError('Lütfen tekrar giriş yap.', 401);
      const res = await send('/auth/refresh', 'POST', {
        refreshToken: current.refreshToken,
      });
      if (!res.ok) {
        if (res.status === 401 && generation === started) {
          saveSession(null);
          window.dispatchEvent(new Event('session-expired'));
        }
        throw await responseError(res);
      }
      const replacement: Tokens = await res.json();
      if (generation !== started)
        throw new ApiError('Oturum değişti. Tekrar giriş yap.', 401);
      saveSession(replacement);
    })().finally(() => {
      refreshing = null;
    });
  }
  await refreshing;
}
export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    signal?: AbortSignal;
    public?: boolean;
  } = {},
): Promise<T> {
  const method = options.method || 'GET';
  const usedToken = tokens?.accessToken;
  let res = await send(
    path,
    method,
    options.body,
    options.signal,
    options.public ? undefined : usedToken,
  );
  if (res.status === 401 && !options.public && tokens) {
    // Concurrent requests share rotation; late 401 responses reuse the already replaced token.
    if (tokens.accessToken === usedToken) await refreshSession();
    res = await send(
      path,
      method,
      options.body,
      options.signal,
      tokens?.accessToken,
    );
  }
  if (!res.ok) {
    if (res.status === 401 && !options.public) {
      saveSession(null);
      window.dispatchEvent(new Event('session-expired'));
    }
    throw await responseError(res);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
export async function getAll<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T[]> {
  const separator = path.includes('?') ? '&' : '?';
  const result: T[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const data = await api<Page<T>>(
      `${path}${separator}limit=100&page=${page}`,
      { signal },
    );
    result.push(...data.data);
    totalPages = data.meta.totalPages;
    page++;
  } while (page <= totalPages);
  return result;
}
export async function logout() {
  // Let an in-flight rotation settle so logout revokes the latest refresh token.
  if (refreshing) await refreshing.catch(() => undefined);
  const current = tokens;
  if (current) {
    try {
      await api<void>('/auth/logout', {
        method: 'POST',
        body: { refreshToken: current.refreshToken },
        public: true,
      });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
    }
  }
  saveSession(null);
}
