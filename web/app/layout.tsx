import type { Metadata } from "next";
import { Alegreya, Alegreya_Sans, IM_Fell_English_SC } from "next/font/google";
import Providers from "./providers";
import "./globals.css";

// Old-print small caps for titles, Alegreya for prose, Alegreya Sans for stats and controls
const display = IM_Fell_English_SC({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const serif = Alegreya({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Alegreya_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mandate",
  description:
    "A guild that keeps running while you're away. Every outcome is decided on Solana; the chronicle tells the story.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${sans.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
