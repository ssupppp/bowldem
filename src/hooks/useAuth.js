/**
 * useAuth Hook
 * React context + hook wrapping Supabase Auth
 * Provides: user, session, isLoading, signInWithGoogle, signInWithMagicLink, signOut
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  signInWithGoogle as authSignInWithGoogle,
  signInWithMagicLink as authSignInWithMagicLink,
  signOut as authSignOut,
  getCurrentUser,
  onAuthStateChange,
  upsertUserProfile,
  linkEntriesToAuthUser,
  subscribeToEmails
} from '../lib/supabase.js';

const AuthContext = createContext(null);

/**
 * AuthProvider - Wraps app to provide auth state
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Handle migration on first sign-in
  const handleAuthMigration = useCallback(async (authUser) => {
    if (!authUser) return;

    const deviceId = localStorage.getItem('bowldem_device_id');
    const displayName = localStorage.getItem('bowldem_display_name');
    const statsRaw = localStorage.getItem('bowldem_stats');
    let localStats = null;
    try { localStats = statsRaw ? JSON.parse(statsRaw) : null; } catch (e) { /* ignore */ }

    // Upsert user profile (adds device_id, snapshots stats)
    await upsertUserProfile(authUser.id, {
      displayName: displayName || authUser.user_metadata?.full_name || null,
      deviceId: deviceId || null,
      localStats
    });

    // Link leaderboard entries to auth user
    if (deviceId) {
      await linkEntriesToAuthUser(deviceId, authUser.id, authUser.email);
    }

    // Auto-subscribe to newsletter
    if (authUser.email) {
      try {
        await subscribeToEmails(authUser.email, {
          displayName: displayName || authUser.user_metadata?.full_name || undefined,
          deviceId: deviceId || undefined,
          source: 'auth_signup'
        });
      } catch (e) { /* non-blocking */ }
    }

    // Store email in localStorage for existing hooks
    if (authUser.email) {
      localStorage.setItem('bowldem_email', authUser.email);
    }

    // Store display name from Google if we don't have one
    if (!displayName && authUser.user_metadata?.full_name) {
      const googleName = authUser.user_metadata.full_name.substring(0, 20);
      localStorage.setItem('bowldem_display_name', googleName);
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    getCurrentUser().then(({ data }) => {
      setUser(data?.user || null);
      setIsLoading(false);
    });

    // Subscribe to changes
    const { data: { subscription } } = onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);

      if (event === 'SIGNED_IN' && newSession?.user) {
        handleAuthMigration(newSession.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [handleAuthMigration]);

  const signInWithGoogle = useCallback(async () => {
    return authSignInWithGoogle();
  }, []);

  const signInWithMagicLink = useCallback(async (email) => {
    return authSignInWithMagicLink(email);
  }, []);

  const handleSignOut = useCallback(async () => {
    const result = await authSignOut();
    setUser(null);
    setSession(null);
    return result;
  }, []);

  const value = {
    user,
    session,
    isLoading,
    signInWithGoogle,
    signInWithMagicLink,
    signOut: handleSignOut,
    isAuthenticated: !!user
  };

  return React.createElement(AuthContext.Provider, { value }, children);
}

/**
 * useAuth hook - access auth state from any component
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
