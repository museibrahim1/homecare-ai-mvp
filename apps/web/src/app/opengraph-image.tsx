import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PalmCare AI — AI-Powered Home Care Management';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0f1a 0%, #1a1040 50%, #0a0f1a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
            }}
          >
            🎙️
          </div>
          <span
            style={{
              fontSize: '56px',
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-1px',
            }}
          >
            PalmCare AI
          </span>
        </div>

        <p
          style={{
            fontSize: '28px',
            color: '#94a3b8',
            maxWidth: '800px',
            textAlign: 'center',
            lineHeight: 1.5,
            margin: '0 0 40px 0',
          }}
        >
          Turn voice assessments into proposal-ready service contracts in minutes
        </p>

        <div
          style={{
            display: 'flex',
            gap: '40px',
          }}
        >
          {['Voice Assessments', 'AI Contracts', 'CRM Pipeline', 'HIPAA Compliant'].map(
            (feature) => (
              <div
                key={feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#a5b4fc',
                  fontSize: '18px',
                }}
              >
                <span style={{ color: '#22c55e' }}>✓</span>
                {feature}
              </div>
            )
          )}
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            color: '#64748b',
            fontSize: '18px',
          }}
        >
          palmcareai.com
        </div>
      </div>
    ),
    { ...size }
  );
}
