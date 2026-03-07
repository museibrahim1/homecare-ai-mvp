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

// ================================================================
// PALMCARE AI — PRODUCT AD V2 (seamless cut)
//
// Fixes: overlapping transitions, tighter pacing, persistent
// branding, no dead frames, audio locked to visuals.
//
// Overlap: 20 frames between every scene (smooth cross-dissolve)
// Total: ~40s = 1200 frames @ 30fps
// ================================================================

const FPS = 30;
const OVL = 20; // overlap frames between scenes

const BG = "#050a0a";
const TEAL = "#0d9488";
const TEAL_L = "#14b8a6";
const TEAL_X = "#5eead4";
const W = "#ffffff";
const MUTED = "#94a3b8";
const F = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';

// Scene durations (in frames, before overlap)
const DURS = {
  sunrise:   130,  // 4.3s
  walkIn:    130,  // 4.3s
  greeting:  140,  // 4.7s
  recording: 180,  // 6.0s
  aiProcess: 160,  // 5.3s
  contract:  170,  // 5.7s
  emotion:   130,  // 4.3s
  hero:      220,  // 7.3s
};

// Build timeline with overlaps
function buildTimeline(durs: Record<string, number>, overlap: number) {
  const entries = Object.entries(durs);
  const result: Record<string, { from: number; dur: number }> = {};
  let pos = 0;
  for (const [key, dur] of entries) {
    result[key] = { from: pos, dur };
    pos += dur - overlap;
  }
  return { scenes: result, total: pos + overlap };
}

const { scenes: T, total: TOTAL } = buildTimeline(DURS, OVL);

// ================================================================
// PRIMITIVES
// ================================================================

const Vig: React.FC<{ i?: number }> = ({ i = 0.5 }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${i}) 100%)`, pointerEvents: "none" }} />
);

const BtmGrad: React.FC<{ h?: string; o?: number }> = ({ h = "50%", o = 0.9 }) => (
  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: h, background: `linear-gradient(to top, rgba(0,0,0,${o}) 0%, rgba(0,0,0,${o * 0.3}) 60%, transparent 100%)`, pointerEvents: "none" }} />
);

const TopLine: React.FC = () => (
  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent 5%, ${TEAL} 30%, ${TEAL_L} 50%, ${TEAL} 70%, transparent 95%)`, zIndex: 10 }} />
);

const LogoBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 10], [0, 0.9], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 32, left: 36, display: "flex", alignItems: "center", gap: 10, opacity: op, zIndex: 5 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
        <Img src={staticFile("palmcare-logo.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.75)", letterSpacing: 1.2, textShadow: "0 2px 8px rgba(0,0,0,0.6)", fontFamily: F }}>PALMCARE AI</span>
    </div>
  );
};

// Caption with faster entrance
const Cap: React.FC<{
  text: string; delay?: number; size?: number; color?: string;
  weight?: number; maxW?: number; align?: string;
}> = ({ text, delay = 0, size = 44, color = W, weight = 600, maxW = 840, align = "center" }) => {
  const frame = useCurrentFrame();
  const lf = frame - delay;
  const op = interpolate(lf, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(lf, [0, 12], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  if (lf < 0) return null;
  return (
    <div style={{ opacity: op, transform: `translateY(${y}px)`, textAlign: align as any, maxWidth: maxW }}>
      <p style={{ fontSize: size, fontWeight: weight, color, lineHeight: 1.3, margin: 0, fontFamily: F, textShadow: "0 3px 20px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.6)" }}>{text}</p>
    </div>
  );
};

// Phone with app recording
const PhoneVideo: React.FC<{ videoStartSec: number; height?: number; glow?: number }> = ({ videoStartSec, height = 560, glow = 0.2 }) => {
  const w = Math.round(height * (870 / 1800));
  return (
    <div style={{ width: w, height, borderRadius: 34, overflow: "hidden", border: "3px solid rgba(255,255,255,0.1)", boxShadow: `0 25px 70px rgba(0,0,0,0.7), 0 0 45px rgba(13,148,136,${glow})`, flexShrink: 0 }}>
      <OffthreadVideo src={staticFile("clip4-app-flow.mp4")} startFrom={Math.round(videoStartSec * FPS)} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};

// Seamless cross-dissolve: fade in at start, fade out at end
const Dissolve: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const fi = interpolate(frame, [0, OVL], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fo = interpolate(frame, [d - OVL, d], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: Math.min(fi, fo) }}>{children}</AbsoluteFill>;
};

// Progress bar across entire video
const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const progress = frame / durationInFrames;
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, width: `${progress * 100}%`, background: `linear-gradient(90deg, ${TEAL}, ${TEAL_L})`, boxShadow: `0 0 12px ${TEAL}`, zIndex: 20 }} />
  );
};

// ================================================================
// SCENES — captions start immediately, no wasted frames
// ================================================================

const SceneSunrise: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <OffthreadVideo src={staticFile("kling-product-ad/01_sunrise_home.mp4")} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    <Vig i={0.4} />
    <BtmGrad h="50%" o={0.85} />
    <div style={{ position: "absolute", bottom: 80, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <Cap text={`"Every morning, someone's mother needs care."`} delay={8} size={42} weight={500} />
    </div>
  </AbsoluteFill>
);

const SceneWalkIn: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <OffthreadVideo src={staticFile("kling-product-ad/02_nurse_walks_in.mp4")} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    <Vig i={0.45} />
    <BtmGrad h="50%" o={0.88} />
    <LogoBadge />
    <div style={{ position: "absolute", bottom: 70, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <Cap text="And every evening, a caregiver drowns in paperwork." delay={5} size={38} color={MUTED} weight={500} />
    </div>
  </AbsoluteFill>
);

const SceneGreeting: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <OffthreadVideo src={staticFile("kling-product-ad/03_greeting_client.mp4")} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    <Vig i={0.4} />
    <BtmGrad h="45%" o={0.88} />
    <LogoBadge />
    <div style={{ position: "absolute", bottom: 70, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <Cap text="What if you could just... talk?" delay={10} size={52} color={TEAL_X} weight={700} />
    </div>
  </AbsoluteFill>
);

const SceneRecording: React.FC = () => {
  const frame = useCurrentFrame();
  const phoneOp = interpolate(frame, [15, 30], [0, 1], { extrapolateRight: "clamp" });
  const phoneSc = interpolate(frame, [15, 35], [0.88, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo src={staticFile("kling-product-ad/04_recording_assessment.mp4")} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <Vig i={0.5} />
      <BtmGrad h="50%" o={0.9} />
      <LogoBadge />
      <div style={{ position: "absolute", right: 60, top: "50%", transform: `translateY(-50%) scale(${phoneSc})`, opacity: phoneOp }}>
        <PhoneVideo videoStartSec={17} height={500} glow={0.25} />
      </div>
      <div style={{ position: "absolute", bottom: 55, left: 60, maxWidth: 650 }}>
        <Cap text="PalmCare AI records your assessment." delay={5} size={38} weight={600} align="left" />
        <div style={{ marginTop: 8 }}>
          <Cap text="Every word. Every speaker. Every detail." delay={60} size={32} color={MUTED} weight={500} align="left" />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneAiProcess: React.FC = () => {
  const frame = useCurrentFrame();
  const phoneOp = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const phoneY = interpolate(frame, [0, 22], [30, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const scanLine = interpolate(frame, [0, 160], [0, 100], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 50%, rgba(13,148,136,0.1) 0%, transparent 55%)` }} />
      <div style={{ position: "absolute", top: `${scanLine}%`, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${TEAL}, ${TEAL_L}, ${TEAL}, transparent)`, boxShadow: `0 0 20px ${TEAL}`, opacity: 0.6 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 50 }}>
        <div style={{ opacity: phoneOp, transform: `translateY(${phoneY}px)` }}>
          <PhoneVideo videoStartSec={22} height={580} glow={0.3} />
        </div>
        <div style={{ maxWidth: 480 }}>
          <Cap text="AI transforms your conversation" delay={8} size={40} weight={700} align="left" maxW={480} />
          <div style={{ marginTop: 10 }}>
            <Cap text="into a complete service agreement." delay={35} size={40} color={TEAL_L} weight={700} align="left" maxW={480} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const SceneContract: React.FC = () => {
  const frame = useCurrentFrame();
  const phoneOp = interpolate(frame, [5, 22], [0, 1], { extrapolateRight: "clamp" });
  const phoneX = interpolate(frame, [5, 25], [-60, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo src={staticFile("kling-product-ad/06_showing_contract.mp4")} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <Vig i={0.5} />
      <BtmGrad h="50%" o={0.9} />
      <LogoBadge />
      <div style={{ position: "absolute", left: 60, top: "50%", transform: `translateY(-50%) translateX(${phoneX}px)`, opacity: phoneOp }}>
        <PhoneVideo videoStartSec={33} height={500} glow={0.2} />
      </div>
      <div style={{ position: "absolute", bottom: 55, right: 60, maxWidth: 600 }}>
        <Cap text="Pricing. Care plan. Ready to sign." delay={8} size={42} weight={700} align="right" maxW={600} />
      </div>
    </AbsoluteFill>
  );
};

const SceneEmotion: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo src={staticFile("kling-product-ad/07_family_relief.mp4")} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <Vig i={0.3} />
      <BtmGrad h="40%" o={0.82} />
      <div style={{ position: "absolute", bottom: 70, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <Cap text="So you can focus on what matters." delay={5} size={44} weight={600} />
        {frame >= 45 && <Cap text="Care." delay={45} size={58} color={TEAL_X} weight={800} />}
      </div>
    </AbsoluteFill>
  );
};

const SceneHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const klingOp = interpolate(frame, [0, 80], [1, 0], { extrapolateRight: "clamp" });
  const brandOp = interpolate(frame, [60, 85], [0, 1], { extrapolateRight: "clamp" });
  const logoSc = spring({ frame: Math.max(0, frame - 65), fps, config: { damping: 14, stiffness: 80 } });
  const nameOp = interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" });
  const palmOp = interpolate(frame, [115, 135], [0, 1], { extrapolateRight: "clamp" });
  const palmSc = spring({ frame: Math.max(0, frame - 115), fps, config: { damping: 10, stiffness: 120 } });
  const qrOp = interpolate(frame, [150, 170], [0, 1], { extrapolateRight: "clamp" });
  const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <div style={{ opacity: klingOp, position: "absolute", inset: 0 }}>
        <OffthreadVideo src={staticFile("kling-product-ad/08_palm_it_hero.mp4")} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <Vig i={0.5} />

      <div style={{ opacity: brandOp, position: "absolute", inset: 0, background: BG }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 40%, rgba(13,148,136,${pulse * 0.1}) 0%, transparent 55%)`, opacity: brandOp }} />

      {brandOp > 0 && [...Array(10)].map((_, i) => {
        const speed = 0.01 + (i % 4) * 0.003;
        const x = Math.sin(frame * speed + i * 1.3) * 400 + 960;
        const y = Math.cos(frame * speed * 0.7 + i * 0.8) * 300 + 540;
        const sz = 2 + (i % 3) * 2;
        const a = (0.06 + Math.sin(frame * 0.07 + i) * 0.04) * brandOp;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: sz, height: sz, borderRadius: "50%", background: `rgba(13,148,136,${a})` }} />;
      })}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: brandOp }}>
        <div style={{ transform: `scale(${Math.max(0, logoSc)})`, marginBottom: 20 }}>
          <div style={{ width: 96, height: 96, borderRadius: 24, overflow: "hidden", boxShadow: `0 20px 60px rgba(13,148,136,${pulse * 0.4})` }}>
            <Img src={staticFile("palmcare-logo.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>
        <div style={{ opacity: nameOp, marginBottom: 6 }}>
          <h1 style={{ fontSize: 54, fontWeight: 800, color: W, margin: 0, fontFamily: F }}>
            PalmCare <span style={{ background: `linear-gradient(135deg, ${TEAL_L}, ${TEAL_X})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>
          </h1>
        </div>
        <div style={{ opacity: nameOp, marginBottom: 32 }}>
          <p style={{ fontSize: 20, fontWeight: 500, color: MUTED, margin: 0, fontFamily: F }}>Where care meets intelligence</p>
        </div>
        <div style={{ opacity: palmOp, transform: `scale(${Math.max(0, palmSc)})`, marginBottom: 36 }}>
          <span style={{ fontSize: 64, fontWeight: 900, color: W, letterSpacing: -2, fontFamily: F }}>PALM </span>
          <span style={{ fontSize: 64, fontWeight: 900, fontStyle: "italic", letterSpacing: -2, fontFamily: F, background: `linear-gradient(135deg, ${TEAL_L}, ${TEAL_X})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>IT.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: qrOp }}>
          <div style={{ background: "white", borderRadius: 14, padding: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
            <Img src={staticFile("palmcare-qr.png")} style={{ width: 76, height: 76 }} />
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 600, color: TEAL_L, margin: 0, fontFamily: F }}>palmcareai.com</p>
            <p style={{ fontSize: 13, color: MUTED, margin: "3px 0 0", fontFamily: F }}>Start your free trial</p>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ================================================================
// MAIN — overlapping sequences for seamless flow
// ================================================================

export const ProductAd: React.FC<{ showAudio?: boolean }> = ({ showAudio = false }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* Persistent top accent */}
      <TopLine />

      {/* Scenes with overlapping dissolves */}
      <Sequence from={T.sunrise.from} durationInFrames={T.sunrise.dur}>
        <Dissolve><SceneSunrise /></Dissolve>
      </Sequence>
      <Sequence from={T.walkIn.from} durationInFrames={T.walkIn.dur}>
        <Dissolve><SceneWalkIn /></Dissolve>
      </Sequence>
      <Sequence from={T.greeting.from} durationInFrames={T.greeting.dur}>
        <Dissolve><SceneGreeting /></Dissolve>
      </Sequence>
      <Sequence from={T.recording.from} durationInFrames={T.recording.dur}>
        <Dissolve><SceneRecording /></Dissolve>
      </Sequence>
      <Sequence from={T.aiProcess.from} durationInFrames={T.aiProcess.dur}>
        <Dissolve><SceneAiProcess /></Dissolve>
      </Sequence>
      <Sequence from={T.contract.from} durationInFrames={T.contract.dur}>
        <Dissolve><SceneContract /></Dissolve>
      </Sequence>
      <Sequence from={T.emotion.from} durationInFrames={T.emotion.dur}>
        <Dissolve><SceneEmotion /></Dissolve>
      </Sequence>
      <Sequence from={T.hero.from} durationInFrames={T.hero.dur}>
        <Dissolve><SceneHero /></Dissolve>
      </Sequence>

      {/* Persistent progress bar */}
      <ProgressBar />

      {/* Audio — locked tightly to scene starts */}
      {showAudio && (
        <>
          <Sequence from={T.sunrise.from + 5} durationInFrames={90}>
            <Audio src={staticFile("segments-product-ad/01-open.mp3")} />
          </Sequence>
          <Sequence from={T.walkIn.from + 3} durationInFrames={120}>
            <Audio src={staticFile("segments-product-ad/02-problem.mp3")} />
          </Sequence>
          <Sequence from={T.greeting.from + 8} durationInFrames={90}>
            <Audio src={staticFile("segments-product-ad/03-enter.mp3")} />
          </Sequence>
          <Sequence from={T.recording.from + 3} durationInFrames={170}>
            <Audio src={staticFile("segments-product-ad/04-record.mp3")} />
          </Sequence>
          <Sequence from={T.aiProcess.from + 5} durationInFrames={150}>
            <Audio src={staticFile("segments-product-ad/05-transform.mp3")} />
          </Sequence>
          <Sequence from={T.emotion.from + 3} durationInFrames={80}>
            <Audio src={staticFile("segments-product-ad/06-emotion.mp3")} />
          </Sequence>
          <Sequence from={T.emotion.from + 42} durationInFrames={40}>
            <Audio src={staticFile("segments-product-ad/07-care.mp3")} />
          </Sequence>
          <Sequence from={T.hero.from + 85} durationInFrames={90}>
            <Audio src={staticFile("segments-product-ad/08-tagline.mp3")} />
          </Sequence>
        </>
      )}
    </AbsoluteFill>
  );
};
