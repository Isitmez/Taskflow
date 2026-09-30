import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "./api";
import { Empty, ErrorBox, Spinner } from "./components";
import type { Task } from "./types";
import { dateLabel } from "./types";

type LifecycleTask = Task & { project: { id: string; name: string } };

export function LifecyclePanel({
  workspaceId,
  kind,
  onChanged,
}: {
  workspaceId: string;
  kind: "archive" | "trash";
  onChanged: () => void;
}) {
  const [tasks, setTasks] = useState<LifecycleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");
    api<LifecycleTask[]>(`/workspaces/${workspaceId}/${kind}`)
      .then(setTasks)
      .catch((reason) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [workspaceId, kind, reload]);

  async function restore(task: LifecycleTask) {
    await api(`/tasks/${task.id}/restore`, {
      method: "PATCH",
      body: { expectedUpdatedAt: task.updatedAt },
    });
    setReload((value) => value + 1);
    onChanged();
  }

  async function permanentlyDelete(task: LifecycleTask) {
    await api(
      `/tasks/${task.id}?expectedUpdatedAt=${encodeURIComponent(task.updatedAt)}`,
      { method: "DELETE" },
    );
    setReload((value) => value + 1);
    onChanged();
  }

  if (loading) return <Spinner label={kind === "archive" ? "Arşiv yükleniyor…" : "Çöp kutusu yükleniyor…"} />;
  if (error) return <ErrorBox message={error} retry={() => setReload((value) => value + 1)} />;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="little-label">{kind === "archive" ? "SAKLANAN GÖREVLER" : "SİLİNEN GÖREVLER"}</span>
          <h1>{kind === "archive" ? "Arşiv." : "Çöp kutusu."}</h1>
          <p>{kind === "archive" ? "Şimdilik görünümden kaldırılan görevleri yönet." : "Görevleri geri yükle veya kalıcı olarak sil."}</p>
        </div>
      </div>
      {!tasks.length ? (
        <Empty
          icon={kind === "archive" ? <Archive size={28} /> : <Trash2 size={28} />}
          title={kind === "archive" ? "Arşiv boş." : "Çöp kutusu boş."}
          description="Buraya taşınan görevler bu ekranda görünür."
        />
      ) : (
        <div className="lifecycle-list">
          {tasks.map((task) => (
            <article key={task.id}>
              <div><span>{task.project.name}</span><strong>{task.title}</strong><small>{dateLabel(task.archivedAt || task.deletedAt || task.updatedAt)}</small></div>
              <button className="button" onClick={() => restore(task)}><RotateCcw size={14} /> Geri yükle</button>
              {kind === "trash" && <button className="button danger-outline" onClick={() => permanentlyDelete(task)}><Trash2 size={14} /> Kalıcı sil</button>}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
