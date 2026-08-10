import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "./component/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dawit Games",
  description: "Dawit Games",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/abol-192.svg",
    apple: "/icons/abol-192.svg",
    shortcut: "/icons/abol-192.svg",
  },
};

export const viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-blue-900 text-black min-h-screen flex flex-col`}
      >
        <AuthProvider />
        {children}
      </body>
    </html>
  );
}
