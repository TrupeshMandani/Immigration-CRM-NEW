import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteNavbar } from "@/components/navbar/site-navbar";
import { SiteFooter } from "@/components/navbar/site-footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: "CompleteCanadaVisa | Enterprise Immigration Platform",
  description:
    "CompleteCanadaVisa delivers an enterprise-grade pathway to Canada for students, workers, and families through a trusted portal experience.",
  keywords: [
    "Canada immigration",
    "study visa",
    "work permit",
    "enterprise immigration platform",
    "CompleteCanadaVisa",
  ],
  openGraph: {
    title: "CompleteCanadaVisa | Your Journey to Canada Starts Here",
    description:
      "An enterprise immigration experience connecting global talent and families to Canada with transparency and trust.",
    url: "https://completecanadavisa.com",
    siteName: "CompleteCanadaVisa",
    images: [
      {
        url: "/file.svg",
        width: 400,
        height: 400,
        alt: "CompleteCanadaVisa interface motif",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CompleteCanadaVisa",
    description:
      "Enterprise immigration programs for study, work, and permanent residence in Canada.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#910b20",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} text-slate-900 antialiased`}
      >
        <SiteNavbar />
        <main className="min-h-screen">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
