import { FileText, FolderKanban, MessageSquare, Search, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { api } from "./api";

type SearchResults = {
  total: number;
  projects: { id: string; name: string; description: string | null; status: string }[];
  tasks: { id: string; projectId: string; title: string; status: string; project: { name: string } }[];
  comments: { id: string; content: string; author: { id: string; name: string }; task: { id: string; title: string; projectId: string } }[];
  members: { id: string; role: string; user: { id: string; name: string; email: string } }[];
};

export function GlobalSearch({ workspaceId, onTask, onProject, onMembers }: {
  workspaceId: string;
  onTask: (taskId: string, projectId: string) => void;
  onProject: (projectId: string) => void;
  onMembers: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { setOpen(false); setQuery(""); setResults(null); }, [workspaceId]);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => {
    const value = query.trim();
    if (!open || value.length < 2) {
      setResults(null); setLoading(false); setError(""); return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true); setError("");
      api<SearchResults>(`/workspaces/${workspaceId}/search?q=${encodeURIComponent(value)}`, { signal: controller.signal })
        .then(setResults)
        .catch((reason) => { if (reason.name !== "AbortError") setError(reason.message); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [open, query, workspaceId]);

  function done(action: () => void) { action(); setOpen(false); }

  return <div className="global-search">
    <button className="icon-button" aria-label="Çalışma alanında ara" title="Global arama" onClick={() => setOpen((value) => !value)}><Search size={17} /></button>
    {open && <div className="global-search-panel">
      <header><Search size={17} /><input ref={input} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Görev, proje, yorum veya kişi ara…" aria-label="Global arama" /><button className="icon-button" aria-label="Aramayı kapat" onClick={() => setOpen(false)}><X size={15} /></button></header>
      <div className="global-search-results">
        {query.trim().length < 2 ? <p>Aramak için en az iki karakter yaz.</p> : loading ? <p>Aranıyor…</p> : error ? <p className="search-error">{error}</p> : results?.total === 0 ? <p>Bu çalışma alanında sonuç bulunamadı.</p> : results ? <>
          {!!results.tasks.length && <ResultTitle icon={<FileText size={13} />} label="Görevler" />}
          {results.tasks.map((task) => <button key={`task-${task.id}`} onClick={() => done(() => onTask(task.id, task.projectId))}><strong>{task.title}</strong><small>{task.project.name} · {task.status}</small></button>)}
          {!!results.projects.length && <ResultTitle icon={<FolderKanban size={13} />} label="Projeler" />}
          {results.projects.map((project) => <button key={`project-${project.id}`} onClick={() => done(() => onProject(project.id))}><strong>{project.name}</strong><small>{project.description || project.status}</small></button>)}
          {!!results.comments.length && <ResultTitle icon={<MessageSquare size={13} />} label="Yorumlar" />}
          {results.comments.map((comment) => <button key={`comment-${comment.id}`} onClick={() => done(() => onTask(comment.task.id, comment.task.projectId))}><strong>{comment.content}</strong><small>{comment.author.name} · {comment.task.title}</small></button>)}
          {!!results.members.length && <ResultTitle icon={<Users size={13} />} label="Ekip" />}
          {results.members.map((member) => <button key={`member-${member.id}`} onClick={() => done(onMembers)}><strong>{member.user.name}</strong><small>{member.user.email} · {member.role}</small></button>)}
        </> : null}
      </div>
    </div>}
  </div>;
}

function ResultTitle({ icon, label }: { icon: ReactNode; label: string }) {
  return <h4>{icon}{label}</h4>;
}
