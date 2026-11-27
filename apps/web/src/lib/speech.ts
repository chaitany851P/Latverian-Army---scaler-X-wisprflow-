export interface BrowserSpeechResultEvent {
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

export interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: BrowserSpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechConstructor = new () => BrowserSpeechRecognition;

export function getSpeechRecognitionConstructor(): SpeechConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }
  const win = window as unknown as {
    SpeechRecognition?: SpeechConstructor;
    webkitSpeechRecognition?: SpeechConstructor;
  };
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}
