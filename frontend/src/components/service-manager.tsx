"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button, Field, Modal, Notice, TextAreaField } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { Service } from "@/lib/types";

export function ServiceManager({ services, onSaved }: { services: Service[]; onSaved: () => void }) {
  const [editor, setEditor] = useState<Service | "new" | null>(null);
  const [remove, setRemove] = useState<Service | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function deleteService() {
    if (!remove) return;
    setBusy(true); setNotice(null);
    try { await apiFetch<void>(`services/${remove.id}`, { method: "DELETE" }); setNotice({ tone: "success", message: "Service removed." }); onSaved(); }
    catch (error) { setNotice({ tone: "error", message: error instanceof ApiError ? error.message : "Unable to remove service." }); }
    finally { setBusy(false); setRemove(null); }
  }

  return <>
    {notice && <Notice tone={notice.tone}>{notice.message}</Notice>}
    <div className="service-list">{services.length ? services.map((service) => <div className="service-row" key={service.id}><span className="service-symbol">{service.name.slice(0,1).toUpperCase()}</span><div className="service-copy"><strong>{service.name}</strong><span>{service.duration_minutes} min{service.price_minor != null ? ` · ${service.price_minor.toLocaleString()} minor units` : ""}{service.description ? ` · ${service.description}` : ""}</span></div><span className={`service-active ${service.is_active ? "service-enabled" : ""}`}>{service.is_active ? "Active" : "Inactive"}</span><button className="icon-button" title={`Edit ${service.name}`} aria-label={`Edit ${service.name}`} onClick={() => setEditor(service)}><Pencil size={15} /></button><button className="icon-button delete-icon" title={`Remove ${service.name}`} aria-label={`Remove ${service.name}`} onClick={() => setRemove(service)}><Trash2 size={15} /></button></div>) : <div className="service-empty">No services added yet.</div>}</div>
    <Button variant="secondary" onClick={() => setEditor("new")}><Plus size={14} /> Add service</Button>
    <Modal title={editor === "new" ? "Add a service" : "Edit service"} open={Boolean(editor)} onClose={() => setEditor(null)}>{editor && <ServiceForm key={editor === "new" ? "new" : editor.id} value={editor === "new" ? null : editor} busy={busy} onSubmit={async (payload) => {
      setBusy(true); setNotice(null);
      try {
        if (editor === "new") await apiFetch<Service>("services", { method: "POST", body: JSON.stringify(payload) });
        else if (editor) await apiFetch<Service>(`services/${editor.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setEditor(null); setNotice({ tone: "success", message: editor === "new" ? "Service added." : "Service updated." }); onSaved();
      } catch (error) { setNotice({ tone: "error", message: error instanceof ApiError ? error.message : "Unable to save this service." }); }
      finally { setBusy(false); }
    }} />}</Modal>
    <Modal title="Remove this service?" open={Boolean(remove)} onClose={() => setRemove(null)}>{remove && <div className="confirm-content"><p>Remove <strong>{remove.name}</strong> from your services? A service linked to an appointment cannot be deleted.</p><div className="form-actions"><Button variant="ghost" onClick={() => setRemove(null)}>Keep service</Button><Button variant="danger" disabled={busy} onClick={() => void deleteService()}>{busy ? "Removing…" : "Remove service"}</Button></div></div>}</Modal>
  </>;
}

function ServiceForm({ value, busy, onSubmit }: { value: Service | null; busy: boolean; onSubmit: (value: { name: string; description: string | null; duration_minutes: number; price_minor: number | null; is_active: boolean }) => Promise<void> }) {
  const [name, setName] = useState(value?.name ?? "");
  const [description, setDescription] = useState(value?.description ?? "");
  const [duration, setDuration] = useState(String(value?.duration_minutes ?? 30));
  const [price, setPrice] = useState(value?.price_minor == null ? "" : String(value.price_minor));
  const [active, setActive] = useState(value?.is_active ?? true);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const parsedDuration = Number(duration); const parsedPrice = price.trim() ? Number(price) : null;
    if (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 1440) { setError("Duration must be between 1 and 1440 minutes."); return; }
    if (parsedPrice != null && (!Number.isInteger(parsedPrice) || parsedPrice < 0)) { setError("Enter a valid non-negative number of minor units."); return; }
    await onSubmit({ name: name.trim(), description: description.trim() || null, duration_minutes: parsedDuration, price_minor: parsedPrice, is_active: active });
  }
  return <form className="form-stack" onSubmit={submit}>{error && <Notice tone="error">{error}</Notice>}<Field label="Service name" id="service-name" required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} /><TextAreaField label="Description" id="service-description" value={description} onChange={(event) => setDescription(event.target.value)} /><div className="form-grid"><Field label="Duration (minutes)" id="service-duration" type="number" min={1} max={1440} required value={duration} onChange={(event) => setDuration(event.target.value)} /><Field label="Price (minor units)" id="service-price" type="number" min={0} step="1" value={price} onChange={(event) => setPrice(event.target.value)} hint="Optional. The backend does not specify a currency." /></div><div className="toggle-row"><input id="service-active" type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /><label htmlFor="service-active">Available for customers</label></div><div className="form-actions"><Button type="submit" disabled={busy}>{busy ? "Saving…" : value ? "Save changes" : "Add service"}</Button></div></form>;
}
