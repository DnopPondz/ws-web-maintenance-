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
  const [isDesktop, setIsDesktop] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Pages that do not require the sidebar or authentication guard
  const noSidebarPages = ['/login', '/register', '/forgot-password'];
  const shouldShowSidebar = !noSidebarPages.includes(pathname);
  const shouldProtect = !noSidebarPages.includes(pathname);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window === 'undefined') {
        return;
      }

      setIsDesktop(window.innerWidth >= 1024);
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

  const mainClassName = [
    "transition-all duration-300 w-full flex-1",
    shouldShowSidebar
      ? isDesktop
        ? sidebarOpen
          ? "lg:ml-64"
          : "lg:ml-16"
        : "ml-0"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const layoutContent = (
    <>
      {shouldShowSidebar && (
        <NavSidebar
          isDesktop={isDesktop}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />
      )}

      <main className={mainClassName}>
        <PageTransition>
          <div className="min-h-screen w-full">{children}</div>
        </PageTransition>
      </main>
    </>
  );

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
        {shouldProtect ? <AuthGuard>{layoutContent}</AuthGuard> : layoutContent}
      </body>
    </html>
  );
}
