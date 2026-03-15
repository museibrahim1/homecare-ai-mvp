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

// ============================================================
// PALMCARE AI — REELS / STORIES AD  (~45s, 9:16, 1080×1920)
//
// Full-screen iPhone recordings with bold text overlays
// Optimized for Instagram Reels, Facebook Reels, TikTok
//
// Timeline (30fps):
//   0.0s -  3.0s  Hook — "Still doing care assessments the old way?"  (90 fr)
//   3.0s -  6.5s  Meet — App landing + "Meet PalmCare AI"              (105 fr)
//   6.5s - 11.0s  Clients — Client list overview                       (135 fr)
//  11.0s - 17.0s  Record — Voice recording feature                     (180 fr)
//  17.0s - 23.0s  AI — Transcription + speaker detection               (180 fr)
//  23.0s - 29.0s  Contract — Generated agreement                       (180 fr)
//  29.0s - 34.0s  Features — Calendar, docs, billing montage           (150 fr)
//  34.0s - 39.5s  Close — Brand tagline                                (165 fr)
//  39.5s - 45.0s  CTA — "PALM IT" + website                           (165 fr)
//
// Total: 45s = 1350 frames
// ============================================================

const FPS = 30;

const T = {
  hook:     { from: 0,    dur: 90 },
  meet:     { from: 80,   dur: 115 },
  clients:  { from: 185,  dur: 145 },
  record:   { from: 320,  dur: 190 },
  ai:       { from: 500,  dur: 190 },
  contract: { from: 680,  dur: 190 },
  features: { from: 860,  dur: 160 },
  close:    { from: 1010, dur: 175 },
  cta:      { from: 1175, dur: 175 },
  total: 1350,
};

const VO = {
  hook:     { from: 15,   dur: 70 },
  meet:     { from: 95,   dur: 50 },
  clients:  { from: 200,  dur: 75 },
  record:   { from: 340,  dur: 75 },
  ai:       { from: 520,  dur: 90 },
  contract: { from: 700,  dur: 90 },
  features: { from: 880,  dur: 90 },
  close:    { from: 1030, dur: 110 },
  palmit:   { from: 1250, dur: 30 },
};

const BG = "#050a0a";
const TEAL = "#0d9488";
const TEAL_L = "#14b8a6";
const TEAL_X = "#5eead4";
const W = "#ffffff";
const MUTED = "#94a3b8";
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';

// ============================================================
// PRIMITIVES
// ============================================================

const FadeWrap: React.FC<{ children: React.ReactNode; dur?: number }> = ({
  children,
  dur = 12,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const fi = interpolate(frame, [0, dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fo = interpolate(frame, [d - dur, d], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ opacity: Math.min(fi, fo) }}>
      {children}
    </AbsoluteFill>
  );
};

const TextBlock: React.FC<{
  text: string;
  delay?: number;
  size?: number;
  color?: string;
  weight?: number;
  maxW?: number;
  align?: "center" | "left" | "right";
  y?: number;
}> = ({
  text,
  delay = 0,
  size = 54,
  color = W,
  weight = 700,
  maxW = 900,
  align = "center",
  y: yOffset = 0,
}) => {
  const frame = useCurrentFrame();
  const lf = frame - delay;
  const fadeIn = interpolate(lf, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const slideY = interpolate(lf, [0, 14], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  if (lf < 0) return null;
  return (
    <div
      style={{
        opacity: fadeIn,
        transform: `translateY(${slideY + yOffset}px)`,
        textAlign: align,
        maxWidth: maxW,
        padding: "0 40px",
      }}
    >
      <p
        style={{
          fontSize: size,
          fontWeight: weight,
          color,
          lineHeight: 1.25,
          margin: 0,
          fontFamily: FONT,
          textShadow:
            "0 4px 30px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.8), 0 0 40px rgba(0,0,0,0.5)",
        }}
      >
        {text}
      </p>
    </div>
  );
};

const ScreenClip: React.FC<{
  src: string;
  startSec?: number;
  brightness?: number;
  scale?: number;
}> = ({ src, startSec = 0, brightness = 0.85, scale = 1 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      filter: `brightness(${brightness})`,
    }}
  >
    <OffthreadVideo
      src={staticFile(src)}
      startFrom={Math.round(startSec * FPS)}
      volume={0}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `scale(${scale})`,
      }}
    />
  </div>
);

const GradOverlay: React.FC<{
  position?: "top" | "bottom" | "both";
  intensity?: number;
}> = ({ position = "bottom", intensity = 0.9 }) => (
  <>
    {(position === "top" || position === "both") && (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "35%",
          background: `linear-gradient(to bottom, rgba(0,0,0,${intensity}) 0%, rgba(0,0,0,${intensity * 0.3}) 60%, transparent 100%)`,
          pointerEvents: "none",
        }}
      />
    )}
    {(position === "bottom" || position === "both") && (
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "40%",
          background: `linear-gradient(to top, rgba(0,0,0,${intensity}) 0%, rgba(0,0,0,${intensity * 0.3}) 60%, transparent 100%)`,
          pointerEvents: "none",
        }}
      />
    )}
  </>
);

const TealAccent: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      background: `linear-gradient(90deg, transparent 5%, ${TEAL} 30%, ${TEAL_L} 50%, ${TEAL} 70%, transparent 95%)`,
      zIndex: 20,
    }}
  />
);

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        height: 4,
        width: `${(frame / T.total) * 100}%`,
        background: `linear-gradient(90deg, ${TEAL}, ${TEAL_L})`,
        boxShadow: `0 0 12px ${TEAL}`,
        zIndex: 20,
      }}
    />
  );
};

const LogoWatermark: React.FC<{ opacity?: number }> = ({ opacity = 0.85 }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 10], [0, opacity], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 10,
        opacity: op,
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
        }}
      >
        <Img
          src={staticFile("palmcare-logo.png")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "rgba(255,255,255,0.8)",
          letterSpacing: 1.5,
          textShadow: "0 2px 10px rgba(0,0,0,0.7)",
          fontFamily: FONT,
        }}
      >
        PALMCARE AI
      </span>
    </div>
  );
};

// ============================================================
// SCENE 1: HOOK — "Still doing care assessments the old way?"
// ============================================================

const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.1) * 0.3 + 0.7;

  const line1Op = interpolate(frame, [8, 22], [0, 1], {
    extrapolateRight: "clamp",
  });
  const line1Y = interpolate(frame, [8, 24], [30, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const line2Op = interpolate(frame, [28, 42], [0, 1], {
    extrapolateRight: "clamp",
  });
  const lineW = interpolate(frame, [20, 48], [0, 280], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 45%, rgba(13,148,136,${pulse * 0.15}) 0%, transparent 60%)`,
        }}
      />

      {[...Array(6)].map((_, i) => {
        const speed = 0.012 + (i % 3) * 0.004;
        const x = Math.sin(frame * speed + i * 1.5) * 300 + 540;
        const y = Math.cos(frame * speed * 0.7 + i * 0.8) * 500 + 960;
        const sz = 3 + (i % 3) * 2;
        const a = 0.06 + Math.sin(frame * 0.07 + i) * 0.04;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: sz,
              height: sz,
              borderRadius: "50%",
              background: `rgba(13,148,136,${a})`,
            }}
          />
        );
      })}

      <TealAccent />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "0 50px",
        }}
      >
        <div style={{ opacity: line1Op, transform: `translateY(${line1Y}px)`, textAlign: "center" }}>
          <p
            style={{
              fontSize: 52,
              fontWeight: 300,
              color: W,
              margin: 0,
              fontFamily: FONT,
              lineHeight: 1.3,
              letterSpacing: -0.5,
            }}
          >
            Still doing care assessments
          </p>
        </div>

        <div
          style={{
            width: lineW,
            height: 3,
            background: `linear-gradient(90deg, ${TEAL}, ${TEAL_L})`,
            margin: "18px 0",
            opacity: line1Op,
          }}
        />

        <div style={{ opacity: line2Op, textAlign: "center" }}>
          <p
            style={{
              fontSize: 58,
              fontWeight: 800,
              margin: 0,
              fontFamily: FONT,
              letterSpacing: -1,
              background: `linear-gradient(135deg, ${TEAL_L}, ${TEAL_X})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            the old way?
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 2: MEET — App landing screen
// ============================================================

const SceneMeet: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const videoScale = interpolate(frame, [0, 30], [1.1, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill>
      <ScreenClip
        src="screen-recordings/seg-02-landing.mp4"
        brightness={0.75}
        scale={videoScale}
      />
      <GradOverlay position="both" intensity={0.7} />
      <LogoWatermark opacity={0.7} />

      <div
        style={{
          position: "absolute",
          bottom: 140,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <TextBlock text="Meet" delay={10} size={42} weight={400} color={MUTED} />
        <TextBlock
          text="PalmCare AI"
          delay={18}
          size={64}
          weight={800}
          color={TEAL_X}
        />
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 3: CLIENTS — Client list view
// ============================================================

const SceneClients: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <ScreenClip
        src="screen-recordings/seg-03-clients.mp4"
        brightness={0.8}
      />
      <GradOverlay position="bottom" intensity={0.85} />
      <LogoWatermark />

      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <TextBlock
          text="Your entire client list"
          delay={15}
          size={46}
          weight={700}
        />
        <TextBlock
          text="organized and ready."
          delay={30}
          size={42}
          weight={600}
          color={TEAL_X}
        />
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 4: RECORD — Voice recording feature
// ============================================================

const SceneRecord: React.FC = () => {
  const frame = useCurrentFrame();

  const recPulse = Math.sin(frame * 0.15) * 0.4 + 0.6;

  return (
    <AbsoluteFill>
      <ScreenClip
        src="screen-recordings/seg-04-record.mp4"
        brightness={0.82}
      />
      <GradOverlay position="both" intensity={0.65} />
      <LogoWatermark />

      {frame >= 20 && (
        <div
          style={{
            position: "absolute",
            top: 120,
            right: 40,
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: recPulse,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 12px #ef4444",
            }}
          />
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: W,
              fontFamily: FONT,
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
              letterSpacing: 1,
            }}
          >
            RECORDING
          </span>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <TextBlock
          text="Just press record"
          delay={10}
          size={50}
          weight={700}
        />
        <TextBlock
          text="and talk to your client."
          delay={28}
          size={42}
          weight={500}
          color={MUTED}
        />
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 5: AI — Transcription + speaker detection
// ============================================================

const SceneAI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badges = [
    { label: "Speaker 1", icon: "\uD83C\uDFA4", delay: 50 },
    { label: "Speaker 2", icon: "\uD83D\uDC64", delay: 65 },
    { label: "AI Analysis", icon: "\u2728", delay: 80 },
  ];

  return (
    <AbsoluteFill>
      <ScreenClip
        src="screen-recordings/seg-05-transcribe.mp4"
        brightness={0.78}
      />
      <GradOverlay position="both" intensity={0.75} />
      <LogoWatermark />

      <div
        style={{
          position: "absolute",
          bottom: 200,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <TextBlock
          text="AI captures every word."
          delay={15}
          size={48}
          weight={700}
        />
        <TextBlock
          text="Identifies each speaker."
          delay={35}
          size={40}
          weight={600}
          color={TEAL_X}
        />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {badges.map((b, i) => {
          const op = interpolate(frame, [b.delay, b.delay + 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const sc = spring({
            frame: Math.max(0, frame - b.delay),
            fps,
            config: { damping: 12, stiffness: 100 },
          });
          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `scale(${Math.max(0, sc)})`,
                background: "rgba(5,10,10,0.8)",
                border: `1px solid ${TEAL}50`,
                borderRadius: 14,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 16 }}>{b.icon}</span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: TEAL_L,
                  fontFamily: FONT,
                }}
              >
                {b.label}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 6: CONTRACT — Generated agreement
// ============================================================

const SceneContract: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeSc = spring({
    frame: Math.max(0, frame - 60),
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <AbsoluteFill>
      <ScreenClip
        src="screen-recordings/seg-06-contract.mp4"
        brightness={0.8}
      />
      <GradOverlay position="both" intensity={0.7} />
      <LogoWatermark />

      {frame >= 55 && (
        <div
          style={{
            position: "absolute",
            top: 160,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            transform: `scale(${Math.max(0, badgeSc)})`,
          }}
        >
          <div
            style={{
              background: "rgba(5,10,10,0.85)",
              border: `2px solid ${TEAL}`,
              borderRadius: 16,
              padding: "14px 28px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: `0 12px 40px rgba(0,0,0,0.6), 0 0 24px rgba(13,148,136,0.3)`,
            }}
          >
            <span style={{ fontSize: 24, color: TEAL_L }}>✓</span>
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: W,
                fontFamily: FONT,
              }}
            >
              Contract Ready
            </span>
          </div>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <TextBlock
          text="Full service agreement"
          delay={10}
          size={46}
          weight={700}
        />
        <TextBlock
          text="generated instantly."
          delay={28}
          size={44}
          weight={700}
          color={TEAL_X}
        />
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 7: FEATURES — Calendar, docs, billing montage
// ============================================================

const SceneFeatures: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const features = [
    { label: "Scheduling", icon: "\uD83D\uDCC5", delay: 15 },
    { label: "Documents", icon: "\uD83D\uDCC4", delay: 35 },
    { label: "Billing", icon: "\uD83D\uDCB0", delay: 55 },
    { label: "HIPAA", icon: "\uD83D\uDD12", delay: 75 },
  ];

  return (
    <AbsoluteFill>
      <ScreenClip
        src="screen-recordings/seg-07-features.mp4"
        brightness={0.7}
      />
      <GradOverlay position="both" intensity={0.8} />
      <LogoWatermark />

      <div
        style={{
          position: "absolute",
          top: 180,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <TextBlock
          text="Everything you need"
          delay={5}
          size={44}
          weight={700}
        />
        <TextBlock
          text="in one app."
          delay={18}
          size={48}
          weight={800}
          color={TEAL_X}
        />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 14,
          padding: "0 30px",
        }}
      >
        {features.map((f, i) => {
          const op = interpolate(frame, [f.delay, f.delay + 12], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const sc = spring({
            frame: Math.max(0, frame - f.delay),
            fps,
            config: { damping: 14, stiffness: 110 },
          });
          return (
            <div
              key={i}
              style={{
                opacity: op,
                transform: `scale(${Math.max(0, sc)})`,
                background: "rgba(5,10,10,0.85)",
                border: `1px solid ${TEAL}40`,
                borderRadius: 16,
                padding: "14px 22px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                minWidth: 110,
              }}
            >
              <span style={{ fontSize: 28 }}>{f.icon}</span>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: TEAL_L,
                  fontFamily: FONT,
                }}
              >
                {f.label}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 8: CLOSE — Brand tagline
// ============================================================

const SceneClose: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.08) * 0.15 + 0.85;

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, rgba(13,148,136,${pulse * 0.14}) 0%, transparent 55%)`,
        }}
      />

      {[...Array(5)].map((_, i) => {
        const sway = Math.sin(frame * 0.03 + i * 1.5) * 3;
        const a = 0.03 + (i % 2) * 0.02;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${10 + i * 20}%`,
              top: -30,
              width: 160,
              height: 350,
              opacity: a,
              background: `linear-gradient(180deg, rgba(13,148,136,0.25) 0%, transparent 70%)`,
              borderRadius: "0 0 50% 50%",
              transform: `rotate(${sway + (i - 2) * 10}deg)`,
            }}
          />
        );
      })}

      <TealAccent />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 20,
          padding: "0 40px",
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            overflow: "hidden",
            boxShadow: `0 16px 50px rgba(13,148,136,${pulse * 0.4})`,
            marginBottom: 10,
          }}
        >
          <Img
            src={staticFile("palmcare-logo.png")}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>

        <TextBlock text="PalmCare AI" delay={8} size={56} weight={800} />

        <div
          style={{
            width: 60,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)`,
            opacity: interpolate(frame, [20, 35], [0, 1], {
              extrapolateRight: "clamp",
            }),
          }}
        />

        <TextBlock
          text="Record it."
          delay={25}
          size={40}
          weight={600}
          color={MUTED}
        />
        <TextBlock
          text="Transcribe it."
          delay={40}
          size={40}
          weight={600}
          color={MUTED}
        />
        <TextBlock
          text="Contract it."
          delay={55}
          size={44}
          weight={700}
          color={TEAL_X}
        />
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 9: CTA — "PALM IT" + website
// ============================================================

const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;
  const palmSc = spring({
    frame: Math.max(0, frame - 20),
    fps,
    config: { damping: 10, stiffness: 120 },
  });
  const qrOp = interpolate(frame, [70, 95], [0, 1], {
    extrapolateRight: "clamp",
  });
  const urlOp = interpolate(frame, [85, 110], [0, 1], {
    extrapolateRight: "clamp",
  });
  const ctaOp = interpolate(frame, [110, 135], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, rgba(13,148,136,${pulse * 0.12}) 0%, transparent 55%)`,
        }}
      />

      {[...Array(8)].map((_, i) => {
        const sp = 0.01 + (i % 3) * 0.004;
        const x = Math.sin(frame * sp + i * 1.5) * 300 + 540;
        const y = Math.cos(frame * sp * 0.7 + i * 0.9) * 500 + 960;
        const sz = 2 + (i % 3) * 1.5;
        const a = 0.05 + Math.sin(frame * 0.06 + i) * 0.03;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: sz,
              height: sz,
              borderRadius: "50%",
              background: `rgba(13,148,136,${a})`,
            }}
          />
        );
      })}

      <TealAccent />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 16,
        }}
      >
        <div
          style={{
            opacity: interpolate(frame, [10, 25], [0, 1], {
              extrapolateRight: "clamp",
            }),
            transform: `scale(${Math.max(0, palmSc)})`,
            marginBottom: 20,
          }}
        >
          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: W,
              letterSpacing: -2,
              fontFamily: FONT,
            }}
          >
            PALM{" "}
          </span>
          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              fontStyle: "italic",
              letterSpacing: -2,
              fontFamily: FONT,
              background: `linear-gradient(135deg, ${TEAL_L}, ${TEAL_X})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            IT.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            opacity: qrOp,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: 12,
              boxShadow: "0 12px 36px rgba(0,0,0,0.3)",
            }}
          >
            <Img
              src={staticFile("palmcare-qr.png")}
              style={{ width: 100, height: 100 }}
            />
          </div>
          <div style={{ textAlign: "center", opacity: urlOp }}>
            <p
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: TEAL_L,
                margin: 0,
                fontFamily: FONT,
              }}
            >
              palmcareai.com
            </p>
            <p
              style={{
                fontSize: 15,
                fontWeight: 400,
                color: MUTED,
                margin: "6px 0 0",
                fontFamily: FONT,
              }}
            >
              Start your free trial
            </p>
          </div>
        </div>

        <div
          style={{
            opacity: ctaOp,
            marginTop: 20,
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, ${TEAL}, ${TEAL_L})`,
              borderRadius: 30,
              padding: "16px 48px",
              boxShadow: `0 8px 30px rgba(13,148,136,0.4)`,
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: W,
                fontFamily: FONT,
                letterSpacing: 0.5,
              }}
            >
              Book a Demo
            </span>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// MAIN COMPOSITION
// ============================================================

export const ReelsAd: React.FC<{ showAudio?: boolean }> = ({
  showAudio = false,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Sequence from={T.hook.from} durationInFrames={T.hook.dur + 12}>
        <FadeWrap>
          <SceneHook />
        </FadeWrap>
      </Sequence>

      <Sequence from={T.meet.from} durationInFrames={T.meet.dur + 12}>
        <FadeWrap>
          <SceneMeet />
        </FadeWrap>
      </Sequence>

      <Sequence from={T.clients.from} durationInFrames={T.clients.dur + 12}>
        <FadeWrap>
          <SceneClients />
        </FadeWrap>
      </Sequence>

      <Sequence from={T.record.from} durationInFrames={T.record.dur + 12}>
        <FadeWrap>
          <SceneRecord />
        </FadeWrap>
      </Sequence>

      <Sequence from={T.ai.from} durationInFrames={T.ai.dur + 12}>
        <FadeWrap>
          <SceneAI />
        </FadeWrap>
      </Sequence>

      <Sequence from={T.contract.from} durationInFrames={T.contract.dur + 12}>
        <FadeWrap>
          <SceneContract />
        </FadeWrap>
      </Sequence>

      <Sequence from={T.features.from} durationInFrames={T.features.dur + 12}>
        <FadeWrap>
          <SceneFeatures />
        </FadeWrap>
      </Sequence>

      <Sequence from={T.close.from} durationInFrames={T.close.dur + 12}>
        <FadeWrap>
          <SceneClose />
        </FadeWrap>
      </Sequence>

      <Sequence from={T.cta.from} durationInFrames={T.cta.dur}>
        <FadeWrap dur={18}>
          <SceneCTA />
        </FadeWrap>
      </Sequence>

      <Sequence from={0} durationInFrames={T.total}>
        <ProgressBar />
      </Sequence>

      {showAudio && (
        <>
          <Sequence from={VO.hook.from} durationInFrames={VO.hook.dur}>
            <Audio src={staticFile("segments-reel/01-hook.mp3")} />
          </Sequence>
          <Sequence from={VO.meet.from} durationInFrames={VO.meet.dur}>
            <Audio src={staticFile("segments-reel/02-meet.mp3")} />
          </Sequence>
          <Sequence from={VO.clients.from} durationInFrames={VO.clients.dur}>
            <Audio src={staticFile("segments-reel/03-clients.mp3")} />
          </Sequence>
          <Sequence from={VO.record.from} durationInFrames={VO.record.dur}>
            <Audio src={staticFile("segments-reel/04-record.mp3")} />
          </Sequence>
          <Sequence from={VO.ai.from} durationInFrames={VO.ai.dur}>
            <Audio src={staticFile("segments-reel/05-ai.mp3")} />
          </Sequence>
          <Sequence from={VO.contract.from} durationInFrames={VO.contract.dur}>
            <Audio src={staticFile("segments-reel/06-contract.mp3")} />
          </Sequence>
          <Sequence from={VO.features.from} durationInFrames={VO.features.dur}>
            <Audio src={staticFile("segments-reel/07-features.mp3")} />
          </Sequence>
          <Sequence from={VO.close.from} durationInFrames={VO.close.dur}>
            <Audio src={staticFile("segments-reel/08-close.mp3")} />
          </Sequence>
          <Sequence from={VO.palmit.from} durationInFrames={VO.palmit.dur}>
            <Audio src={staticFile("segments-reel/09-palmit.mp3")} />
          </Sequence>
        </>
      )}
    </AbsoluteFill>
  );
};
