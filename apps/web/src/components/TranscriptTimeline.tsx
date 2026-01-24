'use client';

import { TranscriptSegment } from '@/lib/types';

interface TranscriptTimelineProps {
  segments: TranscriptSegment[];
  currentTimeMs?: number;
  onSegmentClick?: (segment: TranscriptSegment) => void;
}

const speakerColors: Record<string, string> = {
  'Speaker A': 'bg-blue-100 border-blue-300',
  'Speaker B': 'bg-green-100 border-green-300',
  'Speaker C': 'bg-purple-100 border-purple-300',
  'Speaker D': 'bg-orange-100 border-orange-300',
  'Unknown': 'bg-gray-100 border-gray-300',
};

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
      <div className="p-8 text-center text-gray-500">
        <p>No transcript available.</p>
        <p className="text-sm mt-2">Run the transcription pipeline to generate a transcript.</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-h-[600px] overflow-y-auto">
      <div className="space-y-3">
        {segments.map((segment, index) => {
          const isActive = currentTimeMs !== undefined && 
            currentTimeMs >= segment.start_ms && 
            currentTimeMs <= segment.end_ms;
          
          const speakerLabel = segment.speaker_label || 'Unknown';
          const colorClass = speakerColors[speakerLabel] || speakerColors['Unknown'];

          return (
            <div
              key={segment.id || index}
              onClick={() => onSegmentClick?.(segment)}
              className={`p-3 rounded-lg border cursor-pointer transition ${colorClass} ${
                isActive ? 'ring-2 ring-primary-500' : ''
              } hover:shadow-sm`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">
                  {speakerLabel}
                </span>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(segment.start_ms)} - {formatTimestamp(segment.end_ms)}
                </span>
              </div>
              <p className="text-sm text-gray-800">{segment.text}</p>
              {segment.confidence !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${Math.max(0, (segment.confidence + 1) * 50)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400">
                    {((segment.confidence + 1) * 50).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
