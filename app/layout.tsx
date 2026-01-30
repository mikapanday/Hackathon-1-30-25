import type { Metadata } from "next";
import localFont from "next/font/local";
import Link from "next/link";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "AAC Planning Assistant",
  description: "Augmentative and Alternative Communication planning assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#1a1a1a] text-[#ededed]`}
      >
        <nav className="flex items-center gap-6 p-4 border-b border-gray-800">
          <Link 
            href="/" 
            className="nav-link font-semibold"
          >
            Home
          </Link>
          <Link 
            href="/dashboard" 
            className="nav-link"
          >
            Dashboard
          </Link>
          <Link 
            href="/fridge" 
            className="nav-link"
          >
            Fridge
          </Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
