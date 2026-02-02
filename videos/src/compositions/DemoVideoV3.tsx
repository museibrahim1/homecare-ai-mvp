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

// AI Process Scene - Stylish pipeline visualization
const AIProcessScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const step1Scale = spring({ frame: frame - 30, fps, config: { damping: 12 } });
  const step2Scale = spring({ frame: frame - 60, fps, config: { damping: 12 } });
  const step3Scale = spring({ frame: frame - 90, fps, config: { damping: 12 } });
  const arrow1Opacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp" });
  const arrow2Opacity = interpolate(frame, [90, 120], [0, 1], { extrapolateRight: "clamp" });
  const screenshotOpacity = interpolate(frame, [150, 200], [0, 1], { extrapolateRight: "clamp" });
  const glowPulse = Math.sin(frame * 0.1) * 0.2 + 0.8;
  
  const steps = [
    { icon: "🎙️", title: "Transcribe", color: "#0ea5e9", gradient: "linear-gradient(135deg, #0ea5e9, #0284c7)" },
    { icon: "💵", title: "Extract Billing", color: "#22c55e", gradient: "linear-gradient(135deg, #22c55e, #16a34a)" },
    { icon: "📋", title: "Generate Contract", color: "#8b5cf6", gradient: "linear-gradient(135deg, #8b5cf6, #7c3aed)" },
  ];
  
  const scales = [step1Scale, step2Scale, step3Scale];
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* Animated gradient background */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse at 50% 30%, rgba(34, 197, 94, ${glowPulse * 0.15}) 0%, transparent 50%)`,
      }} />
      
      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "50px 80px",
      }}>
        {/* Header */}
        <div style={{ opacity: titleOpacity, textAlign: "center", marginBottom: "30px" }}>
          <h2 style={{
            fontSize: "44px",
            fontWeight: 700,
            color: "white",
          }}>
            From Voice to Contract in <span style={{ color: "#22c55e" }}>Minutes</span>
          </h2>
        </div>
        
        {/* Stylish Steps with Arrows */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "20px",
          marginBottom: "30px",
        }}>
          {steps.map((step, i) => (
            <React.Fragment key={i}>
              {/* Step Card */}
              <div style={{
                transform: `scale(${scales[i]})`,
                background: step.gradient,
                borderRadius: "20px",
                padding: "28px 36px",
                textAlign: "center",
                boxShadow: `0 15px 40px ${step.color}44`,
                minWidth: "200px",
              }}>
                <div style={{
                  fontSize: "40px",
                  marginBottom: "12px",
                  filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
                }}>
                  {step.icon}
                </div>
                <div style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "white",
                  textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}>
                  {step.title}
                </div>
              </div>
              
              {/* Arrow between steps */}
              {i < 2 && (
                <div style={{
                  opacity: i === 0 ? arrow1Opacity : arrow2Opacity,
                  fontSize: "36px",
                  color: "#64748b",
                }}>
                  →
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
        
        {/* Screenshots */}
        <div style={{
          flex: 1,
          display: "flex",
          gap: "24px",
          opacity: screenshotOpacity,
        }}>
          <div style={{
            flex: 1,
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            border: "1px solid #334155",
          }}>
            <Img
              src={staticFile("screenshots-v2/09-visit-pipeline.png")}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div style={{
            flex: 1,
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
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

// Results Scene - Engaging stats with animated counters
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const titleOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;
  
  // Animated number for hours
  const hoursCount = Math.min(6, Math.floor(interpolate(frame, [60, 120], [0, 6], { extrapolateRight: "clamp" })));
  const minutesCount = Math.min(6, Math.floor(interpolate(frame, [120, 180], [0, 6], { extrapolateRight: "clamp" })));
  const percentCount = Math.min(100, Math.floor(interpolate(frame, [90, 150], [0, 100], { extrapolateRight: "clamp" })));
  
  const card1Opacity = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: "clamp" });
  const card2Opacity = interpolate(frame, [80, 110], [0, 1], { extrapolateRight: "clamp" });
  const card3Opacity = interpolate(frame, [120, 150], [0, 1], { extrapolateRight: "clamp" });
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* Animated gradient background */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: `radial-gradient(ellipse at 50% 50%, rgba(14, 165, 233, ${glowPulse * 0.15}) 0%, transparent 60%)`,
      }} />
      
      {/* Floating particles */}
      {[...Array(12)].map((_, i) => {
        const x = Math.sin(frame * 0.015 + i * 0.5) * 500 + 960;
        const y = Math.cos(frame * 0.02 + i) * 300 + 540;
        return (
          <div key={i} style={{
            position: "absolute",
            left: x,
            top: y,
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: `rgba(14, 165, 233, ${0.2 + Math.sin(frame * 0.1 + i) * 0.1})`,
            boxShadow: "0 0 12px rgba(14, 165, 233, 0.4)",
          }} />
        );
      })}
      
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "60px",
      }}>
        {/* Main stat - Time transformation */}
        <div style={{
          opacity: titleOpacity,
          textAlign: "center",
          marginBottom: "60px",
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "30px",
            marginBottom: "24px",
          }}>
            <div style={{
              fontSize: "100px",
              fontWeight: 800,
              color: "#ef4444",
              textDecoration: "line-through",
              opacity: 0.6,
            }}>
              {hoursCount}h
            </div>
            <div style={{
              fontSize: "60px",
              color: "#22c55e",
            }}>
              →
            </div>
            <div style={{
              fontSize: "100px",
              fontWeight: 800,
              background: "linear-gradient(135deg, #22c55e, #0ea5e9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              {minutesCount}m
            </div>
          </div>
          <p style={{
            fontSize: "28px",
            color: "#94a3b8",
          }}>
            Contract creation time
          </p>
        </div>
        
        {/* Bottom stats */}
        <div style={{
          display: "flex",
          gap: "50px",
        }}>
          <div style={{
            opacity: card2Opacity,
            textAlign: "center",
            padding: "30px 50px",
            background: "rgba(34, 197, 94, 0.1)",
            borderRadius: "20px",
            border: "1px solid rgba(34, 197, 94, 0.3)",
          }}>
            <div style={{
              fontSize: "56px",
              fontWeight: 700,
              color: "#22c55e",
              marginBottom: "8px",
            }}>
              {percentCount}%
            </div>
            <div style={{ fontSize: "20px", color: "#94a3b8" }}>
              Billables Captured
            </div>
          </div>
          
          <div style={{
            opacity: card3Opacity,
            textAlign: "center",
            padding: "30px 50px",
            background: "rgba(14, 165, 233, 0.1)",
            borderRadius: "20px",
            border: "1px solid rgba(14, 165, 233, 0.3)",
          }}>
            <div style={{
              fontSize: "56px",
              fontWeight: 700,
              color: "#0ea5e9",
              marginBottom: "8px",
            }}>
              Zero
            </div>
            <div style={{ fontSize: "20px", color: "#94a3b8" }}>
              Manual Data Entry
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// CTA Scene - Clean centered logo design
const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const logoScale = spring({ frame, fps, config: { damping: 12 } });
  const titleOpacity = interpolate(frame, [30, 60], [0, 1], { extrapolateRight: "clamp" });
  const buttonOpacity = interpolate(frame, [60, 100], [0, 1], { extrapolateRight: "clamp" });
  const buttonPulse = Math.sin(frame * 0.1) * 0.02 + 1;
  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* Subtle glow behind logo */}
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "400px",
        height: "400px",
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(99, 102, 241, ${glowPulse * 0.2}) 0%, transparent 70%)`,
      }} />
      
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
      }}>
        {/* Logo Icon */}
        <div style={{
          transform: `scale(${logoScale})`,
          marginBottom: "32px",
        }}>
          <div style={{
            width: "120px",
            height: "120px",
            borderRadius: "28px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 20px 60px rgba(99, 102, 241, ${glowPulse * 0.5})`,
          }}>
            {/* Microphone icon */}
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 19v4M8 23h8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        
        {/* Brand name */}
        <h1 style={{
          fontSize: "64px",
          fontWeight: 800,
          color: "white",
          marginBottom: "48px",
          transform: `scale(${logoScale})`,
        }}>
          Homecare AI
        </h1>
        
        {/* Title */}
        <div style={{ opacity: titleOpacity, textAlign: "center", marginBottom: "32px" }}>
          <h2 style={{
            fontSize: "48px",
            fontWeight: 700,
            color: "white",
            marginBottom: "12px",
          }}>
            Ready to Save Hours?
          </h2>
          <p style={{
            fontSize: "24px",
            color: "#94a3b8",
          }}>
            Start your free trial today
          </p>
        </div>
        
        {/* CTA Button */}
        <div style={{
          opacity: buttonOpacity,
          transform: `scale(${buttonPulse})`,
        }}>
          <div style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: "16px",
            padding: "20px 60px",
            boxShadow: `0 15px 50px rgba(99, 102, 241, ${glowPulse * 0.5})`,
          }}>
            <span style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "white",
            }}>
              Get Started Free
            </span>
          </div>
        </div>
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
