import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import toast from 'react-hot-toast';
import {
  Bot,
  Camera as CameraIcon,
  ImagePlus,
  Languages,
  Loader2,
  Paperclip,
  RotateCcw,
  ScanText,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Markdown } from '@/components/ui/markdown';
import { captureFromCamera, fileToImage, type CapturedImage } from '@/lib/camera';
import { getChamberAiStatus, streamChamberAiChat, type ChatMessage } from '@/lib/chamberAiApi';

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: 'Translate Document',
    icon: <Languages className="w-4 h-4" />,
    prompt: 'Translate the following into Telugu, preserving legal terminology precisely:\n\n',
  },
  {
    label: 'Analyze Court Order',
    icon: <ScanText className="w-4 h-4" />,
    prompt: 'Analyze this court order/notice and summarize the key directions, dates, and next steps.',
  },
  {
    label: 'Draft Legal Summary',
    icon: <Sparkles className="w-4 h-4" />,
    prompt: 'Draft a concise legal summary of the following, organized by facts, issues, and relief sought:\n\n',
  },
];

export default function ChamberAiPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [attachedImage, setAttachedImage] = useState<CapturedImage | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    getChamberAiStatus()
      .then((s) => setConfigured(s.configured))
      .catch(() => setConfigured(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  const applyQuickAction = (action: QuickAction) => {
    setInput(action.prompt);
  };

  const handleCameraCapture = async (source: 'camera' | 'gallery') => {
    try {
      const image = await captureFromCamera(source);
      setAttachedImage(image);
    } catch (err: any) {
      toast.error(err?.message || 'Could not capture image');
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    try {
      const image = await fileToImage(file);
      setAttachedImage(image);
    } catch (err: any) {
      toast.error(err?.message || 'Could not read the selected file');
    }
  };

  const handleSend = async () => {
    if (streaming) return;
    const text = input.trim() || (attachedImage ? 'Please analyze this attached image.' : '');
    if (!text) return;

    const userMessage: ChatMessage = { role: 'user', content: text };
    const historyForRequest = [...messages, userMessage];
    setMessages([...historyForRequest, { role: 'assistant', content: '' }]);
    setInput('');
    const imageToSend = attachedImage;
    setAttachedImage(null);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let accumulated = '';

    try {
      await streamChamberAiChat({
        messages: historyForRequest,
        imageBase64: imageToSend?.base64,
        imageMimeType: imageToSend?.mimeType,
        signal: controller.signal,
        onChunk: (chunk) => {
          accumulated += chunk;
          setMessages((prev) => {
            const next = prev.slice();
            next[next.length - 1] = { role: 'assistant', content: accumulated };
            return next;
          });
        },
      });
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        toast.error(err?.message || 'Chamber AI request failed');
        setMessages((prev) => {
          const next = prev.slice();
          next[next.length - 1] = {
            role: 'assistant',
            content: accumulated || `⚠️ ${err?.message || 'Failed to get a response.'}`,
          };
          return next;
        });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    if (streaming) return;
    setMessages([]);
    setInput('');
    setAttachedImage(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] min-h-0">
      <div className="flex items-center justify-between gap-3 mb-4 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-7 h-7 text-amber-600 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">Chamber AI</h1>
            <p className="text-sm text-gray-500 truncate">Legal Q&A, translation, and document scanning — {user?.full_name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleNewChat}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          New chat
        </button>
      </div>

      {configured === false && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Chamber AI is not configured on the server yet. Set <code className="px-1 py-0.5 rounded bg-amber-100">GEMINI_API_KEY</code> as
          an environment variable on the backend (never in code) to enable it.
        </div>
      )}

      <div className="flex-1 min-h-0 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <Bot className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 mb-4">
                Ask about BNS/BNSS/CPC/CrPC provisions, translate a document, or attach a scanned court order to analyze.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => applyQuickAction(action)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100"
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 min-w-0 ${
                    m.role === 'user' ? 'bg-amber-500 text-slate-900' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    m.content ? (
                      <Markdown text={m.content} />
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400 text-sm">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
                      </span>
                    )
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {messages.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-2 flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={() => applyQuickAction(action)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full hover:bg-amber-100"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}

        {attachedImage && (
          <div className="border-t border-gray-100 px-4 pt-3">
            <div className="relative inline-block">
              <img src={attachedImage.dataUrl} alt="Attached" className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1 hover:bg-gray-700"
                title="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 p-3 flex items-end gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelected} />

          {Capacitor.isNativePlatform() ? (
            <>
              <button
                type="button"
                onClick={() => handleCameraCapture('camera')}
                disabled={streaming}
                className="shrink-0 p-2.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg disabled:opacity-50"
                title="Take photo"
              >
                <CameraIcon className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => handleCameraCapture('gallery')}
                disabled={streaming}
                className="shrink-0 p-2.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg disabled:opacity-50"
                title="Choose from gallery"
              >
                <ImagePlus className="w-5 h-5" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming}
              className="shrink-0 p-2.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg disabled:opacity-50"
              title="Attach image"
            >
              <Paperclip className="w-5 h-5" />
            </button>
          )}

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Chamber AI — Enter to send, Shift+Enter for a new line"
            rows={1}
            className="flex-1 min-w-0 resize-none max-h-32 rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />

          {streaming ? (
            <button
              type="button"
              onClick={handleStop}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-300"
            >
              Stop
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() && !attachedImage}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 text-sm font-semibold hover:from-amber-600 hover:to-amber-700 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
