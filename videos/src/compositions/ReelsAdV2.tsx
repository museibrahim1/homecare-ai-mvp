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
// PALMCARE AI — PRO REELS AD V2  (~50s, 9:16, 1080×1920)
//
// MotionCue-inspired: cinematic Kling footage, 3D phone mockups,
// kinetic typography, animated gradients, zoom effects.
// ============================================================

const FPS = 30;
const W = 1080;
const H = 1920;

const TEAL = "#0d9488";
const TEAL_L = "#14b8a6";
const TEAL_X = "#5eead4";
const TEAL_GLOW = "rgba(13,148,136,0.4)";
const WHITE = "#ffffff";
const OFF_WHITE = "#f0f0f0";
const MUTED = "#94a3b8";
const DARK = "#020808";
const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';

const T = {
  hook:     { from: 0,    dur: 100 },
  problem:  { from: 90,   dur: 130 },
  reveal:   { from: 210,  dur: 140 },
  record:   { from: 340,  dur: 170 },
  ai:       { from: 500,  dur: 170 },
  contract: { from: 660,  dur: 160 },
  montage:  { from: 810,  dur: 140 },
  cta:      { from: 940,  dur: 160 },
  total: 1100,
};

const VO = {
  hook:     { from: 10,   dur: 80 },
  problem:  { from: 100,  dur: 80 },
  reveal:   { from: 225,  dur: 80 },
  record:   { from: 360,  dur: 75 },
  ai:       { from: 520,  dur: 90 },
  contract: { from: 680,  dur: 90 },
  montage:  { from: 830,  dur: 90 },
  cta:      { from: 960,  dur: 110 },
};

// ============================================================
// PRIMITIVES
// ============================================================

const AuroraBackground: React.FC<{ intensity?: number; speed?: number }> = ({
  intensity = 1,
  speed = 1,
}) => {
  const frame = useCurrentFrame();
  const t = frame * 0.01 * speed;
  const x1 = 50 + Math.sin(t) * 20;
  const y1 = 30 + Math.cos(t * 0.7) * 15;
  const x2 = 50 + Math.sin(t * 1.3 + 2) * 25;
  const y2 = 70 + Math.cos(t * 0.9 + 1) * 20;
  const a1 = 0.08 * intensity;
  const a2 = 0.06 * intensity;
  const a3 = 0.04 * intensity;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: -100,
          background: `
            radial-gradient(ellipse 60% 40% at ${x1}% ${y1}%, rgba(13,148,136,${a1}) 0%, transparent 70%),
            radial-gradient(ellipse 50% 50% at ${x2}% ${y2}%, rgba(20,184,166,${a2}) 0%, transparent 60%),
            radial-gradient(ellipse 70% 30% at ${100 - x1}% ${100 - y1}%, rgba(94,234,212,${a3}) 0%, transparent 65%)
          `,
          filter: "blur(40px)",
        }}
      />
    </div>
  );
};

const FloatingParticles: React.FC<{ count?: number }> = ({ count = 10 }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {[...Array(count)].map((_, i) => {
        const sp = 0.008 + (i % 4) * 0.003;
        const x = Math.sin(frame * sp + i * 1.7) * 350 + W / 2;
        const y = Math.cos(frame * sp * 0.6 + i * 1.1) * 600 + H / 2;
        const sz = 2 + (i % 3) * 1.5;
        const a = 0.12 + Math.sin(frame * 0.04 + i) * 0.08;
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
              boxShadow: `0 0 ${sz * 4}px rgba(13,148,136,${a * 0.5})`,
            }}
          />
        );
      })}
    </>
  );
};

const KineticWord: React.FC<{
  word: string;
  delay: number;
  size?: number;
  color?: string;
  weight?: number;
  italic?: boolean;
  gradient?: boolean;
}> = ({
  word,
  delay,
  size = 56,
  color = WHITE,
  weight = 700,
  italic = false,
  gradient = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - delay;
  if (lf < -2) return null;

  const sc = spring({
    frame: Math.max(0, lf),
    fps,
    config: { damping: 12, stiffness: 180, mass: 0.8 },
  });
  const y = interpolate(lf, [0, 10], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const style: React.CSSProperties = {
    fontSize: size,
    fontWeight: weight,
    color: gradient ? undefined : color,
    fontFamily: FONT,
    fontStyle: italic ? "italic" : "normal",
    letterSpacing: -1,
    display: "inline-block",
    transform: `translateY(${y}px) scale(${Math.max(0, sc)})`,
    textShadow: "0 4px 30px rgba(0,0,0,0.8)",
    ...(gradient
      ? {
          background: `linear-gradient(135deg, ${TEAL_L}, ${TEAL_X})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }
      : {}),
  };

  return <span style={style}>{word}</span>;
};

const KineticLine: React.FC<{
  words: string[];
  startDelay: number;
  stagger?: number;
  size?: number;
  color?: string;
  weight?: number;
  gradientWords?: number[];
}> = ({
  words,
  startDelay,
  stagger = 4,
  size = 56,
  color = WHITE,
  weight = 700,
  gradientWords = [],
}) => (
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: "0 14px",
      padding: "0 40px",
      overflow: "hidden",
    }}
  >
    {words.map((w, i) => (
      <KineticWord
        key={i}
        word={w}
        delay={startDelay + i * stagger}
        size={size}
        color={color}
        weight={weight}
        gradient={gradientWords.includes(i)}
      />
    ))}
  </div>
);

const CinematicClip: React.FC<{
  src: string;
  startSec?: number;
  brightness?: number;
  zoomFrom?: number;
  zoomTo?: number;
}> = ({ src, startSec = 0, brightness = 0.7, zoomFrom = 1.05, zoomTo = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const zoom = interpolate(frame, [0, durationInFrames], [zoomFrom, zoomTo], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: -40,
        filter: `brightness(${brightness})`,
        transform: `scale(${zoom})`,
      }}
    >
      <OffthreadVideo
        src={staticFile(src)}
        startFrom={Math.round(startSec * FPS)}
        volume={0}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
};

const FadeInOut: React.FC<{ children: React.ReactNode; fadeIn?: number; fadeOut?: number }> = ({
  children,
  fadeIn = 15,
  fadeOut = 12,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const fi = interpolate(frame, [0, fadeIn], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fo = interpolate(frame, [d - fadeOut, d], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ opacity: Math.min(fi, fo) }}>{children}</AbsoluteFill>;
};

const Phone3D: React.FC<{
  children: React.ReactNode;
  rotateY?: number;
  rotateX?: number;
  scale?: number;
  glowIntensity?: number;
  enterDelay?: number;
  floatSpeed?: number;
}> = ({
  children,
  rotateY = -8,
  rotateX = 3,
  scale = 1,
  glowIntensity = 0.5,
  enterDelay = 0,
  floatSpeed = 0.04,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - enterDelay;
  if (lf < -3) return null;

  const enter = spring({
    frame: Math.max(0, lf),
    fps,
    config: { damping: 14, stiffness: 80 },
  });
  const float = Math.sin(frame * floatSpeed) * 6;
  const phoneW = 280;
  const phoneH = 580;

  return (
    <div
      style={{
        perspective: 1200,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        transform: `scale(${Math.max(0, enter) * scale}) translateY(${float}px)`,
      }}
    >
      <div
        style={{
          width: phoneW,
          height: phoneH,
          borderRadius: 44,
          overflow: "hidden",
          border: "4px solid rgba(255,255,255,0.15)",
          background: "#000",
          transform: `rotateY(${rotateY * enter}deg) rotateX(${rotateX}deg)`,
          boxShadow: `
            0 40px 80px rgba(0,0,0,0.6),
            0 0 60px rgba(13,148,136,${glowIntensity * enter}),
            inset 0 1px 0 rgba(255,255,255,0.1)
          `,
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
            width: 100,
            height: 28,
            background: "#000",
            borderRadius: "0 0 16px 16px",
            zIndex: 10,
          }}
        />
        <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
          {children}
        </div>
      </div>

      {/* Reflection */}
      <div
        style={{
          position: "absolute",
          bottom: -phoneH * 0.45,
          width: phoneW,
          height: phoneH * 0.4,
          borderRadius: 44,
          overflow: "hidden",
          opacity: 0.08 * enter,
          transform: `scaleY(-1) rotateY(${rotateY * enter}deg)`,
          filter: "blur(8px)",
          maskImage: "linear-gradient(to top, black 10%, transparent 90%)",
          WebkitMaskImage: "linear-gradient(to top, black 10%, transparent 90%)",
        }}
      >
        {children}
      </div>
    </div>
  );
};

const GradientOverlay: React.FC<{
  direction?: "top" | "bottom" | "both";
  intensity?: number;
}> = ({ direction = "bottom", intensity = 0.85 }) => (
  <>
    {(direction === "top" || direction === "both") && (
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "40%",
          background: `linear-gradient(to bottom, rgba(2,8,8,${intensity}) 0%, rgba(2,8,8,${intensity * 0.4}) 50%, transparent 100%)`,
          pointerEvents: "none",
        }}
      />
    )}
    {(direction === "bottom" || direction === "both") && (
      <div
        style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: "45%",
          background: `linear-gradient(to top, rgba(2,8,8,${intensity}) 0%, rgba(2,8,8,${intensity * 0.4}) 50%, transparent 100%)`,
          pointerEvents: "none",
        }}
      />
    )}
  </>
);

const StatBadge: React.FC<{
  value: string;
  label: string;
  delay: number;
  icon?: string;
}> = ({ value, label, delay, icon }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lf = frame - delay;
  if (lf < 0) return null;
  const sc = spring({ frame: lf, fps, config: { damping: 12, stiffness: 120 } });

  return (
    <div
      style={{
        transform: `scale(${Math.max(0, sc)})`,
        background: "rgba(2,8,8,0.85)",
        backdropFilter: "blur(20px)",
        border: `1px solid rgba(13,148,136,0.3)`,
        borderRadius: 20,
        padding: "16px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        minWidth: 120,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {icon && <span style={{ fontSize: 22, marginBottom: 2 }}>{icon}</span>}
      <span
        style={{
          fontSize: 28,
          fontWeight: 800,
          fontFamily: FONT,
          background: `linear-gradient(135deg, ${TEAL_L}, ${TEAL_X})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: 12, fontWeight: 500, color: MUTED, fontFamily: FONT }}>
        {label}
      </span>
    </div>
  );
};

// ============================================================
// SCENE 1: HOOK — Kinetic text on aurora
// ============================================================

const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();

  const lineW = interpolate(frame, [25, 55], [0, 300], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const lineOp = interpolate(frame, [25, 40], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <AuroraBackground intensity={1.5} speed={1.2} />
      <FloatingParticles count={8} />

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
        <KineticLine
          words={["Still", "doing", "care"]}
          startDelay={8}
          size={52}
          weight={300}
          color={OFF_WHITE}
        />
        <KineticLine
          words={["assessments"]}
          startDelay={22}
          size={52}
          weight={300}
          color={OFF_WHITE}
        />

        <div style={{ width: lineW, height: 3, background: TEAL, opacity: lineOp, margin: "8px 0" }} />

        <KineticLine
          words={["the", "old", "way?"]}
          startDelay={32}
          size={62}
          weight={800}
          gradientWords={[0, 1, 2]}
        />
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 2: PROBLEM — Cinematic stress + quick stats
// ============================================================

const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <CinematicClip src="kling-reel/01_paperwork_stress.mp4" brightness={0.55} zoomFrom={1.08} zoomTo={1} />
      <GradientOverlay direction="both" intensity={0.8} />

      <div
        style={{
          position: "absolute",
          top: 120,
          left: 0, right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        <KineticLine words={["Hours", "of"]} startDelay={10} size={44} weight={600} />
        <KineticLine words={["paperwork."]} startDelay={20} size={52} weight={800} gradientWords={[0]} />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 160,
          left: 0, right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        <KineticLine words={["Missed", "details."]} startDelay={45} size={42} weight={600} />
        <KineticLine words={["Lost", "revenue."]} startDelay={60} size={46} weight={700} color="#ef4444" />
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 3: REVEAL — 3D Phone mockup dramatic entrance
// ============================================================

const SceneReveal: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <AuroraBackground intensity={2} speed={0.8} />
      <FloatingParticles count={12} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 30,
        }}
      >
        <div style={{ marginTop: -60 }}>
          <KineticLine words={["Meet"]} startDelay={10} size={40} weight={400} color={MUTED} />
        </div>
        <KineticLine
          words={["PalmCare", "AI"]}
          startDelay={18}
          size={64}
          weight={800}
          gradientWords={[1]}
        />

        <div style={{ marginTop: 10 }}>
          <Phone3D rotateY={-12} rotateX={5} scale={1} glowIntensity={0.6} enterDelay={30}>
            <Img
              src={staticFile("nano-reel/iphone_dashboard_hero.png")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Phone3D>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 4: RECORD — Cinematic + floating phone with recording UI
// ============================================================

const SceneRecord: React.FC = () => {
  const frame = useCurrentFrame();

  const recPulse = Math.sin(frame * 0.15) * 0.4 + 0.6;

  return (
    <AbsoluteFill>
      <CinematicClip src="kling-reel/03_talking_to_client.mp4" brightness={0.5} zoomFrom={1.1} zoomTo={1.02} />
      <GradientOverlay direction="both" intensity={0.75} />

      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0, right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <KineticLine words={["Just", "talk."]} startDelay={10} size={50} weight={700} />
        <KineticLine
          words={["We", "capture", "everything."]}
          startDelay={24}
          size={42}
          weight={500}
          color={TEAL_X}
        />
      </div>

      {/* Recording indicator */}
      {frame >= 20 && (
        <div
          style={{
            position: "absolute",
            top: 220,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(10px)",
            borderRadius: 20,
            padding: "8px 18px",
            opacity: recPulse,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: "#ef4444",
              boxShadow: "0 0 10px #ef4444",
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: WHITE, fontFamily: FONT }}>
            RECORDING
          </span>
        </div>
      )}

      {/* Floating phone with recording screen */}
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <Phone3D rotateY={5} rotateX={2} scale={0.85} glowIntensity={0.4} enterDelay={35} floatSpeed={0.03}>
          <OffthreadVideo
            src={staticFile("screen-recordings/seg-04-record.mp4")}
            volume={0}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Phone3D>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 5: AI — Transcript flowing + speaker detection
// ============================================================

const SceneAI: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <AuroraBackground intensity={1.8} speed={1} />

      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0, right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <KineticLine words={["AI", "listens."]} startDelay={10} size={54} weight={700} gradientWords={[0]} />
        <KineticLine
          words={["Identifies", "every", "speaker."]}
          startDelay={28}
          size={40}
          weight={500}
          color={MUTED}
        />
      </div>

      {/* Phone with transcript */}
      <div
        style={{
          position: "absolute",
          top: "32%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <Phone3D rotateY={-6} rotateX={4} scale={0.95} glowIntensity={0.5} enterDelay={15} floatSpeed={0.035}>
          <OffthreadVideo
            src={staticFile("screen-recordings/seg-05-transcribe.mp4")}
            volume={0}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Phone3D>
      </div>

      {/* Animated badges */}
      <div
        style={{
          position: "absolute",
          bottom: 100,
          left: 0, right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 12,
        }}
      >
        <StatBadge value="2" label="Speakers" icon="🎙️" delay={60} />
        <StatBadge value="100%" label="Accuracy" icon="✓" delay={75} />
        <StatBadge value="<1s" label="Latency" icon="⚡" delay={90} />
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 6: CONTRACT — Generated agreement reveal
// ============================================================

const SceneContract: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progressW = interpolate(frame, [30, 80], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const checkSc = spring({
    frame: Math.max(0, frame - 80),
    fps,
    config: { damping: 10, stiffness: 150 },
  });

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <AuroraBackground intensity={1.5} />
      <FloatingParticles count={6} />

      <div
        style={{
          position: "absolute",
          top: 80,
          left: 0, right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <KineticLine words={["Complete", "contracts."]} startDelay={8} size={50} weight={700} />
        <KineticLine words={["In", "seconds."]} startDelay={22} size={54} weight={800} gradientWords={[1]} />
      </div>

      {/* Progress bar */}
      {frame >= 28 && (
        <div
          style={{
            position: "absolute",
            top: 250,
            left: "50%",
            transform: "translateX(-50%)",
            width: 300,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: "100%",
              height: 6,
              borderRadius: 3,
              background: "rgba(255,255,255,0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progressW}%`,
                height: "100%",
                background: `linear-gradient(90deg, ${TEAL}, ${TEAL_L})`,
                borderRadius: 3,
                boxShadow: `0 0 12px ${TEAL_GLOW}`,
              }}
            />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600, color: TEAL_L, fontFamily: FONT }}>
            {Math.round(progressW)}% Generated
          </span>
        </div>
      )}

      {/* Contract Ready badge */}
      {frame >= 78 && (
        <div
          style={{
            position: "absolute",
            top: 310,
            left: "50%",
            transform: `translateX(-50%) scale(${Math.max(0, checkSc)})`,
          }}
        >
          <div
            style={{
              background: "rgba(13,148,136,0.15)",
              border: `2px solid ${TEAL}`,
              borderRadius: 16,
              padding: "12px 28px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: `0 12px 40px rgba(0,0,0,0.4), 0 0 30px ${TEAL_GLOW}`,
            }}
          >
            <span style={{ fontSize: 22, color: TEAL_L }}>✓</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: WHITE, fontFamily: FONT }}>
              Contract Ready
            </span>
          </div>
        </div>
      )}

      {/* Phone with contract */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        <Phone3D rotateY={8} rotateX={3} scale={0.9} glowIntensity={0.5} enterDelay={25} floatSpeed={0.03}>
          <OffthreadVideo
            src={staticFile("screen-recordings/seg-06-contract.mp4")}
            volume={0}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </Phone3D>
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 7: MONTAGE — Quick feature highlights
// ============================================================

const SceneMontage: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <CinematicClip src="kling-reel/05_happy_family.mp4" brightness={0.5} zoomFrom={1.06} zoomTo={1} />
      <GradientOverlay direction="both" intensity={0.82} />

      <div
        style={{
          position: "absolute",
          top: 120,
          left: 0, right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
        }}
      >
        <KineticLine words={["Everything", "you", "need."]} startDelay={8} size={46} weight={700} />
        <KineticLine words={["One", "app."]} startDelay={24} size={52} weight={800} gradientWords={[0, 1]} />
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 0, right: 0,
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
          gap: 14,
          padding: "0 30px",
        }}
      >
        <StatBadge value="📅" label="Scheduling" delay={35} />
        <StatBadge value="📄" label="Documents" delay={48} />
        <StatBadge value="💰" label="Billing" delay={61} />
        <StatBadge value="🔒" label="HIPAA" delay={74} />
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE 8: CTA — Brand close + PALM IT
// ============================================================

const SceneCTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoSc = spring({ frame: Math.max(0, frame - 5), fps, config: { damping: 14, stiffness: 80 } });
  const palmSc = spring({ frame: Math.max(0, frame - 60), fps, config: { damping: 10, stiffness: 120 } });
  const qrOp = interpolate(frame, [90, 115], [0, 1], { extrapolateRight: "clamp" });
  const pulse = Math.sin(frame * 0.08) * 0.25 + 0.75;

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <AuroraBackground intensity={1.8} speed={0.6} />
      <FloatingParticles count={10} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 14,
        }}
      >
        {/* Logo */}
        <div
          style={{
            transform: `scale(${Math.max(0, logoSc)})`,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: 24,
              overflow: "hidden",
              boxShadow: `0 20px 60px rgba(13,148,136,${pulse * 0.5})`,
            }}
          >
            <Img
              src={staticFile("palmcare-logo.png")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>

        <KineticLine words={["PalmCare", "AI"]} startDelay={12} size={52} weight={800} gradientWords={[1]} />

        <div
          style={{
            width: 60,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)`,
            margin: "6px 0",
            opacity: interpolate(frame, [25, 38], [0, 1], { extrapolateRight: "clamp" }),
          }}
        />

        <KineticLine
          words={["Record.", "Transcribe.", "Contract."]}
          startDelay={28}
          stagger={8}
          size={34}
          weight={500}
          color={MUTED}
        />

        {/* PALM IT. */}
        <div
          style={{
            marginTop: 16,
            transform: `scale(${Math.max(0, palmSc)})`,
            opacity: interpolate(frame, [58, 68], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <span style={{ fontSize: 68, fontWeight: 900, color: WHITE, letterSpacing: -2, fontFamily: FONT }}>
            PALM{" "}
          </span>
          <span
            style={{
              fontSize: 68,
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
            marginTop: 20,
            opacity: qrOp,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: 10,
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
            }}
          >
            <Img src={staticFile("palmcare-qr.png")} style={{ width: 90, height: 90 }} />
          </div>
          <p style={{ fontSize: 18, fontWeight: 700, color: TEAL_L, margin: 0, fontFamily: FONT }}>
            palmcareai.com
          </p>

          {/* CTA button */}
          <div
            style={{
              background: `linear-gradient(135deg, ${TEAL}, ${TEAL_L})`,
              borderRadius: 28,
              padding: "14px 44px",
              marginTop: 8,
              boxShadow: `0 8px 28px rgba(13,148,136,0.4)`,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, color: WHITE, fontFamily: FONT }}>
              Book a Free Demo
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

export const ReelsAdV2: React.FC<{ showAudio?: boolean }> = ({ showAudio = false }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <Sequence from={T.hook.from} durationInFrames={T.hook.dur + 15}>
        <FadeInOut><SceneHook /></FadeInOut>
      </Sequence>

      <Sequence from={T.problem.from} durationInFrames={T.problem.dur + 15}>
        <FadeInOut><SceneProblem /></FadeInOut>
      </Sequence>

      <Sequence from={T.reveal.from} durationInFrames={T.reveal.dur + 15}>
        <FadeInOut><SceneReveal /></FadeInOut>
      </Sequence>

      <Sequence from={T.record.from} durationInFrames={T.record.dur + 15}>
        <FadeInOut><SceneRecord /></FadeInOut>
      </Sequence>

      <Sequence from={T.ai.from} durationInFrames={T.ai.dur + 15}>
        <FadeInOut><SceneAI /></FadeInOut>
      </Sequence>

      <Sequence from={T.contract.from} durationInFrames={T.contract.dur + 15}>
        <FadeInOut><SceneContract /></FadeInOut>
      </Sequence>

      <Sequence from={T.montage.from} durationInFrames={T.montage.dur + 15}>
        <FadeInOut><SceneMontage /></FadeInOut>
      </Sequence>

      <Sequence from={T.cta.from} durationInFrames={T.cta.dur}>
        <FadeInOut fadeOut={20}><SceneCTA /></FadeInOut>
      </Sequence>

      {/* Progress bar */}
      <Sequence from={0} durationInFrames={T.total}>
        {React.createElement(() => {
          const frame = useCurrentFrame();
          return (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                height: 3,
                width: `${(frame / T.total) * 100}%`,
                background: `linear-gradient(90deg, ${TEAL}, ${TEAL_L})`,
                boxShadow: `0 0 10px ${TEAL}`,
                zIndex: 50,
              }}
            />
          );
        })}
      </Sequence>

      {showAudio && (
        <>
          <Sequence from={VO.hook.from} durationInFrames={VO.hook.dur}>
            <Audio src={staticFile("segments-reel/01-hook.mp3")} />
          </Sequence>
          <Sequence from={VO.problem.from} durationInFrames={VO.problem.dur}>
            <Audio src={staticFile("segments-reel/02-meet.mp3")} />
          </Sequence>
          <Sequence from={VO.reveal.from} durationInFrames={VO.reveal.dur}>
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
          <Sequence from={VO.montage.from} durationInFrames={VO.montage.dur}>
            <Audio src={staticFile("segments-reel/07-features.mp3")} />
          </Sequence>
          <Sequence from={VO.cta.from} durationInFrames={VO.cta.dur}>
            <Audio src={staticFile("segments-reel/08-close.mp3")} />
          </Sequence>
        </>
      )}
    </AbsoluteFill>
  );
};
