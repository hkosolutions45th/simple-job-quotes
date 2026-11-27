import { test } from "node:test";
import assert from "node:assert/strict";
import { NativeDictationController, type NativeSpeechPlugin } from "./dictation";

function setup() {
  let notes = "Existing job notes";
  const errors: string[] = [];
  const calls: string[] = [];
  const options: unknown[] = [];
  let partial: ((data: { matches: string[] }) => void) | undefined;
  let state: ((data: { status: "started" | "stopped" }) => void) | undefined;
  const plugin: NativeSpeechPlugin = {
    requestPermissions: async () => { calls.push("permission"); return { speechRecognition: "granted" }; },
    start: async (value) => { calls.push("start"); options.push(value); return {}; },
    stop: async () => { calls.push("stop"); },
    removeAllListeners: async () => { calls.push("remove"); partial = undefined; state = undefined; },
    addListener: async (event: string, listener: any) => {
      calls.push(event);
      if (event === "partialResults") partial = listener;
      else state = listener;
      return { remove: async () => { calls.push("removeHandle"); } };
    },
  };
  const controller = new NativeDictationController({
    load: async () => ({ SpeechRecognition: plugin }),
    getNotes: () => notes,
    onNotes: (value) => { notes = value; },
    onListening: () => {},
    onError: (error) => { errors.push(error); },
  });
  return { controller, plugin, calls, options, errors, notes: () => notes,
    partial: () => partial, state: () => state };
}

test("native sessions use permissions and exact en-US partial-result options", async () => {
  const s = setup(); await s.controller.start();
  assert.deepEqual(s.options, [{ language: "en-US", partialResults: true, popup: false }]);
  assert.deepEqual(s.calls, ["permission", "partialResults", "listeningState", "start"]);
});

test("native module loading never treats the Capacitor proxy as a promise", async () => {
  const s = setup();
  const proxy = new Proxy(s.plugin, { get(target, key, receiver) {
    if (key === "then") throw new Error("Capacitor proxies are not promises");
    return Reflect.get(target, key, receiver);
  } });
  const controller = new NativeDictationController({
    load: async () => ({ SpeechRecognition: proxy }),
    getNotes: s.notes, onNotes: () => {}, onListening: () => {},
    onError: (error) => { s.errors.push(error); },
  });
  await controller.start();
  assert.equal(controller.active, true); assert.equal(s.options.length, 1);
  assert.deepEqual(s.errors, []);
});

test("native partials replace the current transcript and restart appends on a new line", async () => {
  const s = setup(); await s.controller.start();
  s.partial()?.({ matches: ["Paint"] });
  s.partial()?.({ matches: ["Paint the walls", "Ignored alternative"] });
  assert.equal(s.notes(), "Existing job notes\nPaint the walls");
  s.controller.stop(); await s.controller.start();
  s.partial()?.({ matches: ["Replace the trim"] });
  assert.equal(s.notes(), "Existing job notes\nPaint the walls\nReplace the trim");
});

test("empty or silent native results never clear prior notes or received partials", async () => {
  const s = setup(); await s.controller.start();
  s.partial()?.({ matches: [] }); assert.equal(s.notes(), "Existing job notes");
  s.partial()?.({ matches: ["Paint the walls"] });
  s.partial()?.({ matches: ["   "] });
  assert.equal(s.notes(), "Existing job notes\nPaint the walls");
});

test("manual stop immediately stops native capture and removes listeners, ignoring late events", async () => {
  const s = setup(); await s.controller.start();
  const late = s.partial(); s.partial()?.({ matches: ["Paint the walls"] });
  s.controller.stop();
  assert.deepEqual(s.calls.slice(-2), ["stop", "remove"]);
  assert.equal(s.controller.active, false);
  late?.({ matches: ["Late replacement"] });
  assert.equal(s.notes(), "Existing job notes\nPaint the walls");
});

test("native stopped event retains transcript and resets to idle", async () => {
  const s = setup(); await s.controller.start();
  s.partial()?.({ matches: ["Paint the walls"] }); s.state()?.({ status: "stopped" });
  assert.equal(s.controller.active, false);
  assert.equal(s.notes(), "Existing job notes\nPaint the walls");
  assert.deepEqual(s.calls.slice(-2), ["stop", "remove"]);
});

test("background and foreground cleanup invalidate old events; one tap starts again", async () => {
  const s = setup(); await s.controller.start(); const late = s.partial();
  s.controller.reset(); s.controller.foreground();
  late?.({ matches: ["Stale audio"] });
  assert.equal(s.notes(), "Existing job notes"); assert.equal(s.controller.active, false);
  await s.controller.start(); s.partial()?.({ matches: ["Fresh recording"] });
  assert.equal(s.calls.filter((call) => call === "start").length, 2);
  assert.equal(s.notes(), "Existing job notes\nFresh recording");
});

test("permission denial keeps notes and never starts native recording", async () => {
  const s = setup(); s.plugin.requestPermissions = async () => ({ speechRecognition: "denied" });
  await s.controller.start();
  assert.equal(s.options.length, 0); assert.equal(s.notes(), "Existing job notes");
  assert.equal(s.controller.active, false); assert.deepEqual(s.errors, ["NotAllowedError"]);
});

test("background during pending native permission prevents a delayed start", async () => {
  const s = setup(); let grant: ((value: { speechRecognition: "granted" }) => void) | undefined;
  s.plugin.requestPermissions = () => new Promise((resolve) => { grant = resolve; });
  const start = s.controller.start();
  for (let i = 0; i < 10 && !grant; i++) await Promise.resolve();
  assert.ok(grant); s.controller.reset(); grant({ speechRecognition: "granted" }); await start;
  assert.equal(s.options.length, 0); assert.equal(s.controller.active, false);
});

test("native start failure cleans up and the next tap can start", async () => {
  const s = setup(); const original = s.plugin.start;
  s.plugin.start = async () => { throw new Error("audio unavailable"); };
  await s.controller.start();
  assert.equal(s.controller.active, false); assert.deepEqual(s.errors, ["audio unavailable"]);
  assert.deepEqual(s.calls.slice(-2), ["stop", "remove"]);
  s.plugin.start = original; await s.controller.start(); assert.equal(s.controller.active, true);
});

test("failed stop and listener removal do not prevent a subsequent start", async () => {
  const s = setup(); await s.controller.start();
  s.plugin.stop = async () => { throw new Error("already stopped"); };
  s.plugin.removeAllListeners = async () => { throw new Error("already removed"); };
  s.controller.reset(); await s.controller.start(); assert.equal(s.controller.active, true);
});

test("restart waits for old native stop and listener removal to finish", async () => {
  const s = setup(); await s.controller.start();
  let finish: (() => void) | undefined;
  const pending = new Promise<void>((resolve) => { finish = resolve; });
  s.plugin.removeAllListeners = () => pending;
  s.controller.reset(); const restart = s.controller.start();
  for (let i = 0; i < 10; i++) await Promise.resolve();
  assert.equal(s.options.length, 1); assert.ok(finish); finish(); await restart;
  assert.equal(s.options.length, 2);
});

test("a native start completing after background is stopped before a queued restart", async () => {
  const s = setup(); let finish: (() => void) | undefined;
  const original = s.plugin.start;
  s.plugin.start = async () => { s.calls.push("pendingStart"); await new Promise<void>((resolve) => { finish = resolve; }); return {}; };
  const first = s.controller.start();
  for (let i = 0; i < 20 && !finish; i++) await Promise.resolve();
  assert.ok(finish); s.controller.reset(); s.plugin.start = original;
  const next = s.controller.start(); finish(); await first; await next;
  assert.equal(s.options.length, 1);
  assert.ok(s.calls.lastIndexOf("stop") < s.calls.lastIndexOf("start"));
  assert.equal(s.controller.active, true);
});