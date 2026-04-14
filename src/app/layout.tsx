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

const PAYPAL_CLIENT_ID = "AeAGHi1vh_qfDQBtC3htdoRkBXClwfZCEkbQUCR8RJcLlAASy6ji_z_tP_HxYCQJpxdzYsq_zdQ-fgIX";

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
      <head>
        <meta name="google-site-verification" content="SFctGnAvGk495s9Myg05dlKqb4lZgsFYO5Jp_dejQ2Q" />
      </head>
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
