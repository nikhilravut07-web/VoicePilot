"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button, Field, Notice } from "@/components/ui";
import { apiErrorMessage, ApiError } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [values, setValues] = useState({ business_name: "", full_name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const update = (key: keyof typeof values) => (event: React.ChangeEvent<HTMLInputElement>) => setValues((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const body = await response.json();
      if (!response.ok) throw new ApiError(apiErrorMessage(body, "Unable to create the account."), response.status);
      router.replace("/onboarding"); router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to create the account. Please try again.");
    } finally { setBusy(false); }
  }

  return <div className="auth-card"><div className="auth-mobile-brand"><span className="brand-mark"><Check size={18} /></span>VoicePilot</div><div className="auth-card-heading"><div className="eyebrow">GET STARTED</div><h2>Create your business account</h2><p>Your receptionist starts with a workspace for your business.</p></div>{error && <Notice tone="error">{error}</Notice>}<form className="form-stack" onSubmit={submit}>
    <Field label="Business name" id="business_name" name="business_name" autoComplete="organization" maxLength={160} required value={values.business_name} onChange={update("business_name")} placeholder="e.g. Northside Wellness" />
    <Field label="Your name" id="full_name" name="full_name" autoComplete="name" maxLength={160} required value={values.full_name} onChange={update("full_name")} placeholder="How should we address you?" />
    <Field label="Work email" id="email" name="email" type="email" autoComplete="email" required value={values.email} onChange={update("email")} placeholder="you@business.com" />
    <Field label="Password" id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={values.password} onChange={update("password")} hint="Use at least 12 characters." />
    <Button type="submit" disabled={busy} className="button-full">{busy ? "Creating account…" : <>Create account <ArrowRight size={17} /></>}</Button>
  </form><p className="auth-legal">By continuing, you create a private workspace for your business.</p><p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p></div>;
}
