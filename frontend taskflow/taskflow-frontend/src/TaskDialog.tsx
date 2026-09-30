import { useEffect, useState } from "react";
import type { ChangeEvent, CSSProperties, FormEvent } from "react";
import {
  CalendarDays,
  Archive,
  CornerDownRight,
  Download,
  History,
  ListChecks,
  MessageSquare,
  Paperclip,
  Plus,
  Repeat2,
  Send,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import { api, downloadBlob, getAll } from "./api";
import { Avatar, ErrorBox, Modal, SaveButton, Spinner } from "./components";
import { dateLabel, inputDate, priorities, statuses } from "./types";
import type {
  Activity,
  Attachment,
  ChecklistItem,
  Comment,
  Label,
  Member,
  Priority,
  Role,
  Recurrence,
  Status,
  Task,
  User,
} from "./types";

const activityLabels: Record<string, string> = {
  TASK_CREATED: "görevi oluşturdu",
  TASK_UPDATED: "görevi güncelledi",
  COMMENT_ADDED: "yorum ekledi",
  LABEL_ADDED: "etiket ekledi",
  LABEL_REMOVED: "etiketi kaldırdı",
  CHECKLIST_ADDED: "kontrol maddesi ekledi",
  CHECKLIST_COMPLETED: "kontrol maddesini tamamladı",
  CHECKLIST_REOPENED: "kontrol maddesini yeniden açtı",
  CHECKLIST_UPDATED: "kontrol maddesini güncelledi",
  CHECKLIST_REMOVED: "kontrol maddesini kaldırdı",
  ATTACHMENT_ADDED: "dosya ekledi",
  ATTACHMENT_REMOVED: "dosyayı kaldırdı",
  TASK_ARCHIVED: "görevi arşivledi",
  TASK_TRASHED: "görevi çöp kutusuna taşıdı",
  TASK_RESTORED: "görevi geri yükledi",
  RECURRENCE_CREATED: "tekrarlanan görevi oluşturdu",
};

export function TaskDialog({
  task,
  defaultStatus = "TODO",
  projectId,
  workspaceId,
  members,
  user,
  role,
  onClose,
  onSaved,
}: {
  task?: Task;
  defaultStatus?: Status;
  projectId: string;
  workspaceId: string;
  members: Member[];
  user: User;
  role: Role;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [status, setStatus] = useState<Status>(task?.status || defaultStatus);
  const [priority, setPriority] = useState<Priority>(
    task?.priority || "MEDIUM",
  );
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId || "");
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? inputDate(task.dueDate) : "",
  );
  const [recurrence, setRecurrence] = useState<Recurrence | "">(
    task?.recurrence || "",
  );
  const [recurrenceEnd, setRecurrenceEnd] = useState(
    task?.recurrenceEnd ? inputDate(task.recurrenceEnd) : "",
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(!!task);
  const [editing, setEditing] = useState<string | null>(null);
  const [commentDelete, setCommentDelete] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [labels, setLabels] = useState<Label[]>([]);
  const [taskLabels, setTaskLabels] = useState<Label[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [checklistText, setChecklistText] = useState("");
  const [labelName, setLabelName] = useState("");
  const [extraBusy, setExtraBusy] = useState(false);
  const [extrasError, setExtrasError] = useState("");
  const [extrasReload, setExtrasReload] = useState(0);
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [subtaskText, setSubtaskText] = useState("");

  useEffect(() => {
    if (!task) return;

    const controller = new AbortController();

    setCommentsLoading(true);

    Promise.all([
      getAll<Comment>(`/tasks/${task.id}/comments`, controller.signal),
      api<Label[]>(`/workspaces/${workspaceId}/labels`, { signal: controller.signal }),
      api<Label[]>(`/tasks/${task.id}/labels`, { signal: controller.signal }),
      api<ChecklistItem[]>(`/tasks/${task.id}/checklist`, { signal: controller.signal }),
      api<Attachment[]>(`/tasks/${task.id}/attachments`, { signal: controller.signal }),
      api<Activity[]>(`/tasks/${task.id}/activity`, { signal: controller.signal }),
      api<Task[]>(`/tasks/${task.id}/subtasks`, { signal: controller.signal }),
    ])
      .then(([commentsResult, allLabels, selectedLabels, items, files, activity, childTasks]) => {
        setComments(commentsResult);
        setLabels(Array.isArray(allLabels) ? allLabels : []);
        setTaskLabels(Array.isArray(selectedLabels) ? selectedLabels : []);
        setChecklist(Array.isArray(items) ? items : []);
        setAttachments(Array.isArray(files) ? files : []);
        setActivities(Array.isArray(activity) ? activity : []);
        setSubtasks(Array.isArray(childTasks) ? childTasks : []);
      })
      .catch((e) => {
        if (e.name !== "AbortError") {
          setCommentError(e.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setCommentsLoading(false);
        }
      });

    return () => controller.abort();
  }, [task, workspaceId, reload, extrasReload]);

  async function runExtra(action: () => Promise<unknown>) {
    setExtraBusy(true);
    setExtrasError("");
    try {
      await action();
      setExtrasReload((value) => value + 1);
    } catch (reason) {
      setExtrasError((reason as Error).message);
    } finally {
      setExtraBusy(false);
    }
  }

  function toggleLabel(label: Label) {
    if (!task) return;
    const selected = taskLabels.some((item) => item.id === label.id);
    void runExtra(() =>
      api(`/tasks/${task.id}/labels${selected ? `/${label.id}` : ""}`, {
        method: selected ? "DELETE" : "POST",
        ...(selected ? {} : { body: { labelId: label.id } }),
      }),
    );
  }

  function createLabel() {
    if (!labelName.trim()) return;
    void runExtra(async () => {
      const label = await api<Label>(`/workspaces/${workspaceId}/labels`, {
        method: "POST",
        body: { name: labelName.trim(), color: "#7d8d65" },
      });
      setLabelName("");
      if (task)
        await api(`/tasks/${task.id}/labels`, {
          method: "POST",
          body: { labelId: label.id },
        });
    });
  }

  function addChecklist(e: FormEvent) {
    e.preventDefault();
    if (!task || !checklistText.trim()) return;
    void runExtra(async () => {
      await api(`/tasks/${task.id}/checklist`, {
        method: "POST",
        body: { title: checklistText.trim() },
      });
      setChecklistText("");
    });
  }

  function uploadAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!task || !file) return;
    const form = new FormData();
    form.append("file", file);
    void runExtra(() =>
      api(`/tasks/${task.id}/attachments`, { method: "POST", body: form }),
    );
  }

  async function downloadAttachment(file: Attachment) {
    if (!task) return;
    setExtrasError("");
    try {
      const blob = await downloadBlob(
        `/tasks/${task.id}/attachments/${file.id}/download`,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason) {
      setExtrasError((reason as Error).message);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    try {
      await api(task ? `/tasks/${task.id}` : `/projects/${projectId}/tasks`, {
        method: task ? "PATCH" : "POST",
        body: {
          title: title.trim(),
          description: description.trim() || null,
          status,
          priority,
          assigneeId: assigneeId || null,
          dueDate: dueDate
            ? task?.dueDate && inputDate(task.dueDate) === dueDate
              ? task.dueDate
              : new Date(`${dueDate}T23:59:59`).toISOString()
            : null,
          recurrence: recurrence || null,
          recurrenceEnd:
            recurrence && recurrenceEnd
              ? new Date(`${recurrenceEnd}T23:59:59`).toISOString()
              : null,
          ...(task ? { expectedUpdatedAt: task.updatedAt } : {}),
        },
      });

      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!task) return;

    setBusy(true);
    setError("");

    try {
      await api(`/tasks/${task.id}/trash`, {
        method: "PATCH",
        body: { expectedUpdatedAt: task.updatedAt },
      });

      onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function archiveTask() {
    if (!task) return;
    setBusy(true);
    setError("");
    try {
      await api(`/tasks/${task.id}/archive`, {
        method: "PATCH",
        body: { expectedUpdatedAt: task.updatedAt },
      });
      onSaved();
      onClose();
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function addSubtask(e: FormEvent) {
    e.preventDefault();
    if (!task || !subtaskText.trim()) return;
    void runExtra(async () => {
      await api(`/tasks/${task.id}/subtasks`, {
        method: "POST",
        body: { title: subtaskText.trim() },
      });
      setSubtaskText("");
    });
  }

  async function submitComment(e: FormEvent) {
    e.preventDefault();

    setCommentBusy(true);
    setCommentError("");

    try {
      if (editing) {
        const currentComment = comments.find(
          (comment) => comment.id === editing,
        );

        if (!currentComment) {
          throw new Error(
            "Yorum güncel değil. Yorumları yenileyip tekrar dene.",
          );
        }

        await api(`/comments/${editing}`, {
          method: "PATCH",
          body: {
            content: commentText.trim(),
            expectedUpdatedAt: currentComment.updatedAt,
          },
        });
      } else {
        await api(`/tasks/${task!.id}/comments`, {
          method: "POST",
          body: {
            content: commentText.trim(),
          },
        });
      }

      setCommentText("");
      setEditing(null);
      setReload((n) => n + 1);
    } catch (e) {
      setCommentError((e as Error).message);
    } finally {
      setCommentBusy(false);
    }
  }

  async function deleteComment(id: string) {
    setCommentBusy(true);
    setCommentError("");

    try {
      const currentComment = comments.find((comment) => comment.id === id);

      if (!currentComment) {
        throw new Error("Yorum güncel değil. Yorumları yenileyip tekrar dene.");
      }

      await api(
        `/comments/${id}?expectedUpdatedAt=${encodeURIComponent(currentComment.updatedAt)}`,
        {
          method: "DELETE",
        },
      );

      setCommentDelete(null);

      if (editing === id) {
        setEditing(null);
        setCommentText("");
      }

      setReload((n) => n + 1);
    } catch (e) {
      setCommentError((e as Error).message);
    } finally {
      setCommentBusy(false);
    }
  }

  const canDelete =
    !!task && (role !== "MEMBER" || task.createdById === user.id);

  return (
    <Modal
      title={task ? "Görev detayları" : "Yeni bir adım ekle"}
      subtitle={
        task
          ? `TF-${task.id.slice(0, 4).toUpperCase()} · ${dateLabel(task.createdAt)} tarihinde oluşturuldu`
          : "İyi tanımlanmış bir görev, işin yarısıdır."
      }
      onClose={() => {
        if (!busy && !commentBusy) onClose();
      }}
      wide
    >
      <div className="task-dialog-layout">
        <form onSubmit={save} className="task-form">
          <label>
            Görev başlığı
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              minLength={3}
              maxLength={150}
              required
              placeholder="Ne yapılması gerekiyor?"
            />
          </label>

          <label>
            Açıklama <span className="optional">isteğe bağlı</span>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              placeholder="Bağlamı, beklentileri ve küçük detayları paylaş…"
            />
          </label>

          <div className="form-grid">
            <label>
              Durum
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Status)}
              >
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Öncelik
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                {Object.entries(priorities).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Sorumlu
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Henüz atanmadı</option>
                {members.map((m) => (
                  <option key={m.id} value={m.userId}>
                    {m.user.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>
                <CalendarDays size={13} /> Son tarih
              </span>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={!task ? new Date().toLocaleDateString("en-CA") : undefined}
              />
            </label>

            <label>
              <span><Repeat2 size={13} /> Tekrarlama</span>
              <select
                value={recurrence}
                onChange={(event) =>
                  setRecurrence(event.target.value as Recurrence | "")
                }
              >
                <option value="">Tekrarlanmaz</option>
                <option value="DAILY">Her gün</option>
                <option value="WEEKLY">Her hafta</option>
                <option value="MONTHLY">Her ay</option>
              </select>
            </label>

            {recurrence && (
              <label>
                Tekrarlama bitişi
                <input
                  type="date"
                  value={recurrenceEnd}
                  onChange={(event) => setRecurrenceEnd(event.target.value)}
                  min={dueDate || new Date().toLocaleDateString("en-CA")}
                />
              </label>
            )}
          </div>

          {task && (
            <div className="task-labels-field">
              <span>Etiketler</span>
              <div className="label-chips">
                {labels.map((label) => {
                  const selected = taskLabels.some((item) => item.id === label.id);
                  return (
                    <button
                      type="button"
                      key={label.id}
                      className={selected ? "selected" : ""}
                      style={{ "--label-color": label.color } as CSSProperties}
                      disabled={extraBusy}
                      onClick={() => toggleLabel(label)}
                    >
                      <i /> {label.name}
                    </button>
                  );
                })}
                {!labels.length && <small>Henüz etiket oluşturulmadı.</small>}
              </div>
              {role !== "MEMBER" && (
                <div className="inline-create">
                  <input
                    aria-label="Yeni etiket"
                    value={labelName}
                    onChange={(event) => setLabelName(event.target.value)}
                    placeholder="Yeni etiket"
                    maxLength={30}
                  />
                  <button type="button" className="button" onClick={createLabel} disabled={extraBusy || !labelName.trim()}>
                    <Plus size={13} /> Ekle
                  </button>
                </div>
              )}
            </div>
          )}

          {error && <ErrorBox message={error} />}

          {confirmDelete && (
            <div className="delete-confirm">
              <p>Bu görev çöp kutusuna taşınacak ve daha sonra geri yüklenebilecek.</p>

              <div>
                <button
                  type="button"
                  className="button danger"
                  disabled={busy}
                  onClick={remove}
                >
                  Çöp kutusuna taşı
                </button>

                <button
                  type="button"
                  className="button"
                  onClick={() => setConfirmDelete(false)}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}

          <footer className="form-footer">
            {canDelete ? (
              <div className="task-lifecycle-actions">
                <button type="button" className="text-button" disabled={busy} onClick={archiveTask}>
                  <Archive size={14} /> Arşivle
                </button>
                <button type="button" className="text-button danger-text" disabled={busy} onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={15} /> Çöp kutusuna taşı
                </button>
              </div>
            ) : (
              <span />
            )}

            <SaveButton busy={busy}>
              {task ? "Değişiklikleri kaydet" : "Görev oluştur"}
            </SaveButton>
          </footer>
        </form>

        {task && (
          <section className="comments-panel">
            <div className="task-extra-section">
              <h3><CornerDownRight size={17} /> Alt görevler <span>{subtasks.filter((item) => item.status === "DONE").length}/{subtasks.length}</span></h3>
              <div className="subtask-list">
                {subtasks.map((item) => (
                  <button key={item.id} type="button" onClick={() => runExtra(() => api(`/tasks/${item.id}`, { method: "PATCH", body: { status: item.status === "DONE" ? "TODO" : "DONE", expectedUpdatedAt: item.updatedAt } }))}>
                    <span className={item.status === "DONE" ? "checked" : ""}>{item.status === "DONE" ? "✓" : ""}</span>
                    <strong>{item.title}</strong>
                  </button>
                ))}
              </div>
              <form className="inline-create" onSubmit={addSubtask}>
                <input aria-label="Alt görev" value={subtaskText} onChange={(event) => setSubtaskText(event.target.value)} placeholder="Yeni alt görev…" maxLength={150} />
                <button className="button" disabled={extraBusy || !subtaskText.trim()}><Plus size={13} /> Ekle</button>
              </form>
            </div>

            <div className="task-extra-section">
              <h3><ListChecks size={17} /> Kontrol listesi <span>{checklist.filter((item) => item.completed).length}/{checklist.length}</span></h3>
              <div className="checklist-items">
                {checklist.map((item) => (
                  <div key={item.id} className={item.completed ? "completed" : ""}>
                    <input
                      type="checkbox"
                      aria-label={`${item.title} tamamlandı`}
                      checked={item.completed}
                      disabled={extraBusy}
                      onChange={() => runExtra(() => api(`/tasks/${task.id}/checklist/${item.id}`, { method: "PATCH", body: { completed: !item.completed } }))}
                    />
                    <span>{item.title}</span>
                    <button className="icon-button" aria-label={`${item.title} maddesini sil`} disabled={extraBusy} onClick={() => runExtra(() => api(`/tasks/${task.id}/checklist/${item.id}`, { method: "DELETE" }))}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <form className="inline-create" onSubmit={addChecklist}>
                <input aria-label="Kontrol listesi maddesi" value={checklistText} onChange={(event) => setChecklistText(event.target.value)} placeholder="Yeni madde…" maxLength={180} />
                <button className="button" disabled={extraBusy || !checklistText.trim()}><Plus size={13} /> Ekle</button>
              </form>
            </div>

            <div className="task-extra-section">
              <h3><Paperclip size={17} /> Dosyalar <span>{attachments.length}</span></h3>
              <div className="attachment-list">
                {attachments.map((file) => (
                  <div key={file.id}>
                    <Paperclip size={14} />
                    <span><strong>{file.name}</strong><small>{Math.max(1, Math.round(file.size / 1024))} KB</small></span>
                    <button className="icon-button" aria-label={`${file.name} dosyasını indir`} onClick={() => downloadAttachment(file)}><Download size={13} /></button>
                    {(file.uploaderId === user.id || role !== "MEMBER") && (
                      <button className="icon-button" aria-label={`${file.name} dosyasını sil`} disabled={extraBusy} onClick={() => runExtra(() => api(`/tasks/${task.id}/attachments/${file.id}`, { method: "DELETE" }))}><Trash2 size={12} /></button>
                    )}
                  </div>
                ))}
              </div>
              <label className="button attachment-upload">
                <Plus size={13} /> Dosya ekle
                <input type="file" hidden onChange={uploadAttachment} accept=".png,.jpg,.jpeg,.pdf,.txt,.docx,.xlsx" />
              </label>
              <small className="muted">PNG, JPG, PDF, TXT, DOCX veya XLSX · en fazla 5 MB</small>
            </div>

            <h3>
              <MessageSquare size={17} /> Ekip konuşması{" "}
              <span>{comments.length}</span>
            </h3>

            {commentsLoading ? (
              <Spinner />
            ) : (
              <div className="comment-list">
                {!comments.length && (
                  <p className="muted">
                    Henüz yorum yok. İlk düşünceni paylaş.
                  </p>
                )}

                {comments.map((c) => {
                  const author =
                    members.find((m) => m.userId === c.authorId)?.user.name ||
                    (c.authorId === user.id ? user.name : "Eski ekip üyesi");

                  return (
                    <article className="comment" key={c.id}>
                      <div className="comment-top">
                        <Avatar name={author} small />
                        <strong>{author}</strong>
                        <time>{dateLabel(c.createdAt)}</time>
                      </div>

                      <p>{c.content}</p>

                      <div className="comment-actions">
                        {c.authorId === user.id && (
                          <button
                            className="text-button"
                            disabled={commentBusy}
                            onClick={() => {
                              setEditing(c.id);
                              setCommentText(c.content);
                            }}
                          >
                            <Pencil size={12} /> Düzenle
                          </button>
                        )}

                        {(c.authorId === user.id || role !== "MEMBER") && (
                          <button
                            className="text-button"
                            disabled={commentBusy}
                            onClick={() => setCommentDelete(c.id)}
                          >
                            <Trash2 size={12} /> Sil
                          </button>
                        )}
                      </div>

                      {commentDelete === c.id && (
                        <div className="inline-confirm">
                          Yorum silinsin mi?
                          <button
                            className="text-button danger-text"
                            disabled={commentBusy}
                            onClick={() => deleteComment(c.id)}
                          >
                            Sil
                          </button>
                          <button
                            className="text-button"
                            onClick={() => setCommentDelete(null)}
                          >
                            Vazgeç
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

            {commentError && (
              <ErrorBox
                message={commentError}
                retry={() => {
                  setCommentError("");
                  setReload((n) => n + 1);
                }}
              />
            )}

            <form onSubmit={submitComment} className="comment-compose">
              {editing && (
                <div className="editing-label">
                  Yorum düzenleniyor
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Düzenlemeyi iptal et"
                    onClick={() => {
                      setEditing(null);
                      setCommentText("");
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              <textarea
                aria-label="Yorumun"
                placeholder="Ekibinle bir not paylaş…"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                required
                maxLength={2000}
                rows={3}
              />

              <button
                className="button"
                disabled={commentBusy || !commentText.trim()}
              >
                <Send size={14} />
                {editing ? "Yorumu güncelle" : "Gönder"}
              </button>
            </form>

            <div className="task-extra-section activity-section">
              <h3><History size={17} /> Aktivite geçmişi <span>{activities.length}</span></h3>
              <div className="activity-list">
                {activities.map((activity) => (
                  <div key={activity.id}>
                    <Avatar name={activity.actor.name} small />
                    <p><strong>{activity.actor.name}</strong> {activityLabels[activity.action] || "değişiklik yaptı"}{activity.details && <small>{activity.details}</small>}</p>
                    <time>{dateLabel(activity.createdAt)}</time>
                  </div>
                ))}
                {!activities.length && <p className="muted">Henüz aktivite kaydı yok.</p>}
              </div>
            </div>

            {extrasError && <ErrorBox message={extrasError} />}
          </section>
        )}
      </div>
    </Modal>
  );
}
