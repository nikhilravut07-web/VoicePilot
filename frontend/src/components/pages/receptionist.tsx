"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2, AudioLines } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, Field, LoadingState, Notice, PageHeader, SelectField, TextAreaField } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useResource } from "@/lib/use-resource";
import type { Business, ReceptionistConfig, Service } from "@/lib/types";

export default function ReceptionistPage() {
  const configResource = useResource<ReceptionistConfig>("receptionist-config");
  const servicesResource = useResource<Service[]>("services");
  const businessResource = useResource<Business>("business");
  const error = configResource.error || servicesResource.error || businessResource.error;
  const loading = configResource.loading || servicesResource.loading || businessResource.loading;
  const reload = () => { configResource.reload(); servicesResource.reload(); businessResource.reload(); };
  const config = configResource.data;

  return <>
    <PageHeader title="AI receptionist" subtitle="Set the business context and response preferences saved for your receptionist." />
    {loading ? <Card><LoadingState label="Loading receptionist settings" /></Card> : error || !config ? <ErrorState message={error || "Receptionist configuration is not available."} retry={reload} /> : <ReceptionistEditor key={config.business_id} initialConfig={config} business={businessResource.data} services={servicesResource.data ?? []} onSaved={reload} />}
  </>;
}

function ReceptionistEditor({ initialConfig, business, services, onSaved }: { initialConfig: ReceptionistConfig; business: Business | null; services: Service[]; onSaved: () => void }) {
  const [config, setConfig] = useState<ReceptionistConfig>({ ...initialConfig, faqs: initialConfig.faqs ?? [] });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const update = (key: keyof ReceptionistConfig, value: unknown) => setConfig((current) => ({ ...current, [key]: value }));

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setNotice(null);
    try {
      const saved = await apiFetch<ReceptionistConfig>("receptionist-config", { method: "PATCH", body: JSON.stringify({ receptionist_name: config.receptionist_name || null, greeting: config.greeting || null, instructions: config.instructions, tone: config.tone || null, faqs: config.faqs, handoff_enabled: config.handoff_enabled, handoff_destination: config.handoff_destination || null }) });
      setConfig({ ...saved, faqs: saved.faqs ?? [] });
      setNotice({ tone: "success", message: "Receptionist settings saved." });
      onSaved();
    } catch (error) { setNotice({ tone: "error", message: error instanceof ApiError ? error.message : "Unable to save receptionist settings." }); }
    finally { setBusy(false); }
  }

  return <>
    {notice && <Notice tone={notice.tone}>{notice.message}</Notice>}
    <Notice tone="warning">These settings are saved in the backend, but the AI voice engine does not consume them yet. Saving does not enable live call handling or human transfer.</Notice>
    <div className="profile-stack"><Card><form className="form-stack" onSubmit={save}>
      <div className="form-section"><div className="form-section-heading"><h3>Receptionist identity</h3><p>Give callers a consistent opening.</p></div><div className="form-grid"><Field label="Receptionist name" id="receptionist-name" maxLength={100} value={config.receptionist_name ?? ""} onChange={(event) => update("receptionist_name", event.target.value)} placeholder="Optional" /><SelectField label="Communication tone" name="receptionist-tone" value={config.tone ?? ""} onChange={(event) => update("tone", event.target.value || null)}><option value="">Not specified</option><option value="friendly">Friendly</option><option value="professional">Professional</option><option value="calm">Calm</option><option value="concise">Concise</option></SelectField></div><TextAreaField label="Greeting message" id="receptionist-greeting" value={config.greeting ?? ""} onChange={(event) => update("greeting", event.target.value)} hint="The backend stores this text; no voice engine reads it in Phase 2." /></div>
      <div className="form-section"><div className="form-section-heading"><h3>Business instructions</h3><p>Describe approved information and boundaries for future call handling.</p></div><TextAreaField label="AI instructions" id="receptionist-instructions" value={config.instructions} onChange={(event) => update("instructions", event.target.value)} placeholder="Add the facts and response boundaries the receptionist should follow." /></div>
      <div className="form-section"><div className="section-row-heading"><div className="form-section-heading"><h3>Frequently asked questions</h3><p>Questions and answers stored for future AI context.</p></div><Button type="button" variant="secondary" onClick={() => update("faqs", [...config.faqs, { question: "", answer: "" }])}><Plus size={14} /> Add FAQ</Button></div>
        {config.faqs.length ? <div className="faq-list">{config.faqs.map((faq, index) => <div className="faq-row" key={index}><div className="faq-fields"><Field label={`Question ${index + 1}`} id={`faq-question-${index}`} value={faq.question ?? ""} onChange={(event) => update("faqs", config.faqs.map((item, i) => i === index ? { ...item, question: event.target.value } : item))} /><TextAreaField label="Answer" id={`faq-answer-${index}`} value={faq.answer ?? ""} onChange={(event) => update("faqs", config.faqs.map((item, i) => i === index ? { ...item, answer: event.target.value } : item))} /></div><button className="icon-button delete-icon" type="button" aria-label={`Remove FAQ ${index + 1}`} title="Remove FAQ" onClick={() => update("faqs", config.faqs.filter((_, i) => i !== index))}><Trash2 size={15} /></button></div>)}</div> : <EmptyState title="No FAQs added" description="Add answers to common questions your receptionist may receive." />}</div>
      <div className="form-section"><div className="form-section-heading"><h3>Human handoff preference</h3><p>Saved as configuration only. No local SIP transfer is implemented in the current backend.</p></div><div className="toggle-row"><input id="handoff-enabled" type="checkbox" checked={config.handoff_enabled} onChange={(event) => update("handoff_enabled", event.target.checked)} /><label htmlFor="handoff-enabled">Enable handoff preference</label></div>{config.handoff_enabled && <Field label="Handoff destination" id="handoff-destination" maxLength={80} value={config.handoff_destination ?? ""} onChange={(event) => update("handoff_destination", event.target.value)} hint="This destination is stored but not used to route calls yet." />}</div>
      <div className="form-actions"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save receptionist settings"}</Button></div>
    </form></Card>
    <Card><div className="card-heading"><div><h2>Business context</h2><p>Information stored for this business.</p></div></div><div className="context-list"><Context label="Business" value={business?.name || "Not available"} /><Context label="Type" value={business?.category || "Not set"} /><Context label="Timezone" value={business?.timezone || "Not set"} /><Context label="Services" value={services.filter((service) => service.is_active).map((service) => service.name).join(", ") || "No active services"} /></div><div className="preview-note"><span className="preview-orb"><AudioLines size={20} /></span><div><strong>Configuration stored</strong><p>This page edits backend configuration. A live conversation preview is not available because no AI engine endpoint exists.</p></div></div></Card></div>
  </>;
}

function Context({ label, value }: { label: string; value: string }) { return <div className="context-row"><span>{label}</span><strong>{value}</strong></div>; }
