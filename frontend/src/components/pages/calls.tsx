"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, Copy, Search, PhoneCall } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, LoadingState, PageHeader, SelectField, StatusBadge, formatDate, formatDuration, Notice } from "@/components/ui";
import { useResource } from "@/lib/use-resource";
import type { CallRecord, Business, Appointment } from "@/lib/types";

const EMPTY_CALLS: CallRecord[] = [];

export function CallsPage() {
  const callsResource = useResource<CallRecord[]>("calls?limit=100");
  const businessResource = useResource<Business>("business");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const calls = callsResource.data ?? EMPTY_CALLS;
  const filtered = useMemo(() => calls.filter((call) => {
    const query = search.trim().toLowerCase();
    const matchesQuery = !query || [call.caller_name, call.caller_number, call.id, call.summary, call.outcome].some((value) => value?.toLowerCase().includes(query));
    return matchesQuery && (status === "all" || call.status.toLowerCase() === status);
  }), [calls, search, status]);

  return <><PageHeader title="Calls" subtitle="Review caller details and the outcomes recorded for your business." />
    <div className="toolbar"><label className="search-box"><Search size={15} /><input className="input" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Search calls" placeholder="Search caller, number, summary or ID" /></label><SelectField label="Filter by status" name="call-status" value={status} onChange={(event) => setStatus(event.target.value)} className="toolbar-select"><option value="all">All statuses</option><option value="completed">Completed</option><option value="in_progress">In progress</option><option value="missed">Missed</option><option value="transferred">Transferred</option><option value="failed">Failed</option></SelectField><span className="toolbar-count">{filtered.length} records</span></div>
    {callsResource.loading || businessResource.loading ? <Card><LoadingState label="Loading call history" /></Card> : callsResource.error || businessResource.error ? <ErrorState message={callsResource.error || businessResource.error || "Unable to load calls."} retry={() => { callsResource.reload(); businessResource.reload(); }} /> : calls.length === 0 ? <Card><EmptyState title="No calls yet" description="Call records will appear here after they are saved by the backend. No sample calls are being shown." /></Card> : filtered.length === 0 ? <Card><EmptyState title="No matching calls" description="Try another caller, call ID, or status filter." /></Card> : <Card className="table-card"><div className="data-table-wrap"><table><thead><tr><th>Caller</th><th>Date &amp; time</th><th>Duration</th><th>Status</th><th>Outcome</th><th>Summary</th><th /></tr></thead><tbody>{filtered.map((call) => <tr key={call.id}><td><span className="table-primary">{call.caller_name || call.caller_number || "Unknown caller"}</span><span className="table-secondary">{call.caller_number || `Call ${call.id.slice(0,8)}`}</span></td><td>{formatDate(call.started_at, businessResource.data?.timezone)}</td><td>{formatDuration(call.duration_seconds)}</td><td><StatusBadge status={call.status} /></td><td>{call.outcome ? <span className="outcome-text">{call.outcome.replaceAll("_", " ")}</span> : <span className="muted-copy">Not recorded</span>}</td><td className="summary-cell">{call.summary || <span className="muted-copy">Not available</span>}</td><td><Link className="table-link" href={`/calls/${call.id}`}>Details <ArrowUpRight size={12} /></Link></td></tr>)}</tbody></table></div><div className="table-footnote">Showing up to 100 most recent call records. The backend does not currently support date filtering or pagination totals.</div></Card>}
  </>;
}

export function CallDetailPage({ callId }: { callId: string }) {
  const callResource = useResource<CallRecord>(`calls/${encodeURIComponent(callId)}`);
  const appointmentsResource = useResource<Appointment[]>("appointments?limit=100");
  const businessResource = useResource<Business>("business");
  const [copied, setCopied] = useState(false);
  const call = callResource.data;
  const related = (appointmentsResource.data ?? []).filter((item) => item.call_id === call?.id);
  async function copyTranscript() {
    if (!call?.transcript) return;
    await navigator.clipboard.writeText(call.transcript); setCopied(true); setTimeout(() => setCopied(false), 1800);
  }
  if (callResource.loading) return <><PageHeader title="Call detail" subtitle="Call information from your backend records." /><Card><LoadingState label="Loading call details" /></Card></>;
  if (callResource.error || !call) return <><PageHeader title="Call detail" subtitle="Call information from your backend records." /><ErrorState message={callResource.error || "Call record not found."} retry={callResource.reload} /></>;
  const timezone = businessResource.data?.timezone;
  return <><PageHeader title="Call detail" subtitle="A record of what happened on this call." action={<Link className="button button-secondary" href="/calls"><PhoneCall size={15} /> Back to calls</Link>} />
    <div className="detail-header-card"><div className="detail-caller-avatar">{(call.caller_name || call.caller_number || "?").slice(0,1).toUpperCase()}</div><div className="detail-header-main"><span className="eyebrow">CALL RECORD</span><h2>{call.caller_name || call.caller_number || "Unknown caller"}</h2><p>{call.caller_number || "Caller number not available"} <span>·</span> {formatDate(call.started_at, timezone)}</p></div><StatusBadge status={call.status} /></div>
    <div className="detail-summary-grid"><Card><div className="card-heading"><div><h2>Call summary</h2><p>Summary stored by the backend</p></div></div>{call.summary ? <p className="call-summary">{call.summary}</p> : <Notice>Summary not available for this call record.</Notice>}</Card><Card><div className="card-heading"><div><h2>Call outcome</h2><p>Recorded result and timing</p></div></div><div className="details-grid"><Detail label="Outcome" value={call.outcome?.replaceAll("_", " ") || "Not recorded"} /><Detail label="Duration" value={formatDuration(call.duration_seconds)} /><Detail label="Started" value={formatDate(call.started_at, timezone)} /><Detail label="Ended" value={formatDate(call.ended_at, timezone)} /><Detail label="Business line" value={call.extension || "Not recorded"} /></div></Card></div>
    <Card className="transcript-card"><div className="card-heading"><div><h2>Conversation transcript</h2><p>Displayed exactly as provided by the backend.</p></div>{call.transcript && <Button variant="secondary" onClick={copyTranscript}><Copy size={14} />{copied ? "Copied" : "Copy transcript"}</Button>}</div>{call.transcript ? <pre className="transcript">{call.transcript}</pre> : <EmptyState title="Transcript not available" description="The backend did not provide a transcript for this call. Audio playback is not offered because no recording endpoint exists." />}</Card>
    <Card className="related-card"><div className="card-heading"><div><h2>Related appointments</h2><p>Appointments linked to this call record</p></div></div>{appointmentsResource.loading ? <LoadingState label="Checking linked appointments" /> : appointmentsResource.error ? <Notice tone="warning">Appointment links could not be loaded.</Notice> : related.length ? related.map((appointment) => <div key={appointment.id} className="related-appointment"><div><strong>{appointment.customer_name}</strong><span>{formatDate(appointment.starts_at, timezone)}</span></div><StatusBadge status={appointment.status} /></div>) : <p className="muted-copy">No appointment is linked to this call record.</p>}</Card>
  </>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>; }
