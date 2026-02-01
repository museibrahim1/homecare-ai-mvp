import { Composition } from "remotion";
import { HelloWorld } from "./compositions/HelloWorld";
import { DemoVideo } from "./compositions/DemoVideo";

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

      {/* Main Demo Video - 72 seconds total (12 scenes with CRM) */}
      <Composition
        id="DemoVideo"
        component={DemoVideo}
        durationInFrames={2160}
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
        durationInFrames={2160}
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
