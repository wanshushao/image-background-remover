import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BgRemover - Remove Image Background Instantly",
  description: "AI-powered background removal for product photos. Fast, accurate, affordable.",
};

const PAYPAL_CLIENT_ID = "AXbvj_Ut_jWHmjb_bQ5l2Sz8gCHb0IUZ4QwT6YmFc7kzGe8KZApg5s6Y0jeCTrKuNOsnTCUGvxM7o9_o";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Script
          src={`https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture`}
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
