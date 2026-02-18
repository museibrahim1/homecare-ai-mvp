import React from "react";
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Audio,
  staticFile,
  Easing,
} from "remotion";

// ============ AD VIDEO CONFIGURATION ============
// Punchy 45-second ad — Problem → Solution → CTA
// Optimized for social media / paid ads
// Total: 45 seconds (1350 frames at 30fps)

const SCENE_TIMING = {
  painHook:    { from: 0,    duration: 210 },  // 0-7s   — "Still writing contracts by hand?"
  theProblem:  { from: 210,  duration: 210 },  // 7-14s  — The old way is broken
  theSolution: { from: 420,  duration: 240 },  // 14-22s — Introducing Homecare AI
  howItWorks:  { from: 660,  duration: 300 },  // 22-32s — 3-step animated pipeline
  proofStats:  { from: 960,  duration: 180 },  // 32-38s — Key metrics
  cta:         { from: 1140, duration: 210 },  // 38-45s — Get Started
  total: 1350,
};

// ============ SHARED COMPONENTS ============

const GradientBackground: React.FC<{
  color1?: string;
  color2?: string;
  intensity?: number;
  position?: string;
}> = ({
  color1 = "14, 165, 233",
  color2 = "139, 92, 246",
  intensity = 0.15,
  position = "50% 50%",
}) => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.06) * 0.05 + intensity;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `
          radial-gradient(ellipse at ${position}, rgba(${color1}, ${pulse}) 0%, transparent 55%),
          radial-gradient(ellipse at 20% 80%, rgba(${color2}, ${pulse * 0.5}) 0%, transparent 45%)
        `,
      }}
    />
  );
};

const FloatingOrbs: React.FC<{ count?: number; color?: string }> = ({
  count = 8,
  color = "14, 165, 233",
}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {[...Array(count)].map((_, i) => {
        const speed = 0.01 + (i % 3) * 0.005;
        const x = Math.sin(frame * speed + i * 1.2) * 400 + 960;
        const y = Math.cos(frame * speed * 0.7 + i * 0.8) * 300 + 540;
        const size = 4 + (i % 4) * 3;
        const alpha = 0.15 + Math.sin(frame * 0.08 + i) * 0.1;
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
              background: `rgba(${color}, ${alpha})`,
              boxShadow: `0 0 ${size * 3}px rgba(${color}, 0.3)`,
            }}
          />
        );
      })}
    </>
  );
};

const AccentBar: React.FC<{ gradient?: string }> = ({
  gradient = "linear-gradient(90deg, #0ea5e9, #8b5cf6, #d946ef)",
}) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: "4px",
      background: gradient,
    }}
  />
);

// ============ SCENE 1: PAIN HOOK ============

const PainHookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1Opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const line1Y = interpolate(frame, [0, 25], [40, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const line2Opacity = interpolate(frame, [35, 55], [0, 1], {
    extrapolateRight: "clamp",
  });
  const line2Y = interpolate(frame, [35, 60], [40, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const iconScale = spring({ frame: frame - 80, fps, config: { damping: 10, stiffness: 100 } });

  // Frustrated red pulse
  const redPulse = interpolate(frame, [120, 160, 200], [0, 0.15, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", overflow: "hidden" }}>
      <GradientBackground color1="239, 68, 68" intensity={0.1} position="50% 40%" />
      <AccentBar gradient="linear-gradient(90deg, #ef4444, #f97316, #ef4444)" />

      {/* Red pulse overlay for emphasis */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: `rgba(239, 68, 68, ${redPulse})`,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "60px",
        }}
      >
        {/* Frustrated clipboard icon */}
        <div
          style={{
            transform: `scale(${Math.max(0, iconScale)})`,
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "24px",
              background: "rgba(239, 68, 68, 0.15)",
              border: "2px solid rgba(239, 68, 68, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "48px",
            }}
          >
            📋
          </div>
        </div>

        {/* Main question */}
        <div
          style={{
            opacity: line1Opacity,
            transform: `translateY(${line1Y}px)`,
            textAlign: "center",
            marginBottom: "16px",
          }}
        >
          <h1
            style={{
              fontSize: "68px",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.2,
            }}
          >
            Still Writing Contracts
          </h1>
        </div>

        <div
          style={{
            opacity: line2Opacity,
            transform: `translateY(${line2Y}px)`,
            textAlign: "center",
          }}
        >
          <h1
            style={{
              fontSize: "68px",
              fontWeight: 800,
              background: "linear-gradient(135deg, #ef4444, #f97316)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.2,
            }}
          >
            By Hand?
          </h1>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE 2: THE PROBLEM ============

const TheProblemScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = [
    { icon: "⏰", text: "Hours of paperwork per client", delay: 0 },
    { icon: "😩", text: "Missed billable items", delay: 20 },
    { icon: "📄", text: "Error-prone manual contracts", delay: 40 },
    { icon: "💸", text: "Revenue left on the table", delay: 60 },
  ];

  // Big X that appears
  const xScale = spring({ frame: frame - 130, fps, config: { damping: 8, stiffness: 150 } });
  const xOpacity = interpolate(frame, [130, 150], [0, 0.12], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", overflow: "hidden" }}>
      <GradientBackground color1="239, 68, 68" color2="249, 115, 22" intensity={0.08} />
      <AccentBar gradient="linear-gradient(90deg, #ef4444, #f97316)" />

      {/* Background X mark */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${Math.max(0, xScale)}) rotate(-12deg)`,
          fontSize: "600px",
          fontWeight: 900,
          color: `rgba(239, 68, 68, ${xOpacity})`,
          lineHeight: 1,
          pointerEvents: "none",
        }}
      >
        X
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "60px 120px",
        }}
      >
        {/* Title */}
        <div
          style={{
            opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
            marginBottom: "50px",
          }}
        >
          <h2
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "#ef4444",
              textAlign: "center",
            }}
          >
            The Old Way is Broken
          </h2>
        </div>

        {/* Problem items */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", width: "100%", maxWidth: "800px" }}>
          {items.map((item, i) => {
            const itemOpacity = interpolate(
              frame,
              [20 + item.delay, 45 + item.delay],
              [0, 1],
              { extrapolateRight: "clamp" }
            );
            const itemX = interpolate(
              frame,
              [20 + item.delay, 45 + item.delay],
              [-60, 0],
              { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
            );

            return (
              <div
                key={i}
                style={{
                  opacity: itemOpacity,
                  transform: `translateX(${itemX}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: "24px",
                  background: "rgba(239, 68, 68, 0.06)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                  borderRadius: "16px",
                  padding: "20px 32px",
                }}
              >
                <span style={{ fontSize: "36px" }}>{item.icon}</span>
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: 600,
                    color: "#fca5a5",
                  }}
                >
                  {item.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE 3: THE SOLUTION ============

const TheSolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 80 } });
  const titleOpacity = interpolate(frame, [30, 60], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [60, 100], [0, 1], { extrapolateRight: "clamp" });
  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  // Expand ring animation
  const ringScale = interpolate(frame, [0, 60], [0.3, 1.8], { extrapolateRight: "clamp" });
  const ringOpacity = interpolate(frame, [0, 40, 60], [0.6, 0.2, 0], { extrapolateRight: "clamp" });

  // Tags that appear
  const tags = ["Voice → Contract", "AI-Powered", "Built for Healthcare"];

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", overflow: "hidden" }}>
      <GradientBackground color1="99, 102, 241" color2="14, 165, 233" intensity={0.18} />
      <FloatingOrbs count={12} color="99, 102, 241" />

      {/* Expanding ring effect */}
      <div
        style={{
          position: "absolute",
          top: "38%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${ringScale})`,
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          border: `3px solid rgba(99, 102, 241, ${ringOpacity})`,
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
        <div style={{ transform: `scale(${Math.max(0, logoScale)})`, marginBottom: "24px" }}>
          <div
            style={{
              width: "110px",
              height: "110px",
              borderRadius: "28px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 20px 60px rgba(99, 102, 241, ${glowPulse * 0.5})`,
            }}
          >
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
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

        {/* Brand name */}
        <div style={{ opacity: titleOpacity, textAlign: "center", marginBottom: "16px" }}>
          <div
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "#818cf8",
              letterSpacing: "4px",
              marginBottom: "12px",
            }}
          >
            INTRODUCING
          </div>
          <h1
            style={{
              fontSize: "80px",
              fontWeight: 800,
              background: "linear-gradient(135deg, #e0e7ff, #ffffff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Homecare AI
          </h1>
        </div>

        {/* Subtitle */}
        <div style={{ opacity: subtitleOpacity, textAlign: "center", marginBottom: "40px" }}>
          <p style={{ fontSize: "28px", color: "#94a3b8" }}>
            Turn conversations into contracts — automatically
          </p>
        </div>

        {/* Tags */}
        <div style={{ display: "flex", gap: "16px" }}>
          {tags.map((tag, i) => {
            const tagOpacity = interpolate(
              frame,
              [100 + i * 20, 130 + i * 20],
              [0, 1],
              { extrapolateRight: "clamp" }
            );
            const tagY = interpolate(
              frame,
              [100 + i * 20, 130 + i * 20],
              [20, 0],
              { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }
            );
            return (
              <div
                key={i}
                style={{
                  opacity: tagOpacity,
                  transform: `translateY(${tagY}px)`,
                  background: "rgba(99, 102, 241, 0.12)",
                  border: "1px solid rgba(99, 102, 241, 0.4)",
                  borderRadius: "30px",
                  padding: "12px 28px",
                  color: "#a5b4fc",
                  fontSize: "18px",
                  fontWeight: 500,
                }}
              >
                {tag}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE 4: HOW IT WORKS ============

const HowItWorksScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });

  const steps = [
    {
      icon: "🎙️",
      num: "01",
      title: "Record",
      desc: "Record or upload your care assessment",
      color: "#0ea5e9",
      rgb: "14, 165, 233",
    },
    {
      icon: "🤖",
      num: "02",
      title: "AI Processes",
      desc: "Transcribe, extract billing, generate notes",
      color: "#8b5cf6",
      rgb: "139, 92, 246",
    },
    {
      icon: "📋",
      num: "03",
      title: "Contract Ready",
      desc: "Review, approve, and send to client",
      color: "#22c55e",
      rgb: "34, 197, 94",
    },
  ];

  // Connection line that draws between steps
  const lineProgress = interpolate(frame, [60, 200], [0, 100], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", overflow: "hidden" }}>
      <GradientBackground color1="14, 165, 233" color2="34, 197, 94" intensity={0.1} position="50% 60%" />
      <FloatingOrbs count={6} color="139, 92, 246" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "50px 80px",
        }}
      >
        {/* Title */}
        <div style={{ opacity: titleOpacity, textAlign: "center", marginBottom: "60px" }}>
          <h2
            style={{
              fontSize: "52px",
              fontWeight: 700,
              color: "white",
            }}
          >
            How It{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Works
            </span>
          </h2>
        </div>

        {/* Steps */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            gap: "40px",
            width: "100%",
            position: "relative",
          }}
        >
          {steps.map((step, i) => {
            const delay = 40 + i * 45;
            const cardScale = spring({
              frame: frame - delay,
              fps,
              config: { damping: 12, stiffness: 80 },
            });
            const cardOpacity = interpolate(frame, [delay, delay + 20], [0, 1], {
              extrapolateRight: "clamp",
            });

            // Checkmark animation for completed steps
            const isActive =
              frame > delay + 60 && i < 2
                ? interpolate(frame, [delay + 60, delay + 80], [0, 1], {
                    extrapolateRight: "clamp",
                  })
                : 0;

            return (
              <React.Fragment key={i}>
                <div
                  style={{
                    opacity: cardOpacity,
                    transform: `scale(${Math.max(0, cardScale)})`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    width: "340px",
                  }}
                >
                  {/* Step number + icon */}
                  <div
                    style={{
                      position: "relative",
                      marginBottom: "24px",
                    }}
                  >
                    <div
                      style={{
                        width: "120px",
                        height: "120px",
                        borderRadius: "30px",
                        background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "52px",
                        boxShadow: `0 15px 40px rgba(${step.rgb}, 0.35)`,
                      }}
                    >
                      {step.icon}
                    </div>

                    {/* Step number badge */}
                    <div
                      style={{
                        position: "absolute",
                        top: "-8px",
                        right: "-8px",
                        width: "36px",
                        height: "36px",
                        borderRadius: "50%",
                        background: "#1e293b",
                        border: `2px solid ${step.color}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: step.color,
                      }}
                    >
                      {step.num}
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontSize: "28px",
                      fontWeight: 700,
                      color: "white",
                      marginBottom: "12px",
                    }}
                  >
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: "18px",
                      color: "#94a3b8",
                      textAlign: "center",
                      lineHeight: 1.5,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>

                {/* Arrow between steps */}
                {i < 2 && (
                  <div
                    style={{
                      opacity: interpolate(
                        frame,
                        [delay + 40, delay + 60],
                        [0, 1],
                        { extrapolateRight: "clamp" }
                      ),
                      display: "flex",
                      alignItems: "center",
                      paddingTop: "40px",
                    }}
                  >
                    <svg width="60" height="24" viewBox="0 0 60 24">
                      <defs>
                        <linearGradient
                          id={`arrow-grad-${i}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="0%"
                        >
                          <stop offset="0%" stopColor={steps[i].color} />
                          <stop offset="100%" stopColor={steps[i + 1].color} />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 12 H48 L40 4 M48 12 L40 20"
                        stroke={`url(#arrow-grad-${i})`}
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* "It's that simple" tagline */}
        <div
          style={{
            opacity: interpolate(frame, [220, 260], [0, 1], { extrapolateRight: "clamp" }),
            marginTop: "50px",
          }}
        >
          <div
            style={{
              fontSize: "24px",
              color: "#64748b",
              fontWeight: 500,
              fontStyle: "italic",
            }}
          >
            Voice in. Contract out. It's that simple.
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE 5: PROOF & STATS ============

const ProofStatsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  // Animated counters
  const hoursNum = Math.min(
    6,
    Math.floor(interpolate(frame, [30, 70], [0, 6], { extrapolateRight: "clamp" }))
  );
  const minsNum = Math.min(
    6,
    Math.floor(interpolate(frame, [50, 90], [0, 6], { extrapolateRight: "clamp" }))
  );

  const arrowOpacity = interpolate(frame, [65, 85], [0, 1], { extrapolateRight: "clamp" });

  // Bottom stats
  const stat1Opacity = interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" });
  const stat2Opacity = interpolate(frame, [100, 120], [0, 1], { extrapolateRight: "clamp" });
  const stat3Opacity = interpolate(frame, [120, 140], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", overflow: "hidden" }}>
      <GradientBackground color1="34, 197, 94" color2="14, 165, 233" intensity={0.12} />
      <FloatingOrbs count={10} color="34, 197, 94" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "50px",
        }}
      >
        {/* Main time comparison */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "40px",
            marginBottom: "20px",
          }}
        >
          {/* Old time */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "120px",
                fontWeight: 800,
                color: "#ef4444",
                lineHeight: 1,
                position: "relative",
              }}
            >
              {hoursNum}h
              {/* Strikethrough line */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "-5%",
                  width: `${interpolate(frame, [60, 80], [0, 110], { extrapolateRight: "clamp" })}%`,
                  height: "6px",
                  background: "#ef4444",
                  transform: "rotate(-8deg)",
                }}
              />
            </div>
            <div style={{ fontSize: "20px", color: "#94a3b8", marginTop: "8px" }}>per client</div>
          </div>

          {/* Arrow */}
          <div style={{ opacity: arrowOpacity }}>
            <svg width="80" height="40" viewBox="0 0 80 40">
              <defs>
                <linearGradient id="arrow-main" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
              <path
                d="M5 20 H65 L55 8 M65 20 L55 32"
                stroke="url(#arrow-main)"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* New time */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: "120px",
                fontWeight: 800,
                background: "linear-gradient(135deg, #22c55e, #0ea5e9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 1,
              }}
            >
              {minsNum}m
            </div>
            <div style={{ fontSize: "20px", color: "#94a3b8", marginTop: "8px" }}>with Homecare AI</div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: "120px",
            height: "3px",
            background: "linear-gradient(90deg, transparent, #334155, transparent)",
            margin: "30px 0",
          }}
        />

        {/* Bottom stats row */}
        <div style={{ display: "flex", gap: "40px" }}>
          {[
            { value: "100%", label: "Billables Captured", opacity: stat1Opacity, color: "#22c55e", rgb: "34, 197, 94" },
            { value: "Zero", label: "Manual Entry", opacity: stat2Opacity, color: "#0ea5e9", rgb: "14, 165, 233" },
            { value: "50+", label: "Agencies Trust Us", opacity: stat3Opacity, color: "#8b5cf6", rgb: "139, 92, 246" },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                opacity: stat.opacity,
                textAlign: "center",
                padding: "24px 40px",
                background: `rgba(${stat.rgb}, 0.08)`,
                border: `1px solid rgba(${stat.rgb}, 0.25)`,
                borderRadius: "20px",
                minWidth: "200px",
              }}
            >
              <div
                style={{
                  fontSize: "48px",
                  fontWeight: 700,
                  color: stat.color,
                  marginBottom: "8px",
                }}
              >
                {stat.value}
              </div>
              <div style={{ fontSize: "18px", color: "#94a3b8" }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============ SCENE 6: CTA ============

const CTAEndScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame, fps, config: { damping: 12 } });
  const titleOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" });
  const buttonOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp" });
  const buttonPulse = Math.sin(frame * 0.12) * 0.03 + 1;
  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;
  const urlOpacity = interpolate(frame, [100, 130], [0, 1], { extrapolateRight: "clamp" });

  // Concentric rings
  const ring1 = interpolate(frame, [0, 80], [0.5, 2.5], { extrapolateRight: "clamp" });
  const ring1Alpha = interpolate(frame, [0, 50, 80], [0.3, 0.1, 0], { extrapolateRight: "clamp" });
  const ring2 = interpolate(frame, [20, 100], [0.5, 2.5], { extrapolateRight: "clamp" });
  const ring2Alpha = interpolate(frame, [20, 70, 100], [0.3, 0.1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", overflow: "hidden" }}>
      <GradientBackground color1="99, 102, 241" color2="139, 92, 246" intensity={0.2} />
      <FloatingOrbs count={15} color="99, 102, 241" />

      {/* Accent line at top */}
      <AccentBar />

      {/* Expanding rings */}
      {[
        { scale: ring1, alpha: ring1Alpha },
        { scale: ring2, alpha: ring2Alpha },
      ].map((ring, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: "45%",
            left: "50%",
            transform: `translate(-50%, -50%) scale(${ring.scale})`,
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            border: `2px solid rgba(99, 102, 241, ${ring.alpha})`,
          }}
        />
      ))}

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
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "24px",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 20px 60px rgba(99, 102, 241, ${glowPulse * 0.5})`,
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
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

        {/* Brand */}
        <h1
          style={{
            fontSize: "56px",
            fontWeight: 800,
            color: "white",
            transform: `scale(${Math.max(0, logoScale)})`,
            marginBottom: "32px",
          }}
        >
          Homecare AI
        </h1>

        {/* CTA text */}
        <div style={{ opacity: titleOpacity, textAlign: "center", marginBottom: "36px" }}>
          <h2
            style={{
              fontSize: "44px",
              fontWeight: 700,
              color: "white",
              marginBottom: "12px",
            }}
          >
            Start Saving Hours Today
          </h2>
          <p style={{ fontSize: "22px", color: "#94a3b8" }}>
            Free trial — no credit card required
          </p>
        </div>

        {/* CTA Button */}
        <div
          style={{
            opacity: buttonOpacity,
            transform: `scale(${buttonPulse})`,
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              borderRadius: "16px",
              padding: "22px 64px",
              boxShadow: `0 15px 50px rgba(99, 102, 241, ${glowPulse * 0.5})`,
            }}
          >
            <span style={{ fontSize: "26px", fontWeight: 700, color: "white" }}>
              Get Started Free
            </span>
          </div>
        </div>

        {/* URL */}
        <div style={{ opacity: urlOpacity }}>
          <span
            style={{
              fontSize: "20px",
              color: "#818cf8",
              fontWeight: 500,
              letterSpacing: "1px",
            }}
          >
            homecareai.app
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============ MAIN AD COMPOSITION ============

export const AdVideo: React.FC<{ showAudio?: boolean }> = ({ showAudio = false }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* SCENE 1: Pain Hook */}
      <Sequence from={SCENE_TIMING.painHook.from} durationInFrames={SCENE_TIMING.painHook.duration}>
        <PainHookScene />
        {showAudio && <Audio src={staticFile("segments-ad/01-pain.mp3")} />}
      </Sequence>

      {/* SCENE 2: The Problem */}
      <Sequence from={SCENE_TIMING.theProblem.from} durationInFrames={SCENE_TIMING.theProblem.duration}>
        <TheProblemScene />
        {showAudio && <Audio src={staticFile("segments-ad/02-problem.mp3")} />}
      </Sequence>

      {/* SCENE 3: The Solution */}
      <Sequence from={SCENE_TIMING.theSolution.from} durationInFrames={SCENE_TIMING.theSolution.duration}>
        <TheSolutionScene />
        {showAudio && <Audio src={staticFile("segments-ad/03-solution.mp3")} />}
      </Sequence>

      {/* SCENE 4: How It Works */}
      <Sequence from={SCENE_TIMING.howItWorks.from} durationInFrames={SCENE_TIMING.howItWorks.duration}>
        <HowItWorksScene />
        {showAudio && <Audio src={staticFile("segments-ad/04-how.mp3")} />}
      </Sequence>

      {/* SCENE 5: Proof & Stats */}
      <Sequence from={SCENE_TIMING.proofStats.from} durationInFrames={SCENE_TIMING.proofStats.duration}>
        <ProofStatsScene />
        {showAudio && <Audio src={staticFile("segments-ad/05-stats.mp3")} />}
      </Sequence>

      {/* SCENE 6: CTA */}
      <Sequence from={SCENE_TIMING.cta.from} durationInFrames={SCENE_TIMING.cta.duration}>
        <CTAEndScene />
        {showAudio && <Audio src={staticFile("segments-ad/06-cta.mp3")} />}
      </Sequence>
    </AbsoluteFill>
  );
};
