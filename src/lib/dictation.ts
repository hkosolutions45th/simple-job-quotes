import type { SpeechRecognitionPlugin } from "@capacitor-community/speech-recognition";

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

type DictationCallbacks = {
  getNotes: () => string;
  onNotes: (notes: string) => void;
  onListening: (listening: boolean) => void;
  onError: (error: string) => void;
};

export type DictationSession = {
  active: boolean;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
  foreground: () => void;
};

export type NativeSpeechPlugin = Pick<SpeechRecognitionPlugin,
  "requestPermissions" | "start" | "stop" | "addListener" | "removeAllListeners">;

/** Native teardown is immediate; serialized starts cannot race an older pending native start. */
export class NativeDictationController implements DictationSession {
  private plugin: NativeSpeechPlugin | null = null;
  private generation = 0;
  private cleanup: Promise<void> = Promise.resolve();
  private starts: Promise<void> = Promise.resolve();
  active = false;

  constructor(private options: DictationCallbacks & {
    // Resolve a module wrapper, never the Capacitor proxy itself (its `then` is a plugin method).
    load: () => Promise<{ SpeechRecognition: NativeSpeechPlugin }>;
  }) {}

  private closeNative(): void {
    const plugin = this.plugin;
    if (!plugin) return;
    // Invoke both immediately, even if stop rejects. Wait before attaching new listeners.
    const stopped = plugin.stop().catch(() => {});
    const removed = plugin.removeAllListeners().catch(() => {});
    this.cleanup = Promise.all([this.cleanup, stopped, removed]).then(() => {});
  }

  reset(): void {
    this.generation++;
    this.active = false;
    this.options.onListening(false);
    this.closeNative();
  }

  foreground(): void { this.reset(); }

  // Partial results already commit the latest transcript; freezing it also rejects late events.
  stop(): void { this.reset(); }

  start(): Promise<void> {
    this.reset();
    const generation = this.generation;
    const base = this.options.getNotes();
    this.active = true;
    this.options.onListening(true);
    const current = () => generation === this.generation;
    const run = async () => {
      try {
        if (!current()) return;
        const plugin = this.plugin ?? (await this.options.load()).SpeechRecognition;
        this.plugin = plugin;
        if (!current()) return;
        await this.cleanup;
        if (!current()) return;
        const permission = await plugin.requestPermissions();
        if (!current()) return;
        if (permission.speechRecognition !== "granted") {
          this.reset();
          this.options.onError("NotAllowedError");
          return;
        }
        const partial = await plugin.addListener("partialResults", (data) => {
          if (!current()) return;
          const text = data.matches?.[0] ?? "";
          // Empty native events must not erase either prior notes or a received partial.
          if (text.trim()) this.options.onNotes(appendTranscript(base, text));
        });
        if (!current()) { await partial.remove().catch(() => {}); return; }
        const state = await plugin.addListener("listeningState", ({ status }) => {
          if (current() && status === "stopped") this.reset();
        });
        if (!current()) { await state.remove().catch(() => {}); return; }
        await plugin.start({ language: "en-US", partialResults: true, popup: false });
        // iOS may finish a pending start after background cleanup; stop it again before any restart.
        if (!current()) { this.closeNative(); await this.cleanup; }
      } catch (error) {
        if (!current()) return;
        this.reset();
        const message = error instanceof Error ? error.message : String(error);
        this.options.onError(/permission|denied|not.?allowed/i.test(message) ? "NotAllowedError" : message);
      }
    };
    this.starts = this.starts.then(run);
    return this.starts;
  }
}

/** A generation token prevents permission requests and stale events from restarting a cancelled recording. */
export class DictationController {
  private capture: SpeechCapture | null = null;
  private generation = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private foregroundRecovery = false;
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
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const capture = this.capture;
    this.capture = null;
    this.active = false;
    if (capture) {
      capture.onresult = null; capture.onerror = null; capture.onend = null;
      try { capture.abort(); } catch { /* already ended */ }
    }
    this.options.onListening(false);
  }

  foreground(): void {
    this.reset();
    this.foregroundRecovery = true;
  }

  stop(): void {
    if (this.retryTimer !== null) { this.reset(); return; }
    const capture = this.capture;
    this.active = false;
    this.options.onListening(false);
    if (!capture) { this.reset(); return; }
    try { capture.stop(); } catch { this.reset(); }
  }

  async start(): Promise<void> {
    this.reset();
    const generation = this.generation;
    const recover = this.foregroundRecovery;
    this.foregroundRecovery = false;
    this.active = true;
    this.options.onListening(true);
    let retried = false;
    let startedAt = 0;
    let receivedResult = false;
    const fail = (error: string, thrown = false) => {
      if (generation !== this.generation) return;
      const capture = this.capture;
      this.capture = null;
      if (capture) {
        capture.onresult = null; capture.onerror = null; capture.onend = null;
        try { capture.abort(); } catch { /* already ended */ }
      }
      if (recover && !retried && (thrown || (["aborted", "audio-capture"].includes(error) && Date.now() - startedAt < 1000))) {
        retried = true;
        this.retryTimer = setTimeout(() => {
          this.retryTimer = null;
          if (generation === this.generation) createCapture();
        }, 250);
        return;
      }
      this.reset();
      this.options.onError(error);
    };
    const createCapture = () => {
      if (generation !== this.generation) return;
      try {
        const capture = this.options.create();
        if (!capture) { this.reset(); this.options.onError("unsupported"); return; }
        this.capture = capture;
        const base = this.options.getNotes();
        capture.continuous = true; capture.interimResults = true; capture.lang = "en-US";
        capture.onresult = (event) => {
          if (generation !== this.generation || this.capture !== capture) return;
          receivedResult = true;
          const text = Array.from(event.results, (result) => result[0]?.transcript ?? "").join(" ");
          this.options.onNotes(appendTranscript(base, text));
        };
        capture.onerror = (event) => {
          if (generation !== this.generation || this.capture !== capture) return;
          fail(event.error ?? "unknown");
        };
        capture.onend = () => {
          if (generation !== this.generation || this.capture !== capture) return;
          if (recover && !retried && !receivedResult && Date.now() - startedAt < 1000) {
            fail("aborted");
            return;
          }
          this.reset();
        };
        startedAt = Date.now();
        try { capture.start(); } catch (error) { fail(error instanceof Error ? error.name : "unknown", true); }
      } catch (error) { fail(error instanceof Error ? error.name : "unknown", true); }
    };
    try {
      await this.options.permission();
      if (generation !== this.generation) return;
      createCapture();
    } catch (error) {
      if (generation !== this.generation) return;
      this.reset();
      this.options.onError(error instanceof Error ? error.name : "unknown");
    }
  }
}