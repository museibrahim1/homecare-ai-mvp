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
  Img,
} from "remotion";

// ============ VIDEO CONFIGURATION ============
// Focused 90-second Demo - Healthcare CRM + AI Automation
// Total: 90 seconds (2700 frames at 30fps)

const SCENE_TIMING = {
  // HOOK - Brand intro (14s, audio: 13.7s)
  hook:       { from: 0,    duration: 420 },
  
  // CORE VALUE - CRM + AI Automation (42s)
  crm:        { from: 420,  duration: 430 },   // Healthcare CRM (audio: 13.8s)
  record:     { from: 850,  duration: 430 },   // Record/Upload (audio: 13.8s)
  aiProcess:  { from: 1280, duration: 390 },   // AI → Billing → Contract (audio: 12.5s)
  
  // CTA - Close the deal (22s)
  results:    { from: 1670, duration: 360 },   // Time savings (audio: 11.6s)
  cta:        { from: 2030, duration: 300 },   // Call to action (audio: 9.2s)
  
  total: 2330, // ~78 seconds
};

// ============ SCENE COMPONENTS ============

// Hook Scene - Clean brand intro with app screenshot
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Smooth animations throughout
  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;
  
  // Left side animations
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const titleSlide = interpolate(frame, [0, 40], [-30, 0], { extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [40, 80], [0, 1], { extrapolateRight: "clamp" });
  const benefitsOpacity = interpolate(frame, [100, 150], [0, 1], { extrapolateRight: "clamp" });
  
  // Right side - screenshot
  const screenshotScale = spring({ frame: frame - 20, fps, config: { damping: 15 } });
  const screenshotOpacity = interpolate(frame, [20, 60], [0, 1], { extrapolateRight: "clamp" });
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", overflow: "hidden" }}>
      {/* Animated gradient background */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse at 70% 50%, rgba(14, 165, 233, ${glowPulse * 0.2}) 0%, transparent 50%)`,
      }} />
      
      {/* Accent line at top */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "4px",
        background: "linear-gradient(90deg, #0ea5e9, #8b5cf6, #0ea5e9)",
      }} />
      
      {/* Floating particles */}
      {[...Array(15)].map((_, i) => {
        const x = Math.sin(frame * 0.02 + i) * 300 + 1200;
        const y = Math.cos(frame * 0.015 + i * 2) * 250 + 540;
        const size = 3 + (i % 3) * 2;
        return (
          <div key={i} style={{
            position: "absolute",
            left: x,
            top: y,
            width: size,
            height: size,
            borderRadius: "50%",
            background: `rgba(14, 165, 233, ${0.2 + Math.sin(frame * 0.1 + i) * 0.15})`,
            boxShadow: `0 0 ${size * 2}px rgba(14, 165, 233, 0.4)`,
          }} />
        );
      })}
      
      {/* Main content */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "60px 80px",
        gap: "80px",
      }}>
        {/* Left side - Branding */}
        <div style={{ flex: 1 }}>
          <div style={{
            opacity: titleOpacity,
            transform: `translateY(${titleSlide}px)`,
          }}>
            <div style={{
              fontSize: "18px",
              color: "#0ea5e9",
              fontWeight: 600,
              letterSpacing: "3px",
              marginBottom: "16px",
            }}>
              INTRODUCING
            </div>
            <h1 style={{
              fontSize: "58px",
              fontWeight: 800,
              color: "white",
              marginBottom: "20px",
              lineHeight: 1.15,
            }}>
              The First<br />
              <span style={{
                background: "linear-gradient(135deg, #0ea5e9, #8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                Healthcare-Centric
              </span><br />
              CRM
            </h1>
          </div>
          
          <div style={{ opacity: taglineOpacity }}>
            <p style={{
              fontSize: "26px",
              color: "#94a3b8",
              marginBottom: "32px",
            }}>
              Powered by AI Automation
            </p>
          </div>
          
          {/* Quick benefits */}
          <div style={{
            display: "flex",
            gap: "16px",
            opacity: benefitsOpacity,
          }}>
            {["Voice → Contract", "Auto Billing", "Built for Care"].map((benefit, i) => (
              <div key={i} style={{
                background: "rgba(14, 165, 233, 0.1)",
                border: "1px solid rgba(14, 165, 233, 0.4)",
                borderRadius: "30px",
                padding: "10px 20px",
                color: "#7dd3fc",
                fontSize: "15px",
              }}>
                {benefit}
              </div>
            ))}
          </div>
        </div>
        
        {/* Right side - Real app screenshot */}
        <div style={{
          flex: 1.1,
          opacity: screenshotOpacity,
          transform: `scale(${Math.max(0.8, screenshotScale)})`,
        }}>
          <div style={{
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: `0 25px 60px rgba(14, 165, 233, ${glowPulse * 0.3})`,
            border: "1px solid rgba(14, 165, 233, 0.2)",
          }}>
            <Img
              src={staticFile("screenshots-v2/01-landing-hero.png")}
              style={{
                width: "100%",
                height: "auto",
              }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// CRM Scene - Pipeline & Client Management
const CRMScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const screenshotScale = spring({ frame: frame - 40, fps, config: { damping: 15 } });
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* Accent bar */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "6px",
        background: "linear-gradient(90deg, #8b5cf6, #d946ef)",
      }} />
      
      <div style={{
        display: "flex",
        height: "100%",
        padding: "60px 80px",
        gap: "60px",
      }}>
        {/* Left - Content */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          opacity: titleOpacity,
        }}>
          <div style={{
            fontSize: "20px",
            color: "#8b5cf6",
            fontWeight: 600,
            letterSpacing: "2px",
            marginBottom: "16px",
          }}>
            HEALTHCARE-CENTRIC CRM
          </div>
          <h2 style={{
            fontSize: "48px",
            fontWeight: 700,
            color: "white",
            marginBottom: "24px",
          }}>
            Built for Home Care
          </h2>
          <p style={{
            fontSize: "24px",
            color: "#94a3b8",
            lineHeight: 1.6,
            marginBottom: "32px",
          }}>
            Track clients from intake to active care with a pipeline designed specifically for home care agencies.
          </p>
          
          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              "Kanban pipeline (Intake → Assessment → Proposal → Active)",
              "Complete client profiles with care levels",
              "Medical history & emergency contacts",
            ].map((feature, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}>
                <div style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#8b5cf6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  color: "white",
                }}>
                  ✓
                </div>
                <span style={{ fontSize: "18px", color: "#e2e8f0" }}>
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right - Screenshot */}
        <div style={{
          flex: 1.2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${screenshotScale})`,
        }}>
          <div style={{
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            border: "1px solid #334155",
          }}>
            <Img
              src={staticFile("screenshots-v2/06-pipeline.png")}
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "550px",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Record Scene - Show actual recording interface
const RecordScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const screenshotScale = spring({ frame: frame - 40, fps, config: { damping: 15 } });
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* Accent bar */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "6px",
        background: "linear-gradient(90deg, #0ea5e9, #06b6d4)",
      }} />
      
      <div style={{
        display: "flex",
        height: "100%",
        padding: "60px 80px",
        gap: "60px",
      }}>
        {/* Left - Screenshot */}
        <div style={{
          flex: 1.2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${screenshotScale})`,
        }}>
          <div style={{
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            border: "1px solid #334155",
          }}>
            <Img
              src={staticFile("screenshots-v2/14-record-audio.png")}
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "550px",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
        
        {/* Right - Content */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          opacity: titleOpacity,
        }}>
          <div style={{
            fontSize: "20px",
            color: "#0ea5e9",
            fontWeight: 600,
            letterSpacing: "2px",
            marginBottom: "16px",
          }}>
            STEP 1
          </div>
          <h2 style={{
            fontSize: "48px",
            fontWeight: 700,
            color: "white",
            marginBottom: "24px",
          }}>
            Record or Upload
          </h2>
          <p style={{
            fontSize: "24px",
            color: "#94a3b8",
            lineHeight: 1.6,
            marginBottom: "32px",
          }}>
            Record assessments directly in the app or upload existing audio files. Our AI handles the rest.
          </p>
          
          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              "One-click recording in browser",
              "Upload MP3, WAV, or M4A files",
              "Support for multi-speaker conversations",
            ].map((feature, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}>
                <div style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "#0ea5e9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  color: "white",
                }}>
                  ✓
                </div>
                <span style={{ fontSize: "18px", color: "#e2e8f0" }}>
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// AI Process Scene - Pipeline automation
const AIProcessScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const step1Scale = spring({ frame: frame - 60, fps, config: { damping: 12 } });
  const step2Scale = spring({ frame: frame - 120, fps, config: { damping: 12 } });
  const step3Scale = spring({ frame: frame - 180, fps, config: { damping: 12 } });
  const screenshotOpacity = interpolate(frame, [200, 280], [0, 1], { extrapolateRight: "clamp" });
  
  const steps = [
    { icon: "📝", title: "Transcribe", desc: "AI transcribes & identifies speakers", color: "#0ea5e9" },
    { icon: "💰", title: "Extract Billing", desc: "Automatically find billable items", color: "#22c55e" },
    { icon: "📄", title: "Generate Contract", desc: "Ready-to-sign in seconds", color: "#8b5cf6" },
  ];
  
  const scales = [step1Scale, step2Scale, step3Scale];
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* Accent bar */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "6px",
        background: "linear-gradient(90deg, #0ea5e9, #22c55e, #8b5cf6)",
      }} />
      
      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "60px 80px",
      }}>
        {/* Header */}
        <div style={{ opacity: titleOpacity, marginBottom: "40px" }}>
          <div style={{
            fontSize: "20px",
            color: "#22c55e",
            fontWeight: 600,
            letterSpacing: "2px",
            marginBottom: "8px",
          }}>
            AI AUTOMATION
          </div>
          <h2 style={{
            fontSize: "48px",
            fontWeight: 700,
            color: "white",
          }}>
            From Voice to Contract in Minutes
          </h2>
        </div>
        
        {/* Steps */}
        <div style={{
          display: "flex",
          gap: "40px",
          marginBottom: "40px",
        }}>
          {steps.map((step, i) => (
            <div key={i} style={{
              flex: 1,
              transform: `scale(${scales[i]})`,
              background: "rgba(255,255,255,0.03)",
              border: `2px solid ${step.color}33`,
              borderRadius: "20px",
              padding: "32px",
              textAlign: "center",
            }}>
              <div style={{
                width: "80px",
                height: "80px",
                borderRadius: "20px",
                background: `${step.color}22`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "40px",
                margin: "0 auto 20px",
              }}>
                {step.icon}
              </div>
              <div style={{ fontSize: "24px", fontWeight: 600, color: "white", marginBottom: "8px" }}>
                {step.title}
              </div>
              <div style={{ fontSize: "16px", color: "#94a3b8" }}>
                {step.desc}
              </div>
            </div>
          ))}
        </div>
        
        {/* Screenshot */}
        <div style={{
          flex: 1,
          display: "flex",
          gap: "30px",
          opacity: screenshotOpacity,
        }}>
          <div style={{
            flex: 1,
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 15px 30px rgba(0,0,0,0.4)",
            border: "1px solid #334155",
          }}>
            <Img
              src={staticFile("screenshots-v2/09-visit-pipeline.png")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div style={{
            flex: 1,
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 15px 30px rgba(0,0,0,0.4)",
            border: "1px solid #334155",
          }}>
            <Img
              src={staticFile("screenshots-v2/10-contract-preview.png")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Results Scene - Time savings
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const stat1Scale = spring({ frame: frame - 60, fps, config: { damping: 12 } });
  const stat2Scale = spring({ frame: frame - 90, fps, config: { damping: 12 } });
  const stat3Scale = spring({ frame: frame - 120, fps, config: { damping: 12 } });
  
  const stats = [
    { value: "6 Hours", label: "→ 6 Minutes", desc: "Contract creation time" },
    { value: "100%", label: "Billables captured", desc: "No more missed items" },
    { value: "Zero", label: "Manual data entry", desc: "AI handles everything" },
  ];
  
  const scales = [stat1Scale, stat2Scale, stat3Scale];
  
  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "60px",
      }}>
        <div style={{ opacity: titleOpacity, textAlign: "center", marginBottom: "60px" }}>
          <h2 style={{
            fontSize: "52px",
            fontWeight: 700,
            color: "white",
            marginBottom: "16px",
          }}>
            The Results Speak for Themselves
          </h2>
          <p style={{
            fontSize: "24px",
            color: "#64748b",
          }}>
            Save time. Capture more revenue. Focus on care.
          </p>
        </div>
        
        <div style={{
          display: "flex",
          gap: "40px",
        }}>
          {stats.map((stat, i) => (
            <div key={i} style={{
              transform: `scale(${scales[i]})`,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid #334155",
              borderRadius: "24px",
              padding: "48px",
              textAlign: "center",
              minWidth: "280px",
            }}>
              <div style={{
                fontSize: "48px",
                fontWeight: 700,
                background: "linear-gradient(135deg, #22c55e, #0ea5e9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                marginBottom: "8px",
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: "24px",
                color: "white",
                fontWeight: 500,
                marginBottom: "8px",
              }}>
                {stat.label}
              </div>
              <div style={{ fontSize: "16px", color: "#64748b" }}>
                {stat.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// CTA Scene - Call to action
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({ frame, fps, config: { damping: 10 } });
  const buttonPulse = Math.sin(frame * 0.1) * 0.03 + 1;
  
  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #7c3aed 100%)",
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        transform: `scale(${scale})`,
      }}>
        {/* Logo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "20px",
          marginBottom: "40px",
        }}>
          <div style={{
            width: "80px",
            height: "80px",
            borderRadius: "20px",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "40px",
          }}>
            🎙️
          </div>
          <div style={{
            fontSize: "56px",
            fontWeight: 800,
            color: "white",
          }}>
            HomeCare AI
          </div>
        </div>
        
        <h2 style={{
          fontSize: "48px",
          fontWeight: 700,
          color: "white",
          textAlign: "center",
          marginBottom: "32px",
        }}>
          Ready to Transform Your Agency?
        </h2>
        
        {/* CTA Button */}
        <div style={{
          transform: `scale(${buttonPulse})`,
          background: "white",
          borderRadius: "16px",
          padding: "24px 60px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
          marginBottom: "32px",
        }}>
          <span style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#2563eb",
          }}>
            Start Your Free Trial
          </span>
        </div>
        
        <p style={{
          fontSize: "20px",
          color: "rgba(255,255,255,0.8)",
        }}>
          No credit card required • Setup in minutes
        </p>
      </div>
    </AbsoluteFill>
  );
};

// ============ MAIN COMPOSITION ============
export const DemoVideoV3: React.FC<{ showAudio?: boolean }> = ({ showAudio = false }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* HOOK */}
      <Sequence from={SCENE_TIMING.hook.from} durationInFrames={SCENE_TIMING.hook.duration}>
        <HookScene />
        {showAudio && <Audio src={staticFile("segments-v3/01-hook.mp3")} />}
      </Sequence>
      
      {/* CRM */}
      <Sequence from={SCENE_TIMING.crm.from} durationInFrames={SCENE_TIMING.crm.duration}>
        <CRMScene />
        {showAudio && <Audio src={staticFile("segments-v3/02-crm.mp3")} />}
      </Sequence>
      
      {/* RECORD */}
      <Sequence from={SCENE_TIMING.record.from} durationInFrames={SCENE_TIMING.record.duration}>
        <RecordScene />
        {showAudio && <Audio src={staticFile("segments-v3/03-record.mp3")} />}
      </Sequence>
      
      {/* AI PROCESS */}
      <Sequence from={SCENE_TIMING.aiProcess.from} durationInFrames={SCENE_TIMING.aiProcess.duration}>
        <AIProcessScene />
        {showAudio && <Audio src={staticFile("segments-v3/04-ai.mp3")} />}
      </Sequence>
      
      {/* RESULTS */}
      <Sequence from={SCENE_TIMING.results.from} durationInFrames={SCENE_TIMING.results.duration}>
        <ResultsScene />
        {showAudio && <Audio src={staticFile("segments-v3/05-results.mp3")} />}
      </Sequence>
      
      {/* CTA */}
      <Sequence from={SCENE_TIMING.cta.from} durationInFrames={SCENE_TIMING.cta.duration}>
        <CTAScene />
        {showAudio && <Audio src={staticFile("segments-v3/06-cta.mp3")} />}
      </Sequence>
    </AbsoluteFill>
  );
};
