import type { ReactNode } from "react";
import { DashboardShell } from "@/components/shell";
import { requireServerSession } from "@/lib/server/session";

export default async function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await requireServerSession();
  return <DashboardShell user={session.user} business={session.business}>{children}</DashboardShell>;
}
