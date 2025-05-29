'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavSidebar from "./components/navsitebar";

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
  
  // หน้าที่ไม่ต้องการ Sidebar
  const noSidebarPages = ['/login', '/register', '/forgot-password'];
  const shouldShowSidebar = !noSidebarPages.includes(pathname);
  
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
          ${shouldShowSidebar ? 'flex' : ''} 
          ${!shouldShowSidebar ? 'overflow-hidden' : ''}
        `}
      >
        {/* แสดง Sidebar เฉพาะหน้าที่ต้องการ */}
        {shouldShowSidebar && (
          <NavSidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        )}
        
        <main
          className={`transition-all duration-300 p-8 bg-white min-h-screen w-full ${
            shouldShowSidebar 
              ? (sidebarOpen ? 'ml-64' : 'ml-16')
              : ''
          }`}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
