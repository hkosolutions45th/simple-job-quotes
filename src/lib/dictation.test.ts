import { test } from "node:test";
import assert from "node:assert/strict";
import { DictationController, type SpeechCapture } from "./dictation";

function setup(permission: () => Promise<void> = async () => {}, onStart: (capture: SpeechCapture, attempt: number) => void = () => {}) {
  let notes = "Existing job notes";
  const captures: SpeechCapture[] = [];
  const errors: string[] = [];
  let listening = false;
  const controller = new DictationController({
    create: () => {
      const capture: SpeechCapture = { continuous: false, interimResults: false, lang: "", onresult: null, onerror: null, onend: null, start() { onStart(capture, captures.length); }, stop() {}, abort() {} };
      captures.push(capture); return capture;
    }, permission, getNotes: () => notes, onNotes: (value) => { notes = value; }, onListening: (value) => { listening = value; }, onError: (error) => { errors.push(error); },
  });
  return { controller, captures, errors, notes: () => notes, listening: () => listening };
}
const result = (text: string) => ({ results: [[{ transcript: text }]] });
test("each resumed recording appends without erasing prior notes", async () => {
  const s = setup(); await s.controller.start();
  s.captures[0]?.onresult?.(result("Paint the walls")); s.controller.stop();
  await s.controller.start(); s.captures[1]?.onresult?.(result("Replace the trim"));
  assert.equal(s.notes(), "Existing job notes\nPaint the walls\nReplace the trim");
  assert.notEqual(s.captures[0], s.captures[1]);
});
test("interim updates replace only the current session transcript", async () => {
  const s = setup(); await s.controller.start();
  s.captures[0]?.onresult?.(result("Paint")); s.captures[0]?.onresult?.(result("Paint the walls"));
  assert.equal(s.notes(), "Existing job notes\nPaint the walls");
});
test("background reset retains notes, ignores stale errors, and allows fresh capture", async () => {
  const s = setup(); await s.controller.start();
  const stale = s.captures[0]?.onerror;
  s.captures[0]?.onresult?.(result("Paint the walls")); s.controller.reset();
  stale?.({ error: "no-speech" });
  assert.equal(s.listening(), false); assert.deepEqual(s.errors, []);
  await s.controller.start(); assert.equal(s.captures.length, 2);
  assert.equal(s.notes(), "Existing job notes\nPaint the walls");
});
test("backgrounding during permission request cannot start the mic later", async () => {
  let grant = () => {};
  const s = setup(() => new Promise<void>((resolve) => { grant = resolve; }));
  const start = s.controller.start(); s.controller.reset(); grant(); await start;
  assert.equal(s.captures.length, 0); assert.equal(s.listening(), false);
});
test("permission failure preserves notes and resets listening", async () => {
  const s = setup(async () => { throw new DOMException("denied", "NotAllowedError"); });
  await s.controller.start(); assert.equal(s.notes(), "Existing job notes");
  assert.equal(s.listening(), false); assert.deepEqual(s.errors, ["NotAllowedError"]);
});
test("reset when switching quotes or typing ignores a late transcript", async () => {
  const s = setup(); await s.controller.start();
  const stale = s.captures[0]?.onresult;
  s.controller.reset(); stale?.(result("Late text from previous quote"));
  assert.equal(s.notes(), "Existing job notes");
  assert.equal(s.listening(), false);
});
test("stopping during a pending permission request cancels recording", async () => {
  let grant = () => {};
  const s = setup(() => new Promise<void>((resolve) => { grant = resolve; }));
  const start = s.controller.start(); s.controller.stop(); grant(); await start;
  assert.equal(s.captures.length, 0); assert.equal(s.listening(), false);
});

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
test("foreground immediately aborts and detaches a lingering capture; first tap starts fresh", async () => {
  const s = setup(); await s.controller.start();
  const capture = s.captures[0];
  assert.ok(capture);
  let aborted = false; capture.abort = () => { aborted = true; };
  s.controller.foreground();
  assert.equal(aborted, true);
  assert.equal(capture.onresult, null); assert.equal(capture.onerror, null); assert.equal(capture.onend, null);
  assert.equal(s.listening(), false);
  await s.controller.start();
  assert.equal(s.captures.length, 2); assert.equal(s.listening(), true);
});
for (const error of ["aborted", "audio-capture", "throw"]) {
  test(`foreground ${error} failure retries exactly once after 250ms without another tap`, async () => {
    const s = setup(async () => {}, (capture, attempt) => {
      if (attempt !== 1) return;
      if (error === "throw") throw new Error("start failed");
      capture.onerror?.({ error });
    });
    s.controller.foreground(); await s.controller.start();
    await delay(200); assert.equal(s.captures.length, 1); assert.deepEqual(s.errors, []);
    await delay(80); assert.equal(s.captures.length, 2); assert.equal(s.listening(), true);
    s.captures[1]?.onresult?.(result("Fresh session"));
    assert.equal(s.notes(), "Existing job notes\nFresh session");
    s.controller.reset();
  });
}
test("second immediate failure reports error without a third capture", async () => {
  const s = setup(async () => {}, (capture) => capture.onerror?.({ error: "audio-capture" }));
  s.controller.foreground(); await s.controller.start(); await delay(280);
  assert.equal(s.captures.length, 2); assert.deepEqual(s.errors, ["audio-capture"]);
  assert.equal(s.listening(), false); await delay(280); assert.equal(s.captures.length, 2);
});
test("background or stop cancels a scheduled foreground retry", async () => {
  for (const cancel of ["reset", "stop"] as const) {
    const s = setup(async () => {}, (capture) => capture.onerror?.({ error: "aborted" }));
    s.controller.foreground(); await s.controller.start(); s.controller[cancel]();
    await delay(280); assert.equal(s.captures.length, 1); assert.equal(s.listening(), false);
    assert.deepEqual(s.errors, []);
  }
});