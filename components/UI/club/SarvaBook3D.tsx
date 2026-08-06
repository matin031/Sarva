"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Float, PresentationControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { sarvaLogoSvg } from "@/lib/club/sarva-logo";

/** سروا کلاب's book: the supplied model, re-dressed as ours.
 *
 *  The model arrives as a generic devotional book — light cloth, orange trim,
 *  and a crescent-and-star emblem — with three materials, no textures and no
 *  animation. Nothing is baked in, so all of it is changed here at load time
 *  rather than by shipping a second copy of the asset: the two emblem meshes
 *  are dropped, the three materials are recoloured to the site's palette, and
 *  the سروا mark is extruded from the very SVG the header uses and set into
 *  the cover where the crescent was.
 *
 *  It is a *closed* book with a solid page block — there are no separate leaves
 *  in the geometry — so it is presented as an object you can turn in your hands
 *  rather than one that riffles: it swings in from the spine, floats, and
 *  answers the pointer. */

const MODEL = "/models/sarva-book.glb";

const COVER = 0x0c2030;
const GOLD = 0xd9a94f;
const PAGES = 0xf4ece0;
const LOGO = 0x16d3d8;

/** Gold with nothing to reflect is just dark brown. A generated room costs no
 *  request and gives the metal an environment. */
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

/** The سروا mark, extruded into a raised emblem. */
function useLogoMesh() {
  return useMemo(() => {
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

    // Centre in the geometry's OWN units before any scaling. Box3.setFromObject
    // reports world space, and subtracting that from local positions puts the
    // emblem nowhere near the cover.
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
    const k = 1.15 / Math.max(size.x, size.y);
    // SVG's Y grows downward, three's grows up
    group.scale.set(k, -k, k);
    return group;
  }, []);
}

function Book({ intro }: { intro: boolean }) {
  const gltf = useGLTF(MODEL);
  const logo = useLogoMesh();
  const group = useRef<THREE.Group>(null);
  const spun = useRef(0);

  const { model, coverZ } = useMemo(() => {
    const root = gltf.scene.clone(true);

    const emblem: THREE.Object3D[] = [];
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      // the crescent and the star: this book is not that book
      if (/Circle010|Star003/.test(mesh.name)) {
        emblem.push(mesh);
        return;
      }
      const source = mesh.material as THREE.MeshStandardMaterial;
      const mat = source.clone();
      if (source.name === "Kain.002") {
        mat.color.setHex(COVER);
        mat.roughness = 0.85;
        mat.metalness = 0.05;
      } else if (source.name === "Gold") {
        mat.color.setHex(GOLD);
        mat.roughness = 0.28;
        mat.metalness = 0.9;
      } else {
        mat.color.setHex(PAGES);
        mat.roughness = 0.95;
        mat.metalness = 0;
      }
      mesh.material = mat;
    });
    emblem.forEach((m) => m.parent?.remove(m));

    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    root.position.sub(centre);
    const scale = 2.4 / size.y;
    root.scale.setScalar(scale);

    return { model: root, coverZ: (size.z / 2) * scale + 0.02 };
  }, [gltf.scene]);

  // dispose the clones this component made; the cached gltf itself is drei's
  useEffect(() => {
    const owned = model;
    return () => {
      owned.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) (mesh.material as THREE.Material).dispose();
      });
      logo.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        }
      });
    };
  }, [model, logo]);

  /** Swings in from the spine on the first load, then stays put. */
  useFrame((_, delta) => {
    if (!group.current) return;
    if (!intro) {
      group.current.rotation.y = -0.34;
      return;
    }
    if (spun.current >= 1) return;
    spun.current = Math.min(1, spun.current + delta / 1.15);
    const t = 1 - Math.pow(1 - spun.current, 3); // ease-out cubic
    group.current.rotation.y = -1.5 + t * (-0.34 + 1.5);
  });

  return (
    <group ref={group} rotation={[-0.09, -1.5, 0.04]}>
      <primitive object={model} />
      <primitive object={logo} position={[0, 0.08, coverZ]} />
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
        // capped at 2: this is a glossy metal surface, and above 2 the extra
        // pixels cost fill rate without showing anything new
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        camera={{ position: [0.75, 0.45, 6.1], fov: 30 }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.15;
        }}
      >
        <StudioEnvironment />
        <hemisphereLight args={[0xcfe8ff, 0x0a1420, 1.1]} />
        <directionalLight position={[3, 4, 5]} intensity={2.6} color={0xfff2e0} />
        <directionalLight position={[-4, 1.5, -2.5]} intensity={2.2} color={0x35d0d6} />
        <directionalLight position={[-2, -2, 3]} intensity={0.9} color={0xffd9a0} />

        {/* the book answers the pointer, and can be picked up and turned */}
        <PresentationControls
          global
          snap
          cursor
          speed={1.2}
          polar={[-0.25, 0.25]}
          azimuth={[-0.6, 0.6]}
          damping={0.2}
        >
          <Float speed={1.3} rotationIntensity={0.25} floatIntensity={0.5}>
            <Book intro={intro} />
          </Float>
        </PresentationControls>

        <ContactShadows
          position={[0, -1.55, 0]}
          opacity={0.45}
          scale={7}
          blur={2.6}
          far={3}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL);
