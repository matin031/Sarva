/** Deterministic DOM/style snapshots and lifecycle checks for the /game audit.
 * Usage and PLAYWRIGHT_PATH are the same as game-runtime.mjs. */
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const [base = "http://127.0.0.1:5300", out = ".next/game-audit", label = "after"] = process.argv.slice(2);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const result = [];
try {
  for (const mobile of [false, true]) {
    const mode = mobile ? "mobile" : "desktop";
    const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion: "no-preference" });
    await ctx.addInitScript(() => {
      window.__roots = [];
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        supportsFiber: true, renderers: new Map(), inject(r) { const id = this.renderers.size + 1; this.renderers.set(id, r); return id; },
        onCommitFiberRoot(id, root) { if (!window.__roots.includes(root)) window.__roots.push(root); },
        onCommitFiberUnmount() {}, onPostCommitFiberRoot() {},
      };
      window.__scene = () => window.__roots.map(r => r.current.stateNode.containerInfo?.getState?.()).filter(s => s?.scene).at(-1);
    });
    const page = await ctx.newPage();
    await page.goto(`${base}/game`);
    await page.waitForFunction(() => !!window.__scene());
    await page.waitForTimeout(1500);
    for (const y of [0, 650, 2200]) {
      await page.evaluate(y => scrollTo(0, y), y);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(out, `${label}-visual-${mode}-${y}.png`) });
      const snapshot = await page.evaluate(() => {
        const state = window.__scene();
        const slots = [...document.querySelectorAll('[class*="max-w-[340px]"]')];
        const groups = state.scene.children.filter(c => c.type === "Group");
        const boxes = [...document.querySelectorAll("main h1, main h2, main section, main a")].map(el => {
          const r = el.getBoundingClientRect(), s = getComputedStyle(el);
          return { text: el.textContent, x: r.x, y: r.y + scrollY, w: r.width, h: r.height, font: s.fontSize, shadow: s.boxShadow, blur: s.filter, backdrop: s.backdropFilter };
        });
        const alignment = groups.map((g, i) => {
          const rect = slots[i].getBoundingClientRect();
          return { visible: g.visible, errorX: Math.abs(g.position.x + state.size.width / 2 - rect.x - rect.width / 2), errorY: Math.abs(state.size.height / 2 - g.position.y - rect.y - rect.height / 2) };
        }).filter(g => g.visible);
        const nodes = [...document.querySelectorAll('[style*="cableNode"], [data-galaxy-loop="node"]')];
        return { boxes, alignment, canvas: [state.gl.domElement.width, state.gl.domElement.height], geometries: state.gl.info.memory.geometries, programs: state.gl.info.programs.length, nodes: nodes.length, headingClock: getComputedStyle(document.querySelector(".aruz-gradient-text")).animationPlayState, headingDuration: getComputedStyle(document.querySelector(".aruz-gradient-text")).animationDuration, overflow: document.body.scrollWidth > innerWidth };
      });
      assert.equal(snapshot.overflow, false);
      assert.equal(snapshot.nodes, 10);
      assert(snapshot.alignment.every(g => g.errorX < 1 && g.errorY < 1), "visible planets must align with their slots");
      if (label.startsWith("after") && y > 0) assert.equal(snapshot.headingClock, "paused");
      result.push({ mode, y, ...snapshot });
    }
    if (label.startsWith("after")) {
      // Height-only resize used to leave cached planet coordinates stale.
      await page.setViewportSize({ width: mobile ? 390 : 1440, height: 680 });
      await page.waitForTimeout(500);
      const resizeError = await page.evaluate(() => {
        const s = window.__scene();
        const slots = [...document.querySelectorAll('[class*="max-w-[340px]"]')];
        return s.scene.children.filter(c => c.type === "Group").map((g, i) => {
          const r = slots[i].getBoundingClientRect();
          return g.visible ? Math.abs(s.size.height / 2 - g.position.y - r.y - r.height / 2) : 0;
        });
      });
      assert(resizeError.every(e => e < 1), "height-only resize alignment");
      await page.evaluate(() => scrollTo(0, 0));
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.waitForTimeout(400);
      const t0 = await page.evaluate(() => window.__scene().clock.elapsedTime);
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(() => window.__scene().clock.elapsedTime), t0);
      await page.getByRole("button", { name: "پخش انیمیشن‌های این صفحه" }).click();
      await page.waitForTimeout(400);
      assert(await page.evaluate(t => window.__scene().clock.elapsedTime > t, t0));
      assert.notEqual(await page.locator(".aruz-gradient-text").evaluate(el => getComputedStyle(el).animationName), "none");
      await page.getByRole("button", { name: "پیروی از تنظیم دستگاه" }).click();
      await page.waitForTimeout(300);
      assert(await page.evaluate(() => [...document.querySelectorAll('path[stroke="url(#cableGrad)"]')].every(el => getComputedStyle(el).strokeDashoffset === "0px")), "reduced-motion toggle must not leave cable invisible");
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.waitForTimeout(400);
      await page.evaluate(() => { window.__lose = window.__scene().gl.getContext().getExtension("WEBGL_lose_context"); window.__lose.loseContext(); });
      await page.waitForTimeout(200);
      await page.evaluate(() => window.__lose.restoreContext());
      await page.waitForTimeout(600);
      assert.equal(await page.evaluate(() => window.__scene().gl.getContext().isContextLost()), false);
      // An unavailable sibling route exercises unmount/remount without starting a game.
      await page.locator('a[href="/auth"]').first().click();
      await page.waitForURL(url => url.pathname === "/auth");
      await page.goBack();
      await page.waitForFunction(() => document.querySelectorAll("canvas").length === 1 && window.__scene()?.internal.active);
      await page.waitForTimeout(600);
      const resumed = await page.evaluate(() => window.__scene().clock.elapsedTime);
      await page.waitForTimeout(200);
      assert(await page.evaluate(t => window.__scene().clock.elapsedTime > t, resumed));
      result.push({ mode, lifecycle: "resize, reduced-motion, opt-in, cable reset, context recovery, navigation back passed" });
    }
    await ctx.close();
  }
  await writeFile(path.join(out, `${label}-visual.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ label, snapshots: result.length, checks: "passed" }));
} finally { await browser.close(); }
