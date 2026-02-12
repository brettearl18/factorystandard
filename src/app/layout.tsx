import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });

// Avoid static generation so Firebase/auth code (which can reference `location`) never runs in Node
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Factory Standards - Perth Guitar Runs",
  description: "Track guitar builds through production",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-body bg-[var(--color-page)] text-[var(--color-text)]`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

