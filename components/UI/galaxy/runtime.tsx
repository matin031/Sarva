"use client";

/** Single entry point for everything that pulls in three.js.
 *
 *  Both the shared canvas and the individual planets need three/@react-three,
 *  and each of them used to be its own `dynamic(() => import(...))` boundary.
 *  Two boundaries meant two async chunks, and the bundler put a full copy of
 *  three.js in each — two 864 kB chunks with identical size and different
 *  hashes, which is exactly what DevTools reports as "Duplicated JavaScript".
 *
 *  Re-exporting both from one module means every lazy import resolves to the
 *  same chunk, so three.js is shipped once and shared. */

export { default as GalaxyCanvas } from "./GalaxyCanvas";
export { default as PlanetView } from "./PlanetView";
export type { PlanetKind } from "./PlanetView";
