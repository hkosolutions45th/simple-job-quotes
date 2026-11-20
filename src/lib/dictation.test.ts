import { test } from "node:test";
import assert from "node:assert/strict";
import { DictationController, type SpeechCapture } from "./dictation";

function setup(permission: () => Promise<void> = async () => {}) {
  let notes = "Existing job notes";
  const captures: SpeechCapture[] = [];
  const errors: string[] = [];
  let listening = false;
  const controller = new DictationController({
    create: () => {
      const capture: SpeechCapture = { continuous: false, interimResults: false, lang: "", onresult: null, onerror: null, onend: null, start() {}, stop() {}, abort() {} };
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