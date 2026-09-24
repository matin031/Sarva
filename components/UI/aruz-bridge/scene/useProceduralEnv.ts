"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cssColor } from "./sceneColor";

/* شیشه بدونِ چیزی برای بازتاب‌دادن، دیده نمی‌شود.
 *
 * راهِ متعارف یک فایلِ HDRI است، ولی آن یعنی یک دارایی که هنوز نداریم و یک
 * درخواستِ شبکه که ممکن است شکست بخورد. به‌جایش نقشهٔ محیطی همین‌جا ساخته
 * می‌شود: یک گرادیانِ استوانه‌ای با آسمانِ سردِ بالا، مهِ فیروزه‌ای در افق و
 * تهیِ تاریکِ پایین، به‌علاوهٔ چند نوارِ روشن که نقشِ نورهای معماریِ پل را
 * بازی می‌کنند و روی سطحِ شیشه به‌صورتِ بازتابِ کشیده دیده می‌شوند.
 *
 * از PMREMGenerator رد می‌شود تا برای تابعِ توزیعِ بازتابِ PBR درست باشد —
 * یعنی همان بازتابی که MeshPhysicalMaterial انتظار دارد، نه یک بافتِ ساده.
 *
 * اگر روزی HDRI اضافه شد، همین‌جا جایگزین می‌شود و بقیهٔ صحنه دست نمی‌خورد. */
export function useProceduralEnvironment(
  size = 256,
  /* «r,g,b» از توکن‌های سایت. ⚠️ رنگ‌های این نقشه تا دیروز هگزِ ثابت بودند و
     چون *تنها* منبعِ بازتابِ شیشه همین نقشه است، کلِ پل در هر پالتی فیروزه‌ای
     می‌ماند — حتی وقتی بقیهٔ سایت رز یا زعفرانی شده بود. حالا شیشه رنگش را از
     چیزی می‌گیرد که بازتاب می‌دهد، و آن چیز پالتِ کاربر است. */
  primary = "31,209,164",
  gold = "217,164,65",
): THREE.Texture | null {
  const gl = useThree((s) => s.gl);

  /* همه‌چیز در یک useMemo ساخته می‌شود، نه در یک effect با setState.
     رندرر داخلِ `<Canvas>` همان هنگامِ رندر در دسترس است، پس لازم نیست منتظرِ
     effect بمانیم — و بدونِ setState هیچ رندرِ آبشاری‌ای هم راه نمی‌افتد. */
  const built = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size / 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const h = canvas.height;
    /* رنگِ پالت با یک سیاهِ ساده ترکیب می‌شود: نسبتِ کم یعنی تاریک، نسبتِ
       زیاد یعنی نوارِ روشنِ افق. همان کاری که color-mix در CSS می‌کند، ولی
       اینجا دستی، چون بومِ 2D فقط rgb می‌فهمد. */
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, cssColor(primary, 0.15, 0.4)); // سقفِ تاریک و کم‌فام
    grad.addColorStop(0.42, cssColor(primary, 0.45));
    /* ⚠️ افق باید از خودِ --primary *روشن‌تر* باشد و نه تیره‌تر: این نوار تنها
       منبعِ بازتابِ شیشه است. وقتی با ضریبِ کوچک‌تر از یک ساخته می‌شد، کلِ
       شیشه‌های پل مات و خاکستری درمی‌آمدند. */
    grad.addColorStop(0.5, cssColor(primary, 1.3));
    grad.addColorStop(0.58, cssColor(primary, 0.34));
    grad.addColorStop(1, cssColor(primary, 0.07, 0.4)); // تهیِ زیرِ پل
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, h);

    // نورهای معماری: بازتابشان روی شیشه لبه‌ها را پیدا می‌کند
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 7; i++) {
      const x = (i / 7) * canvas.width + 12;
      const glow = ctx.createRadialGradient(x, h * 0.47, 0, x, h * 0.47, canvas.width * 0.06);
      glow.addColorStop(0, `rgba(${gold},0.55)`); // طلاییِ سروا
      glow.addColorStop(1, `rgba(${gold},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.width, h);
    }
    const warm = ctx.createRadialGradient(canvas.width * 0.28, h * 0.3, 0, canvas.width * 0.28, h * 0.3, canvas.width * 0.22);
    warm.addColorStop(0, cssColor(primary, 1.45, 0, 0.4));
    warm.addColorStop(1, cssColor(primary, 1.45, 0, 0));
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, canvas.width, h);

    const source = new THREE.CanvasTexture(canvas);
    source.mapping = THREE.EquirectangularReflectionMapping;
    source.colorSpace = THREE.SRGBColorSpace;

    // PMREM نقشه را به شکلی درمی‌آورد که تابعِ توزیعِ بازتابِ PBR انتظار
    // دارد — یعنی همان چیزی که MeshPhysicalMaterial می‌خواهد، نه یک بافتِ ساده.
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const map = pmrem.fromEquirectangular(source).texture;
    pmrem.dispose();
    source.dispose();

    return map;
  }, [size, gl, primary, gold]);

  // بافتِ محیطی روی GPU می‌ماند تا صریحاً آزاد شود.
  useEffect(() => {
    if (!built) return;
    return () => {
      built.dispose();
    };
  }, [built]);

  /* نقشه *برگردانده* می‌شود تا فراخوان آن را با `attach="environment"` به
     صحنه وصل کند. اگر همین‌جا روی `scene.environment` می‌نشست، یک حالتِ
     سراسری بود که دستی باید برگردانده می‌شد؛ این‌طوری R3F مالکش است. */
  return built;
}
