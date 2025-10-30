'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const ADMIN_ONLY_PATH_PREFIXES = ['/wordpress', '/supportpal', '/admin'];
const EMPTY_EXCLUDED_PATHS = Object.freeze([]);

const normaliseString = (value) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const normaliseExcludedPaths = (paths) => {
  if (!Array.isArray(paths) || paths.length === 0) {
    return EMPTY_EXCLUDED_PATHS;
  }

  const deduped = new Set();

  paths.forEach((path) => {
    const normalised = normaliseString(path);

    if (normalised) {
      deduped.add(normalised);
    }
  });

  if (deduped.size === 0) {
    return EMPTY_EXCLUDED_PATHS;
  }

  return Array.from(deduped);
};

export default function AuthGuard({ children, excludedPaths }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState({
    checking: true,
    authorized: false,
  });

  const resolvedExcludedPaths = useMemo(
    () => normaliseExcludedPaths(excludedPaths),
    [excludedPaths],
  );

  const commitAuthState = (nextState) => {
    setAuthState((previous) => {
      if (
        previous.checking === nextState.checking &&
        previous.authorized === nextState.authorized
      ) {
        return previous;
      }

      return nextState;
    });
  };

  useEffect(() => {
    const normalisedPath = normaliseString(pathname);
    const isExcluded = resolvedExcludedPaths.includes(normalisedPath);

    if (isExcluded) {
      commitAuthState({ checking: false, authorized: true });
      return;
    }

    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
      commitAuthState({ checking: false, authorized: false });
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
        commitAuthState({ checking: false, authorized: false });
        router.replace('/');
        return;
      }
    }

    commitAuthState({ checking: false, authorized: true });
  }, [router, pathname, resolvedExcludedPaths]);

  if (authState.checking) {
    return <div>Loading...</div>;
  }

  if (!authState.authorized) {
    return null;
  }

  return <>{children}</>;
}
