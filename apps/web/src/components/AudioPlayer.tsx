'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Mic } from 'lucide-react';

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
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
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

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate waveform bars
  const waveformBars = Array.from({ length: 40 }, (_, i) => {
    const height = Math.random() * 60 + 20;
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const barProgress = (i / 40) * 100;
    const isActive = barProgress <= progress;
    return { height, isActive };
  });

  if (!audioUrl) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center mb-4">
          <Mic className="w-8 h-8 text-dark-400" />
        </div>
        <p className="text-dark-300 text-center mb-1">No audio available</p>
        <p className="text-dark-500 text-sm text-center">
          Upload an audio file to enable playback
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Waveform visualization */}
      <div className="flex items-end justify-center gap-1 h-20 px-4">
        {waveformBars.map((bar, i) => (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-150 ${
              bar.isActive 
                ? 'bg-gradient-to-t from-primary-500 to-accent-cyan' 
                : 'bg-dark-600'
            } ${isPlaying && bar.isActive ? 'waveform-bar' : ''}`}
            style={{ height: `${bar.height}%` }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-dark-400 w-12 text-right font-mono">
          {formatTime(currentTime)}
        </span>
        <div className="flex-1 relative">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full"
          />
        </div>
        <span className="text-sm text-dark-400 w-12 font-mono">
          {formatTime(duration)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => skip(-10)}
          className="p-3 hover:bg-dark-700 rounded-xl transition-colors text-dark-300 hover:text-white"
          title="Back 10 seconds"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={togglePlay}
          className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-2xl hover:from-primary-400 hover:to-primary-500 transition-all shadow-glow flex items-center justify-center"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-1" />
          )}
        </button>

        <button
          onClick={() => skip(10)}
          className="p-3 hover:bg-dark-700 rounded-xl transition-colors text-dark-300 hover:text-white"
          title="Forward 10 seconds"
        >
          <SkipForward className="w-5 h-5" />
        </button>

        <div className="w-px h-8 bg-dark-600 mx-2" />

        <button 
          onClick={toggleMute}
          className="p-3 hover:bg-dark-700 rounded-xl transition-colors text-dark-300 hover:text-white"
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
