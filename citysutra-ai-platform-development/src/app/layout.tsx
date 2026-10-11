import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import { CityProvider } from "@/components/CityProvider";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CitySutra AI — Urban Climate Action Twin",
    template: "CitySutra AI · %s",
  },
  description:
    "Neighborhood-level environmental operations platform: air, heat & water, waste & energy in one explainable action system. Delhi-first, any city.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-white font-sans text-ink antialiased">
        <Nav />
        <CityProvider>{children}</CityProvider>
        <footer className="mx-auto max-w-7xl px-4 pb-10 pt-8">
          <div className="border-t-2 border-ink pt-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink">
                  CitySutra AI <span className="text-ink-faint">{"// decision-support prototype"}</span>
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-faint">
                  Does not dispatch teams, file complaints with authorities, compute CPCB
                  National AQI, or make medical risk claims. Map © OpenStreetMap
                  contributors. Air &amp; weather: Open-Meteo grid forecasts (≈15–25 km),
                  not street sensors.
                </p>
              </div>
              <div className="num text-right text-[10px] leading-relaxed text-ink-faint">
                <div>ENV-HACKS · AWS CENTRE DELHI · 2026</div>
                <div className="mt-1 flex justify-end gap-1.5">
                  <span className="h-2 w-2 rounded-[1px] bg-ink" />
                  <span className="h-2 w-2 rounded-[1px] bg-ink/40" />
                  <span className="h-2 w-2 rounded-[1px] bg-teal" />
                  <span className="h-2 w-2 rounded-[1px] bg-amber" />
                  <span className="h-2 w-2 rounded-[1px] bg-coral" />
                </div>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
