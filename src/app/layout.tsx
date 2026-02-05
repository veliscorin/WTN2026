import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Parkinsans } from "next/font/google";
import "./globals.css";
import { TestModeBanner } from "@/components/test-mode-banner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const parkinsans = Parkinsans({
  variable: "--font-parkinsans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host = headersList.get("host") || "unknown";
  
  let prefix = "";
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    prefix = "(LOCAL)";
  } else {
    prefix = `(${host.toUpperCase()})`;
  }

  return {
    title: `${prefix} WTN 2026`,
    description: "What's The News 2026 Academic Quiz",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${parkinsans.variable} antialiased`}
      >
        <TestModeBanner />
        {children}
      </body>
    </html>
  );
}

