import { Bell, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { Notification } from "./types";
import { dateLabel } from "./types";

export function NotificationCenter({
  refreshKey,
  onTask,
}: {
  refreshKey: number;
  onTask: (taskId: string, projectId: string, workspaceId: string) => void;
}) {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    api<{ data: Notification[]; unread: number }>("/notifications")
      .then((result) => {
        setItems(result.data);
        setUnread(result.unread);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [load, refreshKey]);

  async function markAll() {
    await api<void>("/notifications/read-all", { method: "PATCH" });
    setItems((all) => all.map((item) => ({ ...item, readAt: new Date().toISOString() })));
    setUnread(0);
  }

  async function choose(item: Notification) {
    if (!item.readAt) {
      await api(`/notifications/${item.id}/read`, { method: "PATCH" });
      setUnread((value) => Math.max(0, value - 1));
      setItems((all) => all.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
    }
    if (item.task)
      onTask(item.task.id, item.task.projectId, item.task.project.workspaceId);
    setOpen(false);
  }

  return (
    <div className="notification-center">
      <button className="icon-button notification-trigger" aria-label="Bildirimler" onClick={() => setOpen(!open)}>
        <Bell size={17} />
        {unread > 0 && <span>{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notification-popover">
          <header><strong>Bildirimler</strong>{unread > 0 && <button className="text-button" onClick={markAll}><CheckCheck size={13} /> Tümünü oku</button>}</header>
          <div>
            {!items.length && <p className="muted">Henüz bildirimin yok.</p>}
            {items.map((item) => (
              <button key={item.id} className={`notification-item ${item.readAt ? "" : "unread"}`} onClick={() => choose(item)}>
                <i />
                <span><strong>{item.title}</strong><small>{item.message}</small><time>{dateLabel(item.createdAt)}</time></span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
