import type { Metadata } from "next";
import { DM_Serif_Display, Geist, Geist_Mono, Outfit } from "next/font/google";
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

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
  weight: "400",
});

const outfit = Outfit({
  variable: "--font-outfit",
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
      <body className={`${geistSans.variable} ${geistMono.variable} ${dmSerifDisplay.variable} ${outfit.variable} antialiased`}>
        <OrgProvider>
          <ThemeLoader />
          <div className="min-h-screen bg-[var(--background)]">{children}</div>
        </OrgProvider>
      </body>
    </html>
  );
}
