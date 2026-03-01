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

// ============ PALMCARE AI — ENHANCED VIDEO AD (V4) ============
// Uses real app screenshots (landing orb + record screen)
// Dark theme with teal accent matching the actual app
//
// Timeline (30fps):
//   0.0s -  5.5s  Orb intro + real app screenshots       (165 frames)
//   5.5s - 18.5s  Scene 1 — Assessment footage + VO       (390 frames)
//  18.5s - 31.0s  Scene 2 — Contract footage + VO         (375 frames)
//  31.0s - 39.0s  Brand close + VO                        (240 frames)
// Total: 39s = 1170 frames

const TIMING = {
  orbIntro:   { from: 0,    duration: 165 },
  scene1:     { from: 165,  duration: 390 },
  scene2:     { from: 555,  duration: 375 },
  brandClose: { from: 930,  duration: 240 },
  total: 1170,
};

const APP_BG = "#0a0f0f";
const TEAL = "#0d9488";
const TEAL_LIGHT = "#14b8a6";
const TEXT_WHITE = "#ffffff";
const TEXT_MUTED = "#94a3b8";

// ============ SHARED COMPONENTS ============

const SubtleVignette: React.FC<{ intensity?: number }> = ({ intensity = 0.6 }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${intensity}) 100%)`, pointerEvents: "none" }} />
);

const BottomGradient: React.FC<{ height?: string; opacity?: number }> = ({ height = "50%", opacity = 0.85 }) => (
  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height, background: `linear-gradient(to top, rgba(0,0,0,${opacity}) 0%, rgba(0,0,0,${opacity * 0.5}) 50%, transparent 100%)`, pointerEvents: "none" }} />
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
  const opacity = interpolate(localFrame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(localFrame, [0, 22], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  if (localFrame < -5) return null;
  return (
    <div style={{ opacity, transform: `translateY(${y}px)`, textAlign: "center", maxWidth: 900 }}>
      <p style={{ fontSize, fontWeight, color, lineHeight: 1.35, textShadow: "0 4px 20px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.6)", margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {text}
      </p>
    </div>
  );
};

const AccentLine: React.FC<{ progress: number }> = ({ progress }) => (
  <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, width: `${progress * 100}%`, background: `linear-gradient(90deg, ${TEAL}, ${TEAL_LIGHT})`, boxShadow: `0 0 12px ${TEAL}` }} />
);

const LogoBadge: React.FC<{ opacity: number }> = ({ opacity }) => (
  <div style={{ position: "absolute", top: 40, left: 40, display: "flex", alignItems: "center", gap: 12, opacity }}>
    <div style={{ width: 36, height: 36, borderRadius: 10, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
      <Img src={staticFile("palmcare-logo.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <span style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.85)", letterSpacing: 1, textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
      PALMCARE AI
    </span>
  </div>
);

// Phone frame that wraps real screenshots
const PhoneFrame: React.FC<{
  src: string;
  height?: number;
  glowColor?: string;
  glowIntensity?: number;
}> = ({ src, height = 680, glowColor = TEAL, glowIntensity = 0.15 }) => (
  <div
    style={{
      borderRadius: 44,
      overflow: "hidden",
      border: "3px solid rgba(255,255,255,0.08)",
      boxShadow: `0 30px 80px rgba(0,0,0,0.7), 0 0 60px rgba(${glowColor === TEAL ? "13,148,136" : "139,92,246"},${glowIntensity})`,
    }}
  >
    <Img
      src={staticFile(src)}
      style={{ height, width: "auto", objectFit: "contain", display: "block" }}
    />
  </div>
);

// ============ ORB INTRO ============

const OrbIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const orbGlow = Math.sin(frame * 0.1) * 0.3 + 0.7;

  // Left side animations
  const logoOpacity = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });
  const logoScale = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const nameOpacity = interpolate(frame, [15, 40], [0, 1], { extrapolateRight: "clamp" });
  const nameY = interpolate(frame, [15, 40], [20, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const taglineOpacity = interpolate(frame, [40, 65], [0, 1], { extrapolateRight: "clamp" });
  const pillsOpacity = interpolate(frame, [60, 85], [0, 1], { extrapolateRight: "clamp" });

  // Right side — phones
  const landingPhoneOpacity = interpolate(frame, [30, 60], [0, 1], { extrapolateRight: "clamp" });
  const landingPhoneX = interpolate(frame, [30, 65], [80, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  const recordPhoneOpacity = interpolate(frame, [70, 100], [0, 1], { extrapolateRight: "clamp" });
  const recordPhoneX = interpolate(frame, [70, 105], [-60, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  // Expanding rings (behind everything)
  const ring1Scale = interpolate(frame, [0, 60], [0.5, 3.5], { extrapolateRight: "clamp" });
  const ring1Alpha = interpolate(frame, [0, 35, 60], [0.3, 0.08, 0], { extrapolateRight: "clamp" });
  const ring2Scale = interpolate(frame, [15, 75], [0.5, 3.5], { extrapolateRight: "clamp" });
  const ring2Alpha = interpolate(frame, [15, 50, 75], [0.25, 0.06, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: APP_BG, overflow: "hidden" }}>
      {/* Background glow matching the app's teal-dark gradient */}
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 30% 50%, rgba(13,148,136,${orbGlow * 0.08}) 0%, transparent 50%), radial-gradient(ellipse at 70% 40%, rgba(139,92,246,0.04) 0%, transparent 50%)` }} />

      {/* Expanding rings */}
      {[
        { scale: ring1Scale, alpha: ring1Alpha },
        { scale: ring2Scale, alpha: ring2Alpha },
      ].map((ring, i) => (
        <div key={i} style={{ position: "absolute", top: "50%", left: "30%", transform: `translate(-50%, -50%) scale(${ring.scale})`, width: 100, height: 100, borderRadius: "50%", border: `1.5px solid rgba(13,148,136,${ring.alpha})` }} />
      ))}

      {/* Floating particles */}
      {[...Array(10)].map((_, i) => {
        const speed = 0.012 + (i % 3) * 0.004;
        const x = Math.sin(frame * speed + i * 1.2) * 300 + 400;
        const y = Math.cos(frame * speed * 0.7 + i * 0.9) * 250 + 540;
        const size = 3 + (i % 3) * 2;
        const alpha = 0.08 + Math.sin(frame * 0.08 + i) * 0.06;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: "50%", background: `rgba(13,148,136,${alpha})`, boxShadow: `0 0 ${size * 3}px rgba(13,148,136,0.2)` }} />;
      })}

      {/* Top accent */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${TEAL}, ${TEAL_LIGHT}, ${TEAL})` }} />

      <div style={{ display: "flex", height: "100%", padding: "40px 70px", alignItems: "center" }}>
        {/* Left — Logo + Branding */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center" }}>
          {/* Logo icon */}
          <div style={{ opacity: logoOpacity, transform: `scale(${Math.max(0, logoScale)})`, marginBottom: 28 }}>
            <div style={{ width: 80, height: 80, borderRadius: 22, overflow: "hidden", boxShadow: `0 12px 40px rgba(13,148,136,${orbGlow * 0.4})` }}>
              <Img src={staticFile("palmcare-logo.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </div>

          {/* Brand name — matching the app's "PALM IT." style */}
          <div style={{ opacity: nameOpacity, transform: `translateY(${nameY}px)`, marginBottom: 8 }}>
            <h1 style={{ fontSize: 72, fontWeight: 900, color: TEXT_WHITE, margin: 0, lineHeight: 1, letterSpacing: -2, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              PALM
            </h1>
            <h1 style={{ fontSize: 72, fontWeight: 900, margin: 0, lineHeight: 1, letterSpacing: -2, fontStyle: "italic", background: `linear-gradient(135deg, ${TEAL_LIGHT}, #5eead4)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              IT.
            </h1>
          </div>

          {/* Tagline */}
          <div style={{ opacity: taglineOpacity, marginBottom: 12 }}>
            <p style={{ fontSize: 20, fontWeight: 600, color: TEXT_WHITE, margin: 0, letterSpacing: 0.5, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              Record. Transcribe. Contract.
            </p>
            <p style={{ fontSize: 16, color: TEXT_MUTED, margin: "8px 0 0", lineHeight: 1.5, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              Every care assessment — handled in seconds.
              <br />
              Your clients get proposals. You get your time back.
            </p>
          </div>

          {/* Feature pills — matching the app's bottom pills */}
          <div style={{ display: "flex", gap: 10, marginTop: 20, opacity: pillsOpacity }}>
            {["Live Transcription", "Speaker ID", "Auto Contract"].map((pill, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 20, padding: "8px 16px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12 }}>{["🎙️", "👥", "📋"][i]}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontWeight: 500 }}>{pill}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Real app screenshots */}
        <div style={{ flex: 0.85, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", height: "100%" }}>
          {/* Landing page (back, right) */}
          <div style={{ position: "absolute", right: 0, opacity: landingPhoneOpacity, transform: `translateX(${landingPhoneX}px)`, zIndex: 1 }}>
            <PhoneFrame src="app-landing.png" height={660} glowColor={TEAL} glowIntensity={0.12} />
          </div>

          {/* Record screen (front, left-overlapping) */}
          <div style={{ position: "absolute", right: 180, opacity: recordPhoneOpacity, transform: `translateX(${recordPhoneX}px)`, zIndex: 2 }}>
            <PhoneFrame src="app-record.png" height={660} glowColor={TEAL} glowIntensity={0.18} />
          </div>
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
  const nameY = interpolate(frame, [20, 45], [20, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const tagline1Opacity = interpolate(frame, [60, 85], [0, 1], { extrapolateRight: "clamp" });
  const tagline1Y = interpolate(frame, [60, 85], [20, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const palmItOpacity = interpolate(frame, [120, 150], [0, 1], { extrapolateRight: "clamp" });
  const palmItScale = spring({ frame: frame - 120, fps, config: { damping: 10, stiffness: 120 } });
  const qrOpacity = interpolate(frame, [170, 200], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: APP_BG, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 40%, rgba(13,148,136,${glowPulse * 0.1}) 0%, transparent 55%), radial-gradient(ellipse at 50% 60%, rgba(139,92,246,0.04) 0%, transparent 40%)` }} />

      {[...Array(8)].map((_, i) => {
        const speed = 0.012 + (i % 3) * 0.004;
        const x = Math.sin(frame * speed + i * 1.3) * 400 + 960;
        const y = Math.cos(frame * speed * 0.7 + i * 0.9) * 300 + 540;
        const size = 3 + (i % 4) * 2;
        const alpha = 0.1 + Math.sin(frame * 0.08 + i) * 0.06;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: "50%", background: `rgba(13,148,136,${alpha})`, boxShadow: `0 0 ${size * 3}px rgba(13,148,136,0.2)` }} />;
      })}

      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${TEAL}, ${TEAL_LIGHT}, ${TEAL})` }} />

      <Sequence from={15} durationInFrames={30}><Audio src={staticFile("segments-palmcare/07-brand.mp3")} /></Sequence>
      <Sequence from={55} durationInFrames={80}><Audio src={staticFile("segments-palmcare/08-tagline.mp3")} /></Sequence>
      <Sequence from={135} durationInFrames={25}><Audio src={staticFile("segments-palmcare/09-palmit.mp3")} /></Sequence>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
        {/* Logo */}
        <div style={{ transform: `scale(${Math.max(0, logoScale)})`, marginBottom: 28 }}>
          <div style={{ width: 110, height: 110, borderRadius: 28, overflow: "hidden", boxShadow: `0 20px 60px rgba(13,148,136,${glowPulse * 0.4})` }}>
            <Img src={staticFile("palmcare-logo.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>

        {/* PalmCare AI */}
        <div style={{ opacity: nameOpacity, transform: `translateY(${nameY}px)`, marginBottom: 12 }}>
          <h1 style={{ fontSize: 64, fontWeight: 800, color: TEXT_WHITE, margin: 0, textAlign: "center", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            PalmCare{" "}
            <span style={{ background: `linear-gradient(135deg, ${TEAL_LIGHT}, #5eead4)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>
          </h1>
        </div>

        {/* AI-POWERED badge */}
        <div style={{ opacity: nameOpacity, marginBottom: 40 }}>
          <div style={{ border: `1px solid ${TEAL}60`, borderRadius: 20, padding: "6px 16px" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: TEAL_LIGHT, letterSpacing: 2 }}>AI-POWERED</span>
          </div>
        </div>

        {/* Tagline */}
        <div style={{ opacity: tagline1Opacity, transform: `translateY(${tagline1Y}px)`, marginBottom: 20 }}>
          <p style={{ fontSize: 28, fontWeight: 500, color: TEXT_MUTED, margin: 0, letterSpacing: 0.5, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
            Record it. Transcribe it. Contract it.
          </p>
        </div>

        <div style={{ width: 60, height: 2, background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)`, marginBottom: 28, opacity: tagline1Opacity }} />

        {/* PALM IT. */}
        <div style={{ opacity: palmItOpacity, transform: `scale(${Math.max(0, palmItScale)})`, marginBottom: 44 }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: 64, fontWeight: 900, color: TEXT_WHITE, letterSpacing: -2, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>PALM </span>
            <span style={{ fontSize: 64, fontWeight: 900, fontStyle: "italic", letterSpacing: -2, background: `linear-gradient(135deg, ${TEAL_LIGHT}, #5eead4)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>IT.</span>
          </div>
        </div>

        {/* QR Code */}
        <div style={{ opacity: qrOpacity }}>
          <div style={{ background: "white", borderRadius: 16, padding: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
            <Img src={staticFile("palmcare-qr.png")} style={{ width: 90, height: 90 }} />
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
