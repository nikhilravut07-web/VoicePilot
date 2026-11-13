"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Button, Field, Notice } from "@/components/ui";
import { apiErrorMessage, ApiError } from "@/lib/api-client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const expired = params.get("reason") === "expired";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const body = await response.json();
      if (!response.ok) throw new ApiError(apiErrorMessage(body, "Unable to sign in."), response.status);
      router.replace(body.setup_required ? "/onboarding" : "/dashboard");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to sign in. Please try again.");
    } finally { setBusy(false); }
  }

  return <div className="auth-card"><div className="auth-mobile-brand"><span className="brand-mark"><LockKeyhole size={18} /></span>VoicePilot</div><div className="auth-card-heading"><div className="eyebrow">WELCOME BACK</div><h2>Sign in to your workspace</h2><p>Pick up where your business left off.</p></div>{expired && <Notice tone="warning">Your session ended. Sign in again to continue.</Notice>}{error && <Notice tone="error">{error}</Notice>}<form className="form-stack" onSubmit={submit}>
    <Field label="Work email" id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@business.com" />
    <Field label="Password" id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
    <Button type="submit" disabled={busy} className="button-full">{busy ? "Signing in…" : <>Sign in <ArrowRight size={17} /></>}</Button>
  </form><p className="auth-switch">New to VoicePilot? <Link href="/register">Create a business account</Link></p><p className="auth-security"><LockKeyhole size={13} /> Your sign-in is protected with a secure session.</p></div>;
}

export default function LoginPage() {
  return <Suspense fallback={<div className="auth-card">Loading sign in…</div>}><LoginForm /></Suspense>;
}
