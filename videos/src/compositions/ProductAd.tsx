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
// PALMCARE AI — PRODUCT AD (Kling-powered)
//
// A cinematic product commercial built entirely from AI-generated
// footage (Kling V3 Pro) intercut with real app recording.
//
// Structure:
//   ACT 1 — THE PROBLEM   (0-10s)
//     Scene 1: Sunrise / home exterior          0-5s
//     Scene 2: Nurse walks in + problem text    5-10s
//   ACT 2 — THE SOLUTION  (10-26s)
//     Scene 3: Greeting + "just talk"          10-15s
//     Scene 4: Recording assessment + phone    15-21s
//     Scene 5: AI processing + phone UI        21-26s
//   ACT 3 — THE RESULT    (26-36s)
//     Scene 6: Showing contract               26-32s
//     Scene 7: Family relief + emotion        32-36s
//   CLOSE — BRAND          (36-44s)
//     Scene 8: Hero shot + PALM IT            36-44s
//
// Total: 44s = 1320 frames @ 30fps
// ================================================================

const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);

const T = {
  sunrise:    { from: 0,       dur: s(5) },
  walkIn:     { from: s(5),    dur: s(5) },
  greeting:   { from: s(10),   dur: s(5) },
  recording:  { from: s(15),   dur: s(6) },
  aiProcess:  { from: s(21),   dur: s(5) },
  contract:   { from: s(26),   dur: s(6) },
  emotion:    { from: s(32),   dur: s(4) },
  hero:       { from: s(36),   dur: s(8) },
  total: s(44),
};

const BG = "#050a0a";
const TEAL = "#0d9488";
const TEAL_L = "#14b8a6";
const TEAL_X = "#5eead4";
const W = "#ffffff";
const MUTED = "#94a3b8";
const F = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';

// ================================================================
// PRIMITIVES
// ================================================================

const Vig: React.FC<{ i?: number }> = ({ i = 0.55 }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,${i}) 100%)`, pointerEvents: "none" }} />
);

const BtmGrad: React.FC<{ h?: string; o?: number }> = ({ h = "55%", o = 0.92 }) => (
  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: h, background: `linear-gradient(to top, rgba(0,0,0,${o}) 0%, rgba(0,0,0,${o * 0.35}) 60%, transparent 100%)`, pointerEvents: "none" }} />
);

const TopLine: React.FC = () => (
  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent 5%, ${TEAL} 30%, ${TEAL_L} 50%, ${TEAL} 70%, transparent 95%)` }} />
);

const LogoBadge: React.FC<{ op: number }> = ({ op }) => (
  <div style={{ position: "absolute", top: 32, left: 36, display: "flex", alignItems: "center", gap: 10, opacity: op }}>
    <div style={{ width: 32, height: 32, borderRadius: 9, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
      <Img src={staticFile("palmcare-logo.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
    <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.75)", letterSpacing: 1.2, textShadow: "0 2px 8px rgba(0,0,0,0.6)", fontFamily: F }}>PALMCARE AI</span>
  </div>
);

const Caption: React.FC<{
  text: string; start: number; size?: number; color?: string;
  weight?: number; maxW?: number; align?: string;
}> = ({ text, start, size = 44, color = W, weight = 600, maxW = 840, align = "center" }) => {
  const frame = useCurrentFrame();
  const lf = frame - start;
  const op = interpolate(lf, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(lf, [0, 18], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  if (lf < -2) return null;
  return (
    <div style={{ opacity: op, transform: `translateY(${y}px)`, textAlign: align as any, maxWidth: maxW }}>
      <p style={{ fontSize: size, fontWeight: weight, color, lineHeight: 1.3, margin: 0, fontFamily: F, textShadow: "0 4px 24px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.6)" }}>{text}</p>
    </div>
  );
};

const PhoneVideo: React.FC<{ videoStartSec: number; height?: number; glow?: number }> = ({ videoStartSec, height = 580, glow = 0.2 }) => {
  const w = Math.round(height * (870 / 1800));
  return (
    <div style={{ width: w, height, borderRadius: 36, overflow: "hidden", border: "3px solid rgba(255,255,255,0.1)", boxShadow: `0 30px 80px rgba(0,0,0,0.7), 0 0 50px rgba(13,148,136,${glow})`, flexShrink: 0 }}>
      <OffthreadVideo src={staticFile("clip4-app-flow.mp4")} startFrom={Math.round(videoStartSec * FPS)} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};

const Xfade: React.FC<{ children: React.ReactNode; dur?: number }> = ({ children, dur = 12 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const fi = interpolate(frame, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fo = interpolate(frame, [d - dur, d], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: Math.min(fi, fo) }}>{children}</AbsoluteFill>;
};

const KlingClip: React.FC<{ src: string; fadeIn?: number }> = ({ src, fadeIn = 18 }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, fadeIn], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ opacity: op, position: "absolute", inset: 0 }}>
      <OffthreadVideo src={staticFile(src)} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};

// ================================================================
// SCENES
// ================================================================

const SceneSunrise: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <KlingClip src="kling-product-ad/01_sunrise_home.mp4" />
      <Vig i={0.4} />
      <BtmGrad h="50%" o={0.85} />
      <TopLine />
      <div style={{ position: "absolute", bottom: 80, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {frame >= 15 && <Caption text={`"Every morning, someone's mother needs care."`} start={15} size={42} weight={500} />}
      </div>
    </AbsoluteFill>
  );
};

const SceneWalkIn: React.FC = () => {
  const frame = useCurrentFrame();
  const logoOp = interpolate(frame, [10, 25], [0, 0.9], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <KlingClip src="kling-product-ad/02_nurse_walks_in.mp4" />
      <Vig i={0.45} />
      <BtmGrad h="50%" o={0.88} />
      <LogoBadge op={logoOp} />
      <div style={{ position: "absolute", bottom: 70, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {frame >= 10 && <Caption text="And every evening, a caregiver drowns in paperwork." start={10} size={38} color={MUTED} weight={500} />}
      </div>
    </AbsoluteFill>
  );
};

const SceneGreeting: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <KlingClip src="kling-product-ad/03_greeting_client.mp4" />
      <Vig i={0.4} />
      <BtmGrad h="45%" o={0.88} />
      <LogoBadge op={interpolate(frame, [5, 15], [0, 0.9], { extrapolateRight: "clamp" })} />
      <div style={{ position: "absolute", bottom: 70, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {frame >= 20 && <Caption text="What if you could just... talk?" start={20} size={50} color={TEAL_X} weight={700} />}
      </div>
    </AbsoluteFill>
  );
};

const SceneRecording: React.FC = () => {
  const frame = useCurrentFrame();
  const phoneOp = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: "clamp" });
  const phoneSc = interpolate(frame, [25, 50], [0.85, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <KlingClip src="kling-product-ad/04_recording_assessment.mp4" />
      <Vig i={0.5} />
      <BtmGrad h="50%" o={0.9} />
      <LogoBadge op={interpolate(frame, [5, 15], [0, 0.9], { extrapolateRight: "clamp" })} />

      {/* Phone overlay with live recording screen */}
      <div style={{ position: "absolute", right: 60, top: "50%", transform: `translateY(-50%) scale(${phoneSc})`, opacity: phoneOp }}>
        <PhoneVideo videoStartSec={17} height={520} glow={0.25} />
      </div>

      <div style={{ position: "absolute", bottom: 60, left: 60, maxWidth: 650 }}>
        {frame >= 8 && frame < 80 && <Caption text="PalmCare AI records your assessment." start={8} size={38} weight={600} align="left" />}
        {frame >= 75 && <Caption text="Every word. Every speaker. Every detail." start={80} size={34} color={MUTED} weight={500} align="left" />}
      </div>
    </AbsoluteFill>
  );
};

const SceneAiProcess: React.FC = () => {
  const frame = useCurrentFrame();
  const phoneOp = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });
  const phoneY = interpolate(frame, [5, 30], [40, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  const scanLine = interpolate(frame, [0, 150], [0, 100], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 50%, rgba(13,148,136,0.1) 0%, transparent 55%)` }} />

      {/* Scanning line effect */}
      <div style={{ position: "absolute", top: `${scanLine}%`, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${TEAL}, ${TEAL_L}, ${TEAL}, transparent)`, boxShadow: `0 0 20px ${TEAL}`, opacity: 0.6 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 60 }}>
        {/* Phone with transcript */}
        <div style={{ opacity: phoneOp, transform: `translateY(${phoneY}px)` }}>
          <PhoneVideo videoStartSec={22} height={600} glow={0.3} />
        </div>

        {/* Text */}
        <div style={{ maxWidth: 500 }}>
          {frame >= 15 && <Caption text="AI transforms your conversation" start={15} size={40} weight={700} align="left" maxW={500} />}
          <div style={{ marginTop: 12 }}>
            {frame >= 45 && <Caption text="into a complete service agreement." start={45} size={40} color={TEAL_L} weight={700} align="left" maxW={500} />}
          </div>
        </div>
      </div>

      <TopLine />
    </AbsoluteFill>
  );
};

const SceneContract: React.FC = () => {
  const frame = useCurrentFrame();
  const phoneOp = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });
  const phoneX = interpolate(frame, [10, 35], [-80, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <KlingClip src="kling-product-ad/06_showing_contract.mp4" />
      <Vig i={0.5} />
      <BtmGrad h="50%" o={0.9} />
      <LogoBadge op={interpolate(frame, [5, 15], [0, 0.9], { extrapolateRight: "clamp" })} />

      {/* Phone with contract view */}
      <div style={{ position: "absolute", left: 60, top: "50%", transform: `translateY(-50%) translateX(${phoneX}px)`, opacity: phoneOp }}>
        <PhoneVideo videoStartSec={33} height={520} glow={0.2} />
      </div>

      <div style={{ position: "absolute", bottom: 60, right: 60, maxWidth: 600 }}>
        {frame >= 15 && <Caption text="Pricing. Care plan. Ready to sign." start={15} size={40} weight={700} align="right" maxW={600} />}
      </div>
    </AbsoluteFill>
  );
};

const SceneEmotion: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <KlingClip src="kling-product-ad/07_family_relief.mp4" fadeIn={12} />
      <Vig i={0.35} />
      <BtmGrad h="40%" o={0.85} />
      <div style={{ position: "absolute", bottom: 70, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {frame >= 10 && <Caption text="So you can focus on what matters." start={10} size={44} weight={600} />}
        {frame >= 55 && <Caption text="Care." start={55} size={56} color={TEAL_X} weight={800} />}
      </div>
    </AbsoluteFill>
  );
};

const SceneHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const klingOp = interpolate(frame, [0, 90], [1, 0], { extrapolateRight: "clamp" });
  const brandOp = interpolate(frame, [70, 95], [0, 1], { extrapolateRight: "clamp" });
  const logoSc = spring({ frame: Math.max(0, frame - 75), fps, config: { damping: 14, stiffness: 80 } });
  const nameOp = interpolate(frame, [90, 110], [0, 1], { extrapolateRight: "clamp" });
  const palmOp = interpolate(frame, [130, 150], [0, 1], { extrapolateRight: "clamp" });
  const palmSc = spring({ frame: Math.max(0, frame - 130), fps, config: { damping: 10, stiffness: 120 } });
  const qrOp = interpolate(frame, [165, 185], [0, 1], { extrapolateRight: "clamp" });
  const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      {/* Kling hero shot fading out */}
      <div style={{ opacity: klingOp, position: "absolute", inset: 0 }}>
        <OffthreadVideo src={staticFile("kling-product-ad/08_palm_it_hero.mp4")} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <Vig i={0.5} />

      {/* Brand close fading in */}
      <div style={{ opacity: brandOp, position: "absolute", inset: 0, background: BG }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 40%, rgba(13,148,136,${pulse * 0.1}) 0%, transparent 55%)`, opacity: brandOp }} />

      {/* Particles */}
      {brandOp > 0 && [...Array(10)].map((_, i) => {
        const speed = 0.01 + (i % 4) * 0.003;
        const x = Math.sin(frame * speed + i * 1.3) * 400 + 960;
        const y = Math.cos(frame * speed * 0.7 + i * 0.8) * 300 + 540;
        const sz = 2 + (i % 3) * 2;
        const a = (0.06 + Math.sin(frame * 0.07 + i) * 0.04) * brandOp;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: sz, height: sz, borderRadius: "50%", background: `rgba(13,148,136,${a})` }} />;
      })}

      <TopLine />

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", opacity: brandOp }}>
        {/* Logo */}
        <div style={{ transform: `scale(${Math.max(0, logoSc)})`, marginBottom: 20 }}>
          <div style={{ width: 96, height: 96, borderRadius: 24, overflow: "hidden", boxShadow: `0 20px 60px rgba(13,148,136,${pulse * 0.4})` }}>
            <Img src={staticFile("palmcare-logo.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>

        {/* Name */}
        <div style={{ opacity: nameOp, marginBottom: 6 }}>
          <h1 style={{ fontSize: 54, fontWeight: 800, color: W, margin: 0, fontFamily: F }}>
            PalmCare <span style={{ background: `linear-gradient(135deg, ${TEAL_L}, ${TEAL_X})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>
          </h1>
        </div>

        <div style={{ opacity: nameOp, marginBottom: 32 }}>
          <p style={{ fontSize: 20, fontWeight: 500, color: MUTED, margin: 0, fontFamily: F }}>Where care meets intelligence</p>
        </div>

        {/* PALM IT */}
        <div style={{ opacity: palmOp, transform: `scale(${Math.max(0, palmSc)})`, marginBottom: 36 }}>
          <span style={{ fontSize: 64, fontWeight: 900, color: W, letterSpacing: -2, fontFamily: F }}>PALM </span>
          <span style={{ fontSize: 64, fontWeight: 900, fontStyle: "italic", letterSpacing: -2, fontFamily: F, background: `linear-gradient(135deg, ${TEAL_L}, ${TEAL_X})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>IT.</span>
        </div>

        {/* QR + URL */}
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
// MAIN COMPOSITION
// ================================================================

export const ProductAd: React.FC<{ showAudio?: boolean }> = ({ showAudio = false }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Sequence from={T.sunrise.from} durationInFrames={T.sunrise.dur + 12}>
        <Xfade><SceneSunrise /></Xfade>
      </Sequence>
      <Sequence from={T.walkIn.from} durationInFrames={T.walkIn.dur + 12}>
        <Xfade><SceneWalkIn /></Xfade>
      </Sequence>
      <Sequence from={T.greeting.from} durationInFrames={T.greeting.dur + 12}>
        <Xfade><SceneGreeting /></Xfade>
      </Sequence>
      <Sequence from={T.recording.from} durationInFrames={T.recording.dur + 12}>
        <Xfade><SceneRecording /></Xfade>
      </Sequence>
      <Sequence from={T.aiProcess.from} durationInFrames={T.aiProcess.dur + 12}>
        <Xfade><SceneAiProcess /></Xfade>
      </Sequence>
      <Sequence from={T.contract.from} durationInFrames={T.contract.dur + 12}>
        <Xfade><SceneContract /></Xfade>
      </Sequence>
      <Sequence from={T.emotion.from} durationInFrames={T.emotion.dur + 12}>
        <Xfade><SceneEmotion /></Xfade>
      </Sequence>
      <Sequence from={T.hero.from} durationInFrames={T.hero.dur}>
        <Xfade dur={18}><SceneHero /></Xfade>
      </Sequence>

      {showAudio && (
        <>
          <Sequence from={T.sunrise.from + 12} durationInFrames={80}>
            <Audio src={staticFile("segments-product-ad/01-open.mp3")} />
          </Sequence>
          <Sequence from={T.walkIn.from + 8} durationInFrames={130}>
            <Audio src={staticFile("segments-product-ad/02-problem.mp3")} />
          </Sequence>
          <Sequence from={T.greeting.from + 18} durationInFrames={80}>
            <Audio src={staticFile("segments-product-ad/03-enter.mp3")} />
          </Sequence>
          <Sequence from={T.recording.from + 5} durationInFrames={170}>
            <Audio src={staticFile("segments-product-ad/04-record.mp3")} />
          </Sequence>
          <Sequence from={T.aiProcess.from + 10} durationInFrames={170}>
            <Audio src={staticFile("segments-product-ad/05-transform.mp3")} />
          </Sequence>
          <Sequence from={T.emotion.from + 5} durationInFrames={80}>
            <Audio src={staticFile("segments-product-ad/06-emotion.mp3")} />
          </Sequence>
          <Sequence from={T.emotion.from + 55} durationInFrames={30}>
            <Audio src={staticFile("segments-product-ad/07-care.mp3")} />
          </Sequence>
          <Sequence from={T.hero.from + 100} durationInFrames={80}>
            <Audio src={staticFile("segments-product-ad/08-tagline.mp3")} />
          </Sequence>
        </>
      )}
    </AbsoluteFill>
  );
};
