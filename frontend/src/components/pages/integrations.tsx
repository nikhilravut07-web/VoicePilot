"use client";

import { CalendarDays, CircleHelp, ExternalLink, LockKeyhole } from "lucide-react";
import { Button, Card, ErrorState, LoadingState, Notice, PageHeader, StatusBadge, formatDate } from "@/components/ui";
import { useResource } from "@/lib/use-resource";
import type { Integration } from "@/lib/types";

export default function IntegrationsPage() {
  const integrations = useResource<Integration[]>("integrations");
  const calendar = useResource<Integration>("integrations/google-calendar");
  const loading = integrations.loading || calendar.loading;
  const error = integrations.error || calendar.error;
  const retry = () => { integrations.reload(); calendar.reload(); };
  return <><PageHeader title="Integrations" subtitle="See which external services are available to your business." />
    <Notice tone="info">Connection actions reflect backend capabilities. OAuth and calendar synchronization have not been implemented.</Notice>
    {loading ? <Card><LoadingState label="Checking integration status" /></Card> : error || !calendar.data ? <ErrorState message={error || "Integration status unavailable."} retry={retry} /> : <>
      <Card className="integration-card"><div className="integration-icon"><CalendarDays size={23} /></div><div className="integration-body"><div className="integration-title-row"><div><h3>Google Calendar</h3><p>Calendar availability checks and appointment writes are not available yet. This page shows the connection placeholder saved by the backend.</p></div><StatusBadge status={calendar.data.status} /></div><div className="integration-meta"><span><LockKeyhole size={13} /> Credentials stay on the backend</span><span>Last checked: {formatDate(calendar.data.last_checked_at)}</span></div><div className="integration-actions"><Button variant="secondary" disabled title="OAuth is not implemented">Connect Google Calendar <ExternalLink size={13} /></Button><span className="muted-copy">Not available in this phase</span></div></div></Card>
      {calendar.data.status !== "disconnected" && <Card className="integration-detail"><div className="card-heading"><div><h2>Connection information</h2><p>Values reported by the backend.</p></div></div><div className="details-grid"><Detail label="Status" value={calendar.data.status} /><Detail label="Account" value={calendar.data.external_account || "Not connected"} /><Detail label="Calendar" value={calendar.data.external_resource_id || "Not selected"} />{calendar.data.error_message && <Detail label="Latest issue" value={calendar.data.error_message} wide />}</div></Card>}
      <div className="integration-footnote"><CircleHelp size={15} /><span>The backend currently provides status only. No connect, reconnect, or disconnect action is available, so none is simulated here.</span></div>
      <Card className="coming-later"><div className="card-heading"><div><h2>Other services</h2><p>Optional integrations remain outside the current API.</p></div></div><div className="coming-grid"><div><strong>CRM</strong><span>Not available</span></div><div><strong>Email &amp; messaging</strong><span>Not available</span></div></div></Card>
      {integrations.data && integrations.data.length > 1 && <p className="muted-copy">{integrations.data.length} integration status records are available for this business.</p>}
    </>}
  </>;
}

function Detail({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) { return <div className={`detail-item ${wide ? "detail-wide" : ""}`}><span>{label}</span><strong>{value}</strong></div>; }
