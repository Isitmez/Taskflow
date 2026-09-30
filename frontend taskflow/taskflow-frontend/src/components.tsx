import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { ArrowUpRight, Check, LoaderCircle, X } from 'lucide-react';
import { initials } from './types';
export function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`brand ${dark ? 'brand-dark' : ''}`}>
      <span className="brand-mark">
        <span />
        <span />
      </span>
      taskflow<span className="brand-dot">.</span>
    </div>
  );
}
export function Avatar({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  return (
    <span className={`avatar ${small ? 'avatar-small' : ''}`} title={name}>
      {initials(name)}
    </span>
  );
}
export function Spinner({ label = 'Yükleniyor…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle size={22} className="spin" />
      {label}
    </div>
  );
}
export function ErrorBox({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="error-box" role="alert">
      <span>{message}</span>
      {retry && (
        <button className="text-button" onClick={retry}>
          Tekrar dene <ArrowUpRight size={14} />
        </button>
      )}
    </div>
  );
}
export function Empty({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? 'modal-wide' : ''}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <header className="modal-header">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Pencereyi kapat"
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export function SaveButton({
  busy,
  children = 'Kaydet',
}: {
  busy: boolean;
  children?: ReactNode;
}) {
  return (
    <button className="button primary" disabled={busy} type="submit">
      {busy ? <LoaderCircle size={16} className="spin" /> : <Check size={16} />}
      {busy ? 'Kaydediliyor…' : children}
    </button>
  );
}
