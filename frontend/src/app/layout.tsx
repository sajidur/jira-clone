import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Jira Enterprise Clone | .NET 10 + PostgreSQL",
  description: "Full Jira compatible platform with .NET 10 Web API, remote PostgreSQL and Next.js frontend with Jira JSON & CSV export/import.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden`}
    >
      <body className="h-full w-full max-w-full overflow-hidden flex flex-col bg-white text-slate-900">
        {children}
      </body>
    </html>
  );
}
