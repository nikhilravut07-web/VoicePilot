"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { Card, ErrorState, LoadingState, Notice, PageHeader } from "@/components/ui";
import type { SessionPayload } from "@/lib/types";

export default function SettingsPage() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/session", { cache: "no-store" }).then(async (response) => {
      const payload = await response.json(); if (!response.ok) throw new Error(payload.detail || "Unable to load account settings."); return payload as SessionPayload;
    }).then((payload) => { if (alive) setSession(payload); }).catch((reason: unknown) => { if (alive) setError(reason instanceof Error ? reason.message : "Unable to load account settings."); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [revision]);
  return <><PageHeader title="Settings" subtitle="Account and workspace information supported by your current backend." />
    {loading ? <Card><LoadingState label="Loading account information" /></Card> : error || !session ? <ErrorState message={error || "Account information unavailable."} retry={() => { setLoading(true); setError(""); setRevision((value) => value + 1); }} /> : <div className="settings-grid"><Card><div className="settings-icon"><UserRound size={18} /></div><div className="card-heading"><div><h2>Account</h2><p>Read-only account details from the authenticated session.</p></div></div><div className="details-grid"><Detail label="Name" value={session.user.full_name} /><Detail label="Email" value={session.user.email} /><Detail label="Role" value={session.user.role} /><Detail label="Account ID" value={session.user.id} /></div><Notice tone="info">Profile edits, email verification, password changes, and recovery are not supported by the backend yet.</Notice></Card><Card><div className="settings-icon"><ShieldCheck size={18} /></div><div className="card-heading"><div><h2>Workspace</h2><p>Business-specific settings and security state.</p></div></div><div className="details-grid"><Detail label="Business" value={session.business.name} /><Detail label="Timezone" value={session.business.timezone} /><Detail label="Business ID" value={session.business.id} /></div><Link className="button button-secondary settings-link" href="/business">Open business profile <ArrowUpRight size={14} /></Link></Card><Card><div className="settings-icon"><KeyRound size={18} /></div><div className="card-heading"><div><h2>Session security</h2><p>Authentication uses the FastAPI bearer-token session.</p></div></div><p className="settings-copy">The access token is held in a server-set, HttpOnly cookie and is never written to browser storage or returned to client-side code.</p><Notice tone="warning">There is no password reset or session management endpoint. Sign out from the account menu to end this session.</Notice></Card></div>}
  </>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>; }
