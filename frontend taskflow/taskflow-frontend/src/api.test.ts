import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
beforeEach(() => {
  vi.resetModules();
  fetchMock.mockReset();
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('fetch', fetchMock);
});
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('API session handling', () => {
  it('shares a single refresh among concurrent expired-token requests', async () => {
    const { api, saveSession } = await import('./api');
    saveSession({ accessToken: 'expired', refreshToken: 'old-refresh' });
    let refreshCount = 0;
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCount++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return json({ accessToken: 'new', refreshToken: 'new-refresh' });
      }
      const headers = init.headers as Record<string, string>;
      return headers.Authorization === 'Bearer new'
        ? json({ ok: true })
        : json({ message: 'expired' }, 401);
    });
    const result = await Promise.all([
      api('/workspaces'),
      api('/users/me'),
      api('/projects/test'),
    ]);
    expect(result).toEqual([{ ok: true }, { ok: true }, { ok: true }]);
    expect(refreshCount).toBe(1);
    expect(
      JSON.parse(sessionStorage.getItem('taskflow.session')!).refreshToken,
    ).toBe('new-refresh');
  });

  it('keeps a session on network failure so the user can retry', async () => {
    const { api, saveSession, hasSession } = await import('./api');
    saveSession({ accessToken: 'old', refreshToken: 'refresh' });
    fetchMock
      .mockResolvedValueOnce(json({}, 401))
      .mockRejectedValueOnce(new TypeError('Network failure'));
    await expect(api('/users/me')).rejects.toThrow('Sunucuya bağlanılamadı');
    expect(hasSession()).toBe(true);
  });

  it('clears rejected refresh sessions and notifies the application', async () => {
    const { api, saveSession, hasSession } = await import('./api');
    saveSession({ accessToken: 'old', refreshToken: 'revoked' });
    const expired = vi.fn();
    window.addEventListener('session-expired', expired);
    fetchMock
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ message: 'revoked' }, 401));
    await expect(api('/users/me')).rejects.toThrow('revoked');
    expect(hasSession()).toBe(false);
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('does not treat invalid login credentials as an expired existing session', async () => {
    const { api } = await import('./api');
    fetchMock.mockResolvedValueOnce(
      json({ message: 'Invalid email or password' }, 401),
    );
    await expect(
      api('/auth/login', { method: 'POST', public: true, body: {} }),
    ).rejects.toThrow('E-posta veya şifre hatalı.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('revokes the token on logout and clears local storage after a 204', async () => {
    const { logout, saveSession, hasSession } = await import('./api');
    saveSession({ accessToken: 'access', refreshToken: 'refresh' });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await logout();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      refreshToken: 'refresh',
    });
    expect(hasSession()).toBe(false);
  });

  it('collects every page rather than silently truncating a board', async () => {
    const { getAll } = await import('./api');
    fetchMock
      .mockResolvedValueOnce(
        json({ data: [{ id: 1 }], meta: { totalPages: 2 } }),
      )
      .mockResolvedValueOnce(
        json({ data: [{ id: 2 }], meta: { totalPages: 2 } }),
      );
    expect(await getAll('/tasks?status=TODO')).toEqual([{ id: 1 }, { id: 2 }]);
    expect(fetchMock.mock.calls[1][0]).toContain('&limit=100&page=2');
  });
});
