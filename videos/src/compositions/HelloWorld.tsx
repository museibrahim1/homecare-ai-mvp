import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type HelloWorldProps = {
  text: string;
};

export const HelloWorld: React.FC<HelloWorldProps> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade in effect
  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Spring animation for scale
  const scale = spring({
    frame,
    fps,
    config: {
      damping: 100,
      stiffness: 200,
      mass: 0.5,
    },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#1a1a2e",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          opacity,
          transform: `scale(${scale})`,
          color: "white",
          fontSize: 100,
          fontWeight: "bold",
          fontFamily: "system-ui, sans-serif",
          textShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};
