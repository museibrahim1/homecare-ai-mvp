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
  // HOOK - Problem + Solution (19s, audio: 18.8s)
  hook:       { from: 0,    duration: 580 },
  
  // CORE VALUE - CRM + AI Automation (45s)
  crm:        { from: 580,  duration: 480 },   // Healthcare CRM (audio: 15.4s)
  record:     { from: 1060, duration: 450 },   // Record/Upload (audio: 14.2s)
  aiProcess:  { from: 1510, duration: 400 },   // AI → Billing → Contract (audio: 12.6s)
  
  // CTA - Close the deal (24s)
  results:    { from: 1910, duration: 430 },   // Time savings (audio: 13.7s)
  cta:        { from: 2340, duration: 300 },   // Call to action (audio: 9.2s)
  
  total: 2640, // 88 seconds
};

// ============ SCENE COMPONENTS ============

// Hook Scene - Vibrant Problem + Solution with Real Branding
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Phase timing
  const showGenericCRMs = frame < 180;  // 0-6s: Show generic CRMs
  const showTransition = frame >= 180 && frame < 300;  // 6-10s: Transition
  const showSolution = frame >= 300;  // 10-20s: Show our solution
  
  // Animations for generic CRMs phase
  const crmCardsScale = spring({ frame, fps, config: { damping: 15 } });
  const crmShake = Math.sin(frame * 0.3) * 3;
  const redXOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp" });
  const problemFadeOut = interpolate(frame, [150, 180], [1, 0], { extrapolateRight: "clamp" });
  
  // Animations for transition
  const burstScale = interpolate(frame, [180, 220], [0, 3], { extrapolateRight: "clamp" });
  const burstOpacity = interpolate(frame, [180, 220, 280], [0, 1, 0], { extrapolateRight: "clamp" });
  
  // Animations for solution reveal
  const solutionOpacity = interpolate(frame, [280, 340], [0, 1], { extrapolateRight: "clamp" });
  const screenshotSlide = interpolate(frame, [320, 400], [100, 0], { extrapolateRight: "clamp" });
  const screenshotScale = spring({ frame: frame - 340, fps, config: { damping: 12 } });
  const taglineSlide = interpolate(frame, [400, 480], [50, 0], { extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [400, 480], [0, 1], { extrapolateRight: "clamp" });
  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;
  
  // Generic CRM logos (text-based for reliability)
  const genericCRMs = [
    { name: "Monday", color: "#FF3D57" },
    { name: "Salesforce", color: "#00A1E0" },
    { name: "HubSpot", color: "#FF7A59" },
  ];
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a", overflow: "hidden" }}>
      {/* Animated gradient background */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: showSolution 
          ? `radial-gradient(ellipse at center, rgba(14, 165, 233, ${glowPulse * 0.3}) 0%, transparent 70%)`
          : "radial-gradient(ellipse at top, #1e3a5f 0%, #0f172a 60%)",
      }} />
      
      {/* Floating particles for energy */}
      {showSolution && [...Array(20)].map((_, i) => {
        const x = Math.sin(frame * 0.02 + i) * 400 + 960;
        const y = Math.cos(frame * 0.015 + i * 2) * 300 + 540;
        const size = 4 + (i % 3) * 2;
        return (
          <div key={i} style={{
            position: "absolute",
            left: x,
            top: y,
            width: size,
            height: size,
            borderRadius: "50%",
            background: `rgba(14, 165, 233, ${0.3 + Math.sin(frame * 0.1 + i) * 0.2})`,
            boxShadow: `0 0 ${size * 2}px rgba(14, 165, 233, 0.5)`,
          }} />
        );
      })}
      
      {/* PHASE 1: Generic CRMs with problems */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: problemFadeOut,
        padding: "60px",
      }}>
        <h1 style={{
          fontSize: "56px",
          fontWeight: 700,
          color: "white",
          textAlign: "center",
          marginBottom: "50px",
          transform: `translateX(${crmShake}px)`,
        }}>
          Still Using Generic CRMs for Home Care?
        </h1>
        
        {/* Generic CRM Cards */}
        <div style={{
          display: "flex",
          gap: "40px",
          marginBottom: "50px",
          transform: `scale(${crmCardsScale})`,
        }}>
          {genericCRMs.map((crm, i) => (
            <div key={i} style={{
              position: "relative",
              background: "rgba(255,255,255,0.05)",
              border: `2px solid ${crm.color}`,
              borderRadius: "20px",
              padding: "40px 50px",
              textAlign: "center",
              transform: `rotate(${Math.sin(frame * 0.1 + i) * 2}deg)`,
            }}>
              <div style={{
                fontSize: "32px",
                fontWeight: 700,
                color: crm.color,
                marginBottom: "8px",
              }}>
                {crm.name}
              </div>
              <div style={{ fontSize: "16px", color: "#64748b" }}>
                Not built for healthcare
              </div>
              
              {/* Red X overlay */}
              <div style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: redXOpacity,
              }}>
                <div style={{
                  fontSize: "120px",
                  color: "#ef4444",
                  fontWeight: 900,
                  textShadow: "0 0 30px rgba(239, 68, 68, 0.8)",
                }}>
                  ✕
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pain points */}
        <div style={{ display: "flex", gap: "30px" }}>
          {[
            "Hours on contracts",
            "Missed billing",
            "No healthcare focus",
          ].map((pain, i) => (
            <div key={i} style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid #ef4444",
              borderRadius: "30px",
              padding: "12px 28px",
              color: "#fca5a5",
              fontSize: "18px",
            }}>
              {pain}
            </div>
          ))}
        </div>
      </div>
      
      {/* PHASE 2: Burst transition */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: burstOpacity,
        pointerEvents: "none",
      }}>
        <div style={{
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #0ea5e9 0%, #2563eb 50%, transparent 70%)",
          transform: `scale(${burstScale})`,
          boxShadow: "0 0 100px rgba(14, 165, 233, 0.8)",
        }} />
      </div>
      
      {/* PHASE 3: Solution with REAL app branding */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: solutionOpacity,
        padding: "60px",
        gap: "60px",
      }}>
        {/* Left side - Tagline */}
        <div style={{
          flex: 1,
          transform: `translateY(${taglineSlide}px)`,
          opacity: taglineOpacity,
        }}>
          <div style={{
            fontSize: "20px",
            color: "#0ea5e9",
            fontWeight: 600,
            letterSpacing: "3px",
            marginBottom: "20px",
          }}>
            INTRODUCING
          </div>
          <h2 style={{
            fontSize: "64px",
            fontWeight: 800,
            color: "white",
            marginBottom: "24px",
            lineHeight: 1.1,
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
          </h2>
          <p style={{
            fontSize: "28px",
            color: "#94a3b8",
            marginBottom: "32px",
          }}>
            Powered by AI Automation
          </p>
          
          {/* Quick benefits */}
          <div style={{ display: "flex", gap: "20px" }}>
            {["Voice → Contract", "Auto Billing", "Built for Care"].map((benefit, i) => (
              <div key={i} style={{
                background: "rgba(14, 165, 233, 0.15)",
                border: "1px solid #0ea5e9",
                borderRadius: "30px",
                padding: "10px 20px",
                color: "#7dd3fc",
                fontSize: "16px",
              }}>
                {benefit}
              </div>
            ))}
          </div>
        </div>
        
        {/* Right side - Real app screenshot */}
        <div style={{
          flex: 1,
          transform: `translateX(${screenshotSlide}px) scale(${Math.max(0.5, screenshotScale)})`,
        }}>
          <div style={{
            borderRadius: "20px",
            overflow: "hidden",
            boxShadow: `0 30px 80px rgba(14, 165, 233, ${glowPulse * 0.4})`,
            border: "2px solid rgba(14, 165, 233, 0.3)",
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
