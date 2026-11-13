"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`surface-card ${className}`}>{children}</section>;
}

export function Button({ children, variant = "primary", className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase().replaceAll("_", " ");
  const tone = ["completed", "confirmed", "connected", "answered"].includes(normalized) ? "success" :
    ["pending", "in progress", "disconnected", "not configured"].includes(normalized) ? "warning" :
    ["failed", "missed", "cancelled", "error"].includes(normalized) ? "danger" : "neutral";
  return <span className={`status-badge status-${tone}`}><span className="status-dot" aria-hidden="true" />{normalized}</span>;
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return <div className="loading-state" role="status" aria-live="polite"><span className="spinner" aria-hidden="true" />{label}…</div>;
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-mark" aria-hidden="true">✦</div><h3>{title}</h3><p>{description}</p>{action}</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="error-state" role="alert"><span>{message}</span>{retry && <Button variant="secondary" onClick={retry}>Try again</Button>}</div>;
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" | "warning" | "error" }) {
  return <div className={`notice notice-${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

export function Field({ label, hint, error, wrapperClassName = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; wrapperClassName?: string }) {
  const id = props.id ?? props.name;
  return <label className={`field ${wrapperClassName}`} htmlFor={id}><span className="field-label">{label}{props.required && <span aria-hidden="true"> *</span>}</span><input {...props} id={id} className={`input ${props.className ?? ""}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} />{error ? <span id={`${id}-error`} className="field-error">{error}</span> : hint ? <span id={`${id}-hint`} className="field-hint">{hint}</span> : null}</label>;
}

export function TextAreaField({ label, hint, error, wrapperClassName = "", ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string; error?: string; wrapperClassName?: string }) {
  const id = props.id ?? props.name;
  return <label className={`field ${wrapperClassName}`} htmlFor={id}><span className="field-label">{label}{props.required && <span aria-hidden="true"> *</span>}</span><textarea {...props} id={id} className={`textarea ${props.className ?? ""}`} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} />{error ? <span id={`${id}-error`} className="field-error">{error}</span> : hint ? <span id={`${id}-hint`} className="field-hint">{hint}</span> : null}</label>;
}

export function SelectField({ label, children, wrapperClassName = "", ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; wrapperClassName?: string }) {
  const id = props.id ?? props.name;
  return <label className={`field ${wrapperClassName}`} htmlFor={id}><span className="field-label">{label}{props.required && <span aria-hidden="true"> *</span>}</span><select {...props} id={id} className={`select ${props.className ?? ""}`}>{children}</select></label>;
}

export function Modal({ title, open, onClose, children, width = "normal" }: { title: string; open: boolean; onClose: () => void; children: ReactNode; width?: "normal" | "wide" }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className={`modal modal-${width}`} aria-labelledby="modal-title" onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={() => { if (open) onClose(); }}>
    <div className="modal-heading"><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>
    <div className="modal-content">{children}</div>
  </dialog>;
}

export function formatDate(value: string | null | undefined, timezone = "UTC") {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(date); }
  catch { return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date); }
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins ? `${mins}m ${secs}s` : `${secs}s`;
}
