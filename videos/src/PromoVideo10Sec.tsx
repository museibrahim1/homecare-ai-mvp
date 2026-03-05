import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const PromoVideo10Sec: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  
  // Animation timings (30fps * 10 seconds = 300 frames)
  const fadeInDuration = 15; // 0.5 seconds
  const slideTransitionDuration = 30; // 1 second
  
  // Scene timings
  const scene1Duration = 90; // 3 seconds - Problem scene
  const scene2Duration = 90; // 3 seconds - Solution scene  
  const scene3Duration = 120; // 4 seconds - App demo + CTA
  
  // Animations
  const scene1Opacity = interpolate(frame, [0, fadeInDuration], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  const scene1Scale = spring({
    frame: frame - 0,
    fps,
    config: { damping: 200, stiffness: 100 },
    from: 0.8,
    to: 1,
  });
  
  const scene2SlideIn = spring({
    frame: frame - scene1Duration,
    fps,
    config: { damping: 200, stiffness: 100 },
    from: 100,
    to: 0,
  });
  
  const scene3SlideUp = spring({
    frame: frame - (scene1Duration + scene2Duration),
    fps,
    config: { damping: 150, stiffness: 80 },
    from: 50,
    to: 0,
  });
  
  const logoScale = spring({
    frame: frame - (scene1Duration + scene2Duration + 30),
    fps,
    config: { damping: 200, stiffness: 120 },
    from: 0,
    to: 1,
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#f8fafc' }}>
      {/* Audio narration */}
      <Audio src={staticFile('segments/promo_10sec_narration.mp3')} />
      
      {/* Scene 1: Problem - Healthcare paperwork (0-3 seconds) */}
      <Sequence from={0} durationInFrames={scene1Duration}>
        <AbsoluteFill
          style={{
            opacity: scene1Opacity,
            transform: `scale(${scene1Scale})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              color: 'white',
              padding: '0 40px',
            }}
          >
            <h1
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                marginBottom: '20px',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              Healthcare assessments
            </h1>
            <h2
              style={{
                fontSize: '48px',
                fontWeight: '300',
                opacity: 0.9,
                fontFamily: 'Arial, sans-serif',
              }}
            >
              in seconds, not hours
            </h2>
          </div>
        </AbsoluteFill>
      </Sequence>
      
      {/* Scene 2: Solution intro (3-6 seconds) */}
      <Sequence from={scene1Duration} durationInFrames={scene2Duration}>
        <AbsoluteFill
          style={{
            transform: `translateX(${scene2SlideIn}px)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              color: 'white',
              padding: '0 40px',
            }}
          >
            <h1
              style={{
                fontSize: '64px',
                fontWeight: 'bold',
                marginBottom: '30px',
                fontFamily: 'Arial, sans-serif',
              }}
            >
              PalmCare AI
            </h1>
            <h2
              style={{
                fontSize: '42px',
                fontWeight: '300',
                opacity: 0.95,
                fontFamily: 'Arial, sans-serif',
                lineHeight: 1.3,
              }}
            >
              transforms voice into<br />contracts instantly
            </h2>
          </div>
        </AbsoluteFill>
      </Sequence>
      
      {/* Scene 3: App demo + CTA (6-10 seconds) */}
      <Sequence from={scene1Duration + scene2Duration} durationInFrames={scene3Duration}>
        <AbsoluteFill
          style={{
            transform: `translateY(${scene3SlideUp}px)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 80px',
            background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
          }}
        >
          {/* Left side - App screenshots */}
          <div
            style={{
              display: 'flex',
              gap: '30px',
              alignItems: 'center',
            }}
          >
            <Img
              src={staticFile('../screenshots/ios/05-record.png')}
              style={{
                height: '400px',
                width: 'auto',
                borderRadius: '25px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              }}
            />
            <Img
              src={staticFile('../screenshots/ios/04-home.png')}
              style={{
                height: '400px',
                width: 'auto',
                borderRadius: '25px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              }}
            />
            <Img
              src={staticFile('../screenshots/ios/06-clients.png')}
              style={{
                height: '400px',
                width: 'auto',
                borderRadius: '25px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              }}
            />
          </div>
          
          {/* Right side - Branding + CTA */}
          <div
            style={{
              textAlign: 'right',
              color: '#1e293b',
            }}
          >
            <div
              style={{
                transform: `scale(${logoScale})`,
              }}
            >
              <h1
                style={{
                  fontSize: '72px',
                  fontWeight: 'bold',
                  color: '#0d9488',
                  marginBottom: '20px',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                PalmCare AI
              </h1>
              <h2
                style={{
                  fontSize: '36px',
                  fontWeight: '300',
                  marginBottom: '30px',
                  color: '#475569',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                Where care meets intelligence
              </h2>
              <div
                style={{
                  backgroundColor: '#0d9488',
                  color: 'white',
                  padding: '20px 40px',
                  borderRadius: '50px',
                  fontSize: '32px',
                  fontWeight: 'bold',
                  display: 'inline-block',
                  fontFamily: 'Arial, sans-serif',
                }}
              >
                Palm It
              </div>
            </div>
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};