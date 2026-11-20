export type SpeechCapture = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
};

export function appendTranscript(notes: string, transcript: string): string {
  if (!transcript.trim()) return notes;
  return (notes ? notes.trimEnd() + "\n" : "") + transcript.trim();
}

/** A generation token prevents permission requests and stale events from restarting a cancelled recording. */
export class DictationController {
  private capture: SpeechCapture | null = null;
  private generation = 0;
  active = false;
  constructor(private options: {
    create: () => SpeechCapture | null;
    permission: () => Promise<void>;
    getNotes: () => string;
    onNotes: (notes: string) => void;
    onListening: (listening: boolean) => void;
    onError: (error: string) => void;
  }) {}

  reset(): void {
    this.generation++;
    const capture = this.capture;
    this.capture = null;
    this.active = false;
    if (capture) {
      capture.onresult = null; capture.onerror = null; capture.onend = null;
      try { capture.abort(); } catch { /* already ended */ }
    }
    this.options.onListening(false);
  }

  stop(): void {
    const capture = this.capture;
    this.active = false;
    this.options.onListening(false);
    if (!capture) { this.reset(); return; }
    try { capture.stop(); } catch { this.reset(); }
  }

  async start(): Promise<void> {
    this.reset();
    const generation = this.generation;
    this.active = true;
    this.options.onListening(true);
    try {
      await this.options.permission();
      if (generation !== this.generation) return;
      const capture = this.options.create();
      if (!capture) { this.reset(); this.options.onError("unsupported"); return; }
      this.capture = capture;
      const base = this.options.getNotes();
      capture.continuous = true; capture.interimResults = true; capture.lang = "en-US";
      capture.onresult = (event) => {
        if (generation !== this.generation || this.capture !== capture) return;
        const text = Array.from(event.results, (result) => result[0]?.transcript ?? "").join(" ");
        this.options.onNotes(appendTranscript(base, text));
      };
      capture.onerror = (event) => {
        if (generation !== this.generation || this.capture !== capture) return;
        this.reset();
        if (event.error !== "aborted") this.options.onError(event.error ?? "unknown");
      };
      capture.onend = () => {
        if (generation === this.generation && this.capture === capture) this.reset();
      };
      capture.start();
    } catch (error) {
      if (generation !== this.generation) return;
      this.reset();
      this.options.onError(error instanceof Error ? error.name : "unknown");
    }
  }
}