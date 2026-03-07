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
// PALMCARE AI — APP FLOW AD  (~40s, 16:9, 1080p)
//
// Intercuts cinematic lifestyle footage with real app recording
// from clip4_full_app_flow.mp4 displayed in a phone frame.
//
// Timeline (30fps):
//   0.0s -  4.0s  Hook — "What if assessments wrote themselves?" (120 fr)
//   4.0s -  9.5s  Intro — dashboard in phone frame               (165 fr)
//   9.5s - 16.5s  Record — cinematic bg + recording screen        (210 fr)
//  16.5s - 23.5s  Transcription — live transcript in phone        (210 fr)
//  23.5s - 30.0s  Contract — generated contract in phone          (195 fr)
//  30.0s - 34.0s  Reaction — cinematic success                    (120 fr)
//  34.0s - 40.0s  CTA — brand close                               (180 fr)
//
// Total: 40s = 1200 frames
// ============================================================

const FPS = 30;

const T = {
  hook:        { from: 0,    dur: 120 },
  intro:       { from: 120,  dur: 165 },
  record:      { from: 285,  dur: 210 },
  transcribe:  { from: 495,  dur: 210 },
  contract:    { from: 705,  dur: 195 },
  reaction:    { from: 900,  dur: 120 },
  cta:         { from: 1020, dur: 180 },
  total: 1200,
};

const BG = "#050a0a";
const TEAL = "#0d9488";
const TEAL_L = "#14b8a6";
const TEAL_X = "#5eead4";
const W = "#ffffff";
const MUTED = "#94a3b8";
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';

// ============================================================
// SHARED PRIMITIVES
// ============================================================

const Vignette: React.FC<{ i?: number }> = ({ i = 0.6 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${i}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

const BottomGrad: React.FC<{ h?: string; o?: number }> = ({
  h = "55%",
  o = 0.9,
}) => (
  <div
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: h,
      background: `linear-gradient(to top, rgba(0,0,0,${o}) 0%, rgba(0,0,0,${o * 0.4}) 55%, transparent 100%)`,
      pointerEvents: "none",
    }}
  />
);

const TealBar: React.FC<{ progress: number }> = ({ progress }) => (
  <div
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      height: 3,
      width: `${Math.min(progress, 1) * 100}%`,
      background: `linear-gradient(90deg, ${TEAL}, ${TEAL_L})`,
      boxShadow: `0 0 14px ${TEAL}`,
    }}
  />
);

const Logo: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div
    style={{
      position: "absolute",
      top: 36,
      left: 40,
      display: "flex",
      alignItems: "center",
      gap: 10,
      opacity,
    }}
  >
    <div
      style={{
        width: 34,
        height: 34,
        borderRadius: 9,
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
      }}
    >
      <Img
        src={staticFile("palmcare-logo.png")}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
    <span
      style={{
        fontSize: 16,
        fontWeight: 600,
        color: "rgba(255,255,255,0.8)",
        letterSpacing: 1.2,
        textShadow: "0 2px 8px rgba(0,0,0,0.6)",
        fontFamily: FONT,
      }}
    >
      PALMCARE AI
    </span>
  </div>
);

const Caption: React.FC<{
  text: string;
  start: number;
  size?: number;
  color?: string;
  weight?: number;
  maxW?: number;
}> = ({ text, start, size = 42, color = W, weight = 600, maxW = 860 }) => {
  const frame = useCurrentFrame();
  const lf = frame - start;
  const op = interpolate(lf, [0, 16], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(lf, [0, 20], [28, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  if (lf < -3) return null;
  return (
    <div style={{ opacity: op, transform: `translateY(${y}px)`, textAlign: "center", maxWidth: maxW }}>
      <p
        style={{
          fontSize: size,
          fontWeight: weight,
          color,
          lineHeight: 1.35,
          margin: 0,
          fontFamily: FONT,
          textShadow: "0 4px 24px rgba(0,0,0,0.85), 0 1px 4px rgba(0,0,0,0.6)",
        }}
      >
        {text}
      </p>
    </div>
  );
};

// Phone frame that plays a section of clip4 video
const PhoneVideo: React.FC<{
  videoStartSec: number;
  height?: number;
  glow?: number;
}> = ({ videoStartSec, height = 640, glow = 0.2 }) => {
  const phoneWidth = Math.round(height * (870 / 1800));
  return (
    <div
      style={{
        width: phoneWidth,
        height,
        borderRadius: 40,
        overflow: "hidden",
        border: "3px solid rgba(255,255,255,0.1)",
        boxShadow: `0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(13,148,136,${glow})`,
        flexShrink: 0,
      }}
    >
      <OffthreadVideo
        src={staticFile("clip4-app-flow.mp4")}
        startFrom={Math.round(videoStartSec * FPS)}
        volume={0}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
};

// Particles background
const Particles: React.FC<{ count?: number; spread?: number }> = ({
  count = 12,
  spread = 400,
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {[...Array(count)].map((_, i) => {
        const speed = 0.01 + (i % 4) * 0.003;
        const x = Math.sin(frame * speed + i * 1.3) * spread + 960;
        const y = Math.cos(frame * speed * 0.7 + i * 0.8) * (spread * 0.7) + 540;
        const sz = 2 + (i % 3) * 2;
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
              boxShadow: `0 0 ${sz * 3}px rgba(13,148,136,0.15)`,
            }}
          />
        );
      })}
    </>
  );
};

// Crossfade wrapper
const Xfade: React.FC<{
  children: React.ReactNode;
  dur?: number;
}> = ({ children, dur = 15 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fi = interpolate(frame, [0, dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fo = interpolate(
    frame,
    [durationInFrames - dur, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return (
    <AbsoluteFill style={{ opacity: Math.min(fi, fo) }}>
      {children}
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 1: HOOK
// ============================================================

const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  const textOp = interpolate(frame, [15, 40], [0, 1], {
    extrapolateRight: "clamp",
  });
  const textY = interpolate(frame, [15, 45], [40, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const subOp = interpolate(frame, [50, 75], [0, 1], {
    extrapolateRight: "clamp",
  });
  const lineW = interpolate(frame, [35, 70], [0, 200], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 45%, rgba(13,148,136,${pulse * 0.12}) 0%, transparent 55%)`,
        }}
      />
      <Particles count={8} />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${TEAL}, ${TEAL_L}, ${TEAL}, transparent)`,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <div
          style={{
            opacity: textOp,
            transform: `translateY(${textY}px)`,
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: 56,
              fontWeight: 300,
              color: W,
              margin: 0,
              fontFamily: FONT,
              letterSpacing: -0.5,
            }}
          >
            What if your care assessments
          </p>
        </div>

        <div style={{ width: lineW, height: 2, background: TEAL, margin: "16px 0", opacity: textOp }} />

        <div style={{ opacity: subOp }}>
          <p
            style={{
              fontSize: 60,
              fontWeight: 800,
              margin: 0,
              fontFamily: FONT,
              letterSpacing: -1,
              background: `linear-gradient(135deg, ${TEAL_L}, ${TEAL_X})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            wrote themselves?
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 2: INTRO — Dashboard in phone
// ============================================================

const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneOp = interpolate(frame, [10, 35], [0, 1], {
    extrapolateRight: "clamp",
  });
  const phoneX = interpolate(frame, [10, 40], [120, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const textOp = interpolate(frame, [25, 50], [0, 1], {
    extrapolateRight: "clamp",
  });
  const textX = interpolate(frame, [25, 55], [-60, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const badgeOp = interpolate(frame, [60, 85], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <Particles count={6} spread={350} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 65% 50%, rgba(13,148,136,0.06) 0%, transparent 50%)`,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          padding: "0 80px",
        }}
      >
        {/* Left text */}
        <div
          style={{
            flex: 1,
            opacity: textOp,
            transform: `translateX(${textX}px)`,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <p
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: W,
              margin: 0,
              fontFamily: FONT,
              lineHeight: 1.15,
              letterSpacing: -1,
            }}
          >
            Meet{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${TEAL_L}, ${TEAL_X})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              PalmCare AI
            </span>
          </p>
          <p
            style={{
              fontSize: 22,
              fontWeight: 400,
              color: MUTED,
              margin: 0,
              fontFamily: FONT,
              maxWidth: 480,
              lineHeight: 1.5,
            }}
          >
            The app that turns every conversation into a complete care plan.
          </p>

          <div style={{ opacity: badgeOp, marginTop: 8, display: "flex", gap: 10 }}>
            {["Voice AI", "Smart Contracts", "HIPAA Compliant"].map(
              (t, i) => (
                <div
                  key={i}
                  style={{
                    background: "rgba(13,148,136,0.12)",
                    border: `1px solid ${TEAL}50`,
                    borderRadius: 20,
                    padding: "7px 16px",
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: TEAL_L,
                      fontFamily: FONT,
                    }}
                  >
                    {t}
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* Right — phone with dashboard */}
        <div
          style={{
            flex: 0.6,
            display: "flex",
            justifyContent: "center",
            opacity: phoneOp,
            transform: `translateX(${phoneX}px)`,
          }}
        >
          <PhoneVideo videoStartSec={0} height={660} glow={0.18} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 3: RECORD — cinematic bg + recording overlay
// ============================================================

const SceneRecord: React.FC = () => {
  const frame = useCurrentFrame();

  const bgOp = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const phoneOp = interpolate(frame, [30, 55], [0, 1], {
    extrapolateRight: "clamp",
  });
  const phoneScale = interpolate(frame, [30, 60], [0.85, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Cinematic Kling clip — caregiver with client */}
      <div style={{ opacity: bgOp, position: "absolute", inset: 0 }}>
        <OffthreadVideo
          src={staticFile("kling-clips/caregiver_with_client.mp4")}
          volume={0}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <Vignette i={0.5} />
      <BottomGrad h="50%" o={0.85} />
      <Logo opacity={interpolate(frame, [15, 35], [0, 0.9], { extrapolateRight: "clamp" })} />

      {/* Phone with recording screen (clip4 at ~15s where recording starts) */}
      <div
        style={{
          position: "absolute",
          right: 80,
          top: "50%",
          transform: `translateY(-50%) scale(${phoneScale})`,
          opacity: phoneOp,
        }}
      >
        <PhoneVideo videoStartSec={15} height={580} glow={0.25} />
      </div>

      {/* Caption */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 80,
          maxWidth: 700,
        }}
      >
        {frame >= 10 && frame < 100 && (
          <Caption
            text="Just press record."
            start={15}
            size={48}
            color={TEAL_L}
            weight={700}
          />
        )}
        {frame >= 90 && (
          <Caption
            text="Talk to your client, like you always do."
            start={95}
            size={38}
            color={W}
            weight={500}
          />
        )}
      </div>
      <TealBar progress={frame / 210} />
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 4: TRANSCRIPTION — live transcript in phone
// ============================================================

const SceneTranscribe: React.FC = () => {
  const frame = useCurrentFrame();

  const phoneOp = interpolate(frame, [5, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  const phoneY = interpolate(frame, [5, 35], [50, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Animated stat badges
  const stats = [
    { label: "Speaker 1", icon: "🎙️", delay: 50 },
    { label: "Speaker 2", icon: "👤", delay: 70 },
    { label: "Key Terms", icon: "✦", delay: 90 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 40% 50%, rgba(13,148,136,0.08) 0%, transparent 50%)`,
        }}
      />
      <Particles count={8} spread={300} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          padding: "0 80px",
        }}
      >
        {/* Left — phone showing live transcript (~20s into clip4) */}
        <div
          style={{
            flex: 0.55,
            display: "flex",
            justifyContent: "center",
            opacity: phoneOp,
            transform: `translateY(${phoneY}px)`,
          }}
        >
          <PhoneVideo videoStartSec={19} height={640} glow={0.22} />
        </div>

        {/* Right — text + badges */}
        <div style={{ flex: 1, paddingLeft: 60 }}>
          <div style={{ marginBottom: 24 }}>
            {frame >= 15 && (
              <Caption
                text="AI listens to every word."
                start={15}
                size={44}
                weight={700}
                maxW={600}
              />
            )}
          </div>
          <div style={{ marginBottom: 16 }}>
            {frame >= 50 && (
              <Caption
                text="Identifies each speaker. Highlights what matters."
                start={55}
                size={32}
                color={MUTED}
                weight={500}
                maxW={550}
              />
            )}
          </div>

          {/* Stat badges */}
          <div style={{ display: "flex", gap: 14, marginTop: 30 }}>
            {stats.map((s, i) => {
              const op = interpolate(frame, [s.delay, s.delay + 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const sc = interpolate(frame, [s.delay, s.delay + 25], [0.8, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.out(Easing.cubic),
              });
              return (
                <div
                  key={i}
                  style={{
                    opacity: op,
                    transform: `scale(${sc})`,
                    background: "rgba(13,148,136,0.1)",
                    border: `1px solid ${TEAL}40`,
                    borderRadius: 14,
                    padding: "12px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{s.icon}</span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: TEAL_L,
                      fontFamily: FONT,
                    }}
                  >
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <TealBar progress={frame / 210} />
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 5: CONTRACT — generated contract in phone + stats
// ============================================================

const SceneContract: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const phoneOp = interpolate(frame, [5, 30], [0, 1], {
    extrapolateRight: "clamp",
  });
  const phoneX = interpolate(frame, [5, 35], [100, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const statCards = [
    { label: "per hour", value: "$28", delay: 40 },
    { label: "per week", value: "28h", delay: 55 },
    { label: "weekly cost", value: "$784", delay: 70 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 60% 50%, rgba(13,148,136,0.07) 0%, transparent 50%)`,
        }}
      />
      <Particles count={6} spread={350} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          padding: "0 80px",
        }}
      >
        {/* Left — text + stat cards */}
        <div style={{ flex: 1 }}>
          {frame >= 10 && (
            <div style={{ marginBottom: 12 }}>
              <Caption
                text="Contracts generated"
                start={10}
                size={48}
                weight={800}
                maxW={600}
              />
            </div>
          )}
          {frame >= 30 && (
            <div style={{ marginBottom: 36 }}>
              <Caption
                text="in seconds."
                start={30}
                size={48}
                color={TEAL_L}
                weight={800}
                maxW={600}
              />
            </div>
          )}

          {/* Stat cards */}
          <div style={{ display: "flex", gap: 18, marginTop: 10 }}>
            {statCards.map((c, i) => {
              const op = interpolate(frame, [c.delay, c.delay + 20], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const sc = spring({
                frame: Math.max(0, frame - c.delay),
                fps,
                config: { damping: 12, stiffness: 100 },
              });
              return (
                <div
                  key={i}
                  style={{
                    opacity: op,
                    transform: `scale(${Math.max(0, sc)})`,
                    background: "rgba(13,148,136,0.08)",
                    border: `1px solid ${TEAL}30`,
                    borderRadius: 16,
                    padding: "20px 28px",
                    textAlign: "center",
                    minWidth: 120,
                  }}
                >
                  <p
                    style={{
                      fontSize: 36,
                      fontWeight: 800,
                      color: TEAL_L,
                      margin: 0,
                      fontFamily: FONT,
                    }}
                  >
                    {c.value}
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: MUTED,
                      margin: "4px 0 0",
                      fontFamily: FONT,
                    }}
                  >
                    {c.label}
                  </p>
                </div>
              );
            })}
          </div>

          {frame >= 90 && (
            <div style={{ marginTop: 28 }}>
              <Caption
                text="Pricing, services, care plan — ready to sign."
                start={95}
                size={28}
                color={MUTED}
                weight={500}
                maxW={550}
              />
            </div>
          )}
        </div>

        {/* Right — phone with contract view (~33s into clip4) */}
        <div
          style={{
            flex: 0.55,
            display: "flex",
            justifyContent: "center",
            opacity: phoneOp,
            transform: `translateX(${phoneX}px)`,
          }}
        >
          <PhoneVideo videoStartSec={33} height={640} glow={0.2} />
        </div>
      </div>

      <TealBar progress={frame / 195} />
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 6: REACTION — cinematic success shot
// ============================================================

const SceneReaction: React.FC = () => {
  const frame = useCurrentFrame();

  const bgOp = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });
  const badgeOp = interpolate(frame, [20, 40], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Cinematic Kling clip — success handshake */}
      <div style={{ opacity: bgOp, position: "absolute", inset: 0 }}>
        <OffthreadVideo
          src={staticFile("kling-clips/success_handshake.mp4")}
          volume={0}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <Vignette i={0.45} />
      <BottomGrad h="45%" o={0.88} />
      <Logo opacity={interpolate(frame, [10, 25], [0, 0.9], { extrapolateRight: "clamp" })} />

      {/* Success badge */}
      {badgeOp > 0 && (
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 40,
            opacity: badgeOp,
          }}
        >
          <div
            style={{
              background: `${TEAL}33`,
              border: `1px solid ${TEAL}80`,
              borderRadius: 12,
              padding: "10px 22px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 20, color: TEAL_L }}>✓</span>
            <span
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: TEAL_L,
                fontFamily: FONT,
                textShadow: "0 2px 8px rgba(0,0,0,0.4)",
              }}
            >
              Contract Signed
            </span>
          </div>
        </div>
      )}

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
        {frame >= 10 && frame < 80 && (
          <Caption
            text="No paperwork. No delays."
            start={10}
            size={48}
            weight={700}
          />
        )}
        {frame >= 70 && (
          <Caption text="Just care, done right." start={75} size={44} color={TEAL_L} weight={700} />
        )}
      </div>
      <TealBar progress={frame / 120} />
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 7: CTA — brand close
// ============================================================

const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;
  const nameOp = interpolate(frame, [18, 40], [0, 1], { extrapolateRight: "clamp" });
  const nameY = interpolate(frame, [18, 40], [18, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const tagOp = interpolate(frame, [50, 72], [0, 1], { extrapolateRight: "clamp" });
  const palmOp = interpolate(frame, [95, 118], [0, 1], { extrapolateRight: "clamp" });
  const palmSc = spring({ frame: Math.max(0, frame - 95), fps, config: { damping: 10, stiffness: 120 } });
  const qrOp = interpolate(frame, [130, 155], [0, 1], { extrapolateRight: "clamp" });
  const urlOp = interpolate(frame, [145, 165], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 40%, rgba(13,148,136,${pulse * 0.1}) 0%, transparent 55%)`,
        }}
      />
      <Particles count={10} spread={450} />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${TEAL}, ${TEAL_L}, ${TEAL})`,
        }}
      />

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
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 26,
              overflow: "hidden",
              boxShadow: `0 20px 60px rgba(13,148,136,${pulse * 0.4})`,
            }}
          >
            <Img
              src={staticFile("palmcare-logo.png")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>

        {/* PalmCare AI */}
        <div style={{ opacity: nameOp, transform: `translateY(${nameY}px)`, marginBottom: 8 }}>
          <h1
            style={{
              fontSize: 58,
              fontWeight: 800,
              color: W,
              margin: 0,
              textAlign: "center",
              fontFamily: FONT,
            }}
          >
            PalmCare{" "}
            <span
              style={{
                background: `linear-gradient(135deg, ${TEAL_L}, ${TEAL_X})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              AI
            </span>
          </h1>
        </div>

        {/* Tagline */}
        <div style={{ opacity: tagOp, marginBottom: 24 }}>
          <p
            style={{
              fontSize: 24,
              fontWeight: 500,
              color: MUTED,
              margin: 0,
              fontFamily: FONT,
              letterSpacing: 0.5,
            }}
          >
            Record it. Transcribe it. Contract it.
          </p>
        </div>

        <div
          style={{
            width: 50,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)`,
            marginBottom: 24,
            opacity: tagOp,
          }}
        />

        {/* PALM IT. */}
        <div
          style={{
            opacity: palmOp,
            transform: `scale(${Math.max(0, palmSc)})`,
            marginBottom: 36,
          }}
        >
          <span
            style={{
              fontSize: 60,
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
              fontSize: 60,
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

        {/* QR + URL */}
        <div style={{ display: "flex", alignItems: "center", gap: 24, opacity: qrOp }}>
          <div
            style={{
              background: "white",
              borderRadius: 14,
              padding: 10,
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
          >
            <Img src={staticFile("palmcare-qr.png")} style={{ width: 80, height: 80 }} />
          </div>
          <div style={{ opacity: urlOp }}>
            <p
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: TEAL_L,
                margin: 0,
                fontFamily: FONT,
              }}
            >
              palmcareai.com
            </p>
            <p
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: MUTED,
                margin: "4px 0 0",
                fontFamily: FONT,
              }}
            >
              Start your free trial
            </p>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// MAIN COMPOSITION
// ============================================================

export const AppFlowAd: React.FC<{ showAudio?: boolean }> = ({
  showAudio = false,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Sequence from={T.hook.from} durationInFrames={T.hook.dur + 15}>
        <Xfade>
          <SceneHook />
        </Xfade>
      </Sequence>

      <Sequence from={T.intro.from} durationInFrames={T.intro.dur + 15}>
        <Xfade>
          <SceneIntro />
        </Xfade>
      </Sequence>

      <Sequence from={T.record.from} durationInFrames={T.record.dur + 15}>
        <Xfade>
          <SceneRecord />
        </Xfade>
      </Sequence>

      <Sequence from={T.transcribe.from} durationInFrames={T.transcribe.dur + 15}>
        <Xfade>
          <SceneTranscribe />
        </Xfade>
      </Sequence>

      <Sequence from={T.contract.from} durationInFrames={T.contract.dur + 15}>
        <Xfade>
          <SceneContract />
        </Xfade>
      </Sequence>

      <Sequence from={T.reaction.from} durationInFrames={T.reaction.dur + 15}>
        <Xfade>
          <SceneReaction />
        </Xfade>
      </Sequence>

      <Sequence from={T.cta.from} durationInFrames={T.cta.dur}>
        <Xfade dur={20}>
          <SceneCTA />
        </Xfade>
      </Sequence>

      {/* Voiceover audio segments */}
      {showAudio && (
        <>
          <Sequence from={T.hook.from + 15} durationInFrames={100}>
            <Audio src={staticFile("segments-appflow/01-hook.mp3")} />
          </Sequence>
          <Sequence from={T.intro.from + 20} durationInFrames={140}>
            <Audio src={staticFile("segments-appflow/02-intro.mp3")} />
          </Sequence>
          <Sequence from={T.record.from + 10} durationInFrames={160}>
            <Audio src={staticFile("segments-appflow/03-record.mp3")} />
          </Sequence>
          <Sequence from={T.transcribe.from + 15} durationInFrames={160}>
            <Audio src={staticFile("segments-appflow/04-transcribe.mp3")} />
          </Sequence>
          <Sequence from={T.contract.from + 10} durationInFrames={160}>
            <Audio src={staticFile("segments-appflow/05-contract.mp3")} />
          </Sequence>
          <Sequence from={T.cta.from + 15} durationInFrames={100}>
            <Audio src={staticFile("segments-appflow/06-close.mp3")} />
          </Sequence>
          <Sequence from={T.cta.from + 120} durationInFrames={40}>
            <Audio src={staticFile("segments-appflow/07-palmit.mp3")} />
          </Sequence>
        </>
      )}
    </AbsoluteFill>
  );
};
