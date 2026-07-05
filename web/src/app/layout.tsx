import type { Metadata } from "next";
import { Playfair_Display, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GoogleAnalytics } from "@/components/Analytics";
import { LocalBusinessSchema } from "@/components/SchemaOrg";

const playfairDisplay = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hamptons Tree Experts | East End Tree & Landscape Services",
    template: "%s | Hamptons Tree Experts",
  },
  description:
    "Professional tree removal, stump grinding, mulching, and landscape services for Long Island's East End. Serving Westhampton, Quogue, Remsenburg, Speonk, Riverhead, and surrounding areas.",
  metadataBase: new URL("https://hamptonstreeexperts.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Hamptons Tree Experts",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfairDisplay.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-body">
        <GoogleAnalytics />
        <LocalBusinessSchema />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
