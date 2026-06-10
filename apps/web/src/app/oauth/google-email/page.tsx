'use client';

import { useEffect, useState } from 'react';

/**
 * OAuth bounce page for the mobile app's "Send from my business email" flow.
 *
 * Google's consent screen redirects here (this HTTPS URL must be registered as
 * an authorized redirect URI). We immediately forward the OAuth params to the
 * PalmCare iOS app via its custom URL scheme, which ASWebAuthenticationSession
 * intercepts to complete the connection.
 */
export default function GoogleEmailOAuthBounce() {
  const [deepLink, setDeepLink] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const search = window.location.search || '';
    const params = new URLSearchParams(search);
    if (params.get('error')) {
      setError(params.get('error') || 'Authorization was cancelled.');
      return;
    }
    const link = `com.palmcareai.app://google-email${search}`;
    setDeepLink(link);
    // Hand the result back to the app.
    window.location.href = link;
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        background: '#f6f7f9',
        color: '#0f172a',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: '#0d9488',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          fontSize: 28,
        }}
      >
        🌴
      </div>
      {error ? (
        <>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
            Connection cancelled
          </h1>
          <p style={{ color: '#64748b', maxWidth: 360 }}>
            You can close this window and try connecting your email again from
            the PalmCare AI app.
          </p>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>
            Returning to PalmCare AI…
          </h1>
          <p style={{ color: '#64748b', maxWidth: 360 }}>
            If the app doesn&apos;t open automatically, tap the button below.
          </p>
          {deepLink && (
            <a
              href={deepLink}
              style={{
                marginTop: 20,
                background: '#0d9488',
                color: '#fff',
                textDecoration: 'none',
                fontWeight: 600,
                padding: '12px 24px',
                borderRadius: 12,
              }}
            >
              Open PalmCare AI
            </a>
          )}
        </>
      )}
    </div>
  );
}
