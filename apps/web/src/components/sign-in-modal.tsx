'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { FcGoogle } from 'react-icons/fc';
import { IoClose } from 'react-icons/io5';
import {
  fetchAuthProviders,
  oauthStartUrl,
  type AuthProvider,
  type AuthProviders,
} from '@/lib/auth';

type SignInModalProps = {
  open: boolean;
  onClose: () => void;
};

type Panel = 'signin' | 'terms' | 'privacy';

const noopSubscribe = () => () => {};

const LEGAL = {
  terms: {
    title: 'Terms of use',
    body: 'PremSight is a Premier League reference product. By signing in you agree to use the service for personal, non-commercial viewing of fixtures, standings, and related tools.',
  },
  privacy: {
    title: 'Privacy policy',
    body: 'When you sign in with Google, PremSight stores your account email, display name, and the provider identity needed to recognize you on later visits. Session cookies stay on the product API and are not shared with other services.',
  },
} as const;

export function SignInModal({ open, onClose }: SignInModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [providers, setProviders] = useState<AuthProviders | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('signin');

  useEffect(() => {
    if (!open) return;
    fetchAuthProviders()
      .then(setProviders)
      .catch(() => setProviders({ google: false }));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (panel !== 'signin') {
        setPanel('signin');
        return;
      }
      setPanel('signin');
      setError(null);
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, panel]);

  if (!mounted || typeof document === 'undefined') return null;

  function close() {
    setPanel('signin');
    setError(null);
    onClose();
  }

  function start(provider: AuthProvider) {
    if (!providers) return;
    if (!providers[provider]) {
      setError('Google sign-in is not configured yet.');
      return;
    }
    window.location.assign(oauthStartUrl(provider, window.location.href));
  }

  const legal = panel === 'signin' ? null : LEGAL[panel];
  const title = legal?.title ?? 'Sign in';

  return createPortal(
    <div
      aria-hidden={!open}
      className={open ? 'signin-overlay is-open' : 'signin-overlay'}
      onClick={close}
      role="presentation"
    >
      <div
        aria-labelledby={titleId}
        aria-modal={open}
        className="signin-modal"
        inert={!open}
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          aria-label="Close sign in"
          className="signin-close"
          onClick={close}
          ref={closeRef}
          type="button"
        >
          <IoClose aria-hidden="true" size={22} />
        </button>
        <h2 id={titleId}>{title}</h2>
        {legal ? (
          <>
            <p className="signin-copy">{legal.body}</p>
            <button className="signin-back" type="button" onClick={() => setPanel('signin')}>
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <p className="signin-copy">
              Sign in to sync settings across devices or retrieve them when you set up a new device.
            </p>
            <div className="signin-providers">
              <button
                className="signin-provider signin-provider--google"
                type="button"
                onClick={() => start('google')}
              >
                <FcGoogle aria-hidden="true" size={18} />
                Continue with Google
              </button>
            </div>
            {error ? <p className="signin-error">{error}</p> : null}
            <p className="signin-legal">
              By signing in you accept the Terms of use and Privacy Policy.
            </p>
            <p className="signin-legal-links">
              <button type="button" onClick={() => setPanel('terms')}>
                Terms of use
              </button>
              <button type="button" onClick={() => setPanel('privacy')}>
                Privacy policy
              </button>
            </p>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
