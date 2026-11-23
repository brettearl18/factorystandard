import type { Metadata } from "next";
import { Oswald, Source_Sans_3, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

// Oswald = shop-floor / wayfinding condensed (not the usual AI Inter/Barlow stack)
const display = Oswald({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

// Source Sans 3 = readable UI body with real character (not Inter / Plex)
const body = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

// Avoid static generation so Firebase/auth code (which can reference `location`) never runs in Node
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Australian Production - Perth Guitar Runs",
  description: "Track guitar builds through production",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className={`${body.className} bg-bg text-text antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
