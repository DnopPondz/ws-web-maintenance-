'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import AuthContext from '../lib/auth-context';

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

const isAdminUser = (user) =>
  typeof user?.role === 'string' && normaliseString(user.role) === 'admin';

const readStoredJson = (key) => {
  try {
    const rawValue = localStorage.getItem(key);

    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    console.error(`Unable to parse stored value for "${key}"`, error);
    localStorage.removeItem(key);
    return null;
  }
};

const areSessionsEqual = (first, second) => {
  if (first === second) {
    return true;
  }

  if (!first || !second) {
    return false;
  }

  return (
    first.accessToken === second.accessToken &&
    first.refreshToken === second.refreshToken &&
    JSON.stringify(first.user) === JSON.stringify(second.user)
  );
};

export default function AuthGuard({ children, excludedPaths }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authState, setAuthState] = useState({
    checking: true,
    authorized: false,
  });
  const [session, setSession] = useState({
    accessToken: null,
    refreshToken: null,
    user: null,
  });

  const resolvedExcludedPaths = useMemo(
    () => normaliseExcludedPaths(excludedPaths),
    [excludedPaths],
  );

  const commitAuthState = useCallback((nextState) => {
    setAuthState((previous) => {
      if (
        previous.checking === nextState.checking &&
        previous.authorized === nextState.authorized
      ) {
        return previous;
      }

      return nextState;
    });
  }, []);

  const clearStoredSession = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setSession((previous) => {
      if (
        previous.accessToken === null &&
        previous.refreshToken === null &&
        previous.user === null
      ) {
        return previous;
      }

      return {
        accessToken: null,
        refreshToken: null,
        user: null,
      };
    });
  }, []);

  const setUser = useCallback((updater, { persist = false } = {}) => {
    let nextUserValue = null;

    setSession((previous) => {
      nextUserValue =
        typeof updater === 'function' ? updater(previous.user) : updater;

      if (persist && typeof window !== 'undefined') {
        if (nextUserValue) {
          localStorage.setItem('user', JSON.stringify(nextUserValue));
        } else {
          localStorage.removeItem('user');
        }
      }

      const resolvedUser = nextUserValue ?? null;

      if (previous.user === resolvedUser) {
        return previous;
      }

      return {
        ...previous,
        user: resolvedUser,
      };
    });
  }, []);

  useEffect(() => {
    const normalisedPath = normaliseString(pathname);
    const isExcluded = resolvedExcludedPaths.includes(normalisedPath);

    if (isExcluded) {
      commitAuthState({ checking: false, authorized: true });
      return;
    }

    if (typeof window === 'undefined') {
      commitAuthState({ checking: false, authorized: false });
      return;
    }

    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');

    if (!accessToken) {
      clearStoredSession();
      commitAuthState({ checking: false, authorized: false });
      router.replace('/login');
      return;
    }

    const storedUser = readStoredJson('user');

    setSession((previous) => {
      const nextSession = {
        accessToken,
        refreshToken,
        user: storedUser,
      };

      if (areSessionsEqual(previous, nextSession)) {
        return previous;
      }

      return nextSession;
    });

    const requiresAdmin = ADMIN_ONLY_PATH_PREFIXES.some(
      (prefix) =>
        normalisedPath === prefix || normalisedPath.startsWith(`${prefix}/`),
    );

    if (requiresAdmin && !isAdminUser(storedUser)) {
      commitAuthState({ checking: false, authorized: false });
      router.replace('/');
      return;
    }

    commitAuthState({ checking: false, authorized: true });
  }, [
    router,
    pathname,
    resolvedExcludedPaths,
    clearStoredSession,
    commitAuthState,
  ]);

  const contextValue = useMemo(
    () => ({
      accessToken: session.accessToken,
      clearAuth: clearStoredSession,
      refreshToken: session.refreshToken,
      setUser,
      user: session.user,
    }),
    [session, clearStoredSession, setUser],
  );

  if (authState.checking) {
    return <div>Loading...</div>;
  }

  if (!authState.authorized) {
    return null;
  }

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
