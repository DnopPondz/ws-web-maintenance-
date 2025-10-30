'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavSidebar from "./components/navsitebar";
import AuthGuard from './components/AuthGuard';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  // หน้าที่ไม่ต้องการ Sidebar และไม่ต้องการ AuthGuard
  const noSidebarPages = ['/login', '/register', '/forgot-password'];
  const shouldShowSidebar = !noSidebarPages.includes(pathname);
  const shouldProtect = !noSidebarPages.includes(pathname);

  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          antialiased
          bg-slate-100
          text-slate-900
          ${shouldShowSidebar ? 'flex' : ''}
          ${!shouldShowSidebar ? 'overflow-hidden' : ''}
        `}
      >
        {shouldShowSidebar && (
          <NavSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        )}

        {shouldProtect ? (
          <AuthGuard>
            <main
              className={`transition-all duration-300 w-full flex-1 ${
                shouldShowSidebar
                  ? (sidebarOpen ? 'ml-64' : 'ml-16')
                  : ''
              }`}
            >
              <div className="min-h-screen w-full">{children}</div>
            </main>
          </AuthGuard >
        ) : (
          <main
            className={`transition-all duration-300 w-full flex-1 ${
              shouldShowSidebar
                ? (sidebarOpen ? 'ml-64' : 'ml-16')
                : ''
            }`}
          >
            <div className="min-h-screen w-full">{children}</div>
          </main>
        )}

      </body>
    </html>
  );
}
