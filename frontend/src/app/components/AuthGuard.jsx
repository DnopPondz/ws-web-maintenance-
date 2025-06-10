'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AuthGuard({ children, excludedPaths = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ถ้าหน้านี้อยู่ใน excludedPaths ให้ข้ามการตรวจสอบ
    if (excludedPaths.includes(pathname)) {
      setIsLoading(false);
      return;
    }

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) {
      router.replace('/login');
    } else {
      setIsLoading(false);
    }
  }, [router, pathname, excludedPaths]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}
