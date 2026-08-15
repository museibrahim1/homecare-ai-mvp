'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
    AppleID?: {
      auth: {
        init: (config: Record<string, unknown>) => void;
        signIn: () => Promise<{
          authorization?: { id_token?: string; code?: string };
          user?: { name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

type Props = {
  onError?: (message: string) => void;
};

export default function SocialAuthButtons({ onError }: Props) {
  const router = useRouter();
  const { setToken, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
  const appleClientId = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || '';

  const finish = useCallback(
    async (provider: 'google' | 'apple', idToken: string, fullName?: string) => {
      setBusy(true);
      try {
        const response = await api.socialLogin(provider, idToken, fullName);
        setToken(response.access_token);
        if (response.user) setUser(response.user);
        await new Promise((r) => setTimeout(r, 50));
        if (response.needs_onboarding) {
          router.push('/onboarding');
          return;
        }
        const userId = response.user?.id || response.user?.email || 'user';
        const hasSeenWelcome = localStorage.getItem(`has-seen-welcome-${userId}`);
        if (!hasSeenWelcome) {
          localStorage.setItem(`has-seen-welcome-${userId}`, 'true');
          router.push('/welcome');
        } else {
          router.push('/dashboard');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sign-in failed. Try again.';
        onError?.(message);
      } finally {
        setBusy(false);
      }
    },
    [onError, router, setToken, setUser],
  );

  useEffect(() => {
    if (!googleClientId || !googleBtnRef.current) return;

    const scriptId = 'google-gsi';
    const existing = document.getElementById(scriptId);
    const init = () => {
      if (!window.google || !googleBtnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (resp: { credential?: string }) => {
          if (resp.credential) void finish('google', resp.credential);
        },
      });
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: googleBtnRef.current.offsetWidth || 360,
        text: 'continue_with',
        shape: 'rectangular',
      });
    };

    if (existing) {
      init();
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = init;
    document.body.appendChild(script);
  }, [finish, googleClientId]);

  const handleApple = async () => {
    if (!appleClientId) {
      onError?.('Apple Sign In is not configured for web yet. Use Google or email.');
      return;
    }
    setBusy(true);
    try {
      if (!window.AppleID) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src =
            'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Could not load Apple Sign In'));
          document.body.appendChild(script);
        });
      }
      window.AppleID?.auth.init({
        clientId: appleClientId,
        scope: 'name email',
        redirectURI: `${window.location.origin}/login`,
        usePopup: true,
      });
      const res = await window.AppleID!.auth.signIn();
      const idToken = res.authorization?.id_token;
      if (!idToken) throw new Error('Apple Sign In failed. Try again.');
      const nameParts = [
        res.user?.name?.firstName,
        res.user?.name?.lastName,
      ].filter(Boolean);
      await finish('apple', idToken, nameParts.length ? nameParts.join(' ') : undefined);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Apple Sign In failed.';
      if (!/popupclosed|user cancelled|userCanceled/i.test(message)) {
        onError?.(message);
      }
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void handleApple()}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-black text-white font-medium disabled:opacity-50"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden>
          <path d="M16.365 1.43c0 1.14-.42 2.2-1.18 3.03-.8.88-2.12 1.56-3.22 1.47-.14-1.1.4-2.26 1.16-3.08.8-.88 2.2-1.54 3.24-1.42zM20.5 17.1c-.58 1.34-.86 1.93-1.61 3.11-1.05 1.63-2.53 3.66-4.36 3.68-1.63.03-2.05-1.06-4.27-1.05-2.22.01-2.69 1.08-4.32 1.05-1.83-.03-3.23-1.85-4.28-3.48C-.3 16.9-.7 12.7 1.2 9.9c1.2-1.78 3.1-2.82 4.88-2.82 1.82 0 2.96 1.07 4.46 1.07 1.45 0 2.34-1.08 4.46-1.08 1.6 0 3.29.87 4.48 2.37-3.94 2.16-3.3 7.8.99 7.66z" />
        </svg>
        Continue with Apple
      </button>

      {googleClientId ? (
        <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />
      ) : (
        <button
          type="button"
          disabled
          className="w-full px-4 py-3 rounded-lg border border-slate-300 text-slate-400 text-sm"
        >
          Google Sign In (set NEXT_PUBLIC_GOOGLE_CLIENT_ID)
        </button>
      )}

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div className="flex-1 h-px bg-slate-200" />
        or use email
        <div className="flex-1 h-px bg-slate-200" />
      </div>
    </div>
  );
}
