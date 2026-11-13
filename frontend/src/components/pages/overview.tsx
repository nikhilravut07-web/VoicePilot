"use client";

import Link from "next/link";
import { Activity, CalendarDays, CheckCheck, PhoneCall, ArrowUpRight, AudioLines, Clock3 } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge, formatDate, formatDuration } from "@/components/ui";
import { useResource } from "@/lib/use-resource";
import type { Appointment, Business, CallRecord, ReceptionistConfig, Service } from "@/lib/types";

const PAGE_MOUNTED_AT = Date.now();

function groupCallActivity(calls: CallRecord[], timezone: string) {
  const today = new Date();
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today); day.setDate(today.getDate() - (6 - index));
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(day);
    return { key, label: new Intl.DateTimeFormat(undefined, { weekday: "short", timeZone: timezone }).format(day), calls: 0 };
  });
  for (const call of calls) {
    const day = new Date(call.started_at);
    if (Number.isNaN(day.getTime())) continue;
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(day);
    const row = days.find((candidate) => candidate.key === key);
    if (row) row.calls += 1;
  }
  return days;
}

export default function OverviewPage() {
  const callsResource = useResource<CallRecord[]>("calls?limit=100");
  const appointmentsResource = useResource<Appointment[]>("appointments?limit=100");
  const businessResource = useResource<Business>("business");
  const configResource = useResource<ReceptionistConfig>("receptionist-config");
  const servicesResource = useResource<Service[]>("services");
  const loading = callsResource.loading || appointmentsResource.loading || businessResource.loading || configResource.loading || servicesResource.loading;
  const error = callsResource.error || appointmentsResource.error || businessResource.error || configResource.error || servicesResource.error;
  const calls = callsResource.data ?? [];
  const appointments = appointmentsResource.data ?? [];
  const business = businessResource.data;
  const answeredOnly = calls.filter((call) => ["completed", "answered"].includes(call.status.toLowerCase())).length;
  const answered = answeredOnly + calls.filter((call) => call.status.toLowerCase() === "transferred").length;
  const missed = calls.filter((call) => call.status.toLowerCase() === "missed").length;
  const booked = appointments.filter((appointment) => ["pending", "confirmed"].includes(appointment.status.toLowerCase())).length;
  const failed = calls.filter((call) => call.status.toLowerCase() === "failed").length;
  const transferred = calls.filter((call) => call.status.toLowerCase() === "transferred").length;
  const upcoming = appointments.filter((appointment) => Date.parse(appointment.starts_at) >= PAGE_MOUNTED_AT && !["cancelled", "failed"].includes(appointment.status)).sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at)).slice(0, 4);
  const config = configResource.data;
  const setupComplete = Boolean(business?.category && business?.phone && business?.address && (servicesResource.data?.length ?? 0) > 0 && (config?.greeting || config?.instructions));
  const refreshAll = () => { callsResource.reload(); appointmentsResource.reload(); businessResource.reload(); configResource.reload(); servicesResource.reload(); };

  return <>
    <PageHeader title="Overview" subtitle="A clear picture of the conversations and bookings for your business." action={<Link className="button button-secondary" href="/calls">View call history <ArrowUpRight size={15} /></Link>} />
    {loading ? <Card><LoadingState label="Loading your business activity" /></Card> : error ? <ErrorState message={error} retry={refreshAll} /> : <>
      {!setupComplete && <Card className="setup-banner"><div className="setup-banner-copy"><span className="setup-icon"><AudioLines size={17} /></span><div><strong>Finish setting up your receptionist</strong><p>Add your business details, services, and a greeting to make the workspace ready for calls.</p></div></div><Link href="/onboarding" className="button button-primary">Continue setup <ArrowUpRight size={15} /></Link></Card>}
      <div className="grid-kpi">
        <KpiCard title="Total calls" value={calls.length} note="Latest 100 call records" icon={<PhoneCall size={16} />} />
        <KpiCard title="Answered calls" value={answered} note="Completed or transferred" icon={<CheckCheck size={16} />} />
        <KpiCard title="Missed calls" value={missed} note="Marked missed in call records" icon={<Activity size={16} />} />
        <KpiCard title="Appointments" value={booked} note={`${appointments.filter((item) => item.status === "pending").length} pending · ${appointments.filter((item) => item.status === "confirmed").length} confirmed`} icon={<CalendarDays size={16} />} />
      </div>
      <div className="grid-overview">
        <Card className="chart-card"><div className="card-heading"><div><h2>Call activity</h2><p>Daily call records · last 7 days · {business?.timezone ?? "UTC"}</p></div><span className="chart-period">LAST 7 DAYS</span></div>
          {calls.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={groupCallActivity(calls, business?.timezone || "UTC")} margin={{ top: 12, right: 8, bottom: 0, left: -22 }}><CartesianGrid vertical={false} stroke="#eef1f6" strokeDasharray="3 4" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9aa1ad", fontSize: 10 }} dy={9} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#9aa1ad", fontSize: 9 }} /><Tooltip cursor={{ stroke: "#dce4f5", strokeDasharray: "4 4" }} contentStyle={{ border: "1px solid #e9edf4", borderRadius: 10, fontSize: 11, boxShadow: "0 8px 24px rgba(30,48,88,.08)" }} /><Line type="monotone" dataKey="calls" name="Calls" stroke="#4d72c8" strokeWidth={2.6} dot={{ r: 3, fill: "#fff", stroke: "#4d72c8", strokeWidth: 2 }} activeDot={{ r: 5, fill: "#1a2e95" }} /></LineChart></ResponsiveContainer></div> : <EmptyState title="Call activity will appear here" description="There are no call records yet. Once calls are saved by the backend, you’ll see daily activity here." />}
        </Card>
        <Card><div className="card-heading"><div><h2>Call outcomes</h2><p>From the loaded call records</p></div></div>
          {calls.length ? <div className="outcome-list"><Outcome label="Answered" value={answeredOnly} total={calls.length} tone="green" /><Outcome label="Missed" value={missed} total={calls.length} tone="amber" /><Outcome label="Transferred" value={transferred} total={calls.length} tone="" /><Outcome label="Failed" value={failed} total={calls.length} tone="red" /><p className="muted-copy">Counts reflect call statuses recorded by the backend. Transferred calls count as answered in the KPI.</p></div> : <EmptyState title="No outcomes yet" description="Status counts will show once the backend has recorded calls." />}
        </Card>
      </div>
      <div className="grid-lower">
        <Card><div className="card-heading"><div><h2>Recent calls</h2><p>Most recent records saved by the backend</p></div><Link className="table-link" href="/calls">All calls <ArrowUpRight size={12} /></Link></div>
          {calls.length ? <div className="data-table-wrap"><table><thead><tr><th>Caller</th><th>When</th><th>Duration</th><th>Status</th><th>Summary</th><th /></tr></thead><tbody>{calls.slice(0,5).map((call) => <tr key={call.id}><td><span className="table-primary">{call.caller_name || call.caller_number || "Unknown caller"}</span><span className="table-secondary">{call.caller_number || call.id.slice(0,8)}</span></td><td>{formatDate(call.started_at, business?.timezone)}</td><td>{formatDuration(call.duration_seconds)}</td><td><StatusBadge status={call.status} /></td><td className="summary-cell">{call.summary || <span className="muted-copy">Not available</span>}</td><td><Link className="table-link" href={`/calls/${call.id}`}>Open</Link></td></tr>)}</tbody></table></div> : <EmptyState title="No calls to review" description="Saved call summaries and transcripts will show here after the first call record is created." />}
        </Card>
        <Card><div className="card-heading"><div><h2>Upcoming appointments</h2><p>Pending and confirmed business appointments</p></div><Link className="table-link" href="/appointments">See all <ArrowUpRight size={12} /></Link></div>
          {upcoming.length ? <div className="appointment-stack">{upcoming.map((item) => <Link href="/appointments" key={item.id} className="appointment-row"><span className="appointment-date"><CalendarDays size={16} /></span><span className="appointment-info"><strong>{item.customer_name}</strong><small>{formatDate(item.starts_at, business?.timezone)}{item.customer_contact ? ` · ${item.customer_contact}` : ""}</small></span><StatusBadge status={item.status} /></Link>)}</div> : <EmptyState title="Your schedule is clear" description="Upcoming appointments will appear here when they are saved for your business." action={<Link className="button button-secondary" href="/appointments">Open appointments</Link>} />}
        </Card>
      </div>
      <div className="dashboard-footnote"><Clock3 size={13} /> Data shown from the latest 100 records available through the backend. Counts are not date-filtered because the API does not expose a date range yet.</div>
    </>}
  </>;
}

function KpiCard({ title, value, note, icon }: { title: string; value: number; note: string; icon: React.ReactNode }) {
  return <div className="kpi-card"><div className="kpi-top"><span>{title}</span><span className="kpi-icon">{icon}</span></div><strong className="kpi-value">{value}</strong><span className="kpi-note">{note}</span></div>;
}

function Outcome({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const width = total ? Math.round((value / total) * 100) : 0;
  return <div className="outcome-row"><div className="outcome-label"><span>{label}</span><strong>{value}</strong></div><div className="progress-track" role="progressbar" aria-label={`${label} call proportion`} aria-valuenow={width} aria-valuemin={0} aria-valuemax={100}><div className={`progress-fill ${tone}`} style={{ width: `${width}%` }} /></div></div>;
}
