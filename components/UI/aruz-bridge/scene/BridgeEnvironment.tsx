"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LANE_OFFSET, STEP_DEPTH, TILE_THICKNESS } from "@/lib/aruz-bridge/layout";
import type { QualitySettings } from "@/lib/aruz-bridge/quality";
import { makeRng } from "@/lib/aruz-bridge/fracture";
import { NO_RAYCAST } from "./AnswerHitTarget";
import type { ScenePalette } from "./palette";

/* ═══════════════════════════════════════════════════════════════════════════
   محیط: ارتفاع، تعلیق و عمق.
   ═══════════════════════════════════════════════════════════════════════════

   هر لایه یک کار دارد و همه ارزان‌اند:

     • گنبدِ آسمان — یک شیدرِ تک‌پاس: شب با ستاره و شفقِ همان پالت، یا
       سپیده‌دم با خورشیدِ طلایی. جای نقشهٔ محیطیِ PMREM را گرفت که هنگامِ
       بارگذاری ساخته می‌شد و فقط برای بازتابِ شیشهٔ transmission لازم بود.
     • ژرفای زیرِ پل — درخششی در عمق و مهی که آرام زیرِ پل می‌گذرد؛ تا
       بازیکن حس کند زیرِ پایش *چیزی نیست*.
     • سازه — تیرها و پایه‌ها `InstancedMesh`اند: پیش‌تر هر پایه و هر بست
       یک mesh و یک هندسهٔ جدا بود (برای بیست مرحله بیش از صد فراخوانِ
       رسم)؛ حالا چند فراخوان برای کلِ پل.
     • نوارهای نئون روی نرده‌ها، با موج‌های نوری که به سمتِ جلو می‌دوند —
       حرکتی دائمی که مسیر را نشان می‌دهد و صحنه را زنده نگه می‌دارد.
     • ذراتِ معلق، که حرکتشان تماماً در شیدرِ رأس است (صفر کار در JS).
   ═══════════════════════════════════════════════════════════════════════════ */

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 pos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = pos.xyww; // روی صفحهٔ دور، پشتِ همه‌چیز
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uAbyss;
  uniform vec3 uPrimary;
  uniform vec3 uGold;
  uniform float uTime;
  uniform float uDark;
  uniform float uStars;
  uniform float uClouds;
  uniform vec3 uCam;
  varying vec3 vDir;

  float hash2(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash2(i), hash2(i + vec2(1.0, 0.0)), f.x),
      mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  void main() {
    vec3 d = normalize(vDir);
    float y = d.y;
    vec3 color = y > 0.0
      ? mix(uHorizon, uTop, pow(smoothstep(0.0, 0.65, y), 0.75))
      : mix(uHorizon, uAbyss, pow(smoothstep(0.0, 0.22, -y), 0.6));

    /* دریای ابرِ زیرِ پل. نقطهٔ برخوردِ نگاه با یک صفحهٔ فرضی ۱۴ متر پایین‌تر
       حساب می‌شود و موقعیتِ دوربین در آن جمع می‌شود؛ پس ابرها با پیش‌رفتن
       *عقب می‌روند* (اختلافِ منظر) و زیرِ پا عمق دارد، نه یک کفِ یکدست. */
    if (uClouds > 0.5 && y < -0.015) {
      vec2 p = (uCam.xz + d.xz * (14.0 / -y)) * 0.075 + vec2(0.0, uTime * 0.012);
      float c = noise(p) * 0.55 + noise(p * 2.3 + 7.1) * 0.3 + noise(p * 5.1 - uTime * 0.03) * 0.15;
      c = smoothstep(0.42, 0.78, c) * smoothstep(0.0, 0.22, -y);
      // شب: ابرِ تیره با ته‌رنگِ پالت (عددِ کوچک، چون خروجی به sRGB می‌رود)؛ روز: ابرِ سفید.
      vec3 cloud = mix(uAbyss + uPrimary * 0.035, mix(uHorizon, vec3(1.0), 0.55), 1.0 - uDark);
      color = mix(color, cloud, c * 0.72);
      // لبهٔ روشنِ ابر در شب، مثلِ ماهتاب روی ابر
      color += uPrimary * c * (1.0 - c) * 0.06 * uDark;
    }

    float band = exp(-abs(y) * 10.0);
    color += mix(uGold * 0.35, uPrimary * 0.45, uDark) * band;

    // شفق: نوارهای موجیِ کند در نیمهٔ بالا — فقط شب
    float az = atan(d.x, d.z);
    float wave = sin(az * 3.0 + uTime * 0.05 + sin(az * 7.0 - uTime * 0.035) * 0.7) * 0.5 + 0.5;
    float aurora = smoothstep(0.05, 0.3, y) * smoothstep(0.75, 0.3, y) * pow(wave, 3.0);
    color += mix(uPrimary, uGold, wave * 0.35) * aurora * 0.5 * uDark;

    // خورشیدِ سپیده‌دم — فقط روز
    vec3 sunDir = normalize(vec3(0.45, 0.16, -1.0));
    float s = max(dot(d, sunDir), 0.0);
    color += uGold * (pow(s, 90.0) * 1.4 + pow(s, 8.0) * 0.3) * (1.0 - uDark);

    // ستاره‌ها: یک سلولِ سه‌بعدی روی جهت، با چشمک
    if (uStars > 0.5 && y > 0.0) {
      vec3 q = d * 260.0;
      vec3 cell = floor(q);
      float h = hash(cell);
      float star = step(0.9955, h) * smoothstep(0.42, 0.0, length(fract(q) - 0.5));
      float twinkle = 0.55 + 0.45 * sin(uTime * (1.5 + h * 3.0) + h * 40.0);
      color += vec3(star * twinkle * smoothstep(0.0, 0.25, y) * 1.6);
    }

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

/** `stars`: ستاره و ابر — روی پلهٔ ضعیف هر دو خاموش‌اند و فقط گرادیان می‌ماند. */
function SkyDome({ palette, stars }: { palette: ScenePalette; stars: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const camera = useThree((s) => s.camera);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTop: { value: new THREE.Color() },
          uHorizon: { value: new THREE.Color() },
          uAbyss: { value: new THREE.Color() },
          uPrimary: { value: new THREE.Color() },
          uGold: { value: new THREE.Color() },
          uTime: { value: 0 },
          uDark: { value: 1 },
          uStars: { value: 1 },
          uClouds: { value: 1 },
          uCam: { value: new THREE.Vector3() },
        },
        vertexShader: SKY_VERTEX,
        fragmentShader: SKY_FRAGMENT,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useLayoutEffect(() => {
    const u = material.uniforms;
    u.uTop.value.copy(palette.skyTop);
    u.uHorizon.value.copy(palette.skyHorizon);
    u.uAbyss.value.copy(palette.abyss);
    u.uPrimary.value.copy(palette.primary);
    u.uGold.value.copy(palette.gold);
    u.uDark.value = palette.dark ? 1 : 0;
    u.uStars.value = stars && palette.dark ? 1 : 0;
    u.uClouds.value = stars ? 1 : 0;
  }, [material, palette, stars]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uCam.value.copy(camera.position);
    // گنبد همراهِ دوربین می‌آید؛ آسمان هیچ‌وقت «نزدیک» نمی‌شود.
    ref.current?.position.copy(camera.position);
  });

  return (
    <mesh ref={ref} material={material} renderOrder={-10} frustumCulled={false} raycast={NO_RAYCAST}>
      <sphereGeometry args={[150, 32, 16]} />
    </mesh>
  );
}

/* ── ژرفا ─────────────────────────────────────────────────────────────────── */

const ABYSS_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uGold;
  uniform float uTime;
  uniform float uMist;
  uniform float uGain;
  varying vec2 vUv;

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
    float b = fract(sin(dot(i + vec2(1, 0), vec2(127.1, 311.7))) * 43758.5453);
    float c = fract(sin(dot(i + vec2(0, 1), vec2(127.1, 311.7))) * 43758.5453);
    float d = fract(sin(dot(i + vec2(1, 1), vec2(127.1, 311.7))) * 43758.5453);
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 p = vUv - 0.5;
    // درخششِ ژرفا: یک نوارِ کشیده زیرِ مسیرِ پل
    float core = exp(-abs(p.x) * 16.0) * smoothstep(0.5, 0.05, abs(p.y));
    vec2 q = vUv * vec2(6.0, 18.0) + vec2(0.0, uTime * 0.06);
    float mist = noise(q) * 0.6 + noise(q * 2.1 - uTime * 0.04) * 0.4;
    float edge = smoothstep(0.5, 0.2, length(p * vec2(1.0, 0.6)));
    /* ⚠️ اعداد کوچک‌اند چون خروجی پیش از جمع‌شدن به sRGB برده می‌شود: ۰٫۰۵ـِ
       خطی روی صفحه ~۰٫۲۵ است. با ضریب‌های بزرگ‌تر، ژرفا یک «کفِ» فیروزه‌ایِ
       یکدست می‌شد و حسِ ارتفاع — تنها چیزی که این لایه برایش هست — از بین می‌رفت. */
    float a = (core * 0.035 + mist * mist * uMist * 0.02) * edge * uGain;
    vec3 color = mix(uColor, uGold, core * 0.25);
    gl_FragColor = vec4(color * a, 1.0);
    #include <colorspace_fragment>
  }
`;

function Abyss({ palette, length, mist }: { palette: ScenePalette; length: number; mist: boolean }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color() },
          uGold: { value: new THREE.Color() },
          uTime: { value: 0 },
          uMist: { value: 1 },
          uGain: { value: 1 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
        `,
        fragmentShader: ABYSS_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useLayoutEffect(() => {
    const u = material.uniforms;
    u.uColor.value.copy(palette.dark ? palette.primary : palette.glassRim);
    u.uGold.value.copy(palette.gold);
    u.uMist.value = mist ? 1 : 0;
    u.uGain.value = palette.dark ? 1 : 0.6;
  }, [material, palette, mist]);
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh
      material={material}
      position={[0, -9, -length / 2 + 4]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-5}
      raycast={NO_RAYCAST}
    >
      <planeGeometry args={[60, length + 60]} />
    </mesh>
  );
}

/* ── سازه ─────────────────────────────────────────────────────────────────── */

const NEON_VERTEX = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  varying float vZ;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vZ = world.z;
    vec4 mvPosition = viewMatrix * world;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const NEON_FRAGMENT = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform vec3 uColor;
  uniform vec3 uPulse;
  uniform float uTime;
  uniform float uGain;
  varying float vZ;
  void main() {
    // موج‌ها به سمتِ ‎−z‎ — جهتِ پیشروی — می‌دوند
    float phase = fract(vZ * 0.09 + uTime * 0.45);
    float pulse = pow(phase, 10.0);
    vec3 color = uColor * (0.55 + 0.25 * uGain) + uPulse * pulse * 1.4 * uGain;
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const BOX = new THREE.BoxGeometry(1, 1, 1);
const LAMP = new THREE.SphereGeometry(1, 10, 8);

function BridgeStructure({ steps, palette }: { steps: number; palette: ScenePalette }) {
  const count = steps + 3;
  const length = count * STEP_DEPTH;
  const railX = LANE_OFFSET + 1.15;
  const midZ = -length / 2 + STEP_DEPTH;

  const metal = useMemo(
    () => new THREE.MeshStandardMaterial({ roughness: 0.42, metalness: 0.15 }),
    [],
  );
  const lampMaterial = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false }), []);
  const neon = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uColor: { value: new THREE.Color() },
            uPulse: { value: new THREE.Color() },
            uTime: { value: 0 },
            uGain: { value: 1 },
          },
        ]),
        vertexShader: NEON_VERTEX,
        fragmentShader: NEON_FRAGMENT,
        fog: true,
        toneMapped: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      metal.dispose();
      lampMaterial.dispose();
      neon.dispose();
    },
    [metal, lampMaterial, neon],
  );

  useLayoutEffect(() => {
    metal.color.copy(palette.metal);
    lampMaterial.color.copy(palette.gold).multiplyScalar(1.6);
    neon.uniforms.uColor.value.copy(palette.dark ? palette.primary : palette.glassRim);
    neon.uniforms.uPulse.value.copy(palette.dark ? palette.glassRim : palette.gold);
    neon.uniforms.uGain.value = palette.glowGain;
  }, [metal, lampMaterial, neon, palette]);

  useFrame((state) => {
    neon.uniforms.uTime.value = state.clock.elapsedTime;
  });

  /* پایه‌ها، بست‌های عرضی و چراغ‌ها: هرکدام یک InstancedMesh. */
  const postsRef = useRef<THREE.InstancedMesh>(null);
  const beamsRef = useRef<THREE.InstancedMesh>(null);
  const lampsRef = useRef<THREE.InstancedMesh>(null);
  const lampCount = Math.ceil(count / 2) * 2;

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3();
    const p = new THREE.Vector3();
    const posts = postsRef.current;
    const beams = beamsRef.current;
    const lamps = lampsRef.current;
    if (!posts || !beams || !lamps) return;
    let lamp = 0;
    for (let i = 0; i < count; i++) {
      const z = -i * STEP_DEPTH + STEP_DEPTH * 0.5;
      [-railX, railX].forEach((x, j) => {
        posts.setMatrixAt(i * 2 + j, m.compose(p.set(x, 0.72, z), q, s.set(0.07, 1.5, 0.07)));
        if (i % 2 === 0) {
          lamps.setMatrixAt(lamp++, m.compose(p.set(x, 1.56, z), q, s.set(0.05, 0.05, 0.05)));
        }
      });
      beams.setMatrixAt(i, m.compose(p.set(0, -0.2, z), q, s.set(railX * 2, 0.08, 0.1)));
    }
    lamps.count = lamp;
    posts.instanceMatrix.needsUpdate = true;
    beams.instanceMatrix.needsUpdate = true;
    lamps.instanceMatrix.needsUpdate = true;
  }, [count, railX]);

  return (
    <group>
      {[-railX, railX].map((x) => (
        <group key={x}>
          {/* تیرِ اصلیِ طولی، همراه با نوارِ نئونِ لبه‌اش */}
          <mesh geometry={BOX} material={metal} position={[x, TILE_THICKNESS / 2 - 0.08, midZ]} scale={[0.14, 0.14, length]} raycast={NO_RAYCAST} />
          <mesh geometry={BOX} material={neon} position={[x - Math.sign(x) * 0.075, TILE_THICKNESS / 2 - 0.02, midZ]} scale={[0.02, 0.025, length]} raycast={NO_RAYCAST} />
          {/* نرده و نوارِ نورِ رویش */}
          <mesh geometry={BOX} material={metal} position={[x, 1.48, midZ]} scale={[0.06, 0.06, length]} raycast={NO_RAYCAST} />
          <mesh geometry={BOX} material={neon} position={[x, 1.52, midZ]} scale={[0.028, 0.02, length]} raycast={NO_RAYCAST} />
        </group>
      ))}
      <instancedMesh ref={postsRef} args={[BOX, metal, count * 2]} raycast={NO_RAYCAST} frustumCulled={false} />
      <instancedMesh ref={beamsRef} args={[BOX, metal, count]} raycast={NO_RAYCAST} frustumCulled={false} />
      <instancedMesh ref={lampsRef} args={[LAMP, lampMaterial, lampCount]} raycast={NO_RAYCAST} frustumCulled={false} />
      <LampHalos count={count} railX={railX} palette={palette} />
    </group>
  );
}

/* ── هاله‌ها و ذرات: نقطه با شیدرِ نرم ───────────────────────────────────── */

const SOFT_POINT_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uColor2;
  uniform float uGain;
  varying float vTwinkle;
  varying float vMix;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    vec3 color = mix(uColor, uColor2, vMix);
    gl_FragColor = vec4(color * a * vTwinkle * uGain, 1.0);
    #include <colorspace_fragment>
  }
`;

function LampHalos({ count, railX, palette }: { count: number; railX: number; palette: ScenePalette }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const geometry = useMemo(() => {
    const pos: number[] = [];
    for (let i = 0; i < count; i += 2) {
      const z = -i * STEP_DEPTH + STEP_DEPTH * 0.5;
      pos.push(-railX, 1.56, z, railX, 1.56, z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    return g;
  }, [count, railX]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color() },
          uColor2: { value: new THREE.Color() },
          uGain: { value: 1 },
          uSize: { value: 1 },
          uTime: { value: 0 },
        },
        vertexShader: /* glsl */ `
          uniform float uSize;
          uniform float uTime;
          varying float vTwinkle;
          varying float vMix;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = uSize * 90.0 / -mv.z;
            vTwinkle = 0.8 + 0.2 * sin(uTime * 2.0 + position.z);
            vMix = 0.0;
          }
        `,
        fragmentShader: SOFT_POINT_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useLayoutEffect(() => {
    material.uniforms.uColor.value.copy(palette.gold);
    material.uniforms.uGain.value = palette.dark ? 0.9 : 0.55;
    material.uniforms.uSize.value = dpr;
  }, [material, palette, dpr]);
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return <points geometry={geometry} material={material} raycast={NO_RAYCAST} frustumCulled={false} />;
}

function Motes({ count, palette }: { count: number; palette: ScenePalette }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const geometry = useMemo(() => {
    // بذرِ ثابت: چیدمان بینِ رندرها یکی می‌ماند.
    const rng = makeRng(20260827);
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (rng() - 0.5) * 28;
      positions[i * 3 + 1] = (rng() - 0.5) * 14 - 1;
      positions[i * 3 + 2] = -rng() * 72 + 8;
      seeds[i] = rng();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [count]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color() },
          uColor2: { value: new THREE.Color() },
          uGain: { value: 1 },
          uSize: { value: 1 },
          uTime: { value: 0 },
        },
        vertexShader: /* glsl */ `
          attribute float aSeed;
          uniform float uSize;
          uniform float uTime;
          varying float vTwinkle;
          varying float vMix;
          void main() {
            vec3 p = position;
            float t = uTime * (0.15 + aSeed * 0.2) + aSeed * 6.2831;
            p.x += sin(t) * 0.6;
            p.y += sin(t * 0.7 + aSeed * 3.0) * 0.8 + mod(uTime * 0.12 * (0.3 + aSeed), 3.0) - 1.5;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = uSize * (18.0 + aSeed * 26.0) / -mv.z;
            vTwinkle = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (1.0 + aSeed * 2.5) + aSeed * 30.0), 2.0);
            vMix = step(0.72, aSeed);
          }
        `,
        fragmentShader: SOFT_POINT_FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  useLayoutEffect(() => {
    material.uniforms.uColor.value.copy(palette.glassRim);
    material.uniforms.uColor2.value.copy(palette.gold);
    material.uniforms.uGain.value = palette.dark ? 0.9 : 0.7;
    material.uniforms.uSize.value = dpr;
  }, [material, palette, dpr]);
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  if (count === 0) return null;
  return <points geometry={geometry} material={material} raycast={NO_RAYCAST} frustumCulled={false} />;
}

export function BridgeEnvironment({
  quality,
  palette,
  steps,
  fogNear,
  fogFar,
}: {
  quality: QualitySettings;
  palette: ScenePalette;
  steps: number;
  fogNear: number;
  fogFar: number;
}) {
  const length = (steps + 3) * STEP_DEPTH;
  return (
    <>
      {/* مه ادامهٔ مسیر را می‌بلعد — هم برای تعلیق، هم چون چیزی که دیده نمی‌شود
          لازم نیست رندر شود. رنگش همان افقِ آسمان است تا درز پیدا نباشد. */}
      <fog attach="fog" args={[palette.fog, fogNear, fogFar]} color={palette.fog} />
      <color attach="background" args={[palette.fog]} />

      <hemisphereLight
        args={[palette.skyTop, palette.abyss]}
        color={palette.dark ? palette.glassTint : palette.skyTop}
        groundColor={palette.abyss}
        intensity={palette.dark ? 1.1 : 1.6}
      />
      <directionalLight position={[3, 8, 4]} intensity={palette.dark ? 1.4 : 2} color={palette.dark ? palette.glassRim : "#fff8ec"} />
      {/* لبهٔ طلاییِ پشتِ سر، برای جداکردنِ کاراکتر از پس‌زمینه */}
      <directionalLight position={[-4, 3, -8]} intensity={palette.dark ? 1.1 : 0.6} color={palette.gold} />

      <SkyDome palette={palette} stars={quality.tier !== "low"} />
      <Abyss palette={palette} length={length} mist={quality.tier !== "low"} />
      <BridgeStructure steps={steps} palette={palette} />
      <Motes count={quality.particleCount} palette={palette} />
    </>
  );
}
