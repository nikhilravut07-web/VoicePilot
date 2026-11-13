import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VoicePilot | Reception dashboard", template: "%s | VoicePilot" },
  description: "Configure your AI receptionist and review business calls and appointments.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
