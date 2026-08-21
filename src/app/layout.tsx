import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import { Masthead } from "@/components/Masthead";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["700", "800"],
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Foundry — templates that ship on any stack",
  description:
    "WordPress themes, HTML kits, Shopify storefronts and Framer templates in one catalogue. Buy once, keep the files, get a year of updates.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}>
        <SmoothScroll />
        <Masthead />
        <main>{children}</main>
        <footer className="footer">
          <div className="wrap footer__inner">
            <span className="wordmark">
              Foundry<span>.</span>
            </span>
            <p style={{ margin: 0, maxWidth: "44ch" }}>
              Every purchase includes the files forever and twelve months of
              updates. Renew for new versions, or don&apos;t — what you
              installed keeps working either way.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
