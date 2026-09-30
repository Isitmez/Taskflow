import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "./api";
import { ErrorBox, Modal, SaveButton } from "./components";
import type { Project, Role, User, Workspace } from "./types";

export type FormKind = "workspace" | "project" | "member" | "profile";

export function EntityForm({
  kind,
  workspace,
  project,
  user,
  role,
  onClose,
  onSaved,
}: {
  kind: FormKind;
  workspace?: Workspace;
  project?: Project;
  user: User;
  role?: Role;
  onClose: () => void;
  onSaved: (result: Workspace | Project | User) => void;
}) {
  const [name, setName] = useState(
    kind === "profile"
      ? user.name
      : kind === "project"
        ? project?.name || ""
        : "",
  );
  const [description, setDescription] = useState(project?.description || "");
  const [status, setStatus] = useState(project?.status || "ACTIVE");
  const [email, setEmail] = useState("");
  const [memberRole, setMemberRole] = useState("MEMBER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");

  const titles = {
    workspace: "Yeni çalışma alanı",
    project: project ? "Projeyi düzenle" : "Yeni proje",
    member: "Ekibine birini ekle",
    profile: "Profilini düzenle",
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const request =
      kind === "workspace"
        ? {
            path: "/workspaces",
            method: "POST",
            body: { name: name.trim() },
          }
        : kind === "project"
          ? {
              path: project
                ? `/projects/${project.id}`
                : `/workspaces/${workspace!.id}/projects`,
              method: project ? "PATCH" : "POST",
              body: {
                name: name.trim(),
                description: description.trim() || null,
                status,
                ...(project ? { expectedUpdatedAt: project.updatedAt } : {}),
              },
            }
          : kind === "member"
            ? {
                path: `/workspaces/${workspace!.id}/invitations`,
                method: "POST",
                body: { email, role: memberRole },
              }
            : {
                path: "/users/me",
                method: "PATCH",
                body: { name: name.trim() },
              };

    try {
      const result = await api<
        Workspace | Project | User | { token: string }
      >(
        request.path,
        request,
      );
      if (kind === "member" && "token" in result) {
        setInviteUrl(`${window.location.origin}/?invite=${result.token}`);
      } else {
        onSaved(result as Workspace | Project | User);
        onClose();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={titles[kind]}
      subtitle={
        kind === "member"
          ? "Yedi gün geçerli bir davet bağlantısı oluştur."
          : kind === "workspace"
            ? "Ekibin ve fikirlerin için yeni bir yer."
            : undefined
      }
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {inviteUrl ? (
        <div className="modal-form invite-result">
          <p>Davet hazır. Bağlantıyı e-postayla gönder veya kopyala.</p>
          <input aria-label="Davet bağlantısı" value={inviteUrl} readOnly />
          <div className="form-footer">
            <button className="button" onClick={() => navigator.clipboard.writeText(inviteUrl)}>Bağlantıyı kopyala</button>
            <a className="button primary" href={`mailto:${email}?subject=${encodeURIComponent("TaskFlow çalışma alanı daveti")}&body=${encodeURIComponent(`TaskFlow davetin: ${inviteUrl}`)}`}>E-posta gönder</a>
            <button className="button" onClick={onClose}>Kapat</button>
          </div>
        </div>
      ) : <form onSubmit={submit} className="modal-form">
        {kind !== "member" ? (
          <label>
            {kind === "profile"
              ? "Adın"
              : kind === "project"
                ? "Proje adı"
                : "Çalışma alanının adı"}
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={2}
              maxLength={kind === "profile" ? 50 : 100}
              required
              placeholder={
                kind === "workspace"
                  ? "Örn. Tasarım ekibi"
                  : kind === "project"
                    ? "Örn. Yeni web sitesi"
                    : "Ad Soyad"
              }
            />
          </label>
        ) : (
          <>
            <label>
              E-posta adresi
              <input
                autoFocus
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                maxLength={254}
                placeholder="arkadasin@ekibin.com"
              />
            </label>

            <label>
              Rol
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
              >
                <option value="MEMBER">Üye</option>
                {role === "OWNER" && <option value="ADMIN">Yönetici</option>}
              </select>
            </label>
          </>
        )}

        {kind === "project" && (
          <>
            <label>
              Açıklama <span className="optional">isteğe bağlı</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Bu projeyle neyi başarmak istiyorsunuz?"
              />
            </label>

            <label>
              Proje durumu
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "ACTIVE" | "ARCHIVED")
                }
              >
                <option value="ACTIVE">Aktif</option>
                <option value="ARCHIVED">Arşivlenmiş</option>
              </select>
            </label>
          </>
        )}

        {kind === "profile" && (
          <label>
            E-posta
            <input value={user.email} readOnly />
            <small>E-posta adresi bu uygulamada değiştirilemiyor.</small>
          </label>
        )}

        {error && <ErrorBox message={error} />}

        <footer className="form-footer">
          <button
            className="button"
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Vazgeç
          </button>

          <SaveButton busy={busy}>
            {kind === "member"
              ? "Davet oluştur"
              : kind === "profile" || project
                ? "Kaydet"
                : "Oluştur"}
          </SaveButton>
        </footer>
      </form>}
    </Modal>
  );
}
