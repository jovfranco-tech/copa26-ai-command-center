import { useState, useEffect, useCallback } from 'react';

// ── Types ────────────────────────────────────────────────────────────────────

interface BrowserSpeechRecognitionEvent extends Event {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface BrowserSpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  start: () => void;
  stop: () => void;
}

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;
type WindowWithSpeechRecognition = Window &
  typeof globalThis & {
    SpeechRecognition?: BrowserSpeechRecognitionConstructor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
  };

// ── useVoiceInput ────────────────────────────────────────────────────────────

export interface UseVoiceInputReturn {
  listening: boolean;
  supported: boolean;
  toggleSpeech: () => void;
}

/**
 * Hook for Web Speech API voice-to-text input in Spanish.
 * Returns the transcript via `onResult` callback.
 */
export function useVoiceInput(onResult: (transcript: string) => void): UseVoiceInputReturn {
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRec =
      (window as WindowWithSpeechRecognition).SpeechRecognition ??
      (window as WindowWithSpeechRecognition).webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'es-ES';

      rec.onstart = () => setListening(true);
      rec.onend = () => setListening(false);
      rec.onerror = () => setListening(false);

      rec.onresult = (event: BrowserSpeechRecognitionEvent) => {
        const result = event.results[0]?.[0]?.transcript;
        if (result) onResult(result);
      };

      setRecognition(rec);
    }
    // onResult intentionally excluded — stable callback expected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSpeech = useCallback(() => {
    if (!recognition) return;
    if (listening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  }, [recognition, listening]);

  return {
    listening,
    supported: recognition !== null,
    toggleSpeech,
  };
}

// ── useAudioRecording ────────────────────────────────────────────────────────

export interface AudioAttachment {
  name: string;
  data: string; // base64
}

export interface UseAudioRecordingReturn {
  recording: boolean;
  attachment: AudioAttachment | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearAttachment: () => void;
}

/**
 * Hook for recording audio via MediaRecorder and returning a base64 webm blob.
 */
export function useAudioRecording(): UseAudioRecordingReturn {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [attachment, setAttachment] = useState<AudioAttachment | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1];
          if (base64Data) {
            setAttachment({
              name: `Nota_voz_${new Date().toLocaleTimeString('es-MX').replace(/:/g, '-')}.webm`,
              data: base64Data,
            });
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      setMediaRecorder(recorder);
      recorder.start();
      setRecording(true);
      if ('vibrate' in navigator) navigator.vibrate([20]);
    } catch {
      alert('No se pudo acceder al micrófono. Asegúrate de dar los permisos necesarios.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setRecording(false);
      if ('vibrate' in navigator) navigator.vibrate([10, 5, 10]);
    }
  }, [mediaRecorder]);

  const clearAttachment = useCallback(() => setAttachment(null), []);

  return { recording, attachment, startRecording, stopRecording, clearAttachment };
}

// ── usePdfUpload ─────────────────────────────────────────────────────────────

export interface PdfAttachment {
  name: string;
  data: string; // base64
}

export interface UsePdfUploadReturn {
  attachment: PdfAttachment | null;
  handleUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearAttachment: () => void;
}

/**
 * Hook for handling PDF file upload and converting to base64.
 */
export function usePdfUpload(): UsePdfUploadReturn {
  const [attachment, setAttachment] = useState<PdfAttachment | null>(null);

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor, selecciona un archivo PDF de gala válido.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = (reader.result as string).split(',')[1];
      if (base64Data) {
        setAttachment({ name: file.name, data: base64Data });
      }
    };
    reader.readAsDataURL(file);
  }, []);

  const clearAttachment = useCallback(() => setAttachment(null), []);

  return { attachment, handleUpload, clearAttachment };
}

// ── useAIStream ──────────────────────────────────────────────────────────────

export interface UseAIStreamReturn {
  busy: boolean;
  streamingText: string;
  askAIWithStream: (
    question: string,
    contextText: string,
    pdf?: { name: string; data: string },
    audio?: { name: string; data: string },
  ) => Promise<{ ok: boolean; answer?: string; reason?: string; retryAfter?: number; meta?: Record<string, unknown> | null }>;
}

/**
 * Hook wrapping the AI streaming call with loading/streaming state management.
 */
export function useAIStream(
  askAIFn: (
    q: string,
    ctx: string,
    pdf?: { name: string; data: string },
    audio?: { name: string; data: string },
    onPartial?: (text: string) => void,
  ) => Promise<{ ok: boolean; answer?: string; reason?: string; retryAfter?: number; meta?: Record<string, unknown> | null }>,
): UseAIStreamReturn {
  const [busy, setBusy] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  const askAIWithStream = useCallback(
    async (
      question: string,
      contextText: string,
      pdf?: { name: string; data: string },
      audio?: { name: string; data: string },
    ) => {
      setBusy(true);
      setStreamingText('');
      const result = await askAIFn(question, contextText, pdf, audio, (partial) => setStreamingText(partial));
      setBusy(false);
      setStreamingText('');
      return result;
    },
    [askAIFn],
  );

  return { busy, streamingText, askAIWithStream };
}
