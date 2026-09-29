import * as THREE from "three";
import { TILE_DEPTH, TILE_WIDTH } from "@/lib/aruz-bridge/layout";

/* ═══════════════════════════════════════════════════════════════════════════
   شیشه — یک شیدرِ یک‌پاسه به‌جای transmission.
   ═══════════════════════════════════════════════════════════════════════════

   ⚠️ ریشهٔ اصلیِ «لگ» همین‌جا بود. `MeshPhysicalMaterial` با `transmission`
   یعنی three برای هر فریم *کلِ صحنه را یک بارِ اضافه* در یک رندرتارگت
   می‌کشد تا شیشه بتواند پشتِ خودش را شکسته نشان دهد. روی پلهٔ «متوسط» — که
   همهٔ گوشی‌ها در آن می‌افتادند — این پاس روشن بود؛ یعنی روی گوشی دو برابرِ
   لازم رندر می‌شد، آن هم برای اثری که در این زاویه و این اندازه تقریباً دیده
   نمی‌شود.

   اینجا ظاهرِ «شیشهٔ ضخیم» از چیزهایی ساخته می‌شود که چشم واقعاً می‌بیند و
   هیچ‌کدام پاسِ اضافه نمی‌خواهد:

     • فرنل — لبه‌ها و زاویه‌های تیز روشن‌ترند، وسط شفاف‌تر.
     • لبهٔ درخشان روی سطحِ بالا، و دیواره‌های کناریِ پررنگ؛ همان چیزی که
       ضخامتِ شیشهٔ واقعی را لو می‌دهد.
     • یک قابِ حکاکی‌شدهٔ نازک با گوشه‌های لوزی — امضای «کاشی» بودن.
     • یک بازتابِ مورب که آرام از رویش رد می‌شود.

   و همهٔ واکنش‌ها — hover، نبضِ «انتخاب کن»، درخششِ پاسخِ درست، قرمزیِ
   ترک — فقط uniform‌اند. هیچ‌کدام ماده یا شیدرِ تازه نمی‌سازد.

   ── یک ماده به‌ازای هر کاشی، یک برنامه برای همه ─────────────────────────
   هر کاشی نمونهٔ خودش را دارد چون uniform‌ها (hover، فلش) مالِ خودِ اوست.
   ولی کدِ شیدر یکی است، پس three *یک* برنامهٔ GPU کامپایل می‌کند و همه از
   آن استفاده می‌کنند — هزینهٔ نمونهٔ اضافه فقط چند عدد است.
   ═══════════════════════════════════════════════════════════════════════════ */

const vertexShader = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>

  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    vLocal = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>

  uniform float uTime;
  uniform float uOpacity;
  uniform float uHover;
  uniform float uSelectable;
  uniform float uVisited;
  uniform float uFlash;
  uniform float uGlowGain;
  uniform float uLight;
  uniform vec2 uHalf;
  uniform vec3 uDeep;
  uniform vec3 uTint;
  uniform vec3 uRim;
  uniform vec3 uAccent;
  uniform vec3 uFlashColor;

  varying vec3 vLocal;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(vViewDir);
    float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 3.0);

    float top = step(0.5, N.y);
    float bottom = step(0.5, -N.y);
    float side = 1.0 - top - bottom;

    // فاصله تا لبه روی سطحِ بالا (متر)
    vec2 p = vLocal.xz;
    vec2 d2 = uHalf - abs(p);
    float d = min(d2.x, d2.y);

    float rim = exp(-d * 30.0);
    // قابِ حکاکی‌شده، ۹ سانت داخلِ لبه
    float frame = smoothstep(0.011, 0.0, abs(d - 0.09));
    // گوشه‌های لوزی روی همان قاب
    vec2 c = abs(p) - (uHalf - 0.09);
    float diamond = smoothstep(0.012, 0.0, abs(abs(c.x) + abs(c.y) - 0.045));

    // بازتابِ مورب که هر چند ثانیه یک بار از روی شیشه می‌گذرد
    float sweep = (p.x - p.y) * 0.5 - (fract(uTime * 0.11 + vLocal.x * 0.02) * 3.4 - 1.7);
    float sheen = exp(-sweep * sweep * 55.0);

    float pulse = 0.5 + 0.5 * sin(uTime * 4.0);
    float hover = max(uHover, uSelectable * pulse * 0.35);

    vec3 color = mix(uDeep, uTint, 0.25 + 0.75 * fres);
    float alpha = mix(0.3, 0.5, uLight) + fres * 0.5;

    vec3 glow = uRim * (rim * 1.1 + frame * 0.55 + diamond * 0.8);
    glow += uAccent * (frame + diamond) * hover * 1.4;
    glow += uAccent * rim * hover * 1.2;
    glow += uRim * uVisited * (0.25 + rim);
    color += glow * top * uGlowGain;
    color += vec3(1.0) * sheen * top * 0.22 * uGlowGain;
    alpha += (rim * 0.4 + frame * 0.35 + sheen * 0.15) * top;

    // دیواره‌های کناری: ضخامتِ شیشه، پررنگ و درخشان
    color = mix(color, uRim * (0.9 + 0.5 * fres), side * 0.75);
    alpha = mix(alpha, 0.92, side);
    // کفِ شیشه کم‌رنگ است؛ فقط برای اینکه از زیر هم چیزی دیده شود
    alpha *= 1.0 - bottom * 0.5;

    // فلش: درخششِ پاسخِ درست یا قرمزیِ ترک
    color = mix(color, uFlashColor * (1.2 + rim), uFlash * 0.75);
    alpha = mix(alpha, 0.95, uFlash * 0.6);

    gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export interface GlassUniforms {
  [name: string]: THREE.IUniform;
  uTime: THREE.IUniform<number>;
  uOpacity: THREE.IUniform<number>;
  uHover: THREE.IUniform<number>;
  uSelectable: THREE.IUniform<number>;
  uVisited: THREE.IUniform<number>;
  uFlash: THREE.IUniform<number>;
  uGlowGain: THREE.IUniform<number>;
  uLight: THREE.IUniform<number>;
  uHalf: THREE.IUniform<THREE.Vector2>;
  uDeep: THREE.IUniform<THREE.Color>;
  uTint: THREE.IUniform<THREE.Color>;
  uRim: THREE.IUniform<THREE.Color>;
  uAccent: THREE.IUniform<THREE.Color>;
  uFlashColor: THREE.IUniform<THREE.Color>;
}

export type GlassMaterial = THREE.ShaderMaterial & { uniforms: GlassUniforms };

export function createGlassMaterial(): GlassMaterial {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uHover: { value: 0 },
      uSelectable: { value: 0 },
      uVisited: { value: 0 },
      uFlash: { value: 0 },
      uGlowGain: { value: 1 },
      uLight: { value: 0 },
      uHalf: { value: new THREE.Vector2(TILE_WIDTH / 2, TILE_DEPTH / 2) },
      uDeep: { value: new THREE.Color() },
      uTint: { value: new THREE.Color() },
      uRim: { value: new THREE.Color() },
      uAccent: { value: new THREE.Color() },
      uFlashColor: { value: new THREE.Color() },
    },
  ]) as GlassUniforms;

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    fog: true,
    side: THREE.FrontSide,
  }) as GlassMaterial;
}
