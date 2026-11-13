import { AuthShell } from "@/components/auth-shell";
import { getServerSession } from "@/lib/server/session";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (await getServerSession()) redirect("/dashboard");
  return <AuthShell>{children}</AuthShell>;
}
