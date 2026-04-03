import { useCallback, useEffect, useState } from 'react';
import { ApiClient, type User } from '@/lib/api';

export function useApi(baseUrl?: string) {
  const [api] = useState(() => new ApiClient(baseUrl));
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const result = await api.getMe();
        if (result.authenticated && result.user) {
          setUser(result.user);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
        setError(null);
      } catch (err) {
        console.error('Auth check failed:', err);
        setUser(null);
        setIsAuthenticated(false);
        setError(err instanceof Error ? err.message : 'Auth check failed');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [api]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null);
        const result = await api.login(email, password);
        setUser(result.user);
        setIsAuthenticated(true);
        return result.user;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Login failed';
        setError(message);
        throw err;
      }
    },
    [api],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      try {
        setError(null);
        const result = await api.register(email, password, name);
        setUser(result.user);
        setIsAuthenticated(true);
        return result.user;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Registration failed';
        setError(message);
        throw err;
      }
    },
    [api],
  );

  const logout = useCallback(async () => {
    try {
      setError(null);
      await api.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      throw err;
    }
  }, [api]);

  return {
    api,
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
  };
}
