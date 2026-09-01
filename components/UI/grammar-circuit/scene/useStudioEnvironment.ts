"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** نقشهٔ محیط برای *اجسامِ فلزی*، نه برای کلِ صحنه.
 *
 *  تفاوتِ «یک استوانهٔ خاکستری» با «یک قطعهٔ فلزیِ واقعی» در این است که چیزی
 *  برای بازتاب دادن وجود داشته باشد؛ بدونِ آن `metalness` فقط یعنی
 *  «تیره‌تر شو».
 *
 *  ولی گذاشتنِ آن روی `scene.environment` یعنی *هر* متریالِ استانداردی در
 *  صحنه — سیم‌ها، قابِ سوکت‌ها، اسلب — در هر فریم یک نمونه‌برداری از cubemap
 *  اضافه می‌کند. اندازه‌گیری شد: نرخِ فریم در حالتِ متحرک از ۴۸ به ۱۳ افتاد.
 *  بازتاب فقط روی باتری و سرپیچِ لامپ دیده می‌شود، پس فقط همان‌ها بهایش را
 *  می‌دهند و بقیه با نورپردازیِ ساده کار می‌کنند.
 *
 *  `RoomEnvironment` خودِ three است و از شبکه چیزی نمی‌گیرد. */
export function useStudioEnvironment(): THREE.Texture | null {
  const gl = useThree((s) => s.gl);

  /* ساختِ منبع در `useMemo` است نه در افکت با `setState`: نقشه یک *منبعِ
     مشتق‌شده* از رندرر است، نه حالتی که با گذشتِ زمان عوض شود. گذاشتنش در
     افکت یعنی یک رندرِ اضافه و شکستنِ قاعدهٔ `set-state-in-effect` پروژه. */
  const built = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);
    pmrem.dispose();
    // اتاق فقط برای *ساختِ* نقشه لازم بود؛ خودش می‌تواند همین‌جا برود.
    room.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const material = obj.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material.dispose();
      }
    });
    return target;
  }, [gl]);

  // بافت روی GPU می‌ماند تا صریح آزاد شود.
  useEffect(() => () => built.dispose(), [built]);

  return built.texture;
}
