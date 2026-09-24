/** Chrome/CDP runtime audit of /game. No dependency installation is required.
 * PLAYWRIGHT_PATH may point at an existing Playwright installation.
 * node scripts/perf/game-runtime.mjs <base URL> <output directory> <label>
 * Chrome traces can be loaded directly into DevTools Performance.
 */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const [base = "http://127.0.0.1:5300", out = ".next/game-audit", label = "sample"] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const report = { label, browser: browser.version(), samples: [] };
const percentile = (xs, p) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) * p)] ?? 0;

function instrument() {
  const data = window.__gameAudit = { frames: [], tasks: [], commits: [], roots: [], draws: 0 };
  // Observe submitted WebGL frames, rather than mistaking an empty rAF loop for FPS.
  const clear = WebGL2RenderingContext.prototype.clear;
  WebGL2RenderingContext.prototype.clear = function (...args) {
    data.frames.push(performance.now());
    return clear.apply(this, args);
  };
  new PerformanceObserver(list => {
    for (const e of list.getEntries()) data.tasks.push({ start: e.startTime, duration: e.duration });
  }).observe({ type: "longtask", buffered: true });
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true, renderers: new Map(),
    inject(renderer) { const id = this.renderers.size + 1; this.renderers.set(id, renderer); return id; },
    onCommitFiberRoot(id, root) {
      data.commits.push({ time: performance.now(), id });
      if (!data.roots.includes(root)) data.roots.push(root);
    },
    onCommitFiberUnmount() {}, onPostCommitFiberRoot() {},
  };
}

try {
  for (const mode of (process.env.GAME_AUDIT_MODES || "desktop,desktop-4x,mobile-4x").split(",")) {
    const mobile = mode.startsWith("mobile");
    const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile, reducedMotion: "no-preference" });
    await ctx.addInitScript(instrument);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: mode.endsWith("4x") ? 4 : 1 });
    await cdp.send("Performance.enable");
    let layers = [];
    await cdp.send("LayerTree.enable");
    cdp.on("LayerTree.layerTreeDidChange", e => { layers = e.layers || []; });
    const events = [];
    cdp.on("Tracing.dataCollected", e => events.push(...e.value));
    await cdp.send("Tracing.start", { categories: "devtools.timeline,blink.user_timing,v8.execute,disabled-by-default-devtools.timeline.frame", transferMode: "ReportEvents" });
    const ranges = [];
    async function scenario(name, fn) {
      const start = await page.evaluate(() => performance.now());
      const scrollStart = await page.evaluate(() => scrollY);
      const m0 = await cdp.send("Performance.getMetrics");
      await page.evaluate(n => performance.mark(`${n}-start`), name);
      await fn();
      await page.evaluate(n => performance.mark(`${n}-end`), name);
      const end = await page.evaluate(() => performance.now());
      const m1 = await cdp.send("Performance.getMetrics");
      const a = Object.fromEntries(m0.metrics.map(m => [m.name, m.value]));
      const b = Object.fromEntries(m1.metrics.map(m => [m.name, m.value]));
      const metrics = {};
      for (const k of ["TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration", "LayoutCount", "RecalcStyleCount"]) metrics[k] = b[k] - a[k];
      const scrollEnd = await page.evaluate(() => scrollY);
      if (name.includes("scroll") && scrollStart === scrollEnd) throw new Error(`${mode}/${name} did not scroll`);
      ranges.push({ name, start, end, scrollStart, scrollEnd, metrics, layers: layers.length || null });
    }
    await page.goto(`${base}/game`, { waitUntil: "load" });
    await scenario("entrance", async () => { await page.locator("canvas").waitFor({ state: "visible", timeout: 45000 }); await page.waitForTimeout(2200); });
    const environment = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      const gl = canvas.getContext("webgl2");
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      return { cores: navigator.hardwareConcurrency, memory: navigator.deviceMemory, reduced: matchMedia("(prefers-reduced-motion: reduce)").matches, coarse: matchMedia("(pointer: coarse)").matches, renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), canvas: [canvas.width, canvas.height], bodyWidth: document.body.scrollWidth };
    });
    await page.evaluate(() => scrollTo(0, 650));
    await page.waitForTimeout(1400);
    await page.screenshot({ path: path.join(out, `${label}-${mode}.png`) });
    for (let run = 1; run <= 3; run++) {
      await scenario(`idle-${run}`, () => page.waitForTimeout(2400));
      await scenario(`slow-scroll-${run}`, async () => {
        // Headless Windows ignores synthetic touch gestures here; wheel input
        // exercises scrolling at both viewport sizes. Verify that it moved.
        await cdp.send("Input.synthesizeScrollGesture", { x: mobile ? 180 : 700, y: mobile ? 400 : 500, yDistance: -1200, speed: 400, gestureSourceType: "mouse" });
        await page.waitForTimeout(300);
      });
      await scenario(`fast-scroll-${run}`, async () => {
        await cdp.send("Input.synthesizeScrollGesture", { x: mobile ? 180 : 700, y: mobile ? 400 : 500, yDistance: -3000, speed: 2400, gestureSourceType: "mouse" });
        await page.waitForTimeout(300);
      });
      await page.evaluate(() => scrollTo(0, 650));
      await page.waitForTimeout(600);
    }
    await scenario("pointer-hover", async () => {
      for (let i = 0; i < 30; i++) await page.mouse.move(60 + (i % 10) * (mobile ? 27 : 120), 220 + (i % 5) * 75, { steps: 2 });
      await page.waitForTimeout(500);
    });
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(400);
    await scenario("menu", async () => {
      for (let i = 0; i < 3; i++) { await page.getByRole("button", { name: "فهرست" }).click(); await page.waitForTimeout(200); await page.keyboard.press("Escape"); await page.waitForTimeout(200); }
    });
    const measured = await page.evaluate(() => ({ frames: window.__gameAudit.frames, tasks: window.__gameAudit.tasks, commits: window.__gameAudit.commits }));
    const traceDone = new Promise(resolve => cdp.once("Tracing.tracingComplete", resolve));
    await cdp.send("Tracing.end");
    await traceDone;
    await writeFile(path.join(out, `${label}-${mode}-trace.json`), JSON.stringify({ traceEvents: events }));
    const summaries = ranges.map(range => {
      const frames = measured.frames.filter(t => t >= range.start && t < range.end);
      const gaps = frames.slice(1).map((t, i) => t - frames[i]);
      const tasks = measured.tasks.filter(t => t.start >= range.start && t.start < range.end);
      const traceStart = events.find(e => e.name === `${range.name}-start`)?.ts;
      const traceEnd = events.find(e => e.name === `${range.name}-end`)?.ts;
      const inRange = events.filter(e => e.ts >= traceStart && e.ts < traceEnd);
      const paints = inRange.filter(e => e.name === "Paint");
      return { ...range, paintMs: paints.reduce((s, e) => s + (e.dur || 0) / 1000, 0), paints: paints.length, droppedFrameMarkers: inRange.filter(e => e.name === "DroppedFrame").length, submittedWebglFps: frames.length * 1000 / (range.end - range.start), frameGapP50: percentile(gaps, .5), frameGapP95: percentile(gaps, .95), gapsOver50ms: gaps.filter(g => g > 50).length, longTasks: tasks.length, longTaskMs: tasks.reduce((s, t) => s + t.duration, 0), reactCommits: measured.commits.filter(t => t.time >= range.start && t.time < range.end).length };
    });
    const traceCounts = {};
    for (const e of events) {
      if (!["Paint", "Layout", "UpdateLayoutTree", "FireAnimationFrame", "DroppedFrame"].includes(e.name)) continue;
      const stat = traceCounts[e.name] ||= { count: 0, durationMs: 0 };
      stat.count++;
      stat.durationMs += (e.dur || 0) / 1000;
    }
    report.samples.push({ mode, environment, errors, summaries, traceCounts });
    await writeFile(path.join(out, `${label}-summary.json`), JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ mode, environment, errors, summaries: summaries.map(s => ({ name: s.name, fps: +s.submittedWebglFps.toFixed(1), p95: +s.frameGapP95.toFixed(1), tasks: s.longTasks, commits: s.reactCommits })), traceCounts }));
    await ctx.close();
  }
} finally { await browser.close(); }
