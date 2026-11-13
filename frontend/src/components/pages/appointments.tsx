"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Plus, Search } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Field, LoadingState, Modal, Notice, PageHeader, SelectField, StatusBadge, TextAreaField, formatDate } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useResource } from "@/lib/use-resource";
import type { Appointment, Business, Service } from "@/lib/types";
import { utcToZonedInput, zonedInputToUtc } from "@/lib/time";

const PAGE_MOUNTED_AT = Date.now();
const EMPTY_APPOINTMENTS: Appointment[] = [];
const EMPTY_SERVICES: Service[] = [];

export default function AppointmentsPage() {
  const appointmentsResource = useResource<Appointment[]>("appointments?limit=100");
  const servicesResource = useResource<Service[]>("services");
  const businessResource = useResource<Business>("business");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [period, setPeriod] = useState("all");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState<Appointment | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const appointments = appointmentsResource.data ?? EMPTY_APPOINTMENTS;
  const services = servicesResource.data ?? EMPTY_SERVICES;
  const now = PAGE_MOUNTED_AT;
  const filtered = useMemo(() => appointments.filter((item) => {
    const text = query.trim().toLowerCase();
    const serviceName = services.find((service) => service.id === item.service_id)?.name ?? "";
    const matchesText = !text || [item.customer_name, item.customer_contact, serviceName].some((value) => value?.toLowerCase().includes(text));
    const matchesStatus = status === "all" || item.status === status;
    const time = Date.parse(item.starts_at);
    const matchesPeriod = period === "all" || (period === "upcoming" && time >= now && !["cancelled", "failed"].includes(item.status)) || (period === "past" && time < now) || (period === "cancelled" && item.status === "cancelled");
    return matchesText && matchesStatus && matchesPeriod;
  }), [appointments, query, services, status, period, now]);

  async function cancelAppointment(appointment: Appointment) {
    setBusyId(appointment.id); setNotice(null);
    try {
      const updated = await apiFetch<Appointment>(`appointments/${appointment.id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled" }) });
      setSelected(updated); setNotice({ tone: "success", message: "Appointment marked cancelled." });
      appointmentsResource.reload();
    } catch (error) { setNotice({ tone: "error", message: error instanceof ApiError ? error.message : "Could not update this appointment." }); }
    finally { setBusyId(null); setConfirmCancel(null); }
  }

  const busy = appointmentsResource.loading || servicesResource.loading || businessResource.loading;
  const error = appointmentsResource.error || servicesResource.error || businessResource.error;

  return <><PageHeader title="Appointments" subtitle="Review and manage appointments saved for your business." action={<Button disabled={busy} onClick={() => { setCreating(true); setNotice(null); }}><Plus size={15} /> Add appointment</Button>} />
    {notice && <Notice tone={notice.tone}>{notice.message}</Notice>}
    <div className="toolbar"><label className="search-box"><Search size={15} /><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search appointments" placeholder="Search customer or service" /></label><SelectField label="Status" name="appointment-status" value={status} onChange={(event) => setStatus(event.target.value)} className="toolbar-select"><option value="all">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="cancelled">Cancelled</option><option value="failed">Failed</option></SelectField><SelectField label="Date" name="appointment-period" value={period} onChange={(event) => setPeriod(event.target.value)} className="toolbar-select"><option value="all">All dates</option><option value="upcoming">Upcoming</option><option value="past">Past</option><option value="cancelled">Cancelled</option></SelectField><span className="toolbar-count">{filtered.length} records</span></div>
    {busy ? <Card><LoadingState label="Loading appointments" /></Card> : error ? <ErrorState message={error} retry={() => { appointmentsResource.reload(); servicesResource.reload(); businessResource.reload(); }} /> : appointments.length === 0 ? <Card><EmptyState title="No appointments yet" description="Appointments saved for your business will appear here. New dashboard entries stay pending until a calendar confirms them." /></Card> : filtered.length === 0 ? <Card><EmptyState title="No matching appointments" description="Try a different search or filter." /></Card> : <Card className="table-card"><div className="data-table-wrap"><table><thead><tr><th>Customer</th><th>Date &amp; time</th><th>Service</th><th>Source</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td><span className="table-primary">{item.customer_name}</span><span className="table-secondary">{item.customer_contact || "No contact recorded"}</span></td><td>{formatDate(item.starts_at, businessResource.data?.timezone)}</td><td>{services.find((service) => service.id === item.service_id)?.name || "Not specified"}</td><td><span className="source-label">{item.source.replaceAll("_", " ")}</span></td><td><StatusBadge status={item.status} /></td><td><button className="table-link table-button" onClick={() => { setSelected(item); setNotice(null); }}>Details</button></td></tr>)}</tbody></table></div><div className="table-footnote">Showing up to 100 most recent appointment records. Calendar sync is not implemented.</div></Card>}
    <Modal title="Add appointment" open={creating} onClose={() => setCreating(false)}>{creating && <CreateAppointmentForm key={businessResource.data?.timezone || "UTC"} services={services} timezone={businessResource.data?.timezone || "UTC"} onDone={(message) => { setCreating(false); setNotice({ tone: "success", message }); appointmentsResource.reload(); }} onError={(message) => setNotice({ tone: "error", message })} />}</Modal>
    <Modal title="Appointment details" open={Boolean(selected) && !confirmCancel} onClose={() => setSelected(null)}>
      {selected && <AppointmentDetails appointment={selected} services={services} timezone={businessResource.data?.timezone || "UTC"} onCancel={() => setConfirmCancel(selected)} busy={busyId === selected.id} />}
    </Modal>
    <Modal title="Cancel appointment?" open={Boolean(confirmCancel)} onClose={() => setConfirmCancel(null)}>
      {confirmCancel && <div className="confirm-content"><p>Mark the appointment for <strong>{confirmCancel.customer_name}</strong> as cancelled? This change updates the VoicePilot record only; no calendar is connected.</p><div className="form-actions"><Button variant="ghost" onClick={() => setConfirmCancel(null)}>Keep appointment</Button><Button variant="danger" disabled={busyId === confirmCancel.id} onClick={() => void cancelAppointment(confirmCancel)}>{busyId === confirmCancel.id ? "Updating…" : "Mark cancelled"}</Button></div></div>}
    </Modal>
  </>;
}

function CreateAppointmentForm({ services, timezone, onDone, onError }: { services: Service[]; timezone: string; onDone: (message: string) => void; onError: (message: string) => void }) {
  const [customerName, setCustomerName] = useState("");
  const [contact, setContact] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [startsAt, setStartsAt] = useState(() => utcToZonedInput(new Date(Date.now() + 60 * 60_000), timezone));
  const [endsAt, setEndsAt] = useState(() => utcToZonedInput(new Date(Date.now() + 90 * 60_000), timezone));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setLocalError("");
    let start: string; let end: string;
    try { start = zonedInputToUtc(startsAt, timezone); end = zonedInputToUtc(endsAt, timezone); }
    catch { setLocalError("Business timezone is invalid. Update it in Business profile before adding an appointment."); setBusy(false); return; }
    if (Date.parse(end) <= Date.parse(start)) { setLocalError("End time must be after start time."); setBusy(false); return; }
    try {
      await apiFetch<Appointment>("appointments", { method: "POST", body: JSON.stringify({ customer_name: customerName, customer_contact: contact || null, service_id: serviceId || null, starts_at: start, ends_at: end, notes: notes || null }) });
      onDone("Appointment saved as pending. It has not been confirmed with Google Calendar.");
    } catch (error) { const message = error instanceof ApiError ? error.message : "Unable to save the appointment."; setLocalError(message); onError(message); }
    finally { setBusy(false); }
  }

  return <form className="form-stack" onSubmit={submit}>
    <Notice tone="warning">New appointments are saved as pending. Calendar confirmation is unavailable in this phase. Enter times in the business timezone: {timezone}. The backend stores timestamps in UTC.</Notice>
    {localError && <Notice tone="error">{localError}</Notice>}
    <Field label="Customer name" id="customer_name" name="customer_name" required maxLength={160} value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
    <div className="form-grid"><Field label="Contact" id="customer_contact" name="customer_contact" value={contact} onChange={(event) => setContact(event.target.value)} /><SelectField label="Service" name="service_id" value={serviceId} onChange={(event) => setServiceId(event.target.value)}><option value="">Not specified</option>{services.filter((service) => service.is_active).map((service) => <option key={service.id} value={service.id}>{service.name} · {service.duration_minutes} min</option>)}</SelectField></div>
    <div className="form-grid"><Field label="Starts" id="starts_at" name="starts_at" type="datetime-local" required value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /><Field label="Ends" id="ends_at" name="ends_at" type="datetime-local" required value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></div>
    <TextAreaField label="Notes" id="notes" name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
    <div className="form-actions"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save as pending"}</Button></div>
  </form>;
}

function AppointmentDetails({ appointment, services, timezone, onCancel, busy }: { appointment: Appointment; services: Service[]; timezone: string; onCancel: () => void; busy: boolean }) {
  return <div className="appointment-detail"><div className="details-grid"><Detail label="Customer" value={appointment.customer_name} /><Detail label="Status" value={appointment.status.replaceAll("_", " ")} /><Detail label="Contact" value={appointment.customer_contact || "Not recorded"} /><Detail label="Service" value={services.find((service) => service.id === appointment.service_id)?.name || "Not specified"} /><Detail label="Starts" value={formatDate(appointment.starts_at, timezone)} /><Detail label="Ends" value={formatDate(appointment.ends_at, timezone)} /><Detail label="Created through" value={appointment.source.replaceAll("_", " ")} /><Detail label="Calendar" value={appointment.status === "confirmed" ? "Confirmed by backend" : "Not connected"} />{appointment.notes && <Detail label="Notes" value={appointment.notes} wide />}</div><Notice tone={appointment.status === "confirmed" ? "success" : "warning"}>{appointment.status === "confirmed" ? "The backend marks this appointment confirmed." : "This record is not confirmed against an external calendar."}</Notice>{appointment.status === "pending" && <div className="form-actions"><Button variant="danger" disabled={busy} onClick={onCancel}>{busy ? "Updating…" : "Cancel appointment"}</Button></div>}</div>;
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) { return <div className={`detail-item ${wide ? "detail-wide" : ""}`}><span>{label}</span><strong>{value}</strong></div>; }
