'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { IoLogOutOutline, IoMoon, IoSunny } from 'react-icons/io5';
import { SignInModal } from '@/components/sign-in-modal';
import {
  fetchCurrentUser,
  notifyAuthChanged,
  signOutToHome,
  subscribeAuth,
  type AuthUser,
} from '@/lib/auth';
import { profileInitials } from '@/lib/profile';
import {
  applyTheme,
  getServerThemeSnapshot,
  getThemeSnapshot,
  nextTheme,
  subscribeTheme,
} from '@/lib/theme';

export function SettingsMenu() {
  const pickerRef = useRef<HTMLDetailsElement>(null);
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerThemeSnapshot);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    const loadUser = () => {
      fetchCurrentUser()
        .then(setUser)
        .catch(() => setUser(null));
    };
    loadUser();
    return subscribeAuth(loadUser);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('signed_in') && !params.has('auth_error')) return;
    params.delete('signed_in');
    params.delete('auth_error');
    const query = params.size ? `?${params.toString()}` : '';
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${query}${window.location.hash}`,
    );
    notifyAuthChanged();
  }, []);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker) return;

    const closePicker = () => {
      picker.open = false;
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !picker.contains(event.target)) closePicker();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !picker.open) return;
      closePicker();
      picker.querySelector('summary')?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  function openSignIn() {
    if (pickerRef.current) pickerRef.current.open = false;
    setSignInOpen(true);
  }

  return (
    <>
      <details className="settings-picker" ref={pickerRef}>
        <summary aria-label="Settings">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M9.6 3.9c.09-.54.56-.94 1.11-.94h2.59c.55 0 1.02.4 1.11.94l.21 1.28c.06.37.31.69.65.87l.22.13c.32.2.72.26 1.07.12l1.22-.45a1.13 1.13 0 0 1 1.37.49l1.3 2.24c.27.48.16 1.08-.26 1.43l-1 .83c-.3.24-.44.61-.43.99v.26c0 .38.14.75.43.99l1 .83c.42.35.53.95.26 1.43l-1.3 2.24a1.13 1.13 0 0 1-1.37.49l-1.22-.45c-.35-.13-.75-.07-1.07.12l-.22.13c-.34.18-.58.5-.65.87l-.21 1.28c-.09.54-.56.94-1.11.94h-2.6c-.55 0-1.02-.4-1.11-.94l-.21-1.28c-.06-.37-.31-.69-.64-.87l-.22-.13c-.33-.2-.72-.26-1.08-.12l-1.21.45a1.13 1.13 0 0 1-1.37-.49l-1.3-2.24a1.13 1.13 0 0 1 .26-1.43l1-.83c.3-.24.44-.61.43-.99v-.26c0-.38-.14-.75-.43-.99l-1-.83a1.13 1.13 0 0 1-.26-1.43l1.3-2.25a1.13 1.13 0 0 1 1.37-.49l1.21.46c.36.13.75.07 1.08-.13l.22-.12c.33-.18.58-.5.64-.87Z" />
            <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </summary>
        <div className="settings-menu">
          <div className="settings-menu-inner">
            {user ? (
              <Link
                className="settings-menu-item"
                href="/profile"
                onClick={() => {
                  if (pickerRef.current) pickerRef.current.open = false;
                }}
              >
                Profile
                <span className="settings-menu-trailing">
                  {user.avatar_url ? (
                    <Image
                      alt=""
                      className="settings-menu-avatar"
                      height={20}
                      referrerPolicy="no-referrer"
                      src={user.avatar_url}
                      unoptimized
                      width={20}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="settings-menu-avatar settings-menu-avatar--fallback"
                    >
                      {profileInitials(user.display_name)}
                    </span>
                  )}
                </span>
              </Link>
            ) : (
              <button className="settings-menu-item" type="button" onClick={openSignIn}>
                Sign in
              </button>
            )}
            <div className="settings-menu-rule" />
            <div className="settings-theme-row">
              <button
                className="settings-theme-label"
                type="button"
                onClick={() => applyTheme(nextTheme(theme))}
              >
                Theme
              </button>
              <div aria-label="Color theme" className="theme-switch" role="group">
                <button
                  aria-label="Light"
                  aria-pressed={theme === 'light'}
                  type="button"
                  onClick={() => {
                    applyTheme('light');
                  }}
                >
                  <IoSunny aria-hidden="true" size={18} />
                </button>
                <span aria-hidden="true" className="theme-switch-rule" />
                <button
                  aria-label="Dark"
                  aria-pressed={theme === 'dark'}
                  type="button"
                  onClick={() => {
                    applyTheme('dark');
                  }}
                >
                  <IoMoon aria-hidden="true" size={18} />
                </button>
              </div>
            </div>
            {user ? (
              <>
                <div className="settings-menu-rule" />
                <button
                  className="settings-menu-item"
                  type="button"
                  onClick={() => {
                    void signOutToHome();
                  }}
                >
                  Sign out
                  <span className="settings-menu-trailing">
                    <IoLogOutOutline aria-hidden="true" size={18} />
                  </span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </details>
      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </>
  );
}
