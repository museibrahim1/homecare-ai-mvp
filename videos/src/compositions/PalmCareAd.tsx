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

// ============ PALMCARE AI — ENHANCED VIDEO AD (V3) ============
// Uses actual mobile app dark theme (#0a1628) with teal (#0d9488)
// Recreates real app screens: Home dashboard, Record orb, tab bar
//
// Timeline (30fps):
//   0.0s -  5.0s  Orb intro + app UI showcase          (150 frames)
//   5.0s - 18.0s  Scene 1 — Assessment footage + VO     (390 frames)
//  18.0s - 30.5s  Scene 2 — Contract footage + VO       (375 frames)
//  30.5s - 38.5s  Brand close + VO                      (240 frames)
// Total: 38.5s = 1155 frames

const FPS = 30;

const TIMING = {
  orbIntro:   { from: 0,    duration: 150 },
  scene1:     { from: 150,  duration: 390 },
  scene2:     { from: 540,  duration: 375 },
  brandClose: { from: 915,  duration: 240 },
  total: 1155,
};

const APP_BG = "#0a1628";
const CARD_BG = "#0f2240";
const TEAL = "#0d9488";
const TEAL_LIGHT = "#14b8a6";
const PURPLE = "#7c3aed";
const AMBER = "#f59e0b";
const TEXT_WHITE = "#ffffff";
const TEXT_MUTED = "#829bcd";
const TEXT_DIM = "#4b5563";
const BORDER = "#1e3f7630";

// ============ APP UI COMPONENTS ============

const PhoneFrame: React.FC<{
  children: React.ReactNode;
  scale?: number;
}> = ({ children, scale = 1 }) => (
  <div
    style={{
      width: 375 * scale,
      height: 812 * scale,
      borderRadius: 44 * scale,
      overflow: "hidden",
      backgroundColor: APP_BG,
      border: `2px solid rgba(255,255,255,0.08)`,
      boxShadow: "0 30px 80px rgba(0,0,0,0.7), 0 0 40px rgba(13,148,136,0.1)",
      position: "relative",
    }}
  >
    {/* Notch */}
    <div
      style={{
        position: "absolute",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: 160 * scale,
        height: 34 * scale,
        borderRadius: `0 0 ${20 * scale}px ${20 * scale}px`,
        backgroundColor: "#000",
        zIndex: 10,
      }}
    />
    <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: 375, height: 812 }}>
      {children}
    </div>
  </div>
);

const HomeScreen: React.FC<{ frame: number }> = ({ frame }) => {
  const statOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const ctaOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ padding: "54px 24px 0", height: "100%", position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 14, color: TEXT_MUTED }}>Good morning,</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: TEXT_WHITE, marginTop: 2 }}>Sarah</div>
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            backgroundColor: CARD_BG,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
          }}
        >
          ⚙️
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, opacity: statOpacity }}>
        {[
          { label: "Clients", value: "12", gradient: `linear-gradient(135deg, ${TEAL}, #059669)` },
          { label: "Completed", value: "8", gradient: `linear-gradient(135deg, ${PURPLE}, #6d28d9)` },
          { label: "Total", value: "15", gradient: `linear-gradient(135deg, ${AMBER}, #d97706)` },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: stat.gradient,
              borderRadius: 20,
              padding: 16,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.2)",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              {i === 0 ? "👥" : i === 1 ? "✓" : "📊"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{stat.label}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: TEXT_WHITE }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* New Assessment CTA */}
      <div
        style={{
          background: `linear-gradient(90deg, ${TEAL}, #0f766e)`,
          borderRadius: 20,
          padding: 20,
          display: "flex",
          alignItems: "center",
          marginBottom: 24,
          opacity: ctaOpacity,
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 16,
            fontSize: 24,
          }}
        >
          🎙️
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: TEXT_WHITE }}>New Assessment</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
            Record a voice assessment
          </div>
        </div>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: "rgba(255,255,255,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          →
        </div>
      </div>

      {/* Recent Assessments */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: TEXT_WHITE }}>Recent Assessments</div>
          <div style={{ fontSize: 14, color: TEAL }}>See all</div>
        </div>
        {[
          { name: "Mrs. Johnson", status: "Completed", color: "#22c55e", time: "Today, 9:15 AM" },
          { name: "Mr. Davis", status: "In Progress", color: TEAL, time: "Today, 8:30 AM" },
          { name: "Ms. Williams", status: "Pending", color: AMBER, time: "Yesterday" },
        ].map((item, i) => (
          <div
            key={i}
            style={{
              backgroundColor: CARD_BG,
              borderRadius: 16,
              padding: "16px",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              borderLeft: `3px solid ${item.color}`,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: `${TEAL}15`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                fontSize: 16,
              }}
            >
              🎙️
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: TEXT_WHITE }}>{item.name}</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4 }}>{item.time}</div>
            </div>
            <div
              style={{
                backgroundColor: `${item.color}20`,
                borderRadius: 8,
                padding: "4px 10px",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.status}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 88,
          backgroundColor: APP_BG,
          borderTop: `0.5px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          paddingBottom: 28,
          paddingTop: 10,
        }}
      >
        {["🏠", "👥", "🎙️", "📅", "⊞"].map((icon, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              ...(i === 2
                ? {
                    width: 56,
                    height: 56,
                    borderRadius: 20,
                    backgroundColor: TEAL,
                    justifyContent: "center",
                    marginTop: -20,
                    boxShadow: `0 4px 12px ${TEAL}66`,
                  }
                : {}),
            }}
          >
            <span style={{ fontSize: i === 2 ? 22 : 18, opacity: i === 0 ? 1 : 0.5 }}>{icon}</span>
            {i !== 2 && (
              <span style={{ fontSize: 11, color: i === 0 ? TEAL : TEXT_DIM, marginTop: 4 }}>
                {["Home", "Clients", "", "Calendar", "More"][i]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const RecordScreen: React.FC<{ frame: number; isRecording: boolean }> = ({ frame, isRecording }) => {
  const orbPulse = isRecording ? 1 + Math.sin(frame * 0.15) * 0.08 : 1;
  const orbColor = isRecording ? "#ef4444" : TEAL;
  const orbBgColor = isRecording ? "#ef444430" : `${TEAL}30`;

  return (
    <div style={{ padding: "54px 24px 0", height: "100%", position: "relative" }}>
      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 24, fontWeight: 700, color: TEXT_WHITE }}>Record</div>
        <div style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 2 }}>Voice assessment recording</div>
      </div>

      {/* Client Picker */}
      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: TEXT_MUTED, letterSpacing: 1, marginBottom: 8 }}>
          CLIENT
        </div>
        <div
          style={{
            backgroundColor: CARD_BG,
            borderRadius: 16,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            border: `1px solid ${TEAL}40`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: `${TEAL}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
                fontSize: 12,
                fontWeight: 700,
                color: TEAL,
              }}
            >
              MJ
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: TEXT_WHITE }}>Mrs. Johnson</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>555-0123</div>
            </div>
          </div>
          <span style={{ color: TEXT_MUTED }}>▾</span>
        </div>
      </div>

      {/* Waveform */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 48,
          marginTop: 48,
          marginBottom: 24,
        }}
      >
        {isRecording ? (
          [...Array(20)].map((_, i) => {
            const h = 12 + Math.sin(frame * 0.15 + i * 0.6) * 10 + Math.sin(frame * 0.08 + i * 1.2) * 6;
            return (
              <div
                key={i}
                style={{
                  width: 4,
                  height: Math.max(4, h),
                  borderRadius: 2,
                  backgroundColor: TEAL,
                  margin: "0 2px",
                  opacity: 0.7 + Math.sin(frame * 0.1 + i) * 0.3,
                }}
              />
            );
          })
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16, color: TEXT_DIM }}>🎙️</span>
            <span style={{ fontSize: 14, color: TEXT_DIM }}>Ready to record</span>
          </div>
        )}
      </div>

      {/* Timer */}
      {isRecording && (
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              fontSize: 48,
              fontWeight: 200,
              color: TEXT_WHITE,
              letterSpacing: 6,
            }}
          >
            {`0${Math.floor(((frame / 30) % 60) / 60)}`.slice(-2)}:
            {`0${Math.floor((frame / 30) % 60)}`.slice(-2)}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 8 }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: "#ef4444",
                marginRight: 8,
              }}
            />
            <span style={{ fontSize: 14, fontWeight: 500, color: "#f87171" }}>Recording</span>
          </div>
        </div>
      )}

      {/* Record Orb */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: isRecording ? 0 : 32 }}>
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: orbBgColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${orbPulse})`,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: orbColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 6px 16px ${orbColor}66`,
              fontSize: 28,
            }}
          >
            {isRecording ? "⏹" : "🎙️"}
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <span style={{ fontSize: 14, color: TEXT_MUTED }}>
          {isRecording ? "Tap to stop recording" : "Tap to start assessment"}
        </span>
      </div>

      {/* Live Transcript (when recording) */}
      {isRecording && (
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: `${TEAL}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
                fontSize: 12,
              }}
            >
              📝
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: TEXT_WHITE }}>Live Transcript</span>
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                backgroundColor: "#ef444415",
                borderRadius: 8,
                padding: "4px 10px",
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444", marginRight: 6 }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "#f87171" }}>Listening</span>
            </div>
          </div>
          <div
            style={{
              backgroundColor: CARD_BG,
              borderRadius: 16,
              padding: 16,
              border: `1px solid ${BORDER}`,
            }}
          >
            <div style={{ fontSize: 14, color: "#c4d4f0", lineHeight: 1.6 }}>
              Hello Mrs. Johnson, how are you feeling today? I'm here to help you with your morning routine...
            </div>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 88,
          backgroundColor: APP_BG,
          borderTop: `0.5px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          paddingBottom: 28,
          paddingTop: 10,
        }}
      >
        {["🏠", "👥", "🎙️", "📅", "⊞"].map((icon, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              ...(i === 2
                ? {
                    width: 56,
                    height: 56,
                    borderRadius: 20,
                    backgroundColor: TEAL,
                    justifyContent: "center",
                    marginTop: -20,
                    boxShadow: `0 4px 12px ${TEAL}66`,
                  }
                : {}),
            }}
          >
            <span style={{ fontSize: i === 2 ? 22 : 18, opacity: i === 2 ? 1 : 0.5 }}>{icon}</span>
            {i !== 2 && (
              <span style={{ fontSize: 11, color: TEXT_DIM, marginTop: 4 }}>
                {["Home", "Clients", "", "Calendar", "More"][i]}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============ SHARED OVERLAY COMPONENTS ============

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
}> = ({ text, startFrame, fontSize = 42, color = "#ffffff", fontWeight = 600 }) => {
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
    <div style={{ opacity, transform: `translateY(${y}px)`, textAlign: "center", maxWidth: 900 }}>
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
    <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
      <Img src={staticFile("palmcare-logo.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <span style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.85)", letterSpacing: 1, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
      PALMCARE AI
    </span>
  </div>
);

// ============ ORB INTRO ============

const OrbIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const orbScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const orbGlow = Math.sin(frame * 0.12) * 0.3 + 0.7;
  const waveOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });
  const logoOpacity = interpolate(frame, [35, 55], [0, 1], { extrapolateRight: "clamp" });
  const logoY = interpolate(frame, [35, 55], [20, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const phoneOpacity = interpolate(frame, [50, 80], [0, 1], { extrapolateRight: "clamp" });
  const phoneX = interpolate(frame, [50, 85], [80, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const taglineOpacity = interpolate(frame, [70, 95], [0, 1], { extrapolateRight: "clamp" });

  // Show recording screen after a beat
  const showRecord = frame > 95;
  const recordPhoneOpacity = interpolate(frame, [95, 115], [0, 1], { extrapolateRight: "clamp" });
  const recordPhoneX = interpolate(frame, [95, 120], [-60, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  const ring1Scale = interpolate(frame, [0, 50], [0.5, 3], { extrapolateRight: "clamp" });
  const ring1Alpha = interpolate(frame, [0, 30, 50], [0.4, 0.1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: APP_BG, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 30% 45%, rgba(13,148,136,${orbGlow * 0.12}) 0%, transparent 60%)` }} />

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => {
        const speed = 0.015 + (i % 3) * 0.005;
        const x = Math.sin(frame * speed + i * 1.1) * 300 + 400;
        const y = Math.cos(frame * speed * 0.7 + i * 0.8) * 250 + 540;
        const size = 3 + (i % 4) * 2;
        const alpha = 0.1 + Math.sin(frame * 0.08 + i) * 0.08;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: "50%", background: `rgba(13,148,136,${alpha})`, boxShadow: `0 0 ${size * 3}px rgba(13,148,136,0.3)` }} />
        );
      })}

      {/* Expanding ring */}
      <div style={{ position: "absolute", top: "45%", left: "25%", transform: `translate(-50%, -50%) scale(${ring1Scale})`, width: 120, height: 120, borderRadius: "50%", border: `2px solid rgba(13,148,136,${ring1Alpha})` }} />

      {/* Top accent */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${TEAL}, ${TEAL_LIGHT}, ${TEAL})` }} />

      <div style={{ display: "flex", height: "100%", padding: "40px 60px", alignItems: "center" }}>
        {/* Left — Orb + Logo */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          {/* Animated Orb — matches the app's record button */}
          <div style={{ transform: `scale(${Math.max(0, orbScale)})`, marginBottom: 24 }}>
            <div style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: `${TEAL}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: TEAL, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 24px ${TEAL}66` }}>
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M12 19v4M8 23h8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Waveform bars */}
          <div style={{ display: "flex", gap: 3, alignItems: "center", height: 36, marginBottom: 32, opacity: waveOpacity }}>
            {[...Array(18)].map((_, i) => {
              const h = 10 + Math.sin(frame * 0.15 + i * 0.6) * 8 + Math.sin(frame * 0.08 + i * 1.2) * 5;
              return <div key={i} style={{ width: 4, height: Math.max(4, h), borderRadius: 2, backgroundColor: TEAL, opacity: 0.6 + Math.sin(frame * 0.1 + i) * 0.3 }} />;
            })}
          </div>

          {/* Logo + name */}
          <div style={{ opacity: logoOpacity, transform: `translateY(${logoY}px)`, display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
              <Img src={staticFile("palmcare-logo.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <h1 style={{ fontSize: 48, fontWeight: 800, color: TEXT_WHITE, margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              PalmCare{" "}
              <span style={{ background: `linear-gradient(135deg, ${TEAL_LIGHT}, #5eead4)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>
            </h1>
          </div>

          <div style={{ opacity: taglineOpacity }}>
            <p style={{ fontSize: 20, color: TEXT_MUTED, margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              Turn care assessments into proposal-ready contracts
            </p>
          </div>
        </div>

        {/* Right — Phone mockups */}
        <div style={{ flex: 0.8, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
          {/* Home screen phone */}
          <div style={{ opacity: phoneOpacity, transform: `translateX(${phoneX}px)`, position: "absolute", right: showRecord ? 20 : 60, zIndex: 2 }}>
            <PhoneFrame scale={0.78}>
              <HomeScreen frame={Math.max(0, frame - 50)} />
            </PhoneFrame>
          </div>

          {/* Record screen phone (appears later, overlapping) */}
          {showRecord && (
            <div style={{ opacity: recordPhoneOpacity, transform: `translateX(${recordPhoneX}px)`, position: "absolute", right: 200, zIndex: 3 }}>
              <PhoneFrame scale={0.78}>
                <RecordScreen frame={Math.max(0, frame - 95)} isRecording={frame > 110} />
              </PhoneFrame>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE 1: ASSESSMENT ============

const Scene1Assessment: React.FC = () => {
  const frame = useCurrentFrame();
  const videoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const badgeOpacity = interpolate(frame, [20, 40], [0, 0.9], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div style={{ opacity: videoOpacity, position: "absolute", inset: 0 }}>
        <OffthreadVideo src={staticFile("elevenlabs-veo.mp4")} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <SubtleVignette intensity={0.5} />
      <BottomGradient height="45%" opacity={0.9} />
      <LogoBadge opacity={badgeOpacity} />

      <Sequence from={10} durationInFrames={90}><Audio src={staticFile("segments-palmcare/01-scene1a.mp3")} /></Sequence>
      <Sequence from={110} durationInFrames={130}><Audio src={staticFile("segments-palmcare/02-scene1b.mp3")} /></Sequence>
      <Sequence from={250} durationInFrames={100}><Audio src={staticFile("segments-palmcare/03-scene1c.mp3")} /></Sequence>

      <div style={{ position: "absolute", bottom: 60, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 80px" }}>
        {frame >= 5 && frame < 115 && <AnimatedCaption text={`"Every client has a story worth capturing."`} startFrame={10} fontSize={44} />}
        {frame >= 105 && frame < 250 && <AnimatedCaption text={`"A care professional. A family trusting you with someone they love."`} startFrame={110} fontSize={38} color="#e2e8f0" fontWeight={500} />}
        {frame >= 245 && <AnimatedCaption text={`"PalmCare AI listens — so you never miss a detail."`} startFrame={250} fontSize={44} />}
      </div>
      <AccentLine progress={frame / 390} />
    </AbsoluteFill>
  );
};

// ============ SCENE 2: CONTRACT ============

const Scene2Contract: React.FC = () => {
  const frame = useCurrentFrame();
  const videoOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const badgeOpacity = interpolate(frame, [10, 30], [0, 0.9], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <div style={{ opacity: videoOpacity, position: "absolute", inset: 0 }}>
        <OffthreadVideo src={staticFile("elevenlabs-gen4.mp4")} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <SubtleVignette intensity={0.5} />
      <BottomGradient height="50%" opacity={0.9} />
      <LogoBadge opacity={badgeOpacity} />

      {frame >= 5 && frame < 65 && (
        <div style={{ position: "absolute", top: 40, right: 40, opacity: interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" }) }}>
          <div style={{ background: `${TEAL}33`, border: `1px solid ${TEAL}80`, borderRadius: 12, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20, color: TEAL_LIGHT }}>✓</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: TEAL_LIGHT, textShadow: "0 2px 8px rgba(0,0,0,0.4)" }}>Assessment Complete</span>
          </div>
        </div>
      )}

      <Sequence from={8} durationInFrames={50}><Audio src={staticFile("segments-palmcare/04-scene2a.mp3")} /></Sequence>
      <Sequence from={70} durationInFrames={135}><Audio src={staticFile("segments-palmcare/05-scene2b.mp3")} /></Sequence>
      <Sequence from={220} durationInFrames={95}><Audio src={staticFile("segments-palmcare/06-scene2c.mp3")} /></Sequence>

      <div style={{ position: "absolute", bottom: 60, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 80px" }}>
        {frame < 70 && <AnimatedCaption text={`"Assessment complete."`} startFrame={8} fontSize={48} color={TEAL_LIGHT} fontWeight={700} />}
        {frame >= 65 && frame < 220 && <AnimatedCaption text={`"In seconds, your care plan and service agreement — ready to sign."`} startFrame={70} fontSize={40} />}
        {frame >= 215 && <AnimatedCaption text={`"No paperwork. No delays. Just care, done right."`} startFrame={220} fontSize={44} fontWeight={700} />}
      </div>
      <AccentLine progress={frame / 375} />
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
  const tagline1Y = interpolate(frame, [70, 95], [20, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const palmItOpacity = interpolate(frame, [140, 170], [0, 1], { extrapolateRight: "clamp" });
  const palmItScale = spring({ frame: frame - 140, fps, config: { damping: 10, stiffness: 120 } });
  const qrOpacity = interpolate(frame, [170, 200], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: APP_BG, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 40%, rgba(13,148,136,${glowPulse * 0.12}) 0%, transparent 60%)` }} />

      {[...Array(10)].map((_, i) => {
        const speed = 0.012 + (i % 3) * 0.004;
        const x = Math.sin(frame * speed + i * 1.3) * 400 + 960;
        const y = Math.cos(frame * speed * 0.7 + i * 0.9) * 300 + 540;
        const size = 4 + (i % 4) * 2;
        const alpha = 0.12 + Math.sin(frame * 0.08 + i) * 0.08;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: "50%", background: `rgba(13,148,136,${alpha})`, boxShadow: `0 0 ${size * 3}px rgba(13,148,136,0.25)` }} />;
      })}

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${TEAL}, ${TEAL_LIGHT}, ${TEAL})` }} />

      <Sequence from={15} durationInFrames={30}><Audio src={staticFile("segments-palmcare/07-brand.mp3")} /></Sequence>
      <Sequence from={65} durationInFrames={80}><Audio src={staticFile("segments-palmcare/08-tagline.mp3")} /></Sequence>
      <Sequence from={155} durationInFrames={25}><Audio src={staticFile("segments-palmcare/09-palmit.mp3")} /></Sequence>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <div style={{ transform: `scale(${Math.max(0, logoScale)})`, marginBottom: 20 }}>
          <div style={{ width: 120, height: 120, borderRadius: 30, overflow: "hidden", boxShadow: `0 20px 60px rgba(13,148,136,${glowPulse * 0.5})` }}>
            <Img src={staticFile("palmcare-logo.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>

        <div style={{ opacity: nameOpacity, marginBottom: 48 }}>
          <h1 style={{ fontSize: 72, fontWeight: 800, color: TEXT_WHITE, margin: 0, letterSpacing: -1, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            PalmCare{" "}
            <span style={{ background: `linear-gradient(135deg, ${TEAL_LIGHT}, #5eead4)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>
          </h1>
        </div>

        <div style={{ opacity: tagline1Opacity, transform: `translateY(${tagline1Y}px)`, marginBottom: 20 }}>
          <p style={{ fontSize: 32, fontWeight: 500, color: TEXT_MUTED, margin: 0, letterSpacing: 1, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            Record it. Transcribe it. Contract it.
          </p>
        </div>

        <div style={{ width: 80, height: 2, background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)`, marginBottom: 24, opacity: tagline1Opacity }} />

        <div style={{ opacity: palmItOpacity, transform: `scale(${Math.max(0, palmItScale)})`, marginBottom: 40 }}>
          <p style={{ fontSize: 52, fontWeight: 800, margin: 0, background: `linear-gradient(135deg, ${TEAL_LIGHT}, #5eead4, ${TEAL})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            Palm it.
          </p>
        </div>

        <div style={{ opacity: qrOpacity }}>
          <div style={{ background: "white", borderRadius: 16, padding: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
            <Img src={staticFile("palmcare-qr.png")} style={{ width: 100, height: 100 }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============ CROSSFADE ============

const CrossfadeTransition: React.FC<{ children: React.ReactNode; durationFrames?: number }> = ({ children, durationFrames = 15 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, durationFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - durationFrames, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: Math.min(fadeIn, fadeOut) }}>{children}</AbsoluteFill>;
};

// ============ MAIN ============

export const PalmCareAd: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: APP_BG }}>
      <Sequence from={TIMING.orbIntro.from} durationInFrames={TIMING.orbIntro.duration + 15}>
        <CrossfadeTransition><OrbIntro /></CrossfadeTransition>
      </Sequence>
      <Sequence from={TIMING.scene1.from} durationInFrames={TIMING.scene1.duration + 15}>
        <CrossfadeTransition><Scene1Assessment /></CrossfadeTransition>
      </Sequence>
      <Sequence from={TIMING.scene2.from} durationInFrames={TIMING.scene2.duration + 15}>
        <CrossfadeTransition><Scene2Contract /></CrossfadeTransition>
      </Sequence>
      <Sequence from={TIMING.brandClose.from} durationInFrames={TIMING.brandClose.duration}>
        <CrossfadeTransition durationFrames={20}><BrandClose /></CrossfadeTransition>
      </Sequence>
    </AbsoluteFill>
  );
};
