import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Audio,
  OffthreadVideo,
  Img,
  staticFile,
  Easing,
} from "remotion";

// ============ PALMCARE AI — ENHANCED VIDEO AD (V2) ============
//
// Timing (30fps):
//   0.0s -  4.5s  Orb intro + logo + mobile landing page  (135 frames)
//   4.5s - 17.5s  Scene 1 — Assessment footage + VO        (390 frames)
//  17.5s - 30.0s  Scene 2 — Contract footage + VO           (375 frames)
//  30.0s - 38.0s  Brand close + VO                          (240 frames)
// Total: 38s = 1140 frames

const FPS = 30;

const TIMING = {
  orbIntro:   { from: 0,    duration: 135 },
  scene1:     { from: 135,  duration: 390 },
  scene2:     { from: 525,  duration: 375 },
  brandClose: { from: 900,  duration: 240 },
  total: 1140,
};

const TEAL = "#0d9488";
const TEAL_LIGHT = "#14b8a6";
const TEAL_DARK = "#0f766e";
const BG_DARK = "#042f2e";
const BG_DARKER = "#021a19";

// ============ SHARED COMPONENTS ============

const SubtleVignette: React.FC<{ intensity?: number }> = ({ intensity = 0.6 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${intensity}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

const BottomGradient: React.FC<{ height?: string; opacity?: number }> = ({
  height = "50%",
  opacity = 0.85,
}) => (
  <div
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height,
      background: `linear-gradient(to top, rgba(0,0,0,${opacity}) 0%, rgba(0,0,0,${opacity * 0.5}) 50%, transparent 100%)`,
      pointerEvents: "none",
    }}
  />
);

const AnimatedCaption: React.FC<{
  text: string;
  startFrame: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  maxWidth?: number;
}> = ({
  text,
  startFrame,
  fontSize = 42,
  color = "#ffffff",
  fontWeight = 600,
  maxWidth = 900,
}) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;

  const opacity = interpolate(localFrame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(localFrame, [0, 22], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  if (localFrame < -5) return null;

  return (
    <div style={{ opacity, transform: `translateY(${y}px)`, textAlign: "center", maxWidth }}>
      <p
        style={{
          fontSize,
          fontWeight,
          color,
          lineHeight: 1.35,
          textShadow: "0 4px 20px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.6)",
          margin: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {text}
      </p>
    </div>
  );
};

const AccentLine: React.FC<{ progress: number }> = ({ progress }) => (
  <div
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      height: 3,
      width: `${progress * 100}%`,
      background: `linear-gradient(90deg, ${TEAL}, ${TEAL_LIGHT})`,
      boxShadow: `0 0 12px ${TEAL}`,
    }}
  />
);

const LogoBadge: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      position: "absolute",
      top: 40,
      left: 40,
      display: "flex",
      alignItems: "center",
      gap: 12,
      opacity,
    }}
  >
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
      }}
    >
      <Img
        src={staticFile("palmcare-logo.png")}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
    <span
      style={{
        fontSize: 18,
        fontWeight: 600,
        color: "rgba(255,255,255,0.85)",
        letterSpacing: 1,
        textShadow: "0 2px 8px rgba(0,0,0,0.6)",
      }}
    >
      PALMCARE AI
    </span>
  </div>
);

// ============ ORB INTRO — Animated orb + waveform + logo + mobile screenshot ============

const OrbIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const orbScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const orbGlow = Math.sin(frame * 0.12) * 0.3 + 0.7;

  const waveOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });

  const logoOpacity = interpolate(frame, [35, 55], [0, 1], { extrapolateRight: "clamp" });
  const logoY = interpolate(frame, [35, 55], [20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const phoneOpacity = interpolate(frame, [50, 75], [0, 1], { extrapolateRight: "clamp" });
  const phoneX = interpolate(frame, [50, 80], [80, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const taglineOpacity = interpolate(frame, [70, 95], [0, 1], { extrapolateRight: "clamp" });

  // Expanding rings
  const ring1Scale = interpolate(frame, [0, 50], [0.5, 3], { extrapolateRight: "clamp" });
  const ring1Alpha = interpolate(frame, [0, 30, 50], [0.4, 0.1, 0], { extrapolateRight: "clamp" });
  const ring2Scale = interpolate(frame, [10, 60], [0.5, 3], { extrapolateRight: "clamp" });
  const ring2Alpha = interpolate(frame, [10, 40, 60], [0.3, 0.1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: BG_DARKER, overflow: "hidden" }}>
      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 35% 45%, rgba(13,148,136,${orbGlow * 0.15}) 0%, transparent 60%)`,
        }}
      />

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => {
        const speed = 0.015 + (i % 3) * 0.005;
        const x = Math.sin(frame * speed + i * 1.1) * 350 + 500;
        const y = Math.cos(frame * speed * 0.7 + i * 0.8) * 250 + 540;
        const size = 3 + (i % 4) * 2;
        const alpha = 0.1 + Math.sin(frame * 0.08 + i) * 0.08;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: `rgba(13,148,136,${alpha})`,
              boxShadow: `0 0 ${size * 3}px rgba(13,148,136,0.3)`,
            }}
          />
        );
      })}

      {/* Expanding rings behind orb */}
      {[
        { scale: ring1Scale, alpha: ring1Alpha },
        { scale: ring2Scale, alpha: ring2Alpha },
      ].map((ring, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "45%",
            left: "35%",
            transform: `translate(-50%, -50%) scale(${ring.scale})`,
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: `2px solid rgba(13,148,136,${ring.alpha})`,
          }}
        />
      ))}

      {/* Main content - two column layout */}
      <div
        style={{
          display: "flex",
          height: "100%",
          padding: "60px 80px",
          alignItems: "center",
        }}
      >
        {/* Left side — Orb + Logo + Tagline */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Animated Orb (microphone icon like the app) */}
          <div
            style={{
              transform: `scale(${Math.max(0, orbScale)})`,
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 130,
                height: 130,
                borderRadius: 32,
                background: `linear-gradient(135deg, ${TEAL}, ${TEAL_LIGHT})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 20px 60px rgba(13,148,136,${orbGlow * 0.6})`,
              }}
            >
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M19 10v2a7 7 0 0 1-14 0v-2"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 19v4M8 23h8"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>

          {/* Waveform bars (like the app landing page) */}
          <div
            style={{
              display: "flex",
              gap: 4,
              alignItems: "center",
              height: 40,
              marginBottom: 32,
              opacity: waveOpacity,
            }}
          >
            {[...Array(16)].map((_, i) => {
              const h =
                12 + Math.sin(frame * 0.15 + i * 0.6) * 10 + Math.sin(frame * 0.08 + i * 1.2) * 6;
              return (
                <div
                  key={i}
                  style={{
                    width: 5,
                    height: Math.max(4, h),
                    borderRadius: 3,
                    background: `linear-gradient(to top, ${TEAL}, ${TEAL_LIGHT})`,
                    opacity: 0.7 + Math.sin(frame * 0.1 + i) * 0.3,
                  }}
                />
              );
            })}
          </div>

          {/* Logo + brand name */}
          <div
            style={{
              opacity: logoOpacity,
              transform: `translateY(${logoY}px)`,
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
              }}
            >
              <Img
                src={staticFile("palmcare-logo.png")}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <h1
              style={{
                fontSize: 52,
                fontWeight: 800,
                color: "#ffffff",
                margin: 0,
                letterSpacing: -1,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              PalmCare{" "}
              <span
                style={{
                  background: `linear-gradient(135deg, ${TEAL_LIGHT}, #5eead4)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                AI
              </span>
            </h1>
          </div>

          {/* Tagline */}
          <div style={{ opacity: taglineOpacity }}>
            <p
              style={{
                fontSize: 22,
                color: "#94a3b8",
                margin: 0,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              Turn care assessments into proposal-ready contracts
            </p>
          </div>
        </div>

        {/* Right side — Mobile app landing page screenshot */}
        <div
          style={{
            flex: 0.6,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: phoneOpacity,
            transform: `translateX(${phoneX}px)`,
          }}
        >
          <div
            style={{
              borderRadius: 36,
              overflow: "hidden",
              boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(13,148,136,${orbGlow * 0.2})`,
              border: "3px solid rgba(255,255,255,0.1)",
              maxHeight: 700,
            }}
          >
            <Img
              src={staticFile("ios-landing.png")}
              style={{
                height: 700,
                width: "auto",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </div>

      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${TEAL}, ${TEAL_LIGHT}, ${TEAL})`,
        }}
      />
    </AbsoluteFill>
  );
};

// ============ SCENE 1: ASSESSMENT IN PROGRESS ============

const Scene1Assessment: React.FC = () => {
  const frame = useCurrentFrame();

  const videoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const badgeOpacity = interpolate(frame, [20, 40], [0, 0.9], { extrapolateRight: "clamp" });
  const progress = frame / 390;

  // VO timing (frames at 30fps):
  // 01-scene1a: 2.88s = 86 frames — starts at frame 10
  // 02-scene1b: 4.20s = 126 frames — starts at frame 110
  // 03-scene1c: 3.22s = 97 frames — starts at frame 250

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div style={{ opacity: videoOpacity, position: "absolute", inset: 0 }}>
        <OffthreadVideo
          src={staticFile("elevenlabs-veo.mp4")}
          volume={0}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <SubtleVignette intensity={0.5} />
      <BottomGradient height="45%" opacity={0.9} />
      <LogoBadge opacity={badgeOpacity} />

      {/* Voiceover audio segments */}
      <Sequence from={10} durationInFrames={90}>
        <Audio src={staticFile("segments-palmcare/01-scene1a.mp3")} />
      </Sequence>
      <Sequence from={110} durationInFrames={130}>
        <Audio src={staticFile("segments-palmcare/02-scene1b.mp3")} />
      </Sequence>
      <Sequence from={250} durationInFrames={100}>
        <Audio src={staticFile("segments-palmcare/03-scene1c.mp3")} />
      </Sequence>

      {/* Captions */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 80px",
        }}
      >
        {frame >= 5 && frame < 115 && (
          <AnimatedCaption
            text={`"Every client has a story worth capturing."`}
            startFrame={10}
            fontSize={44}
          />
        )}
        {frame >= 105 && frame < 250 && (
          <AnimatedCaption
            text={`"A care professional. A family trusting you with someone they love."`}
            startFrame={110}
            fontSize={38}
            color="#e2e8f0"
            fontWeight={500}
          />
        )}
        {frame >= 245 && (
          <AnimatedCaption
            text={`"PalmCare AI listens — so you never miss a detail."`}
            startFrame={250}
            fontSize={44}
          />
        )}
      </div>

      <AccentLine progress={progress} />
    </AbsoluteFill>
  );
};

// ============ SCENE 2: CONTRACT APPEARS ============

const Scene2Contract: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const videoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const badgeOpacity = interpolate(frame, [10, 30], [0, 0.9], { extrapolateRight: "clamp" });
  const progress = frame / 375;

  // Recording page screenshot slides in from right during scene
  const phoneOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp" });
  const phoneX = interpolate(frame, [60, 100], [60, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const phoneOutOpacity = interpolate(frame, [200, 230], [1, 0], { extrapolateRight: "clamp" });

  // VO timing:
  // 04-scene2a: 1.39s = 42 frames — starts at frame 8
  // 05-scene2b: 4.30s = 129 frames — starts at frame 70
  // 06-scene2c: 2.98s = 89 frames — starts at frame 220

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div style={{ opacity: videoOpacity, position: "absolute", inset: 0 }}>
        <OffthreadVideo
          src={staticFile("elevenlabs-gen4.mp4")}
          volume={0}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>

      <SubtleVignette intensity={0.5} />
      <BottomGradient height="50%" opacity={0.9} />
      <LogoBadge opacity={badgeOpacity} />

      {/* Recording page screenshot floating on right */}
      {frame >= 55 && frame < 235 && (
        <div
          style={{
            position: "absolute",
            top: 80,
            right: 60,
            opacity: Math.min(phoneOpacity, phoneOutOpacity),
            transform: `translateX(${phoneX}px)`,
          }}
        >
          <div
            style={{
              borderRadius: 28,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
              border: "2px solid rgba(255,255,255,0.15)",
            }}
          >
            <Img
              src={staticFile("ios-record.png")}
              style={{ height: 420, width: "auto", objectFit: "contain" }}
            />
          </div>
        </div>
      )}

      {/* "Assessment complete" badge */}
      {frame >= 5 && frame < 65 && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 40,
            opacity: interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <div
            style={{
              background: `rgba(13,148,136,0.2)`,
              border: `1px solid rgba(13,148,136,0.5)`,
              borderRadius: 12,
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 20, color: TEAL_LIGHT }}>✓</span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: TEAL_LIGHT,
                textShadow: "0 2px 8px rgba(0,0,0,0.4)",
              }}
            >
              Assessment Complete
            </span>
          </div>
        </div>
      )}

      {/* Voiceover audio segments */}
      <Sequence from={8} durationInFrames={50}>
        <Audio src={staticFile("segments-palmcare/04-scene2a.mp3")} />
      </Sequence>
      <Sequence from={70} durationInFrames={135}>
        <Audio src={staticFile("segments-palmcare/05-scene2b.mp3")} />
      </Sequence>
      <Sequence from={220} durationInFrames={95}>
        <Audio src={staticFile("segments-palmcare/06-scene2c.mp3")} />
      </Sequence>

      {/* Captions */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 80px",
        }}
      >
        {frame < 70 && (
          <AnimatedCaption
            text={`"Assessment complete."`}
            startFrame={8}
            fontSize={48}
            color={TEAL_LIGHT}
            fontWeight={700}
          />
        )}
        {frame >= 65 && frame < 220 && (
          <AnimatedCaption
            text={`"In seconds, your care plan and service agreement — ready to sign."`}
            startFrame={70}
            fontSize={40}
          />
        )}
        {frame >= 215 && (
          <AnimatedCaption
            text={`"No paperwork. No delays. Just care, done right."`}
            startFrame={220}
            fontSize={44}
            fontWeight={700}
          />
        )}
      </div>

      <AccentLine progress={progress} />
    </AbsoluteFill>
  );
};

// ============ BRAND CLOSE ============

const BrandClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  const nameOpacity = interpolate(frame, [20, 45], [0, 1], { extrapolateRight: "clamp" });
  const tagline1Opacity = interpolate(frame, [70, 95], [0, 1], { extrapolateRight: "clamp" });
  const tagline1Y = interpolate(frame, [70, 95], [20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const palmItOpacity = interpolate(frame, [140, 170], [0, 1], { extrapolateRight: "clamp" });
  const palmItScale = spring({
    frame: frame - 140,
    fps,
    config: { damping: 10, stiffness: 120 },
  });

  const qrOpacity = interpolate(frame, [170, 200], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: BG_DARKER, overflow: "hidden" }}>
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, rgba(13,148,136,${glowPulse * 0.12}) 0%, transparent 60%)`,
        }}
      />

      {/* Floating orbs */}
      {[...Array(10)].map((_, i) => {
        const speed = 0.012 + (i % 3) * 0.004;
        const x = Math.sin(frame * speed + i * 1.3) * 400 + 960;
        const y = Math.cos(frame * speed * 0.7 + i * 0.9) * 300 + 540;
        const size = 4 + (i % 4) * 2;
        const alpha = 0.12 + Math.sin(frame * 0.08 + i) * 0.08;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: `rgba(13,148,136,${alpha})`,
              boxShadow: `0 0 ${size * 3}px rgba(13,148,136,0.25)`,
            }}
          />
        );
      })}

      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${TEAL}, ${TEAL_LIGHT}, ${TEAL})`,
        }}
      />

      {/* Voiceover audio segments */}
      <Sequence from={15} durationInFrames={30}>
        <Audio src={staticFile("segments-palmcare/07-brand.mp3")} />
      </Sequence>
      <Sequence from={65} durationInFrames={80}>
        <Audio src={staticFile("segments-palmcare/08-tagline.mp3")} />
      </Sequence>
      <Sequence from={155} durationInFrames={25}>
        <Audio src={staticFile("segments-palmcare/09-palmit.mp3")} />
      </Sequence>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        {/* Logo */}
        <div
          style={{
            transform: `scale(${Math.max(0, logoScale)})`,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 30,
              overflow: "hidden",
              boxShadow: `0 20px 60px rgba(13,148,136,${glowPulse * 0.5})`,
            }}
          >
            <Img
              src={staticFile("palmcare-logo.png")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>

        {/* Brand name */}
        <div style={{ opacity: nameOpacity, marginBottom: 48 }}>
          <h1
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "#ffffff",
              margin: 0,
              letterSpacing: -1,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            PalmCare{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${TEAL_LIGHT}, #5eead4)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AI
            </span>
          </h1>
        </div>

        {/* Tagline: "Record it. Transcribe it. Contract it." */}
        <div
          style={{
            opacity: tagline1Opacity,
            transform: `translateY(${tagline1Y}px)`,
            marginBottom: 20,
          }}
        >
          <p
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "#94a3b8",
              margin: 0,
              letterSpacing: 1,
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            Record it. Transcribe it. Contract it.
          </p>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 80,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)`,
            marginBottom: 24,
            opacity: tagline1Opacity,
          }}
        />

        {/* "Palm it." */}
        <div
          style={{
            opacity: palmItOpacity,
            transform: `scale(${Math.max(0, palmItScale)})`,
            marginBottom: 40,
          }}
        >
          <p
            style={{
              fontSize: 52,
              fontWeight: 800,
              margin: 0,
              background: `linear-gradient(135deg, ${TEAL_LIGHT}, #5eead4, ${TEAL})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            Palm it.
          </p>
        </div>

        {/* QR Code */}
        <div style={{ opacity: qrOpacity }}>
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
          >
            <Img
              src={staticFile("palmcare-qr.png")}
              style={{ width: 100, height: 100 }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============ CROSSFADE TRANSITION ============

const CrossfadeTransition: React.FC<{
  children: React.ReactNode;
  durationFrames?: number;
}> = ({ children, durationFrames = 15 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - durationFrames, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>
      {children}
    </AbsoluteFill>
  );
};

// ============ MAIN COMPOSITION ============

export const PalmCareAd: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG_DARKER }}>
      {/* ORB INTRO — Animated orb + logo + mobile landing page */}
      <Sequence from={TIMING.orbIntro.from} durationInFrames={TIMING.orbIntro.duration + 15}>
        <CrossfadeTransition>
          <OrbIntro />
        </CrossfadeTransition>
      </Sequence>

      {/* SCENE 1 — Assessment footage + voiceover */}
      <Sequence from={TIMING.scene1.from} durationInFrames={TIMING.scene1.duration + 15}>
        <CrossfadeTransition>
          <Scene1Assessment />
        </CrossfadeTransition>
      </Sequence>

      {/* SCENE 2 — Contract footage + recording page + voiceover */}
      <Sequence from={TIMING.scene2.from} durationInFrames={TIMING.scene2.duration + 15}>
        <CrossfadeTransition>
          <Scene2Contract />
        </CrossfadeTransition>
      </Sequence>

      {/* BRAND CLOSE — Logo + tagline + QR code + voiceover */}
      <Sequence from={TIMING.brandClose.from} durationInFrames={TIMING.brandClose.duration}>
        <CrossfadeTransition durationFrames={20}>
          <BrandClose />
        </CrossfadeTransition>
      </Sequence>
    </AbsoluteFill>
  );
};
