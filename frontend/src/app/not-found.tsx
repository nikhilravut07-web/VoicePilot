import Link from "next/link";
import { AudioLines } from "lucide-react";

export default function NotFound() {
  return <main className="auth-frame not-found-frame"><section className="not-found-content"><span className="brand-mark"><AudioLines size={19} /></span><p className="eyebrow">404 · PAGE NOT FOUND</p><h1>This page is off the call sheet.</h1><p>We couldn’t find the page you asked for. Check the address or head back to your dashboard.</p><Link className="button button-primary" href="/dashboard">Go to dashboard</Link></section></main>;
}
