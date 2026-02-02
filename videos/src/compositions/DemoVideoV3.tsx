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
  // HOOK - Establish the problem and solution (20s, audio: 19.3s)
  hook:       { from: 0,    duration: 600 },   // Pain point + solution intro
  
  // CORE VALUE - CRM + AI Automation (51s)
  crm:        { from: 600,  duration: 570 },   // Healthcare CRM (audio: 18.2s)
  record:     { from: 1170, duration: 500 },   // Record/Upload (audio: 15.7s)
  aiProcess:  { from: 1670, duration: 480 },   // AI → Billing → Contract (audio: 15.3s)
  
  // CTA - Close the deal (27s)
  results:    { from: 2150, duration: 540 },   // Time savings (audio: 17.4s)
  cta:        { from: 2690, duration: 330 },   // Call to action (audio: 10.1s)
  
  total: 3020, // ~101 seconds (buffer for transitions)
};

// ============ SCENE COMPONENTS ============

// Hook Scene - Problem + Solution
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const phase1 = frame < 180; // First 6 seconds - problem
  const phase2 = frame >= 180 && frame < 360; // Next 6 seconds - transition
  const phase3 = frame >= 360; // Last 8 seconds - solution
  
  const problemOpacity = interpolate(frame, [0, 30, 150, 180], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const solutionOpacity = interpolate(frame, [200, 280], [0, 1], { extrapolateRight: "clamp" });
  const logoScale = spring({ frame: frame - 240, fps, config: { damping: 12 } });
  const taglineOpacity = interpolate(frame, [320, 400], [0, 1], { extrapolateRight: "clamp" });
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* Gradient background */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: phase3 
          ? "linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #7c3aed 100%)"
          : "radial-gradient(ellipse at top, #1e3a5f 0%, #0f172a 60%)",
        transition: "background 0.5s",
      }} />
      
      {/* Problem statement */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: problemOpacity,
        padding: "60px",
      }}>
        <h1 style={{
          fontSize: "64px",
          fontWeight: 700,
          color: "white",
          textAlign: "center",
          marginBottom: "40px",
        }}>
          Still Using Generic CRMs for Home Care?
        </h1>
        <div style={{
          display: "flex",
          gap: "40px",
        }}>
          {[
            { stat: "Hours", label: "on manual contracts" },
            { stat: "Lost", label: "billing opportunities" },
            { stat: "Scattered", label: "client data" },
          ].map((item, i) => (
            <div key={i} style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "2px solid #ef4444",
              borderRadius: "16px",
              padding: "24px 40px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "36px", fontWeight: 700, color: "#ef4444" }}>
                {item.stat}
              </div>
              <div style={{ fontSize: "18px", color: "#fca5a5" }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Solution - Brand reveal */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: solutionOpacity,
        padding: "60px",
      }}>
        {/* Logo */}
        <div style={{
          transform: `scale(${Math.max(0, logoScale)})`,
          display: "flex",
          alignItems: "center",
          gap: "24px",
          marginBottom: "40px",
        }}>
          <div style={{
            width: "100px",
            height: "100px",
            borderRadius: "24px",
            background: "rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "50px",
          }}>
            🎙️
          </div>
          <div style={{
            fontSize: "72px",
            fontWeight: 800,
            color: "white",
            textShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}>
            HomeCare AI
          </div>
        </div>
        
        {/* Tagline */}
        <div style={{
          opacity: taglineOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontSize: "36px",
            color: "white",
            fontWeight: 600,
            marginBottom: "16px",
          }}>
            The First Healthcare-Centric CRM
          </div>
          <div style={{
            fontSize: "28px",
            color: "rgba(255,255,255,0.9)",
          }}>
            Powered by AI Automation
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
