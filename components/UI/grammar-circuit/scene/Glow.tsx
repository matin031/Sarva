"use client";

import { forwardRef, useEffect, useMemo } from "react";
import * as THREE from "three";

/** درخششِ نرم.
 *
 *  بدونِ post-processing (که در پروژه نصب نیست و برای این صحنه گران است)
 *  «نور» را باید خودمان بکشیم. یک صفحهٔ افزایشی با بافتِ ساده لبهٔ مربعیِ
 *  تیز می‌دهد — همان چیزی که در نسخهٔ اول دیده شد. پس افتِ شعاعی داخلِ
 *  شیدر حساب می‌شود: هزینه‌اش چند دستور روی هر پیکسل است و لبه‌ای در کار
 *  نیست. */

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** دو توانِ متفاوت روی هم: یک مغزِ کوچکِ پرنور و یک هالهٔ پهنِ کم‌رنگ. یک
 *  توان به‌تنهایی یا نقطه‌ای می‌شود یا مه‌آلود. */
const fragment = /* glsl */ `
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uOpacity;
  void main() {
    float d = distance(vUv, vec2(0.5)) * 2.0;
    float core = pow(max(0.0, 1.0 - d), 6.0);
    float halo = pow(max(0.0, 1.0 - d), 2.2) * 0.42;
    float a = (core + halo) * uOpacity;
    if (a <= 0.001) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

export interface GlowProps {
  color: string;
  size: number;
  opacity?: number;
  position?: [number, number, number];
}

const Glow = forwardRef<THREE.Mesh, GlowProps>(function Glow(
  { color, size, opacity = 1, position = [0, 0, 0] },
  ref,
) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: opacity },
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        // نور از پشتِ اجسام هم دیده می‌شود، ولی خودش چیزی را پنهان نمی‌کند.
        depthWrite: false,
      }),
    // متریال یک‌بار ساخته می‌شود و هیچ‌وقت دوباره نه: کامپایلِ شیدر گران
    // است و رنگ/کدری از طریقِ uniform عوض می‌شوند.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /* هماهنگ‌کردنِ uniformها با propها — به‌روزرسانیِ یک شیءِ *بیرونی*، نه
     state؛ پس جای درستش افکت است. لامپ همین uOpacity را در هر فریم خودش
     می‌نویسد و این افکت فقط مقدارِ پایه را می‌گذارد. */
  useEffect(() => {
    material.uniforms.uColor.value.set(color);
    material.uniforms.uOpacity.value = opacity;
  }, [material, color, opacity]);

  // بافت و شیدر روی GPU زندگی می‌کنند و با از بین رفتنِ کامپوننت آزاد
  // نمی‌شوند مگر صریح.
  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh ref={ref} position={position} material={material}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
});

export default Glow;
