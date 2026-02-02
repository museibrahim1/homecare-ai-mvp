import { Composition } from "remotion";
import { HelloWorld } from "./compositions/HelloWorld";
import { DemoVideo } from "./compositions/DemoVideo";
import { DemoVideoV2 } from "./compositions/DemoVideoV2";
import { DemoVideoV3 } from "./compositions/DemoVideoV3";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          text: "Hello World",
        }}
      />

      {/* Main Demo Video - 94 seconds total (12 scenes, ElevenLabs audio) */}
      <Composition
        id="DemoVideo"
        component={DemoVideo}
        durationInFrames={2820}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          showAudio: false,
        }}
      />

      {/* Demo Video with Audio */}
      <Composition
        id="DemoVideoWithAudio"
        component={DemoVideo}
        durationInFrames={2820}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          showAudio: true,
        }}
      />

      {/* ===== NEW SALES VIDEO V2 ===== */}
      {/* Professional Sales Demo - 3.5 minutes */}
      <Composition
        id="SalesDemo"
        component={DemoVideoV2}
        durationInFrames={6270}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          showAudio: false,
        }}
      />

      {/* Sales Demo with Audio */}
      <Composition
        id="SalesDemoWithAudio"
        component={DemoVideoV2}
        durationInFrames={6270}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          showAudio: true,
        }}
      />

      {/* ===== FOCUSED 88-SECOND VIDEO ===== */}
      {/* Short & focused - Healthcare CRM + AI Automation */}
      <Composition
        id="QuickDemo"
        component={DemoVideoV3}
        durationInFrames={2640}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          showAudio: false,
        }}
      />

      {/* Quick Demo with Audio */}
      <Composition
        id="QuickDemoWithAudio"
        component={DemoVideoV3}
        durationInFrames={2640}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          showAudio: true,
        }}
      />
    </>
  );
};
