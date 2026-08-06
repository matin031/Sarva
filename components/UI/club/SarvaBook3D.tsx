"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Float, PresentationControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { sarvaLogoSvg } from "@/lib/club/sarva-logo";

/** سروا کلاب's hero: the club's own book, which opens itself.
 *
 *  It arrives closed, wearing the سروا mark, and a moment after the page
 *  settles the front board swings back and the invitation is there on the page
 *  underneath. Clicking it closes and opens it again.
 *
 *  The model is a *closed* book — one cover shell, one solid page block, no
 *  animation and no seam to open along. So the cover is cut open here: every
 *  triangle of the cover in front of the page block is lifted out into a hinge
 *  group placed on the spine, and that group is what rotates. The rest of the
 *  cover, the spine and the pages stay where they are.
 *
 *  Two details that cost me the most:
 *
 *  • The model is bound on the left; a Persian book opens the other way. The
 *    MODEL is therefore mirrored (`scale.x = -1`) — its materials are already
 *    double-sided and three flips normals for a negative-determinant matrix,
 *    so nothing else has to change. Everything added afterwards hangs off the
 *    stage, never off the model, so no emblem or writing inherits the mirror.
 *
 *  • The cut-out triangles are baked into stage space rather than re-parented
 *    with a copied transform: the meshes sit under intermediate nodes with
 *    transforms of their own, and carrying only the mesh's own position put
 *    the hinge on the wrong edge of the book entirely. */

const MODEL = "/models/sarva-book.glb";

const COVER = 0x0c2030;
const GOLD = 0xd9a94f;
const PAGES = 0xf4ece0;
const LOGO = 0x16d3d8;

/** How far the board swings, in radians — a little past square, so the open
 *  book reads as open without the board sailing off the side of the frame. */
const OPEN_ANGLE = THREE.MathUtils.degToRad(122);
/** the page block's face, in model units */
const PAGE_TOP_Z = 0.234;
/** anything in front of this is front board, not spine or back cover */
const FRONT_Z = 0.16;

/** Draws the page. Waits on `document.fonts.ready` before it is used: drawn any
 *  earlier the browser paints Persian in a fallback face and bakes that into a
 *  texture that never repaints. */
function drawPage() {
  const W = 860;
  const H = 1160;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.direction = "rtl";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = "#0b6f72";
  ctx.font = "600 48px Vazirmatn, sans-serif";
  ctx.fillText("سروا کلاب", W / 2, 250);
  const w = ctx.measureText("سروا کلاب").width;
  ctx.strokeStyle = "#0b6f72";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2 - w / 2, 292);
  ctx.lineTo(W / 2 + w / 2, 292);
  ctx.stroke();

  ctx.fillStyle = "#2f261b";
  ctx.font = "700 62px Vazirmatn, sans-serif";
  ["اینجا می‌توانی", "شعرت را به دست", "بقیه برسانی"].forEach((line, i) =>
    ctx.fillText(line, W / 2, 400 + i * 104),
  );

  ctx.fillStyle = "#6a6152";
  ctx.font = "400 40px Vazirmatn, sans-serif";
  ["با نام خودت، یا بی‌نام", "بقیه زیرش می‌نویسند", "پیش از انتشار بررسی می‌شود"].forEach(
    (line, i) => ctx.fillText(line, W / 2, 800 + i * 74),
  );

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

/** The سروا mark, extruded into a raised emblem for the cover. */
function buildLogo() {
  const parsed = new SVGLoader().parse(sarvaLogoSvg());
  const material = new THREE.MeshStandardMaterial({
    color: LOGO,
    metalness: 0.5,
    roughness: 0.22,
    emissive: 0x0a4b4d,
    emissiveIntensity: 0.55,
  });

  const meshes: THREE.Mesh[] = [];
  for (const path of parsed.paths) {
    for (const shape of path.toShapes()) {
      meshes.push(
        new THREE.Mesh(
          new THREE.ExtrudeGeometry(shape, {
            depth: 16,
            bevelEnabled: true,
            bevelThickness: 4,
            bevelSize: 3,
            bevelSegments: 2,
          }),
          material,
        ),
      );
    }
  }

  // Centre in the geometry's OWN units: Box3.setFromObject reports world space,
  // and subtracting that from local positions puts the emblem off the cover.
  const box = new THREE.Box3();
  for (const m of meshes) {
    m.geometry.computeBoundingBox();
    box.union(m.geometry.boundingBox!);
  }
  const centre = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  for (const m of meshes) m.geometry.translate(-centre.x, -centre.y, -centre.z);

  const group = new THREE.Group();
  meshes.forEach((m) => group.add(m));
  const k = 1.2 / Math.max(size.x, size.y);
  group.scale.set(k, -k, k); // SVG's Y grows downward, three's grows up
  return group;
}

function Book({
  autoOpen,
  open,
  setOpen,
}: {
  autoOpen: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const gltf = useGLTF(MODEL);
  const swing = useRef<THREE.Group>(null);
  const stage = useRef<THREE.Group>(null);
  const progress = useRef(0);
  const [pageTexture, setPageTexture] = useState<THREE.CanvasTexture | null>(null);

  // The beat closed has to start here, not in the parent: `useGLTF` suspends,
  // so the parent mounts while the model is still downloading — and on a slow
  // connection the cover would have swung open before the book ever appeared,
  // which is the one moment the سروا mark on it is there to be seen.
  useEffect(() => {
    if (!autoOpen) return;
    // long enough that the cover, and the mark on it, actually register
    const t = setTimeout(() => setOpen(true), 1600);
    return () => clearTimeout(t);
  }, [autoOpen, setOpen]);

  useEffect(() => {
    let alive = true;
    let made: THREE.CanvasTexture | null = null;
    const build = () => {
      if (!alive) return;
      made = drawPage();
      setPageTexture(made);
    };
    if (document.fonts?.ready) document.fonts.ready.then(build);
    else build();
    return () => {
      alive = false;
      made?.dispose();
    };
  }, []);

  const built = useMemo(() => {
    const model = gltf.scene.clone(true);
    model.scale.x = -1; // a Persian book is bound on the right

    const covers: THREE.Mesh[] = [];
    const emblem: THREE.Object3D[] = [];
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (/Circle010|Star003/.test(mesh.name)) {
        emblem.push(mesh); // the crescent and the star: this book is not that book
        return;
      }
      const source = mesh.material as THREE.MeshStandardMaterial;
      const isCover = /Cube012/.test(mesh.name);
      const mat = source.clone();
      if (source.name === "Gold") {
        mat.color.setHex(GOLD);
        mat.roughness = 0.28;
        mat.metalness = 0.9;
      } else if (isCover) {
        mat.color.setHex(COVER);
        mat.roughness = 0.85;
        mat.metalness = 0.05;
      } else {
        // Colour by MESH, not material: the page block wears the same cloth as
        // the cover, so keying off the material painted the first page navy.
        mat.color.setHex(PAGES);
        mat.roughness = 0.95;
        mat.metalness = 0;
      }
      mesh.material = mat;
      if (isCover) covers.push(mesh);
    });
    emblem.forEach((m) => m.parent?.remove(m));
    model.updateMatrixWorld(true);

    const spineX = new THREE.Box3().setFromObject(model).max.x;

    // ---- cut the front board out of the cover ----
    const boards: THREE.Mesh[] = [];
    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const v = new THREE.Vector3();
    const n = new THREE.Vector3();

    for (const mesh of covers) {
      mesh.updateMatrixWorld(true);
      const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
      const geo = mesh.geometry.toNonIndexed();
      const pos = geo.attributes.position;
      const nor = geo.attributes.normal;
      const keepP: number[] = [];
      const keepN: number[] = [];
      const frontP: number[] = [];
      const frontN: number[] = [];

      for (let i = 0; i < pos.count; i += 3) {
        a.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        b.fromBufferAttribute(pos, i + 1).applyMatrix4(mesh.matrixWorld);
        c.fromBufferAttribute(pos, i + 2).applyMatrix4(mesh.matrixWorld);
        const front = (a.z + b.z + c.z) / 3 > FRONT_Z;
        for (let j = 0; j < 3; j++) {
          if (front) {
            // baked into stage space, so the board needs no transform of its own
            v.fromBufferAttribute(pos, i + j).applyMatrix4(mesh.matrixWorld);
            n.fromBufferAttribute(nor, i + j).applyMatrix3(normalMatrix).normalize();
            frontP.push(v.x, v.y, v.z);
            frontN.push(n.x, n.y, n.z);
          } else {
            keepP.push(pos.getX(i + j), pos.getY(i + j), pos.getZ(i + j));
            keepN.push(nor.getX(i + j), nor.getY(i + j), nor.getZ(i + j));
          }
        }
      }

      const make = (P: number[], N: number[]) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
        g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
        return g;
      };
      mesh.geometry = make(keepP, keepN);
      if (frontP.length) {
        const board = new THREE.Mesh(make(frontP, frontN), mesh.material);
        board.position.set(-spineX, 0, 0); // cancels the hinge's own offset
        boards.push(board);
      }
    }

    const logo = buildLogo();
    logo.position.set(-spineX, 0.05, 0.4);

    return { model, spineX, boards, logo };
  }, [gltf.scene]);

  useEffect(() => {
    const { model, boards, logo } = built;
    return () => {
      const drop = (o: THREE.Object3D) =>
        o.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        });
      drop(model);
      boards.forEach(drop);
      drop(logo);
    };
  }, [built]);

  /** Eases towards whichever state was asked for, and slides the stage as it
   *  goes: the open book is wider than the closed one, and without this the
   *  whole thing drifts off centre the moment the board lifts. */
  useFrame((_, delta) => {
    const target = open ? 1 : 0;
    if (progress.current !== target) {
      const step = Math.min(1, delta / 0.85);
      progress.current += (target - progress.current) * step * 2.2;
      if (Math.abs(target - progress.current) < 0.001) progress.current = target;
    }
    const t = progress.current;
    // ease-out so it lands softly rather than snapping at the end
    const eased = 1 - Math.pow(1 - t, 3);
    if (swing.current) swing.current.rotation.y = eased * OPEN_ANGLE;
    if (stage.current) stage.current.position.x = -eased * 0.62;
  });

  return (
    <group
      ref={stage}
      onClick={(e) => {
        e.stopPropagation();
        setOpen(!open);
      }}
      onPointerOver={() => (document.body.style.cursor = "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <primitive object={built.model} />

      {/* the hinge, on the spine */}
      <group ref={swing} position={[built.spineX, 0, 0]}>
        {built.boards.map((board, i) => (
          <primitive key={i} object={board} />
        ))}
        <primitive object={built.logo} />
      </group>

      {/* the writing, on the page the board was covering */}
      {pageTexture && (
        <mesh position={[0, 0, PAGE_TOP_Z + 0.012]} renderOrder={10}>
          <planeGeometry args={[1.66, 2.24]} />
          <meshBasicMaterial
            map={pageTexture}
            transparent
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
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

export default function SarvaBook3D({
  autoOpen = true,
  className = "",
}: {
  /** false starts it open and still — used under prefers-reduced-motion */
  autoOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(!autoOpen);

  return (
    <div className={className}>
      <Canvas
        // capped at 2: above that the extra pixels cost fill rate on a glossy
        // surface without showing anything new
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0, 1.5, 6.2], fov: 32 }}
      >
        <StudioEnvironment />
        <hemisphereLight args={[0xcfe8ff, 0x0a1420, 1.1]} />
        <directionalLight position={[2, 5, 4]} intensity={2.4} color={0xfff2e0} />
        <directionalLight position={[-4, 2, -2]} intensity={1.6} color={0x35d0d6} />
        <directionalLight position={[0, -2, 4]} intensity={0.5} color={0xffd9a0} />

        <PresentationControls
          global
          snap
          cursor={false}
          speed={1.1}
          polar={[-0.3, 0.2]}
          azimuth={[-0.4, 0.4]}
          damping={0.22}
        >
          <Float speed={1.1} rotationIntensity={0.12} floatIntensity={0.3}>
            <group rotation={[-0.5, 0, 0]} scale={0.78}>
              <Suspense fallback={null}>
                <Book autoOpen={autoOpen} open={open} setOpen={setOpen} />
              </Suspense>
            </group>
          </Float>
        </PresentationControls>

        <ContactShadows position={[0, -1.6, 0]} opacity={0.35} scale={8} blur={2.8} far={3} />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL);
