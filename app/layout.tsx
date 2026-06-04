import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { LocaleProvider } from "@/lib/useLocale";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "App Price Radar — Compare App Store Prices Worldwide",
    template: "%s | App Price Radar",
  },
  description:
    "Compare App Store prices across 20+ countries and 100+ apps. Find the cheapest region for ChatGPT, Spotify, Netflix, Canva, and more.",
  keywords: [
    "App Store prices",
    "cheapest app store",
    "global app prices",
    "app price comparison",
    "cheapest ChatGPT",
    "cheapest Spotify",
    "cheapest Netflix",
  ],
  openGraph: {
    title: "App Price Radar — Compare App Store Prices Worldwide",
    description:
      "Find the cheapest country for your favorite apps. Compare 100+ App Store subscriptions across 20+ countries.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <LocaleProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </LocaleProvider>
      </body>
    </html>
  );
}
