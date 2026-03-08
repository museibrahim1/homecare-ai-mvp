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
// PALMCARE AI — FINAL PRODUCT AD
//
// Audio-first build. Every visual is locked to voiceover timing.
// 9 VO segments, 6 visual scenes, 20-frame overlapping dissolves.
//
// AUDIO MAP (absolute frames):
//   f20:   "Every client has a story worth capturing."        (82fr)
//   f140:  "A care professional. A family trusting you..."    (143fr)
//   f320:  "PalmCare AI listens — so you never miss..."       (99fr)
//   f450:  "Assessment complete."                              (46fr)
//   f520:  "In seconds, your care plan and service..."        (134fr)
//   f660:  "No paperwork. No delays. Just care, done right." (94fr)
//   f800:  "PalmCare AI."                                     (28fr)
//   f855:  "Record it. Transcribe it. Contract it."           (74fr)
//   f960:  "Palm it."                                          (18fr)
//
// VISUAL SCENES:
//   1A  Sunrise establishing       f0–f140
//   1B  Greeting → Recording       f120–f330
//   1C  Live transcription          f310–f460
//   2A  Contract + showing          f440–f670
//   2B  Family relief               f650–f800
//   3   Hero → Brand close          f780–f1050
//
// Total: 1050 frames = 35s
// ================================================================

const FPS = 30;
const OVL = 20;

const BG = "#050a0a";
const TEAL = "#0d9488";
const TEAL_L = "#14b8a6";
const TEAL_X = "#5eead4";
const W = "#ffffff";
const MUTED = "#94a3b8";
const F = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';

const SCENES = {
  s1a: { from: 0,   dur: 140 },
  s1b: { from: 120, dur: 210 },
  s1c: { from: 310, dur: 150 },
  s2a: { from: 440, dur: 230 },
  s2b: { from: 650, dur: 150 },
  s3:  { from: 780, dur: 270 },
};
const TOTAL = 1050;

// Audio cue sheet (absolute frame positions)
const VO = {
  story:    { from: 20,  dur: 90 },
  trust:    { from: 140, dur: 150 },
  listens:  { from: 320, dur: 105 },
  complete: { from: 450, dur: 52 },
  seconds:  { from: 520, dur: 140 },
  nodelay:  { from: 660, dur: 100 },
  brand:    { from: 800, dur: 35 },
  tagline:  { from: 855, dur: 80 },
  palmit:   { from: 960, dur: 25 },
};

// ================================================================
// PRIMITIVES
// ================================================================

const Vig: React.FC<{ i?: number }> = ({ i = 0.5 }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${i}) 100%)`, pointerEvents: "none" }} />
);

const Grad: React.FC<{ h?: string; o?: number }> = ({ h = "50%", o = 0.9 }) => (
  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: h, background: `linear-gradient(to top, rgba(0,0,0,${o}) 0%, rgba(0,0,0,${o * 0.3}) 60%, transparent 100%)`, pointerEvents: "none" }} />
);

const LogoBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 8], [0, 0.85], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 30, left: 34, display: "flex", alignItems: "center", gap: 9, opacity: op, zIndex: 5 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, overflow: "hidden", boxShadow: "0 3px 10px rgba(0,0,0,0.5)" }}>
        <Img src={staticFile("palmcare-logo.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: 1.1, textShadow: "0 2px 8px rgba(0,0,0,0.6)", fontFamily: F }}>PALMCARE AI</span>
    </div>
  );
};

const Cap: React.FC<{
  text: string; delay?: number; size?: number; color?: string;
  weight?: number; maxW?: number; align?: string; fadeOut?: number;
}> = ({ text, delay = 0, size = 44, color = W, weight = 600, maxW = 840, align = "center", fadeOut = 999 }) => {
  const frame = useCurrentFrame();
  const lf = frame - delay;
  const fadeIn = interpolate(lf, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOutOp = interpolate(frame, [fadeOut, fadeOut + 12], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(lf, [0, 10], [14, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  if (lf < 0) return null;
  return (
    <div style={{ opacity: fadeIn * fadeOutOp, transform: `translateY(${y}px)`, textAlign: align as any, maxWidth: maxW }}>
      <p style={{ fontSize: size, fontWeight: weight, color, lineHeight: 1.3, margin: 0, fontFamily: F, textShadow: "0 3px 18px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.6)" }}>{text}</p>
    </div>
  );
};

const PhoneVideo: React.FC<{ videoStartSec: number; height?: number; glow?: number }> = ({ videoStartSec, height = 540, glow = 0.22 }) => {
  const w = Math.round(height * (870 / 1800));
  return (
    <div style={{ width: w, height, borderRadius: 32, overflow: "hidden", border: "3px solid rgba(255,255,255,0.1)", boxShadow: `0 25px 70px rgba(0,0,0,0.7), 0 0 45px rgba(13,148,136,${glow})` }}>
      <OffthreadVideo src={staticFile("clip4-app-flow.mp4")} startFrom={Math.round(videoStartSec * FPS)} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};

const Dissolve: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const fi = interpolate(frame, [0, OVL], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fo = interpolate(frame, [d - OVL, d], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: Math.min(fi, fo) }}>{children}</AbsoluteFill>;
};

// ================================================================
// SCENE 1A — Sunrise establishing
// VO: "Every client has a story worth capturing."
// ================================================================

const Scene1A: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <OffthreadVideo src={staticFile("kling-product-ad/01_sunrise_home.mp4")} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    <Vig i={0.4} />
    <Grad h="48%" o={0.85} />
    <div style={{ position: "absolute", bottom: 75, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <Cap text={`"Every client has a story worth capturing."`} delay={20} size={44} weight={500} />
    </div>
  </AbsoluteFill>
);

// ================================================================
// SCENE 1B — Greeting client + Recording
// VO: "A care professional. A family trusting you..."
//     "PalmCare AI listens — so you never miss a detail."
// ================================================================

const Scene1B: React.FC = () => {
  const frame = useCurrentFrame();
  const phoneOp = interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" });
  const phoneSc = interpolate(frame, [80, 105], [0.88, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo src={staticFile("kling-product-ad/03_greeting_client.mp4")} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <Vig i={0.45} />
      <Grad h="50%" o={0.9} />
      <LogoBadge />

      {/* Phone slides in at "PalmCare AI listens" */}
      <div style={{ position: "absolute", right: 55, top: "50%", transform: `translateY(-50%) scale(${phoneSc})`, opacity: phoneOp }}>
        <PhoneVideo videoStartSec={15} height={480} glow={0.25} />
      </div>

      <div style={{ position: "absolute", bottom: 60, left: 55, right: 340, display: "flex", flexDirection: "column", gap: 6 }}>
        {/* "A care professional..." — local frame 20 = abs frame 140 */}
        <Cap text={`"A care professional. A family trusting you with someone they love."`} delay={20} size={36} weight={500} fadeOut={120} />
        {/* "PalmCare AI listens..." — local frame 200 = abs frame 320 */}
        {frame >= 195 && <Cap text={`"PalmCare AI listens — so you never miss a detail."`} delay={200} size={38} color={TEAL_X} weight={600} />}
      </div>
    </AbsoluteFill>
  );
};

// ================================================================
// SCENE 1C — Live transcription close-up
// (visual breathing room, transcript scrolling in phone)
// ================================================================

const Scene1C: React.FC = () => {
  const frame = useCurrentFrame();
  const phoneOp = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const phoneY = interpolate(frame, [0, 18], [25, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const scanLine = interpolate(frame, [0, 150], [0, 100], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 45% 50%, rgba(13,148,136,0.1) 0%, transparent 55%)` }} />
      <div style={{ position: "absolute", top: `${scanLine}%`, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${TEAL}, ${TEAL_L}, ${TEAL}, transparent)`, boxShadow: `0 0 18px ${TEAL}`, opacity: 0.5 }} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 50 }}>
        <div style={{ opacity: phoneOp, transform: `translateY(${phoneY}px)` }}>
          <PhoneVideo videoStartSec={20} height={560} glow={0.3} />
        </div>
        <div style={{ maxWidth: 420 }}>
          <Cap text="Live transcription" delay={10} size={36} color={TEAL_L} weight={700} align="left" maxW={420} />
          <div style={{ marginTop: 8 }}>
            <Cap text="Every speaker identified. Every detail captured." delay={30} size={24} color={MUTED} weight={500} align="left" maxW={420} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ================================================================
// SCENE 2A — Contract generated + showing to client
// VO: "Assessment complete." → "In seconds, your care plan..."
// ================================================================

const Scene2A: React.FC = () => {
  const frame = useCurrentFrame();
  const phoneOp = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const phoneX = interpolate(frame, [30, 55], [-50, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  const completeBadgeOp = interpolate(frame, [5, 20], [0, 1], { extrapolateRight: "clamp" });
  const completeBadgeSc = spring({ frame: Math.max(0, frame - 5), fps: FPS, config: { damping: 12, stiffness: 100 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo src={staticFile("kling-product-ad/06_showing_contract.mp4")} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <Vig i={0.5} />
      <Grad h="50%" o={0.9} />
      <LogoBadge />

      {/* "Assessment Complete" badge */}
      <div style={{ position: "absolute", top: 35, right: 40, opacity: completeBadgeOp, transform: `scale(${Math.max(0, completeBadgeSc)})` }}>
        <div style={{ background: `${TEAL}33`, border: `1px solid ${TEAL}80`, borderRadius: 12, padding: "8px 18px", display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 18, color: TEAL_L }}>✓</span>
          <span style={{ fontSize: 15, fontWeight: 600, color: TEAL_L, fontFamily: F }}>Assessment Complete</span>
        </div>
      </div>

      {/* Phone with contract */}
      <div style={{ position: "absolute", left: 55, top: "50%", transform: `translateY(-50%) translateX(${phoneX}px)`, opacity: phoneOp }}>
        <PhoneVideo videoStartSec={32} height={480} glow={0.22} />
      </div>

      <div style={{ position: "absolute", bottom: 55, right: 55, maxWidth: 580, display: "flex", flexDirection: "column", gap: 6 }}>
        {/* "Assessment complete." — local frame 10 = abs 450 */}
        <Cap text={`"Assessment complete."`} delay={10} size={46} color={TEAL_X} weight={700} align="right" maxW={580} fadeOut={70} />
        {/* "In seconds, your care plan..." — local frame 80 = abs 520 */}
        {frame >= 75 && <Cap text={`"In seconds, your care plan and service agreement — ready to sign."`} delay={80} size={34} weight={500} align="right" maxW={580} />}
      </div>
    </AbsoluteFill>
  );
};

// ================================================================
// SCENE 2B — Family relief / emotional payoff
// VO: "No paperwork. No delays. Just care, done right."
// ================================================================

const Scene2B: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <OffthreadVideo src={staticFile("kling-product-ad/07_family_relief.mp4")} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    <Vig i={0.3} />
    <Grad h="42%" o={0.82} />
    <div style={{ position: "absolute", bottom: 65, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <Cap text={`"No paperwork. No delays. Just care, done right."`} delay={10} size={42} weight={600} />
    </div>
  </AbsoluteFill>
);

// ================================================================
// SCENE 3 — Hero shot → Brand close
// VO: "PalmCare AI." → "Record it..." → "Palm it."
// ================================================================

const Scene3Hero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const klingOp = interpolate(frame, [0, 70], [1, 0], { extrapolateRight: "clamp" });
  const brandOp = interpolate(frame, [50, 75], [0, 1], { extrapolateRight: "clamp" });
  const logoSc = spring({ frame: Math.max(0, frame - 55), fps, config: { damping: 14, stiffness: 80 } });
  const nameOp = interpolate(frame, [70, 88], [0, 1], { extrapolateRight: "clamp" });
  const tagOp = interpolate(frame, [95, 112], [0, 1], { extrapolateRight: "clamp" });
  const palmOp = interpolate(frame, [140, 158], [0, 1], { extrapolateRight: "clamp" });
  const palmSc = spring({ frame: Math.max(0, frame - 140), fps, config: { damping: 10, stiffness: 120 } });
  const qrOp = interpolate(frame, [185, 205], [0, 1], { extrapolateRight: "clamp" });
  const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      {/* Kling hero fading out */}
      <div style={{ opacity: klingOp, position: "absolute", inset: 0 }}>
        <OffthreadVideo src={staticFile("kling-product-ad/08_palm_it_hero.mp4")} volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <Vig i={0.5} />

      {/* Brand backdrop */}
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
        {/* Logo */}
        <div style={{ transform: `scale(${Math.max(0, logoSc)})`, marginBottom: 18 }}>
          <div style={{ width: 92, height: 92, borderRadius: 23, overflow: "hidden", boxShadow: `0 18px 55px rgba(13,148,136,${pulse * 0.4})` }}>
            <Img src={staticFile("palmcare-logo.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>

        {/* PalmCare AI */}
        <div style={{ opacity: nameOp, marginBottom: 5 }}>
          <h1 style={{ fontSize: 52, fontWeight: 800, color: W, margin: 0, fontFamily: F }}>
            PalmCare <span style={{ background: `linear-gradient(135deg, ${TEAL_L}, ${TEAL_X})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>
          </h1>
        </div>

        {/* Tagline */}
        <div style={{ opacity: tagOp, marginBottom: 28 }}>
          <p style={{ fontSize: 20, fontWeight: 500, color: MUTED, margin: 0, fontFamily: F }}>Record it. Transcribe it. Contract it.</p>
        </div>

        <div style={{ width: 50, height: 2, background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)`, marginBottom: 24, opacity: tagOp }} />

        {/* PALM IT. */}
        <div style={{ opacity: palmOp, transform: `scale(${Math.max(0, palmSc)})`, marginBottom: 32 }}>
          <span style={{ fontSize: 62, fontWeight: 900, color: W, letterSpacing: -2, fontFamily: F }}>PALM </span>
          <span style={{ fontSize: 62, fontWeight: 900, fontStyle: "italic", letterSpacing: -2, fontFamily: F, background: `linear-gradient(135deg, ${TEAL_L}, ${TEAL_X})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>IT.</span>
        </div>

        {/* QR + URL */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: qrOp }}>
          <div style={{ background: "white", borderRadius: 13, padding: 9, boxShadow: "0 8px 25px rgba(0,0,0,0.3)" }}>
            <Img src={staticFile("palmcare-qr.png")} style={{ width: 72, height: 72 }} />
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 600, color: TEAL_L, margin: 0, fontFamily: F }}>palmcareai.com</p>
            <p style={{ fontSize: 12, color: MUTED, margin: "3px 0 0", fontFamily: F }}>Start your free trial</p>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ================================================================
// MAIN — everything stitched seamlessly
// ================================================================

export const ProductAd: React.FC<{ showAudio?: boolean }> = ({ showAudio = false }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      {/* Persistent teal accent */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent 5%, ${TEAL} 30%, ${TEAL_L} 50%, ${TEAL} 70%, transparent 95%)`, zIndex: 10 }} />

      {/* Visual scenes — later JSX renders on top during overlaps */}
      <Sequence from={SCENES.s1a.from} durationInFrames={SCENES.s1a.dur}>
        <Dissolve><Scene1A /></Dissolve>
      </Sequence>
      <Sequence from={SCENES.s1b.from} durationInFrames={SCENES.s1b.dur}>
        <Dissolve><Scene1B /></Dissolve>
      </Sequence>
      <Sequence from={SCENES.s1c.from} durationInFrames={SCENES.s1c.dur}>
        <Dissolve><Scene1C /></Dissolve>
      </Sequence>
      <Sequence from={SCENES.s2a.from} durationInFrames={SCENES.s2a.dur}>
        <Dissolve><Scene2A /></Dissolve>
      </Sequence>
      <Sequence from={SCENES.s2b.from} durationInFrames={SCENES.s2b.dur}>
        <Dissolve><Scene2B /></Dissolve>
      </Sequence>
      <Sequence from={SCENES.s3.from} durationInFrames={SCENES.s3.dur}>
        <Dissolve><Scene3Hero /></Dissolve>
      </Sequence>

      {/* Progress bar */}
      <Sequence from={0} durationInFrames={TOTAL}>
        {React.createElement(() => {
          const frame = useCurrentFrame();
          const progress = frame / TOTAL;
          return <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, width: `${progress * 100}%`, background: `linear-gradient(90deg, ${TEAL}, ${TEAL_L})`, boxShadow: `0 0 10px ${TEAL}`, zIndex: 20 }} />;
        })}
      </Sequence>

      {/* Audio — locked to absolute frame positions */}
      {showAudio && (
        <>
          <Sequence from={VO.story.from} durationInFrames={VO.story.dur}>
            <Audio src={staticFile("segments-final-ad/01-story.mp3")} />
          </Sequence>
          <Sequence from={VO.trust.from} durationInFrames={VO.trust.dur}>
            <Audio src={staticFile("segments-final-ad/02-trust.mp3")} />
          </Sequence>
          <Sequence from={VO.listens.from} durationInFrames={VO.listens.dur}>
            <Audio src={staticFile("segments-final-ad/03-listens.mp3")} />
          </Sequence>
          <Sequence from={VO.complete.from} durationInFrames={VO.complete.dur}>
            <Audio src={staticFile("segments-final-ad/04-complete.mp3")} />
          </Sequence>
          <Sequence from={VO.seconds.from} durationInFrames={VO.seconds.dur}>
            <Audio src={staticFile("segments-final-ad/05-seconds.mp3")} />
          </Sequence>
          <Sequence from={VO.nodelay.from} durationInFrames={VO.nodelay.dur}>
            <Audio src={staticFile("segments-final-ad/06-nodelay.mp3")} />
          </Sequence>
          <Sequence from={VO.brand.from} durationInFrames={VO.brand.dur}>
            <Audio src={staticFile("segments-final-ad/07-brand.mp3")} />
          </Sequence>
          <Sequence from={VO.tagline.from} durationInFrames={VO.tagline.dur}>
            <Audio src={staticFile("segments-final-ad/08-tagline.mp3")} />
          </Sequence>
          <Sequence from={VO.palmit.from} durationInFrames={VO.palmit.dur}>
            <Audio src={staticFile("segments-final-ad/09-palmit.mp3")} />
          </Sequence>
        </>
      )}
    </AbsoluteFill>
  );
};
