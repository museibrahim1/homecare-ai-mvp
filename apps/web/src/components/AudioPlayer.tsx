'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
  visitId: string;
  onTimeUpdate?: (timeMs: number) => void;
}

export default function AudioPlayer({ visitId, onTimeUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    // In production, this would fetch the actual audio URL
    // For now, we'll show a placeholder
    setAudioUrl(null);
  }, [visitId]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    onTimeUpdate?.(audioRef.current.currentTime * 1000);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const time = parseFloat(e.target.value);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const skip = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime += seconds;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) {
    return (
      <div className="flex items-center justify-center h-16 bg-gray-50 rounded-lg">
        <p className="text-gray-500 text-sm">
          No audio available. Upload an audio file to enable playback.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => skip(-10)}
          className="p-2 hover:bg-gray-100 rounded-full transition"
          title="Back 10 seconds"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={togglePlay}
          className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </button>

        <button
          onClick={() => skip(10)}
          className="p-2 hover:bg-gray-100 rounded-full transition"
          title="Forward 10 seconds"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        {/* Progress */}
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm text-gray-500 w-12">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer"
          />
          <span className="text-sm text-gray-500 w-12">
            {formatTime(duration)}
          </span>
        </div>

        <button className="p-2 hover:bg-gray-100 rounded-full transition">
          <Volume2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
