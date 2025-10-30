'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const ADMIN_ONLY_PATH_PREFIXES = ['/wordpress', '/supportpal', '/admin'];

const normaliseString = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export default function AuthGuard({ children, excludedPaths = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState({
    checking: true,
    authorized: false,
  });

  useEffect(() => {
    const normalisedPath = normaliseString(pathname);
    const isExcluded = excludedPaths.some(
      (path) => normaliseString(path) === normalisedPath,
    );

    if (isExcluded) {
      setAuthState({ checking: false, authorized: true });
      return;
    }

    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
      setAuthState({ checking: false, authorized: false });
      router.replace('/login');
      return;
    }

    const requiresAdmin = ADMIN_ONLY_PATH_PREFIXES.some(
      (prefix) =>
        normalisedPath === prefix || normalisedPath.startsWith(`${prefix}/`),
    );

    if (requiresAdmin) {
      let storedUser = null;

      try {
        const rawUser = localStorage.getItem('user');
        storedUser = rawUser ? JSON.parse(rawUser) : null;
      } catch (error) {
        console.error('Unable to parse stored user:', error);
        localStorage.removeItem('user');
      }

      const isAdmin =
        typeof storedUser?.role === 'string' &&
        normaliseString(storedUser.role) === 'admin';

      if (!isAdmin) {
        setAuthState({ checking: false, authorized: false });
        router.replace('/');
        return;
      }
    }

    setAuthState({ checking: false, authorized: true });
  }, [router, pathname, excludedPaths]);

  if (authState.checking) {
    return <div>Loading...</div>;
  }

  if (!authState.authorized) {
    return null;
  }

  return <>{children}</>;
}
