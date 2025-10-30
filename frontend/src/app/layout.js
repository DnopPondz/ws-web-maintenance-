'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavSidebar from "./components/navsitebar";
import AuthGuard from './components/AuthGuard';
import PageTransition from "./components/PageTransition";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.innerWidth >= 1024;
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.innerWidth >= 1024;
  });
  const pathname = usePathname();

  // หน้าที่ไม่ต้องการ Sidebar และไม่ต้องการ AuthGuard
  const noSidebarPages = ['/login', '/register', '/forgot-password'];
  const shouldShowSidebar = !noSidebarPages.includes(pathname);
  const shouldProtect = !noSidebarPages.includes(pathname);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') {
        return;
      }

      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(true);
    } else {
      setSidebarOpen(false);
    }
  }, [isDesktop]);

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
          min-h-screen
          ${shouldShowSidebar ? 'lg:flex' : ''}
          ${!shouldShowSidebar ? 'overflow-hidden' : ''}
        `}
      >
        {shouldShowSidebar && (
          <NavSidebar
            isDesktop={isDesktop}
            isOpen={sidebarOpen}
            setIsOpen={setSidebarOpen}
          />
        )}

        {shouldProtect ? (
          <AuthGuard>
            <main
              className={`transition-all duration-300 w-full flex-1 ${
                shouldShowSidebar
                  ? isDesktop
                    ? sidebarOpen
                      ? 'lg:ml-64'
                      : 'lg:ml-16'
                    : 'ml-0'
                  : ''
              }`}
            >
              <PageTransition>
                <div className="min-h-screen w-full">{children}</div>
              </PageTransition>
            </main>
          </AuthGuard >
        ) : (
          <main
            className={`transition-all duration-300 w-full flex-1 ${
              shouldShowSidebar
                ? isDesktop
                  ? sidebarOpen
                    ? 'lg:ml-64'
                    : 'lg:ml-16'
                  : 'ml-0'
                : ''
            }`}
          >
            <PageTransition>
              <div className="min-h-screen w-full">{children}</div>
            </PageTransition>
          </main>
        )}

      </body>
    </html>
  );
}
