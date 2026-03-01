import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Video,
  staticFile,
  Easing,
  OffthreadVideo,
} from "remotion";

// ============ PALMCARE AI — ENHANCED VIDEO AD ============
// Uses ElevenLabs-generated clips as base footage
// Overlays animated text, transitions, and branding
//
// Structure:
//   0.0s -  1.5s  Branded intro (logo reveal)
//   1.5s - 12.5s  Scene 1 — Assessment (veo clip, 8s + 3s text hold)
//  12.5s - 25.0s  Scene 2 — Contract (gen4 clip, 10s + 2.5s text hold)
//  25.0s - 32.0s  Brand close (logo + tagline)
// Total: ~32 seconds at 30fps = 960 frames

const FPS = 30;

const TIMING = {
  intro:      { from: 0,   duration: 45 },   // 1.5s
  scene1:     { from: 45,  duration: 330 },   // 11s
  scene2:     { from: 375, duration: 375 },   // 12.5s
  brandClose: { from: 750, duration: 210 },   // 7s
  total: 960,
};

const COLORS = {
  bg: "#0a0f1e",
  accent: "#10b981",
  accentAlt: "#06d6a0",
  purple: "#8b5cf6",
  blue: "#0ea5e9",
  white: "#ffffff",
  textMuted: "#94a3b8",
  textLight: "#e2e8f0",
  cardBg: "rgba(16, 185, 129, 0.08)",
  cardBorder: "rgba(16, 185, 129, 0.25)",
};

// ============ SHARED COMPONENTS ============

const PalmLogo: React.FC<{ size?: number; glowIntensity?: number }> = ({
  size = 80,
  glowIntensity = 0.5,
}) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.28,
      background: "linear-gradient(135deg, #10b981, #06d6a0)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: `0 ${size * 0.2}px ${size * 0.6}px rgba(16, 185, 129, ${glowIntensity})`,
    }}
  >
    <svg
      width={size * 0.55}
      height={size * 0.55}
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M18 11V6a2 2 0 0 0-4 0v1M14 10V4a2 2 0 0 0-4 0v6M10 10V5a2 2 0 0 0-4 0v7"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 11a2 2 0 0 1 4 0v1a10 10 0 0 1-10 10h-1A7 7 0 0 1 4 15v-3"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  </div>
);

const AnimatedCaption: React.FC<{
  text: string;
  startFrame: number;
  style?: React.CSSProperties;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
  maxWidth?: number;
}> = ({
  text,
  startFrame,
  style,
  fontSize = 42,
  color = COLORS.white,
  fontWeight = 600,
  maxWidth = 900,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
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
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        textAlign: "center",
        maxWidth,
        ...style,
      }}
    >
      <p
        style={{
          fontSize,
          fontWeight,
          color,
          lineHeight: 1.35,
          textShadow: "0 4px 20px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.6)",
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {text}
      </p>
    </div>
  );
};

const SubtleVignette: React.FC<{ intensity?: number }> = ({
  intensity = 0.6,
}) => (
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

const AccentLine: React.FC<{
  progress: number;
  color?: string;
}> = ({ progress, color = COLORS.accent }) => (
  <div
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      height: 3,
      width: `${progress * 100}%`,
      background: `linear-gradient(90deg, ${color}, ${COLORS.accentAlt})`,
      boxShadow: `0 0 12px ${color}`,
    }}
  />
);

// ============ SCENE: BRANDED INTRO ============

const BrandedIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const nameOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  const ringScale = interpolate(frame, [0, 40], [0.3, 2.2], {
    extrapolateRight: "clamp",
  });
  const ringOpacity = interpolate(frame, [0, 25, 40], [0.5, 0.15, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
        }}
      />

      {/* Expanding ring */}
      <div
        style={{
          position: "absolute",
          width: 120,
          height: 120,
          borderRadius: "50%",
          border: `2px solid rgba(16,185,129,${ringOpacity})`,
          transform: `scale(${ringScale})`,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          transform: `scale(${Math.max(0, logoScale)})`,
        }}
      >
        <PalmLogo size={90} glowIntensity={0.6} />
        <div style={{ opacity: nameOpacity }}>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: COLORS.white,
              margin: 0,
              letterSpacing: -1,
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            PalmCare{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #10b981, #06d6a0)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AI
            </span>
          </h1>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE 1: ASSESSMENT IN PROGRESS ============

const Scene1Assessment: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const videoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const progress = frame / 330;

  // Caption timing (relative to this scene)
  // "Every client has a story worth capturing." — 0s-3.5s
  // "A care professional. A family trusting you with someone they love." — 3.5s-7s
  // "PalmCare AI listens — so you never miss a detail." — 7s-10.5s

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Base video footage */}
      <div style={{ opacity: videoOpacity, position: "absolute", inset: 0 }}>
        <OffthreadVideo
          src={staticFile("elevenlabs-veo.mp4")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      <SubtleVignette intensity={0.5} />
      <BottomGradient height="45%" opacity={0.9} />

      {/* Top-left badge */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: interpolate(frame, [20, 40], [0, 0.9], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        <PalmLogo size={36} glowIntensity={0.3} />
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "rgba(255,255,255,0.8)",
            letterSpacing: 1,
            textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          }}
        >
          PALMCARE AI
        </span>
      </div>

      {/* Captions at bottom */}
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
        {/* Line 1: 0-3.5s (frames 0-105) */}
        {frame < 115 && (
          <AnimatedCaption
            text={`"Every client has a story worth capturing."`}
            startFrame={10}
            fontSize={44}
            color={COLORS.white}
            fontWeight={600}
          />
        )}

        {/* Line 2: 3.5s-7s (frames 105-210) */}
        {frame >= 100 && frame < 225 && (
          <AnimatedCaption
            text={`"A care professional. A family trusting you\nwith someone they love."`}
            startFrame={110}
            fontSize={38}
            color={COLORS.textLight}
            fontWeight={500}
          />
        )}

        {/* Line 3: 7s-11s (frames 210-330) */}
        {frame >= 205 && (
          <AnimatedCaption
            text={`"PalmCare AI listens — so you never miss a detail."`}
            startFrame={215}
            fontSize={42}
            color={COLORS.white}
            fontWeight={600}
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

  const videoOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const progress = frame / 375;

  // Caption timing:
  // "Assessment complete." — 0s-2.5s
  // "In seconds, your care plan and service agreement — ready to sign." — 2.5s-7s
  // "No paperwork. No delays. Just care, done right." — 7s-12s

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Base video footage — scale up from 720p to fill 1080p */}
      <div style={{ opacity: videoOpacity, position: "absolute", inset: 0 }}>
        <OffthreadVideo
          src={staticFile("elevenlabs-gen4.mp4")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </div>

      <SubtleVignette intensity={0.5} />
      <BottomGradient height="50%" opacity={0.9} />

      {/* Top-left badge */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: interpolate(frame, [10, 30], [0, 0.9], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        <PalmLogo size={36} glowIntensity={0.3} />
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "rgba(255,255,255,0.8)",
            letterSpacing: 1,
            textShadow: "0 2px 8px rgba(0,0,0,0.6)",
          }}
        >
          PALMCARE AI
        </span>
      </div>

      {/* "Assessment complete" badge */}
      {frame >= 5 && frame < 90 && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 40,
            opacity: interpolate(frame, [5, 25], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        >
          <div
            style={{
              background: "rgba(16, 185, 129, 0.2)",
              border: "1px solid rgba(16, 185, 129, 0.5)",
              borderRadius: 12,
              padding: "10px 20px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 20 }}>✓</span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: COLORS.accent,
                textShadow: "0 2px 8px rgba(0,0,0,0.4)",
              }}
            >
              Assessment Complete
            </span>
          </div>
        </div>
      )}

      {/* Captions at bottom */}
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
        {/* Line 1: 0-2.5s (frames 0-75) */}
        {frame < 90 && (
          <AnimatedCaption
            text={`"Assessment complete."`}
            startFrame={8}
            fontSize={48}
            color={COLORS.accent}
            fontWeight={700}
          />
        )}

        {/* Line 2: 2.5s-7s (frames 75-210) */}
        {frame >= 70 && frame < 225 && (
          <AnimatedCaption
            text={`"In seconds, your care plan and service\nagreement — ready to sign."`}
            startFrame={80}
            fontSize={40}
            color={COLORS.white}
            fontWeight={600}
          />
        )}

        {/* Line 3: 7s-12.5s (frames 210-375) */}
        {frame >= 205 && (
          <AnimatedCaption
            text={`"No paperwork. No delays. Just care, done right."`}
            startFrame={215}
            fontSize={44}
            color={COLORS.white}
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

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 80 },
  });
  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  const nameOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateRight: "clamp",
  });
  const tagline1Opacity = interpolate(frame, [55, 80], [0, 1], {
    extrapolateRight: "clamp",
  });
  const tagline1Y = interpolate(frame, [55, 80], [20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const tagline2Opacity = interpolate(frame, [90, 115], [0, 1], {
    extrapolateRight: "clamp",
  });
  const tagline2Y = interpolate(frame, [90, 115], [20, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const palmItOpacity = interpolate(frame, [140, 170], [0, 1], {
    extrapolateRight: "clamp",
  });
  const palmItScale = spring({
    frame: frame - 140,
    fps,
    config: { damping: 10, stiffness: 120 },
  });

  // Floating orbs
  const orbs = [...Array(10)].map((_, i) => {
    const speed = 0.012 + (i % 3) * 0.004;
    const x = Math.sin(frame * speed + i * 1.3) * 400 + 960;
    const y = Math.cos(frame * speed * 0.7 + i * 0.9) * 300 + 540;
    const size = 4 + (i % 4) * 2;
    const alpha = 0.12 + Math.sin(frame * 0.08 + i) * 0.08;
    return { x, y, size, alpha };
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.bg,
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 45%, rgba(16,185,129,${glowPulse * 0.12}) 0%, transparent 60%)`,
        }}
      />

      {/* Floating orbs */}
      {orbs.map((orb, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            borderRadius: "50%",
            background: `rgba(16,185,129,${orb.alpha})`,
            boxShadow: `0 0 ${orb.size * 3}px rgba(16,185,129,0.25)`,
          }}
        />
      ))}

      {/* Top accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: "linear-gradient(90deg, #10b981, #06d6a0, #10b981)",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            transform: `scale(${Math.max(0, logoScale)})`,
            marginBottom: 20,
          }}
        >
          <PalmLogo size={110} glowIntensity={glowPulse * 0.6} />
        </div>

        {/* Brand name */}
        <div style={{ opacity: nameOpacity, marginBottom: 48 }}>
          <h1
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: COLORS.white,
              margin: 0,
              letterSpacing: -1,
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            PalmCare{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #10b981, #06d6a0)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AI
            </span>
          </h1>
        </div>

        {/* Tagline 1: "Record it. Transcribe it. Contract it." */}
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
              color: COLORS.textMuted,
              margin: 0,
              letterSpacing: 1,
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
            background: `linear-gradient(90deg, transparent, ${COLORS.accent}, transparent)`,
            marginBottom: 24,
            opacity: tagline2Opacity,
          }}
        />

        {/* Tagline 2: "Palm it." */}
        <div
          style={{
            opacity: palmItOpacity,
            transform: `scale(${Math.max(0, palmItScale)})`,
          }}
        >
          <p
            style={{
              fontSize: 52,
              fontWeight: 800,
              margin: 0,
              background: "linear-gradient(135deg, #10b981, #06d6a0, #34d399)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontFamily:
                '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            }}
          >
            Palm it.
          </p>
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
    <AbsoluteFill style={{ backgroundColor: COLORS.bg }}>
      {/* INTRO — Logo reveal */}
      <Sequence
        from={TIMING.intro.from}
        durationInFrames={TIMING.intro.duration + 15}
      >
        <CrossfadeTransition>
          <BrandedIntro />
        </CrossfadeTransition>
      </Sequence>

      {/* SCENE 1 — Assessment in progress */}
      <Sequence
        from={TIMING.scene1.from}
        durationInFrames={TIMING.scene1.duration + 15}
      >
        <CrossfadeTransition>
          <Scene1Assessment />
        </CrossfadeTransition>
      </Sequence>

      {/* SCENE 2 — Contract appears */}
      <Sequence
        from={TIMING.scene2.from}
        durationInFrames={TIMING.scene2.duration + 15}
      >
        <CrossfadeTransition>
          <Scene2Contract />
        </CrossfadeTransition>
      </Sequence>

      {/* BRAND CLOSE — Logo + tagline */}
      <Sequence
        from={TIMING.brandClose.from}
        durationInFrames={TIMING.brandClose.duration}
      >
        <CrossfadeTransition durationFrames={20}>
          <BrandClose />
        </CrossfadeTransition>
      </Sequence>
    </AbsoluteFill>
  );
};
