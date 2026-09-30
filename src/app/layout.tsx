import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { AuthHashRedirect } from "@/components/auth-hash-redirect";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Follow-up — projects, to-dos & reminders",
  description: "Projects, message boards, to-dos, and automatic follow-ups for your team.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <AuthHashRedirect />
        {children}
      </body>
    </html>
  );
}
