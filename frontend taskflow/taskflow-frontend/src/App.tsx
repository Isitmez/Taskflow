import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  ArrowUpRight,
  Archive,
  BarChart3,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDashed,
  FolderKanban,
  LayoutGrid,
  List,
  LogOut,
  Menu,
  MoreHorizontal,
  Palette,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { api, getAll, hasSession, logout } from "./api";
import { Auth } from "./Auth";
import {
  Avatar,
  Brand,
  Empty,
  ErrorBox,
  Modal,
  SaveButton,
  Spinner,
} from "./components";
import { EntityForm } from "./Forms";
import type { FormKind } from "./Forms";
import { TaskDialog } from "./TaskDialog";

type Theme = "light" | "dark" | "ocean" | "sunset" | "lavender";
const themeNames: Record<Theme, string> = {
  light: "Aydınlık",
  dark: "Karanlık",
  ocean: "Okyanus",
  sunset: "Gün batımı",
  lavender: "Lavanta",
};

function readTheme(): Theme {
  try {
    const value = window.localStorage?.getItem?.("taskflow.theme");
    return value && value in themeNames ? (value as Theme) : "light";
  } catch {
    return "light";
  }
}

function saveTheme(theme: Theme) {
  try {
    if (typeof window.localStorage?.setItem === "function") {
      window.localStorage.setItem("taskflow.theme", theme);
    }
  } catch {
    // The theme still works when browser storage is unavailable.
  }
}
import { CalendarView } from "./CalendarView";
import { calendarRange } from "./calendar";
import { DashboardPanel } from "./DashboardPanel";
import { NotificationCenter } from "./NotificationCenter";
import { LifecyclePanel } from "./LifecyclePanel";
import { GlobalSearch } from "./GlobalSearch";
import type {
  CalendarTask,
  Member,
  Priority,
  Project,
  Role,
  Status,
  Task,
  User,
  Workspace,
} from "./types";
import { dateLabel, priorities, roles, statuses } from "./types";

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(hasSession());
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setLoading(false);
      setError("");
    };
    window.addEventListener("session-expired", onExpired);
    return () => window.removeEventListener("session-expired", onExpired);
  }, []);
  useEffect(() => {
    if (!hasSession()) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<User>("/auth/me", { signal: controller.signal })
      .then(setUser)
      .catch((e) => {
        if (e.name !== "AbortError" && e.status !== 401) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  if (loading)
    return (
      <div className="boot">
        <Brand dark />
        <Spinner label="Çalışma alanın hazırlanıyor…" />
      </div>
    );
  if (error && hasSession())
    return (
      <div className="boot">
        <Brand dark />
        <ErrorBox message={error} retry={() => setRetry((n) => n + 1)} />
      </div>
    );
  return user ? (
    <Dashboard user={user} onUser={setUser} onLogout={() => setUser(null)} />
  ) : (
    <Auth onLogin={setUser} />
  );
}

function Dashboard({
  user,
  onUser,
  onLogout,
}: {
  user: User;
  onUser: (u: User) => void;
  onLogout: () => void;
}) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendarTasks, setCalendarTasks] = useState<CalendarTask[]>([]);
  const [view, setView] = useState<
    "board" | "dashboard" | "archive" | "trash" | "members" | "settings"
  >("board");
  const [layout, setLayout] = useState<"board" | "list" | "calendar">("board");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [status, setStatus] = useState("");
  const [mine, setMine] = useState(false);
  const [sort, setSort] = useState("createdAt");
  const [filters, setFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [error, setError] = useState("");
  const [scopeError, setScopeError] = useState("");
  const [taskError, setTaskError] = useState("");
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const [scopeVersion, setScopeVersion] = useState(0);
  const [taskVersion, setTaskVersion] = useState(0);
  const [form, setForm] = useState<{ kind: FormKind; edit?: boolean } | null>(
    null,
  );
  const [taskDialog, setTaskDialog] = useState<{
    task?: Task;
    status?: Status;
  } | null>(null);
  const [toast, setToast] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [theme, setTheme] = useState<Theme>(readTheme);
  const workspace = workspaces.find((w) => w.id === workspaceId);
  const project = projects.find((p) => p.id === projectId);
  const membership = members.find((m) => m.userId === user.id);
  const role: Role = membership?.role || "MEMBER";
  const canManage = role !== "MEMBER";
  const notice = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    document.body.classList.remove(
      ...Object.keys(themeNames).map((name) => `theme-${name}`),
    );
    document.body.classList.add(`theme-${theme}`);
    saveTheme(theme);
  }, [theme]);
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("invite");
    if (!token) return;
    api<Workspace>(`/workspaces/invitations/${token}/accept`, { method: "POST" })
      .then((accepted) => {
        window.history.replaceState({}, "", window.location.pathname);
        setWorkspaceVersion((value) => value + 1);
        setWorkspaceId(accepted.id);
        notice("Çalışma alanı daveti kabul edildi.");
      })
      .catch((reason) => setActionError(reason.message));
  }, [notice]);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api<Workspace[]>("/workspaces", { signal: controller.signal })
      .then((data) => {
        setWorkspaces(data);
        setWorkspaceId((id) =>
          data.some((w) => w.id === id) ? id : data[0]?.id || "",
        );
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [workspaceVersion]);
  useEffect(() => {
    setProjects([]);
    setMembers([]);
    setTasks([]);
    setScopeError("");
    if (!workspaceId) {
      setProjectId("");
      return;
    }
    const controller = new AbortController();
    setScopeLoading(true);
    Promise.all([
      getAll<Project>(`/workspaces/${workspaceId}/projects`, controller.signal),
      api<Member[]>(`/workspaces/${workspaceId}/members`, {
        signal: controller.signal,
      }),
    ])
      .then(([p, m]) => {
        setProjects(p);
        setMembers(m);
        setProjectId((id) =>
          p.some((item) => item.id === id)
            ? id
            : p.find((item) => item.status === "ACTIVE")?.id || p[0]?.id || "",
        );
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setScopeError(e.message);
          setProjectId("");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setScopeLoading(false);
      });
    return () => controller.abort();
  }, [workspaceId, scopeVersion]);
  useEffect(() => {
    setTasks([]);
    setTaskError("");
    if (!projectId || scopeLoading) return;
    const controller = new AbortController();
    setTasksLoading(true);
    const query = new URLSearchParams({
      sortBy: sort,
      sortOrder: sort === "createdAt" ? "desc" : "asc",
    });
    if (debouncedSearch.trim()) query.set("search", debouncedSearch.trim());
    if (priority) query.set("priority", priority);
    if (status) query.set("status", status);
    if (mine) query.set("assigneeId", user.id);
    getAll<Task>(`/projects/${projectId}/tasks?${query}`, controller.signal)
      .then(setTasks)
      .catch((e) => {
        if (e.name !== "AbortError") setTaskError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setTasksLoading(false);
      });
    return () => controller.abort();
  }, [
    projectId,
    scopeLoading,
    taskVersion,
    debouncedSearch,
    priority,
    status,
    mine,
    sort,
    user.id,
  ]);
  useEffect(() => {
    setCalendarTasks([]);
    setCalendarError("");
    if (layout !== "calendar" || !projectId || scopeLoading) return;
    const controller = new AbortController();
    const range = calendarRange(calendarMonth);
    const query = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    });
    if (debouncedSearch.trim()) query.set("search", debouncedSearch.trim());
    if (priority) query.set("priority", priority);
    if (status) query.set("status", status);
    if (mine) query.set("assigneeId", user.id);
    setCalendarLoading(true);
    api<CalendarTask[]>(`/projects/${projectId}/calendar?${query}`, {
      signal: controller.signal,
    })
      .then(setCalendarTasks)
      .catch((e) => {
        if (e.name !== "AbortError") setCalendarError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCalendarLoading(false);
      });
    return () => controller.abort();
  }, [
    layout,
    projectId,
    scopeLoading,
    calendarMonth,
    taskVersion,
    debouncedSearch,
    priority,
    status,
    mine,
    user.id,
  ]);
  function chooseWorkspace(id: string) {
    setWorkspaceId(id);
    setProjectId("");
    setTasks([]);
    setTaskDialog(null);
    setView("board");
    setMobileOpen(false);
    resetFilters();
  }
  function chooseProject(id: string) {
    setProjectId(id);
    setTaskDialog(null);
    setView("board");
    setMobileOpen(false);
    resetFilters();
  }
  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setPriority("");
    setStatus("");
    setMine(false);
  }
  const filtered = !!(search || priority || status || mine);
  const done = tasks.filter((t) => t.status === "DONE").length;
  async function signOut() {
    setLogoutBusy(true);
    setActionError("");
    try {
      await logout();
      onLogout();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setLogoutBusy(false);
    }
  }
  async function openNotificationTask(
    taskId: string,
    targetProjectId: string,
    targetWorkspaceId: string,
  ) {
    setActionError("");
    try {
      const selected = await api<Task>(`/tasks/${taskId}`);
      setWorkspaceId(targetWorkspaceId);
      setProjectId(targetProjectId);
      setView("board");
      setTaskDialog({ task: selected });
    } catch (e) {
      setActionError((e as Error).message);
    }
  }
  async function rescheduleTask(task: CalendarTask, date: Date) {
    setActionError("");
    const due = new Date(date);
    due.setHours(23, 59, 59, 0);
    try {
      await api<Task>(`/tasks/${task.id}`, {
        method: "PATCH",
        body: { dueDate: due.toISOString(), expectedUpdatedAt: task.updatedAt },
      });
      setTaskVersion((value) => value + 1);
      notice("Görevin tarihi güncellendi.");
    } catch (e) {
      setActionError((e as Error).message);
    }
  }
  function savedEntity(result: Workspace | Project | User) {
    if (form?.kind === "workspace") {
      setWorkspaces((items) => [...items, result as Workspace]);
      chooseWorkspace(result.id);
    }
    if (form?.kind === "project") {
      setProjectId(result.id);
      setScopeVersion((n) => n + 1);
      setView("board");
    }
    if (form?.kind === "member") setScopeVersion((n) => n + 1);
    if (form?.kind === "profile") {
      onUser(result as User);
      setScopeVersion((n) => n + 1);
    }
    notice("Değişiklikler kaydedildi.");
  }
  async function changeRole(member: Member, newRole: string) {
    setActionError("");
    try {
      await api(`/workspaces/${workspaceId}/members/${member.id}`, {
        method: "PATCH",
        body: { role: newRole },
      });
      setScopeVersion((n) => n + 1);
      notice("Üye rolü güncellendi.");
    } catch (e) {
      setActionError((e as Error).message);
    }
  }
  function removeMember(member: Member) {
    setConfirm({
      title:
        member.userId === user.id ? "Çalışma alanından ayrıl" : "Üyeyi çıkar",
      message: `${member.user.name} bu alanın proje ve görevlerine erişimini kaybedecek. Mevcut görev atamaları kaldırılacak.`,
      action: async () => {
        await api(`/workspaces/${workspaceId}/members/${member.id}`, {
          method: "DELETE",
        });
        if (member.userId === user.id) {
          setWorkspaceId("");
          setWorkspaceVersion((n) => n + 1);
        } else setScopeVersion((n) => n + 1);
        notice("Üyelik güncellendi.");
      },
    });
  }
  function deleteProject() {
    if (!project) return;
    setConfirm({
      title: "Projeyi sil",
      message: `“${project.name}” ve içindeki tüm görevler ve yorumlar kalıcı olarak silinecek.`,
      action: async () => {
        await api(
          `/projects/${project.id}?expectedUpdatedAt=${encodeURIComponent(
            project.updatedAt,
          )}`,
          { method: "DELETE" },
        );
        setProjectId("");
        setScopeVersion((n) => n + 1);
        notice("Proje silindi.");
      },
    });
  }
  return (
    <div className="app-shell">
      {mobileOpen && (
        <button
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Menüyü kapat"
        />
      )}
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <Brand />
        <div className="workspace-switch">
          <span className="workspace-emblem">
            {workspace?.name[0]?.toLocaleUpperCase("tr") || "T"}
          </span>
          <label>
            <span>ÇALIŞMA ALANI</span>
            <select
              aria-label="Çalışma alanı seç"
              value={workspaceId}
              onChange={(e) => chooseWorkspace(e.target.value)}
            >
              {!workspaces.length && <option value="">Alan seç</option>}
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          <ChevronDown size={15} />
        </div>
        <button
          className="sidebar-new"
          onClick={() => setForm({ kind: "workspace" })}
        >
          <Plus size={14} /> Yeni çalışma alanı
        </button>
        <div className="nav-label">ÇALIŞMA ALANIN</div>
        <nav>
          <button
            className={view === "board" ? "active" : ""}
            onClick={() => {
              setView("board");
              setMobileOpen(false);
            }}
          >
            <LayoutGrid size={17} /> Görev panosu <ChevronRight size={14} />
          </button>
          <button
            className={view === "dashboard" ? "active" : ""}
            disabled={!workspace}
            onClick={() => {
              setView("dashboard");
              setMobileOpen(false);
            }}
          >
            <BarChart3 size={17} /> Raporlar
          </button>
          <button className={view === "archive" ? "active" : ""} disabled={!workspace} onClick={() => { setView("archive"); setMobileOpen(false); }}>
            <Archive size={17} /> Arşiv
          </button>
          <button className={view === "trash" ? "active" : ""} disabled={!workspace} onClick={() => { setView("trash"); setMobileOpen(false); }}>
            <Trash2 size={17} /> Çöp kutusu
          </button>
          <button
            className={view === "members" ? "active" : ""}
            disabled={!workspace}
            onClick={() => {
              setView("members");
              setMobileOpen(false);
            }}
          >
            <Users size={17} /> Ekip üyeleri{" "}
            <span className="nav-count">{members.length || "—"}</span>
          </button>
          <button
            className={view === "settings" ? "active" : ""}
            disabled={!workspace}
            onClick={() => {
              setView("settings");
              setMobileOpen(false);
            }}
          >
            <Settings2 size={17} /> Alan ayarları
          </button>
        </nav>
        <div className="nav-label projects-label">
          PROJELER{" "}
          {canManage && workspace && (
            <button
              className="icon-button"
              aria-label="Yeni proje"
              onClick={() => setForm({ kind: "project" })}
            >
              <Plus size={16} />
            </button>
          )}
        </div>
        <div className="sidebar-projects">
          {projects.map((p, i) => (
            <button
              key={p.id}
              className={
                p.id === projectId && view === "board" ? "selected" : ""
              }
              onClick={() => chooseProject(p.id)}
            >
              <span className={`project-dot dot-${i % 4}`} />
              <span>{p.name}</span>
              {p.status === "ARCHIVED" && (
                <span className="archived-mark">arşiv</span>
              )}
            </button>
          ))}
          {!projects.length && (
            <p className="sidebar-empty">Projelerin burada görünecek.</p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-symbol">
              <Sparkles size={20} />
            </span>
            <strong>
              Küçük adımlar.
              <br />
              Büyük ilerleme.
            </strong>
            <p>
              Bugün bir işi daha
              <br />
              tamamlamaya ne dersin?
            </p>
          </div>
          <div className="profile-row">
            <button
              onClick={() => setForm({ kind: "profile" })}
              className="profile-button"
            >
              <Avatar name={user.name} />
              <span>
                <strong>{user.name}</strong>
                <small>{membership ? roles[role] : "Hesabım"}</small>
              </span>
            </button>
            <button
              className="icon-button"
              aria-label="Çıkış yap"
              title="Çıkış yap"
              disabled={logoutBusy}
              onClick={signOut}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Menüyü aç"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={20} />
            </button>
            <span>{workspace?.name || "Çalışma alanın"}</span>
            <ChevronRight size={13} />
            <strong>
              {view === "members"
                ? "Ekip üyeleri"
                : view === "dashboard"
                  ? "Raporlar"
                : view === "archive"
                  ? "Arşiv"
                : view === "trash"
                  ? "Çöp kutusu"
                : view === "settings"
                  ? "Alan ayarları"
                  : project?.name || "Projeler"}
            </strong>
          </div>
          <div className="topbar-right">
            {workspace && (
              <GlobalSearch
                workspaceId={workspace.id}
                onTask={(taskId, targetProjectId) =>
                  openNotificationTask(taskId, targetProjectId, workspace.id)
                }
                onProject={chooseProject}
                onMembers={() => setView("members")}
              />
            )}
            <label className="theme-picker" title="Renk teması">
              <Palette size={16} />
              <select
                aria-label="Renk teması"
                value={theme}
                onChange={(event) => setTheme(event.target.value as Theme)}
              >
                {(Object.keys(themeNames) as Theme[]).map((value) => (
                  <option key={value} value={value}>
                    {themeNames[value]}
                  </option>
                ))}
              </select>
            </label>
            <NotificationCenter
              refreshKey={taskVersion}
              onTask={openNotificationTask}
            />
            <span className="today">
              <CalendarDays size={14} />
              {new Date().toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
              })}
            </span>
            <span className="topbar-separator" />
            <Avatar name={user.name} small />
          </div>
        </header>
        <main className="main-content">
          {actionError && (
            <div className="action-error">
              <ErrorBox message={actionError} />
              <button
                className="icon-button"
                aria-label="Hata mesajını kapat"
                onClick={() => setActionError("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {loading ? (
            <Spinner label="Çalışma alanları yükleniyor…" />
          ) : error ? (
            <ErrorBox
              message={error}
              retry={() => setWorkspaceVersion((n) => n + 1)}
            />
          ) : !workspace ? (
            <div className="welcome-empty">
              <span className="little-label">
                MERHABA, {user.name.split(" ")[0].toLocaleUpperCase("tr")}
              </span>
              <h1>
                Her güzel iş,
                <br />
                bir başlangıç ister.
              </h1>
              <p>
                İlk çalışma alanını oluştur, ekibini bir araya getir
                <br />
                ve fikirlerini adım adım hayata geçir.
              </p>
              <button
                className="button primary"
                onClick={() => setForm({ kind: "workspace" })}
              >
                <Plus size={17} /> Çalışma alanı oluştur
              </button>
              <div className="welcome-steps">
                <span>
                  01 <strong>Alanını oluştur</strong>
                </span>
                <ArrowRight size={17} />
                <span>
                  02 <strong>Ekibini ekle</strong>
                </span>
                <ArrowRight size={17} />
                <span>
                  03 <strong>İşe koyul</strong>
                </span>
              </div>
            </div>
          ) : scopeLoading ? (
            <Spinner label="Proje ve ekip bilgileri yükleniyor…" />
          ) : scopeError ? (
            <ErrorBox
              message={scopeError}
              retry={() => setScopeVersion((n) => n + 1)}
            />
          ) : view === "dashboard" ? (
            <DashboardPanel workspaceId={workspace.id} />
          ) : view === "archive" || view === "trash" ? (
            <LifecyclePanel
              workspaceId={workspace.id}
              kind={view}
              onChanged={() => setTaskVersion((value) => value + 1)}
            />
          ) : view === "members" ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="little-label">ÇALIŞMA ALANI ÜYELERİ</span>
                  <h1>Ekip üyeleri</h1>
                  <p>Ortak hedefler, farklı yetenekler. Aynı çalışma alanı.</p>
                </div>
                {canManage && (
                  <button
                    className="button primary"
                    onClick={() => setForm({ kind: "member" })}
                  >
                    <Plus size={17} /> Üye ekle
                  </button>
                )}
              </div>
              <div className="members-table">
                <div className="table-header">
                  <span>EKİP ÜYESİ · {members.length}</span>
                  <span>ROL</span>
                  <span />
                </div>
                {members.map((member) => (
                  <div className="member-row" key={member.id}>
                    <div className="member-person">
                      <Avatar name={member.user.name} />
                      <span>
                        <strong>
                          {member.user.name}{" "}
                          {member.userId === user.id && <small>(sen)</small>}
                        </strong>
                        <small>{member.user.email}</small>
                      </span>
                    </div>
                    <div>
                      {role === "OWNER" && member.role !== "OWNER" ? (
                        <select
                          aria-label={`${member.user.name} rolü`}
                          value={member.role}
                          onChange={(e) => changeRole(member, e.target.value)}
                        >
                          <option value="MEMBER">Üye</option>
                          <option value="ADMIN">Yönetici</option>
                        </select>
                      ) : (
                        <span
                          className={`role-badge role-${member.role.toLowerCase()}`}
                        >
                          {roles[member.role]}
                        </span>
                      )}
                    </div>
                    <div className="member-action">
                      {member.role !== "OWNER" &&
                        (member.userId === user.id ||
                          role === "OWNER" ||
                          (role === "ADMIN" && member.role === "MEMBER")) && (
                          <button
                            className="text-button danger-text"
                            onClick={() => removeMember(member)}
                          >
                            {member.userId === user.id ? "Ayrıl" : "Çıkar"}
                          </button>
                        )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="section-footnote">
                Bu alandaki proje ve görevler yalnızca ekip üyeleri tarafından
                görüntülenebilir.
              </p>
            </>
          ) : view === "settings" ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="little-label">
                    SENİN ALANIN, SENİN DÜZENİN
                  </span>
                  <h1>Alan ayarları.</h1>
                  <p>Çalışma alanının temel bilgilerini yönet.</p>
                </div>
              </div>
              <WorkspaceSettings
                key={workspace.id}
                workspace={workspace}
                canManage={canManage}
                onUpdated={(w) => {
                  setWorkspaces((all) =>
                    all.map((item) => (item.id === w.id ? w : item)),
                  );
                  notice("Çalışma alanı güncellendi.");
                }}
              />
              {role === "OWNER" && (
                <div className="danger-section">
                  <div>
                    <h3>Çalışma alanını sil</h3>
                    <p>
                      Alan, projeler, görevler ve yorumlar kalıcı olarak
                      silinir.
                    </p>
                  </div>
                  <button
                    className="button danger-outline"
                    onClick={() =>
                      setConfirm({
                        title: "Çalışma alanını sil",
                        message: `“${workspace.name}” ve içindeki tüm veriler kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
                        action: async () => {
                          await api(
                            `/workspaces/${workspace.id}?expectedUpdatedAt=${encodeURIComponent(
                              workspace.updatedAt,
                            )}`,
                            { method: "DELETE" },
                          );
                          setWorkspaceId("");
                          setWorkspaceVersion((n) => n + 1);
                          setView("board");
                          notice("Çalışma alanı silindi.");
                        },
                      })
                    }
                  >
                    Alanı sil
                  </button>
                </div>
              )}
            </>
          ) : !project ? (
            <Empty
              icon={<FolderKanban size={32} />}
              title="Henüz proje yok."
              description={
                canManage
                  ? "Bir proje oluştur ve yapılacak işleri bir araya getir."
                  : "Yöneticin bir proje oluşturduğunda burada göreceksin."
              }
              action={
                canManage && (
                  <button
                    className="button primary"
                    onClick={() => setForm({ kind: "project" })}
                  >
                    <Plus size={16} /> Proje oluştur
                  </button>
                )
              }
            />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="project-kicker">
                    <span className="little-label">PROJE ÇALIŞMA ALANI</span>
                    <span
                      className={`project-status ${project.status === "ARCHIVED" ? "is-archived" : ""}`}
                    >
                      <span />
                      {project.status === "ACTIVE"
                        ? "Aktif proje"
                        : "Arşivlenmiş"}
                    </span>
                  </div>
                  <h1>
                    {project.name}
                    <span className="heading-dot">.</span>
                  </h1>
                  <p>
                    {project.description ||
                      "Büyük resmi gör. Bir sonraki adıma odaklan."}
                  </p>
                </div>
                <div className="heading-actions">
                  {canManage && (
                    <details className="project-menu">
                      <summary
                        className="icon-button"
                        aria-label="Proje işlemleri"
                      >
                        <MoreHorizontal size={22} />
                      </summary>
                      <div>
                        <button
                          onClick={() =>
                            setForm({ kind: "project", edit: true })
                          }
                        >
                          Projeyi düzenle
                        </button>
                        <button className="danger-text" onClick={deleteProject}>
                          Projeyi sil
                        </button>
                      </div>
                    </details>
                  )}
                  <button
                    className="button primary"
                    onClick={() => setTaskDialog({})}
                  >
                    <Plus size={18} /> Yeni görev
                  </button>
                </div>
              </div>
              <section className="overview-strip">
                <div className="overview-intro">
                  <span className="overview-icon">
                    <FolderKanban size={21} />
                  </span>
                  <div>
                    <strong>Her adım bir ilerleme.</strong>
                    <p>
                      {filtered
                        ? "Seçili filtrelere göre görev özeti."
                        : "Projenin bugünkü fotoğrafı."}
                    </p>
                  </div>
                </div>
                <div className="metric">
                  <span>Toplam görev</span>
                  <strong>
                    {tasksLoading
                      ? "—"
                      : tasks.length.toString().padStart(2, "0")}
                  </strong>
                </div>
                <div className="metric">
                  <span>Devam ediyor</span>
                  <strong>
                    {tasksLoading
                      ? "—"
                      : tasks
                          .filter((t) => t.status === "IN_PROGRESS")
                          .length.toString()
                          .padStart(2, "0")}
                    <span className="metric-dot" />
                  </strong>
                </div>
                <div className="metric progress-metric">
                  <span>Tamamlanan</span>
                  <strong>
                    {tasksLoading ? "—" : done.toString().padStart(2, "0")}
                    <span className="progress-track">
                      <span
                        style={{
                          width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
                        }}
                      />
                    </span>
                    <small>
                      {tasks.length
                        ? Math.round((done / tasks.length) * 100)
                        : 0}
                      %
                    </small>
                  </strong>
                </div>
              </section>
              <div className="board-tabs">
                <div>
                  <button
                    className={layout === "board" ? "selected" : ""}
                    onClick={() => setLayout("board")}
                  >
                    <LayoutGrid size={16} /> Pano görünümü
                  </button>
                  <button
                    className={layout === "list" ? "selected" : ""}
                    onClick={() => setLayout("list")}
                  >
                    <List size={17} /> Liste
                  </button>
                  <button
                    className={layout === "calendar" ? "selected" : ""}
                    onClick={() => setLayout("calendar")}
                  >
                    <CalendarDays size={17} /> Takvim
                  </button>
                </div>
                <div className="team-preview">
                  <div className="avatar-stack">
                    {members.slice(0, 3).map((m) => (
                      <Avatar key={m.id} name={m.user.name} small />
                    ))}
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setView("members")}
                  >
                    {members.length} ekip üyesi <ArrowUpRight size={14} />
                  </button>
                </div>
              </div>
              <div className="board-toolbar">
                <div className="search-field">
                  <Search size={17} />
                  <input
                    aria-label="Görev ara"
                    placeholder="Bu projede görev ara…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    maxLength={150}
                  />
                  {search && (
                    <button
                      className="icon-button"
                      aria-label="Aramayı temizle"
                      onClick={() => setSearch("")}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <div className="toolbar-right">
                  <button
                    className={`button filter-button ${mine ? "is-on" : ""}`}
                    onClick={() => setMine(!mine)}
                  >
                    <Circle size={14} /> Bana atananlar
                  </button>
                  <button
                    className={`button filter-button ${filters || priority || status ? "is-on" : ""}`}
                    onClick={() => setFilters(!filters)}
                  >
                    <SlidersHorizontal size={15} /> Filtrele
                  </button>
                  {layout !== "calendar" && <label className="sort-select">
                    <ArrowDownWideNarrow size={16} />
                    <select
                      aria-label="Görevleri sırala"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="createdAt">En yeni</option>
                      <option value="dueDate">Son tarih</option>
                      <option value="title">Başlık A–Z</option>
                    </select>
                  </label>}
                </div>
              </div>
              {filters && (
                <div className="filter-row">
                  <label>
                    Öncelik
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="">Tüm öncelikler</option>
                      {Object.entries(priorities).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Durum
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="">Tüm durumlar</option>
                      {statuses.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {filtered && (
                    <button className="text-button" onClick={resetFilters}>
                      Filtreleri temizle <X size={13} />
                    </button>
                  )}
                </div>
              )}
              {layout === "calendar" ? (
                calendarLoading ? (
                  <Spinner label="Takvim yükleniyor…" />
                ) : calendarError ? (
                  <ErrorBox
                    message={calendarError}
                    retry={() => setTaskVersion((n) => n + 1)}
                  />
                ) : (
                  <CalendarView
                    month={calendarMonth}
                    tasks={calendarTasks}
                    onMonthChange={setCalendarMonth}
                    onTask={(task) => setTaskDialog({ task })}
                    onReschedule={rescheduleTask}
                  />
                )
              ) : tasksLoading ? (
                <Spinner label="Görevler yükleniyor…" />
              ) : taskError ? (
                <ErrorBox
                  message={taskError}
                  retry={() => setTaskVersion((n) => n + 1)}
                />
              ) : !tasks.length && filtered ? (
                <Empty
                  icon={<Search size={26} />}
                  title="Bu aramada görev bulunamadı."
                  description="Başka bir kelime dene veya filtreleri temizle."
                  action={
                    <button className="button" onClick={resetFilters}>
                      Filtreleri temizle
                    </button>
                  }
                />
              ) : layout === "board" ? (
                <div className="kanban">
                  {statuses.map((s) => (
                    <section
                      className={`kanban-column column-${s.value.toLowerCase()}`}
                      key={s.value}
                    >
                      <header>
                        <div>
                          <span
                            className="status-dot"
                            style={{ background: s.color }}
                          />
                          <h2>{s.label}</h2>
                          <span className="column-count">
                            {tasks.filter((t) => t.status === s.value).length}
                          </span>
                        </div>
                        <button
                          className="icon-button"
                          aria-label={`${s.label} durumuna görev ekle`}
                          onClick={() => setTaskDialog({ status: s.value })}
                        >
                          <Plus size={17} />
                        </button>
                      </header>
                      <div className="column-tasks">
                        {tasks
                          .filter((t) => t.status === s.value)
                          .map((t) => (
                            <TaskCard
                              key={t.id}
                              task={t}
                              members={members}
                              onClick={() => setTaskDialog({ task: t })}
                            />
                          ))}
                        {!tasks.some((t) => t.status === s.value) && (
                          <div className="column-empty">
                            {s.value === "DONE" ? (
                              <CheckCheck size={23} />
                            ) : (
                              <CircleDashed size={23} />
                            )}
                            <p>
                              {s.value === "DONE"
                                ? "Güzel işler burada birikir."
                                : "Bir sonraki adım için yer var."}
                            </p>
                          </div>
                        )}
                      </div>
                      <button
                        className="add-task"
                        onClick={() => setTaskDialog({ status: s.value })}
                      >
                        <Plus size={15} /> Görev ekle
                      </button>
                    </section>
                  ))}
                </div>
              ) : (
                <div className="task-list">
                  <div className="task-list-header">
                    <span>GÖREV</span>
                    <span>DURUM</span>
                    <span>ÖNCELİK</span>
                    <span>SORUMLU</span>
                    <span>SON TARİH</span>
                  </div>
                  {tasks.map((t) => (
                    <button
                      key={t.id}
                      className="task-list-row"
                      onClick={() => setTaskDialog({ task: t })}
                    >
                      <strong>{t.title}</strong>
                      <span>
                        {statuses.find((s) => s.value === t.status)?.label}
                      </span>
                      <span>
                        <PriorityBadge priority={t.priority} />
                      </span>
                      <span>
                        {members.find((m) => m.userId === t.assigneeId)?.user
                          .name || "Atanmadı"}
                      </span>
                      <span>{t.dueDate ? dateLabel(t.dueDate) : "—"}</span>
                    </button>
                  ))}
                  {!tasks.length && (
                    <Empty
                      icon={<List size={24} />}
                      title="Henüz görev yok."
                      description="Bu projeye bir görev ekle."
                      action={
                        <button
                          className="button"
                          onClick={() => setTaskDialog({})}
                        >
                          <Plus size={15} /> Görev ekle
                        </button>
                      }
                    />
                  )}
                </div>
              )}
              <footer className="board-footer">
                <span>
                  <span className="small-leaf">✳</span> Birlikte, bir adım
                  ileri.
                </span>
                <span>
                  Görev detaylarını açmak için bir karta tıkla{" "}
                  <ArrowUpRight size={13} />
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
      {form && (
        <EntityForm
          kind={form.kind}
          workspace={workspace}
          project={form.edit ? project : undefined}
          user={user}
          role={role}
          onClose={() => setForm(null)}
          onSaved={savedEntity}
        />
      )}
      {taskDialog && project && workspace && (
        <TaskDialog
          task={taskDialog.task}
          defaultStatus={taskDialog.status}
          projectId={project.id}
          workspaceId={workspace.id}
          members={members}
          user={user}
          role={role}
          onClose={() => setTaskDialog(null)}
          onSaved={() => {
            setTaskVersion((n) => n + 1);
            notice("Görevler güncellendi.");
          }}
        />
      )}
      {confirm && (
        <Modal
          title={confirm.title}
          onClose={() => {
            if (!confirmBusy) {
              setConfirm(null);
              setActionError("");
            }
          }}
        >
          <div className="modal-form">
            <p>{confirm.message}</p>
            {actionError && <ErrorBox message={actionError} />}
            <div className="form-footer">
              <button
                className="button"
                disabled={confirmBusy}
                onClick={() => {
                  setConfirm(null);
                  setActionError("");
                }}
              >
                Vazgeç
              </button>
              <button
                className="button danger"
                disabled={confirmBusy}
                onClick={async () => {
                  setConfirmBusy(true);
                  setActionError("");
                  try {
                    await confirm.action();
                    setConfirm(null);
                  } catch (e) {
                    setActionError((e as Error).message);
                  } finally {
                    setConfirmBusy(false);
                  }
                }}
              >
                {confirmBusy ? "İşleniyor…" : "Onayla"}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>
            <Check size={16} />
          </span>
          {toast}
          <button
            className="icon-button"
            aria-label="Bildirimi kapat"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`priority priority-${priority.toLowerCase()}`}>
      <span className="priority-bars">
        <i />
        <i />
        <i />
      </span>
      {priorities[priority]}
    </span>
  );
}
function TaskCard({
  task,
  members,
  onClick,
}: {
  task: Task;
  members: Member[];
  onClick: () => void;
}) {
  const assignee = members.find((m) => m.userId === task.assigneeId)?.user;
  const overdue =
    !!task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "DONE";
  return (
    <button
      className={`task-card ${task.status === "DONE" ? "task-done" : ""}`}
      onClick={onClick}
    >
      <div className="task-card-top">
        <span className="task-id">TF-{task.id.slice(0, 4).toUpperCase()}</span>
        <PriorityBadge priority={task.priority} />
      </div>
      <h3>{task.title}</h3>
      {!!task.labels?.length && (
        <div className="task-card-labels">
          {task.labels.slice(0, 3).map(({ label }) => (
            <span key={label.id} style={{ borderColor: label.color }}>
              <i style={{ background: label.color }} /> {label.name}
            </span>
          ))}
        </div>
      )}
      {task.description && <p>{task.description}</p>}
      <div className="task-card-bottom">
        <span className={overdue ? "overdue" : ""}>
          <CalendarDays size={12} />
          {task.dueDate ? dateLabel(task.dueDate) : "Tarih yok"}
        </span>
        {assignee ? (
          <Avatar name={assignee.name} small />
        ) : (
          <span className="unassigned" title="Henüz atanmadı">
            <Users size={13} />
          </span>
        )}
      </div>
    </button>
  );
}
function WorkspaceSettings({
  workspace,
  canManage,
  onUpdated,
}: {
  workspace: Workspace;
  canManage: boolean;
  onUpdated: (w: Workspace) => void;
}) {
  const [name, setName] = useState(workspace.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="settings-card"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const result = await api<Workspace>(`/workspaces/${workspace.id}`, {
            method: "PATCH",
            body: {
              name: name.trim(),
              expectedUpdatedAt: workspace.updatedAt,
            },
          });
          onUpdated(result);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Genel bilgiler</h3>
      <label>
        Çalışma alanının adı
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={100}
          readOnly={!canManage}
        />
      </label>
      {error && <ErrorBox message={error} />}
      {canManage ? (
        <SaveButton busy={busy}>Değişiklikleri kaydet</SaveButton>
      ) : (
        <p className="muted">
          Bu bilgileri yalnızca alan sahibi ve yöneticiler değiştirebilir.
        </p>
      )}
    </form>
  );
}
