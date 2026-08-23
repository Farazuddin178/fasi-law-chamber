import { BACKEND_URL } from '@/lib/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChamberAiStatus {
  configured: boolean;
  model: string;
}

/** Lets the page show a clear "not configured" banner instead of a
 * confusing failure the first time an admin sends a message. */
export async function getChamberAiStatus(): Promise<ChamberAiStatus> {
  const res = await fetch(`${BACKEND_URL}/api/ai/status`);
  if (!res.ok) throw new Error('Could not reach Chamber AI');
  return res.json();
}

interface StreamChatOptions {
  messages: ChatMessage[];
  imageBase64?: string;
  imageMimeType?: string;
  onChunk: (text: string) => void;
  signal?: AbortSignal;
}

/**
 * POSTs the conversation to /api/ai/chat and feeds the streamed plain-text
 * response to onChunk as it arrives, so the UI can render it incrementally
 * instead of waiting for the whole answer.
 */
export async function streamChamberAiChat({
  messages,
  imageBase64,
  imageMimeType,
  onChunk,
  signal,
}: StreamChatOptions): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      image_base64: imageBase64,
      image_mime_type: imageMimeType,
    }),
    signal,
  });

  if (!res.ok) {
    let message = `Chamber AI request failed (status ${res.status}).`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      // Response wasn't JSON (e.g. a proxy error page) — keep the generic message.
    }
    throw new Error(message);
  }

  if (!res.body) {
    // Environment without a readable-stream body — degrade to one chunk
    // instead of hanging forever waiting for a stream that never comes.
    const text = await res.text();
    if (text) onChunk(text);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) onChunk(chunk);
  }
}
