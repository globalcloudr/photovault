import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeLoader } from "@/components/theme/theme-loader";
import { OrgProvider } from "@/components/org/org-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PhotoVault",
  description: "Secure photo album management for internal teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <OrgProvider>
          <ThemeLoader />
          <div className="min-h-screen bg-[var(--background)]">{children}</div>
        </OrgProvider>
      </body>
    </html>
  );
}
