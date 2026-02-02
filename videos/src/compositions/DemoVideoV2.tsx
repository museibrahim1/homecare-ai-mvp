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
// Professional Demo Video - Hook → Features → CTA
// Total: ~2 minutes (120 seconds)

const SCENE_TIMING = {
  // INTRO SECTION - Hook the viewer (27s)
  hook:        { from: 0,    duration: 570 },   // Problem statement (19s, audio: 17.4s)
  solution:    { from: 570,  duration: 270 },   // Introduce solution (9s, audio: 7.9s)
  
  // MAIN SECTION - Show the workflow (54s)
  workflow1:   { from: 840,  duration: 420 },   // Record assessment (14s, audio: 12.1s)
  workflow2:   { from: 1260, duration: 420 },   // AI processes (14s, audio: 12.8s)
  workflow3:   { from: 1680, duration: 480 },   // Generate contract (16s, audio: 14.0s)
  results:     { from: 2160, duration: 300 },   // Time savings (10s, audio: 8.7s)
  
  // FEATURES SECTION - Build desire (66s)
  dashboard:   { from: 2460, duration: 360 },   // Dashboard overview (12s, audio: 10.6s)
  crm:         { from: 2820, duration: 450 },   // CRM & Pipeline (15s, audio: 13.7s)
  ai:          { from: 3270, duration: 540 },   // AI Features (18s, audio: 16.9s)
  integrations:{ from: 3810, duration: 420 },   // Integrations (14s, audio: 12.6s)
  reports:     { from: 4230, duration: 390 },   // Reports & Billing (13s, audio: 11.8s)
  compliance:  { from: 4620, duration: 270 },   // HIPAA/Security (9s, audio: 8.1s)
  
  // OUTRO SECTION - Close the deal (46s)
  testimonial: { from: 4890, duration: 450 },   // Social proof (15s, audio: 13.7s)
  pricing:     { from: 5340, duration: 360 },   // Pricing (12s, audio: 11.0s)
  cta:         { from: 5700, duration: 330 },   // Call to action (11s, audio: 10.2s)
  endcard:     { from: 6030, duration: 240 },   // End card (8s, audio: 6.7s)
  
  total: 6270, // 209 seconds (~3.5 minutes)
};

// ============ SCENE COMPONENTS ============

// Hook Scene - Problem Statement
const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const textOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const statsScale = spring({ frame: frame - 60, fps, config: { damping: 12 } });
  const problemScale = spring({ frame: frame - 120, fps, config: { damping: 12 } });
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* Gradient overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at top, #1e3a5f 0%, transparent 60%)",
      }} />
      
      {/* Main content */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "60px",
        opacity: textOpacity,
      }}>
        <h1 style={{
          fontSize: "64px",
          fontWeight: 700,
          color: "white",
          textAlign: "center",
          marginBottom: "40px",
        }}>
          Running a Home Care Agency?
        </h1>
        
        {/* Pain points */}
        <div style={{
          display: "flex",
          gap: "40px",
          marginBottom: "60px",
          transform: `scale(${statsScale})`,
        }}>
          {[
            { stat: "6+ hours", label: "spent on paperwork daily" },
            { stat: "40%", label: "revenue lost to admin" },
            { stat: "2-3 days", label: "to create a contract" },
          ].map((item, i) => (
            <div key={i} style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "2px solid #ef4444",
              borderRadius: "16px",
              padding: "30px 40px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: "48px", fontWeight: 700, color: "#ef4444" }}>
                {item.stat}
              </div>
              <div style={{ fontSize: "20px", color: "#fca5a5" }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
        
        {/* Problem statement */}
        <div style={{
          fontSize: "36px",
          color: "#94a3b8",
          textAlign: "center",
          transform: `scale(${problemScale})`,
        }}>
          Manual assessments. Handwritten notes. Hours of typing.
          <br />
          <span style={{ color: "#f87171", fontWeight: 600 }}>
            There has to be a better way.
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Solution Intro Scene - Shows actual app landing page
const SolutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const logoScale = spring({ frame, fps, config: { damping: 10 } });
  const taglineOpacity = interpolate(frame, [40, 70], [0, 1], { extrapolateRight: "clamp" });
  const screenshotOpacity = interpolate(frame, [60, 100], [0, 1], { extrapolateRight: "clamp" });
  
  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #7c3aed 100%)",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "60px",
        gap: "60px",
      }}>
        {/* Left - Branding */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}>
          {/* Logo with microphone icon */}
          <div style={{
            transform: `scale(${logoScale})`,
            marginBottom: "30px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
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
              fontSize: "64px",
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
          }}>
            <div style={{
              fontSize: "40px",
              color: "white",
              fontWeight: 600,
              marginBottom: "12px",
            }}>
              Turn Voice Assessments Into Contracts
            </div>
            <div style={{
              fontSize: "28px",
              color: "rgba(255,255,255,0.9)",
            }}>
              In Minutes, Not Hours
            </div>
          </div>
        </div>
        
        {/* Right - App Screenshot */}
        <div style={{
          flex: 1,
          opacity: screenshotOpacity,
          transform: `scale(${logoScale * 0.95})`,
        }}>
          <div style={{
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 25px 80px rgba(0,0,0,0.4)",
          }}>
            <Img
              src={staticFile("screenshots-v2/01-landing-hero.png")}
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "500px",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Workflow Step Scene - Now with optional screenshot
const WorkflowStepScene: React.FC<{
  stepNumber: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  screenshotPath?: string;
}> = ({ stepNumber, title, description, icon, color, screenshotPath }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({ frame, fps, config: { damping: 12 } });
  const contentOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" });
  const screenshotScale = spring({ frame: frame - 30, fps, config: { damping: 15 } });
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* Top accent bar */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "6px",
        background: `linear-gradient(90deg, ${color}, ${color}88)`,
      }} />
      
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "60px 80px",
        gap: "60px",
      }}>
        {/* Left - Step info */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Step indicator */}
          <div style={{
            transform: `scale(${scale})`,
            display: "flex",
            alignItems: "center",
            gap: "24px",
            marginBottom: "30px",
          }}>
            <div style={{
              width: "100px",
              height: "100px",
              borderRadius: "24px",
              background: `linear-gradient(135deg, ${color}, ${color}88)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "48px",
              boxShadow: `0 0 40px ${color}44`,
            }}>
              {icon}
            </div>
            <div style={{
              fontSize: "20px",
              color: color,
              fontWeight: 600,
              letterSpacing: "2px",
            }}>
              STEP {stepNumber}
            </div>
          </div>
          
          {/* Content */}
          <div style={{ opacity: contentOpacity }}>
            <h2 style={{
              fontSize: "48px",
              fontWeight: 700,
              color: "white",
              marginBottom: "20px",
            }}>
              {title}
            </h2>
            <p style={{
              fontSize: "24px",
              color: "#94a3b8",
              lineHeight: 1.6,
            }}>
              {description}
            </p>
          </div>
        </div>
        
        {/* Right - Screenshot */}
        {screenshotPath && (
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
                src={staticFile(screenshotPath)}
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "550px",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// Results/Time Savings Scene
const ResultsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const beforeScale = spring({ frame, fps, config: { damping: 12 } });
  const afterScale = spring({ frame: frame - 30, fps, config: { damping: 12 } });
  const arrowOpacity = interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp" });
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "60px",
      }}>
        <h2 style={{
          fontSize: "48px",
          fontWeight: 700,
          color: "white",
          marginBottom: "60px",
        }}>
          The Transformation
        </h2>
        
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "60px",
        }}>
          {/* Before */}
          <div style={{
            transform: `scale(${beforeScale})`,
            background: "rgba(239, 68, 68, 0.1)",
            border: "2px solid #ef4444",
            borderRadius: "24px",
            padding: "40px 60px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "24px", color: "#ef4444", marginBottom: "10px" }}>
              BEFORE
            </div>
            <div style={{ fontSize: "72px", fontWeight: 700, color: "#ef4444" }}>
              2-3 Days
            </div>
            <div style={{ fontSize: "20px", color: "#fca5a5" }}>
              per contract
            </div>
          </div>
          
          {/* Arrow */}
          <div style={{
            fontSize: "80px",
            opacity: arrowOpacity,
          }}>
            ➡️
          </div>
          
          {/* After */}
          <div style={{
            transform: `scale(${afterScale})`,
            background: "rgba(34, 197, 94, 0.1)",
            border: "2px solid #22c55e",
            borderRadius: "24px",
            padding: "40px 60px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "24px", color: "#22c55e", marginBottom: "10px" }}>
              AFTER
            </div>
            <div style={{ fontSize: "72px", fontWeight: 700, color: "#22c55e" }}>
              15 Minutes
            </div>
            <div style={{ fontSize: "86e6dc" }}>
              per contract
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Feature Showcase with Screenshot
const FeatureScene: React.FC<{
  title: string;
  subtitle: string;
  features: string[];
  screenshotPath?: string;
  gradient: string;
}> = ({ title, subtitle, features, screenshotPath, gradient }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const screenshotScale = spring({ frame: frame - 15, fps, config: { damping: 15 } });
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* Gradient accent */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "8px",
        background: gradient,
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
          <h2 style={{
            fontSize: "52px",
            fontWeight: 700,
            color: "white",
            marginBottom: "12px",
          }}>
            {title}
          </h2>
          <p style={{
            fontSize: "24px",
            color: "#64748b",
            marginBottom: "40px",
          }}>
            {subtitle}
          </p>
          
          {/* Feature list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {features.map((feature, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                opacity: interpolate(
                  frame,
                  [30 + i * 10, 45 + i * 10],
                  [0, 1],
                  { extrapolateRight: "clamp" }
                ),
              }}>
                <div style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: gradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                }}>
                  ✓
                </div>
                <span style={{ fontSize: "22px", color: "#e2e8f0" }}>
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Right - Screenshot */}
        {screenshotPath && (
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
                src={staticFile(screenshotPath)}
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "600px",
                  objectFit: "contain",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// Integrations Scene - Shows actual app integrations page
const IntegrationsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const integrations = [
    { name: "Google Calendar", icon: "📅", color: "#4285F4" },
    { name: "Gmail", icon: "✉️", color: "#EA4335" },
    { name: "Google Drive", icon: "📁", color: "#34A853" },
    { name: "Stripe", icon: "💳", color: "#635BFF" },
    { name: "Monday.com", icon: "📊", color: "#FF3D57" },
    { name: "Webhooks", icon: "🔗", color: "#8B5CF6" },
  ];
  
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const screenshotScale = spring({ frame: frame - 30, fps, config: { damping: 15 } });
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* Gradient accent */}
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "8px",
        background: "linear-gradient(135deg, #4285F4, #EA4335, #34A853, #635BFF)",
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
          <h2 style={{
            fontSize: "52px",
            fontWeight: 700,
            color: "white",
            marginBottom: "16px",
          }}>
            Integrates With Your Tools
          </h2>
          <p style={{
            fontSize: "24px",
            color: "#64748b",
            marginBottom: "40px",
          }}>
            Connect to the apps you already use
          </p>
          
          {/* Integration icons */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "20px",
          }}>
            {integrations.map((int, i) => {
              const delay = i * 8;
              const scale = spring({ frame: frame - 40 - delay, fps, config: { damping: 12 } });
              
              return (
                <div key={i} style={{
                  transform: `scale(${scale})`,
                  background: "rgba(255,255,255,0.05)",
                  border: `2px solid ${int.color}44`,
                  borderRadius: "16px",
                  padding: "16px 24px",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}>
                  <div style={{ fontSize: "28px" }}>
                    {int.icon}
                  </div>
                  <div style={{ fontSize: "16px", color: "white", fontWeight: 500 }}>
                    {int.name}
                  </div>
                </div>
              );
            })}
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
              src={staticFile("screenshots-v2/08-integrations.png")}
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "600px",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Compliance Scene
const ComplianceScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({ frame, fps, config: { damping: 12 } });
  
  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: "80px",
        transform: `scale(${scale})`,
      }}>
        <div style={{
          fontSize: "120px",
          background: "rgba(34, 197, 94, 0.2)",
          borderRadius: "30px",
          padding: "40px",
        }}>
          🔒
        </div>
        <div>
          <h2 style={{
            fontSize: "56px",
            fontWeight: 700,
            color: "white",
            marginBottom: "20px",
          }}>
            HIPAA Compliant
          </h2>
          <p style={{
            fontSize: "28px",
            color: "#22c55e",
          }}>
            Enterprise-grade security • SOC 2 Ready • Encrypted Data
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Testimonial Scene
const TestimonialScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const quoteOpacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const authorScale = spring({ frame: frame - 60, fps, config: { damping: 12 } });
  
  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "80px",
        textAlign: "center",
      }}>
        {/* Quote */}
        <div style={{
          fontSize: "100px",
          opacity: 0.3,
          marginBottom: "-20px",
        }}>
          "
        </div>
        <p style={{
          fontSize: "38px",
          color: "white",
          maxWidth: "1000px",
          lineHeight: 1.6,
          fontStyle: "italic",
          opacity: quoteOpacity,
        }}>
          HomeCare AI cut our contract generation time from hours to minutes.
          We've increased our client capacity by 40% without adding staff.
        </p>
        
        {/* Author */}
        <div style={{
          marginTop: "50px",
          transform: `scale(${authorScale})`,
        }}>
          <div style={{
            fontSize: "28px",
            color: "#0ea5e9",
            fontWeight: 600,
          }}>
            Sarah Martinez
          </div>
          <div style={{
            fontSize: "20px",
            color: "#64748b",
          }}>
            Owner, Sunshine Home Care • Texas
          </div>
        </div>
        
        {/* Stars */}
        <div style={{
          marginTop: "30px",
          fontSize: "32px",
        }}>
          ⭐⭐⭐⭐⭐
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Pricing Scene
const PricingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const plans = [
    { name: "Starter", price: "$49", features: "25 contracts/mo" },
    { name: "Growth", price: "$99", features: "100 contracts/mo", popular: true },
    { name: "Pro", price: "$199", features: "300 contracts/mo" },
  ];
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "60px",
      }}>
        <h2 style={{
          fontSize: "52px",
          fontWeight: 700,
          color: "white",
          marginBottom: "50px",
        }}>
          Simple, Transparent Pricing
        </h2>
        
        <div style={{
          display: "flex",
          gap: "30px",
        }}>
          {plans.map((plan, i) => {
            const scale = spring({ frame: frame - i * 10, fps, config: { damping: 12 } });
            
            return (
              <div key={i} style={{
                transform: `scale(${scale})`,
                background: plan.popular 
                  ? "linear-gradient(135deg, #0ea5e9, #2563eb)"
                  : "rgba(255,255,255,0.05)",
                border: plan.popular ? "none" : "1px solid #334155",
                borderRadius: "24px",
                padding: "40px 50px",
                textAlign: "center",
                minWidth: "250px",
              }}>
                {plan.popular && (
                  <div style={{
                    background: "#fbbf24",
                    color: "#0f172a",
                    padding: "6px 16px",
                    borderRadius: "20px",
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "16px",
                    display: "inline-block",
                  }}>
                    MOST POPULAR
                  </div>
                )}
                <div style={{
                  fontSize: "28px",
                  color: "white",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}>
                  {plan.name}
                </div>
                <div style={{
                  fontSize: "52px",
                  color: "white",
                  fontWeight: 700,
                }}>
                  {plan.price}
                  <span style={{ fontSize: "20px", opacity: 0.7 }}>/mo</span>
                </div>
                <div style={{
                  fontSize: "18px",
                  color: plan.popular ? "white" : "#64748b",
                  marginTop: "12px",
                }}>
                  {plan.features}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// CTA Scene
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
        <h2 style={{
          fontSize: "64px",
          fontWeight: 700,
          color: "white",
          textAlign: "center",
          marginBottom: "24px",
          textShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}>
          Ready to Transform<br />Your Agency?
        </h2>
        
        <p style={{
          fontSize: "28px",
          color: "white",
          opacity: 0.9,
          marginBottom: "50px",
        }}>
          Join 500+ home care agencies saving hours every day
        </p>
        
        {/* CTA Button */}
        <div style={{
          background: "white",
          color: "#2563eb",
          fontSize: "32px",
          fontWeight: 700,
          padding: "24px 60px",
          borderRadius: "16px",
          transform: `scale(${buttonPulse})`,
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
        }}>
          Start Your Free Trial →
        </div>
        
        <p style={{
          fontSize: "20px",
          color: "white",
          opacity: 0.8,
          marginTop: "24px",
        }}>
          No credit card required • 14-day free trial
        </p>
      </div>
    </AbsoluteFill>
  );
};

// End Card
const EndCardScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const scale = spring({ frame, fps, config: { damping: 12 } });
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        transform: `scale(${scale})`,
      }}>
        <div style={{
          fontSize: "72px",
          fontWeight: 800,
          color: "white",
          marginBottom: "24px",
        }}>
          🏠 HomeCare AI
        </div>
        <div style={{
          fontSize: "32px",
          color: "#0ea5e9",
          marginBottom: "40px",
        }}>
          homecareai.com
        </div>
        <div style={{
          display: "flex",
          gap: "40px",
          fontSize: "24px",
          color: "#64748b",
        }}>
          <span>📧 hello@homecareai.com</span>
          <span>📞 1-800-CARE-AI</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ============ MAIN COMPOSITION ============

interface DemoVideoV2Props {
  showAudio?: boolean;
}

export const DemoVideoV2: React.FC<DemoVideoV2Props> = ({ showAudio = false }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      {/* INTRO SECTION */}
      <Sequence from={SCENE_TIMING.hook.from} durationInFrames={SCENE_TIMING.hook.duration}>
        <HookScene />
        {showAudio && <Audio src={staticFile("segments-v2/01-hook.mp3")} />}
      </Sequence>
      
      <Sequence from={SCENE_TIMING.solution.from} durationInFrames={SCENE_TIMING.solution.duration}>
        <SolutionScene />
        {showAudio && <Audio src={staticFile("segments-v2/02-solution.mp3")} />}
      </Sequence>
      
      {/* WORKFLOW SECTION */}
      <Sequence from={SCENE_TIMING.workflow1.from} durationInFrames={SCENE_TIMING.workflow1.duration}>
        <WorkflowStepScene
          stepNumber={1}
          title="Record Your Assessment"
          description="Use your phone or any device to record client assessments. Speak naturally - our AI understands care-specific terminology and speaker identification."
          icon="🎙️"
          color="#0ea5e9"
          screenshotPath="screenshots-v2/04-assessments.png"
        />
        {showAudio && <Audio src={staticFile("segments-v2/03-workflow1.mp3")} />}
      </Sequence>
      
      <Sequence from={SCENE_TIMING.workflow2.from} durationInFrames={SCENE_TIMING.workflow2.duration}>
        <WorkflowStepScene
          stepNumber={2}
          title="AI Processes Everything"
          description="Automatic transcription, speaker diarization, billable item extraction, and service categorization. One click runs the entire pipeline."
          icon="🤖"
          color="#8b5cf6"
          screenshotPath="screenshots-v2/09-visit-pipeline.png"
        />
        {showAudio && <Audio src={staticFile("segments-v2/04-workflow2.mp3")} />}
      </Sequence>
      
      <Sequence from={SCENE_TIMING.workflow3.from} durationInFrames={SCENE_TIMING.workflow3.duration}>
        <WorkflowStepScene
          stepNumber={3}
          title="Generate Professional Contracts"
          description="AI creates complete, ready-to-sign contracts with services, schedules, and pricing. Export to PDF, email directly, or use your custom templates."
          icon="📄"
          color="#22c55e"
          screenshotPath="screenshots-v2/10-contract-preview.png"
        />
        {showAudio && <Audio src={staticFile("segments-v2/05-workflow3.mp3")} />}
      </Sequence>
      
      <Sequence from={SCENE_TIMING.results.from} durationInFrames={SCENE_TIMING.results.duration}>
        <ResultsScene />
        {showAudio && <Audio src={staticFile("segments-v2/06-results.mp3")} />}
      </Sequence>
      
      {/* FEATURES SECTION */}
      <Sequence from={SCENE_TIMING.dashboard.from} durationInFrames={SCENE_TIMING.dashboard.duration}>
        <FeatureScene
          title="Powerful Dashboard"
          subtitle="Everything at a glance"
          features={[
            "Real-time activity feed",
            "Client and caregiver overview",
            "Pending assessments tracker",
            "Quick action buttons",
          ]}
          screenshotPath="screenshots-v2/03-dashboard.png"
          gradient="linear-gradient(135deg, #0ea5e9, #2563eb)"
        />
        {showAudio && <Audio src={staticFile("segments-v2/07-dashboard.mp3")} />}
      </Sequence>
      
      <Sequence from={SCENE_TIMING.crm.from} durationInFrames={SCENE_TIMING.crm.duration}>
        <FeatureScene
          title="Full CRM & Pipeline"
          subtitle="Track every client from lead to active"
          features={[
            "Kanban-style sales pipeline",
            "Complete client profiles",
            "Caregiver matching algorithm",
            "Care level tracking",
            "Medical history management",
          ]}
          screenshotPath="screenshots-v2/06-pipeline.png"
          gradient="linear-gradient(135deg, #8b5cf6, #d946ef)"
        />
        {showAudio && <Audio src={staticFile("segments-v2/08-crm.mp3")} />}
      </Sequence>
      
      <Sequence from={SCENE_TIMING.ai.from} durationInFrames={SCENE_TIMING.ai.duration}>
        <FeatureScene
          title="Advanced AI Features"
          subtitle="Powered by state-of-the-art AI"
          features={[
            "Voice identification technology",
            "Multi-speaker diarization",
            "Automatic billing extraction",
            "Smart contract generation",
            "Visit note automation",
          ]}
          screenshotPath="screenshots-v2/09-visit-pipeline.png"
          gradient="linear-gradient(135deg, #f59e0b, #ef4444)"
        />
        {showAudio && <Audio src={staticFile("segments-v2/09-ai.mp3")} />}
      </Sequence>
      
      <Sequence from={SCENE_TIMING.integrations.from} durationInFrames={SCENE_TIMING.integrations.duration}>
        <IntegrationsScene />
        {showAudio && <Audio src={staticFile("segments-v2/10-integrations.mp3")} />}
      </Sequence>
      
      <Sequence from={SCENE_TIMING.reports.from} durationInFrames={SCENE_TIMING.reports.duration}>
        <FeatureScene
          title="Reports & Billing"
          subtitle="Get paid faster with accurate billing"
          features={[
            "Automated timesheet generation",
            "Billing reports by period",
            "CSV export for payroll",
            "Client activity tracking",
          ]}
          screenshotPath="screenshots-v2/07-reports.png"
          gradient="linear-gradient(135deg, #22c55e, #14b8a6)"
        />
        {showAudio && <Audio src={staticFile("segments-v2/11-reports.mp3")} />}
      </Sequence>
      
      <Sequence from={SCENE_TIMING.compliance.from} durationInFrames={SCENE_TIMING.compliance.duration}>
        <ComplianceScene />
        {showAudio && <Audio src={staticFile("segments-v2/12-compliance.mp3")} />}
      </Sequence>
      
      {/* OUTRO SECTION */}
      <Sequence from={SCENE_TIMING.testimonial.from} durationInFrames={SCENE_TIMING.testimonial.duration}>
        <TestimonialScene />
        {showAudio && <Audio src={staticFile("segments-v2/13-testimonial.mp3")} />}
      </Sequence>
      
      <Sequence from={SCENE_TIMING.pricing.from} durationInFrames={SCENE_TIMING.pricing.duration}>
        <PricingScene />
        {showAudio && <Audio src={staticFile("segments-v2/14-pricing.mp3")} />}
      </Sequence>
      
      <Sequence from={SCENE_TIMING.cta.from} durationInFrames={SCENE_TIMING.cta.duration}>
        <CTAScene />
        {showAudio && <Audio src={staticFile("segments-v2/15-cta.mp3")} />}
      </Sequence>
      
      <Sequence from={SCENE_TIMING.endcard.from} durationInFrames={SCENE_TIMING.endcard.duration}>
        <EndCardScene />
        {showAudio && <Audio src={staticFile("segments-v2/16-endcard.mp3")} />}
      </Sequence>
    </AbsoluteFill>
  );
};
