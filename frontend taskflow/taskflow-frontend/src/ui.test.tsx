// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { Auth } from './Auth';
import { TaskDialog } from './TaskDialog';
import { saveSession } from './api';
import type { CalendarTask, Member, Task } from './types';

const fetchMock = vi.fn();
const user = { id: 'user-1', name: 'Test User', email: 'test@example.com' };
const workspace = { id: 'ws-1', name: 'Test Team', ownerId: user.id };
const project = {
  id: 'project-1',
  workspaceId: workspace.id,
  name: 'Website',
  status: 'ACTIVE',
  description: 'A real API-connected project',
};
const member: Member = { id: 'member-1', userId: user.id, role: 'OWNER', user };
const task: Task = {
  id: 'task-1',
  projectId: project.id,
  title: 'First task',
  description: 'Details',
  status: 'TODO',
  priority: 'MEDIUM',
  assigneeId: null,
  createdById: user.id,
  dueDate: '2028-01-15T12:30:00.000Z',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  sessionStorage.clear();
  saveSession(null);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Frontend user flows', () => {
  it('fills demo credentials without logging in until the user submits', async () => {
    const onLogin = vi.fn();
    render(<Auth onLogin={onLogin} />);
    await userEvent.click(
      screen.getByRole('button', { name: /Örnek hesabı dene/ }),
    );
    expect(
      (screen.getByLabelText('E-posta adresi') as HTMLInputElement).value,
    ).toBe('alice@example.com');
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock
      .mockResolvedValueOnce(
        json({ accessToken: 'access', refreshToken: 'refresh' }),
      )
      .mockResolvedValueOnce(json(user));
    await userEvent.click(screen.getByRole('button', { name: 'Giriş yap' }));
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(user));
  });

  it('validates registration password rules and sends a valid registration payload', async () => {
    const onLogin = vi.fn();
    render(<Auth onLogin={onLogin} />);
    await userEvent.click(
      screen.getByRole('button', { name: /Hesap oluştur/ }),
    );
    await userEvent.type(screen.getByLabelText('Adın'), user.name);
    await userEvent.type(screen.getByLabelText('E-posta adresi'), user.email);
    await userEvent.type(
      screen.getByLabelText(/^Şifre/, { selector: 'input' }),
      'weakpassword',
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Hesap oluştur' }),
    );
    expect(screen.getByRole('alert').textContent).toContain('bir büyük harf');
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.clear(
      screen.getByLabelText(/^Şifre/, { selector: 'input' }),
    );
    await userEvent.type(
      screen.getByLabelText(/^Şifre/, { selector: 'input' }),
      'StrongPassword1!',
    );
    fetchMock
      .mockResolvedValueOnce(
        json({ accessToken: 'access', refreshToken: 'refresh' }),
      )
      .mockResolvedValueOnce(json(user));
    await userEvent.click(
      screen.getByRole('button', { name: 'Hesap oluştur' }),
    );
    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(user));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      email: user.email,
      name: user.name,
      password: 'StrongPassword1!',
    });
  });

  it('loads the workspace board, opens the task form and persists a created task', async () => {
    saveSession({ accessToken: 'access', refreshToken: 'refresh' });
    const taskList: Task[] = [];
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      const path = new URL(url).pathname;
      if (path === '/auth/me') return json(user);
      if (path === '/workspaces') return json([workspace]);
      if (path.endsWith('/projects'))
        return json({ data: [project], meta: { totalPages: 1 } });
      if (path.endsWith('/members')) return json([member]);
      if (path.endsWith('/search'))
        return json({
          total: 1,
          projects: [],
          comments: [],
          members: [],
          tasks: [
            {
              ...task,
              title: 'Global result',
              project: { name: project.name },
            },
          ],
        });
      if (path.endsWith('/tasks') && init.method === 'POST') {
        const created = { ...task, ...JSON.parse(init.body as string) };
        taskList.push(created);
        return json(created, 201);
      }
      if (path.endsWith('/tasks'))
        return json({ data: taskList, meta: { totalPages: 1 } });
      throw new Error(`Unexpected request ${path}`);
    });
    render(<App />);
    await screen.findByRole('heading', { name: 'Website.' });
    await userEvent.selectOptions(screen.getByLabelText('Renk teması'), 'ocean');
    expect(document.body.classList.contains('theme-ocean')).toBe(true);
    await userEvent.click(
      screen.getByRole('button', { name: 'Çalışma alanında ara' }),
    );
    await userEvent.type(screen.getByLabelText('Global arama'), 'Global');
    await screen.findByText('Global result');
    await userEvent.click(screen.getByRole('button', { name: 'Aramayı kapat' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yeni görev' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(
      within(dialog).getByLabelText('Görev başlığı'),
      'Ship the frontend',
    );
    await userEvent.selectOptions(
      within(dialog).getByLabelText('Öncelik'),
      'HIGH',
    );
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Görev oluştur' }),
    );
    await screen.findByRole('heading', { name: 'Ship the frontend' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(taskList[0]).toMatchObject({
      title: 'Ship the frontend',
      priority: 'HIGH',
      status: 'TODO',
    });
    await userEvent.click(screen.getByRole('button', { name: /^Liste$/ }));
    expect(
      screen.getByRole('button', { name: /Ship the frontend/ }),
    ).toBeTruthy();
  });

  it('loads assigned tasks into the calendar view', async () => {
    saveSession({ accessToken: 'access', refreshToken: 'refresh' });
    const now = new Date();
    const calendarTask: CalendarTask = {
      ...task,
      title: 'Calendar assignment',
      assigneeId: user.id,
      assignee: user,
      dueDate: new Date(
        now.getFullYear(),
        now.getMonth(),
        15,
        12,
      ).toISOString(),
    };
    fetchMock.mockImplementation(async (url: string) => {
      const path = new URL(url).pathname;
      if (path === '/auth/me') return json(user);
      if (path === '/workspaces') return json([workspace]);
      if (path.endsWith('/projects'))
        return json({ data: [project], meta: { totalPages: 1 } });
      if (path.endsWith('/members')) return json([member]);
      if (path.endsWith('/calendar')) return json([calendarTask]);
      if (path.endsWith('/tasks'))
        return json({ data: [], meta: { totalPages: 1 } });
      throw new Error(`Unexpected request ${path}`);
    });
    render(<App />);
    await screen.findByRole('heading', { name: 'Website.' });
    await userEvent.click(screen.getByRole('button', { name: 'Takvim' }));
    expect(await screen.findByText('Calendar assignment')).toBeTruthy();
    const calendarRequest = fetchMock.mock.calls.find(([url]) =>
      new URL(url).pathname.endsWith('/calendar'),
    );
    expect(calendarRequest).toBeTruthy();
    const query = new URL(calendarRequest![0]).searchParams;
    expect(query.has('from')).toBe(true);
    expect(query.has('to')).toBe(true);
  });

  it('hides task deletion for a noncreator member and preserves the exact unchanged deadline', async () => {
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith('/tasks/task-1')
        ? json(task)
        : json({ data: [], meta: { totalPages: 0 } }),
    );
    const onSaved = vi.fn();
    render(
      <TaskDialog
        task={{ ...task, createdById: 'other-user' }}
        projectId={project.id}
        workspaceId={workspace.id}
        user={user}
        members={[member]}
        role="MEMBER"
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Görevi sil' })).toBeNull();
    await userEvent.click(
      screen.getByRole('button', { name: 'Değişiklikleri kaydet' }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const call = fetchMock.mock.calls.find(
      ([, init]) => init.method === 'PATCH',
    );
    expect(JSON.parse(call![1].body).dueDate).toBe(task.dueDate);
  });

  it('posts a comment and displays the server-returned conversation', async () => {
    const comments: object[] = [];
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      if (init.method === 'POST') {
        const comment = {
          id: 'comment-1',
          authorId: user.id,
          createdAt: task.createdAt,
          ...JSON.parse(init.body as string),
        };
        comments.push(comment);
        return json(comment, 201);
      }
      return json({ data: comments, meta: { totalPages: 1 } });
    });
    render(
      <TaskDialog
        task={task}
        projectId={project.id}
        workspaceId={workspace.id}
        user={user}
        members={[member]}
        role="OWNER"
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await userEvent.type(screen.getByLabelText('Yorumun'), 'Ready for review');
    await userEvent.click(screen.getByRole('button', { name: 'Gönder' }));
    await screen.findByText('Ready for review');
    expect(
      (screen.getByLabelText('Yorumun') as HTMLTextAreaElement).value,
    ).toBe('');
  });
});
