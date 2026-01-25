'use client';

import { TranscriptSegment } from '@/lib/types';
import { User, Clock, MessageSquare } from 'lucide-react';

interface TranscriptTimelineProps {
  segments: TranscriptSegment[];
  currentTimeMs?: number;
  onSegmentClick?: (segment: TranscriptSegment) => void;
}

const speakerConfig: Record<string, { gradient: string; bg: string; text: string }> = {
  'SPEAKER_00': { gradient: 'from-primary-500 to-accent-cyan', bg: 'bg-primary-500/10', text: 'text-primary-400' },
  'SPEAKER_01': { gradient: 'from-accent-green to-accent-cyan', bg: 'bg-accent-green/10', text: 'text-accent-green' },
  'SPEAKER_02': { gradient: 'from-accent-purple to-accent-pink', bg: 'bg-accent-purple/10', text: 'text-accent-purple' },
  'SPEAKER_03': { gradient: 'from-accent-orange to-accent-pink', bg: 'bg-accent-orange/10', text: 'text-accent-orange' },
  'Speaker A': { gradient: 'from-primary-500 to-accent-cyan', bg: 'bg-primary-500/10', text: 'text-primary-400' },
  'Speaker B': { gradient: 'from-accent-green to-accent-cyan', bg: 'bg-accent-green/10', text: 'text-accent-green' },
  'Caregiver': { gradient: 'from-primary-500 to-accent-cyan', bg: 'bg-primary-500/10', text: 'text-primary-400' },
  'Client': { gradient: 'from-accent-green to-accent-cyan', bg: 'bg-accent-green/10', text: 'text-accent-green' },
};

const defaultConfig = { gradient: 'from-dark-500 to-dark-400', bg: 'bg-dark-700', text: 'text-dark-300' };

function formatTimestamp(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}:${(minutes % 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export default function TranscriptTimeline({
  segments,
  currentTimeMs,
  onSegmentClick,
}: TranscriptTimelineProps) {
  if (segments.length === 0) {
    return (
      <div className="p-12 text-center">
        <div className="w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-dark-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No transcript available</h3>
        <p className="text-dark-400">Run the transcription pipeline to generate a transcript</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-h-[600px] overflow-y-auto">
      <div className="space-y-4">
        {segments.map((segment, index) => {
          const isActive = currentTimeMs !== undefined && 
            currentTimeMs >= segment.start_ms && 
            currentTimeMs <= segment.end_ms;
          
          const speakerLabel = segment.speaker_label || segment.speaker || 'Unknown';
          const config = speakerConfig[speakerLabel] || defaultConfig;

          return (
            <div
              key={segment.id || index}
              onClick={() => onSegmentClick?.(segment)}
              className={`group p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                isActive 
                  ? 'bg-primary-500/10 border-primary-500/50 shadow-glow' 
                  : 'bg-dark-700/30 border-dark-600/50 hover:bg-dark-700/50 hover:border-dark-500'
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center flex-shrink-0`}>
                  <User className="w-5 h-5 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-semibold ${config.text}`}>
                      {speakerLabel}
                    </span>
                    <div className="flex items-center gap-1.5 text-dark-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="text-xs font-mono">
                        {formatTimestamp(segment.start_ms)}
                      </span>
                    </div>
                  </div>

                  {/* Text */}
                  <p className="text-dark-200 text-sm leading-relaxed">
                    {segment.text}
                  </p>

                  {/* Confidence */}
                  {segment.confidence !== undefined && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-dark-600 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${config.gradient}`}
                          style={{ width: `${Math.max(0, segment.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-dark-500 font-mono">
                        {(segment.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
