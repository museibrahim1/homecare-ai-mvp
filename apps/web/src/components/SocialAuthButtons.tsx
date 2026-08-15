'use client';

import { useCallback, useState } from 'react';
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
          prompt: (momentListener?: (notification: GooglePromptNotification) => void) => void;
          cancel: () => void;
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

type GooglePromptNotification = {
  isNotDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getNotDisplayedReason?: () => string;
  getSkippedReason?: () => string;
  getDismissedReason?: () => string;
};

type Props = {
  onError?: (message: string) => void;
};

// Public OAuth client IDs (safe to ship). Env wins when present at build time;
// hard fallbacks keep login working if Railway rebuild skipped a NEXT_PUBLIC_*.
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '668945369325-lrmdd9q1d6m7ggojiqvporj8frqso31j.apps.googleusercontent.com';
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID || 'com.palmcareai.web';

function loadScript(id: string, src: string): Promise<void> {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing) {
    if (id === 'google-gsi' && window.google?.accounts?.id) return Promise.resolve();
    if (id === 'apple-auth' && window.AppleID?.auth) return Promise.resolve();
    // Script tag exists but API not ready yet — wait for load or resolve if complete.
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Could not load ${id}`)), {
        once: true,
      });
      // Already loaded before listeners attached
      if (id === 'google-gsi' && window.google?.accounts?.id) resolve();
      if (id === 'apple-auth' && window.AppleID?.auth) resolve();
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = id;
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Could not load ${id}`));
    document.body.appendChild(script);
  });
}

function appleErrorMessage(err: unknown): string {
  if (!err) return 'Apple Sign In failed. Try again.';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || 'Apple Sign In failed. Try again.';
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    const code = String(o.error || o.errorCode || o.name || '');
    if (/popupclosed|user.?cancel|userCanceled/i.test(code + String(o.message || ''))) {
      return 'cancelled';
    }
    if (code) return `Apple Sign In failed (${code}). Check Services ID return URLs include this site /login.`;
  }
  return 'Apple Sign In failed. Try again.';
}

/** Always use /login — Apple Services ID only allowlists that return URL. */
function appleRedirectUri(): string {
  if (typeof window === 'undefined') return 'https://palmcareai.com/login';
  return `${window.location.origin}/login`;
}

export default function SocialAuthButtons({ onError }: Props) {
  const router = useRouter();
  const { setToken, setUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');

  const routeAfterAuth = useCallback(
    (response: {
      access_token: string;
      needs_onboarding: boolean;
      user?: { id?: string; email?: string };
    }) => {
      setToken(response.access_token);
      if (response.user) setUser(response.user as never);
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
    },
    [router, setToken, setUser],
  );

  const finish = useCallback(
    async (provider: 'google' | 'apple', idToken: string, fullName?: string) => {
      setBusy(true);
      try {
        const response = await api.socialLogin(provider, idToken, fullName);
        if (response.requires_mfa && response.mfa_token) {
          setMfaToken(response.mfa_token);
          return;
        }
        if (!response.access_token) {
          onError?.('Sign-in failed. Try again.');
          return;
        }
        await new Promise((r) => setTimeout(r, 50));
        routeAfterAuth(response);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sign-in failed. Try again.';
        onError?.(message);
      } finally {
        setBusy(false);
      }
    },
    [onError, routeAfterAuth],
  );

  const submitMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const response = await api.mfaVerify(mfaToken, mfaCode.trim());
      setMfaToken('');
      setMfaCode('');
      routeAfterAuth(response);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid MFA code';
      onError?.(message);
    } finally {
      setBusy(false);
    }
  };

  const getGoogleIdToken = async (): Promise<string> => {
    await loadScript('google-gsi', 'https://accounts.google.com/gsi/client');
    if (!window.google?.accounts?.id) {
      throw new Error('Google Sign In failed to load. Check your network or ad blocker.');
    }

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const done = (credential?: string, error?: Error) => {
        if (settled) return;
        settled = true;
        try {
          window.google?.accounts.id.cancel();
        } catch {
          /* ignore */
        }
        if (credential) resolve(credential);
        else reject(error || new Error('Google Sign In failed. Try again.'));
      };

      window.google!.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp: { credential?: string }) => {
          if (resp.credential) done(resp.credential);
          else done(undefined, new Error('Google Sign In failed. Try again.'));
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
        context: 'signin',
      });

      // Prefer One Tap / FedCM prompt from our visible button click.
      window.google!.accounts.id.prompt((notification) => {
        if (settled) return;
        if (notification.isDismissedMoment?.()) {
          const reason = notification.getDismissedReason?.() || '';
          if (/credential_returned/i.test(reason)) return;
          done(undefined, new Error('cancelled'));
          return;
        }
        if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
          // Fallback: hidden official button, then synthetic click.
          const host = document.createElement('div');
          host.style.position = 'fixed';
          host.style.left = '-9999px';
          host.style.top = '0';
          host.style.width = '400px';
          document.body.appendChild(host);
          try {
            window.google!.accounts.id.renderButton(host, {
              theme: 'outline',
              size: 'large',
              width: 400,
              text: 'continue_with',
              shape: 'rectangular',
            });
            const btn =
              host.querySelector<HTMLElement>('div[role="button"]') ||
              host.querySelector<HTMLElement>('iframe') ||
              host.firstElementChild;
            if (btn instanceof HTMLElement) {
              btn.click();
              // Give GIS time; if nothing returns, fail clearly.
              setTimeout(() => {
                host.remove();
                if (!settled) {
                  done(
                    undefined,
                    new Error(
                      'Google Sign In could not open. Add https://palmcareai.com as an Authorized JavaScript origin on the Google web client.',
                    ),
                  );
                }
              }, 8000);
            } else {
              host.remove();
              done(
                undefined,
                new Error(
                  'Google Sign In button failed to render. Add https://palmcareai.com as an Authorized JavaScript origin on the Google web client.',
                ),
              );
            }
          } catch (e) {
            host.remove();
            done(undefined, e instanceof Error ? e : new Error('Google Sign In failed.'));
          }
        }
      });
    });
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const idToken = await getGoogleIdToken();
      await finish('google', idToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google Sign In failed.';
      if (!/cancelled/i.test(message)) onError?.(message);
      setBusy(false);
    }
  };

  const handleApple = async () => {
    setBusy(true);
    try {
      await loadScript(
        'apple-auth',
        'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
      );
      if (!window.AppleID?.auth) {
        throw new Error('Apple Sign In failed to load. Try again.');
      }
      window.AppleID.auth.init({
        clientId: APPLE_CLIENT_ID,
        scope: 'name email',
        redirectURI: appleRedirectUri(),
        usePopup: true,
      });
      const res = await window.AppleID.auth.signIn();
      const idToken = res.authorization?.id_token;
      if (!idToken) throw new Error('Apple Sign In failed. Try again.');
      const nameParts = [res.user?.name?.firstName, res.user?.name?.lastName].filter(Boolean);
      await finish('apple', idToken, nameParts.length ? nameParts.join(' ') : undefined);
    } catch (err: unknown) {
      const message = appleErrorMessage(err);
      if (!/cancelled/i.test(message)) onError?.(message);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {mfaToken ? (
        <form onSubmit={submitMfa} className="space-y-3 border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-600">
            Enter the 6-digit code from your authenticator app.
          </p>
          <input
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            inputMode="numeric"
            maxLength={8}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg tracking-widest text-center font-mono"
            placeholder="000000"
            autoFocus
          />
          <button
            type="submit"
            disabled={busy || mfaCode.trim().length < 6}
            className="w-full py-3 bg-primary-500 text-white font-medium rounded-lg disabled:opacity-50"
          >
            {busy ? 'Verifying…' : 'Verify'}
          </button>
          <button
            type="button"
            className="w-full text-sm text-slate-500"
            onClick={() => {
              setMfaToken('');
              setMfaCode('');
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <>
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

          <button
            type="button"
            onClick={() => void handleGoogle()}
            disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-800 font-medium disabled:opacity-50 hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <div className="flex-1 h-px bg-slate-200" />
            or use email
            <div className="flex-1 h-px bg-slate-200" />
          </div>
        </>
      )}
    </div>
  );
}
