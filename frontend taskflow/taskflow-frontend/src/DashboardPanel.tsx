import { AlertTriangle, BarChart3, CheckCheck, Download, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { api, downloadBlob } from "./api";
import { Avatar, ErrorBox, Spinner } from "./components";
import type { DashboardStats } from "./types";
import { priorities, statuses } from "./types";

export function DashboardPanel({ workspaceId }: { workspaceId: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    api<DashboardStats>(`/workspaces/${workspaceId}/dashboard`, {
      signal: controller.signal,
    })
      .then(setStats)
      .catch((reason) => {
        if (reason.name !== "AbortError") setError(reason.message);
      });
    return () => controller.abort();
  }, [workspaceId, reload]);

  if (error)
    return <ErrorBox message={error} retry={() => setReload((value) => value + 1)} />;
  if (!stats) return <Spinner label="Raporlar hazırlanıyor…" />;
  const maximum = Math.max(1, ...Object.values(stats.byStatus).map(Number));

  async function exportTasks() {
    const blob = await downloadBlob(`/workspaces/${workspaceId}/export`);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "taskflow-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="little-label">ÇALIŞMA ALANI RAPORU</span>
          <h1>İlerleme özeti.</h1>
          <p>Ekibin iş yükünü ve görevlerin durumunu tek ekranda izle.</p>
        </div>
        <button className="button" onClick={exportTasks}><Download size={15} /> CSV dışa aktar</button>
      </div>
      <div className="dashboard-metrics">
        <article><BarChart3 /><span>Toplam görev</span><strong>{stats.total}</strong></article>
        <article><CheckCheck /><span>Tamamlanan</span><strong>{stats.byStatus.DONE || 0}</strong></article>
        <article><AlertTriangle /><span>Geciken</span><strong>{stats.overdue}</strong></article>
        <article><Users /><span>Atanmamış</span><strong>{stats.unassigned}</strong></article>
      </div>
      <div className="dashboard-grid">
        <section className="report-card">
          <h2>Durum dağılımı</h2>
          <div className="chart-bars">
            {statuses.map((status) => {
              const value = stats.byStatus[status.value] || 0;
              return (
                <div className="chart-row" key={status.value}>
                  <span>{status.label}</span>
                  <div><i style={{ width: `${(value / maximum) * 100}%`, background: status.color }} /></div>
                  <strong>{value}</strong>
                </div>
              );
            })}
          </div>
        </section>
        <section className="report-card">
          <h2>Öncelik dağılımı</h2>
          <div className="priority-summary">
            {Object.entries(priorities).map(([priority, label]) => (
              <div key={priority}>
                <span className={`priority-dot priority-edge-${priority.toLowerCase()}`} />
                <span>{label}</span>
                <strong>{stats.byPriority[priority as keyof typeof stats.byPriority] || 0}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="report-card report-team">
          <h2>Ekip ilerlemesi</h2>
          {stats.byAssignee.map((item) => (
            <div className="team-progress" key={item.user.id}>
              <Avatar name={item.user.name} small />
              <span><strong>{item.user.name}</strong><small>{item.completed}/{item.total} tamamlandı</small></span>
              <div><i style={{ width: `${item.total ? (item.completed / item.total) * 100 : 0}%` }} /></div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
