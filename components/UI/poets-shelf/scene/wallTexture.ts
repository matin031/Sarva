"use client";

import * as THREE from "three";
import { SARVA_LOGO_BOX, SARVA_LOGO_PATHS } from "@/components/svgs/sarvaLogoPaths";
import {
  LOGO_CENTER_Y,
  LOGO_HEIGHT,
  LOGO_WIDTH,
  SHELF_Y,
  WALL_HEIGHT,
  WALL_WIDTH,
} from "@/lib/poets-shelf/layout";
import type { ScenePalette } from "@/lib/poets-shelf/theme";

/* ═══════════════════════════════════════════════════════════════════════════
   دیوار: الگوی SVG + عمقِ واقعی + نشانِ حک‌شده.
   ═══════════════════════════════════════════════════════════════════════════

   ── سه خواسته‌ای که با هم باید برآورده می‌شدند ─────────────────────────────

   ۱. الگوی آجرِ SVG باید *با تم عوض شود* و هرگز به تصویرِ ثابت پخته نشود.
   ۲. دیوار باید واقعاً بُعد داشته باشد، نه شبیهِ یک پس‌زمینهٔ تخت.
   ۳. نشانِ واقعیِ سروا باید درونِ دیوار *کنده* شده به نظر برسد.

   ── تصمیم ────────────────────────────────────────────────────────────────

   هندسهٔ واقعی (یک جعبه) + دو بافتِ ساخته‌شده در زمانِ اجرا:

     • `map`     — رنگ: آجر و بندکشی، با رنگ‌هایی که از توکن‌های سروا آمده‌اند.
     • `bumpMap` — ارتفاع: شیارِ بندکشی و گودیِ نشان.

   ⚠️ چرا bumpMap و نه normalMap: نقشهٔ نرمال یعنی نوشتنِ یک مولدِ گرادیان و
   سه‌برابر داده. برای شیارهای کم‌عمقِ بندکشی و یک حکاکی، همان نقشهٔ
   خاکستریِ ارتفاع کافی است و three خودش نرمال را از شیبش می‌گیرد. سایه و
   برجستگی از *نورِ واقعیِ صحنه* می‌آید و نه از سایه‌های نقاشی‌شده — یعنی
   وقتی تم عوض می‌شود، برجستگی هم درست می‌ماند.

   ⚠️ چرا شیدر ننوشتیم: چیزی که لازم بود — الگوی تکرارشونده، رنگِ متغیر و یک
   حکاکی — با یک بومِ دوبعدی که *یک بار در هر تغییرِ تم* اجرا می‌شود کامل
   به‌دست می‌آید. شیدر یعنی همان نتیجه با هزینهٔ هر پیکسل در هر فریم.

   ── الگوی آجر ─────────────────────────────────────────────────────────────

   مسیرِ زیر عیناً از `brick-wall.svg`ِ داده‌شده است. با قاعدهٔ `evenodd`،
   ناحیهٔ *پرشده* همان بندکشی است (مستطیلِ بیرونی منهای سه آجرِ درونی) — پس
   بوم با رنگِ آجر پر می‌شود و بعد همین مسیر با رنگِ بند رویش می‌نشیند.
   ═══════════════════════════════════════════════════════════════════════════ */

/** ⚠️ عیناً از `public/games/game-assets/book/brick-wall.svg`. دست‌نویسی نشده. */
const BRICK_PATH = "M0 0h42v44H0V0zm1 1h40v20H1V1zM0 23h20v20H0V23zm22 0h20v20H22V23z";
const BRICK_TILE = { w: 42, h: 44 };

/** پهنای جهانیِ یک کاشیِ آجر. تعیین می‌کند دیوار چند رج آجر دارد. */
const TILE_METERS = 0.62;

export interface WallTextures {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  dispose: () => void;
}

/** مولدِ شبه‌تصادفیِ قطعی — لکه‌های کهنگی نباید با هر تغییرِ تم جابه‌جا شوند. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("قفسهٔ شاعران: بومِ دوبعدی در دسترس نیست.");
  return [canvas, ctx];
}

/** کاشیِ تکرارشوندهٔ آجر — یک بار کشیده می‌شود و بعد به‌صورتِ الگو پخش می‌شود. */
function brickTile(tileW: number, tileH: number, face: string, mortar: string): HTMLCanvasElement {
  const [canvas, ctx] = makeCanvas(tileW, tileH);
  ctx.fillStyle = face;
  ctx.fillRect(0, 0, tileW, tileH);

  ctx.save();
  ctx.scale(tileW / BRICK_TILE.w, tileH / BRICK_TILE.h);
  ctx.fillStyle = mortar;
  // ⚠️ `evenodd` اجباری است: با قاعدهٔ پیش‌فرض، کلِ کاشی پر می‌شد و آجری نمی‌ماند.
  ctx.fill(new Path2D(BRICK_PATH), "evenodd");
  ctx.restore();

  return canvas;
}

/** مسیرهای نشان را در یک مستطیلِ دلخواهِ بوم می‌کشد. */
function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, fill: string) {
  const scale = w / SARVA_LOGO_BOX.width;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.translate(-SARVA_LOGO_BOX.x, -SARVA_LOGO_BOX.y);
  ctx.fillStyle = fill;
  for (const path of SARVA_LOGO_PATHS) ctx.fill(new Path2D(path.d));
  ctx.restore();
}

/** آیا `ctx.filter` واقعاً کار می‌کند؟ (سافاریِ قدیمی آن را بی‌صدا نادیده می‌گیرد.) */
function supportsFilter(ctx: CanvasRenderingContext2D): boolean {
  try {
    ctx.filter = "blur(1px)";
    const ok = ctx.filter !== "none";
    ctx.filter = "none";
    return ok;
  } catch {
    return false;
  }
}

/**
 * دو بافتِ دیوار را می‌سازد.
 *
 * فراخوان باید `dispose()` را صدا بزند — بافت‌ها روی GPU می‌مانند.
 */
export function createWallTextures(palette: ScenePalette, textureWidth: number): WallTextures {
  const aspect = WALL_WIDTH / WALL_HEIGHT;
  const cw = Math.round(textureWidth);
  const ch = Math.round(textureWidth / aspect);

  /* کاشی به پیکسلِ صحیح گرد می‌شود: `createPattern` با ابعادِ اعشاری درزِ
     یک‌پیکسلیِ تکرارشونده می‌سازد که روی دیوار به‌صورتِ خط دیده می‌شود. */
  const tilesX = Math.max(1, Math.round(WALL_WIDTH / TILE_METERS));
  const tileW = Math.max(8, Math.round(cw / tilesX));
  const tileH = Math.max(8, Math.round((tileW * BRICK_TILE.h) / BRICK_TILE.w));

  /* ── نگاشتِ مختصاتِ جهان به بوم ─────────────────────────────────────────
     x جهانی از ‎−W/۲‎ تا ‎+W/۲‎، و y از ۰ (کف) تا H (بالا).
     بوم y را رو به پایین می‌شمارد، پس y وارونه می‌شود. */
  const toCanvasX = (x: number) => ((x + WALL_WIDTH / 2) / WALL_WIDTH) * cw;
  const toCanvasY = (y: number) => (1 - y / WALL_HEIGHT) * ch;

  /* ── نقشهٔ رنگ ─────────────────────────────────────────────────────────── */
  const [colorCanvas, color] = makeCanvas(cw, ch);

  const tile = brickTile(tileW, tileH, palette.wallFace, palette.wallMortar);
  const pattern = color.createPattern(tile, "repeat");
  if (pattern) {
    color.fillStyle = pattern;
    color.fillRect(0, 0, cw, ch);
  } else {
    color.fillStyle = palette.wallFace;
    color.fillRect(0, 0, cw, ch);
  }

  /* لکه‌های کهنگی. کم‌بسامد و بسیار کم‌رنگ — کارشان فقط شکستنِ یکنواختیِ
     کامل است، چون سطحِ کاملاً یکدست همان چیزی است که «تصویرِ پس‌زمینه» به
     نظر می‌رسد. بذر ثابت است تا با هر تغییرِ تم لکه‌ها جابه‌جا نشوند. */
  const rng = seeded(0x5a47a);
  color.save();
  color.globalCompositeOperation = "multiply";
  for (let i = 0; i < 26; i++) {
    const x = rng() * cw;
    const y = rng() * ch;
    const r = (0.06 + rng() * 0.14) * cw;
    const blot = color.createRadialGradient(x, y, 0, x, y, r);
    blot.addColorStop(0, `rgba(0,0,0,${0.028 + rng() * 0.03})`);
    blot.addColorStop(1, "rgba(0,0,0,0)");
    color.fillStyle = blot;
    color.fillRect(x - r, y - r, r * 2, r * 2);
  }
  color.restore();

  /* ── سایهٔ تماسِ طاقچه ───────────────────────────────────────────────────
     ⚠️ این *روی بافت* پخته می‌شود و نه با نورِ واقعی، و عمدی است: سایهٔ
     واقعیِ یک طاقچهٔ باریک روی دیوار به نقشهٔ سایه‌ای با رزولوشنِ خیلی بالا
     نیاز دارد تا نرم و درست دربیاید. اینجا نتیجهٔ یکسانی با هزینهٔ صفر
     به‌دست می‌آید، و چون رنگش از خودِ پالت می‌آید با تم هم درست می‌ماند. */
  const shelfShadowTop = toCanvasY(SHELF_Y);
  const shelfShadowDepth = (0.55 / WALL_HEIGHT) * ch;
  const underShelf = color.createLinearGradient(0, shelfShadowTop, 0, shelfShadowTop + shelfShadowDepth);
  underShelf.addColorStop(0, "rgba(0,0,0,0.3)");
  underShelf.addColorStop(1, "rgba(0,0,0,0)");
  color.fillStyle = underShelf;
  color.fillRect(0, shelfShadowTop, cw, shelfShadowDepth);

  /* جایی که دیوار به کف می‌رسد هم تیره‌تر است — همان نورِ محیطی که به گوشه
     نمی‌رسد. بدونِ آن، دیوار روی کف *شناور* به نظر می‌رسید. */
  const floorAo = color.createLinearGradient(0, ch, 0, ch - (0.7 / WALL_HEIGHT) * ch);
  floorAo.addColorStop(0, "rgba(0,0,0,0.34)");
  floorAo.addColorStop(1, "rgba(0,0,0,0)");
  color.fillStyle = floorAo;
  color.fillRect(0, ch - (0.7 / WALL_HEIGHT) * ch, cw, (0.7 / WALL_HEIGHT) * ch);

  /* ── نقشهٔ ارتفاع ───────────────────────────────────────────────────────
     خاکستریِ میانه = سطحِ دیوار. تیره‌تر = گودتر.
     آجرها روشن (بیرون‌زده)، بندکشی تیره (شیار). */
  const [bumpCanvas, bump] = makeCanvas(cw, ch);
  const bumpTile = brickTile(tileW, tileH, "#9a9a9a", "#4e4e4e");
  const bumpPattern = bump.createPattern(bumpTile, "repeat");
  bump.fillStyle = bumpPattern ?? "#808080";
  bump.fillRect(0, 0, cw, ch);

  /* ── حکاکیِ نشان ────────────────────────────────────────────────────────

     نشان روی *هر دو* نقشه می‌نشیند و هرکدام کارِ متفاوتی می‌کنند:

       • روی ارتفاع، یک ناحیهٔ تیره → گودی. پخِ لبه از تاریِ همین لبه می‌آید،
         و برجستگی را نورِ واقعیِ صحنه می‌سازد. یعنی اگر نور جابه‌جا شود،
         سایهٔ حکاکی هم درست جابه‌جا می‌شود — کاری که یک تصویرِ آمادهٔ
         «نشانِ حک‌شده» هرگز نمی‌توانست بکند.

       • روی رنگ، یک تیره‌شدنِ ملایم به‌علاوهٔ اندکی از جوهرِ خودِ نشان.
         گودیِ واقعی گردوغبار و پاتینا می‌گیرد؛ همین یک لایهٔ کم‌رنگ فرقِ
         «کنده‌شده» و «سوراخ» را می‌سازد.

     ⚠️ شکلِ نشان از `SARVA_LOGO_PATHS` می‌آید — همان مسیرهایی که خودِ سایت
     می‌کشد. هیچ‌چیز اینجا بازطراحی یا تقریب نشده. */
  const logoW = (LOGO_WIDTH / WALL_WIDTH) * cw;
  const logoX = toCanvasX(-LOGO_WIDTH / 2);
  const logoY = toCanvasY(LOGO_CENTER_Y + LOGO_HEIGHT / 2);

  const canBlur = supportsFilter(bump);

  bump.save();
  /* تاری پخِ لبه را می‌سازد. بدونِ آن لبه یک پله است و three نرمالِ آن را
     به‌صورتِ یک خطِ تیزِ ناخوشایند می‌خواند. */
  if (canBlur) bump.filter = `blur(${Math.max(1, cw / 420)}px)`;
  drawLogo(bump, logoX, logoY, logoW, "rgba(40,40,40,0.92)");
  bump.restore();

  color.save();
  color.globalCompositeOperation = "multiply";
  if (canBlur) color.filter = `blur(${Math.max(0.5, cw / 1400)}px)`;
  drawLogo(color, logoX, logoY, logoW, "rgba(0,0,0,0.30)");
  color.restore();

  color.save();
  color.globalAlpha = 0.16;
  if (canBlur) color.filter = `blur(${Math.max(0.5, cw / 1400)}px)`;
  drawLogo(color, logoX, logoY, logoW, palette.logoInk);
  color.restore();

  /* ── بافت‌ها ───────────────────────────────────────────────────────────── */
  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  map.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  /* ⚠️ نقشهٔ ارتفاع *داده* است و نه رنگ. اگر فضای رنگِ sRGB بگیرد، three
     مقدارها را گاما-تصحیح می‌کند و عمقِ شیارها غلط درمی‌آید. */
  bumpMap.colorSpace = THREE.NoColorSpace;
  bumpMap.anisotropy = 4;
  bumpMap.needsUpdate = true;

  return {
    map,
    bumpMap,
    dispose: () => {
      map.dispose();
      bumpMap.dispose();
    },
  };
}
