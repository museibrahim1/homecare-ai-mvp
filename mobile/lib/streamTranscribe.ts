/**
 * WebSocket streaming transcription via Deepgram Flux.
 * Streams audio to backend, receives transcript events in real-time.
 */

import * as FileSystem from 'expo-file-system';
import { getToken } from './auth';
import { API_BASE } from './api';

export interface TranscriptEvent {
  type: 'transcript';
  event: string;
  transcript: string;
  turn_index: number;
}

export type StreamTranscribeCallback = (event: TranscriptEvent) => void;

/**
 * Stream an audio file to the WebSocket and receive transcript events.
 * Returns the full transcript when done.
 */
export async function streamTranscribe(
  audioUri: string,
  onTranscript: StreamTranscribeCallback,
): Promise<string> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');

  const wsHost = API_BASE.replace(/^https?:\/\//, '');
  const wsUrl = `wss://${wsHost}/live/stream?token=${encodeURIComponent(token)}&encoding=m4a`;
  const ws = new WebSocket(wsUrl);

  let fullTranscript = '';

  return new Promise((resolve, reject) => {
    ws.onopen = () => {
      sendAudioFile(ws, audioUri).catch(reject);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'transcript' && data.transcript) {
          fullTranscript += (fullTranscript ? ' ' : '') + data.transcript;
          onTranscript(data as TranscriptEvent);
        } else if (data.type === 'connected') {
          // Ready
        } else if (data.type === 'error') {
          reject(new Error(data.message || 'Transcription error'));
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = (e) => reject(new Error('WebSocket error'));
    ws.onclose = (e) => {
      if (e.code !== 1000 && e.code !== 1001 && fullTranscript === '') {
        reject(new Error('Connection closed'));
      } else {
        resolve(fullTranscript);
      }
    };
  });
}

async function sendAudioFile(ws: WebSocket, uri: string): Promise<void> {
  const CHUNK_SIZE = 32 * 1024;

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const binary = base64ToArrayBuffer(base64);
  const view = new Uint8Array(binary);
  let offset = 0;

  while (offset < view.length && ws.readyState === WebSocket.OPEN) {
    const end = Math.min(offset + CHUNK_SIZE, view.length);
    const chunk = view.slice(offset, end);
    ws.send(chunk);
    offset = end;
    await new Promise((r) => setTimeout(r, 20));
  }

  ws.send(JSON.stringify({ type: 'CloseStream' }));
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
