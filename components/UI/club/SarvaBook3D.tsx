"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Float, PresentationControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

/** سروا کلاب's hero: an open book, centre stage, with this page's own words
 *  written across its two pages.
 *
 *  About the model. It arrives as a 12.5MB Sketchfab scan with six 2048²
 *  PNGs and an emissive pass at strength 4.2 that blows the whole book out to
 *  flat white. It was re-authored offline with glTF-Transform — emissive maps
 *  dropped (they are switched off here anyway), the rest resized to 1024 and
 *  re-encoded as WebP — which took it to 548KB, a twenty-third of the original,
 *  without a visible difference at the size it is shown.
 *
 *  About the writing. The pages are not axis-aligned: the model carries a baked
 *  rotation, and an open book's leaves fall away from the spine in a shallow V.
 *  So the text is not laid on a flat card in front of the book — each page gets
 *  its own plane, tilted to match that page's slope and floated a hair above
 *  the paper, carrying a canvas texture. The measurements below came from
 *  raycasting the levelled model, not from guesswork. */

const MODEL = "/models/sarva-book.glb";

/** The page normal, measured off the geometry (area-weighted over every
 *  up-facing face). Rotating this onto +Y lays the spread flat. */
const PAGE_NORMAL = new THREE.Vector3(0.004, 0.369, 0.93).normalize();

type PageText = { title?: string; lines: string[] };

const RIGHT_PAGE: PageText = {
  title: "سروا کلاب",
  lines: ["اینجا می‌توانی", "شعرت را به دست", "بقیه برسانی"],
};

const LEFT_PAGE: PageText = {
  lines: ["با نام خودت، یا بی‌نام", "بقیه زیرش می‌نویسند", "پیش از انتشار بررسی می‌شود"],
};

/** Draws one page's words into a canvas.
 *
 *  Waits on `document.fonts.ready` before the caller uses it: drawn any earlier
 *  the browser paints Persian in a fallback face and bakes that into a texture
 *  that never repaints. */
function drawPage(text: PageText, ink: string, accent: string) {
  // wide enough for the longest line at this size: at 700 the text ran off
  // the canvas and was clipped mid-word
  const W = 960;
  const H = 1220;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let y = H / 2 - (text.lines.length - 1) * 58 - (text.title ? 90 : 0);

  if (text.title) {
    ctx.fillStyle = accent;
    ctx.font = "600 52px Vazirmatn, sans-serif";
    ctx.fillText(text.title, W / 2, y);
    // a rule under the heading, the width of the word
    const w = ctx.measureText(text.title).width;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(W / 2 - w / 2, y + 40);
    ctx.lineTo(W / 2 + w / 2, y + 40);
    ctx.stroke();
    y += 165;
  }

  ctx.fillStyle = ink;
  ctx.font = "700 64px Vazirmatn, sans-serif";
  for (const line of text.lines) {
    ctx.fillText(line, W / 2, y);
    y += 116;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

type Placement = { position: THREE.Vector3; quaternion: THREE.Quaternion };

/** Where a page actually is, found by feeling for it.
 *
 *  Every constant I measured by hand was wrong in some way — the model carries
 *  a baked rotation, the leaves curl up towards the fore-edge, and the "page
 *  surface" is not a plane at all. So the writing is not placed from numbers:
 *  a fan of rays is dropped onto each page, the hits are averaged into a point
 *  and a normal, and the text is laid on *that*. It re-derives itself from the
 *  geometry, so it cannot drift out of agreement with the model. */
function fitPage(pageMesh: THREE.Mesh, side: "left" | "right"): Placement | null {
  const dir = side === "left" ? -1 : 1;
  const raycaster = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  let hits = 0;

  // a wide fan across the whole half; the flatness test below is what decides
  // which of these are actually page, so the centre lands itself
  for (const ax of [0.35, 0.5, 0.65, 0.8, 0.95, 1.1]) {
    for (const z of [-0.25, 0, 0.25]) {
      raycaster.set(new THREE.Vector3(dir * ax, 12, z), down);
      const hit = raycaster.intersectObject(pageMesh, true)[0];
      if (!hit?.face) continue;
      const n = hit.face.normal.clone().transformDirection(pageMesh.matrixWorld).normalize();
      // a ray from above can land on a face pointing away from it (the mesh is
      // double-sided); flip those rather than let them cancel the average out
      if (n.y < 0) n.negate();
      // the gutter and the curled fore-edge are steep; only the flat middle
      // of the leaf can be written on
      if (n.y < 0.78) continue;
      point.add(hit.point);
      normal.add(n);
      hits++;
    }
  }
  if (hits < 3) return null;

  point.divideScalar(hits);
  normal.divideScalar(hits).normalize();
  // lift a hair clear of the paper along its own normal
  point.addScaledVector(normal, 0.012);

  return {
    position: point,
    quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal),
  };
}

function PageWriting({ side, placement }: { side: "left" | "right"; placement: Placement }) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    let alive = true;
    let made: THREE.CanvasTexture | null = null;
    const build = () => {
      if (!alive) return;
      made = drawPage(side === "right" ? RIGHT_PAGE : LEFT_PAGE, "#2f261b", "#0b6f72");
      setTexture(made);
    };
    // the webfont must be in before the text is baked into a texture
    if (document.fonts?.ready) document.fonts.ready.then(build);
    else build();
    return () => {
      alive = false;
      made?.dispose();
    };
  }, [side]);

  // a plane already facing +Y, so the fitted quaternion is all the rotation it
  // needs; the page is roughly 1.05 x 1.35 of the levelled spread
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.8, 1.02);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  if (!texture) return null;

  return (
    <mesh
      geometry={geometry}
      position={placement.position}
      quaternion={placement.quaternion}
      // drawn after the book and without writing depth: ink sitting on paper,
      // not a second surface fighting it for the same pixels
      renderOrder={10}
    >
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Gold and leather with nothing to reflect look like flat plastic. A generated
 *  room costs no request and gives them an environment. */
function StudioEnvironment() {
  const gl = useThree((s) => s.gl);
  const env = useMemo(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    return texture;
  }, [gl]);

  useEffect(() => () => env.dispose(), [env]);

  // `attach` rather than `scene.environment = …`: R3F wires the property to the
  // parent and unwires it on unmount, and assigning to the scene a hook handed
  // back is exactly the mutation the compiler refuses to compile.
  return <primitive attach="environment" object={env} />;
}

function Book({ intro }: { intro: boolean }) {
  const gltf = useGLTF(MODEL);
  const group = useRef<THREE.Group>(null);
  const opened = useRef(0);

  const built = useMemo(() => {
    const root = gltf.scene.clone(true);

    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      // the scan's emissive pass is what washes the book out
      mat.emissiveIntensity = 0;
      mat.envMapIntensity = 0.7;
      mesh.material = mat;
    });

    // level the spread: measured page normal onto +Y
    root.quaternion.premultiply(
      new THREE.Quaternion().setFromUnitVectors(PAGE_NORMAL, new THREE.Vector3(0, 1, 0)),
    );
    root.updateMatrixWorld(true);

    // scale FIRST, then centre — position is not affected by scale, so centring
    // before scaling leaves the model off-centre by (1-scale) of its old offset
    let box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    root.scale.setScalar(3 / Math.max(size.x, size.z));
    root.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(root);
    root.position.sub(box.getCenter(new THREE.Vector3()));
    root.updateMatrixWorld(true);

    // the page block is the one carrying the book's own material
    let pageMesh: THREE.Mesh | null = null;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh && (mesh.material as THREE.Material).name === "MeshSG") pageMesh = mesh;
    });

    const pages = pageMesh
      ? { left: fitPage(pageMesh, "left"), right: fitPage(pageMesh, "right") }
      : { left: null, right: null };

    return { root, pages };
  }, [gltf.scene]);

  const { root: model, pages } = built;

  useEffect(() => {
    const owned = model;
    return () => {
      owned.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) (mesh.material as THREE.Material).dispose();
      });
    };
  }, [model]);

  /** Tips up towards the reader on first load, then holds. */
  useFrame((_, delta) => {
    if (!group.current) return;
    if (!intro) {
      group.current.rotation.x = 0;
      return;
    }
    if (opened.current >= 1) return;
    opened.current = Math.min(1, opened.current + delta / 1.1);
    const t = 1 - Math.pow(1 - opened.current, 3);
    group.current.rotation.x = (1 - t) * 0.55;
    group.current.position.y = (1 - t) * -0.35;
  });

  return (
    <group ref={group} rotation={[0.55, 0, 0]} position={[0, -0.35, 0]}>
      <primitive object={model} />
      {pages.right && <PageWriting side="right" placement={pages.right} />}
      {pages.left && <PageWriting side="left" placement={pages.left} />}
    </group>
  );
}

export default function SarvaBook3D({
  intro = true,
  className = "",
}: {
  /** false plays no entrance — used under prefers-reduced-motion */
  intro?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <Canvas
        // capped at 2: above that the extra pixels cost fill rate on a glossy
        // surface without showing anything new
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 2.15, 2.75], fov: 34 }}
        onCreated={({ gl, camera }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.05;
          camera.lookAt(0, -0.25, 0);
        }}
      >
        <StudioEnvironment />
        <hemisphereLight args={[0xcfe8ff, 0x0a1420, 1.0]} />
        <directionalLight position={[2, 5, 3]} intensity={2.2} color={0xfff2e0} />
        <directionalLight position={[-4, 2, -2]} intensity={1.4} color={0x35d0d6} />
        <directionalLight position={[0, -2, 4]} intensity={0.5} color={0xffd9a0} />

        {/* the book answers the pointer, and can be picked up and turned */}
        <PresentationControls
          global
          snap
          cursor
          speed={1.1}
          polar={[-0.35, 0.15]}
          azimuth={[-0.45, 0.45]}
          damping={0.22}
        >
          <Float speed={1.2} rotationIntensity={0.14} floatIntensity={0.35}>
            <Book intro={intro} />
          </Float>
        </PresentationControls>

        <ContactShadows position={[0, -1.1, 0]} opacity={0.4} scale={7} blur={2.8} far={3} />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL);
