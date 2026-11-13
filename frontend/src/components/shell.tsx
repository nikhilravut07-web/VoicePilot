"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, AudioLines, Cable, CalendarDays, ChevronDown, LayoutDashboard, LogOut, Menu, PhoneCall, Settings2, UserRound, X } from "lucide-react";
import type { Business, User } from "@/lib/types";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/calls", label: "Calls", icon: PhoneCall },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
];
const configItems = [
  { href: "/receptionist", label: "AI receptionist", icon: AudioLines },
  { href: "/business", label: "Business profile", icon: Activity },
  { href: "/integrations", label: "Integrations", icon: Cable },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export function DashboardShell({ user, business, children }: { user: User; business: Business; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const active = [...navItems, ...configItems].find((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`)));

  async function signOut() {
    setSigningOut(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); }
    finally { router.replace("/login"); router.refresh(); }
  }

  return <div className="app-frame">
    {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`} aria-label="Main navigation">
      <div className="brand-row"><div className="brand-mark"><AudioLines size={20} strokeWidth={2.4} /></div><div><div className="brand-name">VoicePilot</div><div className="brand-caption">RECEPTION CONSOLE</div></div><button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
      <div className="workspace-switch"><div className="workspace-avatar">{business.name.slice(0, 1).toUpperCase()}</div><div className="workspace-copy"><strong>{business.name}</strong><span>Business workspace</span></div><ChevronDown size={16} /></div>
      <nav className="nav-groups">
        <div className="nav-label">WORKSPACE</div>
        {navItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`nav-link ${active?.href === href ? "nav-link-active" : ""}`}><Icon size={18} /><span>{label}</span></Link>)}
        <div className="nav-label nav-label-spaced">CONFIGURATION</div>
        {configItems.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileOpen(false)} className={`nav-link ${active?.href === href ? "nav-link-active" : ""}`}><Icon size={18} /><span>{label}</span></Link>)}
      </nav>
      <div className="sidebar-footer"><div className="reception-health"><span className="health-idle" /><div><strong>Receptionist setup</strong><span>Voice engine not connected</span></div></div><div className="sidebar-user"><div className="user-avatar"><UserRound size={17} /></div><div className="user-copy"><strong>{user.full_name}</strong><span>{user.email}</span></div><button className="icon-button logout-button" title="Sign out" aria-label="Sign out" disabled={signingOut} onClick={signOut}><LogOut size={17} /></button></div></div>
    </aside>
    <main className="main-shell"><header className="topbar"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={19} /></button><div className="breadcrumb"><span>VoicePilot</span><span className="breadcrumb-divider">/</span><strong>{active?.label ?? "Workspace"}</strong></div><div className="topbar-right"><div className="timezone-chip"><span className="timezone-dot" />{business.timezone || "UTC"}</div><div className="topbar-avatar" aria-label={`Signed in as ${user.full_name}`}>{user.full_name.slice(0, 1).toUpperCase()}</div></div></header><div className="page-content">{children}</div></main>
  </div>;
}
