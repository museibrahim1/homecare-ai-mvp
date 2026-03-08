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

const FPS = 30;
const OVL = 20;
const TOTAL = 1080;

const BG = "#050a0a";
const TEAL = "#0d9488";
const TEAL_L = "#14b8a6";
const TEAL_X = "#5eead4";
const W = "#ffffff";
const MUTED = "#94a3b8";
const F = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif';

const S = {
  palm:     { from: 0,   dur: 150 },
  greet:    { from: 130, dur: 160 },
  convo:    { from: 270, dur: 250 },
  snap:     { from: 500, dur: 110 },
  contract: { from: 590, dur: 160 },
  care:     { from: 730, dur: 110 },
  hero:     { from: 820, dur: 260 },
};

const VO = {
  story:    { from: 25,  dur: 88 },
  trust:    { from: 150, dur: 150 },
  listens:  { from: 310, dur: 105 },
  complete: { from: 510, dur: 52 },
  seconds:  { from: 610, dur: 140 },
  nodelay:  { from: 740, dur: 100 },
  brand:    { from: 850, dur: 35 },
  tagline:  { from: 900, dur: 80 },
  palmit:   { from: 980, dur: 25 },
};

// ─── Primitives ───

const Vig: React.FC<{ i?: number }> = ({ i = 0.45 }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${i}) 100%)`, pointerEvents: "none" }} />
);

const Grad: React.FC<{ h?: string; o?: number }> = ({ h = "48%", o = 0.85 }) => (
  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: h, background: `linear-gradient(to top, rgba(0,0,0,${o}) 0%, rgba(0,0,0,${o * 0.3}) 60%, transparent 100%)`, pointerEvents: "none" }} />
);

const Dissolve: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames: d } = useVideoConfig();
  const fi = interpolate(frame, [0, OVL], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fo = interpolate(frame, [d - OVL, d], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity: Math.min(fi, fo) }}>{children}</AbsoluteFill>;
};

const Cap: React.FC<{
  text: string; delay?: number; size?: number; color?: string;
  weight?: number; maxW?: number; align?: string;
}> = ({ text, delay = 0, size = 42, color = W, weight = 600, maxW = 880, align = "center" }) => {
  const frame = useCurrentFrame();
  const lf = frame - delay;
  const fadeIn = interpolate(lf, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(lf, [0, 10], [14, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  if (lf < 0) return null;
  return (
    <div style={{ opacity: fadeIn, transform: `translateY(${y}px)`, textAlign: align as any, maxWidth: maxW }}>
      <p style={{ fontSize: size, fontWeight: weight, color, lineHeight: 1.3, margin: 0, fontFamily: F,
        textShadow: "0 3px 18px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.6)" }}>{text}</p>
    </div>
  );
};

const LogoBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 8], [0, 0.85], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", top: 28, left: 32, display: "flex", alignItems: "center", gap: 9, opacity: op, zIndex: 5 }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, overflow: "hidden", boxShadow: "0 3px 10px rgba(0,0,0,0.5)" }}>
        <Img src={staticFile("palmcare-logo.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: 1.1,
        textShadow: "0 2px 8px rgba(0,0,0,0.6)", fontFamily: F }}>PALMCARE AI</span>
    </div>
  );
};

const PhoneFrame: React.FC<{ videoStartSec: number; height?: number; glow?: number; enterDelay?: number }> = ({
  videoStartSec, height = 520, glow = 0.22, enterDelay = 0,
}) => {
  const frame = useCurrentFrame();
  const w = Math.round(height * (870 / 1800));
  const op = interpolate(frame, [enterDelay, enterDelay + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sc = interpolate(frame, [enterDelay, enterDelay + 22], [0.9, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  if (frame < enterDelay) return null;
  return (
    <div style={{ opacity: op, transform: `scale(${sc})` }}>
      <div style={{ width: w, height, borderRadius: 30, overflow: "hidden",
        border: "3px solid rgba(255,255,255,0.12)",
        boxShadow: `0 25px 65px rgba(0,0,0,0.7), 0 0 40px rgba(13,148,136,${glow})` }}>
        <OffthreadVideo src={staticFile("clip4-app-flow.mp4")} startFrom={Math.round(videoStartSec * FPS)}
          volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </div>
  );
};

// ─── Scene 1: Palm Trees Establishing ───
// VO: "Every client has a story worth capturing."

const ScenePalm: React.FC = () => (
  <AbsoluteFill>
    <OffthreadVideo src={staticFile("kling-brand/01_palm_trees_establishing.mp4")}
      volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    <Vig i={0.35} />
    <Grad h="45%" o={0.82} />
    <div style={{ position: "absolute", bottom: 70, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <Cap text={`"Every client has a story worth capturing."`} delay={25} size={46} weight={500} />
    </div>
  </AbsoluteFill>
);

// ─── Scene 2: Greeting Outdoor ───
// VO: "A care professional. A family trusting you with someone they love."

const SceneGreet: React.FC = () => (
  <AbsoluteFill>
    <OffthreadVideo src={staticFile("kling-brand/02_greeting_outdoor.mp4")}
      volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    <Vig i={0.4} />
    <Grad h="46%" o={0.88} />
    <LogoBadge />
    <div style={{ position: "absolute", bottom: 60, left: 50, right: 50, display: "flex", justifyContent: "center" }}>
      <Cap text={`"A care professional. A family trusting you with someone they love."`}
        delay={20} size={38} weight={500} maxW={900} />
    </div>
  </AbsoluteFill>
);

// ─── Scene 3: Conversation + Recording ───
// VO: "PalmCare AI listens — so you never miss a detail."
// Phone overlay: recording UI (clip4 at 15s)

const SceneConvo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile("kling-brand/03_conversation_patio.mp4")}
        volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <Vig i={0.45} />
      <Grad h="50%" o={0.88} />
      <LogoBadge />

      {/* Phone slides in from right showing recording UI */}
      <div style={{ position: "absolute", right: 50, top: "50%", transform: "translateY(-55%)" }}>
        <PhoneFrame videoStartSec={15} height={480} glow={0.28} enterDelay={60} />
      </div>

      <div style={{ position: "absolute", bottom: 55, left: 50, right: 320 }}>
        <Cap text={`"PalmCare AI listens — so you never miss a detail."`}
          delay={40} size={40} color={TEAL_X} weight={600} maxW={700} align="left" />
      </div>

      {/* Subtle recording indicator */}
      {frame >= 65 && (() => {
        const pulse = Math.sin((frame - 65) * 0.15) * 0.4 + 0.6;
        return (
          <div style={{ position: "absolute", top: 28, right: 35, display: "flex", alignItems: "center", gap: 7, opacity: pulse }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)", fontFamily: F }}>RECORDING</span>
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};

// ─── Scene 4: Assessment Complete (quick punch) ───
// VO: "Assessment complete."
// Phone: transcript view (clip4 at 20s)

const SceneSnap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const badgeSc = spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 12, stiffness: 100 } });
  return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile("kling-brand/04_phone_recording.mp4")}
        volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <Vig i={0.5} />

      {/* Assessment Complete badge */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: `translate(-50%, -50%) scale(${Math.max(0, badgeSc)})` }}>
        <div style={{ background: `rgba(5,10,10,0.85)`, border: `2px solid ${TEAL}`, borderRadius: 18, padding: "18px 36px",
          display: "flex", alignItems: "center", gap: 12, boxShadow: `0 15px 50px rgba(0,0,0,0.6), 0 0 30px rgba(13,148,136,0.3)` }}>
          <span style={{ fontSize: 32, color: TEAL_L }}>✓</span>
          <span style={{ fontSize: 28, fontWeight: 700, color: W, fontFamily: F }}>Assessment Complete</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 5: Contract Reveal ───
// VO: "In seconds, your care plan and service agreement — ready to sign."
// Phone: contract view (clip4 at 33s)

const SceneContract: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <OffthreadVideo src={staticFile("kling-brand/05_showing_contract.mp4")}
        volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <Vig i={0.45} />
      <Grad h="50%" o={0.9} />
      <LogoBadge />

      {/* Phone with contract UI — centered left */}
      <div style={{ position: "absolute", left: 60, top: "50%", transform: "translateY(-55%)" }}>
        <PhoneFrame videoStartSec={33} height={500} glow={0.25} enterDelay={10} />
      </div>

      <div style={{ position: "absolute", bottom: 55, right: 50, maxWidth: 600 }}>
        <Cap text={`"In seconds, your care plan and service agreement — ready to sign."`}
          delay={20} size={36} weight={500} align="right" maxW={600} />
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 6: Care Done Right ───
// VO: "No paperwork. No delays. Just care, done right."
// Teal ambient scene (emotional payoff before brand close)

const SceneCare: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = Math.sin(frame * 0.07) * 0.15 + 0.85;
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <div style={{ position: "absolute", inset: 0,
        background: `radial-gradient(ellipse at 50% 45%, rgba(13,148,136,${pulse * 0.12}) 0%, transparent 60%)` }} />

      {/* Subtle palm leaf silhouette pattern */}
      {[...Array(5)].map((_, i) => {
        const x = 15 + i * 20;
        const sway = Math.sin(frame * 0.03 + i * 1.5) * 3;
        const a = 0.04 + (i % 2) * 0.02;
        return (
          <div key={i} style={{ position: "absolute", left: `${x}%`, top: -20,
            width: 200, height: 400, opacity: a,
            background: `linear-gradient(180deg, rgba(13,148,136,0.3) 0%, transparent 70%)`,
            borderRadius: "0 0 50% 50%", transform: `rotate(${sway + (i - 2) * 8}deg)` }} />
        );
      })}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
        <Cap text={`"No paperwork. No delays."`} delay={10} size={48} color={W} weight={600} />
        <Cap text={`"Just care, done right."`} delay={30} size={48} color={TEAL_X} weight={700} />
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 7: Palm Sunset Hero → Brand Close ───
// VO: "PalmCare AI." → "Record it. Transcribe it. Contract it." → "Palm it."

const SceneHero: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const klingOp = interpolate(frame, [0, 80], [1, 0], { extrapolateRight: "clamp" });
  const brandOp = interpolate(frame, [55, 80], [0, 1], { extrapolateRight: "clamp" });
  const logoSc = spring({ frame: Math.max(0, frame - 60), fps, config: { damping: 14, stiffness: 80 } });
  const nameOp = interpolate(frame, [75, 92], [0, 1], { extrapolateRight: "clamp" });
  const tagOp = interpolate(frame, [100, 118], [0, 1], { extrapolateRight: "clamp" });
  const palmOp = interpolate(frame, [145, 165], [0, 1], { extrapolateRight: "clamp" });
  const palmSc = spring({ frame: Math.max(0, frame - 145), fps, config: { damping: 10, stiffness: 120 } });
  const qrOp = interpolate(frame, [190, 215], [0, 1], { extrapolateRight: "clamp" });
  const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ backgroundColor: BG, overflow: "hidden" }}>
      {/* Kling sunset fading out behind brand */}
      <div style={{ opacity: klingOp, position: "absolute", inset: 0 }}>
        <OffthreadVideo src={staticFile("kling-brand/06_palm_sunset_hero.mp4")}
          volume={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <Vig i={0.5} />

      <div style={{ opacity: brandOp, position: "absolute", inset: 0, backgroundColor: BG }} />
      <div style={{ position: "absolute", inset: 0, opacity: brandOp,
        background: `radial-gradient(ellipse at 50% 40%, rgba(13,148,136,${pulse * 0.1}) 0%, transparent 55%)` }} />

      {/* Subtle floating particles */}
      {brandOp > 0 && [...Array(8)].map((_, i) => {
        const sp = 0.01 + (i % 3) * 0.004;
        const x = Math.sin(frame * sp + i * 1.5) * 380 + 960;
        const y = Math.cos(frame * sp * 0.7 + i * 0.9) * 280 + 540;
        const sz = 2 + (i % 3) * 1.5;
        const a = (0.05 + Math.sin(frame * 0.06 + i) * 0.03) * brandOp;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: sz, height: sz,
          borderRadius: "50%", background: `rgba(13,148,136,${a})` }} />;
      })}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        height: "100%", opacity: brandOp }}>
        <div style={{ transform: `scale(${Math.max(0, logoSc)})`, marginBottom: 16 }}>
          <div style={{ width: 88, height: 88, borderRadius: 22, overflow: "hidden",
            boxShadow: `0 18px 50px rgba(13,148,136,${pulse * 0.4})` }}>
            <Img src={staticFile("palmcare-logo.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>

        <div style={{ opacity: nameOp, marginBottom: 4 }}>
          <h1 style={{ fontSize: 50, fontWeight: 800, color: W, margin: 0, fontFamily: F }}>
            PalmCare <span style={{ background: `linear-gradient(135deg, ${TEAL_L}, ${TEAL_X})`,
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI</span>
          </h1>
        </div>

        <div style={{ opacity: tagOp, marginBottom: 26 }}>
          <p style={{ fontSize: 19, fontWeight: 500, color: MUTED, margin: 0, fontFamily: F }}>
            Record it. Transcribe it. Contract it.</p>
        </div>

        <div style={{ width: 45, height: 2, marginBottom: 22, opacity: tagOp,
          background: `linear-gradient(90deg, transparent, ${TEAL}, transparent)` }} />

        <div style={{ opacity: palmOp, transform: `scale(${Math.max(0, palmSc)})`, marginBottom: 30 }}>
          <span style={{ fontSize: 58, fontWeight: 900, color: W, letterSpacing: -2, fontFamily: F }}>PALM </span>
          <span style={{ fontSize: 58, fontWeight: 900, fontStyle: "italic", letterSpacing: -2, fontFamily: F,
            background: `linear-gradient(135deg, ${TEAL_L}, ${TEAL_X})`,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>IT.</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18, opacity: qrOp }}>
          <div style={{ background: "white", borderRadius: 12, padding: 8, boxShadow: "0 8px 22px rgba(0,0,0,0.3)" }}>
            <Img src={staticFile("palmcare-qr.png")} style={{ width: 68, height: 68 }} />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, color: TEAL_L, margin: 0, fontFamily: F }}>palmcareai.com</p>
            <p style={{ fontSize: 11, color: MUTED, margin: "3px 0 0", fontFamily: F }}>Start your free trial</p>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Main Composition ───

export const ProductAd: React.FC<{ showAudio?: boolean }> = ({ showAudio = false }) => (
  <AbsoluteFill style={{ backgroundColor: BG }}>
    {/* Teal accent line */}
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, zIndex: 10,
      background: `linear-gradient(90deg, transparent 5%, ${TEAL} 30%, ${TEAL_L} 50%, ${TEAL} 70%, transparent 95%)` }} />

    {/* 7 scenes with dissolve overlaps */}
    <Sequence from={S.palm.from} durationInFrames={S.palm.dur}>
      <Dissolve><ScenePalm /></Dissolve>
    </Sequence>
    <Sequence from={S.greet.from} durationInFrames={S.greet.dur}>
      <Dissolve><SceneGreet /></Dissolve>
    </Sequence>
    <Sequence from={S.convo.from} durationInFrames={S.convo.dur}>
      <Dissolve><SceneConvo /></Dissolve>
    </Sequence>
    <Sequence from={S.snap.from} durationInFrames={S.snap.dur}>
      <Dissolve><SceneSnap /></Dissolve>
    </Sequence>
    <Sequence from={S.contract.from} durationInFrames={S.contract.dur}>
      <Dissolve><SceneContract /></Dissolve>
    </Sequence>
    <Sequence from={S.care.from} durationInFrames={S.care.dur}>
      <Dissolve><SceneCare /></Dissolve>
    </Sequence>
    <Sequence from={S.hero.from} durationInFrames={S.hero.dur}>
      <Dissolve><SceneHero /></Dissolve>
    </Sequence>

    {/* Progress bar */}
    <Sequence from={0} durationInFrames={TOTAL}>
      {React.createElement(() => {
        const frame = useCurrentFrame();
        return <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, zIndex: 20,
          width: `${(frame / TOTAL) * 100}%`,
          background: `linear-gradient(90deg, ${TEAL}, ${TEAL_L})`,
          boxShadow: `0 0 10px ${TEAL}` }} />;
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
