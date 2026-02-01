import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

// ============ TYPES ============
type DemoVideoProps = {
  showAudio: boolean;
};

// ============ SHARED STYLES ============
const colors = {
  primary: "#3B82F6",      // Blue
  secondary: "#10B981",    // Green
  accent: "#8B5CF6",       // Purple
  dark: "#0F172A",         // Dark navy
  light: "#F8FAFC",        // Light gray
  orange: "#F97316",       // Orange
};

// ============ INTRO SCENE ============
const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animations
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 100, stiffness: 200, mass: 0.5 },
  });

  const titleOpacity = interpolate(frame, [20, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subtitleOpacity = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const taglineY = interpolate(frame, [60, 90], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const taglineOpacity = interpolate(frame, [60, 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.dark} 0%, #1E293B 100%)`,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      {/* Logo Icon */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          width: 120,
          height: 120,
          borderRadius: 24,
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 40,
          boxShadow: "0 20px 60px rgba(59, 130, 246, 0.4)",
        }}
      >
        <svg width="60" height="60" viewBox="0 0 24 24" fill="white">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" fill="none" strokeWidth="2" />
          <line x1="12" y1="19" x2="12" y2="22" stroke="white" strokeWidth="2" />
        </svg>
      </div>

      {/* Title */}
      <div
        style={{
          opacity: titleOpacity,
          fontSize: 72,
          fontWeight: 800,
          color: "white",
          fontFamily: "system-ui, sans-serif",
          letterSpacing: -2,
        }}
      >
        Homecare AI
      </div>

      {/* Subtitle */}
      <div
        style={{
          opacity: subtitleOpacity,
          fontSize: 28,
          color: colors.primary,
          fontFamily: "system-ui, sans-serif",
          fontWeight: 600,
          marginTop: 16,
        }}
      >
        AI-Powered Care Assessment Engine
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          fontSize: 22,
          color: "#94A3B8",
          fontFamily: "system-ui, sans-serif",
          marginTop: 32,
          textAlign: "center",
          maxWidth: 700,
          lineHeight: 1.5,
        }}
      >
        Turn intake conversations into proposal-ready contracts in minutes
      </div>
    </AbsoluteFill>
  );
};

// ============ FEATURE CARD COMPONENT ============
type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
  color: string;
};

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 100, stiffness: 200, mass: 0.5 },
  });

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${Math.max(0, scale)})`,
        background: "rgba(255, 255, 255, 0.05)",
        borderRadius: 20,
        padding: 32,
        width: 320,
        border: "1px solid rgba(255, 255, 255, 0.1)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: color,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: "white",
          fontFamily: "system-ui, sans-serif",
          marginBottom: 12,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 16,
          color: "#94A3B8",
          fontFamily: "system-ui, sans-serif",
          lineHeight: 1.5,
        }}
      >
        {description}
      </div>
    </div>
  );
};

// ============ CORE FEATURES SCENE ============
const CoreFeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.dark} 0%, #1E293B 100%)`,
        padding: 80,
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          opacity: headerOpacity,
          fontSize: 48,
          fontWeight: 700,
          color: "white",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          marginBottom: 60,
        }}
      >
        Core Features
      </div>

      {/* Feature Grid */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 40,
          flexWrap: "wrap",
        }}
      >
        <FeatureCard
          icon={<MicIcon />}
          title="Audio Upload"
          description="Upload recordings from assessments, phone calls, or in-person visits"
          delay={20}
          color={colors.primary}
        />
        <FeatureCard
          icon={<WaveformIcon />}
          title="AI Transcription"
          description="Automatic speech-to-text with speaker identification"
          delay={35}
          color={colors.secondary}
        />
        <FeatureCard
          icon={<FileTextIcon />}
          title="Contract Generation"
          description="AI extracts services and generates proposal-ready contracts"
          delay={50}
          color={colors.accent}
        />
      </div>
    </AbsoluteFill>
  );
};

// ============ PIPELINE SCENE ============
const PipelineScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.dark} 0%, #1E293B 100%)`,
        padding: 80,
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity: headerOpacity,
          fontSize: 48,
          fontWeight: 700,
          color: "white",
          fontFamily: "system-ui, sans-serif",
          marginBottom: 20,
        }}
      >
        The AI Pipeline
      </div>
      <div
        style={{
          opacity: headerOpacity,
          fontSize: 22,
          color: "#94A3B8",
          fontFamily: "system-ui, sans-serif",
          marginBottom: 60,
        }}
      >
        Three steps from audio to contract
      </div>

      {/* Pipeline Steps */}
      <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
        <PipelineStep
          number={1}
          title="Transcribe"
          description="Audio → Text"
          delay={30}
          color={colors.primary}
        />
        <Arrow delay={60} />
        <PipelineStep
          number={2}
          title="Bill"
          description="Extract Services"
          delay={70}
          color={colors.orange}
        />
        <Arrow delay={100} />
        <PipelineStep
          number={3}
          title="Contract"
          description="Generate Proposal"
          delay={110}
          color={colors.secondary}
        />
      </div>

      {/* Time Saved */}
      <TimeSavedBadge delay={140} />
    </AbsoluteFill>
  );
};

type PipelineStepProps = {
  number: number;
  title: string;
  description: string;
  delay: number;
  color: string;
};

const PipelineStep: React.FC<PipelineStepProps> = ({ number, title, description, delay, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 100, stiffness: 200, mass: 0.5 },
  });

  const checkOpacity = interpolate(frame, [delay + 30, delay + 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        transform: `scale(${Math.max(0, scale)})`,
        background: "rgba(255, 255, 255, 0.05)",
        borderRadius: 24,
        padding: 40,
        width: 260,
        textAlign: "center",
        border: `2px solid ${color}`,
        position: "relative",
      }}
    >
      {/* Check mark */}
      <div
        style={{
          position: "absolute",
          top: -15,
          right: -15,
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: colors.secondary,
          opacity: checkOpacity,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M20 6L9 17l-5-5" stroke="white" fill="none" strokeWidth="3" />
        </svg>
      </div>

      <div
        style={{
          fontSize: 48,
          fontWeight: 800,
          color: color,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {number}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "white",
          fontFamily: "system-ui, sans-serif",
          marginTop: 16,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 18,
          color: "#94A3B8",
          fontFamily: "system-ui, sans-serif",
          marginTop: 8,
        }}
      >
        {description}
      </div>
    </div>
  );
};

const Arrow: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [delay, delay + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <svg width="40" height="40" viewBox="0 0 24 24" style={{ opacity }}>
      <path d="M5 12h14m-7-7l7 7-7 7" stroke={colors.primary} fill="none" strokeWidth="2" />
    </svg>
  );
};

const TimeSavedBadge: React.FC<{ delay: number }> = ({ delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame: frame - delay,
    fps,
    config: { damping: 80, stiffness: 150, mass: 0.5 },
  });

  return (
    <div
      style={{
        transform: `scale(${Math.max(0, scale)})`,
        marginTop: 60,
        background: `linear-gradient(135deg, ${colors.secondary} 0%, #059669 100%)`,
        borderRadius: 16,
        padding: "20px 40px",
        display: "flex",
        alignItems: "center",
        gap: 16,
      }}
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
        <circle cx="12" cy="12" r="10" stroke="white" fill="none" strokeWidth="2" />
        <path d="M12 6v6l4 2" stroke="white" fill="none" strokeWidth="2" />
      </svg>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "white", fontFamily: "system-ui" }}>
          Hours → Minutes
        </div>
        <div style={{ fontSize: 16, color: "rgba(255,255,255,0.8)", fontFamily: "system-ui" }}>
          80% reduction in documentation time
        </div>
      </div>
    </div>
  );
};

// ============ SCREENSHOT SCENE ============
type ScreenshotSceneProps = {
  title: string;
  subtitle: string;
  screenshotPath: string;
  bullets: string[];
};

const ScreenshotScene: React.FC<ScreenshotSceneProps> = ({ title, subtitle, screenshotPath, bullets }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const textOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  const imageScale = spring({
    frame: frame - 20,
    fps,
    config: { damping: 100, stiffness: 150, mass: 0.8 },
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.dark} 0%, #1E293B 100%)`,
        flexDirection: "row",
        padding: 60,
      }}
    >
      {/* Left: Text */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingRight: 40,
        }}
      >
        <div
          style={{
            opacity: textOpacity,
            fontSize: 14,
            fontWeight: 600,
            color: colors.primary,
            fontFamily: "system-ui",
            textTransform: "uppercase",
            letterSpacing: 2,
            marginBottom: 16,
          }}
        >
          Feature
        </div>
        <div
          style={{
            opacity: textOpacity,
            fontSize: 48,
            fontWeight: 700,
            color: "white",
            fontFamily: "system-ui",
            lineHeight: 1.2,
            marginBottom: 16,
          }}
        >
          {title}
        </div>
        <div
          style={{
            opacity: textOpacity,
            fontSize: 20,
            color: "#94A3B8",
            fontFamily: "system-ui",
            marginBottom: 32,
          }}
        >
          {subtitle}
        </div>

        {/* Bullets */}
        {bullets.map((bullet, i) => {
          const bulletOpacity = interpolate(frame, [40 + i * 15, 60 + i * 15], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={i}
              style={{
                opacity: bulletOpacity,
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: colors.primary,
                }}
              />
              <div
                style={{
                  fontSize: 18,
                  color: "#E2E8F0",
                  fontFamily: "system-ui",
                }}
              >
                {bullet}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right: Screenshot */}
      <div
        style={{
          flex: 1.5,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            transform: `scale(${Math.max(0, imageScale)})`,
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 40px 100px rgba(0, 0, 0, 0.5)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Img
            src={staticFile(screenshotPath)}
            style={{
              width: 800,
              height: "auto",
              display: "block",
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============ CTA SCENE ============
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 100, stiffness: 200, mass: 0.5 },
  });

  const buttonOpacity = interpolate(frame, [40, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.dark} 0%, #1E293B 100%)`,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          fontSize: 56,
          fontWeight: 700,
          color: "white",
          fontFamily: "system-ui",
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        Ready to Save Hours?
      </div>
      <div
        style={{
          opacity: buttonOpacity,
          fontSize: 24,
          color: "#94A3B8",
          fontFamily: "system-ui",
          marginBottom: 48,
        }}
      >
        Start your free trial today
      </div>
      <div
        style={{
          opacity: buttonOpacity,
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
          borderRadius: 16,
          padding: "24px 64px",
          fontSize: 24,
          fontWeight: 600,
          color: "white",
          fontFamily: "system-ui",
          boxShadow: "0 20px 60px rgba(59, 130, 246, 0.4)",
        }}
      >
        Get Started Free
      </div>
    </AbsoluteFill>
  );
};

// ============ ICONS ============
const MicIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" fill="none" strokeWidth="2" />
  </svg>
);

const WaveformIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
    <path d="M2 12h2m4-6v12m4-10v8m4-12v16m4-8v4m2-2h2" stroke="white" fill="none" strokeWidth="2" />
  </svg>
);

const FileTextIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="white" fill="none" strokeWidth="2" />
    <path d="M14 2v6h6M16 13H8m8 4H8m2-8H8" stroke="white" fill="none" strokeWidth="2" />
  </svg>
);

// ============ SCENE AUDIO COMPONENT ============
type SceneAudioProps = {
  scene: number;
  from: number;
};

const SceneAudio: React.FC<SceneAudioProps> = ({ scene, from }) => {
  return (
    <Sequence from={from} durationInFrames={180}>
      <Audio 
        src={staticFile(`segments/scene-${scene.toString().padStart(2, '0')}.mp3`)} 
        volume={1}
        startFrom={0}
      />
    </Sequence>
  );
};

// ============ MAIN DEMO VIDEO ============
export const DemoVideo: React.FC<DemoVideoProps> = ({ showAudio }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: colors.dark }}>
      {/* Audio tracks - scene-synced segments */}
      {showAudio && (
        <>
          {/* Scene 1: Intro (0-4s) */}
          <Sequence from={0} durationInFrames={120}>
            <Audio src={staticFile("segments/scene-01.mp3")} volume={1} />
          </Sequence>
          {/* Scene 2: Core Features (4-9s) */}
          <Sequence from={120} durationInFrames={150}>
            <Audio src={staticFile("segments/scene-02.mp3")} volume={1} />
          </Sequence>
          {/* Scene 3: Pipeline (9-15s) */}
          <Sequence from={270} durationInFrames={180}>
            <Audio src={staticFile("segments/scene-03.mp3")} volume={1} />
          </Sequence>
          {/* Scene 4: Assessments (15-21s) */}
          <Sequence from={450} durationInFrames={180}>
            <Audio src={staticFile("segments/scene-04.mp3")} volume={1} />
          </Sequence>
          {/* Scene 5: Visit Detail (21-27s) */}
          <Sequence from={630} durationInFrames={180}>
            <Audio src={staticFile("segments/scene-05.mp3")} volume={1} />
          </Sequence>
          {/* Scene 6: Contract (27-33s) */}
          <Sequence from={810} durationInFrames={180}>
            <Audio src={staticFile("segments/scene-06.mp3")} volume={1} />
          </Sequence>
          {/* Scene 7: Clients (33-39s) */}
          <Sequence from={990} durationInFrames={180}>
            <Audio src={staticFile("segments/scene-07.mp3")} volume={1} />
          </Sequence>
          {/* Scene 8: Reports (39-45s) */}
          <Sequence from={1170} durationInFrames={180}>
            <Audio src={staticFile("segments/scene-08.mp3")} volume={1} />
          </Sequence>
          {/* Scene 9: CTA (45-50s) */}
          <Sequence from={1350} durationInFrames={150}>
            <Audio src={staticFile("segments/scene-09.mp3")} volume={1} />
          </Sequence>
        </>
      )}

      {/* Scene 1: Intro (0-4 seconds) */}
      <Sequence from={0} durationInFrames={120}>
        <IntroScene />
      </Sequence>

      {/* Scene 2: Core Features (4-9 seconds) */}
      <Sequence from={120} durationInFrames={150}>
        <CoreFeaturesScene />
      </Sequence>

      {/* Scene 3: Pipeline (9-15 seconds) */}
      <Sequence from={270} durationInFrames={180}>
        <PipelineScene />
      </Sequence>

      {/* Scene 4: Assessments Dashboard (15-21 seconds) */}
      <Sequence from={450} durationInFrames={180}>
        <ScreenshotScene
          title="Assessments Dashboard"
          subtitle="Your command center for care assessments"
          screenshotPath="screenshots/02-assessments.png"
          bullets={[
            "Track all assessments in one place",
            "Color-coded status badges",
            "Quick search and filtering",
            "One-click to view details",
          ]}
        />
      </Sequence>

      {/* Scene 5: Visit Detail (21-27 seconds) */}
      <Sequence from={630} durationInFrames={180}>
        <ScreenshotScene
          title="AI Processing Pipeline"
          subtitle="Watch AI process your recordings in real-time"
          screenshotPath="screenshots/03-visit-detail.png"
          bullets={[
            "One-click pipeline execution",
            "Real-time progress tracking",
            "Automatic service extraction",
            "Instant contract generation",
          ]}
        />
      </Sequence>

      {/* Scene 6: Contract Preview (27-33 seconds) */}
      <Sequence from={810} durationInFrames={180}>
        <ScreenshotScene
          title="Contract Generation"
          subtitle="AI-generated, human-approved"
          screenshotPath="screenshots/04-contract-preview.png"
          bullets={[
            "Proposal-ready contracts",
            "Edit any section manually",
            "Regenerate with changes",
            "Export to PDF instantly",
          ]}
        />
      </Sequence>

      {/* Scene 7: Clients (33-39 seconds) */}
      <Sequence from={990} durationInFrames={180}>
        <ScreenshotScene
          title="Client Management"
          subtitle="All client information at your fingertips"
          screenshotPath="screenshots/05-clients.png"
          bullets={[
            "Complete client profiles",
            "Care level indicators",
            "Medical conditions tracking",
            "Emergency contacts on file",
          ]}
        />
      </Sequence>

      {/* Scene 8: Reports (39-45 seconds) */}
      <Sequence from={1170} durationInFrames={180}>
        <ScreenshotScene
          title="Reports & Analytics"
          subtitle="Data-driven insights for your agency"
          screenshotPath="screenshots/06-reports.png"
          bullets={[
            "Weekly timesheets for payroll",
            "Monthly activity summaries",
            "Billing reconciliation",
            "One-click CSV exports",
          ]}
        />
      </Sequence>

      {/* Scene 9: CTA (45-50 seconds) */}
      <Sequence from={1350} durationInFrames={150}>
        <CTAScene />
      </Sequence>
    </AbsoluteFill>
  );
};
