"use client";
import { useState, type FormEvent } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";
import { Button, Field, Notice, TextAreaField } from "@/components/ui";
import type { Business, Service } from "@/lib/types";

const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
type DayHours = { mode: "unset" | "closed" | "open"; open: string; close: string };
type HoursState = Record<(typeof days)[number], DayHours>;
function emptyHours(): HoursState { return Object.fromEntries(days.map((day) => [day, { mode: "unset", open: "", close: "" }])) as HoursState; }
function fromBusinessHours(input: Business["operating_hours"]): HoursState {
  const result = emptyHours();
  for (const day of days) { const current = input?.[day]; if (current?.closed) result[day] = { mode: "closed", open: "", close: "" }; else if (current?.open || current?.close) result[day] = { mode: "open", open: current.open ?? "", close: current.close ?? "" }; }
  return result;
}

export function BusinessSettingsForm({ business, services, onboarding = false, onSaved }: { business: Business; services: Service[]; onboarding?: boolean; onSaved: () => void }) {
  const [name, setName] = useState(business.name); const [category, setCategory] = useState(business.category ?? ""); const [email, setEmail] = useState(business.email ?? "");
  const [phone, setPhone] = useState(business.phone ?? ""); const [address, setAddress] = useState(business.address ?? ""); const [timezone, setTimezone] = useState(business.timezone || "UTC");
  const [hours, setHours] = useState<HoursState>(() => fromBusinessHours(business.operating_hours)); const [serviceName, setServiceName] = useState(""); const [serviceDuration, setServiceDuration] = useState("30"); const [serviceDescription, setServiceDescription] = useState("");
  const [busy, setBusy] = useState(false); const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null); const needsService = onboarding && services.length === 0;
  function changeHours(day: typeof days[number], values: Partial<DayHours>) { setHours((current) => ({ ...current, [day]: { ...current[day], ...values } })); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setNotice(null);
    if (needsService && !serviceName.trim()) { setNotice({ tone: "error", message: "Add at least one service to finish onboarding." }); setBusy(false); return; }
    const parsedDuration = Number(serviceDuration);
    if (needsService && (!Number.isInteger(parsedDuration) || parsedDuration < 1 || parsedDuration > 1440)) { setNotice({ tone: "error", message: "Service duration must be between 1 and 1440 minutes." }); setBusy(false); return; }
    const operating_hours: Business["operating_hours"] = {};
    for (const day of days) {
      const value = hours[day];
      if (value.mode === "closed") operating_hours[day] = { closed: true };
      else if (value.mode === "open" && value.open && value.close) operating_hours[day] = { open: value.open, close: value.close };
    }
    try {
      await apiFetch<Business>("business", { method: "PATCH", body: JSON.stringify({ name: name.trim(), category: category.trim() || null, email: email.trim() || null, phone: phone.trim() || null, address: address.trim() || null, timezone: timezone.trim(), operating_hours }) });
      if (needsService) {
        try { await apiFetch<Service>("services", { method: "POST", body: JSON.stringify({ name: serviceName.trim(), description: serviceDescription.trim() || null, duration_minutes: parsedDuration }) }); }
        catch (error) { const message = error instanceof ApiError ? error.message : "Unable to save the service."; setNotice({ tone: "error", message: `Business profile saved, but service setup did not finish: ${message}` }); setBusy(false); return; }
      }
      setNotice({ tone: "success", message: onboarding ? "Business setup saved. Your workspace is ready." : "Business profile saved." }); onSaved();
    } catch (error) { setNotice({ tone: "error", message: error instanceof ApiError ? error.message : "Unable to save your business profile." }); }
    finally { setBusy(false); }
  }

  return <form className="form-stack" onSubmit={save}>
    {notice && <Notice tone={notice.tone}>{notice.message}</Notice>}
    <div className="form-section"><div className="form-section-heading"><h3>Business details</h3><p>These details are stored in your current business profile.</p></div><div className="form-grid"><Field label="Business name" id="business-name" required maxLength={160} value={name} onChange={(event) => setName(event.target.value)} /><Field label="Business type" id="business-category" maxLength={100} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. Wellness studio" /><Field label="Business email" id="business-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /><Field label="Phone" id="business-phone" type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} /><Field label="Address" id="business-address" maxLength={300} value={address} onChange={(event) => setAddress(event.target.value)} /><Field label="Business timezone" id="business-timezone" required maxLength={64} value={timezone} onChange={(event) => setTimezone(event.target.value)} hint="Use an IANA timezone, for example Asia/Kolkata." /></div><Notice>Business description is not supported by the current FastAPI profile schema, so it is not collected here.</Notice></div>
    <div className="form-section"><div className="form-section-heading"><h3>Operating hours</h3><p>Leave days unset if you have not decided the hours yet. Times are stored as entered.</p></div><div className="hours-grid">{days.map((day) => <div className="hours-row" key={day}><span className="hours-day">{day[0].toUpperCase() + day.slice(1)}</span><select className="select hours-mode" aria-label={`${day} status`} value={hours[day].mode} onChange={(event) => changeHours(day, { mode: event.target.value as DayHours["mode"] })}><option value="unset">Not set</option><option value="open">Open</option><option value="closed">Closed</option></select>{hours[day].mode === "open" ? <><input className="input" aria-label={`${day} opening time`} type="time" required value={hours[day].open} onChange={(event) => changeHours(day, { open: event.target.value })} /><input className="input" aria-label={`${day} closing time`} type="time" required value={hours[day].close} onChange={(event) => changeHours(day, { close: event.target.value })} /></> : <span className="hours-closed">{hours[day].mode === "closed" ? "Closed" : "Hours not set"}</span>}</div>)}</div></div>
    {needsService && <div className="form-section"><div className="form-section-heading"><h3>Add your first service</h3><p>Services help the receptionist understand what your business offers.</p></div><Field label="Service name" id="first-service-name" required maxLength={160} value={serviceName} onChange={(event) => setServiceName(event.target.value)} /><div className="form-grid"><Field label="Appointment duration (minutes)" id="first-service-duration" type="number" min={1} max={1440} required value={serviceDuration} onChange={(event) => setServiceDuration(event.target.value)} /><TextAreaField label="Service description" id="first-service-description" value={serviceDescription} onChange={(event) => setServiceDescription(event.target.value)} /></div></div>}
    <div className="form-actions"><Button type="submit" disabled={busy}>{busy ? "Saving…" : onboarding ? "Save and continue" : "Save business profile"}</Button></div>
  </form>;
}
